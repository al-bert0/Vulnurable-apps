"""
Each view below is deliberately vulnerable. See VULNERABILITIES.md for the
full writeup (CWE id, exploit request, and the fix) for every one.
"""
import os
import subprocess

from django.db import connection
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from django.conf import settings
from .models import AppUser, Product, Comment
from .serializers import AppUserSerializer, ProductSerializer, CommentSerializer


# ---------------------------------------------------------------------------
# PAGE 1: Login — SQL Injection (auth bypass) via raw cursor + string format
# ---------------------------------------------------------------------------
@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get("username", "")
    password = request.data.get("password", "")

    # VULN: raw SQL built with an f-string instead of parameters (CWE-89).
    # Try username:  admin' --
    query = f"SELECT id, username, password, email, is_admin, ssn FROM api_appuser WHERE username = '{username}' AND password = '{password}'"
    with connection.cursor() as cursor:
        try:
            cursor.execute(query)
            row = cursor.fetchone()
        except Exception as e:
            # VULN: raw DB error text returned to the client (CWE-209)
            return Response({"error": str(e), "query": query}, status=500)

    if row:
        user = {
            "id": row[0], "username": row[1], "password": row[2],
            "email": row[3], "is_admin": bool(row[4]), "ssn": row[5],
        }
        # VULN: returns plaintext password + SSN in the auth response
        return Response({"success": True, "user": user})
    return Response({"success": False}, status=401)


# ---------------------------------------------------------------------------
# PAGE 6: Register — mass assignment + user enumeration + no password policy
# ---------------------------------------------------------------------------
@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def register_view(request):
    username = str(request.data.get("username", "")).strip()
    password = str(request.data.get("password", ""))
    if not username or not password:
        return Response({"error": "username and password are required"}, status=400)

    # VULN: user enumeration (CWE-204) — distinct response for existing names.
    if AppUser.objects.filter(username=username).exists():
        return Response({"error": f"Username '{username}' is already taken"}, status=409)

    # VULN: mass assignment (CWE-915) — the whole request body goes straight
    # into the serializer, so a client can register with "is_admin": true.
    # VULN: no password policy, stored in plaintext (CWE-256 / CWE-521),
    # no rate limiting / CAPTCHA, no email verification.
    serializer = AppUserSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    # VULN: echoes the plaintext password + SSN back in the response.
    return Response({"success": True, "user": AppUserSerializer(user).data}, status=201)


# ---------------------------------------------------------------------------
# PAGE 2: Product search — SQL Injection (UNION-based data exfiltration)
# ---------------------------------------------------------------------------
@api_view(["GET"])
@permission_classes([AllowAny])
def product_search(request):
    q = request.query_params.get("q", "")
    # VULN: unparameterized LIKE clause; supports UNION SELECT injection.
    # Try: ?q=' UNION SELECT id,username,password,email,is_admin,ssn FROM api_appuser--
    query = f"SELECT id, name, description, price FROM api_product WHERE name LIKE '%{q}%'"
    with connection.cursor() as cursor:
        try:
            cursor.execute(query)
            columns = [c[0] for c in cursor.description]
            rows = [dict(zip(columns, r)) for r in cursor.fetchall()]
        except Exception as e:
            return Response({"error": str(e), "query": query}, status=500)
    return Response(rows)


# ---------------------------------------------------------------------------
# PAGE 3: Profile — IDOR + mass assignment on update
# ---------------------------------------------------------------------------
@api_view(["GET", "PATCH"])
@permission_classes([AllowAny])  # VULN: no auth required, no ownership check
def profile_detail(request, user_id):
    try:
        user = AppUser.objects.get(pk=user_id)
    except AppUser.DoesNotExist:
        return Response({"error": "not found"}, status=404)

    if request.method == "GET":
        # VULN: IDOR (CWE-639) — any caller can read any user's full
        # record, including ssn and plaintext password, by changing user_id.
        return Response(AppUserSerializer(user).data)

    # PATCH: VULN: mass assignment (CWE-915) — client can include
    # "is_admin": true in the body and the serializer will happily apply it,
    # with no check that the caller owns this record or may grant itself admin.
    serializer = AppUserSerializer(user, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


# ---------------------------------------------------------------------------
# PAGE 4: Product detail & comments — Stored XSS (handled on the React side
# via dangerouslySetInnerHTML) + CSRF (explicitly exempted here)
# ---------------------------------------------------------------------------
@api_view(["GET"])
@permission_classes([AllowAny])
def product_detail(request, product_id):
    try:
        product = Product.objects.get(pk=product_id)
    except Product.DoesNotExist:
        return Response({"error": "not found"}, status=404)
    comments = Comment.objects.filter(product=product).order_by("-created_at")
    return Response({
        "product": ProductSerializer(product).data,
        # VULN: comment body is returned raw/unsanitized; the React
        # frontend renders it with dangerouslySetInnerHTML -> stored XSS.
        "comments": CommentSerializer(comments, many=True).data,
    })


@csrf_exempt  # VULN: explicit CSRF exemption on a state-changing endpoint (CWE-352)
@api_view(["POST"])
@permission_classes([AllowAny])
def comment_create(request, product_id):
    try:
        product = Product.objects.get(pk=product_id)
    except Product.DoesNotExist:
        return Response({"error": "not found"}, status=404)
    # VULN: no sanitization, no length limit, no rate limiting
    comment = Comment.objects.create(
        product=product,
        author=request.data.get("author", "anonymous"),
        body=request.data.get("body", ""),
    )
    return Response(CommentSerializer(comment).data, status=201)


@api_view(["GET"])
@permission_classes([AllowAny])
def products_list(request):
    return Response(ProductSerializer(Product.objects.all(), many=True).data)


# ---------------------------------------------------------------------------
# PAGE 5: Admin — broken access control + OS command injection + path traversal
# ---------------------------------------------------------------------------
@api_view(["GET"])
@permission_classes([AllowAny])
def admin_users(request):
    # VULN: broken access control (CWE-284) — a genuinely sensitive admin
    # endpoint with no authentication or role check whatsoever. The
    # frontend only *hides* the Admin nav link based on a localStorage
    # flag; it never actually gates the API.
    return Response(AppUserSerializer(AppUser.objects.all(), many=True).data)


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def admin_ping(request):
    """
    'Network diagnostic' tool. VULN: OS command injection (CWE-78) — the
    host is concatenated into a shell command with shell=True.
    Try: {"host": "127.0.0.1; cat /etc/passwd"}
    """
    host = request.data.get("host", "127.0.0.1")
    cmd = f"ping -c 1 {host}"
    try:
        output = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT, timeout=5)
        return Response({"output": output.decode(errors="replace")})
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
@permission_classes([AllowAny])
def admin_file_download(request):
    """
    'Download a report' feature. VULN: path traversal (CWE-22) — the
    filename is joined onto REPORTS_DIR with no validation.
    Try: ?file=../vulnsite/settings.py  or  ?file=../../../../etc/passwd
    """
    filename = request.query_params.get("file", "internal_notes.txt")
    path = os.path.join(settings.REPORTS_DIR, filename)  # no normalization/allowlist
    try:
        with open(path, "r", errors="replace") as f:
            content = f.read()
        return Response({"filename": filename, "content": content})
    except Exception as e:
        return Response({"error": str(e)}, status=404)
