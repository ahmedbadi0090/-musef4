from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Roles, User, UserEmails, Location, Incidents, AIDiagnosis, IncidentAudio

@admin.register(Roles)
class RolesAdmin(admin.ModelAdmin):
    list_display = ['role_id', 'role_name', 'role_label']
    search_fields = ['role_name', 'role_label']
    ordering = ['role_id']

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['id', 'role_id', 'username', 'full_name', 'phone', 'region', 'is_active', 'date_joined']
    list_filter = ['role', 'region', 'is_active']
    search_fields = ['username', 'full_name', 'phone', 'email']
    ordering = ['id']
    
    fieldsets = UserAdmin.fieldsets + (
        ('Additional Info', {
            'fields': ('role', 'full_name', 'phone', 'region', 'latitude', 'longitude', 'is_available',
                       'blood_type', 'chronic_diseases', 'emergency_contact', 'other_medical_notes')
        }),
    )

@admin.register(UserEmails)
class UserEmailsAdmin(admin.ModelAdmin):
    list_display = ['email_id', 'user_id', 'email']
    search_fields = ['email', 'user__username']
    ordering = ['email_id']

@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ['id', 'user_id', 'latitude', 'longitude', 'last_updated']
    search_fields = ['user__username']
    ordering = ['-last_updated']

@admin.register(Incidents)
class IncidentsAdmin(admin.ModelAdmin):
    list_display = ['id', 'reporter_id', 'volunteer_id', 'gov_responder_id', 'latitude', 'longitude', 'status', 'injury_type', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['reporter__username', 'volunteer__username', 'gov_responder__username', 'injury_type']
    ordering = ['-created_at']

@admin.register(AIDiagnosis)
class AIDiagnosisAdmin(admin.ModelAdmin):
    list_display = ['diagnosis_id', 'incident_id', 'injury_type', 'confidence_score', 'image_path']
    list_filter = ['injury_type']
    search_fields = ['injury_type']
    ordering = ['diagnosis_id']

@admin.register(IncidentAudio)
class IncidentAudioAdmin(admin.ModelAdmin):
    list_display = ['audio_id', 'incident_id', 'audio_path', 'created_at']
    search_fields = ['incident__id']
    ordering = ['audio_id']