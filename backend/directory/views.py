from django_filters import NumberFilter

from common.filters import build_filterset
from common.views import TenantViewSet

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
    filterset_class = build_filterset(
        MemberSerializer,
        group_id=NumberFilter(field_name="group_links__group"),
    )

    def get_queryset(self):
        return Member.objects.all()

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



