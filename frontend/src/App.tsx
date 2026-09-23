import { useEffect, useState } from 'react'
import Dashboard from './views/Dashboard'
import Partners from './views/Partners'
import Members from './views/Members'
import Projects from './views/Projects'
import Actions from './views/Actions'
import Finance from './views/Finance'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import {ActionCardViewerSheet, ProjectViewerSheet} from './components/viewers'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChevronsUpDown, Download, RefreshCw, LogOut, Bell, Check, ChevronDown, Building2, UserPlus, Plus, LayoutDashboard, ListTodo, Briefcase, Users, Receipt } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type MemberFull, type Project, type ProjectMember, type ActionCardFull, type Comment, type FinancialAgreement, type ProjectMilestone, type Expanse, type MemberActionCard, type Organization, type Program, type Status,type OrganizationTree } from '@/lib/types'
import { getMembersFull, getProjects, getActionCardsFull, getAllProjectMembers, getAllMemberActionCards, getComments, getFinancialAgreements, getAllProjectMilestones, getExpanses, getOrganizations, selectOrganization, selectProgram, getStatuses, createOrganization, createProgram } from '@/lib/api'
import { codeOf, isOpen } from '@/lib/status'
import { UserContext, ProgramContext } from '@/lib/userContext'
import { Toaster } from 'sonner'
import ExportModal from '@/components/ExportModal'
import ShareModal from '@/components/ShareModal'
import CreateOrganizationModal from '@/components/CreateOrganizationModal'
import CreateProgramModal, { type ProgramDraft } from '@/components/CreateProgramModal'
import LoginScreen from '@/components/LoginScreen'
import SignupScreen from '@/components/SignupScreen'
import InvitationScreen from '@/components/InvitationScreen'
import { fetchMe, logout as apiLogout, type Session } from '@/lib/auth'
import { ApiError } from '@/lib/client'
import {Sidebar, SidebarContent, SidebarGroup, SidebarHeader, SidebarFooter, SidebarInset, SidebarProvider, SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSkeleton, SidebarGroupLabel, SidebarGroupContent, SidebarGroupAction, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton} from '@/components/ui/sidebar'
import type { LucideIcon } from 'lucide-react'


type AlertItem = {
  type: string,
  title: string, 
  seen: boolean,
  daysLeft: number,
  id: number,
}

type VIEW = {
  name : string,
  label : string,
  icon?: LucideIcon
}

// La seule URL que l'application reconnaisse, et elle n'introduit pas de
// routeur : un lien d'invitation est transporté à la main par l'invitant, il
// doit survivre à un copier-coller dans un message. C'est ce qui le distingue
// de l'inscription, à laquelle on n'arrive que depuis l'écran de connexion.
//
// Le jeton n'est lu qu'au démarrage : sans navigation, le chemin ne change plus
// ensuite — et l'acceptation le réécrit elle-même en `/`.
function invitationToken(): string | null {
  return window.location.pathname.match(/^\/invitation\/([^/]+)\/?$/)?.[1] ?? null
}

// Porte d'entrée. AppShell n'est monté qu'une fois la session établie : ses
// appels d'API partent tous avec IsAuthenticated satisfait, et son useEffect de
// chargement — qui n'a pas de .catch() — ne peut plus donner un écran blanc.
export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [checking, setChecking] = useState(true)
  const [signingUp, setSigningUp] = useState(false)
  const [invitation, setInvitation] = useState<string | null>(invitationToken)
  const [orgs, setOrgs] = useState<OrganizationTree[] | null>(null)
  const [programError, setProgramError] = useState<string | null>(null)
  const reloadOrgs = () => getOrganizations().then(setOrgs).catch(() => setOrgs([]))
  const [currentView, setCurrentView] = useState('dashboard')

  
  const VIEWS: VIEW[] = [
  { name: "dashboard", label: "Dashboard",   icon: LayoutDashboard },
  { name: "actions",   label: "Actions",     icon: ListTodo },
  { name: "projects",  label: "Projets",     icon: Briefcase },
  { name: "partners",  label: "Partenaires", icon: Building2 },
  { name: "members",   label: "Membres",     icon: Users },
  { name: "finance",   label: "Finance",     icon: Receipt },
]

  useEffect(() => {
    fetchMe()
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setChecking(false))
  }, [])

  useEffect(()=> {
    if(!session) {
      setOrgs(null)
      return
    }
    reloadOrgs()
  }, [session?.user.id])

  function chooseProgram(program: Program) {
    setSession(s => (s ? { ...s, program } : s))
  }

  // Le laboratoire actif et ses programmes, tels que les rend `/organizations/`
  // — triés par nom depuis que ce premier élément décide où l'on atterrit.
  // `null` vaut « arbre pas encore chargé » et ne se confond pas avec un
  // rattachement sans affectation, qui rend [].
  const activePrograms = !session?.organization || orgs === null
    ? null
    : orgs.find(o => o.id === session.organization!.id)?.programs ?? []

  // Le middleware ne tranche que si une seule affectation existe ; au-delà il
  // laisse la session vide et attendait un choix. On le fait à sa place : la
  // barre latérale permet d'en changer ensuite, donc rien n'est perdu.
  useEffect(() => {
    if (!session?.organization || session.program || !activePrograms?.length) return
    setProgramError(null)
    selectProgram(activePrograms[0].id)
      .then(chooseProgram)
      .catch(err => setProgramError(err instanceof ApiError ? err.message : 'Sélection impossible.'))
  }, [session?.organization?.id, session?.program, activePrograms])

  // Le serveur affecte l'auteur mais ne sélectionne rien : sans le
  // `selectProgram` qui suit, on créerait un programme pour rester sur le
  // précédent. `reloadOrgs` ensuite, sans quoi la barre latérale — qui lit
  // l'arbre et non `getProgram()` — ignorerait le nouveau venu.
  async function createProg(draft: ProgramDraft) {
    const created = await createProgram(draft)
    chooseProgram(await selectProgram(created.id))
    reloadOrgs()
  }

  async function createOrg(name: string) {
  await createOrganization(name)
  const [next] = await Promise.all([fetchMe(), reloadOrgs()])
  setSession(next)
}

  async function chooseOrganization(id: number) {
    await selectOrganization(id)
    setSession(await fetchMe())
    reloadOrgs()
  }

  const onLogout = () => apiLogout().then(() => setSession(null))

  // Rejoindre un laboratoire est une invitation acceptée, donc un changement de
  // contexte : la session qui revient n'est pas celle qui était en place, et la
  // fiche annuaire du titulaire a changé avec elle.
  function accepted(next: Session) {
    // L'URL est consommée en même temps que l'invitation : rechargée, elle
    // rouvrirait un écran qui répondrait 404, le jeton étant désormais accepté.
    window.history.replaceState(null, '', '/')
    setInvitation(null)
    setSession(next)
  }

  if (checking) return null
  // Avant les branches de session, et pas après : le lien s'ouvre aussi bien
  // sans compte qu'avec une session déjà établie ailleurs, et c'est l'écran
  // lui-même qui distingue les deux — le serveur ne demande un mot de passe
  // qu'au premier cas.
  if (invitation) {
    return <InvitationScreen token={invitation} session={session} onAccepted={accepted} />
  }
  // Une bascule d'écran et non une route : l'application n'a pas de routeur, et
  // l'inscription n'a pas d'URL à partager — on n'y arrive que d'ici.
  if (!session) {
    return signingUp
      ? <SignupScreen onSuccess={setSession} onCancel={() => setSigningUp(false)} />
      : <LoginScreen onSuccess={setSession} onSignup={() => setSigningUp(true)} />
  }

  // Les deux choix sont bloquants, et dans cet ordre : sans laboratoire actif
  // même la liste des programmes est inaccessible, puisque Program est
  // cloisonné par l'organisation. Les proposer ensemble n'aurait pas de sens.
  if (!session.organization) return <OrganizationPicker onChoose={chooseOrganization} onLogout={onLogout} />
  // Trois états sous une seule condition : l'arbre se charge, l'auto-sélection
  // est partie, ou il n'y avait rien à sélectionner. Les deux premiers ne
  // durent qu'un aller-retour et ne méritent pas d'écran.
  if (!session.program) {
    if (activePrograms === null || (activePrograms.length > 0 && !programError)) return null
    return <NoProgram error={programError} onLogout={onLogout} />
  }

  return <AppShell
            // Remonte tout à chaque bascule, sur les deux axes. Les données
            // déjà chargées appartiennent au contexte qu'on quitte ; les garder
            // afficherait les projets de l'un sous le budget de l'autre.
            currentView={currentView}
            setCurrentView={setCurrentView}
            key={`${session.organization.id}:${session.program.id}`}
            memberId={session.member_id}
            organization={session.organization}
            program={session.program}
            isOwner={session.is_owner}
            isProgramAdmin={session.is_program_admin}
            onSelectProgram={chooseProgram}
            onSelectOrganization={chooseOrganization}
            onCreateOrganization={createOrg}
            onCreateProgram={createProg}
            onLogout={onLogout}
            orgs={orgs}
            VIEWS={VIEWS}
          />
}

// Premier des deux écrans de contexte, et le seul que voit un compte rattaché à
// plusieurs laboratoires. Un seul rattachement — le cas courant — et le
// middleware l'aura déjà sélectionné : cet écran ne s'affiche alors jamais.
function OrganizationPicker({ onChoose, onLogout }: { onChoose: (id: number) => Promise<void>; onLogout: () => void }) {
  const [orgs, setOrgs] = useState<Organization[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<number | null>(null)

  useEffect(() => {
    getOrganizations()
      .then(setOrgs)
      .catch(() => { setOrgs([]); setError('Liste des laboratoires indisponible.') })
  }, [])

  async function choose(o: Organization) {
    setPending(o.id)
    try {
      await onChoose(o.id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sélection impossible.')
      setPending(null)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Choisir un laboratoire</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {orgs === null && <p className="text-sm text-muted-foreground">Chargement…</p>}
          {orgs?.length === 0 && !error && (
            <p className="text-sm text-muted-foreground">
              Ce compte n'est rattaché à aucun laboratoire. Demandez une
              invitation à l'un de ses administrateurs.
            </p>
          )}
          {orgs?.map(o => (
            <Button
              key={o.id}
              variant="outline"
              className="w-full justify-start"
              disabled={pending !== null}
              onClick={() => choose(o)}
            >
              <span className="truncate">{o.name}</span>
            </Button>
          ))}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button variant="ghost" size="sm" className="w-full" onClick={onLogout}>
            <LogOut /> Se déconnecter
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// Ce qui reste de l'ancien sélecteur de programme. Le choix se fait désormais
// dans la barre latérale, où il est permutable à tout moment : le faire trancher
// une fois, de façon bloquante, n'apportait rien de plus.
//
// N'apparaît donc plus que quand il n'y a rien à choisir — pas un cas de
// création (les deux chemins, inscription et invitation, affectent d'office)
// mais un cas de dérive : une invitation émise sans programme, une fiche
// annuaire supprimée sous le compte, une affectation retirée depuis l'admin.
function NoProgram({ error, onLogout }: { error: string | null; onLogout: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Aucun programme</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Aucun programme ne vous est affecté dans ce laboratoire. Demandez
            votre rattachement à l'un de ses administrateurs.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button variant="ghost" size="sm" className="w-full" onClick={onLogout}>
            <LogOut /> Se déconnecter
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// La bascule de laboratoire et celle de programme vivaient ici, en double de la
// barre latérale qui les porte désormais toutes les deux — l'une en tête, l'autre
// dans le groupe « Programmes ». Rien n'est perdu : la bascule d'organisation
// passe toujours par `App` et non par un setSession local, parce qu'elle change
// la fiche annuaire du titulaire et efface le programme côté serveur, donc seul
// un `fetchMe()` sait dire ce que devient le contexte.

function AppShell({currentView, setCurrentView, memberId, orgs, organization, program, isOwner, isProgramAdmin, onSelectProgram, onSelectOrganization, onCreateOrganization, onCreateProgram, onLogout, VIEWS}: {currentView: string, setCurrentView:(vue : string) => void, memberId: number | null; orgs: OrganizationTree[] | null; organization: Organization; program: Program; isOwner: boolean; isProgramAdmin: boolean; onSelectProgram: (p: Program) => void; onSelectOrganization: (id: number) => Promise<void>; onCreateOrganization: (name: string) => Promise<void>; onCreateProgram: (draft: ProgramDraft) => Promise<void>; onLogout: () => void; VIEWS: VIEW[]}) {

  const [currentMember, setCurrentMember] = useState<MemberFull | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([])
  const [actions, setActions] = useState<ActionCardFull[]>([])
  const [openCard, setOpenCard]         = useState<ActionCardFull | null>(null)
  const [openProject, setOpenProject]   = useState<Project | null>(null)
  const [actionMembers, setActionMembers] = useState<MemberActionCard[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [agreements, setAgreements] = useState<FinancialAgreement[]>([])
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([])
  const [expanses, setExpanses] = useState<Expanse[]>([])
  // Le référentiel de statuts, nécessaire aux alertes : projets et jalons ne
  // portent qu'un `status_id`, contrairement aux cartes d'action qui arrivent
  // avec leur statut complet.
  const [statuses, setStatuses] = useState<Status[]>([])
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [showExport, setShowExport] = useState(false)
  const [showInvitations, setShowInvitations] = useState(false)
  const [showCreateOrg, setShowCreateOrg] = useState(false)
  const [showCreateProgram, setShowCreateProgram] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    Promise.all([
      getMembersFull(), getProjects(), getActionCardsFull(),
      getAllProjectMembers(), getAllMemberActionCards(),
      getComments(), getFinancialAgreements(), getAllProjectMilestones(), getExpanses(),
      getStatuses(),
    ]).then(([members, projects, actions, projectsMembers, actionMembers, comments, agreements, milestones, expanses, statuses]) => {
      setStatuses(statuses)
      setProjects(projects)
      setProjectMembers(projectsMembers)
      setActions(actions)
      setActionMembers(actionMembers)
      setComments(comments)
      setAgreements(agreements)
      setMilestones(milestones)
      setExpanses(expanses)
      // Sur la fiche du contexte et non sur `user.id` : deux tables, deux
      // séquences. L'égalité tenait par hasard sur les comptes créés à la main,
      // et tombait dès le premier compte issu de l'inscription — sans fiche
      // retrouvée, l'interface perdait l'avatar, le nom et les alertes. Elle
      // change aussi avec le laboratoire, d'où le remontage sur `key`.
      setCurrentMember(members.find(m => m.id === memberId) ?? null)
    }).catch(err => {
      // Le portage sur Django est en cours : tant que les modèles manquants ne
      // sont pas écrits, ce Promise.all échoue en bloc. Sans ce catch, l'échec
      // laisse un écran blanc muet au lieu de l'interface vide.
      console.error('Chargement initial incomplet', err)
    })
  }, [])

  const SEEN_ALERTS_KEY = 'grist_seen_alerts'

  function daysLeft(dateStr: string) {
    return Math.floor((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  }

  function checkAndCreateAlerts() {
    const seenIds = new Set<string>(JSON.parse(localStorage.getItem(SEEN_ALERTS_KEY) ?? '[]'))
    const now = new Date().getTime()
    const mid = currentMember?.id

    const memberProjectIds = new Set(
      projectMembers.filter(m => m.member_id === mid).map(m => m.project_id)
    )
    const myCardIds = new Set([
      ...actions.filter(c => c.owner_id === mid).map(c => c.id),
      ...actionMembers.filter(m => m.member_id === mid && m.role === 'Responsable').map(m => m.action_card_id),
    ])

    // 1. ActionCards expirant dans < 10j (non terminées / non annulées, owner ou Responsable)
    const cardAlerts: AlertItem[] = actions
      .filter((c): c is ActionCardFull & { end_date: string } => myCardIds.has(c.id) && !!c.end_date && isOpen(c.status?.code))
      .filter(c => (new Date(c.end_date).getTime() - now) / (1000 * 60 * 60 * 24) < 10)
      .map(c => ({ id: c.id, type: 'card', title: c.title, daysLeft: daysLeft(c.end_date), seen: seenIds.has(`card-${c.id}`) }))

    // 2. Projets expirant dans < 30j (non terminés)
    const projectAlerts: AlertItem[] = projects
      .filter((p): p is Project & { end_date: string } => memberProjectIds.has(p.id) && !!p.end_date && isOpen(codeOf(statuses, p.status_id)))
      .filter(p => (new Date(p.end_date).getTime() - now) / (1000 * 60 * 60 * 24) < 30)
      .map(p => ({ id: p.id, type: 'project', title: p.title, daysLeft: daysLeft(p.end_date), seen: seenIds.has(`project-${p.id}`) }))

    // 3. Commentaires d'autrui sur mes ActionCards (< 7 jours)
    const commentAlerts: AlertItem[] = comments
      .filter(c => myCardIds.has(c.action_card_id) && c.owner_id !== mid)
      .filter(c => (now - new Date(c.timestamp).getTime()) / (1000 * 60 * 60 * 24) < 7)
      .map(c => {
        const card = actions.find(a => a.id === c.action_card_id)
        return { id: c.id, type: 'comment', title: `Commentaire sur « ${card?.title ?? '…'} »`, daysLeft: 0, seen: seenIds.has(`comment-${c.id}`) }
      })

    // 4. Jalons de mes projets dans < 14j
    const milestoneAlerts: AlertItem[] = milestones
      .filter((m): m is ProjectMilestone & { due_date: string } => memberProjectIds.has(m.project_id) && !!m.due_date && isOpen(codeOf(statuses, m.status_id)))
      .filter(m => (new Date(m.due_date).getTime() - now) / (1000 * 60 * 60 * 24) < 14)
      .map(m => {
        const proj = projects.find(p => p.id === m.project_id)
        return { id: m.id, type: 'milestone', title: proj ? `${proj.title} – ${m.title}` : m.title, daysLeft: daysLeft(m.due_date), seen: seenIds.has(`milestone-${m.id}`) }
      })

    // 5. Conventions non signées sur mes projets
    const conventionAlerts: AlertItem[] = agreements
      .filter(a => memberProjectIds.has(a.project_id ?? -1) && !a.signed_date)
      .map(a => {
        const proj = projects.find(p => p.id === a.project_id)
        return { id: a.id, type: 'convention', title: proj ? `${proj.title} – ${a.title}` : a.title, daysLeft: 0, seen: seenIds.has(`convention-${a.id}`) }
      })

    // 6. Budget dépassé sur mes projets
    const budgetAlerts: AlertItem[] = projects
      .filter(p => memberProjectIds.has(p.id) && p.budget)
      .filter(p => {
        const spent = expanses.filter(e => e.project_id === p.id).reduce((s, e) => s + e.amount, 0)
        return spent > p.budget
      })
      .map(p => ({ id: p.id, type: 'budget', title: `Budget dépassé : ${p.title}`, daysLeft: 0, seen: seenIds.has(`budget-${p.id}`) }))

    setAlerts([...cardAlerts, ...projectAlerts, ...commentAlerts, ...milestoneAlerts, ...conventionAlerts, ...budgetAlerts])
  }

  useEffect(() => {
    // `statuses` conditionne autant que `actions` : sans le référentiel, les
    // codes ne se résolvent pas et tout passerait pour clos, donc silencieux.
    if (currentMember && actions.length > 0 && statuses.length > 0) {
        checkAndCreateAlerts()
    }
  }, [currentMember, actions, comments, milestones, agreements, expanses, statuses])

  // Les seuls programmes affichés sont ceux du laboratoire actif : l'autre axe
  // est l'affaire du sélecteur d'en-tête. `null` vaut « en cours de chargement »
  // et ne se confond pas avec un rattachement sans affectation, qui rend [].
  const programs = orgs === null ? null : orgs.find(o => o.id === organization.id)?.programs ?? []

  return (
    <UserContext.Provider value={currentMember}>
    <ProgramContext.Provider value={program}>
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  {/* Pas de `tooltip` ici : il enveloppe le bouton dans un
                      TooltipTrigger, et deux `asChild` imbriqués font perdre au
                      DropdownMenuTrigger ses attributs. */}
                  <SidebarMenuButton>
                    {/* Replié, le bouton tombe à 32 px et n'affiche que son
                        premier enfant : sans initiale il ne resterait qu'un
                        carré vide. */}
                    <span className="flex size-4 shrink-0 items-center justify-center rounded-sm bg-sidebar-primary text-[10px] font-semibold text-sidebar-primary-foreground">
                      {organization.name[0]}
                    </span>
                    <span className="truncate">{organization.name}</span>
                    <ChevronDown className="ml-auto group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                {/* `min-w-56` : replié, la largeur de l'ancre tombe à 48 px et
                    le menu n'afficherait que la première lettre. */}
                <DropdownMenuContent className="w-[--radix-popper-anchor-width] min-w-56">
                  {orgs?.map(o => (
                    <DropdownMenuItem
                      key={o.id}
                      className="flex items-center gap-2"
                      onSelect={() => { if (o.id !== organization.id) onSelectOrganization(o.id) }}
                    >
                      {o.id === organization.id ? <Check className="h-3.5 w-3.5" /> : <span className="w-3.5" />}
                      <span className="flex-1 truncate">{o.name}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="flex items-center gap-2"
                    onSelect={() => setShowCreateOrg(true)}
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    <span>Créer un espace de travail</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>


        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Programmes</SidebarGroupLabel>
            {/* `SidebarGroupAction` disparaît de lui-même en mode icône, où
                l'étiquette du groupe n'est plus là pour l'expliquer.

                Réservé au propriétaire : créer un programme ouvre un périmètre
                financier et une équipe, et son auteur en devient
                administrateur. Le laisser à tout membre rendait la cloison
                franchissable par le bas. Le serveur refuse de toute façon en
                403 — ici on évite un bouton mort. */}
            {isOwner && (
              <SidebarGroupAction title="Nouveau programme" onClick={() => setShowCreateProgram(true)}>
                <Plus />
                <span className="sr-only">Nouveau programme</span>
              </SidebarGroupAction>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {programs === null && <SidebarMenuSkeleton showIcon={false} />}
                {programs?.length === 0 && (
                  <p className="px-2 text-xs text-muted-foreground">Aucune affectation.</p>
                )}
                {programs?.map(p => (
                  <SidebarMenuItem key={p.id}>
                    {/* `selectProgram` avant `onSelectProgram` : le second n'est
                        qu'un setSession local, il ne dit rien au serveur. */}
                        <SidebarMenuButton
                          isActive={p.id === program.id}
                          tooltip={p.name}
                          onClick={() => {
                            if (p.id !== program.id) {
                              selectProgram(p.id).then(newProgram => {
                                onSelectProgram(newProgram)   
                                setCurrentView("dashboard")
                              })
                            }
                          }}
                                                >
                          <span className="flex size-4 shrink-0 items-center justify-center rounded-sm border text-[10px] font-semibold">
                            {p.name[0]}
                          </span>
                          <span className="truncate">{p.name}</span>
                        </SidebarMenuButton>

                      
                      <SidebarMenuSub>
                      {VIEWS.map(v => {
                          const Icon = v.icon
                          return (
                          
                          <SidebarMenuSubItem key={v.name}>
                            <SidebarMenuSubButton
                              isActive={p.id === program.id && currentView === v.name}
                             onClick={() => {
                                      if (p.id !== program.id) {
                                        selectProgram(p.id).then(newProgram => {
                                          onSelectProgram(newProgram)
                                          setCurrentView(v.name)
                                        })
                                      } else {
                                        setCurrentView(v.name)
                                      }
                                    }}
                            >
                              {Icon && <Icon size={14} />}
                              <span className="truncate">{v.label}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                      )}
                      </SidebarMenuSub>

                  </SidebarMenuItem>
                ))}
              </SidebarMenu>


            </SidebarGroupContent>
          </SidebarGroup>


        </SidebarContent>
      
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                {/* Pas de `tooltip`, pour la même raison qu'en tête de barre :
                    deux `asChild` imbriqués font perdre au trigger ses
                    attributs. */}
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg">
                    {/* Replié, le bouton n'affiche que son premier enfant :
                        l'avatar doit donc venir avant le nom. */}
                    <Avatar className="size-6 shrink-0">
                      <AvatarImage src={currentMember?.profile_image} />
                      <AvatarFallback
                        className="text-[10px]"
                        style={{ backgroundColor: currentMember?.partner?.color ?? '#E7E8E2' }}
                      >
                        {currentMember ? `${currentMember.first_name[0]}${currentMember.last_name[0]}` : '—'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-xs font-medium">
                        {currentMember ? `${currentMember.first_name} ${currentMember.last_name}` : '—'}
                      </span>
                      {currentMember?.position && (
                        <span className="truncate text-[10px] text-muted-foreground">{currentMember.position}</span>
                      )}
                    </div>
                    <ChevronsUpDown className="ml-auto size-3.5 group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                {/* `side="right"` : le pied de barre est en bas de l'écran, un
                    menu ouvert vers le bas n'aurait nulle part où aller. */}
                <DropdownMenuContent side="right" align="end" className="w-56">
                  <DropdownMenuItem onClick={() => setRefreshKey(k => k + 1)}>
                    <RefreshCw /> Actualiser
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowExport(true)}>
                    <Download /> Exporter les données
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout}>
                    <LogOut /> Se déconnecter
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

    </Sidebar>
      <SidebarInset className="min-w-0">
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <nav className="flex justify-between align-center p-4 gap-4 shrink-0">
          <div className='flex'>
            <SidebarTrigger />
          </div>

          <div className='flex gap-2 items-center'>

          {/* Boutons alertes */}
          {currentMember ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="relative rounded-full" variant="ghost" size="lg">
                  <Bell size={24} />
                  {alerts.some(a => !a.seen) && <div className="rounded-full bg-red-500 h-2 w-2 absolute top-1 right-1" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 max-h-96 overflow-y-auto mt-1 [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
                {(() => {
                  const unseen = alerts.filter(a => !a.seen)
                  const seen   = alerts.filter(a => a.seen)

                  const renderItem = (a: AlertItem) => (
                    <DropdownMenuItem key={`${a.type}-${a.id}`} className={`flex items-start gap-2 py-2 rounded-md mt-1 cursor-pointer ${!a.seen ? 'bg-indigo-50' : ''}`} onClick={() => {
                      const seenIds = new Set<string>(JSON.parse(localStorage.getItem(SEEN_ALERTS_KEY) ?? '[]'))
                      seenIds.add(`${a.type}-${a.id}`)
                      localStorage.setItem(SEEN_ALERTS_KEY, JSON.stringify([...seenIds]))
                      setAlerts(prev => prev.map(alert =>
                        alert.id === a.id && alert.type === a.type ? { ...alert, seen: true } : alert
                      ))
                      if (a.type === 'card' || a.type === 'comment') {
                        const cardId = a.type === 'comment' ? comments.find(cm => cm.id === a.id)?.action_card_id : a.id
                        const card = actions.find(c => c.id === cardId)
                        if (card) setOpenCard(card)
                      } else {
                        const projectId = a.type === 'project' || a.type === 'budget' ? a.id
                          : a.type === 'milestone' ? milestones.find(m => m.id === a.id)?.project_id
                          : a.type === 'convention' ? agreements.find(ag => ag.id === a.id)?.project_id
                          : undefined
                        const project = projects.find(p => p.id === projectId)
                        if (project) setOpenProject(project)
                      }
                    }}>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                          {a.type === 'card' ? 'Action' : a.type === 'project' ? 'Projet' : a.type === 'comment' ? 'Commentaire' : a.type === 'milestone' ? 'Jalon' : a.type === 'convention' ? 'Convention' : 'Budget'}
                        </span>
                        <span className="text-xs truncate font-medium">{a.title}</span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          {a.type === 'card'       ? (a.daysLeft < 0 ? `Expirée depuis ${Math.abs(a.daysLeft)}j` : `Expire dans ${a.daysLeft}j`)
                          : a.type === 'project'   ? (a.daysLeft < 0 ? `Terminé depuis ${Math.abs(a.daysLeft)}j` : `Se termine dans ${a.daysLeft}j`)
                          : a.type === 'comment'   ? 'Nouveau commentaire'
                          : a.type === 'milestone' ? (a.daysLeft < 0 ? `Échéance dépassée depuis ${Math.abs(a.daysLeft)}j` : `Échéance dans ${a.daysLeft}j`)
                          : a.type === 'convention'? 'Convention en attente de signature'
                          : 'Dépenses supérieures au budget'}
                        </span>
                      </div>
                      {!a.seen && <div className="shrink-0 w-2 h-2 rounded-full bg-indigo-500 mt-1" />}
                    </DropdownMenuItem>
                  )

                  if (alerts.length === 0) return (
                    <p className="text-xs text-muted-foreground px-2 py-3 text-center">Aucune notification</p>
                  )

                  return (
                    <>
                      {unseen.length > 0 && (
                        <>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide px-2 pt-2 pb-1">Nouvelles notifications</p>
                          {unseen.map(renderItem)}
                        </>
                      )}
                      {seen.length > 0 && (
                        <>
                          <DropdownMenuSeparator className="my-2" />
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide px-2 pb-1">Consultées récemment</p>
                          {seen.map(renderItem)}
                        </>
                      )}
                    </>
                  )
                })()}
              </DropdownMenuContent>
            </DropdownMenu>
          ): (
            ""
          )}

          {/* Dans la barre du haut et non dans le menu du compte, où il se
              lisait comme un réglage personnel : l'écran parle du programme
              sélectionné dans la barre latérale, pas de celui qui l'ouvre.

              Les deux titres valent pour les contextes actifs : la même
              personne peut voir ce bouton ici et pas dans le laboratoire
              suivant, ou sur un programme et pas sur l'autre. L'absence n'est
              qu'un affichage — ce sont les permissions du serveur qui
              refusent, à chaque requête. */}
          {(isOwner || isProgramAdmin) && (
            <Button
              variant="ghost"
              size="lg"
              className="rounded-full gap-1.5"
              onClick={() => setShowInvitations(true)}
            >
              <UserPlus size={16} /> Partager
            </Button>
          )}
        
        </div>

        

        {/* <div className="bg-gray-200 rounded-full border p-1 flex relative">
          {['dashboard', 'actions', 'projets', 'partenaires', 'contacts', 'finance'].map((view) => (
            <button
              key={view}
              onClick={() => setCurrentView(view)}
              className={`relative px-4 py-1 rounded-full text-sm z-10 transition-colors duration-300 ${
                currentView === view ? 'text-white' : 'text-black'
              }`}
            >
              <span className="relative z-20 capitalize">{view}</span>
              {currentView === view && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-black rounded-full z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div> */}
      </nav>

      <main className="flex-1 min-h-0 overflow-y-auto">
        {currentView === "dashboard" && <Dashboard key={refreshKey} />}
        {currentView === "actions" && <Actions key={refreshKey} />}
        {currentView === "projects" && <Projects key={refreshKey} />}
        {currentView === "partners" && <Partners key={refreshKey} />}
        {currentView === "members" && <Members key={refreshKey} />}
        {currentView === "finance" && <Finance key={refreshKey} />}
      </main>

      <ExportModal open={showExport} onClose={() => setShowExport(false)} />
      <ShareModal open={showInvitations} onClose={() => setShowInvitations(false)} isOwner={isOwner} />
      {/* Hors du DropdownMenu qui l'ouvre : un Dialog monté dans un
          DropdownMenuContent est démonté avec lui à la fermeture du menu. */}
      <CreateOrganizationModal
        open={showCreateOrg}
        onClose={() => setShowCreateOrg(false)}
        onCreate={onCreateOrganization}
      />
      <CreateProgramModal
        open={showCreateProgram}
        onClose={() => setShowCreateProgram(false)}
        onCreate={onCreateProgram}
      />
    </div>
      </SidebarInset>
    </SidebarProvider>
    
    {openCard && (
                <ActionCardViewerSheet
                    card={openCard}
                    open={!!openCard}
                    onClose={() => setOpenCard(null)}
                    onUpdated={c => {
                        setActions(prev => prev.map(x => x.id === c.id ? { ...x, ...c } : x))
                        setOpenCard(c)
                    }}
                />
            )}
    {openProject && (
                <ProjectViewerSheet
                    project={openProject}
                    open={!!openProject}
                    onClose={() => setOpenProject(null)}
                />
            )}
    <Toaster position="bottom-right" richColors closeButton />
    </ProgramContext.Provider>
    </UserContext.Provider>
  )
}
