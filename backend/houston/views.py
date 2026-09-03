from django.db import connection
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt


@csrf_exempt
def health(request):
    """Sonde de vie. Vérifie aussi la base : un backend qui répond sans base
    n'est pas « sain », et c'est exactement ce qu'un healthcheck doit détecter."""
    try:
        with connection.cursor() as cur:
            cur.execute("SELECT 1")
        db = "ok"
    except Exception as exc:  # noqa: BLE001 - on veut le message brut ici
        return JsonResponse({"status": "degraded", "db": str(exc)}, status=503)

    return JsonResponse({"status": "ok", "db": db})
