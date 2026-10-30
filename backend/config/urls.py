from django.http import JsonResponse
from django.urls import include, path


def health(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("api/health/", health),
    path("api/auth/", include("accounts.urls")),
    path("api/seller/", include("accounts.seller_urls")),
    path("api/admin/", include("adminpanel.urls")),  # custom admin API (Django's built-in admin is not used)
    path("api/", include("catalog.urls")),
    path("api/", include("orders.urls")),
]
