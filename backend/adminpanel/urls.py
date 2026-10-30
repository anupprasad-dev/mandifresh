from django.urls import include, path
from rest_framework.routers import SimpleRouter

from accounts.views import AdminLoginView

from . import views

router = SimpleRouter()
router.register("products", views.AdminProductViewSet, basename="admin-products")
router.register("categories", views.AdminCategoryViewSet, basename="admin-categories")

# Reached only by typing the admin URL in the browser; never linked from the storefront.
urlpatterns = [
    path("auth/login/", AdminLoginView.as_view()),
    path("stats/", views.AdminStatsView.as_view()),
    path("users/", views.AdminUserListView.as_view()),
    path("users/<int:pk>/active/", views.AdminUserActiveView.as_view()),
    path("sellers/<int:pk>/approval/", views.AdminSellerApprovalView.as_view()),
    path("orders/", views.AdminOrderListView.as_view()),
    path("", include(router.urls)),
]
