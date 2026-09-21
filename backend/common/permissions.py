"""Permissions transverses.

Le projet n'en a presque pas, et c'est voulu : le cloisonnement n'est pas une
affaire de permission mais de queryset — un compte ne voit pas les données d'un
autre laboratoire parce qu'elles ne sortent pas de la base, pas parce qu'on lui
a refusé l'accès. Une permission ne sert qu'aux gestes qui *dépassent* la
lecture et l'écriture ordinaires, et ils se rangent sous deux titres, un par
axe de cloisonnement :

- **Propriétaire du laboratoire** (`OrganizationMember.is_owner`) — la *forme*
  de l'espace de travail : créer un programme, retirer un compte, transmettre
  la propriété.
- **Administrateur d'un programme** (`ProgramMember.is_admin`) — la *composition*
  d'un programme : y faire entrer quelqu'un, l'en sortir, y nommer un autre
  administrateur.

Les deux ne se recouvrent que parce que le propriétaire est affecté comme
administrateur à chaque programme de son laboratoire — en données, par
`create_organization` et par la migration de reprise. Aucune permission d'ici
n'a donc à traiter le propriétaire comme un cas particulier *dans* un
programme : il y est administrateur pour la même raison que les autres.

Tout ce qui n'est pas listé ici reste ouvert à tout membre du laboratoire :
créer un contact, un projet, une dépense. Un laboratoire est un lieu de travail
commun, pas une hiérarchie.
"""

from rest_framework.permissions import SAFE_METHODS, BasePermission


def administers(request, program) -> bool:
    """Le titulaire administre-t-il *ce* programme-là ?

    C'est la vraie garde des gestes d'équipe, et elle ne peut pas être une
    classe de permission : inviter quelqu'un ou l'affecter désigne un programme
    **dans la charge utile**, qui n'est pas forcément le programme actif. Une
    permission ne voit que la requête ; elle sert de premier filtre, celle-ci
    tranche.

    Le propriétaire passe d'office — non par faveur, mais parce que son
    affectation existe : la vérifier serait relire une ligne qu'on sait écrite.
    """
    if getattr(request, "is_owner", False):
        return True

    member = getattr(request, "member", None)
    if member is None or program is None:
        return False

    # Import local : `projects` importe `common.models`, l'inverse au chargement
    # du module fermerait le cycle.
    from projects.models import ProgramMember

    return ProgramMember.objects.filter(
        member_id=member.id, program_id=getattr(program, "id", program), is_admin=True
    ).exists()


class IsOrganizationOwner(BasePermission):
    """Réserve au propriétaire ce qui touche à la forme du laboratoire.

    Lit `request.is_owner`, posé par TenantMiddleware — donc la propriété du
    laboratoire *actif*, pas un grade attaché au compte : avoir fondé le sien
    ne donne aucun titre chez le voisin.

    Les lectures restent ouvertes à tout le laboratoire : savoir qui en fait
    partie, qui a été invité et par qui n'est un secret pour aucun de ses
    membres, et le cacher priverait chacun du moyen de constater qu'une
    invitation est déjà partie. Le jeton, lui, n'est jamais sérialisé après la
    création.

    Elle garde les gestes qu'on ne délègue pas : retirer un compte du
    laboratoire, transmettre la propriété, créer un programme. Le refus est
    formulé pour valoir pour les trois — il n'a pas à nommer celui qu'on vient
    de tenter.
    """

    message = "Ce geste est réservé au propriétaire du laboratoire."

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return getattr(request, "is_owner", False)


class IsProgramAdmin(BasePermission):
    """Laisse passer qui administre *au moins un* programme du laboratoire.

    **Premier filtre seulement.** Elle répond à « ce compte a-t-il quelque
    chose à faire ici ? », pas à « a-t-il le droit sur ce programme-ci ? » —
    cette seconde question se pose sur le programme visé par la charge utile,
    et c'est `administers()` qui y répond, dans le sérialiseur ou la vue.

    Le propriétaire passe, puisqu'il administre tous les siens.
    """

    message = (
        "Seul un administrateur de programme peut modifier son équipe."
    )

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return getattr(request, "is_owner", False) or getattr(
            request, "is_program_admin", False
        )
