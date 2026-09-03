import { fetchTable, updateRecord, updateRecords, addRecord, addRecords, deleteRecord, replaceRecords } from '@/lib/grist'
import * as http from '@/lib/client'
import { SIFAC_OWNED_COLUMNS } from '@/lib/sifac/reconcile'
import type { Reconciliation } from '@/lib/sifac/reconcile'
import {
    mockStatuses, mockCategories, mockMembers, mockPartners, mockLabs, mockPartnerLabs,
    mockAxes, mockActionCards, mockProjectCalls, mockProjects,
    mockFinancialAgreements, mockPhds, mockMobilityGrants,
    mockKpis, mockKpiEntries, mockBudgetCategories, mockBudgetDetails,
    mockToDoLists, mockToDoItems, mockMemberActionCards, mockAxisActionCards, mockProjectActionCards,
    mockAgreementActionCards, mockGroup, mockGroupMember, mockComments,
    mockProjectMembers, mockAgreementMembers,
    mockProjectPartners, mockProjectMilestones,
    mockTimeEntry,
    mockFormations, mockProjectFormations, mockProjectAttachments,
    mockProgram, mockExpanses, mockSuppliers, mockSifacLines,
    mockPublications, mockPublicationMembers,
} from '@/lib/mock'
import {
    normalizeStatuses, normalizeCategories,
    normalizeActionCards, normalizeActionCardsFull,
    normalizeProjectCalls, normalizeProjects, normalizeFinancialAgreements,
    normalizePhds, normalizeMobilityGrants, normalizeKpis,
    normalizeBudgetCategories, normalizeBudgetDetails,
    normalizeToDoLists, normalizeToDoItems,
    normalizeMemberActionCards, normalizeProjectActionCards, normalizeAgreementActionCards,
    normalizePartnerCardsFull, normalizePartnerLabs, normalizeLabCardsFull,
    normalizeGroupMember, normalizeComments, normalizeCommentsFull, normalizeProjectMembers, normalizeAgreementMembers,
    normalizeKpiEntries, normalizeProjectPartners, normalizeProjectMilestones,
    normalizeTimeEntry,
    normalizeFormations, normalizeProjectFormations, normalizeProjectAttachments,
    normalizeProgram, normalizeExpanse, normalizeSifacLine,
    normalizePublications, normalizePublicationMembers,
} from '@/lib/normalize'
import type {
    Status, Category, Member, Partner, Axis, Lab, PartnerLab, LabCardFull,
    ActionCard, ActionCardFull, PartnerCardFull, ProjectCall, Project,
    FinancialAgreement, Phd, MobilityGrant,
    Kpi, BudgetCategory, BudgetDetail,
    ToDoList, ToDoItem, MemberActionCard, AxisActionCard, ProjectActionCard, AgreementActionCard, MemberFull,
    Group, GroupMember, Comment, CommentFull, ProjectMember, AgreementMember,
    KpiEntry, ProjectPartner, ProjectMilestone,
    TimeEntry, Formation, ProjectFormation, ProjectAttachment,
    Program,
    Expanse,
    SifacLine,
    Supplier,
    Publication,
    PublicationMember,
} from '@/lib/types'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

// --- IDs des tables Grist (Grist capitalise automatiquement la 1ère lettre) ---
// Si vos tables ont un ID différent, modifiez uniquement ici.
const T = {
    status: 'Status',
    category: 'Category',
    member: 'Member',
    partner: 'Partner',
    axis: 'Axis',
    action_card: 'Action_card',
    project_call: 'Project_call',
    project: 'Project',
    financial_agreement: 'Financial_agreement',
    phd: 'Phd',
    mobility_grant: 'Mobility_grant',
    budget_category: 'Budget_category',
    budget_detail: 'Budget_detail',
    to_do_list: 'To_do_list',
    to_do_item: 'To_do_item',
    axis_action_card: 'Axis_action_card',
    member_action_card: 'Member_action_card',
    agreement_action_card: 'Agreement_action_card',
    project_action_card: 'Project_action_card',
    lab: 'Lab',
    partner_lab: 'Partner_lab',
    group: 'Group',
    group_member: 'Group_member',
    comment: 'Comment',
    project_member: 'Project_member',
    agreement_member: 'Agreement_member',
    kpi: 'Kpi',
    kpi_entry: 'Kpi_entry',
    project_partner: 'Project_partner',
    project_milestone: 'Project_milestone',
    time_entry: 'Time_entry',
    formation: 'Formation',
    project_formation: 'Project_formation',
    project_attachment: 'Project_attachment',
    program: 'Program',
    expanse: 'Expanse',
    sifac_line: 'Sifac_line',
    expanse_suplier: 'Expanse_suplier',
    supplier: 'Supplier',
    publication: 'Publication',
    publication_member: 'Publication_member',
}

// --- Tables de référence ---
export async function getProgram(): Promise<Program[]> { return USE_MOCK ? mockProgram : normalizeProgram(await fetchTable(T.program)) }

export async function updateProgram(id: number, patch: Partial<Omit<Program, 'id'>>): Promise<void> {
    if (USE_MOCK) {
        const p = mockProgram.find(p => p.id === id)
        if (p) Object.assign(p, patch)
        return
    }
    await updateRecord(T.program, id, patch)
}
export async function getStatuses(): Promise<Status[]> { return USE_MOCK ? mockStatuses : normalizeStatuses(await fetchTable(T.status)) }
export async function getCategories(): Promise<Category[]> { return USE_MOCK ? mockCategories : normalizeCategories(await fetchTable(T.category)) }
// L'API rend null pour une référence absente, les vues attendent 0. La
// conversion tient ici et nulle part ailleurs : c'est la seule frontière que
// src/views/ ne traverse pas.
type Nulled<T, K extends keyof T> = Omit<T, K> & { [P in K]: T[P] | null }

export async function getMembers(): Promise<Member[]> {
    if (USE_MOCK) return mockMembers
    const rows = await http.get<Nulled<Member, 'partner_id' | 'lab_id'>[]>('/members/')
    return rows.map(r => ({ ...r, partner_id: r.partner_id ?? 0, lab_id: r.lab_id ?? 0 }))
}
export async function getGroups(): Promise<Group[]> { return USE_MOCK ? mockGroup : http.get<Group[]>('/groups/') }
export async function getGroupMembers(): Promise<GroupMember[]> { return USE_MOCK ? mockGroupMember : http.get<GroupMember[]>('/group-member/') }
export async function getPartners(): Promise<Partner[]> {
    if (USE_MOCK) return mockPartners
    const rows = await http.get<Nulled<Partner, 'status_id'>[]>('/partners/')
    return rows.map(r => ({ ...r, status_id: r.status_id ?? 0 }))
}
export async function getAxes(): Promise<Axis[]> { return USE_MOCK ? mockAxes : http.get<Axis[]>('/axis/') }
export async function getLabs(): Promise<Lab[]> { return USE_MOCK ? mockLabs : http.get<Lab[]>('/labs/') }
export async function getPartnerLabs(): Promise<PartnerLab[]> { return USE_MOCK ? mockPartnerLabs : http.get<PartnerLab[]>('/partner-lab/') }

// Budget & expanses
export async function getExpanses(): Promise<Expanse[]> { return USE_MOCK ? mockExpanses : normalizeExpanse(await fetchTable(T.expanse)) }
// Première fonction portée sur Django. Elle ne passe plus par normalize.ts :
// le sérialiseur DRF rend déjà des types JSON exacts, et l'organisation est
// appliquée côté serveur — le client ne la voit ni ne l'envoie.
export async function getSupliers(): Promise<Supplier[]> { return USE_MOCK ? mockSuppliers : http.get<Supplier[]>('/suppliers/') }
export async function getSifacLines(): Promise<SifacLine[]> { return USE_MOCK ? mockSifacLines : normalizeSifacLine(await fetchTable(T.sifac_line)) }


// Expanses
export async function createExpanse(data: Omit<Expanse, 'id'>): Promise<Expanse> {
    if (USE_MOCK) {
        const id = Math.max(0, ...mockExpanses.map(e => e.id)) + 1
        const expanse = { id, ...data }
        mockExpanses.push(expanse)
        return expanse
    }
    const id = await addRecord(T.expanse, data)
    return { id, ...data }
}

export async function deleteExpanse(expanseId: number): Promise<void> {
    if (USE_MOCK) {
        const idx = mockExpanses.findIndex(e => e.id === expanseId)
        if (idx !== -1) {
            mockExpanses.splice(idx, 1)
        }
    }
    await deleteRecord(T.expanse, expanseId)
}

export async function updateExpanse(id: number, patch: Partial<Expanse>): Promise<void> {
    if (USE_MOCK) {
        const i = mockExpanses.findIndex(e => e.id === id)
        if (i !== -1) mockExpanses[i] = { ...mockExpanses[i], ...patch }
        return
    }
    await updateRecord(T.expanse, id, patch)
}

// Lignes SIFAC
// Record<K, true> impose l'exhaustivité : un champ ajouté à SifacLine et oublié
// ici casse la compilation, au lieu d'être silencieusement vide en base.
const SIFAC_LINE_FIELDS: Record<keyof Omit<SifacLine, 'id'>, true> = {
    pfi: true, exercice: true, flux_id: true, flux_label: true, rubrique: true,
    supplier_name: true, supplier_code: true, account: true, account_label: true,
    engagement_date: true, amount_engaged: true, amount_certified: true,
    amount_received: true, invoice_number: true, invoice_date: true,
    invoice_text: true, amount_invoiced: true, amount_paid: true,
    payment_date: true, amount_report: true, otp: true, category: true, csf_date: true
}
const SIFAC_LINE_COLUMNS = Object.keys(SIFAC_LINE_FIELDS)

// Remplace toutes les lignes d'un couple (PFI, exercice) par celles de l'export.
// L'export SIFAC est un instantané complet du périmètre, pas un différentiel.
export async function replaceSifacLines(
    pfi: string,
    exercice: number,
    rows: Omit<SifacLine, 'id'>[]
): Promise<void> {
    // Un export vide traduit un fichier mal lu, jamais un exercice réellement vide :
    // sans ce garde-fou, un parsing raté effacerait le périmètre sans avertissement.
    if (rows.length === 0) {
        throw new Error(`Import SIFAC ${pfi} / ${exercice} : aucune ligne lue, périmètre inchangé.`)
    }

    const inScope = (l: { pfi: string; exercice: number }) => l.pfi === pfi && l.exercice === exercice

    if (USE_MOCK) {
        const kept = mockSifacLines.filter(l => !inScope(l))
        let nextId = Math.max(0, ...mockSifacLines.map(l => l.id))
        const added = rows.map(r => ({ id: ++nextId, ...r }))
        mockSifacLines.splice(0, mockSifacLines.length, ...kept, ...added)
        return
    }

    const existing = await getSifacLines()
    const toDelete = existing.filter(inScope).map(l => l.id)
    await replaceRecords(T.sifac_line, toDelete, rows, SIFAC_LINE_COLUMNS)
}

// Une dépense SIFAC dont le flux a disparu de l'export n'est pas supprimée : elle
// porte peut-être un rattachement budgétaire à conserver. On la signale, l'arbitrage
// revient à l'utilisateur.
export const ORPHAN_STATUS = 'Orpheline'

export type ImportSummary = { created: number; updated: number; orphaned: number }

export async function applyReconciliation(r: Reconciliation): Promise<ImportSummary> {
    const summary = {
        created: r.toCreate.length,
        updated: r.toUpdate.length,
        orphaned: r.toOrphan.length,
    }

    if (USE_MOCK) {
        let nextId = Math.max(0, ...mockExpanses.map(e => e.id))
        for (const data of r.toCreate) mockExpanses.push({ id: ++nextId, ...data })
        const patchById = (id: number, patch: Partial<Expanse>) => {
            const i = mockExpanses.findIndex(e => e.id === id)
            if (i !== -1) mockExpanses[i] = { ...mockExpanses[i], ...patch }
        }
        for (const { id, patch } of r.toUpdate) patchById(id, patch)
        for (const id of r.toOrphan) patchById(id, { status: ORPHAN_STATUS })
        return summary
    }

    if (r.toCreate.length > 0) {
        await addRecords(T.expanse, r.toCreate)
    }
    if (r.toUpdate.length > 0) {
        await updateRecords(
            T.expanse,
            r.toUpdate.map(u => u.id),
            r.toUpdate.map(u => u.patch),
            SIFAC_OWNED_COLUMNS,
        )
    }
    if (r.toOrphan.length > 0) {
        await updateRecords(
            T.expanse,
            r.toOrphan,
            r.toOrphan.map(() => ({ status: ORPHAN_STATUS })),
            ['status'],
        )
    }

    return summary
}

// Supplier
export async function createSupplier(data: Omit<Supplier, 'id'>): Promise<Supplier> {
    if (USE_MOCK) {
        const id = Math.max(0, ...mockSuppliers.map(e => e.id)) + 1
        const supplier = { id, ...data }
        mockSuppliers.push(supplier)
        return supplier
    }
    // Le serveur attribue l'id ; on rend sa réponse plutôt que de la reconstruire.
    return http.post<Supplier>('/suppliers/', data)
}

export async function deleteSupplier(supplierId: number): Promise<void> {
    if (USE_MOCK) {
        const idx = mockSuppliers.findIndex(e => e.id === supplierId)
        if (idx !== -1) {
            mockSuppliers.splice(idx, 1)
        }
        return
    }
    await http.del(`/suppliers/${supplierId}/`)
}

export async function updateSupplier(id: number, patch: Partial<Supplier>): Promise<void> {
    if (USE_MOCK) {
        const i = mockSuppliers.findIndex(e => e.id === id)
        if (i !== -1) mockSuppliers[i] = { ...mockSuppliers[i], ...patch }
        return
    }
    await http.patch<Supplier>(`/suppliers/${id}/`, patch)
}

// budgetCategories CRUD
export async function createBudgetCategory(data: Omit<BudgetCategory, 'id'>): Promise<BudgetCategory> {
    if (USE_MOCK) {
        const id = Math.max(0, ...mockBudgetCategories.map(c => c.id)) + 1
        const cat = { id, ...data }
        mockBudgetCategories.push(cat)
        return cat
    }
    const id = await addRecord(T.budget_category, data)
    return { id, ...data }
}

export async function updateBudgetCategory(id: number, patch: Partial<BudgetCategory>): Promise<void> {
    if (USE_MOCK) {
        const i = mockBudgetCategories.findIndex(c => c.id === id)
        if (i !== -1) mockBudgetCategories[i] = { ...mockBudgetCategories[i], ...patch }
        return
    }
    await updateRecord(T.budget_category, id, patch)
}

export async function deleteBudgetCategory(catId: number): Promise<void> {
    if (USE_MOCK) {
        const idx = mockBudgetCategories.findIndex(c => c.id === catId)
        if (idx !== -1) mockBudgetCategories.splice(idx, 1)
        return
    }
    await deleteRecord(T.budget_category, catId)
}

// budgetDetails CRUD
export async function createBudgetDetail(data: Omit<BudgetDetail, 'id'>): Promise<BudgetDetail> {
    if (USE_MOCK) {
        const id = Math.max(0, ...mockBudgetDetails.map(e => e.id)) + 1
        const detail = { id, ...data }
        mockBudgetDetails.push(detail)
        return detail
    }
    const id = await addRecord(T.budget_detail, data)
    return { id, ...data }
}

export async function deleteBudgetDetail(detailId: number): Promise<void> {
    if (USE_MOCK) {
        const idx = mockBudgetDetails.findIndex(d => d.id === detailId)
        if (idx !== -1) mockBudgetDetails.splice(idx, 1)
        return
    }
    await deleteRecord(T.budget_detail, detailId)
}

export async function updateBudgetDetail(id: number, patch: Partial<BudgetDetail>): Promise<void> {
    if (USE_MOCK) {
        const i = mockBudgetDetails.findIndex(d => d.id === id)
        if (i !== -1) mockBudgetDetails[i] = { ...mockBudgetDetails[i], ...patch }
        return
    }
    await updateRecord(T.budget_detail, id, patch)
}

// --- Cœur du système ---

export async function getActionCards(): Promise<ActionCard[]> { return USE_MOCK ? mockActionCards : normalizeActionCards(await fetchTable(T.action_card)) }
export async function getComments(): Promise<Comment[]> { return USE_MOCK ? mockComments : normalizeComments(await fetchTable(T.comment)) }

export async function getCommentsFull(cardId: number): Promise<CommentFull[]> {
    if (USE_MOCK) {
        const filtered = mockComments.filter(c => c.action_card_id === cardId)
        return normalizeCommentsFull(filtered as Record<string, unknown>[], mockMembers)
    }
    const [rows, members] = await Promise.all([fetchTable(T.comment), getMembers()])
    const filtered = rows.filter(r => r.action_card_id === cardId)
    return normalizeCommentsFull(filtered, members)
}

export async function createComment(data: Omit<Comment, 'id'>): Promise<Comment> {
    if (USE_MOCK) {
        const id = Math.max(0, ...mockComments.map(c => c.id)) + 1
        const comment = { id, ...data }
        mockComments.push(comment)
        return comment
    }
    const id = await addRecord(T.comment, data)
    return { id, ...data }
}

export async function updateComment(id: number, patch: Partial<Comment>): Promise<void> {
    if (USE_MOCK) {
        const i = mockComments.findIndex(c => c.id === id)
        if (i !== -1) mockComments[i] = { ...mockComments[i], ...patch }
        return
    }
    await updateRecord(T.comment, id, patch)
}

export async function deleteComment(id: number): Promise<void> {
    if (USE_MOCK) {
        const idx = mockComments.findIndex(c => c.id === id)
        if (idx !== -1) mockComments.splice(idx, 1)
        return
    }
    await deleteRecord(T.comment, id)
}
export async function getProjectCalls(): Promise<ProjectCall[]> { return USE_MOCK ? mockProjectCalls : normalizeProjectCalls(await fetchTable(T.project_call)) }
export async function getProjects(): Promise<Project[]> { return USE_MOCK ? mockProjects : normalizeProjects(await fetchTable(T.project)) }
export async function getFinancialAgreements(): Promise<FinancialAgreement[]> { return USE_MOCK ? mockFinancialAgreements : normalizeFinancialAgreements(await fetchTable(T.financial_agreement)) }
export async function getPhds(): Promise<Phd[]> { return USE_MOCK ? mockPhds : normalizePhds(await fetchTable(T.phd)) }
export async function getMobilityGrants(): Promise<MobilityGrant[]> { return USE_MOCK ? mockMobilityGrants : normalizeMobilityGrants(await fetchTable(T.mobility_grant)) }
export async function getProjectPartners(): Promise<ProjectPartner[]> { return USE_MOCK ? mockProjectPartners : normalizeProjectPartners(await fetchTable(T.project_partner)) }

export async function addProjectPartner(projectId: number, partnerId: number, role: string, amount: number | null, label: string | null): Promise<ProjectPartner> {
    if (USE_MOCK) {
        const link: ProjectPartner = {
            id: mockProjectPartners.length + 1,
            project_id: projectId,
            partner_id: partnerId,
            role,
            amount: amount ?? null,
            label: label ?? null,
        }
        mockProjectPartners.push(link)
        return link
    }

    const id = await addRecord(T.project_partner, { project_id: projectId, partner_id: partnerId, role, amount: amount ?? null, label })
    return { id, project_id: projectId, partner_id: partnerId, role, amount: amount ?? null, label: label ?? null }
}

export async function removeProjectPartner(recordId: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockProjectPartners.findIndex(i => i.id === recordId)
        if (i !== -1) {
            mockProjectPartners.splice(i, 1)
        }
        return
    }
    await deleteRecord(T.project_partner, recordId)
}


export async function updateProjectPartner(id: number, patch: Partial<Omit<ProjectPartner, 'id'>>): Promise<void> {
    if (USE_MOCK) {
        const pp = mockProjectPartners.find(p => p.id === id)
        if (pp) Object.assign(pp, patch)
        return
    }
    if (Object.keys(patch).length > 0) await updateRecord(T.project_partner, id, patch)
}

// --- Budget & indicateurs ---

export async function getKpis(): Promise<Kpi[]> { return USE_MOCK ? mockKpis : normalizeKpis(await fetchTable(T.kpi)) }
export async function getBudgetCategories(): Promise<BudgetCategory[]> { return USE_MOCK ? [...mockBudgetCategories] : normalizeBudgetCategories(await fetchTable(T.budget_category)) }
export async function getBudgetDetails(): Promise<BudgetDetail[]> { return USE_MOCK ? [...mockBudgetDetails] : normalizeBudgetDetails(await fetchTable(T.budget_detail)) }

// --- To-do ---

export async function getToDoLists(): Promise<ToDoList[]> { return USE_MOCK ? mockToDoLists : normalizeToDoLists(await fetchTable(T.to_do_list)) }
export async function getToDoItems(): Promise<ToDoItem[]> { return USE_MOCK ? mockToDoItems : normalizeToDoItems(await fetchTable(T.to_do_item)) }

// --- Liens globaux (pour les filtres du kanban) ---

export async function getAllAxisActionCards(): Promise<AxisActionCard[]> {
    if (USE_MOCK) return [...mockAxisActionCards]
    const rows = await fetchTable(T.axis_action_card)
    return rows.map(r => ({ id: Number(r.id), axis_id: Number(r.axis_id), action_card_id: Number(r.action_card_id) }))
}

export async function getAllMemberActionCards(): Promise<MemberActionCard[]> {
    if (USE_MOCK) return [...mockMemberActionCards]
    const rows = await fetchTable(T.member_action_card)
    return normalizeMemberActionCards(rows)
}

// --- Jointures par carte ---

export async function getMemberActionCardsByCard(cardId: number): Promise<(MemberActionCard & { member: Member })[]> {
    const [links, members] = await (USE_MOCK
        ? Promise.resolve([
            mockMemberActionCards.filter(m => m.action_card_id === cardId),
            mockMembers,
        ])
        : Promise.all([
            fetchTable(T.member_action_card).then(normalizeMemberActionCards),
            getMembers(),
        ])
    )
    const memberMap = new Map((members as Member[]).map(m => [m.id, m]))
    return (links as MemberActionCard[])
        .filter(l => l.action_card_id === cardId)
        .map(l => ({ ...l, member: memberMap.get(l.member_id)! }))
        .filter(l => l.member)
}

export async function getActionCardsByProject(projectId: number): Promise<(ActionCardFull & { linkId: number })[]> {
    const [links, cards] = await Promise.all([
        USE_MOCK
            ? Promise.resolve(mockProjectActionCards.filter(l => l.project_id === projectId))
            : fetchTable(T.project_action_card).then(normalizeProjectActionCards).then(ls => ls.filter(l => l.project_id === projectId)),
        getActionCardsFull(),
    ])
    const linkMap = new Map((links as ProjectActionCard[]).map(l => [l.action_card_id, l.id]))
    return (cards as ActionCardFull[])
        .filter(c => linkMap.has(c.id))
        .map(c => ({ ...c, linkId: linkMap.get(c.id)! }))
}

export async function linkActionCardToProject(projectId: number, cardId: number): Promise<number> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockProjectActionCards.map(p => p.id)) + 1
        mockProjectActionCards.push({ id: newId, project_id: projectId, action_card_id: cardId })
        return newId
    }
    return addRecord(T.project_action_card, { project_id: projectId, action_card_id: cardId })
}

export async function updateProjectMember(id: number, role: string): Promise<void> {
    if (USE_MOCK) {
        const pm = mockProjectMembers.find(m => m.id === id)
        if (pm) pm.role = role
        return
    }
    await updateRecord(T.project_member, id, { role })
}

export async function updateProjectMemberParticipationStatus(id: number, participation_status_id: number | null): Promise<void> {
    if (USE_MOCK) {
        const pm = mockProjectMembers.find(m => m.id === id)
        if (pm) pm.participation_status_id = participation_status_id ?? undefined
        return
    }
    await updateRecord(T.project_member, id, { participation_status_id })
}

// Declaration des temps

export async function getTimeEntries(): Promise<TimeEntry[]> { return USE_MOCK ? mockTimeEntry : normalizeTimeEntry(await fetchTable(T.time_entry)) }

export async function addTimeEntry(projectId: number, memberId: number, days: number, start_date: string, end_date: string): Promise<TimeEntry> {
    const fields = { project_id: projectId, member_id: memberId, days, start_date, end_date }
    if (USE_MOCK) {
        const entry: TimeEntry = { id: Math.max(0, ...mockTimeEntry.map(e => e.id)) + 1, ...fields }
        mockTimeEntry.push(entry)
        return entry
    }
    const id = await addRecord(T.time_entry, fields)
    return { id, ...fields }
}

export async function removeTimeEntry(entryId: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockTimeEntry.findIndex(m => m.id === entryId)
        if (i !== -1) {
            mockTimeEntry.splice(i, 1)
            return
        }
    }
    await deleteRecord(T.time_entry, entryId)
}

export async function updateTimeEntry(entryId: number, patch: Partial<Omit<TimeEntry, 'id'>>): Promise<void> {
    if (USE_MOCK) {
        const entry = mockTimeEntry.find(m => m.id === entryId)
        if (entry) Object.assign(entry, patch)
        return
    }
    if (Object.keys(patch).length > 0) await updateRecord(T.time_entry, entryId, patch)
}

export async function getProjectActionCardsByCard(cardId: number): Promise<(ProjectActionCard & { project: Project })[]> {
    const [links, projects] = await (USE_MOCK
        ? Promise.resolve([
            mockProjectActionCards.filter(p => p.action_card_id === cardId),
            mockProjects,
        ])
        : Promise.all([
            fetchTable(T.project_action_card).then(normalizeProjectActionCards),
            getProjects(),
        ])
    )
    const projectMap = new Map((projects as Project[]).map(p => [p.id, p]))
    return (links as ProjectActionCard[])
        .filter(l => l.action_card_id === cardId)
        .map(l => ({ ...l, project: projectMap.get(l.project_id)! }))
        .filter(l => l.project)
}

export async function getToDoListsWithItemsByCard(cardId: number): Promise<(ToDoList & { items: ToDoItem[] })[]> {
    if (USE_MOCK) {
        const lists = mockToDoLists.filter(l => l.action_card_id === cardId)
        return lists.map(l => ({ ...l, items: mockToDoItems.filter(i => i.list_id === l.id) }))
    }
    const [lists, items] = await Promise.all([
        fetchTable(T.to_do_list).then(normalizeToDoLists),
        fetchTable(T.to_do_item).then(normalizeToDoItems),
    ])
    return lists
        .filter(l => l.action_card_id === cardId)
        .map(l => ({ ...l, items: items.filter(i => i.list_id === l.id) }))
}

// --- Mutations sur les éléments d'une ActionCard ---

export async function updateToDoItem(id: number, patch: Partial<Pick<ToDoItem, 'content' | 'status_id' | 'start_date' | 'end_time' | 'due_date'>>): Promise<void> {
    if (USE_MOCK) {
        const item = mockToDoItems.find(i => i.id === id)
        if (item) Object.assign(item, patch)
        return
    }
    await updateRecord(T.to_do_item, id, patch)
}

export async function addToDoItemToList(listId: number, content: string, due_date = ''): Promise<ToDoItem> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockToDoItems.map(i => i.id)) + 1
        const item: ToDoItem = { id: newId, list_id: listId, content, status_id: 8, start_date: '', end_time: '', due_date }
        mockToDoItems.push(item)
        return item
    }
    const fields: Record<string, unknown> = { list_id: listId, content, status_id: 8 }
    if (due_date) fields.due_date = due_date
    const id = await addRecord(T.to_do_item, fields)
    return { id, list_id: listId, content, status_id: 8, start_date: '', end_time: '', due_date }
}

export async function addToDoListToCard(cardId: number, title: string): Promise<ToDoList & { items: ToDoItem[] }> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockToDoLists.map(l => l.id)) + 1
        const list: ToDoList = { id: newId, action_card_id: cardId, title }
        mockToDoLists.push(list)
        return { ...list, items: [] }
    }
    const id = await addRecord(T.to_do_list, { action_card_id: cardId, title })
    return { id, action_card_id: cardId, title, items: [] }
}

export async function updateToDoList(listId: number, title: string): Promise<void> {
    if (USE_MOCK) {
        const list = mockToDoLists.find(l => l.id === listId)
        if (list) list.title = title
        return
    }
    await updateRecord(T.to_do_list, listId, { title })
}

export async function deleteToDoList(listId: number): Promise<void> {
    if (USE_MOCK) {
        const idx = mockToDoLists.findIndex(l => l.id === listId)
        if (idx !== -1) mockToDoLists.splice(idx, 1)
        const itemIds = mockToDoItems.filter(i => i.list_id === listId).map(i => i.id)
        itemIds.forEach(id => { const i = mockToDoItems.findIndex(x => x.id === id); if (i !== -1) mockToDoItems.splice(i, 1) })
        return
    }
    await deleteRecord(T.to_do_list, listId)
}

export async function addMemberToCard(cardId: number, memberId: number, role: string): Promise<MemberActionCard & { member: Member }> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockMemberActionCards.map(m => m.id)) + 1
        const link: MemberActionCard = { id: newId, member_id: memberId, action_card_id: cardId, role }
        mockMemberActionCards.push(link)
        return { ...link, member: mockMembers.find(m => m.id === memberId)! }
    }
    const id = await addRecord(T.member_action_card, { member_id: memberId, action_card_id: cardId, role })
    const members = await getMembers()
    return { id, member_id: memberId, action_card_id: cardId, role, member: members.find(m => m.id === memberId)! }
}

export async function removeMemberFromCard(linkId: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockMemberActionCards.findIndex(m => m.id === linkId)
        if (i !== -1) mockMemberActionCards.splice(i, 1)
        return
    }
    await deleteRecord(T.member_action_card, linkId)
}

export async function updateMemberRole(linkId: number, role: string): Promise<void> {
    if (USE_MOCK) {
        const link = mockMemberActionCards.find(l => l.id === linkId)
        if (link) link.role = role
        return
    }
    await updateRecord(T.member_action_card, linkId, { role })
}

export async function updateParticipationStatus(linkId: number, participation_status_id: number | null): Promise<void> {
    if (USE_MOCK) {
        const link = mockMemberActionCards.find(l => l.id === linkId)
        if (link) link.participation_status_id = participation_status_id ?? undefined
        return
    }
    await updateRecord(T.member_action_card, linkId, { participation_status_id })
}

export async function addProjectToCard(cardId: number, projectId: number): Promise<ProjectActionCard & { project: Project }> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockProjectActionCards.map(p => p.id)) + 1
        const link: ProjectActionCard = { id: newId, project_id: projectId, action_card_id: cardId }
        mockProjectActionCards.push(link)
        return { ...link, project: mockProjects.find(p => p.id === projectId)! }
    }
    const id = await addRecord(T.project_action_card, { project_id: projectId, action_card_id: cardId })
    const projects = await getProjects()
    return { id, project_id: projectId, action_card_id: cardId, project: projects.find(p => p.id === projectId)! }
}

export async function removeProjectFromCard(linkId: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockProjectActionCards.findIndex(p => p.id === linkId)
        if (i !== -1) mockProjectActionCards.splice(i, 1)
        return
    }
    await deleteRecord(T.project_action_card, linkId)
}

export async function addGroup(name: string, userId: number | null): Promise<Group> {
    if (USE_MOCK) {
        const id = Math.max(0, ...mockGroup.map(g => g.id)) + 1
        const group: Group = { id, name, owner_id: userId }
        mockGroup.push(group)
        return group
    }
    const id = await addRecord(T.group, { name })
    return { id, name, owner_id: userId }
}

export async function deleteGroup(id: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockGroup.findIndex(g => g.id === id)
        if (i !== -1) mockGroup.splice(i, 1)
        return
    }
    await deleteRecord(T.group, id)
}

export async function addMemberToGroup(memberId: number, groupId: number): Promise<GroupMember> {
    if (USE_MOCK) {
        const id = Math.max(0, ...mockGroupMember.map(g => g.id)) + 1
        const link: GroupMember = { id, member_id: memberId, group_id: groupId }
        mockGroupMember.push(link)
        return link
    }
    const id = await addRecord(T.group_member, { member_id: memberId, group_id: groupId })
    return { id, member_id: memberId, group_id: groupId }
}

export async function removeMemberFromGroup(linkId: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockGroupMember.findIndex(g => g.id === linkId)
        if (i !== -1) mockGroupMember.splice(i, 1)
        return
    }
    await deleteRecord(T.group_member, linkId)
}

export async function getMembersByGroup(groupId: number): Promise<Member[]> {
    const [links, members] = await Promise.all([
        USE_MOCK ? mockGroupMember : normalizeGroupMember(await fetchTable(T.group_member)),
        getMembers()
    ])
    const memberIds = links.filter(l => l.group_id === groupId).map(l => l.member_id)
    return members.filter(m => memberIds.includes(m.id))
}

// Renvoie les groupes d'un membre spécifique
export async function getGroupsByMember(memberId: number): Promise<Group[]> {
    const [links, groups] = await Promise.all([
        USE_MOCK ? mockGroupMember : normalizeGroupMember(await fetchTable(T.group_member)),
        getGroups()
    ])
    const groupIds = links.filter(l => l.member_id === memberId).map(l => l.group_id)
    return groups.filter(g => groupIds.includes(g.id))
}

export async function getAgreementActionCardsByCard(cardId: number): Promise<(AgreementActionCard & { agreement: FinancialAgreement })[]> {
    const [links, agreements] = await (USE_MOCK
        ? Promise.resolve([
            mockAgreementActionCards.filter(a => a.action_card_id === cardId),
            mockFinancialAgreements,
        ])
        : Promise.all([
            fetchTable(T.agreement_action_card).then(normalizeAgreementActionCards),
            getFinancialAgreements(),
        ])
    )
    const agreementMap = new Map((agreements as FinancialAgreement[]).map(a => [a.id, a]))
    return (links as AgreementActionCard[])
        .filter(l => l.action_card_id === cardId)
        .map(l => ({ ...l, agreement: agreementMap.get(l.financial_agreement_id)! }))
        .filter(l => l.agreement)
}

export async function addAgreementToCard(cardId: number, agreementId: number): Promise<AgreementActionCard & { agreement: FinancialAgreement }> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockAgreementActionCards.map(a => a.id)) + 1
        const link: AgreementActionCard = { id: newId, financial_agreement_id: agreementId, action_card_id: cardId }
        mockAgreementActionCards.push(link)
        return { ...link, agreement: mockFinancialAgreements.find(a => a.id === agreementId)! }
    }
    const id = await addRecord(T.agreement_action_card, { financial_agreement_id: agreementId, action_card_id: cardId })
    const agreements = await getFinancialAgreements()
    return { id, financial_agreement_id: agreementId, action_card_id: cardId, agreement: agreements.find(a => a.id === agreementId)! }
}

export async function removeAgreementFromCard(linkId: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockAgreementActionCards.findIndex(a => a.id === linkId)
        if (i !== -1) mockAgreementActionCards.splice(i, 1)
        return
    }
    await deleteRecord(T.agreement_action_card, linkId)
}

// --- Membres ---

export async function getMembersFull(): Promise<MemberFull[]> {
    const [members, partners, labs] = await (USE_MOCK
        ? Promise.resolve([mockMembers, mockPartners, mockLabs])
        : Promise.all([getMembers(), getPartners(), getLabs()])
    )
    const partnerMap = new Map((partners as Partner[]).map(p => [p.id, p]))
    const labMap = new Map((labs as Lab[]).map(l => [l.id, l]))
    return (members as Member[]).map(m => ({
        ...m,
        partner: partnerMap.get(m.partner_id) ?? null,
        lab: labMap.get(m.lab_id) ?? null,
    }))
}

export async function getLabCardsFull(): Promise<LabCardFull[]> {
    const [labRows, partnerLabs, partners, members] = await (USE_MOCK
        ? Promise.resolve([mockLabs, mockPartnerLabs, mockPartners, mockMembers])
        : Promise.all([
            fetchTable(T.lab),
            getPartnerLabs(),
            getPartners(),
            getMembers(),
        ])
    )
    if (USE_MOCK) {
        return normalizeLabCardsFull(
            (labRows as Lab[]).map(l => l as unknown as Record<string, unknown>),
            partnerLabs as PartnerLab[],
            partners as Partner[],
            members as Member[],
        )
    }
    return normalizeLabCardsFull(
        labRows as Record<string, unknown>[],
        partnerLabs as PartnerLab[],
        partners as Partner[],
        members as Member[],
    )
}

export async function addMember(fields: Omit<Member, 'id'>): Promise<Member> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockMembers.map(m => m.id)) + 1
        const member: Member = { id: newId, ...fields }
        mockMembers.push(member)
        return member
    }
    const { lab_id, is_staff, ...gristFields } = fields
    const id = await addRecord(T.member, gristFields)
    if (lab_id) {
        try { await updateRecord(T.member, id, { lab_id }) } catch { /* colonne lab_id absente */ }
    }
    if (is_staff !== undefined) {
        try { await updateRecord(T.member, id, { is_staff }) } catch { /* colonne is_staff absente */ }
    }
    return { id, ...fields }
}

export async function updateMember(id: number, patch: Partial<Omit<Member, 'id'>>): Promise<void> {
    if (USE_MOCK) {
        const m = mockMembers.find(m => m.id === id)
        if (m) Object.assign(m, patch)
        return
    }
    const { lab_id, is_staff, ...gristPatch } = patch
    if (Object.keys(gristPatch).length > 0) await updateRecord(T.member, id, gristPatch)
    if (lab_id !== undefined) {
        try { await updateRecord(T.member, id, { lab_id }) } catch { /* colonne lab_id absente de Grist */ }
    }
    if (is_staff !== undefined) {
        try { await updateRecord(T.member, id, { is_staff }) } catch { /* colonne is_staff absente de Grist */ }
    }
}

export async function deleteMember(id: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockMembers.findIndex(m => m.id === id)
        if (i !== -1) mockMembers.splice(i, 1)
        return
    }
    await deleteRecord(T.member, id)
}

// --- Partenaires ---

export async function addPartner(fields: Omit<Partner, 'id'>): Promise<Partner> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockPartners.map(p => p.id)) + 1
        const partner: Partner = { id: newId, ...fields }
        mockPartners.push(partner)
        return partner
    }
    const id = await addRecord(T.partner, fields)
    return { id, ...fields }
}

export async function updatePartner(id: number, patch: Partial<Omit<Partner, 'id'>>): Promise<void> {
    if (USE_MOCK) {
        const p = mockPartners.find(p => p.id === id)
        if (p) Object.assign(p, patch)
        return
    }
    await updateRecord(T.partner, id, patch)
}

export async function deletePartner(id: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockPartners.findIndex(p => p.id === id)
        if (i !== -1) mockPartners.splice(i, 1)
        return
    }
    await deleteRecord(T.partner, id)
}

// --- Laboratoires ---

export async function addLab(fields: Omit<Lab, 'id'>): Promise<Lab> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockLabs.map(l => l.id)) + 1
        const lab: Lab = { id: newId, ...fields }
        mockLabs.push(lab)
        return lab
    }
    const id = await addRecord(T.lab, fields)
    return { id, ...fields }
}

export async function updateLab(id: number, patch: Partial<Omit<Lab, 'id'>>): Promise<void> {
    if (USE_MOCK) {
        const l = mockLabs.find(l => l.id === id)
        if (l) Object.assign(l, patch)
        return
    }
    await updateRecord(T.lab, id, patch)
}

export async function deleteLab(id: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockLabs.findIndex(l => l.id === id)
        if (i !== -1) mockLabs.splice(i, 1)
        return
    }
    await deleteRecord(T.lab, id)
}

export async function addPartnerToLab(labId: number, partnerId: number): Promise<PartnerLab> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockPartnerLabs.map(pl => pl.id)) + 1
        const link: PartnerLab = { id: newId, lab_id: labId, partner_id: partnerId }
        mockPartnerLabs.push(link)
        return link
    }
    const id = await addRecord(T.partner_lab, { lab_id: labId, partner_id: partnerId })
    return { id, lab_id: labId, partner_id: partnerId }
}

export async function removePartnerFromLab(linkId: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockPartnerLabs.findIndex(pl => pl.id === linkId)
        if (i !== -1) mockPartnerLabs.splice(i, 1)
        return
    }
    await deleteRecord(T.partner_lab, linkId)
}

export async function attachMemberToLab(memberId: number, labId: number): Promise<void> {
    if (USE_MOCK) {
        const m = mockMembers.find(m => m.id === memberId)
        if (m) m.lab_id = labId
        return
    }
    try { await updateRecord(T.member, memberId, { lab_id: labId }) } catch { /* colonne lab_id absente */ }
}

export async function detachMemberFromLab(memberId: number): Promise<void> {
    if (USE_MOCK) {
        const m = mockMembers.find(m => m.id === memberId)
        if (m) m.lab_id = 0
        return
    }
    try { await updateRecord(T.member, memberId, { lab_id: 0 }) } catch { /* colonne lab_id absente */ }
}

// --- Appels à projets ---

export async function addProjectCall(fields: Omit<ProjectCall, 'id'>): Promise<ProjectCall> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockProjectCalls.map(p => p.id)) + 1
        const pc: ProjectCall = { id: newId, ...fields }
        mockProjectCalls.push(pc)
        return pc
    }
    const id = await addRecord(T.project_call, fields)
    return { id, ...fields }
}

export async function updateProjectCall(id: number, patch: Partial<Omit<ProjectCall, 'id'>>): Promise<void> {
    if (USE_MOCK) {
        const pc = mockProjectCalls.find(p => p.id === id)
        if (pc) Object.assign(pc, patch)
        return
    }
    await updateRecord(T.project_call, id, patch)
}

export async function deleteProjectCall(id: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockProjectCalls.findIndex(p => p.id === id)
        if (i !== -1) mockProjectCalls.splice(i, 1)
        return
    }
    await deleteRecord(T.project_call, id)
}

// --- Projets ---

export async function addProject(fields: Omit<Project, 'id'>): Promise<Project> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockProjects.map(p => p.id)) + 1
        const project: Project = { id: newId, ...fields }
        mockProjects.push(project)
        return project
    }
    const gristFields = Object.fromEntries(
        Object.entries(fields).filter(([, v]) => v !== '' && v !== null && v !== undefined)
    )
    const id = await addRecord(T.project, gristFields)
    return { id, ...fields }
}

export async function updateProject(id: number, patch: Partial<Omit<Project, 'id'>>): Promise<void> {
    if (USE_MOCK) {
        const p = mockProjects.find(p => p.id === id)
        if (p) Object.assign(p, patch)
        return
    }
    const gristPatch = Object.fromEntries(
        Object.entries(patch).filter(([, v]) => v !== null && v !== undefined)
    )
    if (Object.keys(gristPatch).length > 0) await updateRecord(T.project, id, gristPatch)
}

export async function deleteProject(id: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockProjects.findIndex(p => p.id === id)
        if (i !== -1) mockProjects.splice(i, 1)
        return
    }
    await deleteRecord(T.project, id)
}

export async function getProjectMembers(projectId: number): Promise<ProjectMember[]> {
    if (USE_MOCK) {
        return mockProjectMembers.filter(pm => pm.project_id === projectId)
    }
    const rows = await fetchTable(T.project_member)
    return normalizeProjectMembers(rows).filter(pm => pm.project_id === projectId)
}

export async function getAllProjectMembers(): Promise<ProjectMember[]> {
    return USE_MOCK
        ? mockProjectMembers
        : normalizeProjectMembers(await fetchTable(T.project_member))
}

export async function addProjectMember(projectId: number, memberId: number, role: string): Promise<ProjectMember> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockProjectMembers.map(p => p.id)) + 1
        const newProjectMember: ProjectMember = { id: newId, project_id: projectId, member_id: memberId, role: role }
        mockProjectMembers.push(newProjectMember)
        return newProjectMember
    }
    const id = await addRecord(T.project_member, { project_id: projectId, member_id: memberId, role: role })
    return { id, project_id: projectId, member_id: memberId, role: role }
}

export async function removeProjectMember(id: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockProjectMembers.findIndex(mp => mp.id === id)
        if (i !== -1) {
            mockProjectMembers.splice(i, 1)
        } return
    }
    await deleteRecord(T.project_member, id)
}

export async function getKpiEntries(projetId: number): Promise<KpiEntry[]> {
    if (USE_MOCK) {
        return mockKpiEntries.filter(ke => ke.project_id === projetId)
    }

    const kpiEntries = normalizeKpiEntries(await fetchTable(T.kpi_entry))
    return kpiEntries.filter(ke => ke.project_id === projetId)
}

export async function addKpiEntry(fields: Omit<KpiEntry, 'id'>): Promise<KpiEntry> {
    if (USE_MOCK) {
        const id = Math.max(0, ...mockKpiEntries.map(e => e.id)) + 1
        const entry: KpiEntry = { id, ...fields }
        mockKpiEntries.push(entry)
        return entry
    }
    const id = await addRecord(T.kpi_entry, fields)
    return { id, ...fields }
}

export async function updateKpiEntry(id: number, patch: Partial<Omit<KpiEntry, 'id'>>): Promise<void> {
    if (USE_MOCK) {
        const i = mockKpiEntries.findIndex(e => e.id === id)
        if (i !== -1) mockKpiEntries[i] = { ...mockKpiEntries[i], ...patch }
        return
    }
    await updateRecord(T.kpi_entry, id, patch)
}

export async function deleteKpiEntry(id: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockKpiEntries.findIndex(e => e.id === id)
        if (i !== -1) mockKpiEntries.splice(i, 1)
        return
    }
    await deleteRecord(T.kpi_entry, id)
}

// --- Conventions financières ---

export async function getAgreementsByProject(projectId: number): Promise<(FinancialAgreement & { partner: Partner })[]> {
    const [agreements, partners] = await (USE_MOCK
        ? Promise.resolve([mockFinancialAgreements, mockPartners])
        : Promise.all([
            getFinancialAgreements(),
            getPartners(),
        ])
    )
    const partnerMap = new Map((partners as Partner[]).map(p => [p.id, p]))
    return (agreements as FinancialAgreement[])
        .filter(a => a.project_id === projectId)
        .map(a => ({ ...a, partner: partnerMap.get(a.partner_id)! }))
        .filter(a => a.partner)
}

export async function getAgreementsByProjectCall(projectCallId: number): Promise<(FinancialAgreement & { partner: Partner })[]> {
    const [agreements, projects, partners] = await (USE_MOCK
        ? Promise.resolve([mockFinancialAgreements, mockProjects, mockPartners])
        : Promise.all([
            getFinancialAgreements(),
            getProjects(),
            getPartners(),
        ])
    )
    const callProjectIds = new Set(
        (projects as Project[])
            .filter(p => p.project_call_id === projectCallId)
            .map(p => p.id)
    )
    const partnerMap = new Map((partners as Partner[]).map(p => [p.id, p]))
    return (agreements as FinancialAgreement[])
        .filter(a => callProjectIds.has(a.project_id))
        .map(a => ({ ...a, partner: partnerMap.get(a.partner_id)! }))
        .filter(a => a.partner)
}

export async function getAgreementMembers(agreementId: number): Promise<AgreementMember[]> {
    if (USE_MOCK) {
        return mockAgreementMembers.filter(am => am.agreement_id === agreementId)
    }
    const rows = await fetchTable(T.agreement_member)
    return normalizeAgreementMembers(rows).filter(am => am.agreement_id === agreementId)
}

export async function addAgreementMember(agreementId: number, memberId: number): Promise<AgreementMember> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockAgreementMembers.map(a => a.id)) + 1
        const newAgreementMember: AgreementMember = { id: newId, member_id: memberId, agreement_id: agreementId }
        mockAgreementMembers.push(newAgreementMember)
        return newAgreementMember
    }
    const id = await addRecord(T.agreement_member, { member_id: memberId, agreement_id: agreementId })
    return { id, member_id: memberId, agreement_id: agreementId }
}

export async function removeAgreementMember(id: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockAgreementMembers.findIndex(ma => ma.id === id)
        if (i !== -1) mockAgreementMembers.splice(i, 1)
        return
    }
    await deleteRecord(T.agreement_member, id)
}

export async function addAgreement(fields: Omit<FinancialAgreement, 'id'>): Promise<FinancialAgreement> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockFinancialAgreements.map(a => a.id)) + 1
        const agreement: FinancialAgreement = { id: newId, ...fields }
        mockFinancialAgreements.push(agreement)
        return agreement
    }
    const id = await addRecord(T.financial_agreement, fields)
    return { id, ...fields }
}

export async function updateAgreement(id: number, patch: Partial<Omit<FinancialAgreement, 'id'>>): Promise<void> {
    if (USE_MOCK) {
        const a = mockFinancialAgreements.find(a => a.id === id)
        if (a) Object.assign(a, patch)
        return
    }
    await updateRecord(T.financial_agreement, id, patch)
}

export async function deleteAgreement(id: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockFinancialAgreements.findIndex(a => a.id === id)
        if (i !== -1) mockFinancialAgreements.splice(i, 1)
        return
    }
    await deleteRecord(T.financial_agreement, id)
}

// --- Catégories ---

export async function createCategory(title: string, parentId: number | null, color?: string | null): Promise<Category> {
    if (USE_MOCK) {
        const newId = Math.max(...mockCategories.map(c => c.id)) + 1
        const cat: Category = { id: newId, parent_category_id: parentId, title, color: color ?? null }
        mockCategories.push(cat)
        return cat
    }
    const id = await addRecord(T.category, { title, parent_category_id: parentId ?? 0, color: color ?? '' })
    return { id, parent_category_id: parentId, title, color: color ?? null }
}

export async function updateCategory(id: number, patch: Partial<Pick<Category, 'title' | 'parent_category_id' | 'color'>>): Promise<void> {
    if (USE_MOCK) {
        const cat = mockCategories.find(c => c.id === id)
        if (cat) Object.assign(cat, patch)
        return
    }
    await updateRecord(T.category, id, patch)
}

// --- Catégorie "Autre" ---

export async function getOrCreateOtherCategory(): Promise<number> {
    if (USE_MOCK) {
        const existing = mockCategories.find(c => c.title === 'Autre')
        if (existing) return existing.id
        const newId = Math.max(...mockCategories.map(c => c.id)) + 1
        mockCategories.push({ id: newId, parent_category_id: null, title: 'Autre' })
        return newId
    }
    const cats = await getCategories()
    const existing = cats.find(c => c.title === 'Autre')
    if (existing) return existing.id
    return await addRecord(T.category, { title: 'Autre', parent_category_id: null })
}

export async function deleteCategory(id: number): Promise<void> {
    const autreId = await getOrCreateOtherCategory()

    if (USE_MOCK) {
        // Reassign action cards to "Autre"
        for (const card of mockActionCards) {
            if (card.category_id === id) card.category_id = autreId
        }
        // Promote child categories to root
        for (const cat of mockCategories) {
            if (cat.parent_category_id === id) cat.parent_category_id = null
        }
        const i = mockCategories.findIndex(c => c.id === id)
        if (i !== -1) mockCategories.splice(i, 1)
        return
    }

    const [allCards, allCats] = await Promise.all([
        fetchTable(T.action_card),
        getCategories(),
    ])

    // Reassign action cards to "Autre"
    const cardsToMove = allCards.filter(r => r.category_id === id)
    await Promise.all(cardsToMove.map(r => updateRecord(T.action_card, r.id as number, { category_id: autreId })))

    // Promote child categories to root
    const children = allCats.filter(c => c.parent_category_id === id)
    await Promise.all(children.map(c => updateRecord(T.category, c.id, { parent_category_id: 0 })))

    await deleteRecord(T.category, id)
}

// --- Mutations ---

// Formulaire de création d'une ActionCard complète
export type ActionCardCreateForm = {
    // Général
    title: string
    description: string
    start_date: string
    end_date: string
    // Classification
    status_id: number
    category_id: number
    axis_id: number | null
    // Personnes
    owner_id: number
    members: { member_id: number; role: string }[]
    // Projet
    project_id: number | null
    // To-do
    todo_title: string
    todo_items: string[]
    // Location
    full_address?: string
    lon?: number | null
    lat?: number | null
}

export async function createActionCardFull(form: ActionCardCreateForm): Promise<ActionCardFull> {
    if (USE_MOCK) {
        // En mode mock on pousse dans les tableaux en mémoire (reload = reset)
        const newId = Math.max(...mockActionCards.map(c => c.id)) + 1
        const card = {
            id: newId,
            owner_id: form.owner_id,
            category_id: form.category_id,
            status_id: form.status_id,
            title: form.title,
            color: '',
            description: form.description,
            start_date: form.start_date,
            end_date: form.end_date,
            full_address: form.full_address,
            lat: form.lat,
            lon: form.lon
        }
        mockActionCards.push(card)

        // Ajouter l'owner comme participant Responsable s'il n'est pas déjà dans la liste
        const allParticipants = form.members.some(m => m.member_id === form.owner_id)
            ? form.members
            : [{ member_id: form.owner_id, role: 'Responsable' }, ...form.members]
        const linkId = Math.max(0, ...mockMemberActionCards.map(l => l.id)) + 1
        allParticipants.forEach((m, i) => {
            mockMemberActionCards.push({ id: linkId + i, member_id: m.member_id, action_card_id: newId, role: m.role })
        })

        const statusMap = new Map(mockStatuses.map(s => [s.id, s]))
        const categoryMap = new Map(mockCategories.map(c => [c.id, c]))
        const memberMap = new Map(mockMembers.map(m => [m.id, m]))
        const category = categoryMap.get(form.category_id)!
        const parent = category.parent_category_id ? categoryMap.get(category.parent_category_id) ?? null : null

        return { ...card, status: statusMap.get(form.status_id)!, category: { ...category, parent }, owner: memberMap.get(form.owner_id)! }
    }

    // 1. Créer la carte principale
    const cardId = await addRecord(T.action_card, {
        title: form.title,
        description: form.description,
        start_date: form.start_date,
        end_date: form.end_date,
        status_id: form.status_id,
        category_id: form.category_id,
        owner_id: form.owner_id,
    })

    // 2. Lier les participants en parallèle avec les autres relations
    // L'owner est toujours ajouté comme Responsable s'il n'est pas déjà dans la liste
    const allParticipants = form.members.some(m => m.member_id === form.owner_id)
        ? form.members
        : [{ member_id: form.owner_id, role: 'Responsable' }, ...form.members]

    await Promise.all([
        addRecords(T.member_action_card, allParticipants.map(m => ({ member_id: m.member_id, action_card_id: cardId, role: m.role }))),
        form.project_id
            ? addRecord(T.project_action_card, { project_id: form.project_id, action_card_id: cardId })
            : Promise.resolve(0),
        form.axis_id
            ? addRecord(T.axis_action_card, { axis_id: form.axis_id, action_card_id: cardId })
            : Promise.resolve(0),
        (async () => {
            if (!form.todo_title && form.todo_items.length === 0) return
            const listId = await addRecord(T.to_do_list, { action_card_id: cardId, title: form.todo_title || 'To-do' })
            if (form.todo_items.length > 0) {
                await addRecords(T.to_do_item, form.todo_items.map(content => ({
                    list_id: listId, content, status_id: 8,
                })))
            }
        })(),
    ])

    // 3. Retourner la carte enrichie depuis l'API
    const full = await getActionCardsFull()
    return full.find(c => c.id === cardId)!
}

export async function updateActionCard(
    id: number,
    patch: Partial<Pick<ActionCard, 'category_id' | 'status_id' | 'owner_id' | 'title' | 'description' | 'color' | 'start_date' | 'end_date' | 'full_address' | 'lat' | 'lon'>>
): Promise<void> {
    if (USE_MOCK) return // pas de persistance en mode mock
    await updateRecord(T.action_card, id, patch)
}

export async function deleteActionCard(id: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockActionCards.findIndex(c => c.id === id)
        if (i !== -1) mockActionCards.splice(i, 1)
        return
    }
    await deleteRecord(T.action_card, id)
}

// --- Requête enrichie (jointures) ---

export async function getActionCardsFull(): Promise<ActionCardFull[]> {
    if (USE_MOCK) {
        const statusMap = new Map(mockStatuses.map(s => [s.id, s]))
        const categoryMap = new Map(mockCategories.map(c => [c.id, c]))
        const memberMap = new Map(mockMembers.map(m => [m.id, m]))

        return mockActionCards.map(card => ({
            ...card,
            status: statusMap.get(card.status_id)!,
            category: {
                ...categoryMap.get(card.category_id)!,
                parent: (() => {
                    const cat = categoryMap.get(card.category_id)
                    return cat?.parent_category_id ? categoryMap.get(cat.parent_category_id) ?? null : null
                })(),
            },
            owner: memberMap.get(card.owner_id)!,
        }))
    }

    const [rows, statuses, categories, members] = await Promise.all([
        fetchTable(T.action_card),
        getStatuses(),
        getCategories(),
        getMembers(),
    ])

    return normalizeActionCardsFull(rows, statuses, categories, members)
}

export async function getPartnerCardsFull(): Promise<PartnerCardFull[]> {
    if (USE_MOCK) {

        const membersByPartner = new Map<number, Member[]>()
        for (const m of mockMembers) {
            const existing = membersByPartner.get(m.partner_id) ?? []
            membersByPartner.set(m.partner_id, [...existing, m])
        }

        // Agreements — boucle sur mockFinancialAgreements
        const agreementsByPartner = new Map<number, FinancialAgreement[]>()
        for (const a of mockFinancialAgreements) {
            const existing = agreementsByPartner.get(a.partner_id) ?? []
            agreementsByPartner.set(a.partner_id, [...existing, a])
        }

        // Projects — déduits depuis les conventions (pas de partner_id direct)
        const projectsByPartner = new Map<number, Project[]>()
        for (const a of mockFinancialAgreements) {
            const project = mockProjects.find(p => p.id === a.project_id)
            if (!project) continue
            const existing = projectsByPartner.get(a.partner_id) ?? []
            // éviter les doublons si plusieurs conventions sur le même projet
            if (!existing.find(p => p.id === project.id)) {
                projectsByPartner.set(a.partner_id, [...existing, project])
            }
        }

        return mockPartners.map(partner => ({
            ...partner,
            members: membersByPartner.get(partner.id) ?? [],
            agreements: agreementsByPartner.get(partner.id) ?? [],
            projects: projectsByPartner.get(partner.id) ?? []

        }))
    }

    const [rows, financial_agreements, projects, members] = await Promise.all([
        fetchTable(T.partner),
        getFinancialAgreements(),
        getProjects(),
        getMembers(),
    ])

    return normalizePartnerCardsFull(rows, financial_agreements, projects, members)
}


// --- Jalons ---

export async function getProjectMilestones(projectId: number): Promise<ProjectMilestone[]> {
    if (USE_MOCK) return mockProjectMilestones.filter(m => m.project_id === projectId)
    return normalizeProjectMilestones(await fetchTable(T.project_milestone))
        .filter(m => m.project_id === projectId)
}

export async function getAllProjectMilestones(): Promise<ProjectMilestone[]> {
    if (USE_MOCK) return [...mockProjectMilestones]
    return normalizeProjectMilestones(await fetchTable(T.project_milestone))
}

export async function addProjectMilestone(projectId: number, fields: Omit<ProjectMilestone, 'id' | 'project_id'>): Promise<ProjectMilestone> {
    if (USE_MOCK) {
        const milestone: ProjectMilestone = {
            id: mockProjectMilestones.length + 1,
            project_id: projectId,
            ...fields,
        }
        mockProjectMilestones.push(milestone)
        return milestone
    }
    const id = await addRecord(T.project_milestone, { project_id: projectId, ...fields })
    return { id, project_id: projectId, ...fields }
}

export async function updateProjectMilestone(id: number, patch: Partial<Omit<ProjectMilestone, 'id' | 'project_id'>>): Promise<void> {
    if (USE_MOCK) {
        const m = mockProjectMilestones.find(m => m.id === id)
        if (m) Object.assign(m, patch)
        return
    }
    if (Object.keys(patch).length > 0) await updateRecord(T.project_milestone, id, patch)
}

export async function deleteProjectMilestone(id: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockProjectMilestones.findIndex(m => m.id === id)
        if (i !== -1) mockProjectMilestones.splice(i, 1)
        return
    }
    await deleteRecord(T.project_milestone, id)
}

// --- Formations ---

export async function getFormations(): Promise<Formation[]> {
    return USE_MOCK ? mockFormations : http.get<Formation[]>('/formations/')
}

export async function getProjectFormationLinks(projectId: number): Promise<ProjectFormation[]> {
    return USE_MOCK
        ? mockProjectFormations.filter(pf => pf.project_id === projectId)
        : normalizeProjectFormations(await fetchTable(T.project_formation)).filter(pf => pf.project_id === projectId)
}

export async function getFormationsByProject(projectId: number): Promise<Formation[]> {
    if (USE_MOCK) {
        const ids = mockProjectFormations.filter(pf => pf.project_id === projectId).map(pf => pf.formation_id)
        return mockFormations.filter(f => ids.includes(f.id))
    }
    const [links, formations] = await Promise.all([
        fetchTable(T.project_formation).then(normalizeProjectFormations),
        getFormations(),
    ])
    const ids = links.filter(pf => pf.project_id === projectId).map(pf => pf.formation_id)
    return formations.filter(f => ids.includes(f.id))
}

export async function addProjectFormation(projectId: number, formationId: number): Promise<ProjectFormation> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockProjectFormations.map(pf => pf.id)) + 1
        const link: ProjectFormation = { id: newId, project_id: projectId, formation_id: formationId }
        mockProjectFormations.push(link)
        return link
    }
    const id = await addRecord(T.project_formation, { project_id: projectId, formation_id: formationId })
    return { id, project_id: projectId, formation_id: formationId }
}

export async function removeProjectFormation(linkId: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockProjectFormations.findIndex(pf => pf.id === linkId)
        if (i !== -1) mockProjectFormations.splice(i, 1)
        return
    }
    await deleteRecord(T.project_formation, linkId)
}

// --- Pièces jointes ---

export async function getProjectAttachments(projectId: number): Promise<ProjectAttachment[]> {
    if (USE_MOCK) return mockProjectAttachments.filter(a => a.project_id === projectId)
    return normalizeProjectAttachments(await fetchTable(T.project_attachment)).filter(a => a.project_id === projectId)
}

export async function addProjectAttachment(projectId: number, label: string, url: string): Promise<ProjectAttachment> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockProjectAttachments.map(a => a.id)) + 1
        const attachment: ProjectAttachment = { id: newId, project_id: projectId, label, url }
        mockProjectAttachments.push(attachment)
        return attachment
    }
    const id = await addRecord(T.project_attachment, { project_id: projectId, label, url })
    return { id, project_id: projectId, label, url }
}

export async function deleteProjectAttachment(id: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockProjectAttachments.findIndex(a => a.id === id)
        if (i !== -1) mockProjectAttachments.splice(i, 1)
        return
    }
    await deleteRecord(T.project_attachment, id)
}

// --- Publications ---

export async function getPublicationsByProject(projectId: number): Promise<Publication[]> {
    if (USE_MOCK) return mockPublications.filter(p => p.project_id === projectId)
    const rows = await fetchTable(T.publication)
    return normalizePublications(rows).filter(p => p.project_id === projectId)
}

export async function addPublication(fields: Omit<Publication, 'id'>): Promise<Publication> {
    if (USE_MOCK) {
        const id = Math.max(0, ...mockPublications.map(p => p.id)) + 1
        const pub: Publication = { id, ...fields }
        mockPublications.push(pub)
        return pub
    }
    const id = await addRecord(T.publication, fields)
    return { id, ...fields }
}

export async function updatePublication(id: number, patch: Partial<Omit<Publication, 'id'>>): Promise<void> {
    if (USE_MOCK) {
        const i = mockPublications.findIndex(p => p.id === id)
        if (i !== -1) mockPublications[i] = { ...mockPublications[i], ...patch }
        return
    }
    await updateRecord(T.publication, id, patch)
}

export async function deletePublication(id: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockPublications.findIndex(p => p.id === id)
        if (i !== -1) mockPublications.splice(i, 1)
        return
    }
    await deleteRecord(T.publication, id)
}

// --- Publication members ---

export async function getPublicationMembersByProject(projectId: number): Promise<PublicationMember[]> {
    if (USE_MOCK) {
        const pubIds = new Set(mockPublications.filter(p => p.project_id === projectId).map(p => p.id))
        return mockPublicationMembers.filter(pm => pubIds.has(pm.publication_id))
    }
    const rows = await fetchTable(T.publication_member)
    return normalizePublicationMembers(rows)
}

export async function addPublicationMember(publicationId: number, memberId: number): Promise<PublicationMember> {
    if (USE_MOCK) {
        const id = Math.max(0, ...mockPublicationMembers.map(pm => pm.id)) + 1
        const pm: PublicationMember = { id, publication_id: publicationId, member_id: memberId }
        mockPublicationMembers.push(pm)
        return pm
    }
    const fields = { publication_id: publicationId, member_id: memberId }
    const id = await addRecord(T.publication_member, fields)
    return { id, ...fields }
}

export async function deletePublicationMember(id: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockPublicationMembers.findIndex(pm => pm.id === id)
        if (i !== -1) mockPublicationMembers.splice(i, 1)
        return
    }
    await deleteRecord(T.publication_member, id)
}
