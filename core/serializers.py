from rest_framework import serializers
from .models import User

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'phone', 'role', 'region']
    
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'phone', 'role', 
                  'latitude', 'longitude', 'is_available', 'region',
                  'blood_type', 'chronic_diseases', 'emergency_contact',
                  'other_medical_notes'
                  ,'first_name', 'last_name'
                  ]

from .models import Incident

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
        model = Incident
        fields = ['id', 'reporter', 'reporter_username', 'reporter_phone', 'reporter_region',
                  'reporter_blood_type', 'reporter_chronic_diseases', 'reporter_emergency_contact',
                  'reporter_other_notes', 'volunteer_username', 'volunteer_phone', 'gov_responder_username', 'latitude', 'longitude',
                  'injury_type', 'status', 'created_at', 'image', 'voice_note', 'is_declined_by_me', 'has_been_declined']

    def get_is_declined_by_me(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            return obj.declined_volunteers.filter(id=request.user.id).exists()
        return False

    def get_has_been_declined(self, obj):
        return obj.declined_volunteers.exists()