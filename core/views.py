import math
import tempfile
import os
import json
import logging
import threading
from django.db import close_old_connections
from django.conf import settings
from pywebpush import webpush, WebPushException
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from .serializers import RegisterSerializer, UserSerializer, IncidentSerializer
from .models import User, Incident, PushSubscription, FCMDevice, Roles, UserEmails, Location, Incidents, AIDiagnosis, IncidentAudio
import firebase_admin
from firebase_admin import messaging

def get_user_role(user):
    if not user or not user.is_authenticated:
        return 'user'
    if hasattr(user, 'role') and user.role:
        return user.role.role_name
    return 'user'


logger = logging.getLogger(__name__)

VAPID_PRIVATE_KEY_PATH = os.path.join(settings.BASE_DIR, 'private_key.pem')

def get_vapid_private_key():
    if os.path.exists(VAPID_PRIVATE_KEY_PATH):
        with open(VAPID_PRIVATE_KEY_PATH, 'r') as f:
            return f.read()
    return None

def get_vapid_public_key_b64():
    return "BMIvuHgrHkrDYVjZAL9lQTONqqzaQGTLSLFnjUBpdcNnQ4dsHp8a-ey6bNBNgGDb3FHduJRt6Ly1k1cFh6rzDrU"

def send_push_notification(user, incident, title="طلب استغاثة طارئ! 🚨", body=None, push_type="EMERGENCY_PUSH"):
    subscriptions = PushSubscription.objects.filter(user=user)
    if not subscriptions.exists():
        logger.warning(f"No push subscriptions for user {user.username}")
        return
        
    # Calculate distance if coordinates are available
    dist_str = ""
    if user.latitude and user.longitude and incident.latitude and incident.longitude:
        try:
            dist = haversine(user.latitude, user.longitude, incident.latitude, incident.longitude)
            dist_str = f"المسافة: {dist:.2f} كم"
        except Exception as e:
            logger.error(f"Error calculating haversine for push: {e}")
            
    location_str = f"الموقع: {incident.latitude:.4f}, {incident.longitude:.4f}"
    phone_str = f"الهاتف: {incident.reporter.phone or 'غير مسجل'}"
    reporter_str = f"المستغيث: {incident.reporter.username}"
    
    parts = [reporter_str, phone_str, location_str]
    if dist_str:
        parts.append(dist_str)
        
    body_text = " | ".join(parts)
    if incident.injury_type:
        body_text += f"\nالتفاصيل: {incident.injury_type[:50]}..."
        
    payload = {
        "title": title,
        "body": body_text,
        "incidentId": incident.id,
        "assignedVolunteer": incident.volunteer.username if incident.volunteer else None,
        "assignedVolunteerPhone": incident.volunteer.phone if incident.volunteer else None,
        "url": f"/dashboard?incidentId={incident.id}",
        "type": push_type
    }
    
    private_key_path = VAPID_PRIVATE_KEY_PATH
    if not os.path.exists(private_key_path):
        logger.error("VAPID private key file not found!")
        return
        
    vapid_claims = {
        "sub": "mailto:admin@musef.ly"
    }
    
    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {
                        "p256dh": sub.p256dh,
                        "auth": sub.auth
                    }
                },
                data=json.dumps(payload),
                vapid_private_key=private_key_path,
                vapid_claims=vapid_claims
            )
            logger.info(f"Successfully sent push notification to {user.username}")
        except WebPushException as ex:
            logger.error(f"WebPushException for {user.username}: {ex}")
            if ex.response and ex.response.status_code in (404, 410):
                sub.delete()
        except Exception as e:
            logger.error(f"Failed to send push: {e}")

    # Send FCM push notifications
    fcm_devices = FCMDevice.objects.filter(user=user)
    if fcm_devices.exists():
        fcm_payload = {
            "title": title,
            "body": body_text,
            "incidentId": str(incident.id),
            "assignedVolunteer": str(incident.volunteer.username) if incident.volunteer else "",
            "assignedVolunteerPhone": str(incident.volunteer.phone) if incident.volunteer else "",
            "url": f"/dashboard?incidentId={incident.id}",
            "type": push_type
        }
        for device in fcm_devices:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=fcm_payload["title"],
                    body=fcm_payload["body"],
                ),
                data=fcm_payload,
                token=device.token,
                android=messaging.AndroidConfig(
                    priority='high',
                    notification=messaging.AndroidNotification(
                        channel_id='emergency_alerts',
                        sound='alarm.wav'
                    )
                )
            )
            try:
                response = messaging.send(message)
                logger.info(f"Successfully sent FCM message: {response}")
            except Exception as e:
                logger.error(f"Error sending FCM message: {e}")

def send_push_notification_async(user_id, incident_id, title="طلب استغاثة طارئ! 🚨", body=None, push_type="EMERGENCY_PUSH"):
    def run():
        close_old_connections()
        try:
            user = User.objects.get(id=user_id)
            incident = Incident.objects.get(id=incident_id)
            send_push_notification(user, incident, title=title, body=body, push_type=push_type)
        except Exception as e:
            logger.error(f"Async push error: {e}")
        finally:
            close_old_connections()
    threading.Thread(target=run).start()

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_injury(request):
    image_file = request.FILES.get('image')
    if not image_file:
        return Response({"error": "لم يتم إرسال صورة"}, status=400)

    tmp_path = None
    try:
        import base64
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
            for chunk in image_file.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name

        from ultralytics import YOLO
        model_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "yolov8_injury_cls.pt")
        
        detections = []
        if os.path.exists(model_path):
            yolo_model = YOLO(model_path)
            results = yolo_model(tmp_path)
            if len(results) > 0:
                probs = results[0].probs
                if probs is not None:
                    top1_idx = probs.top1
                    top1_conf = float(probs.top1conf)
                    
                    if top1_conf >= 0.50:
                        top1_label = results[0].names[top1_idx]
                        class_mapping = {
                            "burns": "حروق",
                            "wounds": "جروح",
                            "snakebites": "لدغات ثعابين",
                            "normal": "لا توجد إصابة واضحة"
                        }
                        arabic_label = class_mapping.get(top1_label, top1_label)
                        detections.append({
                            'class': arabic_label,
                            'confidence': round(top1_conf, 2)
                        })
        else:
            return Response({"error": "نموذج تصنيف الإصابات غير متوفر حالياً"}, status=500)

        with open(tmp_path, 'rb') as f:
            image_data = base64.b64encode(f.read()).decode('utf-8')

        from groq import Groq
        groq_key = os.getenv("GROQ_API_KEY", "")
        client = Groq(api_key=groq_key)

        # Check if there is any real injury detected
        has_injury = False
        if detections:
            for d in detections:
                if d['class'] != "لا توجد إصابة واضحة":
                    has_injury = True
                    break

        if not has_injury:
            injury_types = ['لا توجد إصابة واضحة في الصورة']
        else:
            injury_types = [d['class'] for d in detections if d['class'] != "لا توجد إصابة واضحة"]

        response = client.chat.completions.create(
            model="qwen/qwen3.6-27b",
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": f"""أنت مساعد طبي طارئ متخصص. كشف النظام: {', '.join(injury_types)}
إذا كان الكشف "لا توجد إصابة واضحة في الصورة"، قل للمستخدم بوضوح باللغة العربية الفصحى أن الصورة لا تظهر إصابة وانصحه بإرسال صورة أوضح.
أما إذا كانت هناك إصابة حقيقية، أعطني باللغة العربية الفصحى وبشكل منظم ومختصر:
1. نوع الإصابة المرئية
2. درجة خطورتها (خفيفة/متوسطة/خطيرة)
3. خطوات الإسعاف الأولي (3-5 خطوات)
4. هل تحتاج إسعاف فوري؟

ملاحظة هامة جداً: يجب أن تكون الإجابة كاملة باللغة العربية الفصحى فقط. يمنع منعاً باتاً استخدام اللغة الإنجليزية أو كتابة أي عمليات تفكير (Thinking/think) داخل الرد.""" },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}
                    }
                ]
            }],
            max_tokens=1000
        )

        raw_analysis = response.choices[0].message.content
        import re
        # Remove any XML-like reasoning block (e.g. <think>...</think>)
        clean_analysis = re.sub(r'<think>.*?</think>', '', raw_analysis, flags=re.DOTALL).strip()
        # Remove any lingering think tags
        clean_analysis = re.sub(r'</?think>', '', clean_analysis, flags=re.IGNORECASE).strip()

        return Response({
            "yolo_detections": detections,
            "gemini_analysis": clean_analysis,
            "status": "تم التحليل بنجاح"
        })

    except Exception as e:
        import traceback
        return Response({"error": str(e), "detail": traceback.format_exc()}, status=500)



    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except:
                pass

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({"message": "تم التسجيل بنجاح ✅"}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def profile(request):
    user = request.user
    if request.method == 'PATCH':
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    return Response(UserSerializer(user).data)

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def nearby_volunteers(request):
    lat = float(request.query_params.get('lat', 0))
    lon = float(request.query_params.get('lon', 0))
    volunteers = User.objects.filter(role__role_name='volunteer', is_available=True)
    result = []
    for v in volunteers:
        if v.latitude and v.longitude:
            dist = haversine(lat, lon, v.latitude, v.longitude)
            if dist <= 10:
                result.append({
                    'id': v.id,
                    'username': v.username,
                    'phone': v.phone,
                    'distance_km': round(dist, 2),
                    'latitude': v.latitude,
                    'longitude': v.longitude,
                })
    result.sort(key=lambda x: x['distance_km'])
    return Response(result)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_location(request):
    user = request.user
    
    lat = request.data.get('latitude')
    lon = request.data.get('longitude')
    is_available = request.data.get('is_available')
    
    if lat is not None:
        try:
            user.latitude = float(lat) if lat != '' else None
        except ValueError:
            return Response({"error": "إحداثيات العرض غير صالحة"}, status=400)
            
    if lon is not None:
        try:
            user.longitude = float(lon) if lon != '' else None
        except ValueError:
            return Response({"error": "إحداثيات الطول غير صالحة"}, status=400)
            
    if is_available is not None:
        if isinstance(is_available, str):
            user.is_available = is_available.lower() in ('true', '1', 'yes')
        else:
            user.is_available = bool(is_available)
            
    user.save()
    if user.latitude and user.longitude:
        Location.objects.create(user=user, latitude=user.latitude, longitude=user.longitude)
    return Response({
        "message": "تم تحديث البيانات بنجاح ✅",
        "latitude": user.latitude,
        "longitude": user.longitude,
        "is_available": user.is_available
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sos_alert(request):
    lat = request.data.get('latitude')
    lon = request.data.get('longitude')
    note = request.data.get('note') or request.data.get('injury_type') or 'طوارئ - SOS'
    image = request.FILES.get('image')
    voice_note = request.FILES.get('voice_note')
    
    try:
        lat_val = float(lat) if lat not in (None, '') else (request.user.latitude or 0.0)
    except ValueError:
        lat_val = request.user.latitude or 0.0
        
    try:
        lon_val = float(lon) if lon not in (None, '') else (request.user.longitude or 0.0)
    except ValueError:
        lon_val = request.user.longitude or 0.0

    incident = Incident.objects.create(
        reporter=request.user,
        latitude=lat_val,
        longitude=lon_val,
        injury_type=note,
        image=image,
        voice_note=voice_note,
        status='pending'
    )
    # Save auxiliary audio/diagnosis records
    if voice_note:
        IncidentAudio.objects.create(incident=incident, audio_path=incident.voice_note.name)
    if image:
        AIDiagnosis.objects.create(incident=incident, injury_type=note, confidence_score=0.95, image_path=incident.image.name)

    # Exclude the reporter so they don't get assigned to their own SOS
    volunteers = User.objects.filter(role__role_name='volunteer', is_available=True).exclude(id=request.user.id)
    nearest = None
    min_dist = float('inf')
    for v in volunteers:
        if v.latitude and v.longitude:
            dist = haversine(lat_val, lon_val, v.latitude, v.longitude)
            if dist < min_dist:
                min_dist = dist
                nearest = v
    if nearest:
        incident.volunteer = nearest
        incident.status = 'pending'
        incident.save()
        
        send_push_notification_async(nearest.id, incident.id)
            
        gov_users = User.objects.filter(role__role_name='government')
        for gov in gov_users:
            send_push_notification_async(gov.id, incident.id)
            
        return Response({
            "message": "تم إرسال SOS ✅",
            "incident_id": incident.id,
            "volunteer": {
                "username": nearest.username,
                "phone": nearest.phone,
                "distance_km": round(min_dist, 2)
            }
        })
    
    gov_users = User.objects.filter(role__role_name='government')
    for gov in gov_users:
        send_push_notification_async(gov.id, incident.id)

    return Response({
        "message": "تم إرسال SOS ✅ — لا يوجد متطوع قريب حالياً",
        "incident_id": incident.id,
        "volunteer": None
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def subscribe_push(request):
    data = request.data
    endpoint = data.get('endpoint')
    keys = data.get('keys', {})
    p256dh = keys.get('p256dh')
    auth = keys.get('auth')
    
    if not endpoint or not p256dh or not auth:
        return Response({"error": "معلومات الاشتراك غير كاملة"}, status=400)
        
    sub, created = PushSubscription.objects.get_or_create(
        user=request.user,
        endpoint=endpoint,
        defaults={
            'p256dh': p256dh,
            'auth': auth
        }
    )
    if not created:
        sub.p256dh = p256dh
        sub.auth = auth
        sub.save()
        
    return Response({"message": "تم الاشتراك في الإشعارات بنجاح ✅"})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_fcm_token(request):
    token = request.data.get('token')
    if not token:
        return Response({"error": "Token is required"}, status=400)
    
    device, created = FCMDevice.objects.get_or_create(token=token, defaults={'user': request.user})
    if not created and device.user != request.user:
        device.user = request.user
        device.save()
        
    return Response({"message": "تم تسجيل الجهاز للإشعارات بنجاح ✅"})


@api_view(['GET'])
def get_vapid_key(request):
    return Response({
        "publicKey": get_vapid_public_key_b64()
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def medical_chat(request):
    query = request.data.get('query')
    if not query:
        return Response({"error": "الرجاء إدخال سؤالك"}, status=400)

    from groq import Groq
    groq_key = os.getenv("GROQ_API_KEY","")
    client = Groq(api_key=groq_key)

    try:
        response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "أنت طبيب طوارئ ومساعد إسعافات أولية خبير ومتخصص. "
                        "مهمتك هي تقديم إرشادات إسعافية واضحة وموثوقة بناءً على شكوى المستخدم باللغة العربية. "
                        "يجب أن تكون إجابتك مقسمة كالتالي:\n"
                        "1. عنوان واضح يحدد الحالة الطبية.\n"
                        "2. خطوات إسعافية واضحة ومرقمة بأسلوب نقاط.\n"
                        "3. تحذيرات طبية هامة (تنبيهات عما يجب تجنبه).\n"
                        "4. تنويه بضرورة استشارة الطبيب أو الاتصال بالإسعاف (1412) إذا كانت الحالة خطيرة.\n"
                        "اجعل الرد ملخصاً ومنظماً جداً لسهولة القراءة في الحالات الطارئة ومكتوب بلغة عربية مبسطة."
                    )
                },
                {
                    "role": "user",
                    "content": query
                }
            ],
            max_tokens=800,
            temperature=0.3
        )
        raw_content = response.choices[0].message.content
        import re
        # Remove any XML-like reasoning block (e.g. <think>...</think>)
        clean_content = re.sub(r'<think>.*?</think>', '', raw_content, flags=re.DOTALL).strip()
        # Remove any lingering think tags
        clean_content = re.sub(r'</?think>', '', clean_content, flags=re.IGNORECASE).strip()
        return Response({"answer": clean_content})
    except Exception as e:
        return Response({"error": f"فشل الاتصال بمساعد الذكاء الاصطناعي: {str(e)}"}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def volunteer_alerts(request):
    from django.db.models import Q
    user = request.user
    role_name = get_user_role(user)
    if role_name == 'volunteer':
        incidents = Incident.objects.filter(
            Q(volunteer=user) | Q(status='pending')
        ).order_by('-created_at')
    elif role_name == 'government':
        incidents = Incident.objects.all().order_by('-created_at')
    else:
        incidents = Incident.objects.filter(reporter=user).order_by('-created_at')
    serializer = IncidentSerializer(incidents, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_alert(request, alert_id):
    try:
        incident = Incident.objects.get(id=alert_id)
        if get_user_role(request.user) == 'government':
            if incident.gov_responder:
                return Response({"error": "تم قبول هذه الحالة بالفعل من قبل جهة حكومية أخرى"}, status=400)
            incident.gov_responder = request.user
            incident.save()
            return Response({"message": "تم قبول الحالة بنجاح من قبل الجهة الحكومية 🚑", "status": incident.status})
        else:
            if incident.status == 'pending':
                if incident.volunteer and incident.volunteer != request.user:
                    return Response({"error": "هذه الحالة مخصصة لمسعف آخر"}, status=400)
                incident.volunteer = request.user
                incident.status = 'active'
                incident.save()
                return Response({"message": "تم قبول الحالة بنجاح 🚑", "status": "active"})
            return Response({"error": "الحالة ليست معلقة أو تم قبولها بالفعل"}, status=400)
    except Incident.DoesNotExist:
        return Response({"error": "الحالة غير موجودة"}, status=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def decline_alert(request, alert_id):
    try:
        incident = Incident.objects.get(id=alert_id)
        if get_user_role(request.user) == 'government':
            return Response({"error": "لا يمكن للجهة الحكومية رفض الاستغاثة"}, status=400)
        
        # Allow decline if: volunteer is assigned to this incident OR incident is pending (not yet assigned)
        can_decline = (
            incident.volunteer == request.user or
            (incident.status == 'pending' and incident.volunteer is None)
        )
        
        if not can_decline:
            return Response({"error": "لا يمكنك رفض هذا البلاغ لأنه مُعيَّن لمسعف آخر"}, status=400)
        
        # Add current user to declined list
        incident.declined_volunteers.add(request.user)
        incident.volunteer = None
        incident.status = 'pending'
        incident.save()
        
        # Find the NEXT nearest volunteer (excluding the ones who declined AND the reporter)
        volunteers = User.objects.filter(role__role_name='volunteer', is_available=True).exclude(
            id__in=incident.declined_volunteers.all()
        ).exclude(id=incident.reporter.id)
        nearest = None
        min_dist = float('inf')
        for v in volunteers:
            if v.latitude and v.longitude:
                dist = haversine(incident.latitude, incident.longitude, v.latitude, v.longitude)
                if dist < min_dist:
                    min_dist = dist
                    nearest = v
        if nearest:
            incident.volunteer = nearest
            incident.save()
            try:
                send_push_notification_async(nearest.id, incident.id)
            except Exception as e:
                logger.error(f"Error sending push: {e}")
                
            # Notify reporter that a new volunteer was assigned
            if incident.reporter:
                msg = f"تم توجيه بلاغك للمسعف {nearest.username} بدلاً من المسعف السابق."
                send_push_notification_async(
                    incident.reporter.id, 
                    incident.id, 
                    title="تحديث حالة الاستغاثة 🔄", 
                    body=msg, 
                    push_type="SOS_UPDATE"
                )
        else:
            # Notify reporter that no volunteer is currently available
            if incident.reporter:
                msg = "المسعف المستجيب لم يتمكن من الوصول، جاري توجيه ندائك لمسعف آخر بشكل عاجل..."
                send_push_notification_async(
                    incident.reporter.id, 
                    incident.id, 
                    title="تحديث حالة الاستغاثة ⏳", 
                    body=msg, 
                    push_type="SOS_UPDATE"
                )
                
        return Response({"message": "تم رفض الاستغاثة بنجاح وسيتم توجيهها لمسعف آخر 🚑"})
    except Incident.DoesNotExist:
        return Response({"error": "الحالة غير موجودة"}, status=404)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_incident(request, alert_id):
    try:
        incident = Incident.objects.get(id=alert_id)
        if get_user_role(request.user) == 'government' or incident.reporter == request.user or incident.volunteer == request.user:
            # Delete physical files from storage
            if incident.image and os.path.exists(incident.image.path):
                try:
                    os.remove(incident.image.path)
                except Exception as e:
                    logger.error(f"Error deleting image: {e}")
                    
            if incident.voice_note and os.path.exists(incident.voice_note.path):
                try:
                    os.remove(incident.voice_note.path)
                except Exception as e:
                    logger.error(f"Error deleting voice note: {e}")
                    
            incident.delete()
            return Response({"message": "تم حذف البلاغ وكل ملفاته المرفقة بنجاح 🗑️"})
        return Response({"error": "غير مصرح لك بحذف هذا البلاغ"}, status=403)
    except Incident.DoesNotExist:
        return Response({"error": "البلاغ غير موجود"}, status=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def delete_voice_note(request, alert_id):
    try:
        incident = Incident.objects.get(id=alert_id)
        if get_user_role(request.user) == 'government' or incident.reporter == request.user or incident.volunteer == request.user:
            if incident.voice_note:
                if os.path.exists(incident.voice_note.path):
                    try:
                        os.remove(incident.voice_note.path)
                    except Exception as e:
                        logger.error(f"Error deleting voice note: {e}")
                incident.voice_note = None
                incident.save()
                return Response({"message": "تم حذف التسجيل الصوتي بنجاح 🔇"})
            return Response({"error": "لا يوجد تسجيل صوتي في هذا البلاغ"}, status=400)
        return Response({"error": "غير مصرح لك بتعديل هذا البلاغ"}, status=403)
    except Incident.DoesNotExist:
        return Response({"error": "البلاغ غير موجود"}, status=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def delete_image(request, alert_id):
    try:
        incident = Incident.objects.get(id=alert_id)
        if get_user_role(request.user) == 'government' or incident.reporter == request.user or incident.volunteer == request.user:
            if incident.image:
                if os.path.exists(incident.image.path):
                    try:
                        os.remove(incident.image.path)
                    except Exception as e:
                        logger.error(f"Error deleting image: {e}")
                incident.image = None
                incident.save()
                return Response({"message": "تم حذف الصورة بنجاح 🖼️"})
            return Response({"error": "لا توجد صورة في هذا البلاغ"}, status=400)
        return Response({"error": "غير مصرح لك بتعديل هذا البلاغ"}, status=403)
    except Incident.DoesNotExist:
        return Response({"error": "البلاغ غير موجود"}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def gov_dashboard(request):
    if get_user_role(request.user) != 'government':
        return Response({"error": "غير مصرح بالدخول للوحة التحكم هذه"}, status=403)
        
    total_incidents = Incident.objects.count()
    pending = Incident.objects.filter(status='pending').count()
    active = Incident.objects.filter(status='active').count()
    resolved = Incident.objects.filter(status='resolved').count()
    
    total_volunteers = User.objects.filter(role__role_name='volunteer').count()
    active_volunteers = User.objects.filter(role__role_name='volunteer', is_available=True).count()
    
    regions_stats = {}
    for r_code, r_name in User.REGION_CHOICES:
        regions_stats[r_name] = Incident.objects.filter(reporter__region=r_code).count()
        
    return Response({
        "stats": {
            "total_incidents": total_incidents,
            "pending": pending,
            "active": active,
            "resolved": resolved,
            "total_volunteers": total_volunteers,
            "active_volunteers": active_volunteers,
        },
        "regions_stats": regions_stats
    })


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    user = request.user
    user.first_name = request.data.get('first_name', user.first_name)
    user.last_name = request.data.get('last_name', user.last_name)
    user.phone = request.data.get('phone', user.phone)
    user.email = request.data.get('email', user.email)
    user.save()
    return Response(UserSerializer(user).data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')
    if not user.check_password(old_password):
        return Response({"old_password": ["كلمة المرور الحالية غير صحيحة"]}, status=400)
    user.set_password(new_password)
    user.save()
    return Response({"message": "تم تغيير كلمة المرور بنجاح ✅"})