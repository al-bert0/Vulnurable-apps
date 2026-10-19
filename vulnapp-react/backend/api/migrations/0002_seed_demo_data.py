"""
Seeds the demo accounts/products automatically on `python manage.py migrate`,
so the documented logins (alice/alice123, bob/bobpass, admin/admin!2024) work
without having to remember to run `manage.py seed` first.

Only inserts when the tables are empty, so it never clobbers existing data.
(Plaintext passwords + SSNs are intentional — see VULNERABILITIES.md.)
"""
from django.db import migrations


def seed(apps, schema_editor):
    AppUser = apps.get_model("api", "AppUser")
    Product = apps.get_model("api", "Product")
    Comment = apps.get_model("api", "Comment")

    if not AppUser.objects.exists():
        AppUser.objects.create(username="alice", password="alice123", email="alice@example.com", is_admin=False, ssn="123-45-6789")
        AppUser.objects.create(username="bob", password="bobpass", email="bob@example.com", is_admin=False, ssn="987-65-4321")
        AppUser.objects.create(username="admin", password="admin!2024", email="admin@example.com", is_admin=True, ssn="000-00-0000")

    if not Product.objects.exists():
        p1 = Product.objects.create(name="Wireless Mouse", description="Ergonomic 2.4GHz wireless mouse", price="19.99")
        p2 = Product.objects.create(name="Mechanical Keyboard", description="RGB backlit mechanical keyboard", price="59.99")
        Product.objects.create(name="USB-C Hub", description="7-in-1 USB-C hub with HDMI", price="29.99")
        Product.objects.create(name="Webcam 1080p", description="Full HD webcam with autofocus", price="34.99")
        Product.objects.create(name="Laptop Stand", description="Aluminum adjustable laptop stand", price="24.99")
        Comment.objects.create(product=p1, author="alice", body="Great mouse, very responsive!")
        Comment.objects.create(product=p2, author="bob", body="Love the RGB lighting on this keyboard.")


class Migration(migrations.Migration):
    dependencies = [("api", "0001_initial")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
