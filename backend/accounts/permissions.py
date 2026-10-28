from rest_framework.permissions import BasePermission

from .models import User


class IsCustomer(BasePermission):
    message = "Customer account required."

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.role == User.Role.CUSTOMER)


class IsSeller(BasePermission):
    message = "Seller account required."

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.role == User.Role.SELLER and hasattr(u, "seller_profile"))
