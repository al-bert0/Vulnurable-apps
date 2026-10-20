import os
import sys
from pathlib import Path
from django.core.wsgi import get_wsgi_application
import sys
from django.template import context

# Definitive Python 3.14 template rendering fix for Django 4.2 Admin
if sys.version_info >= (3, 14):
    if not hasattr(context.RenderContext, 'dicts'):
        @property
        def render_context_dicts(self):
            return self
        context.RenderContext.dicts = render_context_dicts


# Ensure the parent directory is on sys.path so 'backend' package resolves
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR.parent))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

application = get_wsgi_application()
