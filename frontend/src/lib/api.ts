import * as http from '@/lib/client'
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
    mockOrganizations, mockProgram, mockExpanses, mockSuppliers, mockSifacLines,
    mockPublications, mockPublicationMembers,
} from '@/lib/mock'
import type {
    Status, Category, Member, Partner, Axis, Lab, PartnerLab, LabCardFull,
    ActionCard, ActionCardFull, PartnerCardFull, ProjectCall, Project,
    FinancialAgreement, Phd, MobilityGrant,
    Kpi, BudgetCategory, BudgetDetail,
    ToDoList, ToDoItem, MemberActionCard, AxisActionCard, ProjectActionCard, AgreementActionCard, MemberFull,
    Group, GroupMember, Comment, CommentFull, ProjectMember, AgreementMember,
    KpiEntry, ProjectPartner, ProjectMilestone,
    TimeEntry, Formation, ProjectFormation, ProjectAttachment,
    Organization,
    Invitation,
    InvitationPreview,
    OrgRole,
    Program,
    Expanse,
    SifacLine,
    Supplier,
    Publication,
    PublicationMember,
} from '@/lib/types'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

// --- Cloisonnement ---
// Les laboratoires du titulaire, pas ceux de l'installation : le backend réduit
// la liste à ses rattachements. C'est aussi la seule collection qui reste
// joignable quand aucun laboratoire n'est actif, sans quoi un compte affecté à
// plusieurs n'aurait aucun moyen d'en choisir un.
export async function getOrganizations(): Promise<Organization[]> {
    return USE_MOCK ? mockOrganizations : http.get<Organization[]>('/organizations/')
}

// Même forme que selectProgram, et pour les mêmes raisons — sauf que celui-ci
// efface aussi le programme côté serveur : il appartenait au laboratoire qu'on
// quitte. D'où l'absence de valeur de retour utile au-delà du laboratoire lui-
// même : le programme qui suivra, c'est fetchMe() qui l'apprendra.
export async function selectOrganization(id: number): Promise<Organization> {
    if (USE_MOCK) return mockOrganizations.find(o => o.id === id) as Organization
    return http.post<Organization>(`/organizations/${id}/select/`)
}

// --- Invitations ---
// Le seul chemin pour rejoindre un laboratoire existant ; l'inscription, elle,
// en crée toujours un neuf.
//
// Deux espaces de noms, et la frontière n'est pas cosmétique. Émettre et
// révoquer sont des gestes du laboratoire, donc cloisonnés comme le reste :
// `/invitations/`. Consulter et accepter se font sans laboratoire actif et
// souvent sans compte, exactement comme une connexion : `/auth/invitations/`.
// Le jeton y tient lieu d'identifiant — on ne peut pas offrir un `id` à
// quelqu'un qui ne voit encore aucune collection.
//
// Aucune branche mock ici, et c'est délibéré : en mode fictif `fetchMe()` rend
// un utilisateur d'emblée, il n'y a ni compte à créer ni laboratoire à
// rejoindre. Ces fonctions restent inatteignables, comme login() et signup().
export async function getInvitations(): Promise<Invitation[]> {
    return http.get<Invitation[]>('/invitations/')
}

// Le retour porte `token` et `accept_url`, que la liste ne redonnera jamais :
// l'appelant doit les présenter tout de suite, sans quoi l'invitation est créée
// et son lien perdu.
//
// `program_id` est obligatoire ici alors que la colonne est nullable : le
// sérialiseur l'exige, parce qu'une invitation sans affectation produit un
// compte rattaché au laboratoire et bloqué sur un sélecteur de programme vide.
// `member_id` reste facultatif : sans lui, la fiche annuaire naît à
// l'acceptation.
export async function createInvitation(payload: {
    email: string
    program_id: number
    member_id?: number | null
    role?: OrgRole
    first_name?: string
    last_name?: string
}): Promise<Invitation> {
    return http.post<Invitation>('/invitations/', payload)
}

export async function revokeInvitation(id: number): Promise<void> {
    return http.del(`/invitations/${id}/`)
}

export async function fetchInvitation(token: string): Promise<InvitationPreview> {
    return http.get<InvitationPreview>(`/auth/invitations/${token}/`)
}

// Le mot de passe vaut création de compte si l'adresse est libre,
// authentification sinon, et n'est pas demandé du tout pour une session déjà
// ouverte au bon nom. C'est le serveur qui tranche, pas l'appelant.
export async function acceptInvitation(
    token: string,
    payload: { password?: string; first_name?: string; last_name?: string },
): Promise<void> {
    await http.post(`/auth/invitations/${token}/accept/`, payload)
}

// --- Tables de référence ---
export async function getProgram(): Promise<Program[]> { return USE_MOCK ? mockProgram : http.get<Program[]>('/programs/') }

// Le programme actif vit dans la session Django, pas dans l'état React : la
// sélection est donc une écriture, et non un simple changement d'écran. Le
// backend rend le programme choisi, ce qui évite d'aller le rechercher dans la
// liste — et surtout de faire confiance à une liste que la réponse contredirait.
export async function selectProgram(id: number): Promise<Program> {
    if (USE_MOCK) return mockProgram.find(p => p.id === id) as Program
    return http.post<Program>(`/programs/${id}/select/`)
}

export async function updateProgram(id: number, patch: Partial<Omit<Program, 'id'>>): Promise<void> {
    if (USE_MOCK) {
        const p = mockProgram.find(p => p.id === id)
        if (p) Object.assign(p, patch)
        return
    }
    await http.patch(`/programs/${id}/`, patch)
}
export async function getStatuses(): Promise<Status[]> { return USE_MOCK ? mockStatuses : http.get<Status[]>('/statuses/') }
export async function getCategories(): Promise<Category[]> { return USE_MOCK ? mockCategories : http.get<Category[]>('/categories/') }
export async function getMembers(): Promise<Member[]> { return USE_MOCK ? mockMembers : http.get<Member[]>('/members/') }
export async function getGroups(): Promise<Group[]> { return USE_MOCK ? mockGroup : http.get<Group[]>('/groups/') }
export async function getGroupMembers(): Promise<GroupMember[]> { return USE_MOCK ? mockGroupMember : http.get<GroupMember[]>('/group-members/') }
export async function getPartners(): Promise<Partner[]> { return USE_MOCK ? mockPartners : http.get<Partner[]>('/partners/') }
export async function getAxes(): Promise<Axis[]> { return USE_MOCK ? mockAxes : http.get<Axis[]>('/axes/') }
export async function getLabs(): Promise<Lab[]> { return USE_MOCK ? mockLabs : http.get<Lab[]>('/labs/') }
export async function getPartnerLabs(): Promise<PartnerLab[]> { return USE_MOCK ? mockPartnerLabs : http.get<PartnerLab[]>('/partner-labs/') }

// Budget & expanses
export async function getExpanses(): Promise<Expanse[]> { return USE_MOCK ? mockExpanses : http.get<Expanse[]>('/expanses/') }
// Le sérialiseur DRF rend déjà des types JSON exacts, et l'organisation est
// appliquée côté serveur — le client ne la voit ni ne l'envoie.
export async function getSupliers(): Promise<Supplier[]> { return USE_MOCK ? mockSuppliers : http.get<Supplier[]>('/suppliers/') }
export async function getSifacLines(): Promise<SifacLine[]> { return USE_MOCK ? mockSifacLines : http.get<SifacLine[]>('/sifac-lines/') }


// Expanses
export async function createExpanse(data: Omit<Expanse, 'id'>): Promise<Expanse> {
    if (USE_MOCK) {
        const id = Math.max(0, ...mockExpanses.map(e => e.id)) + 1
        const expanse = { id, ...data }
        mockExpanses.push(expanse)
        return expanse
    }
    return http.post<Expanse>('/expanses/', data)
}

export async function deleteExpanse(expanseId: number): Promise<void> {
    if (USE_MOCK) {
        const idx = mockExpanses.findIndex(e => e.id === expanseId)
        if (idx !== -1) {
            mockExpanses.splice(idx, 1)
        }
        return
    }
    await http.del(`/expanses/${expanseId}/`)
}

export async function updateExpanse(id: number, patch: Partial<Expanse>): Promise<void> {
    if (USE_MOCK) {
        const i = mockExpanses.findIndex(e => e.id === id)
        if (i !== -1) mockExpanses[i] = { ...mockExpanses[i], ...patch }
        return
    }
    await http.patch(`/expanses/${id}/`, patch)
}

// ─── Import SIFAC ───────────────────────────────────────────────────────────
// Toute la chaîne (lecture du fichier, agrégation, réconciliation, écriture)
// vit côté Django, dans `backend/sifac/`. Ce qui restait ici — parse, aggregate,
// reconcile, et les deux écritures en lot qui passaient encore par Grist — a
// disparu avec elle.
//
// L'import se fait en deux temps parce que l'exercice ne figure pas dans
// l'export : il doit être proposé, puis confirmé par l'utilisateur avant
// d'écraser un périmètre.

// Une dépense SIFAC dont le flux a disparu de l'export n'est pas supprimée : elle
// porte peut-être un rattachement budgétaire à conserver. On la signale, l'arbitrage
// revient à l'utilisateur. Le serveur pose ce statut ; la constante reste ici parce
// que l'écran d'import l'affiche dans son compte rendu.
export const ORPHAN_STATUS = 'Orpheline'

export type SifacPreview = {
    pfi: string
    exercice: number
    line_count: number
    flux_count: number
}

export type ImportSummary = SifacPreview & {
    created: number
    updated: number
    orphaned: number
}

// Le mode mock n'a pas de second temps possible : l'import n'est plus une
// transformation locale de tableaux mais un aller-retour serveur. Échouer
// franchement vaut mieux qu'un compte rendu fabriqué qui laisserait croire que
// quelque chose a été écrit.
const MOCK_IMPORT_ERROR =
    "L'import SIFAC demande le serveur Django : indisponible en mode mock."

function sifacForm(file: File, exercice?: number): FormData {
    const form = new FormData()
    form.append('file', file)
    if (exercice !== undefined) form.append('exercice', String(exercice))
    return form
}

// Premier temps : le serveur lit le fichier sans rien écrire et propose un
// exercice.
export async function sifacPreview(file: File): Promise<SifacPreview> {
    if (USE_MOCK) throw new Error(MOCK_IMPORT_ERROR)
    return http.post<SifacPreview>('/sifac/preview/', sifacForm(file))
}

// Second temps : le fichier est renvoyé plutôt que gardé en cache côté serveur.
// L'import est ainsi sans état — pas d'entrée orpheline si l'utilisateur
// abandonne, pas de péremption à gérer. Le coût est une seconde lecture.
export async function sifacImport(file: File, exercice: number): Promise<ImportSummary> {
    if (USE_MOCK) throw new Error(MOCK_IMPORT_ERROR)
    return http.post<ImportSummary>('/sifac/import/', sifacForm(file, exercice))
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
    return http.post<BudgetCategory>('/budget-categories/', data)
}

export async function updateBudgetCategory(id: number, patch: Partial<BudgetCategory>): Promise<void> {
    if (USE_MOCK) {
        const i = mockBudgetCategories.findIndex(c => c.id === id)
        if (i !== -1) mockBudgetCategories[i] = { ...mockBudgetCategories[i], ...patch }
        return
    }
    await http.patch(`/budget-categories/${id}/`, patch)
}

export async function deleteBudgetCategory(catId: number): Promise<void> {
    if (USE_MOCK) {
        const idx = mockBudgetCategories.findIndex(c => c.id === catId)
        if (idx !== -1) mockBudgetCategories.splice(idx, 1)
        return
    }
    await http.del(`/budget-categories/${catId}/`)
}

// budgetDetails CRUD
export async function createBudgetDetail(data: Omit<BudgetDetail, 'id'>): Promise<BudgetDetail> {
    if (USE_MOCK) {
        const id = Math.max(0, ...mockBudgetDetails.map(e => e.id)) + 1
        const detail = { id, ...data }
        mockBudgetDetails.push(detail)
        return detail
    }
    return http.post<BudgetDetail>('/budget-details/', data)
}

export async function deleteBudgetDetail(detailId: number): Promise<void> {
    if (USE_MOCK) {
        const idx = mockBudgetDetails.findIndex(d => d.id === detailId)
        if (idx !== -1) mockBudgetDetails.splice(idx, 1)
        return
    }
    await http.del(`/budget-details/${detailId}/`)
}

export async function updateBudgetDetail(id: number, patch: Partial<BudgetDetail>): Promise<void> {
    if (USE_MOCK) {
        const i = mockBudgetDetails.findIndex(d => d.id === id)
        if (i !== -1) mockBudgetDetails[i] = { ...mockBudgetDetails[i], ...patch }
        return
    }
    await http.patch(`/budget-details/${id}/`, patch)
}

// --- Cœur du système ---

export async function getActionCards(): Promise<ActionCard[]> { return USE_MOCK ? mockActionCards : http.get<ActionCard[]>('/action-cards/') }
export async function getComments(): Promise<Comment[]> { return USE_MOCK ? mockComments : http.get<Comment[]>('/comments/') }

// L'arborescence des réponses se monte ici, et non plus dans normalize.ts : ce
// n'est pas une normalisation mais une jointure, et elle n'a aucune raison de
// vivre ailleurs que dans la fonction qui la sert.
function buildCommentTree(comments: Comment[], members: Member[]): CommentFull[] {
    const memberMap = new Map(members.map(m => [m.id, m]))
    const map = new Map<number, CommentFull>()
    for (const c of comments) {
        map.set(c.id, { ...c, owner: memberMap.get(c.owner_id ?? -1)!, replies: [] })
    }
    const roots: CommentFull[] = []
    for (const c of map.values()) {
        if (c.parent_comment_id) map.get(c.parent_comment_id)?.replies?.push(c)
        else roots.push(c)
    }
    return roots.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export async function getCommentsFull(cardId: number): Promise<CommentFull[]> {
    if (USE_MOCK) {
        return buildCommentTree(mockComments.filter(c => c.action_card_id === cardId), mockMembers)
    }
    const [comments, members] = await Promise.all([
        http.get<Comment[]>(`/comments/?action_card_id=${cardId}`),
        getMembers(),
    ])
    return buildCommentTree(comments, members)
}

export async function createComment(data: Omit<Comment, 'id'>): Promise<Comment> {
    if (USE_MOCK) {
        const id = Math.max(0, ...mockComments.map(c => c.id)) + 1
        const comment = { id, ...data }
        mockComments.push(comment)
        return comment
    }
    return http.post<Comment>('/comments/', data)
}

export async function updateComment(id: number, patch: Partial<Comment>): Promise<void> {
    if (USE_MOCK) {
        const i = mockComments.findIndex(c => c.id === id)
        if (i !== -1) mockComments[i] = { ...mockComments[i], ...patch }
        return
    }
    await http.patch(`/comments/${id}/`, patch)
}

export async function deleteComment(id: number): Promise<void> {
    if (USE_MOCK) {
        const idx = mockComments.findIndex(c => c.id === id)
        if (idx !== -1) mockComments.splice(idx, 1)
        return
    }
    await http.del(`/comments/${id}/`)
}
export async function getProjectCalls(): Promise<ProjectCall[]> { return USE_MOCK ? mockProjectCalls : http.get<ProjectCall[]>('/project-calls/') }
export async function getProjects(): Promise<Project[]> { return USE_MOCK ? mockProjects : http.get<Project[]>('/projects/') }
export async function getFinancialAgreements(): Promise<FinancialAgreement[]> { return USE_MOCK ? mockFinancialAgreements : http.get<FinancialAgreement[]>('/agreements/') }
export async function getPhds(): Promise<Phd[]> { return USE_MOCK ? mockPhds : http.get<Phd[]>('/phds/') }
export async function getMobilityGrants(): Promise<MobilityGrant[]> { return USE_MOCK ? mockMobilityGrants : http.get<MobilityGrant[]>('/mobility-grants/') }
export async function getProjectPartners(): Promise<ProjectPartner[]> { return USE_MOCK ? mockProjectPartners : http.get<ProjectPartner[]>('/project-partners/') }

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

    return http.post<ProjectPartner>('/project-partners/', {
        project_id: projectId, partner_id: partnerId, role, amount, label,
    })
}

export async function removeProjectPartner(recordId: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockProjectPartners.findIndex(i => i.id === recordId)
        if (i !== -1) {
            mockProjectPartners.splice(i, 1)
        }
        return
    }
    await http.del(`/project-partners/${recordId}/`)
}


export async function updateProjectPartner(id: number, patch: Partial<Omit<ProjectPartner, 'id'>>): Promise<void> {
    if (USE_MOCK) {
        const pp = mockProjectPartners.find(p => p.id === id)
        if (pp) Object.assign(pp, patch)
        return
    }
    if (Object.keys(patch).length > 0) await http.patch(`/project-partners/${id}/`, patch)
}

// --- Budget & indicateurs ---

export async function getKpis(): Promise<Kpi[]> { return USE_MOCK ? mockKpis : http.get<Kpi[]>('/kpis/') }
export async function getBudgetCategories(): Promise<BudgetCategory[]> { return USE_MOCK ? [...mockBudgetCategories] : http.get<BudgetCategory[]>('/budget-categories/') }
export async function getBudgetDetails(): Promise<BudgetDetail[]> { return USE_MOCK ? [...mockBudgetDetails] : http.get<BudgetDetail[]>('/budget-details/') }

// --- To-do ---

export async function getToDoLists(): Promise<ToDoList[]> { return USE_MOCK ? mockToDoLists : http.get<ToDoList[]>('/todo-lists/') }
export async function getToDoItems(): Promise<ToDoItem[]> { return USE_MOCK ? mockToDoItems : http.get<ToDoItem[]>('/todo-items/') }

// --- Liens globaux (pour les filtres du kanban) ---

export async function getAllAxisActionCards(): Promise<AxisActionCard[]> {
    return USE_MOCK ? [...mockAxisActionCards] : http.get<AxisActionCard[]>('/axis-action-cards/')
}

export async function getAllMemberActionCards(): Promise<MemberActionCard[]> {
    return USE_MOCK ? [...mockMemberActionCards] : http.get<MemberActionCard[]>('/member-action-cards/')
}

// --- Jointures par carte ---

export async function getMemberActionCardsByCard(cardId: number): Promise<(MemberActionCard & { member: Member })[]> {
    // `?action_card_id=` : le tri se fait côté serveur, la table de liaison
    // entière ne descend plus pour n'en garder qu'une poignée de lignes.
    const [links, members] = await (USE_MOCK
        ? Promise.resolve([
            mockMemberActionCards.filter(m => m.action_card_id === cardId),
            mockMembers,
        ])
        : Promise.all([
            http.get<MemberActionCard[]>(`/member-action-cards/?action_card_id=${cardId}`),
            getMembers(),
        ])
    )
    const memberMap = new Map((members as Member[]).map(m => [m.id, m]))
    return (links as MemberActionCard[])
        .map(l => ({ ...l, member: memberMap.get(l.member_id)! }))
        .filter(l => l.member)
}

export async function getActionCardsByProject(projectId: number): Promise<(ActionCardFull & { linkId: number })[]> {
    const [links, cards] = await Promise.all([
        USE_MOCK
            ? Promise.resolve(mockProjectActionCards.filter(l => l.project_id === projectId))
            : http.get<ProjectActionCard[]>(`/project-action-cards/?project_id=${projectId}`),
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
    const link = await http.post<ProjectActionCard>('/project-action-cards/', { project_id: projectId, action_card_id: cardId })
    return link.id
}

export async function updateProjectMember(id: number, role: string): Promise<void> {
    if (USE_MOCK) {
        const pm = mockProjectMembers.find(m => m.id === id)
        if (pm) pm.role = role
        return
    }
    await http.patch(`/project-members/${id}/`, { role })
}

export async function updateProjectMemberParticipationStatus(id: number, participation_status_id: number | null): Promise<void> {
    if (USE_MOCK) {
        const pm = mockProjectMembers.find(m => m.id === id)
        if (pm) pm.participation_status_id = participation_status_id
        return
    }
    await http.patch(`/project-members/${id}/`, { participation_status_id })
}

// Declaration des temps

export async function getTimeEntries(): Promise<TimeEntry[]> { return USE_MOCK ? mockTimeEntry : http.get<TimeEntry[]>('/time-entries/') }

export async function addTimeEntry(projectId: number, memberId: number, days: number, start_date: string, end_date: string): Promise<TimeEntry> {
    const fields = { project_id: projectId, member_id: memberId, days, start_date, end_date }
    if (USE_MOCK) {
        const entry: TimeEntry = { id: Math.max(0, ...mockTimeEntry.map(e => e.id)) + 1, ...fields }
        mockTimeEntry.push(entry)
        return entry
    }
    return http.post<TimeEntry>('/time-entries/', fields)
}

export async function removeTimeEntry(entryId: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockTimeEntry.findIndex(m => m.id === entryId)
        if (i !== -1) mockTimeEntry.splice(i, 1)
        return
    }
    await http.del(`/time-entries/${entryId}/`)
}

export async function updateTimeEntry(entryId: number, patch: Partial<Omit<TimeEntry, 'id'>>): Promise<void> {
    if (USE_MOCK) {
        const entry = mockTimeEntry.find(m => m.id === entryId)
        if (entry) Object.assign(entry, patch)
        return
    }
    if (Object.keys(patch).length > 0) await http.patch(`/time-entries/${entryId}/`, patch)
}

export async function getProjectActionCardsByCard(cardId: number): Promise<(ProjectActionCard & { project: Project })[]> {
    const [links, projects] = await (USE_MOCK
        ? Promise.resolve([
            mockProjectActionCards.filter(p => p.action_card_id === cardId),
            mockProjects,
        ])
        : Promise.all([
            http.get<ProjectActionCard[]>(`/project-action-cards/?action_card_id=${cardId}`),
            getProjects(),
        ])
    )
    const projectMap = new Map((projects as Project[]).map(p => [p.id, p]))
    return (links as ProjectActionCard[])
        .map(l => ({ ...l, project: projectMap.get(l.project_id)! }))
        .filter(l => l.project)
}

export async function getToDoListsWithItemsByCard(cardId: number): Promise<(ToDoList & { items: ToDoItem[] })[]> {
    if (USE_MOCK) {
        const lists = mockToDoLists.filter(l => l.action_card_id === cardId)
        return lists.map(l => ({ ...l, items: mockToDoItems.filter(i => i.list_id === l.id) }))
    }
    // Les listes sont filtrées côté serveur, les items ne peuvent pas l'être :
    // `ToDoItem` porte sa liste, pas la carte. Il faut donc connaître les
    // listes avant de demander leurs items — deux allers-retours, en séquence.
    const lists = await http.get<ToDoList[]>(`/todo-lists/?action_card_id=${cardId}`)
    const items = await Promise.all(
        lists.map(l => http.get<ToDoItem[]>(`/todo-items/?list_id=${l.id}`))
    )
    return lists.map((l, i) => ({ ...l, items: items[i] }))
}

// --- Mutations sur les éléments d'une ActionCard ---

export async function updateToDoItem(id: number, patch: Partial<Pick<ToDoItem, 'content' | 'status_id' | 'start_date' | 'end_time' | 'due_date'>>): Promise<void> {
    if (USE_MOCK) {
        const item = mockToDoItems.find(i => i.id === id)
        if (item) Object.assign(item, patch)
        return
    }
    await http.patch(`/todo-items/${id}/`, patch)
}

export async function addToDoItemToList(listId: number, content: string, due_date = ''): Promise<ToDoItem> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockToDoItems.map(i => i.id)) + 1
        const item: ToDoItem = { id: newId, list_id: listId, content, status_id: 8, start_date: '', end_time: '', due_date }
        mockToDoItems.push(item)
        return item
    }
    // `due_date` n'est posée que si elle est renseignée : `''` n'est pas une
    // date pour Django, qui rendrait 400 là où Grist acceptait la chaîne vide.
    const fields: Record<string, unknown> = { list_id: listId, content, status_id: 8 }
    if (due_date) fields.due_date = due_date
    return http.post<ToDoItem>('/todo-items/', fields)
}

export async function addToDoListToCard(cardId: number, title: string): Promise<ToDoList & { items: ToDoItem[] }> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockToDoLists.map(l => l.id)) + 1
        const list: ToDoList = { id: newId, action_card_id: cardId, title }
        mockToDoLists.push(list)
        return { ...list, items: [] }
    }
    const list = await http.post<ToDoList>('/todo-lists/', { action_card_id: cardId, title })
    return { ...list, items: [] }
}

export async function updateToDoList(listId: number, title: string): Promise<void> {
    if (USE_MOCK) {
        const list = mockToDoLists.find(l => l.id === listId)
        if (list) list.title = title
        return
    }
    await http.patch(`/todo-lists/${listId}/`, { title })
}

export async function deleteToDoList(listId: number): Promise<void> {
    if (USE_MOCK) {
        const idx = mockToDoLists.findIndex(l => l.id === listId)
        if (idx !== -1) mockToDoLists.splice(idx, 1)
        const itemIds = mockToDoItems.filter(i => i.list_id === listId).map(i => i.id)
        itemIds.forEach(id => { const i = mockToDoItems.findIndex(x => x.id === id); if (i !== -1) mockToDoItems.splice(i, 1) })
        return
    }
    // Les items suivent : `ToDoItem.todo_list` est en CASCADE côté Django.
    await http.del(`/todo-lists/${listId}/`)
}

export async function addMemberToCard(cardId: number, memberId: number, role: string): Promise<MemberActionCard & { member: Member }> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockMemberActionCards.map(m => m.id)) + 1
        const link: MemberActionCard = { id: newId, member_id: memberId, action_card_id: cardId, role }
        mockMemberActionCards.push(link)
        return { ...link, member: mockMembers.find(m => m.id === memberId)! }
    }
    // Le membre est relu à l'unité : `/members/<id>/` plutôt que la table
    // entière filtrée en mémoire, comme le faisait la version Grist.
    const [link, member] = await Promise.all([
        http.post<MemberActionCard>('/member-action-cards/', { member_id: memberId, action_card_id: cardId, role }),
        http.get<Member>(`/members/${memberId}/`),
    ])
    return { ...link, member }
}

export async function removeMemberFromCard(linkId: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockMemberActionCards.findIndex(m => m.id === linkId)
        if (i !== -1) mockMemberActionCards.splice(i, 1)
        return
    }
    await http.del(`/member-action-cards/${linkId}/`)
}

export async function updateMemberRole(linkId: number, role: string): Promise<void> {
    if (USE_MOCK) {
        const link = mockMemberActionCards.find(l => l.id === linkId)
        if (link) link.role = role
        return
    }
    await http.patch(`/member-action-cards/${linkId}/`, { role })
}

export async function updateParticipationStatus(linkId: number, participation_status_id: number | null): Promise<void> {
    if (USE_MOCK) {
        const link = mockMemberActionCards.find(l => l.id === linkId)
        if (link) link.participation_status_id = participation_status_id
        return
    }
    await http.patch(`/member-action-cards/${linkId}/`, { participation_status_id })
}

export async function addProjectToCard(cardId: number, projectId: number): Promise<ProjectActionCard & { project: Project }> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockProjectActionCards.map(p => p.id)) + 1
        const link: ProjectActionCard = { id: newId, project_id: projectId, action_card_id: cardId }
        mockProjectActionCards.push(link)
        return { ...link, project: mockProjects.find(p => p.id === projectId)! }
    }
    const [link, project] = await Promise.all([
        http.post<ProjectActionCard>('/project-action-cards/', { project_id: projectId, action_card_id: cardId }),
        http.get<Project>(`/projects/${projectId}/`),
    ])
    return { ...link, project }
}

export async function removeProjectFromCard(linkId: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockProjectActionCards.findIndex(p => p.id === linkId)
        if (i !== -1) mockProjectActionCards.splice(i, 1)
        return
    }
    await http.del(`/project-action-cards/${linkId}/`)
}

// `userId` ne sert plus qu'au mode mock. Côté Django le propriétaire est posé
// par `GroupViewSet.get_create_kwargs()` à partir du membre authentifié, et
// `owner_id` est en lecture seule dans le sérialiseur : l'envoyer n'aurait
// aucun effet. On rend la réponse du serveur, qui porte le vrai propriétaire —
// l'ancienne version reconstruisait l'objet à la main et perdait l'owner, qui
// n'était jamais persisté.
export async function addGroup(name: string, userId: number | null): Promise<Group> {
    if (USE_MOCK) {
        const id = Math.max(0, ...mockGroup.map(g => g.id)) + 1
        const group: Group = { id, name, owner_id: userId }
        mockGroup.push(group)
        return group
    }
    return http.post<Group>('/groups/', { name })
}

export async function deleteGroup(id: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockGroup.findIndex(g => g.id === id)
        if (i !== -1) mockGroup.splice(i, 1)
        return
    }
    await http.del(`/groups/${id}/`)
}

export async function addMemberToGroup(memberId: number, groupId: number): Promise<GroupMember> {
    if (USE_MOCK) {
        const id = Math.max(0, ...mockGroupMember.map(g => g.id)) + 1
        const link: GroupMember = { id, member_id: memberId, group_id: groupId }
        mockGroupMember.push(link)
        return link
    }
    return http.post<GroupMember>('/group-members/', { member_id: memberId, group_id: groupId })
}

export async function removeMemberFromGroup(linkId: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockGroupMember.findIndex(g => g.id === linkId)
        if (i !== -1) mockGroupMember.splice(i, 1)
        return
    }
    await http.del(`/group-members/${linkId}/`)
}

// Ces deux fonctions traversaient la table de liaison en mémoire, après avoir
// rapatrié les deux tables. Les filtres `?group_id=` / `?member_id=` déclarés
// sur MemberViewSet et GroupViewSet font la traversée en SQL : une requête,
// et rien d'autre que le résultat sur le réseau.
export async function getMembersByGroup(groupId: number): Promise<Member[]> {
    if (USE_MOCK) {
        const memberIds = mockGroupMember.filter(l => l.group_id === groupId).map(l => l.member_id)
        return mockMembers.filter(m => memberIds.includes(m.id))
    }
    return http.get<Member[]>(`/members/?group_id=${groupId}`)
}

// Renvoie les groupes d'un membre spécifique
export async function getGroupsByMember(memberId: number): Promise<Group[]> {
    if (USE_MOCK) {
        const groupIds = mockGroupMember.filter(l => l.member_id === memberId).map(l => l.group_id)
        return mockGroup.filter(g => groupIds.includes(g.id))
    }
    return http.get<Group[]>(`/groups/?member_id=${memberId}`)
}

export async function getAgreementActionCardsByCard(cardId: number): Promise<(AgreementActionCard & { agreement: FinancialAgreement })[]> {
    const [links, agreements] = await (USE_MOCK
        ? Promise.resolve([
            mockAgreementActionCards.filter(a => a.action_card_id === cardId),
            mockFinancialAgreements,
        ])
        : Promise.all([
            http.get<AgreementActionCard[]>(`/agreement-action-cards/?action_card_id=${cardId}`),
            getFinancialAgreements(),
        ])
    )
    const agreementMap = new Map((agreements as FinancialAgreement[]).map(a => [a.id, a]))
    return (links as AgreementActionCard[])
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
    const [link, agreement] = await Promise.all([
        http.post<AgreementActionCard>('/agreement-action-cards/', { financial_agreement_id: agreementId, action_card_id: cardId }),
        http.get<FinancialAgreement>(`/agreements/${agreementId}/`),
    ])
    return { ...link, agreement }
}

export async function removeAgreementFromCard(linkId: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockAgreementActionCards.findIndex(a => a.id === linkId)
        if (i !== -1) mockAgreementActionCards.splice(i, 1)
        return
    }
    await http.del(`/agreement-action-cards/${linkId}/`)
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
        partner: m.partner_id === null ? null : partnerMap.get(m.partner_id) ?? null,
        lab: m.lab_id === null ? null : labMap.get(m.lab_id) ?? null,
    }))
}

export async function getLabCardsFull(): Promise<LabCardFull[]> {
    const [labs, partnerLabs, partners, members] = await (USE_MOCK
        ? Promise.resolve([mockLabs, mockPartnerLabs, mockPartners, mockMembers])
        : Promise.all([getLabs(), getPartnerLabs(), getPartners(), getMembers()])
    )

    const partnerMap = new Map((partners as Partner[]).map(p => [p.id, p]))
    const partnersByLab = new Map<number, Partner[]>()
    for (const pl of partnerLabs as PartnerLab[]) {
        const partner = partnerMap.get(pl.partner_id)
        if (partner) partnersByLab.set(pl.lab_id, [...(partnersByLab.get(pl.lab_id) ?? []), partner])
    }

    const membersByLab = new Map<number, Member[]>()
    for (const m of members as Member[]) {
        if (m.lab_id === null) continue
        membersByLab.set(m.lab_id, [...(membersByLab.get(m.lab_id) ?? []), m])
    }

    return (labs as Lab[]).map(lab => ({
        ...lab,
        partners: partnersByLab.get(lab.id) ?? [],
        members: membersByLab.get(lab.id) ?? [],
    }))
}

export async function addMember(fields: Omit<Member, 'id'>): Promise<Member> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockMembers.map(m => m.id)) + 1
        const member: Member = { id: newId, ...fields }
        mockMembers.push(member)
        return member
    }
    // Symétrique de `updateMember` : une écriture au lieu de trois. Le
    // découpage `lab_id` / `is_staff` en écritures séparées avec try/catch
    // contournait des colonnes absentes de certains documents Grist ; le
    // schéma Django les garantit.
    return http.post<Member>('/members/', fields)
}

export async function updateMember(id: number, patch: Partial<Omit<Member, 'id'>>): Promise<void> {
    if (USE_MOCK) {
        const m = mockMembers.find(m => m.id === id)
        if (m) Object.assign(m, patch)
        return
    }
    // Une écriture au lieu de trois, et deux try/catch en moins : le découpage
    // servait à survivre aux colonnes `lab_id` et `is_staff` absentes de
    // certains documents Grist. Le schéma Django les garantit.
    await http.patch(`/members/${id}/`, patch)
}

export async function deleteMember(id: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockMembers.findIndex(m => m.id === id)
        if (i !== -1) mockMembers.splice(i, 1)
        return
    }
    await http.del(`/members/${id}/`)
}

// --- Partenaires ---

export async function addPartner(fields: Omit<Partner, 'id'>): Promise<Partner> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockPartners.map(p => p.id)) + 1
        const partner: Partner = { id: newId, ...fields }
        mockPartners.push(partner)
        return partner
    }
    return http.post<Partner>('/partners/', fields)
}

export async function updatePartner(id: number, patch: Partial<Omit<Partner, 'id'>>): Promise<void> {
    if (USE_MOCK) {
        const p = mockPartners.find(p => p.id === id)
        if (p) Object.assign(p, patch)
        return
    }
    await http.patch(`/partners/${id}/`, patch)
}

export async function deletePartner(id: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockPartners.findIndex(p => p.id === id)
        if (i !== -1) mockPartners.splice(i, 1)
        return
    }
    await http.del(`/partners/${id}/`)
}

// --- Laboratoires ---

export async function addLab(fields: Omit<Lab, 'id'>): Promise<Lab> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockLabs.map(l => l.id)) + 1
        const lab: Lab = { id: newId, ...fields }
        mockLabs.push(lab)
        return lab
    }
    return http.post<Lab>('/labs/', fields)
}

export async function updateLab(id: number, patch: Partial<Omit<Lab, 'id'>>): Promise<void> {
    if (USE_MOCK) {
        const l = mockLabs.find(l => l.id === id)
        if (l) Object.assign(l, patch)
        return
    }
    await http.patch(`/labs/${id}/`, patch)
}

export async function deleteLab(id: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockLabs.findIndex(l => l.id === id)
        if (i !== -1) mockLabs.splice(i, 1)
        return
    }
    await http.del(`/labs/${id}/`)
}

export async function addPartnerToLab(labId: number, partnerId: number): Promise<PartnerLab> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockPartnerLabs.map(pl => pl.id)) + 1
        const link: PartnerLab = { id: newId, lab_id: labId, partner_id: partnerId }
        mockPartnerLabs.push(link)
        return link
    }
    return http.post<PartnerLab>('/partner-labs/', { lab_id: labId, partner_id: partnerId })
}

export async function removePartnerFromLab(linkId: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockPartnerLabs.findIndex(pl => pl.id === linkId)
        if (i !== -1) mockPartnerLabs.splice(i, 1)
        return
    }
    await http.del(`/partner-labs/${linkId}/`)
}

export async function attachMemberToLab(memberId: number, labId: number): Promise<void> {
    if (USE_MOCK) {
        const m = mockMembers.find(m => m.id === memberId)
        if (m) m.lab_id = labId
        return
    }
    await http.patch(`/members/${memberId}/`, { lab_id: labId })
}

export async function detachMemberFromLab(memberId: number): Promise<void> {
    if (USE_MOCK) {
        const m = mockMembers.find(m => m.id === memberId)
        if (m) m.lab_id = 0
        return
    }
    // `null` et non `0` : côté Django une référence vide est nulle, et `0` ne
    // désigne aucune ligne — la requête partirait en 400.
    await http.patch(`/members/${memberId}/`, { lab_id: null })
}

// --- Appels à projets ---

export async function addProjectCall(fields: Omit<ProjectCall, 'id'>): Promise<ProjectCall> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockProjectCalls.map(p => p.id)) + 1
        const pc: ProjectCall = { id: newId, ...fields }
        mockProjectCalls.push(pc)
        return pc
    }
    return http.post<ProjectCall>('/project-calls/', fields)
}

export async function updateProjectCall(id: number, patch: Partial<Omit<ProjectCall, 'id'>>): Promise<void> {
    if (USE_MOCK) {
        const pc = mockProjectCalls.find(p => p.id === id)
        if (pc) Object.assign(pc, patch)
        return
    }
    await http.patch(`/project-calls/${id}/`, patch)
}

export async function deleteProjectCall(id: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockProjectCalls.findIndex(p => p.id === id)
        if (i !== -1) mockProjectCalls.splice(i, 1)
        return
    }
    await http.del(`/project-calls/${id}/`)
}

// --- Projets ---

export async function addProject(fields: Omit<Project, 'id'>): Promise<Project> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockProjects.map(p => p.id)) + 1
        const project: Project = { id: newId, ...fields }
        mockProjects.push(project)
        return project
    }
    // Les chaînes vides sont retirées, les `null` non : Django refuse `''`
    // pour une date ou une référence, mais `null` y est la valeur d'absence.
    // Grist ne distinguait pas les deux et il fallait tout filtrer.
    const payload = Object.fromEntries(
        Object.entries(fields).filter(([, v]) => v !== '' && v !== undefined)
    )
    return http.post<Project>('/projects/', payload)
}

export async function updateProject(id: number, patch: Partial<Omit<Project, 'id'>>): Promise<void> {
    if (USE_MOCK) {
        const p = mockProjects.find(p => p.id === id)
        if (p) Object.assign(p, patch)
        return
    }
    // Les `null` sont désormais transmis, alors que Grist les faisait tomber.
    // Changement de sens volontaire : côté Django, `null` vide la référence,
    // ce qui est précisément ce qu'une vue veut dire en l'envoyant. Les
    // `undefined` disparaissent d'eux-mêmes à la sérialisation JSON.
    await http.patch(`/projects/${id}/`, patch)
}

export async function deleteProject(id: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockProjects.findIndex(p => p.id === id)
        if (i !== -1) mockProjects.splice(i, 1)
        return
    }
    await http.del(`/projects/${id}/`)
}

export async function getProjectMembers(projectId: number): Promise<ProjectMember[]> {
    if (USE_MOCK) {
        return mockProjectMembers.filter(pm => pm.project_id === projectId)
    }
    return http.get<ProjectMember[]>(`/project-members/?project_id=${projectId}`)
}

export async function getAllProjectMembers(): Promise<ProjectMember[]> {
    return USE_MOCK ? mockProjectMembers : http.get<ProjectMember[]>('/project-members/')
}

export async function addProjectMember(projectId: number, memberId: number, role: string): Promise<ProjectMember> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockProjectMembers.map(p => p.id)) + 1
        const newProjectMember: ProjectMember = { id: newId, project_id: projectId, member_id: memberId, role: role }
        mockProjectMembers.push(newProjectMember)
        return newProjectMember
    }
    return http.post<ProjectMember>('/project-members/', { project_id: projectId, member_id: memberId, role })
}

export async function removeProjectMember(id: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockProjectMembers.findIndex(mp => mp.id === id)
        if (i !== -1) {
            mockProjectMembers.splice(i, 1)
        } return
    }
    await http.del(`/project-members/${id}/`)
}

export async function getKpiEntries(projetId: number): Promise<KpiEntry[]> {
    if (USE_MOCK) {
        return mockKpiEntries.filter(ke => ke.project_id === projetId)
    }

    return http.get<KpiEntry[]>(`/kpi-entries/?project_id=${projetId}`)
}

export async function addKpiEntry(fields: Omit<KpiEntry, 'id'>): Promise<KpiEntry> {
    if (USE_MOCK) {
        const id = Math.max(0, ...mockKpiEntries.map(e => e.id)) + 1
        const entry: KpiEntry = { id, ...fields }
        mockKpiEntries.push(entry)
        return entry
    }
    return http.post<KpiEntry>('/kpi-entries/', fields)
}

export async function updateKpiEntry(id: number, patch: Partial<Omit<KpiEntry, 'id'>>): Promise<void> {
    if (USE_MOCK) {
        const i = mockKpiEntries.findIndex(e => e.id === id)
        if (i !== -1) mockKpiEntries[i] = { ...mockKpiEntries[i], ...patch }
        return
    }
    await http.patch(`/kpi-entries/${id}/`, patch)
}

export async function deleteKpiEntry(id: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockKpiEntries.findIndex(e => e.id === id)
        if (i !== -1) mockKpiEntries.splice(i, 1)
        return
    }
    await http.del(`/kpi-entries/${id}/`)
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
        .filter(a => callProjectIds.has(a.project_id ?? -1))
        .map(a => ({ ...a, partner: partnerMap.get(a.partner_id)! }))
        .filter(a => a.partner)
}

export async function getAgreementMembers(agreementId: number): Promise<AgreementMember[]> {
    if (USE_MOCK) {
        return mockAgreementMembers.filter(am => am.agreement_id === agreementId)
    }
    return http.get<AgreementMember[]>(`/agreement-members/?agreement_id=${agreementId}`)
}

export async function addAgreementMember(agreementId: number, memberId: number): Promise<AgreementMember> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockAgreementMembers.map(a => a.id)) + 1
        const newAgreementMember: AgreementMember = { id: newId, member_id: memberId, agreement_id: agreementId }
        mockAgreementMembers.push(newAgreementMember)
        return newAgreementMember
    }
    return http.post<AgreementMember>('/agreement-members/', { member_id: memberId, agreement_id: agreementId })
}

export async function removeAgreementMember(id: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockAgreementMembers.findIndex(ma => ma.id === id)
        if (i !== -1) mockAgreementMembers.splice(i, 1)
        return
    }
    await http.del(`/agreement-members/${id}/`)
}

export async function addAgreement(fields: Omit<FinancialAgreement, 'id'>): Promise<FinancialAgreement> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockFinancialAgreements.map(a => a.id)) + 1
        const agreement: FinancialAgreement = { id: newId, ...fields }
        mockFinancialAgreements.push(agreement)
        return agreement
    }
    return http.post<FinancialAgreement>('/agreements/', fields)
}

export async function updateAgreement(id: number, patch: Partial<Omit<FinancialAgreement, 'id'>>): Promise<void> {
    if (USE_MOCK) {
        const a = mockFinancialAgreements.find(a => a.id === id)
        if (a) Object.assign(a, patch)
        return
    }
    await http.patch(`/agreements/${id}/`, patch)
}

export async function deleteAgreement(id: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockFinancialAgreements.findIndex(a => a.id === id)
        if (i !== -1) mockFinancialAgreements.splice(i, 1)
        return
    }
    await http.del(`/agreements/${id}/`)
}

// --- Catégories ---

export async function createCategory(title: string, parentId: number | null, color?: string | null): Promise<Category> {
    if (USE_MOCK) {
        const newId = Math.max(...mockCategories.map(c => c.id)) + 1
        const cat: Category = { id: newId, parent_category_id: parentId, title, color: color ?? null }
        mockCategories.push(cat)
        return cat
    }
    // `parentId ?? 0` était la convention Grist pour « pas de parent ». Django
    // attend `null` et refuserait `0`, qui ne désigne aucune ligne.
    return http.post<Category>('/categories/', { title, parent_category_id: parentId, color: color ?? null })
}

export async function updateCategory(id: number, patch: Partial<Pick<Category, 'title' | 'parent_category_id' | 'color'>>): Promise<void> {
    if (USE_MOCK) {
        const cat = mockCategories.find(c => c.id === id)
        if (cat) Object.assign(cat, patch)
        return
    }
    await http.patch(`/categories/${id}/`, patch)
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
    const cat = await http.post<Category>('/categories/', { title: 'Autre', parent_category_id: null })
    return cat.id
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

    // Le serveur fait le tri : les deux tables entières ne transitent plus.
    const [cards, children] = await Promise.all([
        http.get<ActionCard[]>(`/action-cards/?category_id=${id}`),
        http.get<Category[]>(`/categories/?parent_category_id=${id}`),
    ])

    // Les réaffectations précèdent la suppression, et ce n'est pas un détail :
    // `Category.parent_category` est en CASCADE côté Django. Supprimer d'abord
    // emporterait les sous-catégories au lieu de les remonter à la racine.
    await Promise.all([
        // Les fiches passent à « Autre » plutôt qu'au `null` que produirait le
        // SET_NULL du modèle : une fiche sans catégorie n'a pas de place dans
        // l'interface.
        ...cards.map(c => http.patch(`/action-cards/${c.id}/`, { category_id: autreId })),
        ...children.map(c => http.patch(`/categories/${c.id}/`, { parent_category_id: null })),
    ])

    await http.del(`/categories/${id}/`)
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
    // Les dates vides sont retirées : `''` n'est pas une date pour Django, qui
    // rendrait 400 là où Grist stockait la chaîne telle quelle.
    const card = await http.post<ActionCard>('/action-cards/', {
        title: form.title,
        description: form.description,
        ...(form.start_date ? { start_date: form.start_date } : {}),
        ...(form.end_date ? { end_date: form.end_date } : {}),
        status_id: form.status_id,
        category_id: form.category_id,
        owner_id: form.owner_id,
    })
    const cardId = card.id

    // 2. Lier les participants en parallèle avec les autres relations
    // L'owner est toujours ajouté comme Responsable s'il n'est pas déjà dans la liste
    const allParticipants = form.members.some(m => m.member_id === form.owner_id)
        ? form.members
        : [{ member_id: form.owner_id, role: 'Responsable' }, ...form.members]

    // Une requête par lien, là où Grist en groupait un lot. Le routeur DRF n'a
    // pas d'endpoint de création en masse ; le nombre de participants et
    // d'items d'une fiche se compte sur les doigts, la perte est théorique.
    await Promise.all([
        ...allParticipants.map(m =>
            http.post('/member-action-cards/', { member_id: m.member_id, action_card_id: cardId, role: m.role })),
        ...(form.project_id
            ? [http.post('/project-action-cards/', { project_id: form.project_id, action_card_id: cardId })]
            : []),
        ...(form.axis_id
            ? [http.post('/axis-action-cards/', { axis_id: form.axis_id, action_card_id: cardId })]
            : []),
        (async () => {
            if (!form.todo_title && form.todo_items.length === 0) return
            const list = await http.post<ToDoList>('/todo-lists/', { action_card_id: cardId, title: form.todo_title || 'To-do' })
            await Promise.all(form.todo_items.map(content =>
                http.post('/todo-items/', { list_id: list.id, content, status_id: 8 })))
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
    await http.patch(`/action-cards/${id}/`, patch)
}

export async function deleteActionCard(id: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockActionCards.findIndex(c => c.id === id)
        if (i !== -1) mockActionCards.splice(i, 1)
        return
    }
    await http.del(`/action-cards/${id}/`)
}

// --- Requête enrichie (jointures) ---

// Les trois substituts qui remplacent une référence pendante ou nulle. Ils ne
// sont pas de la tolérance aux données sales : `owner`, `category` et `status`
// sont tous `null=True` côté Django, et `ActionCardFull` promet des objets. Sans
// eux, la vue lirait `.label` sur `undefined` au premier rendu.
const FALLBACK_STATUS: Status = { id: 0, label: '—', context: 'action_card' }
const FALLBACK_CATEGORY: Category = { id: 0, title: '—', parent_category_id: null, color: null }
const FALLBACK_MEMBER: Member = {
    id: 0, partner_id: null, lab_id: null, first_name: '?', last_name: '',
    position: '', email: '', tel: '', genre: '', status: '', profile_image: '',
    is_staff: false,
}

function joinActionCards(
    cards: ActionCard[], statuses: Status[], categories: Category[], members: Member[],
): ActionCardFull[] {
    const statusMap = new Map(statuses.map(s => [s.id, s]))
    const categoryMap = new Map(categories.map(c => [c.id, c]))
    const memberMap = new Map(members.map(m => [m.id, m]))

    return cards.map(card => {
        const category = categoryMap.get(card.category_id ?? -1) ?? FALLBACK_CATEGORY
        const parent = category.parent_category_id
            ? categoryMap.get(category.parent_category_id) ?? null
            : null
        return {
            ...card,
            status: statusMap.get(card.status_id ?? -1) ?? FALLBACK_STATUS,
            category: { ...category, parent },
            owner: memberMap.get(card.owner_id ?? -1) ?? FALLBACK_MEMBER,
        }
    })
}

export async function getActionCardsFull(): Promise<ActionCardFull[]> {
    if (USE_MOCK) {
        return joinActionCards(mockActionCards, mockStatuses, mockCategories, mockMembers)
    }
    const [cards, statuses, categories, members] = await Promise.all([
        getActionCards(), getStatuses(), getCategories(), getMembers(),
    ])
    return joinActionCards(cards, statuses, categories, members)
}

function joinPartnerCards(
    partners: Partner[], agreements: FinancialAgreement[], projects: Project[], members: Member[],
): PartnerCardFull[] {
    const membersByPartner = new Map<number, Member[]>()
    for (const m of members) {
        if (m.partner_id === null) continue
        membersByPartner.set(m.partner_id, [...(membersByPartner.get(m.partner_id) ?? []), m])
    }

    const agreementsByPartner = new Map<number, FinancialAgreement[]>()
    const projectsByPartner = new Map<number, Project[]>()
    for (const a of agreements) {
        agreementsByPartner.set(a.partner_id, [...(agreementsByPartner.get(a.partner_id) ?? []), a])

        // Les projets d'un partenaire se déduisent de ses conventions : il n'y a
        // pas de lien direct. Une convention détachée de son projet (`SET_NULL`)
        // n'en apporte aucun.
        const project = a.project_id === null ? undefined : projects.find(p => p.id === a.project_id)
        if (!project) continue
        const existing = projectsByPartner.get(a.partner_id) ?? []
        // Éviter les doublons si plusieurs conventions portent le même projet.
        if (!existing.some(p => p.id === project.id)) {
            projectsByPartner.set(a.partner_id, [...existing, project])
        }
    }

    return partners.map(p => ({
        ...p,
        members: membersByPartner.get(p.id) ?? [],
        agreements: agreementsByPartner.get(p.id) ?? [],
        projects: projectsByPartner.get(p.id) ?? [],
    }))
}

export async function getPartnerCardsFull(): Promise<PartnerCardFull[]> {
    if (USE_MOCK) {
        return joinPartnerCards(mockPartners, mockFinancialAgreements, mockProjects, mockMembers)
    }
    const [partners, agreements, projects, members] = await Promise.all([
        getPartners(), getFinancialAgreements(), getProjects(), getMembers(),
    ])
    return joinPartnerCards(partners, agreements, projects, members)
}


// --- Jalons ---

export async function getProjectMilestones(projectId: number): Promise<ProjectMilestone[]> {
    if (USE_MOCK) return mockProjectMilestones.filter(m => m.project_id === projectId)
    return http.get<ProjectMilestone[]>(`/project-milestones/?project_id=${projectId}`)
}

export async function getAllProjectMilestones(): Promise<ProjectMilestone[]> {
    if (USE_MOCK) return [...mockProjectMilestones]
    return http.get<ProjectMilestone[]>('/project-milestones/')
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
    return http.post<ProjectMilestone>('/project-milestones/', { project_id: projectId, ...fields })
}

export async function updateProjectMilestone(id: number, patch: Partial<Omit<ProjectMilestone, 'id' | 'project_id'>>): Promise<void> {
    if (USE_MOCK) {
        const m = mockProjectMilestones.find(m => m.id === id)
        if (m) Object.assign(m, patch)
        return
    }
    if (Object.keys(patch).length > 0) await http.patch(`/project-milestones/${id}/`, patch)
}

export async function deleteProjectMilestone(id: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockProjectMilestones.findIndex(m => m.id === id)
        if (i !== -1) mockProjectMilestones.splice(i, 1)
        return
    }
    await http.del(`/project-milestones/${id}/`)
}

// --- Formations ---

export async function getFormations(): Promise<Formation[]> {
    return USE_MOCK ? mockFormations : http.get<Formation[]>('/formations/')
}

export async function getProjectFormationLinks(projectId: number): Promise<ProjectFormation[]> {
    return USE_MOCK
        ? mockProjectFormations.filter(pf => pf.project_id === projectId)
        : http.get<ProjectFormation[]>(`/project-formations/?project_id=${projectId}`)
}

export async function getFormationsByProject(projectId: number): Promise<Formation[]> {
    if (USE_MOCK) {
        const ids = mockProjectFormations.filter(pf => pf.project_id === projectId).map(pf => pf.formation_id)
        return mockFormations.filter(f => ids.includes(f.id))
    }
    // `FormationViewSet` déclare `?project_id=`, qui traverse la table de
    // liaison côté SQL. Les deux tables ne descendent plus pour en croiser
    // quelques lignes.
    return http.get<Formation[]>(`/formations/?project_id=${projectId}`)
}

export async function addProjectFormation(projectId: number, formationId: number): Promise<ProjectFormation> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockProjectFormations.map(pf => pf.id)) + 1
        const link: ProjectFormation = { id: newId, project_id: projectId, formation_id: formationId }
        mockProjectFormations.push(link)
        return link
    }
    return http.post<ProjectFormation>('/project-formations/', { project_id: projectId, formation_id: formationId })
}

export async function removeProjectFormation(linkId: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockProjectFormations.findIndex(pf => pf.id === linkId)
        if (i !== -1) mockProjectFormations.splice(i, 1)
        return
    }
    await http.del(`/project-formations/${linkId}/`)
}

// --- Pièces jointes ---

export async function getProjectAttachments(projectId: number): Promise<ProjectAttachment[]> {
    if (USE_MOCK) return mockProjectAttachments.filter(a => a.project_id === projectId)
    return http.get<ProjectAttachment[]>(`/project-attachments/?project_id=${projectId}`)
}

export async function addProjectAttachment(projectId: number, label: string, url: string): Promise<ProjectAttachment> {
    if (USE_MOCK) {
        const newId = Math.max(0, ...mockProjectAttachments.map(a => a.id)) + 1
        const attachment: ProjectAttachment = { id: newId, project_id: projectId, label, url }
        mockProjectAttachments.push(attachment)
        return attachment
    }
    return http.post<ProjectAttachment>('/project-attachments/', { project_id: projectId, label, url })
}

export async function deleteProjectAttachment(id: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockProjectAttachments.findIndex(a => a.id === id)
        if (i !== -1) mockProjectAttachments.splice(i, 1)
        return
    }
    await http.del(`/project-attachments/${id}/`)
}

// --- Publications ---

export async function getPublicationsByProject(projectId: number): Promise<Publication[]> {
    if (USE_MOCK) return mockPublications.filter(p => p.project_id === projectId)
    return http.get<Publication[]>(`/publications/?project_id=${projectId}`)
}

export async function addPublication(fields: Omit<Publication, 'id'>): Promise<Publication> {
    if (USE_MOCK) {
        const id = Math.max(0, ...mockPublications.map(p => p.id)) + 1
        const pub: Publication = { id, ...fields }
        mockPublications.push(pub)
        return pub
    }
    return http.post<Publication>('/publications/', fields)
}

export async function updatePublication(id: number, patch: Partial<Omit<Publication, 'id'>>): Promise<void> {
    if (USE_MOCK) {
        const i = mockPublications.findIndex(p => p.id === id)
        if (i !== -1) mockPublications[i] = { ...mockPublications[i], ...patch }
        return
    }
    await http.patch(`/publications/${id}/`, patch)
}

export async function deletePublication(id: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockPublications.findIndex(p => p.id === id)
        if (i !== -1) mockPublications.splice(i, 1)
        return
    }
    await http.del(`/publications/${id}/`)
}

// --- Publication members ---

export async function getPublicationMembersByProject(projectId: number): Promise<PublicationMember[]> {
    if (USE_MOCK) {
        const pubIds = new Set(mockPublications.filter(p => p.project_id === projectId).map(p => p.id))
        return mockPublicationMembers.filter(pm => pubIds.has(pm.publication_id))
    }
    // `PublicationMemberViewSet` déclare `?project_id=`, qui remonte d'un cran
    // via `publication__project`. L'ancienne version rendait la table entière
    // sans filtrer — le nom de la fonction mentait.
    return http.get<PublicationMember[]>(`/publication-members/?project_id=${projectId}`)
}

export async function addPublicationMember(publicationId: number, memberId: number): Promise<PublicationMember> {
    if (USE_MOCK) {
        const id = Math.max(0, ...mockPublicationMembers.map(pm => pm.id)) + 1
        const pm: PublicationMember = { id, publication_id: publicationId, member_id: memberId }
        mockPublicationMembers.push(pm)
        return pm
    }
    return http.post<PublicationMember>('/publication-members/', { publication_id: publicationId, member_id: memberId })
}

export async function deletePublicationMember(id: number): Promise<void> {
    if (USE_MOCK) {
        const i = mockPublicationMembers.findIndex(pm => pm.id === id)
        if (i !== -1) mockPublicationMembers.splice(i, 1)
        return
    }
    await http.del(`/publication-members/${id}/`)
}
