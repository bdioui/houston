from django.db import connection, transaction

from .tenant import reset_current_org, set_current_org


class TenantMiddleware:
    """Résout le tenant de la requête et le pose à deux endroits.

    1. Dans le ContextVar, que TenantManager consulte côté Python.
    2. Dans une variable de session PostgreSQL, que les politiques RLS
       consultent côté base.

    La seconde est la garantie réelle : même un QuerySet mal écrit ne peut pas
    ramener les lignes d'un autre laboratoire.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = getattr(request, "user", None)
        org = getattr(user, "organization", None) if user and user.is_authenticated else None

        if org is None:
            # Connexion, health, admin de support : pas de tenant, donc pas de
            # transaction imposée. TenantManager lèvera si un modèle tenant est
            # touché, ce qui est le comportement voulu.
            return self.get_response(request)

        token = set_current_org(org)
        try:
            # SET LOCAL n'a d'effet qu'à l'intérieur d'une transaction et se
            # défait au commit. C'est ce qui empêche un tenant de fuiter sur la
            # requête suivante via une connexion recyclée (CONN_MAX_AGE).
            with transaction.atomic():
                with connection.cursor() as cur:
                    cur.execute("SET LOCAL app.current_org = %s", [str(org.id)])
                return self.get_response(request)
        finally:
            reset_current_org(token)
