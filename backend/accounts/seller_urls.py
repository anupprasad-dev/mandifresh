from django.urls import path

from . import views

# Seller authentication lives under /api/seller/auth/ and is never linked from the public storefront.
urlpatterns = [
    path("auth/register/", views.SellerRegisterView.as_view()),
    path("auth/login/", views.SellerLoginView.as_view()),
]
