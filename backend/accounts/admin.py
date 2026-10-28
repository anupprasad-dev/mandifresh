from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import BaseUserCreationForm, UserChangeForm

from .models import SellerProfile, User


class AdminUserCreationForm(BaseUserCreationForm):
    class Meta:
        model = User
        fields = ("email", "name", "role")


class AdminUserChangeForm(UserChangeForm):
    class Meta:
        model = User
        fields = "__all__"


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    form = AdminUserChangeForm
    add_form = AdminUserCreationForm
    ordering = ("email",)
    list_display = ("email", "name", "role", "is_active", "date_joined")
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("email", "name", "phone")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Profile", {"fields": ("name", "phone", "role")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "name", "role", "password1", "password2")}),
    )


@admin.register(SellerProfile)
class SellerProfileAdmin(admin.ModelAdmin):
    list_display = ("store_name", "user", "city", "created_at")
    search_fields = ("store_name", "user__email")
