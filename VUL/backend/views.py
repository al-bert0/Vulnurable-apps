import os
import subprocess
from django.db import connection
from django.http import JsonResponse, HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .models import Product, User, Order, Review, Coupon, LabToggle

def is_vuln_active(slug):
    return LabToggle.objects.filter(code=slug, is_active=True).exists()

class ActiveLabsView(APIView):
    """Allows students & UI to see which lab session is currently enabled."""
    def get(self, request):
        active = LabToggle.objects.filter(is_active=True).values('code', 'title', 'category', 'description')
        return Response(list(active))

class ProductListView(APIView):
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

        # Secure Path
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
        # LAB 5: Privilege Escalation check (requires admin role)
        if request.user.role != 'admin' and not request.user.is_staff:
            return Response({"error": "Admin access required"}, status=403)

        name = request.data.get('name')
        price = request.data.get('price')
        category = request.data.get('category', 'General')
        description = request.data.get('description', '')
        image = request.FILES.get('image')

        # LAB 13: Unrestricted File Upload (Web Shell)
        if is_vuln_active('UPLOAD_NO_EXT_RESTRICTION') and image:
            upload_dir = os.path.join('media', 'product_images')
            os.makedirs(upload_dir, exist_ok=True)
            path = os.path.join(upload_dir, image.name)
            with open(path, 'wb+') as dest:
                for chunk in image.chunks():
                    dest.write(chunk)
            p = Product.objects.create(name=name, price=price, category=category, description=description, image=f"product_images/{image.name}")
            return Response({"message": "Product created (Unrestricted Upload)", "id": p.id}, status=201)

        # LAB 37: Command Injection via image converter
        if is_vuln_active('CMD_IMAGE_CONVERSION') and image:
            subprocess.run(f"echo 'Processing image {image.name}' >> /tmp/image_log.txt", shell=True)

        # Secure File Upload (Extension whitelist)
        if image:
            ext = os.path.splitext(image.name)[1].lower()
            if ext not in ['.jpg', '.jpeg', '.png', '.webp']:
                return Response({"error": "Only valid images (.png, .jpg, .webp) allowed."}, status=400)

        p = Product.objects.create(name=name, price=price, category=category, description=description, image=image)
        return Response({"message": "Product created successfully", "id": p.id}, status=201)

    def delete(self, request, pk=None):
        # LAB 6: Unprotected Admin Deletion
        if not is_vuln_active('BAC_UNPROTECTED_ADMIN'):
            if request.user.role != 'admin' and not request.user.is_staff:
                return Response({"error": "Admin authorization required"}, status=403)

        try:
            prod = Product.objects.get(pk=pk)
            prod.delete()
            return Response({"message": f"Product {pk} deleted successfully"})
        except Product.DoesNotExist:
            return Response({"error": "Product not found"}, status=404)

    def patch(self, request, pk=None):
        """Change product price."""
        if not is_vuln_active('BAC_METHOD_BYPASS'):
            if request.user.role != 'admin' and not request.user.is_staff:
                return Response({"error": "Admin authorization required"}, status=403)

        prod = Product.objects.get(pk=pk)
        prod.price = request.data.get('price', prod.price)
        prod.save()
        return Response({"message": "Price updated successfully", "price": str(prod.price)})

class UserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        user = request.user
        # LAB 5: Role Mass Assignment (Privilege Escalation)
        if is_vuln_active('BAC_ROLE_MASS_ASSIGN'):
            for k, v in request.data.items():
                setattr(user, k, v)
            user.save()
            return Response({"message": "Profile updated", "role": user.role})

        # Secure Path
        user.first_name = request.data.get('first_name', user.first_name)
        user.last_name = request.data.get('last_name', user.last_name)
        user.save()
        return Response({"message": "Profile updated successfully"})

class CheckoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        items = request.data.get('items', [])
        total = 0.0

        for item in items:
            product = Product.objects.get(id=item['product_id'])
            
            # LAB 17: Price Tampering (Excessive trust in client input)
            if is_vuln_active('LOGIC_PRICE_TAMPER'):
                price = float(item.get('price', product.price))
            else:
                price = float(product.price)

            # LAB 18: Negative Quantity flaw
            qty = int(item.get('quantity', 1))
            if not is_vuln_active('LOGIC_NEGATIVE_QUANTITY') and qty <= 0:
                return Response({"error": "Invalid quantity"}, status=400)

            total += price * qty

        if request.user.wallet_balance < total:
            return Response({"error": "Insufficient balance"}, status=400)

        request.user.wallet_balance -= total
        request.user.save()
        order = Order.objects.create(user=request.user, total_amount=total, shipping_address=request.data.get('address', 'Default'))
        return Response({"message": "Order placed", "order_id": order.id, "remaining_balance": float(request.user.wallet_balance)})import os
import subprocess
from django.db import connection
from django.http import JsonResponse, HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .models import Product, User, Order, Review, Coupon, LabToggle

def is_vuln_active(slug):
    return LabToggle.objects.filter(code=slug, is_active=True).exists()

class ActiveLabsView(APIView):
    """Allows students & UI to see which lab session is currently enabled."""
    def get(self, request):
        active = LabToggle.objects.filter(is_active=True).values('code', 'title', 'category', 'description')
        return Response(list(active))

class ProductListView(APIView):
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

        # Secure Path
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
        # LAB 5: Privilege Escalation check (requires admin role)
        if request.user.role != 'admin' and not request.user.is_staff:
            return Response({"error": "Admin access required"}, status=403)

        name = request.data.get('name')
        price = request.data.get('price')
        category = request.data.get('category', 'General')
        description = request.data.get('description', '')
        image = request.FILES.get('image')

        # LAB 13: Unrestricted File Upload (Web Shell)
        if is_vuln_active('UPLOAD_NO_EXT_RESTRICTION') and image:
            upload_dir = os.path.join('media', 'product_images')
            os.makedirs(upload_dir, exist_ok=True)
            path = os.path.join(upload_dir, image.name)
            with open(path, 'wb+') as dest:
                for chunk in image.chunks():
                    dest.write(chunk)
            p = Product.objects.create(name=name, price=price, category=category, description=description, image=f"product_images/{image.name}")
            return Response({"message": "Product created (Unrestricted Upload)", "id": p.id}, status=201)

        # LAB 37: Command Injection via image converter
        if is_vuln_active('CMD_IMAGE_CONVERSION') and image:
            subprocess.run(f"echo 'Processing image {image.name}' >> /tmp/image_log.txt", shell=True)

        # Secure File Upload (Extension whitelist)
        if image:
            ext = os.path.splitext(image.name)[1].lower()
            if ext not in ['.jpg', '.jpeg', '.png', '.webp']:
                return Response({"error": "Only valid images (.png, .jpg, .webp) allowed."}, status=400)

        p = Product.objects.create(name=name, price=price, category=category, description=description, image=image)
        return Response({"message": "Product created successfully", "id": p.id}, status=201)

    def delete(self, request, pk=None):
        # LAB 6: Unprotected Admin Deletion
        if not is_vuln_active('BAC_UNPROTECTED_ADMIN'):
            if request.user.role != 'admin' and not request.user.is_staff:
                return Response({"error": "Admin authorization required"}, status=403)

        try:
            prod = Product.objects.get(pk=pk)
            prod.delete()
            return Response({"message": f"Product {pk} deleted successfully"})
        except Product.DoesNotExist:
            return Response({"error": "Product not found"}, status=404)

    def patch(self, request, pk=None):
        """Change product price."""
        if not is_vuln_active('BAC_METHOD_BYPASS'):
            if request.user.role != 'admin' and not request.user.is_staff:
                return Response({"error": "Admin authorization required"}, status=403)

        prod = Product.objects.get(pk=pk)
        prod.price = request.data.get('price', prod.price)
        prod.save()
        return Response({"message": "Price updated successfully", "price": str(prod.price)})

class UserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        user = request.user
        # LAB 5: Role Mass Assignment (Privilege Escalation)
        if is_vuln_active('BAC_ROLE_MASS_ASSIGN'):
            for k, v in request.data.items():
                setattr(user, k, v)
            user.save()
            return Response({"message": "Profile updated", "role": user.role})

        # Secure Path
        user.first_name = request.data.get('first_name', user.first_name)
        user.last_name = request.data.get('last_name', user.last_name)
        user.save()
        return Response({"message": "Profile updated successfully"})

class CheckoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        items = request.data.get('items', [])
        total = 0.0

        for item in items:
            product = Product.objects.get(id=item['product_id'])
            
            # LAB 17: Price Tampering (Excessive trust in client input)
            if is_vuln_active('LOGIC_PRICE_TAMPER'):
                price = float(item.get('price', product.price))
            else:
                price = float(product.price)

            # LAB 18: Negative Quantity flaw
            qty = int(item.get('quantity', 1))
            if not is_vuln_active('LOGIC_NEGATIVE_QUANTITY') and qty <= 0:
                return Response({"error": "Invalid quantity"}, status=400)

            total += price * qty

        if request.user.wallet_balance < total:
            return Response({"error": "Insufficient balance"}, status=400)

        request.user.wallet_balance -= total
        request.user.save()
        order = Order.objects.create(user=request.user, total_amount=total, shipping_address=request.data.get('address', 'Default'))
        return Response({"message": "Order placed", "order_id": order.id, "remaining_balance": float(request.user.wallet_balance)})
