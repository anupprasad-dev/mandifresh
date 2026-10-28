from django.urls import path

from . import views

urlpatterns = [
    path("register/", views.CustomerRegisterView.as_view()),
    path("login/", views.CustomerLoginView.as_view()),
    path("refresh/", views.RefreshView.as_view()),
    path("logout/", views.LogoutView.as_view()),
    path("me/", views.MeView.as_view()),
    path("change-password/", views.ChangePasswordView.as_view()),
    path("password-reset/", views.PasswordResetRequestView.as_view()),
    path("password-reset/confirm/", views.PasswordResetConfirmView.as_view()),
]
