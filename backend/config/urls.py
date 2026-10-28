from django.conf import settings
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def health(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path(settings.ADMIN_URL, admin.site.urls),
    path("api/health/", health),
    path("api/auth/", include("accounts.urls")),
    path("api/seller/", include("accounts.seller_urls")),
    path("api/", include("catalog.urls")),
    path("api/", include("orders.urls")),
]
