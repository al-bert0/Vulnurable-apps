from django.contrib import admin

from .models import AppUser, Product, Comment

admin.site.site_header = "ShopEase Administration"
admin.site.site_title = "ShopEase Admin"
admin.site.index_title = "Manage users, products and comments"


@admin.register(AppUser)
class AppUserAdmin(admin.ModelAdmin):
    # VULN (intentional): plaintext passwords and SSNs are shown straight in
    # the admin list/search, mirroring how the app stores them (CWE-256 / CWE-359).
    list_display = ("id", "username", "password", "email", "is_admin", "ssn")
    list_display_links = ("id", "username")
    list_filter = ("is_admin",)
    search_fields = ("username", "email", "ssn")
    list_editable = ("is_admin",)
    ordering = ("id",)


class CommentInline(admin.TabularInline):
    model = Comment
    extra = 0
    fields = ("author", "body", "created_at")
    readonly_fields = ("created_at",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "price", "comment_count")
    search_fields = ("name", "description")
    ordering = ("id",)
    inlines = [CommentInline]

    @admin.display(description="Comments")
    def comment_count(self, obj):
        return obj.comments.count()


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    # VULN (intentional): comment bodies are stored raw (stored XSS payloads
    # stay intact); Django's admin escapes output, so this is for management only.
    list_display = ("id", "product", "author", "short_body", "created_at")
    list_filter = ("product", "created_at")
    search_fields = ("author", "body")
    date_hierarchy = "created_at"
    ordering = ("-created_at",)

    @admin.display(description="Body")
    def short_body(self, obj):
        return (obj.body[:60] + "…") if len(obj.body) > 60 else obj.body
