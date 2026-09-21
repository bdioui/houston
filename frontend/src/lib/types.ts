// --- Tables de référence ---


export type User = {
    first_name: string
    last_name: string
    email: string
    picture?: string
}

/** Cycle de vie partagé par tous les contextes sauf `participation`. */
export type LifecycleCode = 'todo' | 'active' | 'on_hold' | 'done' | 'cancelled'

/** État de présence — ce n'est pas un cycle de vie, d'où des codes à part. */
export type ParticipationCode = 'registered' | 'confirmed' | 'present' | 'absent' | 'excused'

export type StatusCode = LifecycleCode | ParticipationCode

export type StatusContext =
    | 'action_card'
    | 'project'
    | 'project_call'
    | 'financial_agreement'
    | 'todo_item'
    | 'partner'
    | 'participation'

export type Status = {
    id: number
    /** Identité stable, la seule sur laquelle brancher une décision.
     *  `id` est attribué par la base et diffère d'une installation à l'autre. */
    code: StatusCode
    /** Vocabulaire d'affichage, propre au contexte : une convention est
     *  « Soldée » là où un projet est « Terminé », pour le même code `done`. */
    label: string
    context: StatusContext
}

export type Category = {
    id: number
    parent_category_id: number | null
    title: string
    color?: string | null
}

// Règle valant pour tout ce fichier : une référence est `number | null` si et
// seulement si sa colonne Django porte `null=True`. C'est le serveur qui décide,
// et il rend `null` — pas `0`. Le `0` était la convention Grist ; le traduire à
// la frontière obligeait à le retraduire à chaque écriture, sous peine de 400.
//
// Même règle pour les dates, et elle se résume : les 33 colonnes `DateField` du
// schéma sont `null=True`, sauf deux horodatages posés par le serveur
// (`Organization.created_at`, `Comment.timestamp`). Toute date est donc
// `string | null` ici, et `Comment.timestamp` est la seule exception.
//
// Ce n'est pas de la prudence : `normalize.ts` rendait `''` pour une date vide,
// et il a été supprimé. La chaîne vide n'existe plus, le `null` arrive tel quel
// jusqu'aux vues. `new Date(null)` vaut le 1ᵉʳ janvier 1970 au lieu d'une date
// invalide — un `!d` avant conversion, pas un `isNaN` après.
export type Partner = {
    id: number
    name: string
    description: string
    color: string
    logo: string
    status_id: number | null
    type: string // 'Entreprise privée' | 'Association' | ...
    consortium: boolean
}

export type Lab = {
    id: number
    name: string
    description: string
    type: string // 'Laboratoire académique' | 'UMR' | 'Équipe de recherche' | ...
    topic: string
}

export type PartnerLab = {
    id: number
    lab_id: number
    partner_id: number
}

export type Member = {
    id: number
    partner_id: number | null
    lab_id: number | null
    first_name: string
    last_name: string
    position: string
    email: string
    tel: string
    genre: string
    status: string // 'Prof' | 'Enseignant-chercheur' | 'BIATSS' | ...
    profile_image: string
    is_staff: boolean
    // La fiche a-t-elle un compte derrière elle ? Toute la différence entre un
    // contact — saisi pour s'en souvenir, et que n'importe quel membre peut
    // affecter à son programme — et quelqu'un à qui l'affectation ouvre une
    // porte, ce qui est réservé aux administrateurs du programme.
    //
    // Rendu par le serveur, jamais écrit : un compte ne se crée pas depuis
    // l'annuaire, seulement par invitation.
    has_account: boolean
}

// Ce qu'un formulaire peut écrire d'une fiche. `id` et `has_account` en sont
// exclus pour la même raison : ils viennent du serveur.
export type MemberDraft = Omit<Member, 'id' | 'has_account'>

export type GroupMember = {
    id: number
    member_id: number
    group_id: number
}

export type Group = {
    id: number
    name: string
    owner_id: number | null
}

export type ProjectMember = {
    id: number
    member_id: number
    project_id: number
    role: string
    // `?` et `| null` disent deux choses distinctes : on peut omettre la clé en
    // écriture (le serveur a un défaut), mais en lecture elle est toujours là,
    // à `null` si rien n'est renseigné.
    participation_status_id?: number | null
}

export type TimeEntry = {
    id: number
    member_id: number
    project_id: number
    days: number
    start_date: string | null
    end_date: string | null
}

export type AgreementMember = {
    id: number
    member_id: number
    agreement_id: number
}

export type Axis = {
    id: number
    name: string
    description: string
}

// --- Indicateurs ---

export type Kpi = {
    id: number
    label: string
    unit: string
    definition: string
    dimension: string
}

export type KpiEntry = {
    id: number
    project_id: number
    kpi_id: number
    member_id: number | null
    value: number
    comment: string
    date: string | null
    year: string
    author_id: number | null
}

// --- Cœur du système ---

export type ProjectCall = {
    id: number
    axis_id: number | null
    title: string
    description: string
    start_date: string | null
    end_date: string | null
    status_id: number | null
    budget: number
}

export type Project = {
    id: number
    // `project_call_id` n'est pas nullable : le modèle le tient en CASCADE, un
    // projet naît toujours d'un appel. Seul le statut peut manquer.
    project_call_id: number
    status_id: number | null
    title: string
    description: string
    budget: number
    start_date: string | null
    end_date: string | null
}

// types.ts
export type ProjectPartner = {
    id: number
    project_id: number
    partner_id: number
    role: string
    amount: number | null
    label: string | null
}

export type ProjectMilestone = {
    id: number
    project_id: number
    title: string
    description: string
    due_date: string | null
    status_id: number | null
}

export type FinancialAgreement = {
    id: number
    // Nullable depuis le passage de `Project` en SET_NULL : supprimer un projet
    // détache ses conventions au lieu de les détruire. Le sérialiseur exige
    // toujours la clé à la création, `null` y est un geste explicite.
    project_id: number | null
    partner_id: number
    axis_id: number | null
    status_id: number | null
    title: string
    description: string
    budget: number
    grant: number
    signed_date: string | null
    budget_detail_id: number | null
}

export type Phd = {
    id: number
    member_id: number
    start_date: string | null
    end_date: string | null
    axis_id: number | null
}

export type MobilityGrant = {
    id: number
    member_id: number
    start_date: string | null
    end_date: string | null
    axis_id: number | null
}

export type ActionCard = {
    id: number
    owner_id: number | null
    category_id: number | null
    status_id: number | null
    title: string
    color: string
    description: string
    start_date: string | null
    end_date: string | null
    full_address?: string
    lat?: number | null
    lon?: number | null
}

export type Comment = {
    id: number
    owner_id: number | null
    parent_comment_id?: number | null
    action_card_id: number
    content: string
    timestamp: string
}

export type CommentFull = Comment & {
    owner: Member
    replies?: CommentFull[]
}

// --- Budget ---

export type BudgetCategory = {
    id: number
    partner_id: number | null
    title: string
}

export type BudgetDetail = {
    id: number
    budget_category_id: number
    parent_id: number | null
    title: string
    description: string
    budget: number
    start_date: string | null
    end_date: string | null
}

// --- Tables de jonction ---

export type MemberActionCard = {
    id: number
    member_id: number
    action_card_id: number
    role: string // 'Responsable' | 'Contributeur' | 'Observateur' | 'Participant'
    participation_status_id?: number | null
}

export type AxisActionCard = {
    id: number
    axis_id: number
    action_card_id: number
}

export type ProjectActionCard = {
    id: number
    project_id: number
    action_card_id: number
}

export type AgreementActionCard = {
    id: number
    financial_agreement_id: number
    action_card_id: number
}

// --- To-do ---

export type ToDoList = {
    id: number
    action_card_id: number
    title: string
}

export type ToDoItem = {
    id: number
    list_id: number
    content: string
    status_id: number | null
    start_date?: string | null
    end_time?: string | null
    due_date: string | null
    member_id: number | null
}

// --- Types enrichis (jointures côté front) ---

export type ActionCardFull = ActionCard & {
    status: Status
    category: Category & { parent: Category | null }
    owner: Member
}

export type MemberFull = Member & {
    partner: Partner | null
    lab: Lab | null
}

export type PartnerCardFull = Partner & {
    projects: Project[]
    agreements: FinancialAgreement[]
    members: Member[]
}

export type LabCardFull = Lab & {
    partners: Partner[]
    members: Member[]
}

export type Formation = {
    id: number
    code: string
    type: string
    title: string
    partner_id: number | null
    level: string
    degree_type: string
    formacode: string
    rome: string
    nsf: string
    status: string
    expiry_date: string | null
    is_national: boolean
}

export type ProjectFormation = {
    id: number
    project_id: number
    formation_id: number
}

export type ProjectAttachment = {
    id: number
    project_id: number
    label: string
    url: string
}

// Le laboratoire. Le front n'en connaît que de quoi le nommer dans un
// sélecteur : tout le cloisonnement se joue côté serveur, qui ne prend jamais
// l'organisation du client — il la relit dans la session à chaque requête.
export type Organization = {
    id: number
    name: string
    slug: string
}

export type OrganizationTree = Organization & { programs: Program[] }

// Un compte déjà rattaché au laboratoire — l'autre moitié de l'écran de
// partage, quand `Invitation` en couvre les places encore à prendre.
//
// `member_id` est nul pour un compte de support : il accède au laboratoire sans
// figurer à son annuaire. C'est aussi ce qui l'empêche d'être affecté à un
// programme, l'affectation passant par la fiche.
//
// `is_owner` a remplacé un `role` à deux valeurs, et ce n'est pas qu'un
// renommage : le titre ne porte plus que sur la *forme* de l'espace de travail
// — créer un programme, retirer un compte, transmettre la propriété. Ce qui se
// passe dans un programme est porté par `ProgramMember.is_admin`.
export type OrgMember = {
    id: number
    email: string
    first_name: string
    last_name: string
    member_id: number | null
    is_owner: boolean
    created_at: string
}

// Une place réservée dans un laboratoire. Côté émetteur : ce que l'on voit dans
// la liste des invitations en attente.
//
// `token` et `accept_url` n'y sont **que sur la réponse à la création** — le
// serveur ne les rend qu'une fois, puisque c'est l'invitant qui transporte le
// lien faute d'envoi d'email. D'où le `?` : les relire sur un élément de liste
// est une erreur de type, pas une surprise à l'exécution.
export type Invitation = {
    id: number
    email: string
    member_id: number | null
    program_id: number | null
    first_name: string
    last_name: string
    // Le titre accordé *dans le programme visé*, et rien au-delà : une
    // invitation ne fabrique jamais un propriétaire.
    is_program_admin: boolean
    organization_name: string
    invited_by_email: string | null
    created_at: string
    expires_at: string
    accepted_at: string | null
    is_expired: boolean
    token?: string
    accept_url?: string
}

// Ce que l'invité voit avant de s'engager, sur une route anonyme. Volontairement
// pauvre : quiconque tient le jeton obtient cette réponse.
export type InvitationPreview = {
    organization_name: string
    email: string
    first_name: string
    last_name: string
    // Décide du formulaire à afficher : « choisissez un mot de passe » si
    // l'adresse est libre, « saisissez le vôtre » si un compte existe déjà.
    account_exists: boolean
    expires_at: string
}

export type Program = {
    id: number
    // Clé de rapprochement SIFAC, et seul repère stable quand deux programmes
    // portent des noms voisins : le sélecteur l'affiche pour cette raison.
    pfi: string
    name: string
    description: string
    budget: number
    start_date: string | null
    end_date: string | null
    logo: string
    management_fee_rate: number | null
}

// L'affectation d'une fiche annuaire à un programme. Elle décide de deux
// choses : à quels programmes un compte a droit, et qui figure dans l'équipe
// qu'affiche l'écran Contacts. `role` est porté par la liaison et non par la
// fiche — la même personne peut coordonner ici et contribuer là.
//
// `role` et `is_admin` se ressemblent et ne disent pas la même chose : `role`
// est un intitulé libre saisi pour être lu — « Coordination », « Doctorant » —
// sans effet sur quoi que ce soit ; `is_admin` est un droit, revérifié par le
// serveur à chaque requête. Les confondre ouvrirait l'administration d'un
// programme à qui s'y donne le bon titre.
export type ProgramMember = {
    id: number
    member_id: number
    program_id: number
    role: string
    is_admin: boolean
}

// Budget & expanses

export type Supplier = {
    id: number
    name: string
    description: string
    siret: string
    sifac_code: string // C'est le numéro tiers fournisseur dans SIFAC
}

export type Publication = {
    id: number
    project_id: number
    title: string
    lab_id: number | null
    subject: string
    journal: string
    year: string
    doi: string
}

export type PublicationMember = {
    id: number
    publication_id: number
    member_id: number
}

export type Expanse = {
    id: number
    title: string
    description: string
    category: string
    label: string
    budget_detail_id: number | null
    supplier_id: number | null
    project_id: number | null
    agreement_id: number | null
    purchase_date: string | null
    delivery_date: string | null
    payment_date: string | null
    invoice_date: string | null
    status: string
    flux_id: string | null           // null = saisie manuelle
    source: 'sifac' | 'manual'
    amount_engaged: number
    amount_invoiced: number
    amount_paid: number
    amount: number
}

export type SifacLine = {
    id: number
    pfi: string              // Programme de financement
    exercice: number         // métadonnée d'import, PAS une date du fichier
    flux_id: string          // Numéro de flux  ← la clé de regroupement
    flux_label: string       // Libellé du flux
    rubrique: string         // COMMANDE/FACTURE, ECRITURE DE PAIE, ...
    supplier_name: string    // Nom du tiers
    supplier_code: string    // Numéro du tiers fournisseur
    account: string          // Compte général
    account_label: string    // Libellé Compte général
    engagement_date: string | null  // Date initiale de l'engagement
    csf_date: string | null         // Date de livraison service fait
    amount_engaged: number   // Montant engagé HTR
    amount_certified: number // Montant HTR des SF certifiés
    amount_received: number  // Montant réceptionné non facturé
    invoice_number: string
    invoice_date: string | null     // Date comptable facture
    invoice_text: string     // Texte facture
    amount_invoiced: number  // Montant facturé HTR
    amount_paid: number      // Montant payé HTR
    payment_date: string | null
    amount_report: number    // Report
    otp: string              // Elément d'OTP
    category: string         // FG/IG/MS
}


