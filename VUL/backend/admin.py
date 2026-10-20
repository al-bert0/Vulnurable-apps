from django.contrib import admin
from .models import User, Product, Coupon, Review, Order, LabToggle

@admin.register(LabToggle)
class LabToggleAdmin(admin.ModelAdmin):
    list_display = ('code', 'title', 'category', 'is_active')
    list_filter = ('category', 'is_active')
    search_fields = ('code', 'title')
    list_editable = ('is_active',)  # Directly toggle vulnerabilities ON/OFF from list view

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'price', 'is_released')
    list_filter = ('category', 'is_released')
    search_fields = ('name', 'description')
    list_editable = ('price', 'is_released')

admin.site.register(User)
admin.site.register(Coupon)
admin.site.register(Review)
admin.site.register(Order)
