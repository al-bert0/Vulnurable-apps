from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    ROLE_CHOICES = (
        ('customer', 'Customer'),
        ('manager', 'Product Manager'),
        ('admin', 'Site Administrator'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    wallet_balance = models.DecimalField(max_digits=10, decimal_places=2, default=250.00)

class Product(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=100, default='General')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.FileField(upload_to='product_images/', null=True, blank=True)
    manufacturer_url = models.CharField(max_length=500, blank=True, default='')
    is_released = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} (${self.price})"

class Coupon(models.Model):
    code = models.CharField(max_length=50, unique=True)
    discount_percent = models.IntegerField(default=20)
    times_used = models.IntegerField(default=0)
    max_uses = models.IntegerField(default=1)

class Review(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

class Order(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    shipping_address = models.TextField()
    credit_card_mask = models.CharField(max_length=20, default='****-****-****-4242')
    created_at = models.DateTimeField(auto_now_add=True)

class LabToggle(models.Model):
    code = models.CharField(max_length=60, unique=True)
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=100)
    description = models.TextField()
    exploit_hint = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=False)

    class Meta:
        ordering = ['id']

    def __str__(self):
        status = "🟢 ACTIVE" if self.is_active else "🔴 OFF"
        return f"[{status}] {self.code} - {self.title}"
