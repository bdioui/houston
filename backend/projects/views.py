from django_filters import NumberFilter
from rest_framework.decorators import action
from rest_framework.response import Response

from common.filters import build_filterset
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
    ProgramSerializer, ProjectSerializer, ProjectAttachmentSerializer,
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
    """

    serializer_class = ProgramSerializer

    def get_queryset(self):
        member = self.request.member
        if member is None:
            # Compte de support : rattaché au laboratoire, mais sans fiche
            # annuaire dedans, donc aucune affectation possible. `none()` et non
            # une exception, parce qu'une liste vide est ici une réponse juste.
            return Program.objects.none()
        return Program.objects.filter(member_links__member=member)

    def perform_create(self, serializer):
        """Créer un programme y affecte son auteur.

        Sans cela, le premier programme d'une organisation serait invisible à
        celui qui vient de le créer : la liste filtre sur les affectations, et
        il n'en aurait aucune. Le fondateur resterait bloqué en 409 sur son
        propre laboratoire.

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
