// Résout les clés étrangères des tables Grist (format plat) en objets imbriqués
// identiques au format des mocks, utilisables directement par le front.

import type {
    Status, Category, Member, Partner, Axis, Lab, PartnerLab, LabCardFull,
    ActionCard, ActionCardFull,
    ProjectCall, Project, FinancialAgreement,
    Phd, MobilityGrant, ToDoList, ToDoItem,
    Kpi, BudgetCategory, BudgetDetail,
    MemberActionCard, ProjectActionCard, AgreementActionCard, PartnerCardFull,
    Group,
    GroupMember,
    Comment, CommentFull,
    ProjectMember,
    AgreementMember,
    KpiEntry,
    ProjectPartner,
    ProjectMilestone,
    TimeEntry,
    Formation,
    ProjectFormation,
    ProjectAttachment,
    Program,
    Expanse,
    Supplier,
    Publication,
    PublicationMember,
    SifacLine
} from '@/lib/types'

// --- Helpers ---

function str(v: unknown): string { return typeof v === 'string' ? v : '' }
function num(v: unknown): number { return typeof v === 'number' ? v : 0 }
function nullable(v: unknown): number | null {
    return typeof v === 'number' && v !== 0 ? v : null
}
function nullableStr(v: unknown): string | null {
    return typeof v === 'string' && v !== '' ? v : null
}

// --- Tables de référence (pas de jointure, nettoyage des types seulement) ---

export function normalizeStatuses(rows: Record<string, unknown>[]): Status[] {
    return rows.map(r => ({
        id: num(r.id),
        label: str(r.label),
        context: str(r.context),
    }))
}

export function normalizeCategories(rows: Record<string, unknown>[]): Category[] {
    return rows.map(r => ({
        id: num(r.id),
        parent_category_id: nullable(r.parent_category_id),
        title: str(r.title),
        color: r.color ? str(r.color) : null,
    }))
}

export function normalizeMembers(rows: Record<string, unknown>[]): Member[] {
    return rows.map(r => ({
        id: num(r.id),
        partner_id: num(r.partner_id),
        lab_id: r.lab_id !== undefined ? num(r.lab_id) : 0,
        first_name: str(r.first_name),
        last_name: str(r.last_name),
        position: str(r.position),
        email: str(r.email),
        tel: str(r.tel),
        genre: str(r.genre),
        status: str(r.status),
        profile_image: str(r.profile_image),
        is_staff: Boolean(r.is_staff),
    }))
}

export function normalizeGroup(rows: Record<string, unknown>[]): Group[] {
    return rows.map(r => ({
        id: num(r.id),
        name: str(r.name),
        owner_id: nullable(r.owner_id)
    }))
}

export function normalizeGroupMember(rows: Record<string, unknown>[]): GroupMember[] {
    return rows.map(r => ({
        id: num(r.id),
        member_id: num(r.member_id),
        group_id: num(r.group_id)
    }))
}

export function normalizePartners(rows: Record<string, unknown>[]): Partner[] {
    return rows.map(r => ({
        id: num(r.id),
        name: str(r.name),
        description: str(r.description),
        color: str(r.color),
        logo: str(r.logo),
        status_id: num(r.status_id),
        type: str(r.type),
        consortium: Boolean(r.consortium),
    }))
}

export function normalizeAxes(rows: Record<string, unknown>[]): Axis[] {
    return rows.map(r => ({
        id: num(r.id),
        name: str(r.name),
        description: str(r.description),
    }))
}

// --- Action cards ---

export function normalizeActionCards(rows: Record<string, unknown>[]): ActionCard[] {
    return rows.map(r => ({
        id: num(r.id),
        owner_id: num(r.owner_id),
        category_id: num(r.category_id),
        status_id: num(r.status_id),
        title: str(r.title),
        color: str(r.color),
        description: str(r.description),
        start_date: str(r.start_date),
        end_date: str(r.end_date),
        full_address: str(r.full_address),
        lat: nullable(r.lat),
        lon: nullable(r.lon),
    }))
}

// Jointure complète : résout status, category (+ parent) et owner
export function normalizeActionCardsFull(
    rows: Record<string, unknown>[],
    statuses: Status[],
    categories: Category[],
    members: Member[],
): ActionCardFull[] {
    const statusMap = new Map(statuses.map(s => [s.id, s]))
    const categoryMap = new Map(categories.map(c => [c.id, c]))
    const memberMap = new Map(members.map(m => [m.id, m]))

    const FALLBACK_STATUS: Status = { id: 0, label: '—', context: 'action_card' }
    const FALLBACK_CATEGORY: Category = { id: 0, title: '—', parent_category_id: null, color: null }
    const FALLBACK_MEMBER: Member = { id: 0, partner_id: 0, lab_id: 0, first_name: '?', last_name: '', position: '', email: '', tel: '', genre: '', status: '', profile_image: '', is_staff: false }

    return normalizeActionCards(rows).map(card => {
        const category = categoryMap.get(card.category_id) ?? FALLBACK_CATEGORY
        const parent = category.parent_category_id
            ? categoryMap.get(category.parent_category_id) ?? null
            : null

        return {
            ...card,
            status: statusMap.get(card.status_id) ?? FALLBACK_STATUS,
            category: { ...category, parent },
            owner: memberMap.get(card.owner_id) ?? FALLBACK_MEMBER,
        }
    })
}


export function normalizeComments(rows: Record<string, unknown>[]): Comment[] {
    return rows.map(r => ({
        id: num(r.id),
        owner_id: num(r.owner_id),
        parent_comment_id: r.parent_comment_id ? num(r.parent_comment_id) : undefined,
        action_card_id: num(r.action_card_id),
        content: str(r.content),
        timestamp: str(r.timestamp)
    }))
}

export function normalizeCommentsFull(
    rows: Record<string, unknown>[],
    members: Member[]
): CommentFull[] {
    const memberMap = new Map(members.map(m => [m.id, m]))
    const comments = normalizeComments(rows)

    const map = new Map<number, CommentFull>()
    for (const c of comments) {
        map.set(c.id, { ...c, owner: memberMap.get(c.owner_id)!, replies: [] })
    }

    const roots: CommentFull[] = []
    for (const c of map.values()) {
        if (c.parent_comment_id) {
            map.get(c.parent_comment_id)?.replies?.push(c)
        } else {
            roots.push(c)
        }
    }
    return roots.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

// --- Autres tables ---

export function normalizeProjectCalls(rows: Record<string, unknown>[]): ProjectCall[] {
    return rows.map(r => ({
        id: num(r.id),
        axis_id: num(r.axis_id),
        title: str(r.title),
        description: str(r.description),
        start_date: str(r.start_date),
        end_date: str(r.end_date),
        status_id: num(r.status_id),
        budget: num(r.budget),
    }))
}

export function normalizeProjects(rows: Record<string, unknown>[]): Project[] {
    return rows.map(r => ({
        id: num(r.id),
        project_call_id: num(r.project_call_id),
        status_id: num(r.status_id),
        title: str(r.title),
        description: str(r.description),
        budget: num(r.budget),
        start_date: str(r.start_date),
        end_date: str(r.end_date),
    }))
}

export function normalizeProjectPartners(rows: Record<string, unknown>[]): ProjectPartner[] {
    return rows.map(r => ({
        id: num(r.id),
        project_id: num(r.project_id),
        partner_id: num(r.partner_id),
        role: str(r.role),
        amount: nullable(r.amount),
        label: r.label ? str(r.label) : null,
    }))
}

export function normalizeProjectMilestones(rows: Record<string, unknown>[]): ProjectMilestone[] {
    return rows.map(r => ({
        id: num(r.id),
        project_id: num(r.project_id),
        title: str(r.title),
        description: str(r.description),
        due_date: str(r.due_date),
        status_id: num(r.status_id),
    }))
}

export function normalizeTimeEntry(rows: Record<string, unknown>[]): TimeEntry[] {
    return rows.map(r => ({
        id: num(r.id),
        project_id: num(r.project_id),
        member_id: num(r.member_id),
        days: num(r.days),
        start_date: str(r.start_date),
        end_date: str(r.end_date)
    }))
}

export function normalizeProjectMembers(rows: Record<string, unknown>[]): ProjectMember[] {
    return rows.map(r => ({
        id: num(r.id),
        member_id: num(r.member_id),
        project_id: num(r.project_id),
        role: str(r.role),
        ...(r.participation_status_id != null ? { participation_status_id: num(r.participation_status_id) } : {}),
    }))
}

export function normalizeFinancialAgreements(rows: Record<string, unknown>[]): FinancialAgreement[] {
    return rows.map(r => ({
        id: num(r.id),
        project_id: num(r.project__id ?? r.project_id ?? r.Project),
        partner_id: num(r.partner_id ?? r.Partner),
        axis_id: r.axis_id ? num(r.axis_id) : null,
        status_id: num(r.status_id),
        title: str(r.title),
        description: str(r.description),
        budget: num(r.budget ?? r.Budget),
        grant: num(r.grant ?? r.Grant ?? r.Subvention ?? r.subvention),
        signed_date: str(r.signed_date),
        budget_detail_id: nullable(r.budget_detail_id),
    }))
}

export function normalizeAgreementMembers(rows: Record<string, unknown>[]): AgreementMember[] {
    return rows.map(r => ({ id: num(r.id), member_id: num(r.member_id), agreement_id: num(r.agreement_id) }))
}

export function normalizePhds(rows: Record<string, unknown>[]): Phd[] {
    return rows.map(r => ({
        id: num(r.id),
        member_id: num(r.member),
        start_date: str(r.start_date),
        end_date: str(r.end_date),
        axis_id: num(r.axis_id),
    }))
}

export function normalizeMobilityGrants(rows: Record<string, unknown>[]): MobilityGrant[] {
    return rows.map(r => ({
        id: num(r.id),
        member_id: num(r.member),
        start_date: str(r.start_date),
        end_date: str(r.end_date),
        axis_id: num(r.axis_id),
    }))
}

export function normalizeKpis(rows: Record<string, unknown>[]): Kpi[] {
    return rows.map(r => ({
        id: num(r.id),
        label: str(r.label),
        unit: str(r.unit),
        definition: str(r.definition),
        dimension: str(r.dimension),
    }))
}

export function normalizeKpiEntries(rows: Record<string, unknown>[]): KpiEntry[] {
    return rows.map(r => ({
        id: num(r.id),
        project_id: num(r.project_id),
        kpi_id: num(r.kpi_id),
        member_id: num(r.member_id),
        value: num(r.value),
        comment: str(r.comment),
        date: str(r.date),
        year: str(r.year),
        author_id: num(r.author_id),
    }))
}

export function normalizeBudgetCategories(rows: Record<string, unknown>[]): BudgetCategory[] {
    return rows.map(r => ({
        id: num(r.id),
        partner_id: nullable(r.partner_id),
        title: str(r.title),
    }))
}

export function normalizeBudgetDetails(rows: Record<string, unknown>[]): BudgetDetail[] {
    return rows.map(r => ({
        id: num(r.id),
        budget_category_id: num(r.budget_category_id),
        parent_id: nullable(r.parent_id),
        title: str(r.title),
        description: str(r.description),
        budget: num(r.budget),
        start_date: nullableStr(r.start_date),
        end_date: nullableStr(r.end_date),
    }))
}

export function normalizeToDoLists(rows: Record<string, unknown>[]): ToDoList[] {
    return rows.map(r => ({
        id: num(r.id),
        action_card_id: num(r.action_card_id),
        title: str(r.title),
    }))
}

export function normalizeToDoItems(rows: Record<string, unknown>[]): ToDoItem[] {
    return rows.map(r => ({
        id: num(r.id),
        list_id: num(r.list_id),
        content: str(r.content),
        status_id: num(r.status_id),
        start_date: str(r.start_date),
        end_time: str(r.end_time),
        due_date: str(r.due_date),
    }))
}

export function normalizeMemberActionCards(rows: Record<string, unknown>[]): MemberActionCard[] {
    return rows.map(r => ({
        id: num(r.id),
        member_id: num(r.member_id),
        action_card_id: num(r.action_card_id),
        role: str(r.role),
        ...(r.participation_status_id != null ? { participation_status_id: num(r.participation_status_id) } : {}),
    }))
}

export function normalizeProjectActionCards(rows: Record<string, unknown>[]): ProjectActionCard[] {
    return rows.map(r => ({
        id: num(r.id),
        project_id: num(r.project_id),
        action_card_id: num(r.action_card_id),
    }))
}

export function normalizePartnerCardsFull(
    rows: Record<string, unknown>[],  // lignes brutes Grist → les Partners
    agreements: FinancialAgreement[],       // pour construire agreementsByPartner
    projects: Project[],                  // pour construire projectsByPartner
    members: Member[],                   // pour construire membersByPartner
): PartnerCardFull[] {

    const membersByPartner = new Map<number, Member[]>()
    const agreementsByPartner = new Map<number, FinancialAgreement[]>()
    const projectsByPartner = new Map<number, Project[]>()

    for (const m of members) {
        const existing = membersByPartner.get(m.partner_id) ?? []
        membersByPartner.set(m.partner_id, [...existing, m])
    }

    for (const a of agreements) {
        const existing = agreementsByPartner.get(a.partner_id) ?? []
        agreementsByPartner.set(a.partner_id, [...existing, a])

        const project = projects.find(p => p.id === a.project_id)
        if (project) {
            const existingP = projectsByPartner.get(a.partner_id) ?? []
            if (!existingP.find(p => p.id === project.id)) {
                projectsByPartner.set(a.partner_id, [...existingP, project])
            }
        }
    }

    return rows.map(r => ({
        id: num(r.id),
        name: str(r.name),
        description: str(r.description),
        color: str(r.color),
        logo: str(r.logo),
        status_id: num(r.status_id),
        type: str(r.type),
        consortium: Boolean(r.consortium),
        members: membersByPartner.get(num(r.id)) ?? [],
        agreements: agreementsByPartner.get(num(r.id)) ?? [],
        projects: projectsByPartner.get(num(r.id)) ?? [],
    }))
}

export function normalizeAgreementActionCards(rows: Record<string, unknown>[]): AgreementActionCard[] {
    return rows.map(r => ({
        id: num(r.id),
        financial_agreement_id: num(r.financial_agreement_id),
        action_card_id: num(r.action_card_id),
    }))
}

export function normalizeLabs(rows: Record<string, unknown>[]): Lab[] {
    return rows.map(r => ({
        id: num(r.id),
        name: str(r.name),
        description: str(r.description),
        type: str(r.type),
        topic: str(r.topic),
    }))
}

export function normalizePartnerLabs(rows: Record<string, unknown>[]): PartnerLab[] {
    return rows.map(r => ({
        id: num(r.id),
        lab_id: num(r.lab_id),
        partner_id: num(r.partner_id),
    }))
}

export function normalizeLabCardsFull(
    rows: Record<string, unknown>[],
    partnerLabs: PartnerLab[],
    partners: Partner[],
    members: Member[],
): LabCardFull[] {
    const partnerMap = new Map(partners.map(p => [p.id, p]))

    const partnersByLab = new Map<number, Partner[]>()
    for (const pl of partnerLabs) {
        const partner = partnerMap.get(pl.partner_id)
        if (partner) {
            const existing = partnersByLab.get(pl.lab_id) ?? []
            partnersByLab.set(pl.lab_id, [...existing, partner])
        }
    }

    const membersByLab = new Map<number, Member[]>()
    for (const m of members) {
        if (m.lab_id) {
            const existing = membersByLab.get(m.lab_id) ?? []
            membersByLab.set(m.lab_id, [...existing, m])
        }
    }

    return normalizeLabs(rows).map(lab => ({
        ...lab,
        partners: partnersByLab.get(lab.id) ?? [],
        members: membersByLab.get(lab.id) ?? [],
    }))
}

export function normalizeFormations(rows: Record<string, unknown>[]): Formation[] {
    return rows.map(r => ({
        id: num(r.id),
        code: str(r.code),
        type: str(r.type),
        title: str(r.title),
        partner_id: r.partner_id ? num(r.partner_id) : null,
        level: str(r.level),
        degree_type: str(r.degree_type),
        formacode: str(r.formacode),
        rome: str(r.rome),
        nsf: str(r.nsf),
        status: str(r.status),
        expiry_date: str(r.expiry_date),
        is_national: Boolean(r.is_national),
    }))
}

export function normalizeProjectFormations(rows: Record<string, unknown>[]): ProjectFormation[] {
    return rows.map(r => ({
        id: num(r.id),
        project_id: num(r.project_id),
        formation_id: num(r.formation_id),
    }))
}

export function normalizeProjectAttachments(rows: Record<string, unknown>[]): ProjectAttachment[] {
    return rows.map(r => ({
        id: num(r.id),
        project_id: num(r.project_id),
        label: str(r.label),
        url: str(r.url),
    }))
}

export function normalizeProgram(rows: Record<string, unknown>[]): Program[] {
    return rows.map(r => ({
        id: num(r.id),
        name: str(r.name),
        description: str(r.description),
        budget: num(r.bdget),
        start_date: str(r.start_date),
        end_date: str(r.end_date),
        logo: str(r.logo),
        management_fee_rate: nullable(r.management_fee_rate),
    }))
}

// Budget & expanses

export function normalizeSuplier(rows: Record<string, unknown>[]): Supplier[] {
    return rows.map(r => ({
        id: num(r.id),
        name: str(r.name),
        description: str(r.description),
        siret: str(r.siret),
        sifac_code: str(r.sifac_code)
    })
    )
}


export function normalizeExpanse(rows: Record<string, unknown>[]): Expanse[] {
    return rows.map(r => ({
        id: num(r.id),
        amount: num(r.amount),
        title: str(r.title),
        description: str(r.description),
        budget_detail_id: nullable(r.budget_detail_id),
        supplier_id: nullable(r.supplier_id),
        category: str(r.category),
        label: str(r.label),
        project_id: num(r.project_id),
        agreement_id: nullable(r.agreement_id),
        payment_date: str(r.payment_date),
        purchase_date: str(r.purchase_date),
        delivery_date: str(r.delivery_date),
        status: str(r.status),
        amount_engaged: num(r.amount_engaged),
        amount_paid: num(r.amount_paid),
        amount_invoiced: num(r.amount_invoiced),
        flux_id: nullableStr(r.flux_id),
        invoice_date: str(r.invoice_date),
        source: r.source === 'sifac' ? 'sifac' : 'manual'
    }))
}

export function normalizeSifacLine(rows: Record<string, unknown>[]): SifacLine[] {
    return rows.map(r => ({
        id: num(r.id),
        pfi: str(r.pfi),
        exercice: num(r.exercice),
        flux_id: str(r.flux_id),
        flux_label: str(r.flux_label),
        rubrique: str(r.rubrique),
        supplier_name: str(r.supplier_name),
        supplier_code: str(r.supplier_code),
        account: str(r.account),
        account_label: str(r.account_label),
        engagement_date: str(r.engagement_date),
        amount_engaged: num(r.amount_engaged),
        amount_certified: num(r.amount_certified),
        amount_received: num(r.amount_received),
        invoice_number: str(r.invoice_number),
        invoice_date: str(r.invoice_date),
        invoice_text: str(r.invoice_text),
        amount_invoiced: num(r.amount_invoiced),
        amount_paid: num(r.amount_paid),
        payment_date: str(r.payment_date),
        amount_report: num(r.amount_report),
        otp: str(r.otp),
        category: str(r.category),
        csf_date: str(r.csf_date)
    }))
}

export function normalizePublications(rows: Record<string, unknown>[]): Publication[] {
    return rows.map(r => ({
        id: num(r.id),
        project_id: num(r.project_id),
        title: str(r.title),
        lab_id: nullable(r.lab_id),
        subject: str(r.subject),
        journal: str(r.journal),
        year: str(r.year),
        doi: str(r.doi),
    }))
}

export function normalizePublicationMembers(rows: Record<string, unknown>[]): PublicationMember[] {
    return rows.map(r => ({
        id: num(r.id),
        publication_id: num(r.publication_id),
        member_id: num(r.member_id),
    }))
}
