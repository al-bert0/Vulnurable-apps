from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import connection
from api.models import AppUser, Product, Comment


class Command(BaseCommand):
    help = "Wipe and reseed demo data for VulnApp"

    def handle(self, *args, **options):
        Comment.objects.all().delete()
        Product.objects.all().delete()
        AppUser.objects.all().delete()

        # SQLite AUTOINCREMENT keeps counting after a delete, so without this the reseeded
        # users would get ids 4,5,6 and the documented /profile/1..3 URLs would 404.
        if connection.vendor == "sqlite":
            with connection.cursor() as cursor:
                cursor.execute(
                    "DELETE FROM sqlite_sequence WHERE name IN ('api_appuser', 'api_product', 'api_comment')"
                )

        AppUser.objects.create(username="alice", password="alice123", email="alice@example.com", is_admin=False, ssn="123-45-6789")
        AppUser.objects.create(username="bob", password="bobpass", email="bob@example.com", is_admin=False, ssn="987-65-4321")
        AppUser.objects.create(username="admin", password="admin!2024", email="admin@example.com", is_admin=True, ssn="000-00-0000")

        p1 = Product.objects.create(name="Wireless Mouse", description="Ergonomic 2.4GHz wireless mouse", price=19.99)
        p2 = Product.objects.create(name="Mechanical Keyboard", description="RGB backlit mechanical keyboard", price=59.99)
        Product.objects.create(name="USB-C Hub", description="7-in-1 USB-C hub with HDMI", price=29.99)
        Product.objects.create(name="Webcam 1080p", description="Full HD webcam with autofocus", price=34.99)
        Product.objects.create(name="Laptop Stand", description="Aluminum adjustable laptop stand", price=24.99)

        Comment.objects.create(product=p1, author="alice", body="Great mouse, very responsive!")
        Comment.objects.create(product=p2, author="bob", body="Love the RGB lighting on this keyboard.")

        # Default Django admin login (intentionally weak): djadmin / djadmin123
        User = get_user_model()
        if not User.objects.filter(username="djadmin").exists():
            User.objects.create_superuser("djadmin", "djadmin@example.com", "djadmin123")

        self.stdout.write(self.style.SUCCESS("Seeded demo data + Django admin (djadmin / djadmin123)."))
