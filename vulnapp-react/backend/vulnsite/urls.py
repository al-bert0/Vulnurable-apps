from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("django-admin/", admin.site.urls),  # real Django admin, left at default path on purpose (CWE-200 discoverability)
    path("api/", include("api.urls")),
]
