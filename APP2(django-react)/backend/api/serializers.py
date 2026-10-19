from rest_framework import serializers
from .models import AppUser, Product, Comment


class AppUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppUser
        # VULN: mass assignment (CWE-915). Every column — including
        # is_admin and password — is writable through this serializer, and
        # the view below applies it directly to PATCH /api/profile/<id>/
        # with no field allowlist and no check that the caller may set
        # privileged fields.
        fields = ["id", "username", "password", "email", "is_admin", "ssn"]


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "name", "description", "price"]


class CommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ["id", "product", "author", "body", "created_at"]
