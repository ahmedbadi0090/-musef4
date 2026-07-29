from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

urlpatterns = [
    path('register/', views.register, name='register'),
    path('login/', TokenObtainPairView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', views.profile, name='profile'),
    path('volunteers/nearby/', views.nearby_volunteers, name='nearby_volunteers'),
    path('update-location/', views.update_location, name='update_location'),
    path('sos/', views.sos_alert, name='sos_alert'),
    path('analyze/', views.analyze_injury, name='analyze_injury'),
    path('chat/', views.medical_chat, name='medical_chat'),
    path('alerts/', views.volunteer_alerts, name='volunteer_alerts'),
    path('alerts/<int:alert_id>/accept/', views.accept_alert, name='accept_alert'),
    path('gov-stats/', views.gov_dashboard, name='gov_dashboard'),
    path('profile/update/', views.update_profile, name='update_profile'),
    path('profile/change-password/', views.change_password, name='change_password'),
    path('push/subscribe/', views.subscribe_push, name='subscribe_push'),
    path('push/vapid-key/', views.get_vapid_key, name='get_vapid_key'),
    path('alerts/<int:alert_id>/decline/', views.decline_alert, name='decline_alert'),
    path('alerts/<int:alert_id>/delete/', views.delete_incident, name='delete_incident'),
    path('alerts/<int:alert_id>/delete-voice/', views.delete_voice_note, name='delete_voice_note'),
    path('alerts/<int:alert_id>/delete-image/', views.delete_image, name='delete_image'),
]
