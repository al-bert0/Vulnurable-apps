#!/usr/bin/env python
import os
import sys
from pathlib import Path

def main():
    # Add parent directory (VUL) to sys.path
    BASE_DIR = Path(__file__).resolve().parent
    sys.path.insert(0, str(BASE_DIR.parent))

    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are dependencies installed?"
        ) from exc
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()
