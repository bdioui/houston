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

    def get_queryset(self):
        return Member.objects.all()

class FormationViewSet(TenantViewSet):
    serializer_class = FormationSerializer

    def get_queryset(self):
        return Formation.objects.all()
    
class PartnerLabViewSet(TenantViewSet):
    serializer_class = PartnerLabSerializer

    def get_queryset(self):
        return PartnerLab.objects.all()



