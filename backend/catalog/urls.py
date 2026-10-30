from django.urls import include, path
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register("seller/products", views.SellerProductViewSet, basename="seller-products")

urlpatterns = [
    path("home/", views.HomeView.as_view()),
    path("categories/", views.CategoryListView.as_view()),
    path("products/", views.ProductListView.as_view()),
    path("products/<int:pk>/image/", views.product_image),
    path("products/<slug:slug>/", views.ProductDetailView.as_view()),
    path("seller/products/<int:pk>/image/", views.SellerProductImageView.as_view()),
    path("seller/stats/", views.SellerStatsView.as_view()),
    path("", include(router.urls)),
]
