"""
VULNAPP (Django + React edition) settings.
FOR LOCAL SECURITY-TESTING USE ONLY — see VULNERABILITIES.md in the project root.
"""
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# VULN: hardcoded, non-random, checked-into-source secret key (CWE-798).
# If leaked, session cookies / signed data can be forged.
SECRET_KEY = "django-insecure-hardcoded-demo-key-do-not-use-in-prod-123456"

# VULN: DEBUG=True in a "deployed-looking" app leaks stack traces, source
# snippets, settings, and installed packages on every unhandled error (CWE-489).
DEBUG = True

# VULN: wildcard host header acceptance.
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "api",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",  # must be high in the list
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    # VULN: CsrfViewMiddleware intentionally NOT included, so Django's CSRF
    # protection is globally disabled (CWE-352) — on top of csrf_exempt
    # being used explicitly on individual views for emphasis.
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "vulnsite.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "vulnsite.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "vulnapp.db",
    }
}

AUTH_PASSWORD_VALIDATORS = []  # VULN: no password strength rules at all

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# VULN: reflects every origin, allows credentials — any website can call
# this API cross-origin using the victim's cookies/token (CWE-942).
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

REST_FRAMEWORK = {
    # VULN: global default is open access; individual views additionally
    # set AllowAny explicitly where it matters, for clarity.
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
}

REPORTS_DIR = BASE_DIR / "reports"
