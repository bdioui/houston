"""Permissions transverses.

Le projet n'en a presque pas, et c'est voulu : le cloisonnement n'est pas une
affaire de permission mais de queryset — un compte ne voit pas les données d'un
autre laboratoire parce qu'elles ne sortent pas de la base, pas parce qu'on lui
a refusé l'accès. Une permission ne sert qu'aux gestes qui dépassent la lecture
et l'écriture ordinaires, et il n'y en a qu'un : agrandir le laboratoire.
"""

from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsOrganizationAdmin(BasePermission):
    """Réserve l'écriture aux administrateurs du laboratoire actif.

    Lit `request.org_role`, posé par TenantMiddleware — donc le rôle dans
    l'organisation *active*, pas un grade attaché au compte.

    Les lectures restent ouvertes à tout le laboratoire : savoir qui a été
    invité et par qui n'est pas un secret, et le cacher priverait un membre du
    moyen de constater qu'une invitation est déjà partie. Le jeton, lui, n'est
    jamais sérialisé pour un non-administrateur.
    """

    message = "Seul un administrateur du laboratoire peut inviter."

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return getattr(request, "org_role", None) == "admin"
