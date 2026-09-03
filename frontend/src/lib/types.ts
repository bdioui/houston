// --- Tables de référence ---


export type User = {
    first_name: string
    last_name: string
    email: string
    picture?: string
}

export type Status = {
    id: number
    label: string   // 'En cours' | 'Terminé' | 'Annulé' | 'Planifié'
    context: string // 'action_card' | 'project_call' | 'todo_item'
}

export type Category = {
    id: number
    parent_category_id: number | null
    title: string
    color?: string | null
}

export type Partner = {
    id: number
    name: string
    description: string
    color: string
    logo: string
    status_id: number
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
    // 0 quand il n'y a pas de rattachement. L'API Django rend null ; la
    // conversion se fait dans api.ts, à la frontière. Garder 0 ici évite de
    // propager la nullité dans dix fichiers de vues pour un gain nul : aucun
    // identifiant ne vaut 0, donc les recherches par Map échouent pareil.
    partner_id: number
    lab_id: number
    first_name: string
    last_name: string
    position: string
    email: string
    tel: string
    genre: string
    status: string // 'Prof' | 'Enseignant-chercheur' | 'BIATSS' | ...
    profile_image: string
    is_staff: boolean
}

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
    participation_status_id?: number
}

export type TimeEntry = {
    id: number
    member_id: number
    project_id: number
    days: number
    start_date: string
    end_date: string
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
    member_id: number
    value: number
    comment: string
    date: string
    year: string
    author_id: number
}

// --- Cœur du système ---

export type ProjectCall = {
    id: number
    axis_id: number
    title: string
    description: string
    start_date: string
    end_date: string
    status_id: number
    budget: number
}

export type Project = {
    id: number
    project_call_id: number
    status_id: number
    title: string
    description: string
    budget: number
    start_date: string
    end_date: string
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
    due_date: string
    status_id: number
}

export type FinancialAgreement = {
    id: number
    project_id: number
    partner_id: number
    axis_id: number | null
    status_id: number
    title: string
    description: string
    budget: number
    grant: number
    signed_date: string
    budget_detail_id: number | null
}

export type Phd = {
    id: number
    member_id: number
    start_date: string
    end_date: string
    axis_id: number
}

export type MobilityGrant = {
    id: number
    member_id: number
    start_date: string
    end_date: string
    axis_id: number
}

export type ActionCard = {
    id: number
    owner_id: number
    category_id: number
    status_id: number
    title: string
    color: string
    description: string
    start_date: string
    end_date: string
    full_address?: string
    lat?: number | null
    lon?: number | null
}

export type Comment = {
    id: number
    owner_id: number
    parent_comment_id?: number
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
    participation_status_id?: number
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
    status_id: number
    start_date?: string
    end_time?: string
    due_date: string
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
    expiry_date: string
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

export type Program = {
    id: number
    name: string
    description: string
    budget: number
    start_date: string
    end_date: string
    logo: string
    management_fee_rate: number | null
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
    purchase_date: string
    delivery_date: string
    payment_date: string
    invoice_date: string
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
    engagement_date: string  // Date initiale de l'engagement
    csf_date: string         // Date de livraison service fait
    amount_engaged: number   // Montant engagé HTR
    amount_certified: number // Montant HTR des SF certifiés
    amount_received: number  // Montant réceptionné non facturé
    invoice_number: string
    invoice_date: string     // Date comptable facture
    invoice_text: string     // Texte facture
    amount_invoiced: number  // Montant facturé HTR
    amount_paid: number      // Montant payé HTR
    payment_date: string
    amount_report: number    // Report
    otp: string              // Elément d'OTP
    category: string         // FG/IG/MS
}


