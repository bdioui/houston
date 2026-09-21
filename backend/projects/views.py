from django_filters import NumberFilter
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from common.filters import build_filterset
from common.permissions import IsOrganizationOwner, administers
from common.tenant import PROGRAM_SESSION_KEY, get_current_org
from common.views import ProgramScopedViewSet, TenantViewSet

from .models import (
    Axis, Group, GroupMember, Kpi, KpiEntry, MobilityGrant, Phd, Program,
    ProgramMember, Project, ProjectAttachment, ProjectCall, ProjectFormation,
    ProjectMember, ProjectMilestone, ProjectPartner, Publication,
    PublicationMember, TimeEntry,
)
from .serializers import (
    AxisSerializer, GroupSerializer, GroupMemberSerializer, KpiSerializer,
    KpiEntrySerializer, MobilityGrantSerializer, PhdSerializer,
    ProgramMemberSerializer, ProgramSerializer,
    ProjectSerializer, ProjectAttachmentSerializer,
    ProjectCallSerializer, ProjectFormationSerializer, ProjectMemberSerializer,
    ProjectMilestoneSerializer, ProjectPartnerSerializer, PublicationSerializer,
    PublicationMemberSerializer, TimeEntrySerializer,
)


class AxisViewSet(ProgramScopedViewSet):
    serializer_class = AxisSerializer

    def get_queryset(self):
        return Axis.objects.all()

class GroupViewSet(ProgramScopedViewSet):
    serializer_class = GroupSerializer

    # Symétrique de `MemberViewSet.group_id` : les groupes d'un membre.
    filterset_class = build_filterset(
        GroupSerializer,
        member_id=NumberFilter(field_name="member_links__member"),
    )

    def get_queryset(self):
        return Group.objects.all()

    def get_create_kwargs(self):
        return {**super().get_create_kwargs(), "owner": self.request.member}

class GroupMemberViewSet(ProgramScopedViewSet):
    serializer_class = GroupMemberSerializer

    def get_queryset(self):
        return GroupMember.objects.all()


class ProgramViewSet(TenantViewSet):
    """Le sélecteur de programme, et la seule vue qui doit rester joignable
    quand aucun programme n'est actif : `Program` est un TenantModel, elle ne
    demande que l'organisation. Sans cela, un utilisateur affecté à plusieurs
    programmes n'aurait aucun moyen d'en choisir un.

    Réduite aux affectations de l'utilisateur, et pas à toute l'organisation :
    proposer un programme que TenantMiddleware refusera ensuite ne servirait
    qu'à faire fuiter son nom et son budget. La gestion des programmes du
    laboratoire — celle qui doit tous les voir — relèvera d'une vue
    d'administration distincte, avec ses propres droits.

    **Créer un programme est réservé au propriétaire.** C'est un geste sur la
    forme de l'espace de travail, pas sur son contenu : il ouvre un périmètre
    financier, un budget, une équipe. Le laisser à tout membre rendait la
    cloison franchissable par le bas — il suffisait d'en créer un pour s'y
    retrouver administrateur de fait.
    """

    serializer_class = ProgramSerializer

    def get_permissions(self):
        """`select` est un POST qui doit rester ouvert à tous.

        D'où cette méthode plutôt qu'un `permission_classes` sur la classe :
        `IsOrganizationOwner` refuse toute méthode non sûre, et l'y poser tel
        quel enfermerait chaque membre non propriétaire dans le programme que
        le middleware lui résout — il ne pourrait plus en changer.
        """
        permissions = super().get_permissions()
        if self.action in ("create", "update", "partial_update", "destroy"):
            permissions = permissions + [IsOrganizationOwner()]
        return permissions

    def get_queryset(self):
        member = self.request.member
        if member is None:
            # Compte de support : rattaché au laboratoire, mais sans fiche
            # annuaire dedans, donc aucune affectation possible. `none()` et non
            # une exception, parce qu'une liste vide est ici une réponse juste.
            return Program.objects.none()
        return Program.objects.filter(member_links__member=member)

    def perform_create(self, serializer):
        """Créer un programme y affecte son auteur, comme administrateur.

        Sans cela, le premier programme d'une organisation serait invisible à
        celui qui vient de le créer : la liste filtre sur les affectations, et
        il n'en aurait aucune. Le fondateur resterait bloqué en 409 sur son
        propre laboratoire.

        `is_admin` parce que l'auteur est nécessairement le propriétaire, et que
        le propriétaire administre ses programmes **en données**. C'est la même
        règle que `create_organization` tient pour le premier programme et que
        la migration de reprise a tenue pour les anciens : le code du
        cloisonnement n'a ainsi jamais à connaître d'exception — l'affectation
        est l'autorisation.

        `super()` et non une écriture directe : c'est lui qui traduit la
        violation de `uniq_program_pfi_per_org` en 400.
        """
        super().perform_create(serializer)
        member = self.request.member
        if member is not None:
            ProgramMember.objects.create(
                organization=get_current_org(),
                member=member,
                program=serializer.instance,
                is_admin=True,
            )

    @action(detail=True, methods=["post"])
    def select(self, request, pk=None):
        """Pose le programme actif pour la session.

        Toute la validation tient dans `get_object()` : le queryset est déjà
        réduit aux affectations de l'utilisateur, donc l'identifiant d'un
        programme voisin — ou d'un autre laboratoire — ressort en 404 au lieu
        d'être écrit en session. Rien à revérifier ici, et surtout rien à
        revérifier *deux fois* avec deux règles qui finiraient par diverger.

        La sélection ne vaut qu'à partir de la requête suivante : TenantMiddleware
        a posé le ContextVar avant d'entrer ici, et le réécrire ne changerait
        rien à un POST qui ne lit aucun modèle cloisonné. Le programme est
        néanmoins renvoyé, pour que le front affiche le nouveau contexte sans
        attendre un second aller-retour.
        """
        program = self.get_object()
        request.session[PROGRAM_SESSION_KEY] = program.id
        return Response(self.get_serializer(program).data)


class ProgramMemberViewSet(TenantViewSet):
    """Les affectations, c'est-à-dire l'équipe d'un programme.

    `TenantViewSet` et non `ProgramScopedViewSet`, pour la raison écrite sur le
    modèle : c'est la table que le middleware interroge pour savoir à quels
    programmes un compte a droit. La cloisonner par programme rendrait
    l'affectation illisible à qui ne l'a pas déjà.

    Réduite aux programmes de l'utilisateur, en lecture comme en écriture, et
    pas à toute l'organisation. Deux raisons distinctes :

    - En écriture c'est une question de droits. L'affectation *est* l'autorisation
      qu'interroge TenantMiddleware ; pouvoir en écrire une vers n'importe quel
      programme du laboratoire, c'est pouvoir s'ouvrir soi-même les finances du
      voisin. On ne donne accès qu'à un programme où l'on est déjà.
    - En lecture c'est la même règle que pour `?program_id=` sur l'annuaire : un
      programme n'a rien à faire de l'équipe d'un autre.

    Comme `ProgramViewSet`, elle ne couvre donc pas la gestion du laboratoire
    entier, qui relèvera d'une vue d'administration avec ses propres droits.

    **L'écriture se partage en deux, et la ligne de partage n'est pas le
    programme mais la fiche.** Affecter une fiche *sans compte* — un contact,
    un partenaire, un doctorant qu'on veut voir figurer sur le projet —
    n'ouvre aucune porte à personne : c'est de la saisie, ouverte à toute
    l'équipe. Affecter une fiche *avec compte* donne un accès, et c'est
    réservé à qui administre le programme visé. `_guard` ne regarde donc pas
    qui écrit mais ce que l'écriture accorde.
    """

    serializer_class = ProgramMemberSerializer

    def get_queryset(self):
        member = self.request.member
        if member is None:
            # Compte de support : rattaché au laboratoire, sans fiche annuaire
            # dedans, donc aucune affectation — ni la sienne, ni à lire.
            return ProgramMember.objects.none()
        return ProgramMember.objects.filter(program__member_links__member=member)

    def _guard(self, member, program, *, grants_admin=False):
        """Refuse ce qui donnerait un droit sans en avoir soi-même le titre.

        Deux écritures sont gardées, et pour deux raisons qui se rejoignent :
        affecter une fiche titulaire d'un compte, parce que le middleware relit
        cette ligne pour ouvrir le programme ; et nommer un administrateur,
        parce qu'un titre qu'on n'a pas ne se distribue pas — même sur une
        fiche sans compte, qui pourrait en recevoir un plus tard.
        """
        if not (grants_admin or (member is not None and hasattr(member, "user_link"))):
            return
        if not administers(self.request, program):
            raise PermissionDenied(
                "Seul un administrateur de ce programme peut en composer l'équipe."
            )

    def perform_create(self, serializer):
        self._guard(
            serializer.validated_data.get("member"),
            serializer.validated_data.get("program"),
            grants_admin=serializer.validated_data.get("is_admin", False),
        )
        super().perform_create(serializer)

    def perform_update(self, serializer):
        instance = serializer.instance
        self._guard(
            serializer.validated_data.get("member", instance.member),
            serializer.validated_data.get("program", instance.program),
            # Retirer un titre est aussi gardé qu'en donner un : sans cela,
            # n'importe qui rétrograderait l'administrateur en place.
            grants_admin=serializer.validated_data.get("is_admin", instance.is_admin)
            != instance.is_admin,
        )
        super().perform_update(serializer)

    def perform_destroy(self, instance):
        """Retirer quelqu'un suit la règle de son entrée.

        Une affectation retirée referme le programme à la requête suivante — le
        middleware ne résoudra plus rien. C'est exactement le geste symétrique
        de l'affectation, et il se garde pareil.
        """
        self._guard(
            instance.member, instance.program, grants_admin=instance.is_admin
        )
        instance.delete()


class KpiViewSet(ProgramScopedViewSet):
    serializer_class = KpiSerializer

    def get_queryset(self):
        return Kpi.objects.all()


class ProjectCallViewSet(ProgramScopedViewSet):
    serializer_class = ProjectCallSerializer

    def get_queryset(self):
        return ProjectCall.objects.all()


class ProjectViewSet(ProgramScopedViewSet):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        return Project.objects.all()


class ProjectPartnerViewSet(ProgramScopedViewSet):
    serializer_class = ProjectPartnerSerializer

    def get_queryset(self):
        return ProjectPartner.objects.all()


class ProjectMilestoneViewSet(ProgramScopedViewSet):
    serializer_class = ProjectMilestoneSerializer

    def get_queryset(self):
        return ProjectMilestone.objects.all()


class ProjectMemberViewSet(ProgramScopedViewSet):
    serializer_class = ProjectMemberSerializer

    def get_queryset(self):
        return ProjectMember.objects.all()


class TimeEntryViewSet(ProgramScopedViewSet):
    serializer_class = TimeEntrySerializer

    def get_queryset(self):
        return TimeEntry.objects.all()


class KpiEntryViewSet(ProgramScopedViewSet):
    serializer_class = KpiEntrySerializer

    def get_queryset(self):
        return KpiEntry.objects.all()


class PhdViewSet(TenantViewSet):
    serializer_class = PhdSerializer

    def get_queryset(self):
        return Phd.objects.all()


class MobilityGrantViewSet(TenantViewSet):
    serializer_class = MobilityGrantSerializer

    def get_queryset(self):
        return MobilityGrant.objects.all()


class ProjectFormationViewSet(ProgramScopedViewSet):
    serializer_class = ProjectFormationSerializer

    def get_queryset(self):
        return ProjectFormation.objects.all()


class ProjectAttachmentViewSet(ProgramScopedViewSet):
    serializer_class = ProjectAttachmentSerializer

    def get_queryset(self):
        return ProjectAttachment.objects.all()


class PublicationViewSet(ProgramScopedViewSet):
    serializer_class = PublicationSerializer

    def get_queryset(self):
        return Publication.objects.all()


class PublicationMemberViewSet(ProgramScopedViewSet):
    serializer_class = PublicationMemberSerializer

    # `?project_id=` remonte d'un cran : les auteurs des publications d'un
    # projet. Le lien ne porte pas le projet, sa publication si.
    filterset_class = build_filterset(
        PublicationMemberSerializer,
        project_id=NumberFilter(field_name="publication__project"),
    )

    def get_queryset(self):
        return PublicationMember.objects.all()
