from pathlib import Path
from dotenv import load_dotenv

import os
import dj_database_url




BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

SECRET_KEY = os.getenv('SECRET_KEY')
DEBUG = os.getenv('DEBUG', 'False') == 'True'




# 1. المجلد الرئيسي للمشروع
BASE_DIR = Path(__file__).resolve().parent.parent

# 2. مفتاح الأمان (للتطوير فقط)
SECRET_KEY = 'django-insecure-lo34f#*t9g2nn__z78z!15!^p%7juru%stlgz#^b_qvy_$-%r@'

DEBUG = True
ALLOWED_HOSTS = ['*']
# 3. التطبيقات المثبتة (مدمجة جميعاً هنا)
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # مكتبات جديدة
    'rest_framework',
    'corsheaders',
    # تطبيقاتنا
    'core',
]

# 4. البرمجيات الوسيطة (مع إضافة CORS في الأعلى)
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware', # ضروري لربط الفرونت-إند لاحقاً
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'musef_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],  
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'musef_backend.wsgi.application'

# 5. قاعدة البيانات
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# 6. التحقق من كلمة المرور
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# 7. اللغة والوقت
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# 8. الملفات الثابتة
STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# 9. إعدادات CORS الإضافية
CORS_ALLOW_ALL_ORIGINS = True

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
}
AUTH_USER_MODEL = 'core.User'

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Initialize Firebase Admin SDK
import firebase_admin
from firebase_admin import credentials

FIREBASE_KEY_PATH = BASE_DIR / 'musef_backend' / 'musef-app-firebase-adminsdk-fbsvc-fdc195413b.json'
if FIREBASE_KEY_PATH.exists():
    try:
        cred = credentials.Certificate(str(FIREBASE_KEY_PATH))
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
    except Exception as e:
        print("Failed to initialize Firebase:", e)