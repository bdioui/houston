from django_filters import NumberFilter

from common.filters import build_filterset
from common.tenant import get_current_org, get_current_program
from common.views import TenantViewSet
from projects.models import ProgramMember

from .models import Lab, Member, Partner, Formation, PartnerLab
from .serializers import LabSerializer, MemberSerializer, PartnerSerializer, PartnerLabSerializer, FormationSerializer


class LabViewSet(TenantViewSet):
    serializer_class = LabSerializer

    def get_queryset(self):
        return Lab.objects.all()


class PartnerViewSet(TenantViewSet):
    serializer_class = PartnerSerializer

    def get_queryset(self):
        return Partner.objects.all()


class MemberViewSet(TenantViewSet):
    serializer_class = MemberSerializer

    # `?group_id=` traverse la table de liaison. Le groupe n'est un champ ni du
    # membre ni de son sérialiseur : il faut le déclarer à la main. En échange,
    # le front lit les membres d'un groupe en une requête au lieu de deux.
    #
    # `?program_id=` fait de même vers les affectations, et c'est le filtre par
    # défaut de l'écran Contacts : l'annuaire reste au laboratoire — la fiche
    # est ce qui *détermine* le programme actif, elle ne peut pas en dépendre —
    # mais un programme n'a rien à faire de l'équipe du voisin.
    filterset_class = build_filterset(
        MemberSerializer,
        group_id=NumberFilter(field_name="group_links__group"),
        program_id=NumberFilter(field_name="program_links__program"),
    )

    def get_queryset(self):
        # `select_related` pour `has_account`, que le sérialiseur lit par un
        # `hasattr` sur le OneToOne inverse : sans lui, une requête par ligne.
        return Member.objects.select_related("user_link")

    def perform_create(self, serializer):
        """Créer une fiche l'affecte au programme actif.

        Sans cela la fiche naîtrait invisible : l'écran qui vient de la créer
        filtre sur les affectations, et elle n'en aurait aucune. Même argument
        que `ProgramViewSet.perform_create`, à l'autre bout de la liaison.

        L'affectation vaut pour tout le monde, contacts de partenaires compris.
        Une règle unique plutôt qu'une exception à retenir : le programme
        depuis lequel on saisit une fiche est le seul indice disponible, et
        `ProgramMember` est là pour être corrigé ensuite.

        `get_current_program()` peut rendre `None` — un compte sans fiche
        annuaire n'a aucune affectation, donc aucun programme actif, et peut
        pourtant alimenter l'annuaire. La fiche est alors créée sans liaison,
        visible depuis « tout le laboratoire ».
        """
        super().perform_create(serializer)
        program = get_current_program()
        if program is not None:
            ProgramMember.objects.create(
                organization=get_current_org(),
                member=serializer.instance,
                program=program,
            )

class FormationViewSet(TenantViewSet):
    serializer_class = FormationSerializer

    filterset_class = build_filterset(
        FormationSerializer,
        project_id=NumberFilter(field_name="project_links__project"),
    )

    def get_queryset(self):
        return Formation.objects.all()

class PartnerLabViewSet(TenantViewSet):
    serializer_class = PartnerLabSerializer

    def get_queryset(self):
        return PartnerLab.objects.all()



