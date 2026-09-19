# backend/accounts/admin.py
from django.contrib import admin
from .models import Organization, OrganizationMember, User

admin.site.register(Organization)


class OrganizationMemberInline(admin.TabularInline):
    model = OrganizationMember
    extra = 0
    # `member` reste exclu pour la raison qui valait déjà sur User : c'est une
    # FK vers un TenantModel, dont le manager lève hors contexte — et l'admin
    # Django n'en pose aucun. Le rattachement se crée ici, la fiche s'associe
    # depuis l'application.
    exclude = ("member",)
    # `role` reste visible, et c'est la seule porte de secours du projet : un
    # laboratoire dont le fondateur a été retiré n'aurait plus personne pour y
    # inviter quiconque, et aucune vue de l'application ne sait promouvoir.
    #
    # `Invitation` n'est volontairement pas enregistrée ici : c'est un
    # TenantModel, son `_default_manager` est le TenantManager, et l'admin
    # Django ne pose aucun contexte — la page lèverait au premier affichage.


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    # Les laboratoires ne sont plus une colonne : un compte peut en avoir
    # plusieurs, d'où l'inline.
    inlines = [OrganizationMemberInline]
    list_display = ("email", "is_superuser")
    readonly_fields = ("password",)
