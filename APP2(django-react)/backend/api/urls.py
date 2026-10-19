from django.urls import path
from . import views

urlpatterns = [
    path("login/", views.login_view),
    path("register/", views.register_view),
    path("products/", views.products_list),
    path("products/search/", views.product_search),
    path("products/<int:product_id>/", views.product_detail),
    path("products/<int:product_id>/comments/", views.comment_create),
    path("profile/<int:user_id>/", views.profile_detail),
    path("admin/users/", views.admin_users),
    path("admin/ping/", views.admin_ping),
    path("admin/files/", views.admin_file_download),
]
