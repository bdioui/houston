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
import { Menu, Download, RefreshCw, UserCircle, LogOut, Bell } from 'lucide-react'
import { type MemberFull, type Project, type ProjectMember, type ActionCardFull, type Comment, type FinancialAgreement, type ProjectMilestone, type Expanse, type MemberActionCard } from '@/lib/types'
import { getMembersFull, getProjects, getActionCardsFull, getAllProjectMembers, getAllMemberActionCards, getComments, getFinancialAgreements, getAllProjectMilestones, getExpanses } from '@/lib/api'
import { UserContext } from '@/lib/userContext'
import { Toaster } from 'sonner'
import ExportModal from '@/components/ExportModal'
import LoginScreen from '@/components/LoginScreen'
import { fetchMe, logout as apiLogout, type AuthUser } from '@/lib/auth'

const STORAGE_KEY = 'grist_current_member_id'

type AlertItem = {
  type: string,
  title: string, 
  seen: boolean,
  daysLeft: number,
  id: number,
}

// Porte d'entrée. AppShell n'est monté qu'une fois la session établie : ses
// appels d'API partent tous avec IsAuthenticated satisfait, et son useEffect de
// chargement — qui n'a pas de .catch() — ne peut plus donner un écran blanc.
export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setChecking(false))
  }, [])

  if (checking) return null
  if (!user) return <LoginScreen onSuccess={setUser} />
  return <AppShell onLogout={() => apiLogout().then(() => setUser(null))} />
}

function AppShell({ onLogout }: { onLogout: () => void }) {

  const [currentView, setCurrentView] = useState('dashboard')
  const [currentMember, setCurrentMember] = useState<MemberFull | null>(null)
  const [allMembers, setAllMembers] = useState<MemberFull[]>([])
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
  const [refreshKey, setRefreshKey] = useState(0)
  const [showProfilePicker, setShowProfilePicker] = useState(false)
  const [profileSearch, setProfileSearch] = useState('')

  useEffect(() => {
    Promise.all([
      getMembersFull(), getProjects(), getActionCardsFull(),
      getAllProjectMembers(), getAllMemberActionCards(),
      getComments(), getFinancialAgreements(), getAllProjectMilestones(), getExpanses(),
    ]).then(([members, projects, actions, projectsMembers, actionMembers, comments, agreements, milestones, expanses]) => {
      setAllMembers(members)
      setProjects(projects)
      setProjectMembers(projectsMembers)
      setActions(actions)
      setActionMembers(actionMembers)
      setComments(comments)
      setAgreements(agreements)
      setMilestones(milestones)
      setExpanses(expanses)
      const savedId = localStorage.getItem(STORAGE_KEY)
      if (savedId) {
        const match = members.find(m => m.id === Number(savedId))
        setCurrentMember(match ?? null)
      }
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
      .filter(c => myCardIds.has(c.id) && c.end_date && c.status_id !== 3 && c.status_id !== 4)
      .filter(c => (new Date(c.end_date).getTime() - now) / (1000 * 60 * 60 * 24) < 10)
      .map(c => ({ id: c.id, type: 'card', title: c.title, daysLeft: daysLeft(c.end_date), seen: seenIds.has(`card-${c.id}`) }))

    // 2. Projets expirant dans < 30j (non terminés)
    const projectAlerts: AlertItem[] = projects
      .filter(p => memberProjectIds.has(p.id) && p.end_date && p.status_id !== 11)
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
      .filter(m => memberProjectIds.has(m.project_id) && m.due_date && m.status_id !== 3 && m.status_id !== 4)
      .filter(m => (new Date(m.due_date).getTime() - now) / (1000 * 60 * 60 * 24) < 14)
      .map(m => {
        const proj = projects.find(p => p.id === m.project_id)
        return { id: m.id, type: 'milestone', title: proj ? `${proj.title} – ${m.title}` : m.title, daysLeft: daysLeft(m.due_date), seen: seenIds.has(`milestone-${m.id}`) }
      })

    // 5. Conventions non signées sur mes projets
    const conventionAlerts: AlertItem[] = agreements
      .filter(a => memberProjectIds.has(a.project_id) && !a.signed_date)
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

  function selectMember(member: MemberFull) {
    setCurrentMember(member)
    localStorage.setItem(STORAGE_KEY, String(member.id))
    setShowProfilePicker(false)
  }

  function clearMember() {
    setCurrentMember(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <UserContext.Provider value={currentMember}>
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <nav className="flex justify-between align-center p-4 gap-4 shrink-0">
        <div className='flex gap-2 items-center'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="rounded-md" variant="outline" size="sm">
                <Menu /> {currentMember ? (
                <>
                  <div className="flex items-center gap-2 px-2 py-2">
                    {/* <Avatar size="sm" className="h-7 w-7 border-l border-gray">
                      <AvatarImage src={currentMember.profile_image} />
                      <AvatarFallback className="text-xs" style={{ backgroundColor: currentMember.partner?.color ?? '#E7E8E2' }}>
                        {currentMember.first_name[0]}{currentMember.last_name[0]}
                      </AvatarFallback>
                    </Avatar> */}
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-medium truncate">{currentMember.first_name} {currentMember.last_name}</span>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                </>
              ) : "Utilisteur non connecté"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56" onCloseAutoFocus={() => setShowProfilePicker(false)}>

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

              {/* Sélecteur de profil */}
              {!showProfilePicker ? (
                <DropdownMenuItem
                  onSelect={e => e.preventDefault()}
                  onClick={() => { setShowProfilePicker(true); setProfileSearch('') }}
                >
                  <UserCircle /> {currentMember ? 'Changer de profil' : 'Sélectionner mon profil'}
                </DropdownMenuItem>
              ) : (
                <div
                  className="px-2 py-1"
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => e.stopPropagation()}
                >
                  <p className="text-xs text-muted-foreground mb-1.5">Qui êtes-vous ?</p>
                  <input
                    autoFocus
                    value={profileSearch}
                    onChange={e => setProfileSearch(e.target.value)}
                    placeholder="Rechercher..."
                    className="w-full text-xs border rounded px-2 py-1 mb-1.5 outline-none focus:ring-1 focus:ring-ring"
                  />
                  <div className="max-h-44 overflow-y-auto">
                    {allMembers
                      .filter(m =>
                        `${m.first_name} ${m.last_name}`.toLowerCase().includes(profileSearch.toLowerCase())
                      )
                      .map(m => (
                        <button
                          key={m.id}
                          onClick={() => selectMember(m)}
                          className="w-full text-left flex items-center gap-2 px-1 py-1.5 rounded hover:bg-accent text-sm"
                        >
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={m.profile_image} />
                            <AvatarFallback className="text-[10px]" style={{ backgroundColor: m.partner?.color ?? '#E7E8E2' }}>
                              {m.first_name[0]}{m.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">{m.first_name} {m.last_name}</span>
                        </button>
                      ))
                    }
                  </div>
                </div>
              )}

              {currentMember && !showProfilePicker && (
                <DropdownMenuItem onClick={clearMember}>
                  <UserCircle /> Changer de profil
                </DropdownMenuItem>
              )}

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

            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Boutons alertes */}
          {currentMember ? (
            <DropdownMenu>
              <DropdownMenuTrigger>
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
    </UserContext.Provider>
  )
}
