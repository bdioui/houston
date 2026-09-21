from django.db import connection, transaction

from accounts.models import OrganizationMember
from projects.models import ProgramMember

from .tenant import (
    ORG_SESSION_KEY,
    PROGRAM_SESSION_KEY,
    reset_current_org,
    reset_current_program,
    set_current_org,
    set_current_program,
)


class TenantMiddleware:
    """Résout les deux axes de cloisonnement et les pose à deux endroits.

    1. Dans les ContextVar, que les managers consultent côté Python.
    2. Dans des variables de session PostgreSQL, que les politiques RLS
       consulteront côté base.

    La seconde est la garantie réelle : même un QuerySet mal écrit ne peut pas
    ramener les lignes d'un autre laboratoire.

    Les deux axes se résolvent de la même façon — une sélection portée par la
    session, revérifiée ici à chaque requête — mais dans un ordre qui n'est pas
    interchangeable. Le programme dépend de l'organisation, parce que
    l'affectation passe par une fiche annuaire et qu'une fiche appartient à un
    laboratoire.

    Deux attributs sont posés sur la requête à l'usage des vues :

    - `request.member`, la fiche du titulaire *dans l'organisation active*. Elle
      change avec elle, ce qui est la raison même de ne plus la porter sur User.
    - `request.org_choices`, le nombre de laboratoires que ce compte pourrait
      choisir. Il ne sert qu'à `common.exceptions`, pour distinguer « rien à
      choisir » (403) de « rien de choisi » (409).
    - `request.is_owner`, si le titulaire a fondé le laboratoire *actif*. Comme
      la fiche, il change avec lui : fonder le sien ne donne aucun titre chez
      le voisin. `False` tant qu'aucun n'est résolu.
    - `request.is_program_admin`, s'il administre le programme *actif*. Posé
      ici parce que l'affectation est déjà lue pour résoudre le programme : le
      titre voyage avec l'accès, il ne coûte pas une requête de plus.

    Ces deux derniers ne sont qu'un premier filtre, à l'usage de
    `common.permissions` et du front. Un geste qui *nomme* son programme —
    inviter, affecter — se vérifie sur celui-là et non sur l'actif, par
    `common.permissions.administers`.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = getattr(request, "user", None)
        # Posés avant toute sortie anticipée : une vue qui les lit ne doit pas
        # avoir à savoir jusqu'où le middleware est allé.
        request.member = None
        request.org_choices = 0
        request.is_owner = False
        request.is_program_admin = False

        if user is None or not user.is_authenticated:
            return self.get_response(request)

        # Cette requête-ci ne peut pas passer par un manager cloisonné : c'est
        # elle qui établit le cloisonnement. Matérialisée en liste parce qu'on a
        # besoin de son cardinal autant que de son contenu.
        links = list(
            OrganizationMember.objects.filter(user=user).select_related(
                "organization", "member"
            )
        )
        request.org_choices = len(links)

        link = self._resolve_org(request, links)
        if link is None:
            # Connexion, inscription, sélecteur d'organisation, health, admin de
            # support : pas de tenant, donc pas de transaction imposée.
            # TenantManager lèvera si un modèle cloisonné est touché, ce qui est
            # le comportement voulu.
            return self.get_response(request)

        org = link.organization
        request.member = link.member
        request.is_owner = link.is_owner

        org_token = set_current_org(org)
        try:
            # Après set_current_org, délibérément : la lecture des affectations
            # passe alors par un manager déjà cloisonné, et un identifiant de
            # programme volé à un autre laboratoire ne ressort pas de la requête.
            affectation = self._resolve_program(request, link.member)
            program = affectation.program if affectation is not None else None
            request.is_program_admin = (
                affectation is not None and affectation.is_admin
            )
            program_token = set_current_program(program)
            try:
                # SET LOCAL n'a d'effet qu'à l'intérieur d'une transaction et se
                # défait au commit. C'est ce qui empêche un tenant de fuiter sur
                # la requête suivante via une connexion recyclée (CONN_MAX_AGE).
                with transaction.atomic():
                    with connection.cursor() as cur:
                        cur.execute("SET LOCAL app.current_org = %s", [str(org.id)])
                        if program is not None:
                            cur.execute(
                                "SET LOCAL app.current_program = %s", [str(program.id)]
                            )
                    return self.get_response(request)
            finally:
                reset_current_program(program_token)
        finally:
            reset_current_org(org_token)

    def _resolve_org(self, request, links):
        """Rend l'appartenance active, ou None s'il n'y a rien à poser.

        Revérifiée à chaque requête et non à la connexion, pour la même raison
        que le programme : un rattachement retiré doit fermer la porte tout de
        suite, pas à la prochaine session.
        """
        chosen = request.session.get(ORG_SESSION_KEY)
        if chosen is not None:
            for link in links:
                if link.organization_id == chosen:
                    return link
            # Rattachement révoqué, laboratoire supprimé, ou identifiant
            # fabriqué. On purge plutôt que de laisser la clé retomber en erreur
            # à chaque requête suivante.
            del request.session[ORG_SESSION_KEY]
            # Et avec elle le programme : il avait été choisi dans le laboratoire
            # qu'on vient de perdre. Le garder ferait porter à la requête
            # suivante une sélection sans rapport avec son contexte.
            request.session.pop(PROGRAM_SESSION_KEY, None)

        # Un seul laboratoire : le choix n'en est pas un, autant l'épargner au
        # client — c'est le cas de l'immense majorité des comptes. Plusieurs : on
        # ne devine pas, le sélecteur tranchera.
        if len(links) == 1:
            request.session[ORG_SESSION_KEY] = links[0].organization_id
            return links[0]
        return None

    def _resolve_program(self, request, member):
        """Rend l'*affectation* active, ou None s'il n'y a rien à poser.

        Revérifiée à chaque requête et non à la connexion : sans cela, retirer un
        membre d'un programme ne prendrait effet qu'à sa prochaine session, et
        une affectation supprimée continuerait d'ouvrir les données.

        Rend l'affectation et non le programme, alors que seul le programme est
        posé dans les ContextVar : c'est elle qui porte `is_admin`, et la jeter
        ici obligerait à la relire juste après.
        """
        # Un compte sans fiche annuaire dans ce laboratoire — support, service —
        # n'y est affecté à rien : c'est ProgramMember qui porte l'affectation,
        # et il pointe vers Member, pas vers User.
        if member is None:
            return None

        links = ProgramMember.objects.filter(member_id=member.id)

        chosen = request.session.get(PROGRAM_SESSION_KEY)
        if chosen is not None:
            link = links.filter(program_id=chosen).select_related("program").first()
            if link is not None:
                return link
            # Affectation révoquée, programme supprimé, identifiant fabriqué, ou
            # simple changement de laboratoire : la clé désigne alors un
            # programme de celui qu'on vient de quitter.
            del request.session[PROGRAM_SESSION_KEY]

        # Un seul programme : le choix n'en est pas un, autant l'épargner au
        # client. Plusieurs : on ne devine pas, c'est au sélecteur de trancher —
        # et d'ici là les modèles cloisonnés par programme restent inaccessibles.
        candidates = list(links.select_related("program")[:2])
        if len(candidates) != 1:
            return None

        request.session[PROGRAM_SESSION_KEY] = candidates[0].program_id
        return candidates[0]
