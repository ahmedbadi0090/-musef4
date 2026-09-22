from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Incident

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'phone', 'role', 'is_available']
    list_filter = ['role', 'is_available']
    fieldsets = UserAdmin.fieldsets + (
        ('معلومات إضافية', {
            'fields': ('phone', 'role', 'latitude', 'longitude', 'is_available')
        }),
    )

@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = ['id', 'reporter', 'volunteer', 'injury_type', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['reporter__username', 'volunteer__username', 'injury_type']
    ordering = ['-created_at']