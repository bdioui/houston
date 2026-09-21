# houston

Application de gestion d'un laboratoire de recherche : membres, partenaires,
projets, actions, et un onglet Finance qui suit le budget et importe les exports
SIFAC. Backend Django REST Framework, frontend React/TypeScript, le tout en
conteneurs.

Le projet a commencé comme un widget embarqué dans un document Grist, qui
fournissait à la fois la base de données et l'authentification. **Cette époque
est révolue : `src/lib/grist.ts` et `src/lib/normalize.ts` ont été supprimés, et
plus aucun fichier n'appelle l'API Grist.** Il en reste des traces dans les noms
(`Expanse`, `getSupliers`), et c'est tout.

## Lancer le projet

```
docker compose up -d                 # db, redis, backend, worker, frontend
docker compose logs -f backend
```

- Front : http://localhost:5173 — Vite, qui proxifie `/api` vers `backend:8000`.
- API en direct : http://localhost:8000/api/ — confort de debug, hors proxy.
- Admin Django : http://localhost:8000/admin/
- Postgres : port hôte **5433** (5432 est souvent pris par un Postgres local).

**Le conteneur `frontend` démarre en données fictives.** `compose.yml` pose
`VITE_USE_MOCK: "${VITE_USE_MOCK:-true}"`, donc sans rien faire on atterrit sur
le tableau de bord sans passer par l'écran de connexion. Pour travailler contre
le vrai backend :

```
echo "VITE_USE_MOCK=false" > .env && docker compose up -d frontend
```

Il n'existe **ni fixture ni commande de seed**. Le plus court pour repartir de
zéro est désormais `POST /api/auth/signup/`, qui crée d'un coup le laboratoire,
le compte, sa fiche annuaire, un premier programme et les deux rattachements.
Un second compte dans ce laboratoire se fait ensuite par invitation, depuis le
bouton « Partager » de l'en-tête — c'est aussi le chemin pour rattacher un compte
existant à un deuxième laboratoire. Restent les cas tordus, comme un compte sans fiche
annuaire : on passe par `manage.py shell`, et les modèles cloisonnés s'écrivent
alors avec `.all_tenants.create(organization=…)` : hors requête HTTP, `objects`
lève.

**Vérifier les types : `npx tsc -b`, jamais `npx tsc --noEmit`.** Le
`tsconfig.json` de `frontend/` est un fichier de solution (`"files": []` +
`references`) : sans `-b`, la commande ne vérifie rien et sort en silence.

## Le cloisonnement, qui commande tout le reste

Deux axes, tous deux **choisis**, et l'ordre entre eux explique la moitié du
code de `common/`.

- **L'organisation se choisit.** Un compte peut appartenir à plusieurs
  laboratoires — `accounts.OrganizationMember`, qui a remplacé l'ancienne paire
  `User.organization` / `User.member`. La sélection vit dans la session Django
  (`ORG_SESSION_KEY`).
- **Le programme se choisit aussi**, mais *dans* le laboratoire actif
  (`PROGRAM_SESSION_KEY`).

Dans les deux cas **c'est une préférence, pas une autorisation** : le middleware
revérifie le rattachement à chaque requête, sans quoi un retrait d'accès n'aurait
d'effet qu'à la reconnexion. Et dans les deux cas, un compte qui n'a qu'un seul
choix le voit auto-sélectionné : la barre latérale le montre alors comme un
rappel du contexte, pas comme une question posée.

**L'ordre n'est pas interchangeable.** Le programme dépend de l'organisation,
parce que l'affectation (`ProgramMember`) passe par une fiche annuaire et qu'une
fiche appartient à un laboratoire. La même personne en a donc une par
organisation : c'est **`request.member`**, posé par le middleware, et non plus
un champ de `User`. Toute vue qui a besoin de la fiche du titulaire la lit là.

Un compte n'a qu'un email, unique sur toute l'installation : le
multi-laboratoire passe par un rattachement, jamais par un second compte.

Les deux valeurs sont posées dans des `ContextVar` (`common/tenant.py`), que les
managers consultent, et dans des variables de session PostgreSQL (`SET LOCAL`),
que les politiques RLS consulteront — elles ne sont pas encore écrites, voir
« Ce qui reste ».

Côté modèles (`common/models.py`) :

| Base | Manager par défaut | Échappatoires |
|---|---|---|
| `TenantModel` | `TenantManager` — filtre sur l'organisation | `all_tenants` |
| `ProgramModel` | `ProgramManager` — filtre sur les deux | `all_programs`, `all_tenants` |

Un manager interrogé hors contexte **lève** au lieu de rendre les lignes de tous
les laboratoires : un oubli devient une erreur immédiate, pas une fuite muette.

Côté vues, `TenantViewSet` et `ProgramScopedViewSet` (`common/views.py`) ne
filtrent rien — le queryset arrive déjà cloisonné. Leur rôle est de **poser
`organization` et `program` à la création**, champs que les sérialiseurs
n'exposent pas et que le client ne doit jamais pouvoir choisir.

### 403 et 409, deux refus qu'il ne faut pas confondre

`common/exceptions.py` traduit les absences de contexte, et le partage ne se
fait **pas** selon l'axe manquant mais selon une seule question : *le client
a-t-il un écran à ouvrir pour s'en sortir ?*

- `TenantContextRequired` → **409 `no_organization`** si `request.org_choices`
  est non nul, **403 `no_organization`** sinon. Même exception, deux réponses :
  un compte rattaché à deux laboratoires sans sélection a quelque chose à
  choisir, un compte rattaché à aucun n'a rien à faire ici.
- `ProgramContextRequired` → **409 `no_program`**, toujours. On n'atteint cette
  exception qu'avec une organisation active, donc il y a forcément un écran.
  `/api/programs/` reste accessible — `Program` est un `TenantModel`, il ne
  demande que l'organisation.

C'est le middleware qui pose `request.org_choices` (le nombre de rattachements),
parce que la couche modèle ne peut pas distinguer les deux cas : elle constate
un `ContextVar` vide, sans savoir pourquoi.

Répondre 403 sur un contexte simplement non choisi renverrait le front vers
l'écran de connexion alors que la session est bonne. Et laisser partir un 500
aurait un effet de bord vicieux : `SessionMiddleware` refuse d'enregistrer la
session sur une réponse ≥ 500, donc la purge d'une clé périmée serait perdue à
chaque requête.

### Les deux sélecteurs

`POST /api/organizations/{id}/select/` et `POST /api/programs/{id}/select/`
écrivent la session. Toute la validation tient dans `get_object()` : les deux
querysets sont déjà réduits aux rattachements de l'utilisateur
(`Organization.objects.filter(user_links__user=…)` pour l'un, les affectations
de `request.member` pour l'autre), donc un identifiant étranger ressort en 404
— pas en 403, on ne confirme pas l'existence de ce qu'on ne peut pas voir.

Changer d'organisation **purge la clé programme** : une sélection de programme
ne veut rien dire dans un autre laboratoire. Le middleware la reposera au
prochain appel si le compte n'a qu'une affectation là-bas.

`OrganizationViewSet` vit sous `/api/organizations/` et non sous `/api/auth/` :
c'est une collection cloisonnée comme les autres, pas un geste
d'authentification.

Une sélection ne vaut **qu'à partir de la requête suivante** — le middleware a
posé les `ContextVar` avant d'entrer dans la vue. La réponse renvoie l'objet
choisi pour que le front affiche le nouveau contexte sans second aller-retour.

Côté front, `fetchMe()` rend
`{ user, organization, member_id, is_owner, is_program_admin, program }`, les
références à `null` tant qu'il reste un choix à faire. **Un seul des deux choix est encore
bloquant** : sans laboratoire, `App.tsx` monte `OrganizationPicker`, parce que
même la liste des programmes est alors inaccessible. Le programme, lui,
s'auto-sélectionne sur le premier de l'arbre et `NoProgram` ne s'affiche que
lorsqu'il n'y a rien à sélectionner — une dérive (invitation sans programme,
affectation retirée), jamais un compte neuf. Faire trancher une fois, de façon
bloquante, n'apportait rien depuis que **les deux bascules vivent dans la barre
latérale** : le laboratoire en tête, les programmes dans leur groupe. Les
doublons qui les rappelaient dans la barre du haut ont été retirés, et le menu
du compte est descendu au pied de la barre. Le programme actif est lu depuis
`ProgramContext`
(`src/lib/userContext.ts`), **jamais via `getProgram()[0]`** : cette liste rend
tous les programmes de l'utilisateur et son premier élément n'a aucune raison
d'être l'actif. `AppShell` est remonté sur une `key` qui compose les deux
identifiants (organisation et programme) à chaque bascule, pour qu'aucune donnée
d'un contexte ne survive dans l'écran d'un autre.

### Les trois titres

Il n'y a **pas de rôle global**. Un compte est situé par deux booléens, un par
axe de cloisonnement, et c'est tout :

| | Propriétaire | Admin de programme | Membre |
|---|---|---|---|
| Créer un programme | ✓ | — | — |
| Inviter dans le laboratoire | ✓ | ✓ *(vers son programme)* | — |
| Retirer un compte du laboratoire | ✓ | — | — |
| Nommer un admin de programme | ✓ | ✓ *(sur son programme)* | — |
| Affecter une fiche **avec** compte | ✓ | ✓ *(sur son programme)* | — |
| Affecter une fiche **sans** compte | ✓ | ✓ | ✓ |
| Créer contacts/projets/actions/dépenses | ✓ | ✓ | ✓ |

- **`OrganizationMember.is_owner`** — la *forme* du laboratoire : créer un
  programme, retirer un compte, transmettre la propriété. Il vaut pour le
  laboratoire actif : avoir fondé le sien ne donne aucun titre chez le voisin.
- **`ProgramMember.is_admin`** — la *composition* d'un programme : y faire
  entrer quelqu'un, l'en sortir, y nommer un autre administrateur. **À ne pas
  confondre avec `ProgramMember.role`**, qui existait avant et reste du texte
  libre — une étiquette humaine (« Coordination », « Doctorant »), pas un droit.

Le middleware pose `request.is_owner` et `request.is_program_admin` ; les deux
classes de `common/permissions.py` (`IsOrganizationOwner`, `IsProgramAdmin`) les
lisent. Mais **`IsProgramAdmin` n'est qu'un premier filtre** : elle répond à « ce
compte a-t-il quelque chose à faire ici ? », pas à « a-t-il le droit sur *ce*
programme-ci ? ». Inviter ou affecter désigne un programme **dans la charge
utile**, qui n'est pas forcément l'actif ; une permission ne voit que la requête.
C'est `administers(request, program)` qui tranche, depuis le sérialiseur ou la
vue.

**Le propriétaire n'est jamais un cas particulier *dans* un programme.** Il y est
administrateur pour la même raison que les autres : parce que l'affectation
existe, écrite par `create_organization` et par la migration de reprise. Le code
du cloisonnement garde ainsi sa règle unique — l'affectation est l'autorisation.

**La ligne de partage de l'affectation est la fiche, pas le programme.** Affecter
un contact sans compte ne donne d'accès à personne : c'est du classement, ouvert
à toute l'équipe. Affecter une fiche *titulaire d'un compte* ouvre des données,
et se réserve aux administrateurs du programme visé. D'où `Member.has_account`,
que `MemberSerializer` calcule par `hasattr(member, "user_link")` — et le
`select_related("user_link")` de `MemberViewSet`, sans quoi c'est une requête par
ligne.

**L'arrivée se délègue, l'exclusion non.** Un admin de programme invite vers son
programme, mais seul le propriétaire retire un compte du laboratoire : une porte
qu'on ouvre se referme, une porte qu'on condamne ne se rouvre pas.

### Les invitations

Le seul chemin pour **rejoindre** un laboratoire existant ; l'inscription, elle,
en crée toujours un neuf. Une invitation est un `TenantModel` portant un jeton
de 32 octets, une adresse, une expiration à 14 jours, et deux références vers
le laboratoire qui font tout l'intérêt du modèle :

- **`member`** — la fiche annuaire à reprendre, **facultative**. Vide,
  l'acceptation en crée une ; renseignée, elle donne un compte à quelqu'un qui
  figure déjà dans l'annuaire. Un seul formulaire pour les deux gestes. Une
  fiche déjà titulaire d'un compte est refusée **à l'émission** et non à
  l'acceptation : le `OneToOne` la refuserait de toute façon, mais des jours
  plus tard et à la figure de l'invité.
- **`program`** — l'affectation posée du même coup, et **obligatoire**. Sans
  elle l'invité arrive sur un sélecteur de programme vide : le rattachement au
  laboratoire ne suffit pas à rendre un compte utilisable. La colonne reste
  pourtant `null=True` — la règle vit dans `InvitationSerializer`, parce que les
  invitations déjà émises n'ont pas de programme et qu'aucune migration ne
  saurait lequel leur donner.

**Deux espaces de noms, et la frontière n'est pas cosmétique.** Émettre et
révoquer sont des gestes du laboratoire, cloisonnés comme le reste :
`/api/invitations/`. Consulter et accepter se font sans laboratoire actif et
souvent sans compte, exactement comme une connexion : `/api/auth/invitations/`,
où le **jeton tient lieu d'identifiant** — on ne peut pas offrir un `id` à
quelqu'un qui ne voit encore aucune collection.

C'est **le seul endroit du projet où `all_tenants` sert une requête HTTP**, et
ce n'est pas un contournement : on ne balaie pas une table cloisonnée, on suit
un secret que seul le destinataire détient.

**Une invitation ne porte qu'un titre de programme**, `is_program_admin`, jamais
la propriété du laboratoire : on n'hérite pas d'un laboratoire en acceptant un
lien, on la reçoit d'un geste explicite de celui qui l'a. `_attach` pose donc le
`OrganizationMember` sans `is_owner` et reporte le booléen sur le
`ProgramMember` qu'elle crée.

Émettre est ouvert aux administrateurs de programme (`IsProgramAdmin`), mais
`InvitationSerializer.validate_program_id` refuse un programme qu'on
n'administre pas — et `perform_destroy` refait la vérification sur l'invitation
visée, sinon révoquer serait plus facile qu'émettre. Attention au nom : DRF
nomme les validateurs de champ d'après **le nom du champ, pas son `source`** —
`validate_program_id`, jamais `validate_program`.

La migration `0004` promeut les fondateurs d'après le **plus petit `user_id` du
laboratoire** et non d'après `created_at` : avant les invitations, seule
l'inscription créait un laboratoire, alors que les `created_at` viennent tous du
`bulk_create` de la migration précédente et sont dans un ordre arbitraire. La
reprise vers `is_owner` / `is_admin` suit le même fondateur, et lui écrit une
affectation administratrice sur chaque programme de son laboratoire.

**Aucun courriel n'est envoyé.** `token` et `accept_url` ne sont rendus **qu'à
la création** ; la liste ne les redonne jamais, sans quoi le jeton deviendrait
un secret partagé par tout le laboratoire. L'invitant copie le lien et le
transmet lui-même. L'URL est construite par `build_absolute_uri`, et elle vise
bien le front en développement parce que le proxy Vite est en
`changeOrigin: false` : Django voit `Host: localhost:5173`.

Trois refus à distinguer côté client, parce qu'ils appellent trois gestes
différents : **410 `invitation_expired`** (en redemander une), **404** (lien
inconnu, révoqué ou déjà accepté), **403 `invitation_email_mismatch`** (une
invitation est nominative — se déconnecter pour l'accepter).

L'acceptation couvre trois situations sous une seule route : session déjà
ouverte (rien à saisir), compte existant (le mot de passe authentifie), adresse
libre (le mot de passe crée le compte). Elle pose ensuite `ORG_SESSION_KEY` et
**purge la clé programme**, comme un changement de laboratoire — d'où le
`fetchMe()` qui suit côté front, seul à savoir où l'on atterrit.

Côté front, `/invitation/<token>` est **la seule URL que l'application
reconnaisse**, et elle n'introduit toujours pas de routeur : `App.tsx` lit
`window.location.pathname` une fois au démarrage, avant les branches de session,
et l'acceptation réécrit le chemin en `/`. L'émission vit dans `ShareModal`,
ouverte par le bouton « Partager » de la barre du haut, que voient le
propriétaire et les administrateurs de programme.

### L'écran de partage

`ShareModal` montre **les deux axes à la fois**, parce qu'ils se lisent ensemble :
qui travaille sur le programme affiché, et à quel titre dans le laboratoire. D'où
le bouton dans la barre du haut, en vue, et non dans le menu du compte, où il se
lisait comme un réglage personnel.

Trois listes, et la troisième est l'invitation : les comptes affectés au
programme actif, ceux du laboratoire qui n'y sont pas, puis les invitations en
attente — celles du programme actif seulement (`getInvitations(program.id)`, que
`TenantViewSet.filterset_class` sert sans code de filtre dédié). Le formulaire
arrive avec le programme actif présélectionné.

Les rattachements en place se gèrent par `/api/organization-members/`, qui n'a
**pas de création** : on n'entre dans un laboratoire que par invitation. Son
queryset se filtre à la main — `OrganizationMember` n'est pas un `TenantModel` et
ne peut pas l'être, c'est la table que le middleware lit *avant* qu'un contexte
existe. D'où le `raise TenantContextRequired` explicite : `filter(organization=None)`
rendrait une liste vide au lieu d'une erreur.

**Un propriétaire ne se modifie ni ne se retire lui-même** (`_refuse_self`, 400).
Un seul garde-fou suffit à garantir qu'il reste toujours un propriétaire, sans
avoir à compter les autres : seul un propriétaire peut agir. Transmettre se fait
donc **en deux temps** — nommer l'autre, puis se faire retirer par lui. Côté
front la même règle grise aussi le retrait de soi-même du programme actif, que le
middleware ne saurait plus résoudre à la requête suivante.

Chaque ligne porte donc **deux réglages, un par axe** : un `Select`
Membre/Administrateur, qui n'apparaît que pour les comptes affectés au programme
affiché, et la propriété du laboratoire — un écusson pour celui qui l'a, un
bouton « Nommer propriétaire » pour les autres, actif seulement si l'on est
soi-même propriétaire.

Retirer l'accès ne retire que l'accès : la fiche annuaire survit
(`OrganizationMember.member` est un `SET_NULL`) et ses affectations de programme
avec.

## Architecture

### Backend (`backend/`)

Sept applications : `common` (bases multitenant, `Status`, helpers de filtres et
de sérialisation), `accounts` (`Organization`, `User`, `OrganizationMember`,
`Invitation`),
`directory` (`Lab`, `Partner`, `Member`, `Formation`), `projects` (19 modèles,
dont `Program` et `ProgramMember`), `actions`, `finance`, `sifac`.

- Authentification **par session** (`SessionAuthentication`), `IsAuthenticated`
  par défaut, `django-filter` branché par défaut.
- `COERCE_DECIMAL_TO_STRING: False` : tout le code Finance fait de
  l'arithmétique directe sur `amount`, il lui faut des nombres.
- **Pas de pagination** : les collections rendent un tableau JSON nu, ce que le
  front attend partout.
- Les routes sont des routeurs DRF, un par application, montés sous `/api/`.

### Frontend (`frontend/src/`)

Trois couches, du plus bas au plus haut. La frontière vaut la peine d'être
tenue : c'est elle qui a permis de changer de backend sans toucher aux vues.

- **`lib/client.ts`** — le seul fichier qui parle HTTP. Jeton CSRF relu à chaque
  appel (`login()` appelle `rotate_token()`), `credentials: 'same-origin'`, et
  une conversion des dates vides : Django refuse `''` sur un `DateField` là où un
  `<input type="date">` effacé ne peut produire que ça. La reconnaissance se fait
  par suffixe de nom (`_date`, `_at`, `_time`…), vérifiée contre les 33 colonnes
  `DateField` du schéma.
  Contrairement à l'ancien `fetchTable()`, il **lève** au lieu de rendre `[]` :
  un backend indisponible n'est pas un cas bénin.
- **`lib/api.ts`** — une fonction par opération métier, et l'aiguillage
  `USE_MOCK`. Unique appelant de `client.ts`.
- **`views/`** — un fichier par onglet. Ces fichiers ne connaissent que
  `api.ts` ; ils ignorent où vivent les données.

## Conventions

- Les champs sont en **snake_case**, hérités des colonnes Grist puis conservés
  tels quels dans les modèles Django (`budget_detail_id`, `flux_id`).
- Les dates sont stockées en **texte** `YYYY-MM-DD` côté front ; une date vide
  vaut `null`, jamais `''`.
- Les identifiants sont attribués par la base ; le client ne les choisit jamais.
- En mode mock, `getExpanses` rend le tableau source muté sur place. Les
  appelants doivent en faire une copie (`[...await getExpanses()]`), sinon les
  `useMemo` de filtrage gardent leur résultat et l'écran reste figé.

## L'import SIFAC

SIFAC est le système financier de l'université (un SAP). Il exporte un XLSX par
PFI et par exercice. La chaîne vit dans **`backend/sifac/`** et compte quatre
étapes, trois pures et une seule qui écrit.

1. **`parse.py`** — lit le fichier. Les en-têtes sont reconnus par préfixe après
   normalisation (accents retirés, minuscules, espaces réduits) : SIFAC tronque
   ses intitulés à 30 caractères. Les lignes sans numéro de flux sont des
   sous-totaux, écartées ici.
2. **`aggregate.py`** — regroupe par `flux_id` et produit un `FluxAggregate`,
   taillé pour ressembler à une dépense. Les montants s'additionnent, les dates
   sont bornées (min pour l'engagement, max pour le paiement), le statut se
   déduit des montants et non d'une colonne.
3. **`reconcile.py`** — compare les agrégats aux dépenses existantes et rend
   trois listes : à créer, à mettre à jour, à orphaliner. Fonction pure.
4. **`importer.py`** — orchestre. `POST /api/sifac/preview/` lit sans écrire et
   propose un exercice ; `POST /api/sifac/import/` remplace le périmètre,
   réagrège, résout les fournisseurs puis applique la réconciliation.

L'import est **synchrone et délibérément** : passer en tâche Celery change la
forme de l'API (identifiant de tâche, endpoint de statut, polling) et n'apporte
rien tant qu'un import tient dans le temps d'une requête. `run_import` est déjà
écrite pour être appelable depuis une tâche — elle ne touche ni `request` ni les
`ContextVar` — mais **les managers, eux, les lisent** : depuis Celery il faudra
poser `set_current_org` et `set_current_program`, passer les arguments ne suffit
pas.

Il reste un fichier SIFAC côté navigateur, `src/lib/sifac.ts` : `sifacCategory()`
est un doublon assumé de `sifac_category()`, parce que la vue « Ligne » lit des
`SifacLine` brutes et n'a aucune dépense agrégée où lire la catégorie.

### Décisions qui ne se devinent pas

**Le rapprochement se fait sur le `flux_id` seul, jamais sur le couple
(flux, exercice).** Une commande engagée sur un exercice et reportée sur le
suivant doit retomber sur la même dépense au lieu d'en créer une seconde. C'est
aussi pourquoi l'import réagrège la table entière et pas seulement le périmètre
importé.

**Le remplacement porte sur le couple (PFI, exercice)**, à l'intérieur du
programme actif. Réimporter un fichier écrase ce périmètre et rien d'autre. La
contrainte d'unicité du flux est `uniq_expanse_flux_per_program`.

**`SIFAC_OWNED_FIELDS` liste les champs réécrits à chaque import.** Tout le reste
— projet, ligne budgétaire, convention — est le tri fait à la main et survit au
réimport. Le type impose l'exhaustivité : un champ ajouté et oublié casse au
lieu d'être ignoré à l'écriture.

**Les dépenses `source !== 'sifac'` sont invisibles pour la réconciliation.**
C'est ce qui empêche le balayage des orphelines d'emporter les saisies
manuelles.

**Les fournisseurs se rapprochent sur `sifac_code`, jamais sur le nom.** SIFAC a
déjà dédoublonné ses tiers et son code est stable ; un nom ne l'est pas. Un code
**vide** n'est pas un fournisseur inconnu : les écritures de paie ne portent
aucun tiers, les créer donnerait une fiche au nom vide sur laquelle toute la
masse salariale viendrait pointer. `fallbackSupplierId` conserve le fournisseur
déjà en place dans ce cas, pour qu'une affectation manuelle ne soit pas effacée
à chaque import.

### Deux vues, deux vérités

L'onglet Finance affiche les dépenses de deux façons, et les deux ne donneront
jamais les mêmes totaux avec les mêmes filtres de dates. Ce n'est pas un bug.

- **Groupée** : une ligne par dépense, donc par flux. Une commande porte une
  date bornée unique et un montant cumulé sur tous les exercices. Filtrer par
  année de paiement fait basculer la commande entière du côté de son dernier
  règlement.
- **Ligne** : les `SifacLine` brutes. Chaque écriture porte sa propre date et
  son propre montant, donc les totaux par année sont exacts. C'est cette vue qui
  se recoupe avec un relevé SIFAC.

Les filtres sont partagés mais appliqués là où la donnée vit : ce qui vient de
la dépense (libellé, statut, ligne budgétaire) sélectionne les flux via
`keptFlux` ; les dates sont retestées sur chaque ligne. Conséquence : un filtre
sur la date de paiement écarte les lignes COMMANDE, qui n'en portent pas — le
total engagé perd alors son sens, seul le payé est fiable.

## Ce qui reste

- Le laboratoire lui-même. L'écran de partage gère qui y accède, à quel titre et
  sur quel programme, et le propriétaire y crée des programmes ; rien ne le
  renomme ni ne le supprime — l'admin Django reste le seul chemin.
- **Rien ne liste ses propres titres.** On découvre qu'on administre un
  programme en voyant un bouton actif, jamais en le lisant quelque part.
- **L'envoi des invitations par courriel.** Le lien se transporte à la main,
  c'est assumé tant qu'il n'y a pas de SMTP configuré — mais c'est un jeton en
  clair dans une messagerie, à savoir avant de mettre en production.
- Celery : le worker tourne à vide, aucun `tasks.py`.
- Les politiques RLS PostgreSQL. **À ce stade, les managers sont la seule
  protection.** Elles exigent un rôle applicatif non-superutilisateur, or
  `POSTGRES_USER: houston` est créé superuser et les contournerait.

### Dettes connues, non urgentes

- `clean()` de `ProgramModel` vérifie la concordance des chemins vers un
  programme, mais **n'est appelée par aucun chemin d'écriture** : ni `save()`,
  ni `bulk_create()`, ni les sérialiseurs DRF ne font `full_clean()`.
- `Axis` est cloisonné par programme, alors que `Phd.axis` et
  `MobilityGrant.axis` restent au niveau organisation : ces deux clés pointent
  vers un modèle plus étroit qu'elles.
- Aucun test, ni côté backend ni côté front. **C'est la dette la plus coûteuse
  du lot** : le cloisonnement est exactement le genre de chose qu'on croit juste
  parce qu'on l'a vérifiée une fois à la main.
- Le commentaire de `VITE_USE_MOCK` dans `compose.yml` est périmé : il affirme
  que « seul Supplier est porté sur Django ».
- Les cinq fonctions `get*Full` d'`api.ts` recousent 4-5 requêtes en mémoire.
  Sérialiseurs imbriqués côté Django, ou recousage maintenu côté front ? Non
  tranché.
- Fautes de frappe figées par l'usage (`getSupliers`, `Expanse`) : les renommer
  suppose de renommer aussi les colonnes en base.
