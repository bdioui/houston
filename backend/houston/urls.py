from django.contrib import admin
from django.urls import include, path

from .views import health

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health, name="health"),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("common.urls")),
    path("api/", include("directory.urls")),
    path("api/", include("finance.urls")),
    path("api/", include("projects.urls")),
    path("api/", include("actions.urls")),
    path("api/", include("sifac.urls")),
]
