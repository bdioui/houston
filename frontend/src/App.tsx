import { useEffect, useState } from 'react'
import Dashboard from './views/Dashboard'
import Partners from './views/Partners'
import Members from './views/Members'
import Projects from './views/Projects'
import Actions from './views/Actions'
import Finance from './views/Finance'
import { motion } from "framer-motion"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import {ActionCardViewerSheet, ProjectViewerSheet} from './components/viewers'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Menu, Download, RefreshCw, LogOut, Bell, Check, ChevronDown, Building2, UserPlus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type MemberFull, type Project, type ProjectMember, type ActionCardFull, type Comment, type FinancialAgreement, type ProjectMilestone, type Expanse, type MemberActionCard, type Organization, type OrgRole, type Program } from '@/lib/types'
import { getMembersFull, getProjects, getActionCardsFull, getAllProjectMembers, getAllMemberActionCards, getComments, getFinancialAgreements, getAllProjectMilestones, getExpanses, getOrganizations, selectOrganization, getProgram, selectProgram } from '@/lib/api'
import { UserContext, ProgramContext } from '@/lib/userContext'
import { Toaster } from 'sonner'
import ExportModal from '@/components/ExportModal'
import InvitationsModal from '@/components/InvitationsModal'
import LoginScreen from '@/components/LoginScreen'
import SignupScreen from '@/components/SignupScreen'
import InvitationScreen from '@/components/InvitationScreen'
import { fetchMe, logout as apiLogout, type Session } from '@/lib/auth'
import { ApiError } from '@/lib/client'


type AlertItem = {
  type: string,
  title: string, 
  seen: boolean,
  daysLeft: number,
  id: number,
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

  useEffect(() => {
    fetchMe()
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setChecking(false))
  }, [])

  function chooseProgram(program: Program) {
    setSession(s => (s ? { ...s, program } : s))
  }

  // Contrairement au programme, changer de laboratoire ne se résout pas
  // localement : la fiche annuaire du titulaire en dépend, et le serveur vient
  // d'effacer le programme. Seul fetchMe() sait ce que devient le contexte,
  // d'où l'aller-retour plutôt qu'un setSession optimiste.
  async function chooseOrganization(id: number) {
    await selectOrganization(id)
    setSession(await fetchMe())
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
  if (!session.program) return <ProgramPicker onChoose={chooseProgram} onLogout={onLogout} />

  return <AppShell
            // Remonte tout à chaque bascule, sur les deux axes. Les données
            // déjà chargées appartiennent au contexte qu'on quitte ; les garder
            // afficherait les projets de l'un sous le budget de l'autre.
            key={`${session.organization.id}:${session.program.id}`}
            memberId={session.member_id}
            organization={session.organization}
            program={session.program}
            orgRole={session.org_role}
            onSelectProgram={chooseProgram}
            onSelectOrganization={chooseOrganization}
            onLogout={onLogout}
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

// Second écran de contexte, dans le laboratoire qui vient d'être retenu.
// N'apparaît que si le backend n'a pas pu trancher seul — c'est-à-dire dès
// qu'un compte y est affecté à plus d'un programme. Un seul, et le middleware
// l'aura déjà sélectionné : cet écran ne s'affiche jamais dans ce cas.
function ProgramPicker({ onChoose, onLogout }: { onChoose: (p: Program) => void; onLogout: () => void }) {
  const [programs, setPrograms] = useState<Program[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<number | null>(null)

  useEffect(() => {
    getProgram()
      .then(setPrograms)
      .catch(() => { setPrograms([]); setError('Liste des programmes indisponible.') })
  }, [])

  async function choose(p: Program) {
    setPending(p.id)
    try {
      // Le programme rendu par le serveur, pas celui de la liste : c'est la
      // réponse qui fait foi sur ce qui vient d'être écrit en session.
      onChoose(await selectProgram(p.id))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sélection impossible.')
      setPending(null)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Choisir un programme</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {programs === null && <p className="text-sm text-muted-foreground">Chargement…</p>}
          {programs?.length === 0 && !error && (
            <p className="text-sm text-muted-foreground">
              Aucun programme ne vous est affecté. Demandez votre rattachement à
              votre administrateur.
            </p>
          )}
          {programs?.map(p => (
            <Button
              key={p.id}
              variant="outline"
              className="w-full justify-between"
              disabled={pending !== null}
              onClick={() => choose(p)}
            >
              <span className="truncate">{p.name}</span>
              <span className="text-xs text-muted-foreground">{p.pfi || '—'}</span>
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

// Bascule de laboratoire, affichée seulement à partir de deux rattachements.
// Contrairement au programme, le laboratoire ne change pour presque personne :
// le rappeler en permanence encombrerait l'en-tête sans rien apprendre.
//
// La bascule passe par App et non par un setSession local : elle change la
// fiche annuaire du titulaire et efface le programme côté serveur, donc seul un
// fetchMe() sait dire ce que devient le contexte.
function OrganizationSwitcher({ organization, onSelect }: { organization: Organization; onSelect: (id: number) => Promise<void> }) {
  const [orgs, setOrgs] = useState<Organization[]>([])

  useEffect(() => {
    getOrganizations().then(setOrgs).catch(() => setOrgs([]))
  }, [])

  if (orgs.length < 2) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="rounded-md max-w-48" variant="ghost" size="sm">
          <Building2 />
          <span className="truncate">{organization.name}</span>
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {orgs.map(o => (
          <DropdownMenuItem
            key={o.id}
            className="flex items-center gap-2"
            onClick={() => { if (o.id !== organization.id) onSelect(o.id) }}
          >
            {o.id === organization.id ? <Check className="h-3.5 w-3.5" /> : <span className="w-3.5" />}
            <span className="flex-1 truncate text-xs">{o.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Bascule en cours de session. Toujours affiché, même sur un programme unique :
// il sert alors de rappel du contexte de travail, qui n'est visible nulle part
// ailleurs hors du tableau de bord.
function ProgramSwitcher({ program, onSelect }: { program: Program; onSelect: (p: Program) => void }) {
  const [programs, setPrograms] = useState<Program[]>([])

  useEffect(() => {
    getProgram().then(setPrograms).catch(() => setPrograms([]))
  }, [])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="rounded-md max-w-56" variant="outline" size="sm">
          <span className="truncate">{program.name}</span>
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {programs.map(p => (
          <DropdownMenuItem
            key={p.id}
            className="flex items-center gap-2"
            onClick={() => { if (p.id !== program.id) selectProgram(p.id).then(onSelect) }}
          >
            {p.id === program.id ? <Check className="h-3.5 w-3.5" /> : <span className="w-3.5" />}
            <span className="flex-1 truncate text-xs">{p.name}</span>
            <span className="text-[10px] text-muted-foreground">{p.pfi}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function AppShell({memberId, organization, program, orgRole, onSelectProgram, onSelectOrganization, onLogout}: {memberId: number | null; organization: Organization; program: Program; orgRole: OrgRole | null; onSelectProgram: (p: Program) => void; onSelectOrganization: (id: number) => Promise<void>; onLogout: () => void;}) {

  const [currentView, setCurrentView] = useState('dashboard')
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
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [showExport, setShowExport] = useState(false)
  const [showInvitations, setShowInvitations] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    Promise.all([
      getMembersFull(), getProjects(), getActionCardsFull(),
      getAllProjectMembers(), getAllMemberActionCards(),
      getComments(), getFinancialAgreements(), getAllProjectMilestones(), getExpanses(),
    ]).then(([members, projects, actions, projectsMembers, actionMembers, comments, agreements, milestones, expanses]) => {
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
      .filter((c): c is ActionCardFull & { end_date: string } => myCardIds.has(c.id) && !!c.end_date && c.status_id !== 3 && c.status_id !== 4)
      .filter(c => (new Date(c.end_date).getTime() - now) / (1000 * 60 * 60 * 24) < 10)
      .map(c => ({ id: c.id, type: 'card', title: c.title, daysLeft: daysLeft(c.end_date), seen: seenIds.has(`card-${c.id}`) }))

    // 2. Projets expirant dans < 30j (non terminés)
    const projectAlerts: AlertItem[] = projects
      .filter((p): p is Project & { end_date: string } => memberProjectIds.has(p.id) && !!p.end_date && p.status_id !== 11)
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
      .filter((m): m is ProjectMilestone & { due_date: string } => memberProjectIds.has(m.project_id) && !!m.due_date && m.status_id !== 3 && m.status_id !== 4)
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
    if (currentMember && actions.length > 0) {
        checkAndCreateAlerts()
    }
  }, [currentMember, actions, comments, milestones, agreements, expanses])

  return (
    <UserContext.Provider value={currentMember}>
    <ProgramContext.Provider value={program}>
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <nav className="flex justify-between align-center p-4 gap-4 shrink-0">
        <div className='flex gap-2 items-center'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="rounded-md" variant="outline" size="sm">
                <Menu /> 
                {currentMember && (
                  <>
                  <div className="flex items-center gap-2 px-2 py-2">
                    {<Avatar size="sm" className="h-7 w-7 border-l border-gray">
                      <AvatarImage src={currentMember?.profile_image} />
                      <AvatarFallback className="text-xs" style={{ backgroundColor: currentMember.partner?.color ?? '#E7E8E2' }}>
                        {currentMember.first_name[0]}{currentMember.last_name[0]}
                      </AvatarFallback>
                    </Avatar> }
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-medium truncate">{currentMember.first_name} {currentMember.last_name}</span>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">

              {/* Utilisateur connecté */}
              {currentMember ? (
                <>
                  <div className="flex items-center gap-2 px-2 py-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={currentMember.profile_image} />
                      <AvatarFallback className="text-xs" style={{ backgroundColor: currentMember.partner?.color ?? '#E7E8E2' }}>
                        {currentMember.first_name[0]}{currentMember.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-medium truncate">{currentMember.first_name} {currentMember.last_name}</span>
                      <span className="text-xs text-muted-foreground truncate">{currentMember.position}</span>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                </>
              ) : null}

              <DropdownMenuItem onClick={onLogout}>
                <LogOut /> Se déconnecter
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setRefreshKey(k => k + 1)}>
                <RefreshCw /> Actualiser
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowExport(true)}>
                <Download /> Exporter les données
              </DropdownMenuItem>

              {/* Le rôle vaut pour le laboratoire actif : la même personne peut
                  voir cette entrée ici et pas dans le laboratoire suivant.
                  L'absence n'est qu'un affichage — c'est IsOrganizationAdmin
                  qui refuse, à chaque requête. */}
              {orgRole === 'admin' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowInvitations(true)}>
                    <UserPlus /> Inviter au laboratoire
                  </DropdownMenuItem>
                </>
              )}

            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Boutons alertes */}
          {currentMember ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="relative rounded-md px-3 pr-4" variant="outline" size="sm">
                  <Bell />
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

          <OrganizationSwitcher organization={organization} onSelect={onSelectOrganization} />
          <ProgramSwitcher program={program} onSelect={onSelectProgram} />

        </div>

        <div className="bg-gray-200 rounded-full border p-1 flex relative">
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
        </div>
      </nav>

      <main className="flex-1 min-h-0 overflow-y-auto">
        {currentView === "dashboard" && <Dashboard key={refreshKey} />}
        {currentView === "actions" && <Actions key={refreshKey} />}
        {currentView === "projets" && <Projects key={refreshKey} />}
        {currentView === "partenaires" && <Partners key={refreshKey} />}
        {currentView === "contacts" && <Members key={refreshKey} />}
        {currentView === "finance" && <Finance key={refreshKey} />}
      </main>

      <ExportModal open={showExport} onClose={() => setShowExport(false)} />
      <InvitationsModal open={showInvitations} onClose={() => setShowInvitations(false)} />
    </div>
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
