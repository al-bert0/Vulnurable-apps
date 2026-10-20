import os
import sys
from pathlib import Path
from django.core.wsgi import get_wsgi_application

# Ensure the parent directory is on sys.path so 'backend' package resolves
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR.parent))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

application = get_wsgi_application()
