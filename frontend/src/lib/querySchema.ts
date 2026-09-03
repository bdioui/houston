import type {
    Member, Partner, Lab, Project, ProjectCall,
    FinancialAgreement, Axis, Formation,
    ProjectMember, ProjectPartner, PartnerLab,
} from '@/lib/types'

// ── Type DB ────────────────────────────────────────────────────────────────

export type DB = {
    members: Member[]
    partners: Partner[]
    labs: Lab[]
    projects: Project[]
    projectCalls: ProjectCall[]
    axes: Axis[]
    agreements: FinancialAgreement[]
    formations: Formation[]
    // tables de jonction (traversal uniquement, pas de root)
    projectMembers: ProjectMember[]
    projectPartners: ProjectPartner[]
    partnerLabs: PartnerLab[]
}

// ── Schéma de relations ────────────────────────────────────────────────────

// Un pas dans un chemin de jointure.
// localKey   : champ sur l'enregistrement courant dans la chaîne
// foreignKey : champ correspondant sur la table suivante (step.table)
export type Step = {
    table: keyof DB
    localKey: string
    foreignKey: string
}

export type RelationPath = Step[]

export const SCHEMA: Partial<Record<keyof DB, Partial<Record<keyof DB, RelationPath>>>> = {

    // ── members ────────────────────────────────────────────────────────────
    // members.partner_id → partners.id
    // members.lab_id     → labs.id
    // members.id → projectMembers.member_id → projects.id
    // ... → projectCalls.id / agreements.id / axes.id
    members: {
        partners: [
            { table: 'partners', localKey: 'partner_id', foreignKey: 'id' },
        ],
        labs: [
            { table: 'labs', localKey: 'lab_id', foreignKey: 'id' },
        ],
        projects: [
            { table: 'projectMembers', localKey: 'id', foreignKey: 'member_id' },
            { table: 'projects', localKey: 'project_id', foreignKey: 'id' },
        ],
        projectCalls: [
            { table: 'projectMembers', localKey: 'id', foreignKey: 'member_id' },
            { table: 'projects', localKey: 'project_id', foreignKey: 'id' },
            { table: 'projectCalls', localKey: 'project_call_id', foreignKey: 'id' },
        ],
        agreements: [
            { table: 'projectMembers', localKey: 'id', foreignKey: 'member_id' },
            { table: 'projects', localKey: 'project_id', foreignKey: 'id' },
            { table: 'agreements', localKey: 'id', foreignKey: 'project_id' },
        ],
        axes: [
            { table: 'projectMembers', localKey: 'id', foreignKey: 'member_id' },
            { table: 'projects', localKey: 'project_id', foreignKey: 'id' },
            { table: 'projectCalls', localKey: 'project_call_id', foreignKey: 'id' },
            { table: 'axes', localKey: 'axis_id', foreignKey: 'id' },
        ],
    },

    // ── partners ───────────────────────────────────────────────────────────
    // members.partner_id → partners.id  (inverse)
    // partnerLabs.partner_id + partnerLabs.lab_id → labs.id
    // projectPartners.partner_id → projects.id
    // agreements.partner_id → partners.id  (inverse)
    // formations.partner_id → partners.id  (inverse)
    partners: {
        members: [
            { table: 'members', localKey: 'id', foreignKey: 'partner_id' },
        ],
        labs: [
            { table: 'partnerLabs', localKey: 'id', foreignKey: 'partner_id' },
            { table: 'labs', localKey: 'lab_id', foreignKey: 'id' },
        ],
        projects: [
            { table: 'projectPartners', localKey: 'id', foreignKey: 'partner_id' },
            { table: 'projects', localKey: 'project_id', foreignKey: 'id' },
        ],
        agreements: [
            { table: 'agreements', localKey: 'id', foreignKey: 'partner_id' },
        ],
        formations: [
            { table: 'formations', localKey: 'id', foreignKey: 'partner_id' },
        ],
        projectCalls: [
            { table: 'projectPartners', localKey: 'id', foreignKey: 'partner_id' },
            { table: 'projects', localKey: 'project_id', foreignKey: 'id' },
            { table: 'projectCalls', localKey: 'project_call_id', foreignKey: 'id' },
        ],
        axes: [
            { table: 'agreements', localKey: 'id', foreignKey: 'partner_id' },
            { table: 'axes', localKey: 'axis_id', foreignKey: 'id' },
        ],
    },

    // ── labs ───────────────────────────────────────────────────────────────
    // members.lab_id → labs.id  (inverse)
    // partnerLabs.lab_id → labs.id → partner_id → partners.id
    // lab → partnerLabs → projectPartners → projects  (via partner_id commun)
    labs: {
        members: [
            { table: 'members', localKey: 'id', foreignKey: 'lab_id' },
        ],
        partners: [
            { table: 'partnerLabs', localKey: 'id', foreignKey: 'lab_id' },
            { table: 'partners', localKey: 'partner_id', foreignKey: 'id' },
        ],
        projects: [
            { table: 'partnerLabs', localKey: 'id', foreignKey: 'lab_id' },
            { table: 'projectPartners', localKey: 'partner_id', foreignKey: 'partner_id' },
            { table: 'projects', localKey: 'project_id', foreignKey: 'id' },
        ],
        projectCalls: [
            { table: 'partnerLabs', localKey: 'id', foreignKey: 'lab_id' },
            { table: 'projectPartners', localKey: 'partner_id', foreignKey: 'partner_id' },
            { table: 'projects', localKey: 'project_id', foreignKey: 'id' },
            { table: 'projectCalls', localKey: 'project_call_id', foreignKey: 'id' },
        ],
        axes: [
            { table: 'partnerLabs', localKey: 'id', foreignKey: 'lab_id' },
            { table: 'projectPartners', localKey: 'partner_id', foreignKey: 'partner_id' },
            { table: 'projects', localKey: 'project_id', foreignKey: 'id' },
            { table: 'projectCalls', localKey: 'project_call_id', foreignKey: 'id' },
            { table: 'axes', localKey: 'axis_id', foreignKey: 'id' },
        ],
    },

    // ── projects ───────────────────────────────────────────────────────────
    // projects.project_call_id → projectCalls.id
    // projectMembers.project_id → members.id
    // projectPartners.project_id → partners.id
    // agreements.project_id → projects.id  (inverse)
    projects: {
        projectCalls: [
            { table: 'projectCalls', localKey: 'project_call_id', foreignKey: 'id' },
        ],
        members: [
            { table: 'projectMembers', localKey: 'id', foreignKey: 'project_id' },
            { table: 'members', localKey: 'member_id', foreignKey: 'id' },
        ],
        partners: [
            { table: 'projectPartners', localKey: 'id', foreignKey: 'project_id' },
            { table: 'partners', localKey: 'partner_id', foreignKey: 'id' },
        ],
        agreements: [
            { table: 'agreements', localKey: 'id', foreignKey: 'project_id' },
        ],
        axes: [
            { table: 'projectCalls', localKey: 'project_call_id', foreignKey: 'id' },
            { table: 'axes', localKey: 'axis_id', foreignKey: 'id' },
        ],
        labs: [
            { table: 'projectPartners', localKey: 'id', foreignKey: 'project_id' },
            { table: 'partnerLabs', localKey: 'partner_id', foreignKey: 'partner_id' },
            { table: 'labs', localKey: 'lab_id', foreignKey: 'id' },
        ],
    },

    // ── projectCalls ───────────────────────────────────────────────────────
    // projects.project_call_id → projectCalls.id  (inverse)
    // projectCalls.axis_id → axes.id
    projectCalls: {
        projects: [
            { table: 'projects', localKey: 'id', foreignKey: 'project_call_id' },
        ],
        axes: [
            { table: 'axes', localKey: 'axis_id', foreignKey: 'id' },
        ],
        members: [
            { table: 'projects', localKey: 'id', foreignKey: 'project_call_id' },
            { table: 'projectMembers', localKey: 'id', foreignKey: 'project_id' },
            { table: 'members', localKey: 'member_id', foreignKey: 'id' },
        ],
        partners: [
            { table: 'projects', localKey: 'id', foreignKey: 'project_call_id' },
            { table: 'projectPartners', localKey: 'id', foreignKey: 'project_id' },
            { table: 'partners', localKey: 'partner_id', foreignKey: 'id' },
        ],
        agreements: [
            { table: 'projects', localKey: 'id', foreignKey: 'project_call_id' },
            { table: 'agreements', localKey: 'id', foreignKey: 'project_id' },
        ],
        labs: [
            { table: 'projects', localKey: 'id', foreignKey: 'project_call_id' },
            { table: 'projectPartners', localKey: 'id', foreignKey: 'project_id' },
            { table: 'partnerLabs', localKey: 'partner_id', foreignKey: 'partner_id' },
            { table: 'labs', localKey: 'lab_id', foreignKey: 'id' },
        ],
    },

    // ── agreements ─────────────────────────────────────────────────────────
    // agreements.project_id  → projects.id
    // agreements.partner_id  → partners.id
    // agreements.axis_id     → axes.id
    agreements: {
        projects: [
            { table: 'projects', localKey: 'project_id', foreignKey: 'id' },
        ],
        partners: [
            { table: 'partners', localKey: 'partner_id', foreignKey: 'id' },
        ],
        axes: [
            { table: 'axes', localKey: 'axis_id', foreignKey: 'id' },
        ],
        projectCalls: [
            { table: 'projects', localKey: 'project_id', foreignKey: 'id' },
            { table: 'projectCalls', localKey: 'project_call_id', foreignKey: 'id' },
        ],
        members: [
            { table: 'projects', localKey: 'project_id', foreignKey: 'id' },
            { table: 'projectMembers', localKey: 'id', foreignKey: 'project_id' },
            { table: 'members', localKey: 'member_id', foreignKey: 'id' },
        ],
        labs: [
            { table: 'partners', localKey: 'partner_id', foreignKey: 'id' },
            { table: 'partnerLabs', localKey: 'id', foreignKey: 'partner_id' },
            { table: 'labs', localKey: 'lab_id', foreignKey: 'id' },
        ],
    },

    // ── axes ───────────────────────────────────────────────────────────────
    // projectCalls.axis_id → axes.id  (inverse)
    // agreements.axis_id   → axes.id  (inverse)
    axes: {
        projectCalls: [
            { table: 'projectCalls', localKey: 'id', foreignKey: 'axis_id' },
        ],
        agreements: [
            { table: 'agreements', localKey: 'id', foreignKey: 'axis_id' },
        ],
        projects: [
            { table: 'projectCalls', localKey: 'id', foreignKey: 'axis_id' },
            { table: 'projects', localKey: 'id', foreignKey: 'project_call_id' },
        ],
        members: [
            { table: 'projectCalls', localKey: 'id', foreignKey: 'axis_id' },
            { table: 'projects', localKey: 'id', foreignKey: 'project_call_id' },
            { table: 'projectMembers', localKey: 'id', foreignKey: 'project_id' },
            { table: 'members', localKey: 'member_id', foreignKey: 'id' },
        ],
        partners: [
            { table: 'agreements', localKey: 'id', foreignKey: 'axis_id' },
            { table: 'partners', localKey: 'partner_id', foreignKey: 'id' },
        ],
    },

    // ── formations ─────────────────────────────────────────────────────────
    // formations.partner_id → partners.id
    formations: {
        partners: [
            { table: 'partners', localKey: 'partner_id', foreignKey: 'id' },
        ],
    },
}

// ── Définitions de champs ──────────────────────────────────────────────────

export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'enum'

export type FieldDef = {
    key: string
    label: string
    type: FieldType
    values?: string[]  // valeurs connues pour les champs enum
}

export const TABLE_FIELDS: Partial<Record<keyof DB, FieldDef[]>> = {
    members: [
        { key: 'first_name', label: 'Prénom', type: 'string' },
        { key: 'last_name', label: 'Nom', type: 'string' },
        { key: 'email', label: 'Email', type: 'string' },
        { key: 'position', label: 'Poste', type: 'string' },
        { key: 'tel', label: 'Tél.', type: 'string' },
        { key: 'genre', label: 'Genre', type: 'enum', values: ['Homme', 'Femme'] },
        { key: 'status', label: 'Statut', type: 'enum', values: ['Prof', 'Enseignant-chercheur', 'BIATSS', 'Doctorant', 'Post-doc', 'Ingénieur de recherche'] },
        { key: 'is_staff', label: 'Staff', type: 'boolean' },
    ],
    partners: [
        { key: 'name', label: 'Nom', type: 'string' },
        { key: 'description', label: 'Description', type: 'string' },
        { key: 'type', label: 'Type', type: 'enum', values: ['Entreprise privée', 'Association', 'Collectivité', 'Établissement public'] },
        { key: 'consortium', label: 'Consortium', type: 'boolean' },
    ],
    labs: [
        { key: 'name', label: 'Nom', type: 'string' },
        { key: 'description', label: 'Description', type: 'string' },
        { key: 'type', label: 'Type', type: 'enum', values: ['Laboratoire académique', 'UMR', 'Équipe de recherche'] },
        { key: 'topic', label: 'Thématique', type: 'string' },
    ],
    projects: [
        { key: 'title', label: 'Titre', type: 'string' },
        { key: 'description', label: 'Description', type: 'string' },
        { key: 'budget', label: 'Budget', type: 'number' },
        { key: 'start_date', label: 'Début', type: 'date' },
        { key: 'end_date', label: 'Fin', type: 'date' },
    ],
    projectCalls: [
        { key: 'title', label: 'Titre', type: 'string' },
        { key: 'description', label: 'Description', type: 'string' },
        { key: 'budget', label: 'Budget', type: 'number' },
        { key: 'start_date', label: 'Début', type: 'date' },
        { key: 'end_date', label: 'Fin', type: 'date' },
    ],
    agreements: [
        { key: 'title', label: 'Titre', type: 'string' },
        { key: 'description', label: 'Description', type: 'string' },
        { key: 'budget', label: 'Budget', type: 'number' },
        { key: 'grant', label: 'Subvention', type: 'number' },
        { key: 'signed_date', label: 'Signé le', type: 'date' },
    ],
    axes: [
        { key: 'name', label: 'Nom', type: 'string' },
        { key: 'description', label: 'Description', type: 'string' },
    ],
    formations: [
        { key: 'title', label: 'Titre', type: 'string' },
        { key: 'code', label: 'Code', type: 'string' },
        { key: 'type', label: 'Type', type: 'string' },
        { key: 'level', label: 'Niveau', type: 'string' },
        { key: 'degree_type', label: 'Diplôme', type: 'string' },
        { key: 'status', label: 'Statut', type: 'string' },
        { key: 'is_national', label: 'National', type: 'boolean' },
    ],
}

// ── Config UI ──────────────────────────────────────────────────────────────

export const QUERYABLE_TABLES = [
    { key: 'members' as const, label: 'Membres' },
    { key: 'partners' as const, label: 'Partenaires' },
    { key: 'labs' as const, label: 'Laboratoires' },
    { key: 'projects' as const, label: 'Projets' },
    { key: 'projectCalls' as const, label: 'Dispositifs' },
    { key: 'agreements' as const, label: 'Conventions' },
    { key: 'axes' as const, label: 'Axes' },
    { key: 'formations' as const, label: 'Formations' },
]

export type QueryableTableKey = typeof QUERYABLE_TABLES[number]['key']

// ── Moteur de traversal ────────────────────────────────────────────────────

// Suit un chemin de jointure depuis un ensemble d'enregistrements.
// Retourne les enregistrements de la table en bout de chemin.
export function traverse(
    startRecords: Record<string, unknown>[],
    path: RelationPath,
    db: DB,
): Record<string, unknown>[] {
    let current = startRecords
    for (const step of path) {
        const localVals = new Set(current.map(r => r[step.localKey]))
        current = (db[step.table] as Record<string, unknown>[])
            .filter(r => localVals.has(r[step.foreignKey]))
    }
    return current
}
