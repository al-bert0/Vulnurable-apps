"""
Creates a default Django admin (superuser) so /django-admin/ is usable right
after `migrate`:    djadmin / djadmin123

VULN (intentional): default, guessable admin credentials (CWE-1392) on a
well-known admin path. Created only if a "djadmin" user does not already exist (other superusers are left alone).
"""
from django.contrib.auth.hashers import make_password
from django.db import migrations


def create_superuser(apps, schema_editor):
    User = apps.get_model("auth", "User")
    if User.objects.filter(username="djadmin").exists():
        return
    User.objects.create(
        username="djadmin",
        email="djadmin@example.com",
        password=make_password("djadmin123"),
        is_staff=True,
        is_superuser=True,
        is_active=True,
    )


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0002_seed_demo_data"),
        ("auth", "0012_alter_user_first_name_max_length"),
    ]
    operations = [migrations.RunPython(create_superuser, migrations.RunPython.noop)]
