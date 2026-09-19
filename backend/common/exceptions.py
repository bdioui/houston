from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

from .tenant import ProgramContextRequired, TenantContextRequired


def exception_handler(exc, context):
    """Traduit les absences de contexte en refus lisibles plutôt qu'en 500.

    La ligne de partage n'est pas « quel axe manque » mais « le client peut-il y
    remédier ». Un compte sans aucun rattachement n'a rien à choisir : lui
    répondre « choisissez » l'enverrait dans une boucle. C'est un refus d'accès,
    et ça se dit en 403. Un compte qui a des laboratoires sans en avoir désigné
    un a simplement un écran à ouvrir : 409.

    D'où la lecture de `request.org_choices`, posé par TenantMiddleware. La
    couche modèle ne peut pas faire cette distinction — elle ne voit qu'un
    ContextVar vide — et n'a pas à la faire : elle ignore tout du transport.

    409 et non 403 dans le second cas, parce que le client n'est pas privé du
    droit d'accès : il n'a pas encore dit *où* il travaille. Un 403 pousserait
    le front vers l'écran de connexion alors que la session est parfaitement
    valide ; un 409 l'envoie vers un sélecteur, que `/api/organizations/` et
    `/api/programs/` lui laissent toujours joignable.

    Effet de bord important, et c'est la moitié de l'intérêt : SessionMiddleware
    refuse d'enregistrer la session sur une réponse >= 500. Tant que ces cas
    partaient en 500, la purge de la clé périmée faite par TenantMiddleware
    était perdue à chaque requête, et un rattachement révoqué restait en session
    indéfiniment.
    """
    if isinstance(exc, TenantContextRequired):
        request = context.get("request")
        if getattr(request, "org_choices", 0) > 0:
            return Response(
                {
                    "detail": "Aucun laboratoire actif pour cette session.",
                    "code": "no_organization",
                },
                status=status.HTTP_409_CONFLICT,
            )
        return Response(
            {
                "detail": "Ce compte n'est rattaché à aucun laboratoire.",
                "code": "no_organization",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    if isinstance(exc, ProgramContextRequired):
        return Response(
            {
                "detail": "Aucun programme actif pour cette session.",
                "code": "no_program",
            },
            status=status.HTTP_409_CONFLICT,
        )
    return drf_exception_handler(exc, context)
