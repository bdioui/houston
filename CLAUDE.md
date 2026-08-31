# grist-widgets

Widget React/TypeScript embarqué dans un document Grist. Il sert d'interface de
gestion à un laboratoire de recherche : membres, partenaires, projets, actions,
et un onglet Finance qui suit le budget et importe les exports SIFAC.

Grist fournit la base de données et l'authentification. Le widget ne fait que
lire et écrire dans les tables du document dans lequel il est chargé.

## Lancer le projet

```
npm install
npm run dev      # http://localhost:5173, en données fictives
npm run build    # tsc -b && vite build
```

`VITE_USE_MOCK=true` fait tourner l'application sur `src/lib/mock/`, sans Grist.
C'est le mode de développement normal : hors du contexte Grist, la variable
globale `grist` n'existe pas et tout appel réseau échoue.

**Vérifier les types : `npx tsc -b`, jamais `npx tsc --noEmit`.** Le `tsconfig.json`
racine est un fichier de solution (`"files": []` + `references`) : sans `-b`, la
commande ne vérifie rien et sort en silence.

## Architecture

Quatre couches, du plus bas au plus haut :

- **`src/lib/grist.ts`** — le seul fichier qui touche l'API Grist. Convertit le
  format colonnaire (`{ col: [v1, v2] }`) en lignes (`[{ col: v1 }, ...]`) et
  emballe les `applyUserActions`.
- **`src/lib/normalize.ts`** — transforme les lignes brutes en objets typés.
  Existe uniquement pour rattraper les conventions Grist : `str()` rend `''` si
  la valeur n'est pas une chaîne, `num()` rend `0`, `nullable()` convertit le `0`
  des références vides en `null`.
- **`src/lib/api.ts`** — une fonction par opération métier (`getExpanses`,
  `createSupplier`, `applyReconciliation`…). Contient l'aiguillage `USE_MOCK` et
  la table `T` des identifiants de tables Grist.
- **`src/views/`** — un fichier par onglet. Ces fichiers ne connaissent que
  `api.ts` ; ils ignorent où vivent les données.

Cette frontière est nette et vaut la peine d'être tenue. Elle est ce qui rendrait
possible un autre backend sans toucher à l'interface.

## Conventions

- Les champs suivent le nommage des colonnes Grist, donc **snake_case**
  (`budget_detail_id`, `flux_id`), pas camelCase.
- Une référence vide vaut `0` côté Grist et `null` côté application.
- Les identifiants sont des entiers attribués par Grist. Le widget ne les choisit
  jamais ; il les lit dans le `retValues` de l'action.
- Les dates sont stockées en **texte**, au format `YYYY-MM-DD`, jamais en colonne
  Date. Une colonne Date rend un horodatage numérique que `str()` transforme
  silencieusement en chaîne vide.

## L'import SIFAC

SIFAC est le système financier de l'université (un SAP). Il exporte un XLSX par
PFI et par exercice. Le sous-système vit dans `src/lib/sifac/` et suit une chaîne
de quatre étapes, trois pures et une seule qui écrit.

1. **`parse.ts`** — lit le fichier. Les en-têtes sont reconnus par préfixe après
   normalisation (accents retirés, minuscules, espaces réduits) : SIFAC tronque
   ses intitulés à 30 caractères. Les lignes sans numéro de flux sont des
   sous-totaux et sont écartées ici.
2. **`aggregate.ts`** — regroupe les lignes par `flux_id` et produit un
   `FluxAggregate`, taillé pour ressembler à une dépense. Les montants
   s'additionnent, les dates sont bornées (min pour l'engagement, max pour le
   paiement), le statut se déduit des montants et non d'une colonne.
3. **`reconcile.ts`** — compare les agrégats aux dépenses existantes et rend
   trois listes : à créer, à mettre à jour, à orphaliner. Fonction pure, elle
   n'écrit rien.
4. **`import.ts`** — orchestre. `prepareSifacImport` lit sans écrire et propose
   un exercice ; `commitSifacImport` remplace le périmètre, réagrège, résout les
   fournisseurs puis applique la réconciliation.

### Décisions qui ne se devinent pas

**Le rapprochement se fait sur le `flux_id` seul, jamais sur le couple
(flux, exercice).** Une commande engagée sur un exercice et reportée sur le
suivant doit retomber sur la même dépense au lieu d'en créer une seconde. C'est
aussi pourquoi `commitSifacImport` réagrège la table entière et pas seulement le
périmètre importé.

**Le remplacement porte sur le couple (PFI, exercice).** Réimporter un fichier
écrase ce périmètre et rien d'autre.

**`SIFAC_OWNED_FIELDS` liste les champs réécrits à chaque import.** Tout le reste
— projet, ligne budgétaire, convention — est le tri fait à la main et survit au
réimport. Le type `Record<keyof SifacOwned, true>` impose l'exhaustivité : un
champ ajouté et oublié casse la compilation au lieu d'être ignoré à l'écriture.

**Les dépenses `source !== 'sifac'` sont invisibles pour la réconciliation.**
C'est ce qui empêche le balayage des orphelines d'emporter les saisies manuelles.

**Les fournisseurs se rapprochent sur `sifac_code`, jamais sur le nom.** SIFAC a
déjà dédoublonné ses tiers et son code est stable ; un nom ne l'est pas. Les
codes manquants donnent lieu à une création automatique de fiche. Un code **vide**
n'est pas un fournisseur inconnu : les écritures de paie ne portent aucun tiers,
les créer donnerait une fiche au nom vide sur laquelle toute la masse salariale
viendrait pointer.

**`fallbackSupplierId`** conserve le fournisseur déjà en place quand SIFAC n'en
désigne aucun, pour qu'une affectation manuelle sur une ligne de paie ne soit pas
effacée à chaque import.

### Deux vues, deux vérités

L'onglet Finance affiche les dépenses de deux façons, et les deux ne donneront
jamais les mêmes totaux avec les mêmes filtres de dates. Ce n'est pas un bug.

- **Groupée** : une ligne par dépense, donc par flux. Une commande porte une date
  bornée unique et un montant cumulé sur tous les exercices. Filtrer par année de
  paiement fait basculer la commande entière du côté de son dernier règlement.
- **Ligne** : les `Sifac_line` brutes. Chaque écriture porte sa propre date et
  son propre montant, donc les totaux par année sont exacts. C'est cette vue qui
  se recoupe avec un relevé SIFAC.

Les filtres sont partagés, mais appliqués là où la donnée vit : ce qui vient de
la dépense (libellé, statut, ligne budgétaire) sélectionne les flux via
`keptFlux` ; les dates sont retestées sur chaque ligne.

Conséquence à connaître : un filtre sur la date de paiement écarte les lignes
COMMANDE, qui n'en portent pas. Dans ce cas le total engagé perd son sens et
seul le payé est fiable.

## Pièges Grist

- Le widget **ne peut pas créer de colonnes**. Une action nommant une colonne
  absente échoue avec un `KeyError` du bac à sable. Les colonnes se créent à la
  main dans le document.
- C'est **l'identifiant** de la colonne qui compte, pas son libellé. Les deux
  peuvent diverger dans l'interface Grist.
- En mode mock, `getExpanses` rend le tableau source muté sur place. Les appelants
  doivent en faire une copie (`[...await getExpanses()]`), sinon les `useMemo` de
  filtrage gardent leur résultat et l'écran reste figé.

## Points connus, non corrigés

- `deleteExpanse` et `deleteSupplier` dans `api.ts` n'ont pas de `return` dans
  leur bloc `USE_MOCK` : ils retombent sur `deleteRecord` et lèvent hors de Grist.
- `normalizeExpanse` lit `project_id` avec `num()` alors que les autres
  références passent par `nullable()`.
- La table `Expanse_suplier` est déclarée dans `T` mais n'est utilisée nulle part.
- Plusieurs noms portent des fautes de frappe figées par l'usage (`getSupliers`,
  `normalizeSuplier`, `Expanse`). Les renommer suppose de renommer aussi les
  colonnes Grist.
