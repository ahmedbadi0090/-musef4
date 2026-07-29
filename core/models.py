from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    ROLE_CHOICES = [
        ('user', 'مستخدم عادي'),
        ('volunteer', 'متطوع مسعف'),
        ('government', 'جهة حكومية'),
    ]
    
    REGION_CHOICES = [
        ('tripoli', 'طرابلس'),
        ('benghazi', 'بنغازي'),
        ('misrata', 'مصراتة'),
        ('zawiya', 'الزاوية'),
        ('sabha', 'سبها'),
        ('khums', 'الخمس'),
        ('zliten', 'زليتن'),
        ('gharyan', 'غريان'),
        ('bayda', 'البيضاء'),
        ('tobruk', 'طبرق'),
        ('sirte', 'سرت'),
        ('tarhuna', 'ترهونة'),
        ('kufra', 'الكفرة'),
        ('derna', 'درنة'),
    ]
    
    phone = models.CharField(max_length=15, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    is_available = models.BooleanField(default=False)
    region = models.CharField(max_length=50, choices=REGION_CHOICES, default='tripoli')
    
    # Medical profile fields
    blood_type = models.CharField(max_length=10, blank=True, default='')
    chronic_diseases = models.TextField(blank=True, default='')
    emergency_contact = models.CharField(max_length=30, blank=True, default='')
    other_medical_notes = models.TextField(blank=True, default='')
    
    def __str__(self):
        return f"{self.username} - {self.role}"

# ✅ سطر فارغ وIncident خارج User تماماً
class Incident(models.Model):
    STATUS_CHOICES = [
        ('pending', 'في الانتظار'),
        ('active', 'نشط'),
        ('resolved', 'تم الحل'),
    ]
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='incidents')
    volunteer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_incidents')
    gov_responder = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='gov_assigned_incidents')
    latitude = models.FloatField()
    longitude = models.FloatField()
    injury_type = models.TextField(blank=True)
    ai_confidence = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    image = models.ImageField(upload_to='incidents/', null=True, blank=True)
    voice_note = models.FileField(upload_to='voice_notes/', null=True, blank=True)
    declined_volunteers = models.ManyToManyField(User, blank=True, related_name='declined_incidents')

    def __str__(self):
        return f"{self.injury_type[:30]} - {self.status}"


class PushSubscription(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='push_subscriptions')
    endpoint = models.URLField(max_length=500)
    p256dh = models.CharField(max_length=200)
    auth = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.endpoint[:30]}"