import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'musef_backend.settings')
django.setup()

from core.models import Roles, User, UserEmails, Location, Incidents, AIDiagnosis, IncidentAudio

def seed():
    print("Starting database seeding according to 7-table ERD...")


    # Clear existing data in order of foreign key dependencies
    IncidentAudio.objects.all().delete()
    AIDiagnosis.objects.all().delete()
    Incidents.objects.all().delete()
    Location.objects.all().delete()
    UserEmails.objects.all().delete()
    User.objects.all().delete()
    Roles.objects.all().delete()

    print("Cleared existing database records.")

    # 1. Create Roles
    r_user = Roles.objects.create(role_id=1, role_name='user', role_label='مستخدم عادي')
    r_vol = Roles.objects.create(role_id=2, role_name='volunteer', role_label='متطوع مسعف')
    r_gov = Roles.objects.create(role_id=3, role_name='government', role_label='جهة حكومية')
    print("Created 3 Roles (User, Volunteer, Government).")

    # 2. Create Users
    # Superuser Admin
    admin_user = User.objects.create_superuser(
        username='admin',
        password='admin123',
        role=r_gov,
        full_name='مدير النظام العام',
        phone='0910000000',
        region='tripoli'
    )

    # Citizen Users
    salem = User.objects.create_user(
        username='salem',
        password='password123',
        role=r_user,
        full_name='سالم بن علي',
        phone='0911234567',
        region='tripoli',
        latitude=32.8850,
        longitude=13.1800,
        blood_type='O+',
        chronic_diseases='ضغط الدم',
        emergency_contact='0911112233',
        other_medical_notes='حساسية من البنسلين'
    )

    fatima = User.objects.create_user(
        username='fatima',
        password='password123',
        role=r_user,
        full_name='فاطمة المصراتي',
        phone='0922345678',
        region='misrata',
        latitude=32.3754,
        longitude=15.0925,
        blood_type='A+',
        chronic_diseases='السكري',
        emergency_contact='0922223344'
    )

    ahmed = User.objects.create_user(
        username='ahmed',
        password='password123',
        role=r_user,
        full_name='أحمد الترهوني',
        phone='0913456789',
        region='benghazi',
        latitude=32.1167,
        longitude=20.0667,
        blood_type='B+'
    )

    # Volunteer Users
    ali_vol = User.objects.create_user(
        username='ali_volunteer',
        password='password123',
        role=r_vol,
        full_name='د. علي الورفلي (مسعف)',
        phone='0919876543',
        region='tripoli',
        latitude=32.8872,
        longitude=13.1913,
        is_available=True,
        blood_type='AB+'
    )

    mariam_vol = User.objects.create_user(
        username='mariam_volunteer',
        password='password123',
        role=r_vol,
        full_name='م. مريم الزاوي (مسعفة)',
        phone='0928765432',
        region='zawiya',
        latitude=32.7522,
        longitude=12.7278,
        is_available=True,
        blood_type='O-'
    )

    # Government Responders
    amb_ops = User.objects.create_user(
        username='ambulance_ops',
        password='password123',
        role=r_gov,
        full_name='غرفة عمليات جهاز الإسعاف والطوارئ',
        phone='0910001122',
        region='tripoli'
    )

    civ_def = User.objects.create_user(
        username='civil_defense',
        password='password123',
        role=r_gov,
        full_name='غرفة عمليات هيئة الدفاع المدني',
        phone='0920003344',
        region='benghazi'
    )

    print("Created Mock Users & Superuser.")

    # 3. Create UserEmails
    UserEmails.objects.create(user=admin_user, email='admin@musef.ly')
    UserEmails.objects.create(user=salem, email='salem@gmail.com')
    UserEmails.objects.create(user=fatima, email='fatima@yahoo.com')
    UserEmails.objects.create(user=ahmed, email='ahmed@gmail.com')
    UserEmails.objects.create(user=ali_vol, email='dr.ali@paramedic.ly')
    UserEmails.objects.create(user=mariam_vol, email='mariam@volunteer.ly')
    UserEmails.objects.create(user=amb_ops, email='ops@ambulance.gov.ly')
    UserEmails.objects.create(user=civ_def, email='civil@defense.gov.ly')
    print("Created UserEmails records.")

    # 4. Create Locations
    Location.objects.create(user=salem, latitude=32.8850, longitude=13.1800)
    Location.objects.create(user=fatima, latitude=32.3754, longitude=15.0925)
    Location.objects.create(user=ahmed, latitude=32.1167, longitude=20.0667)
    Location.objects.create(user=ali_vol, latitude=32.8872, longitude=13.1913)
    Location.objects.create(user=mariam_vol, latitude=32.7522, longitude=12.7278)
    print("Created Location records.")

    # 5. Create Incidents
    inc1 = Incidents.objects.create(
        reporter=salem,
        volunteer=ali_vol,
        gov_responder=amb_ops,
        latitude=32.8850,
        longitude=13.1800,
        status='active',
        injury_type='حادث سير طارئ مع اشتباه كسر في القدم السفلية'
    )

    inc2 = Incidents.objects.create(
        reporter=fatima,
        volunteer=mariam_vol,
        gov_responder=None,
        latitude=32.7500,
        longitude=12.7200,
        status='pending',
        injury_type='حرق سطحي باليد أثناء الطهي'
    )

    inc3 = Incidents.objects.create(
        reporter=ahmed,
        volunteer=ali_vol,
        gov_responder=civ_def,
        latitude=32.8900,
        longitude=13.1950,
        status='resolved',
        injury_type='نزيف حاد جراء جرح قطعي عميق'
    )
    print("Created Incidents records.")

    # 6. Create AIDiagnosis
    AIDiagnosis.objects.create(
        incident=inc1,
        injury_type='كسر وضغط عصبي بالقدم',
        confidence_score=0.94,
        image_path='incidents/mock_traffic_accidental.jpg'
    )

    AIDiagnosis.objects.create(
        incident=inc2,
        injury_type='حروق من الدرجة الثانية',
        confidence_score=0.89,
        image_path='incidents/mock_burn.jpg'
    )

    AIDiagnosis.objects.create(
        incident=inc3,
        injury_type='جرح قطعي ونزيف شرياني',
        confidence_score=0.97,
        image_path='incidents/mock_wound.jpg'
    )
    print("Created AI Diagnosis records.")

    # 7. Create IncidentAudio
    IncidentAudio.objects.create(
        incident=inc1,
        audio_path='voice_notes/mock_sos_salem.mp3'
    )

    IncidentAudio.objects.create(
        incident=inc2,
        audio_path='voice_notes/mock_sos_fatima.mp3'
    )

    IncidentAudio.objects.create(
        incident=inc3,
        audio_path='voice_notes/mock_sos_ahmed.mp3'
    )
    print("Created Incident Audio records.")

    print("\nDatabase Seeding Completed Successfully for all 7 Tables!")

if __name__ == '__main__':
    seed()
