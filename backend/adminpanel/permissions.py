from rest_framework.permissions import BasePermission

from accounts.models import User


class IsAdminRole(BasePermission):
    message = "Administrator access required."

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.role == User.Role.ADMIN)
