from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static

# Import directly from local views.py in the same folder
from views import (
    LoginView, ActiveLabsView, ProductListView, AdminProductManageView
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', LoginView.as_view(), name='api-login'),
    path('api/labs/active/', ActiveLabsView.as_view(), name='active-labs'),
    path('api/products/', ProductListView.as_view(), name='product-list'),
    path('api/admin/products/', AdminProductManageView.as_view(), name='admin-product-create'),
    path('api/admin/products/<int:pk>/', AdminProductManageView.as_view(), name='admin-product-delete'),
    path('api/admin/products/<int:pk>/price/', AdminProductManageView.as_view(), name='admin-product-price'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
