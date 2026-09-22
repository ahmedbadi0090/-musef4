from django.db import models
from django.contrib.auth.models import AbstractUser

class Roles(models.Model):
    role_id = models.AutoField(primary_key=True)
    role_name = models.CharField(max_length=50)  # user | volunteer | government
    role_label = models.CharField(max_length=100)  # مستخدم | متطوع | جهة حكومية

    class Meta:
        verbose_name = 'Role'
        verbose_name_plural = 'Roles'

    def __str__(self):
        return f"{self.role_id} - {self.role_name} ({self.role_label})"


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
    
    role = models.ForeignKey(Roles, on_delete=models.SET_NULL, null=True, blank=True, db_column='role_id', related_name='users')
    full_name = models.CharField(max_length=255, blank=True, default='')
    phone = models.CharField(max_length=20, blank=True, default='')
    region = models.CharField(max_length=50, choices=REGION_CHOICES, default='tripoli')
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    is_available = models.BooleanField(default=False)
    
    # Medical profile fields
    blood_type = models.CharField(max_length=10, blank=True, default='')
    chronic_diseases = models.TextField(blank=True, default='')
    emergency_contact = models.CharField(max_length=30, blank=True, default='')
    other_medical_notes = models.TextField(blank=True, default='')

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.username} ({self.full_name or self.username})"


Users = User


class UserEmails(models.Model):
    email_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id', related_name='emails')
    email = models.EmailField(max_length=255)

    class Meta:
        verbose_name = 'User Email'
        verbose_name_plural = 'User Emails'

    def __str__(self):
        return f"{self.email} (User ID: {self.user_id})"


class Location(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id', related_name='locations')
    latitude = models.FloatField()
    longitude = models.FloatField()
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Location'
        verbose_name_plural = 'Locations'

    def __str__(self):
        return f"User {self.user_id}: ({self.latitude}, {self.longitude})"


class Incidents(models.Model):
    STATUS_CHOICES = [
        ('pending', 'في الانتظار'),
        ('active', 'نشط'),
        ('resolved', 'تم الحل'),
    ]
    id = models.AutoField(primary_key=True)
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, db_column='reporter_id', related_name='reported_incidents')
    volunteer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, db_column='volunteer_id', related_name='assigned_incidents')
    gov_responder = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, db_column='gov_responder_id', related_name='gov_assigned_incidents')
    latitude = models.FloatField()
    longitude = models.FloatField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    injury_type = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    image = models.ImageField(upload_to='incidents/', null=True, blank=True)
    voice_note = models.FileField(upload_to='voice_notes/', null=True, blank=True)
    declined_volunteers = models.ManyToManyField(User, blank=True, related_name='declined_incidents')

    class Meta:
        verbose_name = 'Incident'
        verbose_name_plural = 'Incidents'

    def __str__(self):
        return f"Incident #{self.id} - {self.status}"


Incident = Incidents


class AIDiagnosis(models.Model):
    diagnosis_id = models.AutoField(primary_key=True)
    incident = models.ForeignKey(Incidents, on_delete=models.CASCADE, db_column='incident_id', related_name='ai_diagnoses')
    injury_type = models.CharField(max_length=255)
    confidence_score = models.FloatField()
    image_path = models.CharField(max_length=500, blank=True, default='')

    class Meta:
        verbose_name = 'AI Diagnosis'
        verbose_name_plural = 'AI Diagnoses'

    def __str__(self):
        return f"Diagnosis #{self.diagnosis_id} for Incident #{self.incident_id}: {self.injury_type}"


class IncidentAudio(models.Model):
    audio_id = models.AutoField(primary_key=True)
    incident = models.ForeignKey(Incidents, on_delete=models.CASCADE, db_column='incident_id', related_name='audios')
    audio_path = models.CharField(max_length=500, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Incident Audio'
        verbose_name_plural = 'Incident Audios'

    def __str__(self):
        return f"Audio #{self.audio_id} for Incident #{self.incident_id}"


class PushSubscription(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='push_subscriptions')
    endpoint = models.URLField(max_length=500)
    p256dh = models.CharField(max_length=200)
    auth = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.endpoint[:30]}"


class FCMDevice(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='fcm_devices')
    token = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - FCM Device"