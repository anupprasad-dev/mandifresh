from django.urls import path

from . import views

urlpatterns = [
    path("orders/", views.OrderListCreateView.as_view()),
    path("orders/<int:pk>/", views.OrderDetailView.as_view()),
    path("orders/<int:pk>/cancel/", views.OrderCancelView.as_view()),
    path("seller/orders/", views.SellerOrderListView.as_view()),
    path("seller/orders/<int:pk>/status/", views.SellerOrderStatusView.as_view()),
]
