from django.db import models


class AppUser(models.Model):
    """A deliberately separate, custom user table (not django.contrib.auth)
    so that the login/search endpoints can use hand-written SQL, the way a
    real legacy system often does."""
    username = models.CharField(max_length=150, unique=True)
    password = models.CharField(max_length=128)  # VULN: plaintext (CWE-256)
    email = models.EmailField()
    is_admin = models.BooleanField(default=False)
    ssn = models.CharField(max_length=20, blank=True, default="")  # VULN: sensitive data stored/exposed

    def __str__(self):
        return self.username


class Product(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField()
    price = models.DecimalField(max_digits=8, decimal_places=2)

    def __str__(self):
        return self.name


class Comment(models.Model):
    product = models.ForeignKey(Product, related_name="comments", on_delete=models.CASCADE)
    author = models.CharField(max_length=100)
    body = models.TextField()  # VULN: rendered unescaped on the frontend -> stored XSS
    created_at = models.DateTimeField(auto_now_add=True)
