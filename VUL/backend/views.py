import os
import subprocess
from django.db import connection
from django.contrib.auth import authenticate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Product, User, Order, LabToggle

def is_vuln_active(slug):
    return LabToggle.objects.filter(code=slug, is_active=True).exists()

# Fixes the "Error: Log in" by returning a JWT token and user role
class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        # Lab 9: Brute force bypass via X-Forwarded-For spoofing
        if is_vuln_active('AUTH_BRUTE_FORCE_XFF'):
            client_ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR'))
            # IP check bypass logic here

        user = authenticate(username=username, password=password)
        if not user:
            return Response({"error": "Invalid username or password"}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        return Response({
            "token": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": user.id,
                "username": user.username,
                "role": user.role,
                "is_staff": user.is_staff
            }
        })

class ActiveLabsView(APIView):
    permission_classes = [permissions.AllowAny]
    def get(self, request):
        active = LabToggle.objects.filter(is_active=True).values('code', 'title', 'category', 'description')
        return Response(list(active))

class ProductListView(APIView):
    permission_classes = [permissions.AllowAny]
    def get(self, request):
        category = request.GET.get('category', '')

        # LAB 1: SQLi UNION Attack (Dump auth_user credentials)
        if is_vuln_active('SQLI_CATALOG_UNION') and category:
            query = f"SELECT id, name, description, price, image FROM labs_product WHERE category = '{category}' AND is_released = 1"
            with connection.cursor() as cursor:
                cursor.execute(query)
                cols = [col[0] for col in cursor.description]
                products = [dict(zip(cols, row)) for row in cursor.fetchall()]
            return Response(products)

        queryset = Product.objects.filter(is_released=True)
        if category:
            queryset = queryset.filter(category=category)
        return Response([{
            "id": p.id, "name": p.name, "description": p.description,
            "category": p.category, "price": str(p.price),
            "image": p.image.url if p.image else None
        } for p in queryset])

class AdminProductManageView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # LAB 5: Role Privilege Check
        if request.user.role != 'admin' and not request.user.is_staff:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)

        name = request.data.get('name')
        price = request.data.get('price')
        category = request.data.get('category', 'General')
        description = request.data.get('description', '')
        image = request.FILES.get('image')

        # LAB 13: Unrestricted File Upload
        if is_vuln_active('UPLOAD_NO_EXT_RESTRICTION') and image:
            upload_dir = os.path.join('media', 'product_images')
            os.makedirs(upload_dir, exist_ok=True)
            path = os.path.join(upload_dir, image.name)
            with open(path, 'wb+') as dest:
                for chunk in image.chunks():
                    dest.write(chunk)
            p = Product.objects.create(name=name, price=price, category=category, description=description, image=f"product_images/{image.name}")
            return Response({"message": "Product created", "id": p.id}, status=201)

        # LAB 37: Command Injection
        if is_vuln_active('CMD_IMAGE_CONVERSION') and image:
            subprocess.run(f"echo 'Processing image {image.name}' >> /tmp/image_log.txt", shell=True)

        # Secure File Upload Validation
        if image:
            ext = os.path.splitext(image.name)[1].lower()
            if ext not in ['.jpg', '.jpeg', '.png', '.webp']:
                return Response({"error": "Only valid images allowed."}, status=400)

        p = Product.objects.create(name=name, price=price, category=category, description=description, image=image)
        return Response({"message": "Product created successfully", "id": p.id}, status=201)

    def delete(self, request, pk=None):
        # LAB 6: Unprotected admin deletion
        if not is_vuln_active('BAC_UNPROTECTED_ADMIN'):
            if request.user.role != 'admin' and not request.user.is_staff:
                return Response({"error": "Unauthorized"}, status=403)

        try:
            prod = Product.objects.get(pk=pk)
            prod.delete()
            return Response({"message": f"Product {pk} deleted successfully"})
        except Product.DoesNotExist:
            return Response({"error": "Product not found"}, status=404)

    def patch(self, request, pk=None):
        # LAB 8: Method-based bypass check
        if not is_vuln_active('BAC_METHOD_BYPASS'):
            if request.user.role != 'admin' and not request.user.is_staff:
                return Response({"error": "Unauthorized"}, status=403)

        prod = Product.objects.get(pk=pk)
        prod.price = request.data.get('price', prod.price)
        prod.save()
        return Response({"message": "Price updated successfully", "price": str(prod.price)})
