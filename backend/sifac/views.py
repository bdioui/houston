from dataclasses import asdict

from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from common.tenant import get_current_org

from .importer import preview, run_import
from .models import SifacLine
from .parse import SifacParseError
from .serializers import SifacLineSerializer


class SifacLineViewSet(viewsets.ReadOnlyModelViewSet):
    """Lecture seule : ces lignes ne sont écrites que par l'import, jamais par
    le client. D'où `ReadOnlyModelViewSet` et non `TenantViewSet` — il n'y a
    pas de `create` à qui poser l'organisation. Le cloisonnement reste assuré
    par `SifacLine.objects`, qui est un TenantManager.
    """

    serializer_class = SifacLineSerializer

    # `filterset_fields` et non `build_filterset` : SifacLine n'a aucune clé
    # étrangère, la table est volontairement plate. Ces trois champs sont des
    # chaînes, et ce sont exactement les deux index posés sur le modèle —
    # (pfi, exercice) pour le remplacement de périmètre, flux_id pour
    # l'agrégation.
    filterset_fields = ["pfi", "exercice", "flux_id"]

    def get_queryset(self):
        return SifacLine.objects.all()


class _SifacUploadView(APIView):
    """Socle des deux temps de l'import.

    `MultiPartParser` seul : le corps est un fichier, jamais du JSON. Le
    déclarer ferme aussi la porte à un POST JSON qui échouerait plus loin avec
    un message obscur.
    """

    parser_classes = [MultiPartParser]

    def get_file(self, request):
        f = request.FILES.get("file")
        if f is None:
            raise ValidationError({"detail": "Aucun fichier reçu (champ « file »)."})
        return f


class SifacPreviewView(_SifacUploadView):
    """Premier temps : lire sans écrire.

    Aucune trace n'est gardée entre les deux appels — ni en base, ni en cache.
    Le client renvoie le fichier pour confirmer, et c'est ce qui rend l'import
    sans état : pas d'entrée orpheline si l'utilisateur abandonne, pas de
    péremption à gérer. Le coût est une seconde lecture du fichier.
    """

    def post(self, request):
        try:
            return Response(preview(self.get_file(request)))
        except SifacParseError as exc:
            # Le fichier est en cause, pas le code : 400 et le message tel
            # quel, il est écrit pour être lu par l'utilisateur.
            raise ValidationError({"detail": str(exc)}) from exc


class SifacImportView(_SifacUploadView):
    """Second temps : écrire.

    L'exercice vient du formulaire et non du fichier : il n'y figure pas, et
    c'est lui qui désigne le périmètre à écraser. Le parcours est donc
    obligatoirement `preview` puis confirmation.
    """

    def post(self, request):
        raw = request.data.get("exercice")
        try:
            exercice = int(raw)
        except (TypeError, ValueError):
            raise ValidationError(
                {"detail": f"Exercice invalide : {raw!r} (un entier est attendu)."}
            )

        try:
            summary = run_import(self.get_file(request), exercice, get_current_org())
        except SifacParseError as exc:
            raise ValidationError({"detail": str(exc)}) from exc

        return Response(asdict(summary), status=status.HTTP_200_OK)
