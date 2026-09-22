from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Roles, User, UserEmails, Location, Incidents, AIDiagnosis, IncidentAudio

class RolesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Roles
        fields = ['role_id', 'role_name', 'role_label']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    phone = serializers.CharField(required=True)
    full_name = serializers.CharField(required=False, allow_blank=True)
    role = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'phone', 'role', 'region', 'full_name']
    
    def validate_phone(self, value):
        if not value or value.strip() == "":
            raise serializers.ValidationError("رقم الهاتف إلزامي.")
        return value

    def validate_email(self, value):
        if value:
            if UserEmails.objects.filter(email__iexact=value).exists() or User.objects.filter(email__iexact=value).exists():
                raise serializers.ValidationError("هذا البريد مسجل مسبقاً ولا يمكن إدخاله مرة أخرى.")
        return value

    def validate_role(self, value):
        if not value:
            return None
        if isinstance(value, Roles):
            return value
        if isinstance(value, str):
            val_str = value.strip()
            if val_str.isdigit():
                role_obj = Roles.objects.filter(pk=int(val_str)).first()
            else:
                role_obj = Roles.objects.filter(role_name__iexact=val_str).first()
            if role_obj:
                return role_obj
        return None

    def create(self, validated_data):
        email = validated_data.pop('email', None)
        role_obj = validated_data.pop('role', None)
        if not role_obj:
            role_obj = Roles.objects.filter(role_name='user').first()
            
        user = User.objects.create_user(role=role_obj, **validated_data)
        if email:
            user.email = email
            user.save()
            UserEmails.objects.create(user=user, email=email)
        return user


class UserSerializer(serializers.ModelSerializer):
    email = serializers.SerializerMethodField()
    phone = serializers.CharField(required=True)
    role = serializers.SerializerMethodField()
    role_name = serializers.SerializerMethodField()
    role_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'phone', 'role', 'role_id', 'role_name', 
                  'latitude', 'longitude', 'is_available', 'region', 'full_name',
                  'blood_type', 'chronic_diseases', 'emergency_contact',
                  'other_medical_notes', 'first_name', 'last_name']

    def get_email(self, obj):
        first_email = obj.emails.first()
        return first_email.email if first_email else obj.email

    def get_role(self, obj):
        return obj.role.role_name if obj.role else 'user'

    def get_role_name(self, obj):
        return obj.role.role_name if obj.role else 'user'

    def get_role_id(self, obj):
        return obj.role.role_id if obj.role else None

    def validate_phone(self, value):
        if not value or value.strip() == "":
            raise serializers.ValidationError("رقم الهاتف إلزامي.")
        return value


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user_serializer = UserSerializer(self.user)
        data['user'] = user_serializer.data
        data['role'] = user_serializer.data['role']
        data['username'] = self.user.username
        return data


class IncidentSerializer(serializers.ModelSerializer):
    reporter_username = serializers.CharField(source='reporter.username', read_only=True)
    reporter_phone = serializers.CharField(source='reporter.phone', read_only=True)
    reporter_region = serializers.CharField(source='reporter.region', read_only=True)
    reporter_blood_type = serializers.CharField(source='reporter.blood_type', read_only=True)
    reporter_chronic_diseases = serializers.CharField(source='reporter.chronic_diseases', read_only=True)
    reporter_emergency_contact = serializers.CharField(source='reporter.emergency_contact', read_only=True)
    reporter_other_notes = serializers.CharField(source='reporter.other_medical_notes', read_only=True)
    
    volunteer_username = serializers.CharField(source='volunteer.username', read_only=True)
    volunteer_phone = serializers.CharField(source='volunteer.phone', read_only=True)
    gov_responder_username = serializers.CharField(source='gov_responder.username', read_only=True)
    is_declined_by_me = serializers.SerializerMethodField()
    has_been_declined = serializers.SerializerMethodField()
    
    class Meta:
        model = Incidents
        fields = ['id', 'reporter', 'reporter_username', 'reporter_phone', 'reporter_region',
                  'reporter_blood_type', 'reporter_chronic_diseases', 'reporter_emergency_contact',
                  'reporter_other_notes', 'volunteer', 'volunteer_username', 'volunteer_phone', 
                  'gov_responder', 'gov_responder_username', 'latitude', 'longitude',
                  'injury_type', 'status', 'created_at', 'image', 'voice_note', 'is_declined_by_me', 'has_been_declined']

    def get_is_declined_by_me(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            return obj.declined_volunteers.filter(id=request.user.id).exists()
        return False

    def get_has_been_declined(self, obj):
        return obj.declined_volunteers.exists()