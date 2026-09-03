import React, { useState, useEffect, useRef } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers'
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Gantt, type Task as GanttTask, ViewMode as GanttViewMode } from 'gantt-task-react'
import 'gantt-task-react/dist/index.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
    DropdownMenuCheckboxItem, DropdownMenuSeparator, DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Plus, Search, SlidersHorizontal, Pencil, Trash2, Check, X, ListChecks, Copy, FileDown, CheckIcon, Trash, Maximize2, Minimize2, Users, ExternalLink, LayoutGrid, Table2, Paperclip, Receipt, EllipsisIcon, Building2, BarChart2, BookOpen, GraduationCap, ScrollText, ChartGantt } from 'lucide-react'
import { exportToCsv } from '@/lib/utils'
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from '@/components/ui/context-menu'
import { ActionCardDetailSheet } from '@/views/actions/ActionCard'
import type { ActionCardData } from '@/views/actions/ActionCard'
import { PartnerDetailSheet } from '@/views/Partners'
import type { PartnerCardFull } from '@/lib/types'
import { motion } from "framer-motion"
import {
    getProjectCalls, getProjects, getAxes, getStatuses, getPartners, getFinancialAgreements,
    addProjectCall, updateProjectCall, deleteProjectCall,
    addProject, updateProject, deleteProject,
    getAgreementsByProject, addAgreement, updateAgreement, deleteAgreement,
    getProjectMembers, addProjectMember, removeProjectMember,
    getMembers,
    getKpis, getKpiEntries, addKpiEntry, updateKpiEntry, deleteKpiEntry,
    getProjectPartners, addProjectPartner, removeProjectPartner, updateProjectPartner,
    getProjectMilestones, addProjectMilestone, updateProjectMilestone, deleteProjectMilestone,
    getActionCardsByProject, linkActionCardToProject, removeProjectFromCard,
    getActionCardsFull, createActionCardFull, updateProjectMember, updateProjectMemberParticipationStatus, getCategories,
    addMember, addPartner,
    getTimeEntries, addTimeEntry, removeTimeEntry, updateTimeEntry,
    getAllProjectMembers,
    getFormations, getFormationsByProject, getProjectFormationLinks, addProjectFormation, removeProjectFormation,
    getProjectAttachments, addProjectAttachment, deleteProjectAttachment,
    getExpanses, getSupliers, updateExpanse,
    getBudgetCategories, getBudgetDetails,
    getPublicationsByProject, addPublication, updatePublication, deletePublication,
    getPublicationMembersByProject, addPublicationMember, deletePublicationMember,
    getLabs,
} from '@/lib/api'
import { type ProjectCall, type Project, type FinancialAgreement, type Axis, type Status, type Partner, type Member, type ProjectMember, type Kpi, type KpiEntry, type ProjectPartner, type ProjectMilestone, type ActionCardFull, type Category, type TimeEntry, type Formation, type ProjectFormation, type ProjectAttachment, type Expanse, type Supplier, type BudgetCategory, type BudgetDetail, type Publication, type PublicationMember, type Lab } from '@/lib/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import SearchInput from '@/components/SearchInput'
import MemberSearchInput from '@/components/MemberSearchInput'
import { ScrollableTabBar } from '@/components/ScrollableTabBar'

// --- Couleurs de statut ---

const PROJECT_STATUS_COLORS: Record<string, string> = {
    'En cours':   '#d1fae5',
    'Terminé':    '#f3f4f6',
    'Suspendu':   '#fef9c3',
    'En attente': '#dbeafe',
}

const AGREEMENT_STATUS_COLORS: Record<string, string> = {
    'En préparation': '#dbeafe',
    'Active':         '#d1fae5',
    'Soldée':         '#f3f4f6',
    'Annulée':        '#fee2e2',
}

const ROLES = [
    'Porteur',
    'Intervenant',
    'Participant',
    'Prospect',
    'Equipe - Lead',
    'Equipe - Contributeur',
    'Equipe - Consultant',
    'Equipe - Observateur',
]

const ROLE_ORDER = ['Porteur', 'Prospect', 'Equipe - Lead', 'Equipe - Contributeur', 'Equipe - Consultant', 'Equipe - Observateur', 'Intervenant', , 'Participant']

const STATUS_ORDER = ["En cours", "Suspendu", "En attente", "Terminé",]

const PARTNER_ROLES = ['Associé', 'Bénéficiaire', 'Cofinanceur', 'Sous-traitant']

import { PARTNER_TYPES, PALETTE } from '@/lib/constants'

const MEMBER_STATUSES = [
    'Enseignant-chercheur', 'Chercheur', 'Ingénieur', 'Doctorant',
    'Post-doc', 'BIATSS', 'Autre',
]


// --- Types enrichis ---

export type ProjectCallFull    = ProjectCall & { axis: Axis }
export type ProjectFull        = Project     & { projectCall: ProjectCallFull }
export type AgreementFull      = FinancialAgreement & { partner: Partner }
type ProjectPartnerFull = ProjectPartner & { partner: Partner }

// --- Helpers ---

function fmt(n: number) {
    return n.toLocaleString('fr-FR') + ' €'
}

function formatDate(d?: string) {
    if (!d) return null
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function financingRate(budget: number, grant: number) {
    if (!budget) return null
    return Math.round((grant / budget) * 100)
}

function projectProgress(start_date: string, end_date: string): number | null {
    if (!start_date || !end_date) return null
    const start = new Date(start_date).getTime()
    const end   = new Date(end_date).getTime()
    const now   = Date.now()
    if (end <= start) return null
    return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)))
}

// --- ProjectCard ---

type ProjectCardProps = {
    project: ProjectFull
    agreements: AgreementFull[]
    statuses: Status[]
    onClick: () => void
    selectOn: boolean
    selected: boolean
    onToggle: () => void
    onDelete: (id: number) => void
    onEdit: () => void
    selectedProjects: ProjectFull[]
    onSelectMultiple: () => void
    onSelectAll: () => void
}

function ProjectCard({ project, agreements, statuses, onClick, selectOn, selected, onToggle, onDelete, onEdit, selectedProjects, onSelectMultiple: _onSelectMultiple, onSelectAll }: ProjectCardProps) {
    const totalGrant = agreements.reduce((s, a) => s + a.grant, 0)
    const partners = [...new Map(agreements.map(a => [a.partner_id, a.partner])).values()]
    const status  = statuses.find(s => s.id === project.status_id)

    const [copied,      setCopied]      = useState(false)
    const [confirming,  setConfirming]  = useState(false)
    const [deleting,    setDeleting]    = useState(false)

    function copyTitle() {
        navigator.clipboard.writeText(project.title)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    function copyTitles() {
        navigator.clipboard.writeText(selectedProjects.map(p => p.title).join('\n'))
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    async function handleDelete() {
        setDeleting(true)
        try {
            await deleteProject(project.id)
            onDelete(project.id)
        } finally {
            setDeleting(false)
            setConfirming(false)
        }
    }

    async function handleDeleteMultiple() {
        setDeleting(true)
        try {
            await Promise.all(selectedProjects.map(p => deleteProject(p.id)))
            selectedProjects.forEach(p => onDelete(p.id))
            setConfirming(false)
        } finally {
            setDeleting(false)
        }
    }

    return (
        <ContextMenu onOpenChange={open => { if (!open) setConfirming(false) }}>
            <ContextMenuTrigger>
        <div
            onClick={selectOn ? onToggle : onClick}
            className={`bg-white border border-border rounded-xl p-4 flex flex-col gap-3 cursor-pointer transition-all duration-200 ${selected ? 'ring-2 ring-foreground shadow-none' : 'hover:shadow-md'}`}
        >
            {/* Titre + taux */}
            <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium leading-snug">{project.title}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                    {status && (
                        <Badge variant="secondary" className="text-xs rounded-full text-black"
                            style={{ backgroundColor: PROJECT_STATUS_COLORS[status.label] ?? '#f3f4f6' }}>
                            {status.label}
                        </Badge>
                    )}
                </div>
            </div>

            {/* Budget / subvention */}
            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                {project.budget > 0 && (
                    <div className="flex justify-between">
                        <span>Budget</span>
                        <span className="font-medium text-foreground">{fmt(project.budget)}</span>
                    </div>
                )}
                {totalGrant > 0 && (
                    <div className="flex justify-between">
                        <span>Subvention</span>
                        <span className="font-medium text-foreground">{fmt(totalGrant)}</span>
                    </div>
                )}
            </div>

            {/* Progression temporelle */}
            {(() => {
                const progress = projectProgress(project.start_date, project.end_date)
                if (progress === null) return null
                return (
                    <>
                    <div className="flex items-center gap-2">
                        
                        <div className="flex flex-col gap-1 pt-1">
                        <div className="flex justify-between text-xs text-muted-foreground gap-1.5">
                            <span>{formatDate(project.start_date)} → {formatDate(project.end_date)}</span>
                            <span> ({progress} %)</span>
                        </div>
                        <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: 'rgba(0,0,0,0.5)' }} />
                        </div>
                    </div>

                    </div>
                    
                    </>
                )
            })()}
            {/* Conventions + badges partenaires */}
            {agreements.length > 0 && (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
                    <div className="flex items-center gap-1 min-w-0 flex-wrap">
                        {partners.slice(0, 2).map(p => (
                            <span
                                key={p.id}
                                className="text-xs px-1.5 py-0.5 rounded-full border border-border shrink-0 truncate max-w-[90px]"
                                style={p.color ? { backgroundColor: p.color } : {}}
                            >
                                {p.name}
                            </span>
                        ))}
                        {partners.length > 2 && (
                            <span className="text-xs text-muted-foreground shrink-0">
                                +{partners.length - 2} de plus
                            </span>
                        )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                        {agreements.length} conv.
                    </span>
                </div>
            )}
        </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-52">
                {selectedProjects.length > 1 ? (
                    <>
                        <ContextMenuItem onClick={onSelectAll}>
                            <ListChecks size={13} className="mr-2" /> Tout sélectionner
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem onSelect={e => e.preventDefault()} onClick={copyTitles}>
                            {copied ? <CheckIcon size={13} className="mr-2" /> : <Copy size={13} className="mr-2" />}
                            {copied ? 'Copié !' : `Copier les titres (${selectedProjects.length})`}
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => exportToCsv(
                            'projets.csv',
                            ['Titre', 'Appel à projets', 'Axe', 'Budget (€)'],
                            selectedProjects.map(p => [
                                p.title, p.projectCall.title, p.projectCall.axis.name, p.budget,
                            ])
                        )}>
                            <FileDown size={13} className="mr-2" /> Exporter en CSV
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        {confirming ? (
                            <ContextMenuItem onSelect={e => e.preventDefault()} className="flex gap-2 p-1">
                                <Button size="sm" variant="ghost" className="h-6 text-xs flex-1 rounded-md" onClick={() => setConfirming(false)}>Annuler</Button>
                                <Button size="sm" variant="destructive" className="h-6 text-xs flex-1 rounded-md" onClick={handleDeleteMultiple} disabled={deleting}>
                                    {deleting ? '...' : 'Confirmer'}
                                </Button>
                            </ContextMenuItem>
                        ) : (
                            <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={e => e.preventDefault()} onClick={() => setConfirming(true)}>
                                <Trash2 size={13} className="mr-2" /> Supprimer ({selectedProjects.length})
                            </ContextMenuItem>
                        )}
                    </>
                ) : (
                    <>
                        <ContextMenuItem onSelect={e => e.preventDefault()} onClick={copyTitle}>
                            {copied ? <CheckIcon size={13} className="mr-2" /> : <Copy size={13} className="mr-2" />}
                            {copied ? 'Copié !' : 'Copier le titre'}
                        </ContextMenuItem>
                        <ContextMenuItem onClick={onEdit}>
                            <Pencil size={13} className="mr-2" /> Modifier
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        {confirming ? (
                            <ContextMenuItem onSelect={e => e.preventDefault()} className="flex gap-2 p-1">
                                <Button size="sm" variant="ghost" className="h-6 text-xs flex-1 rounded-md" onClick={() => setConfirming(false)}>Annuler</Button>
                                <Button size="sm" variant="destructive" className="h-6 text-xs flex-1 rounded-md" onClick={handleDelete} disabled={deleting}>
                                    {deleting ? '...' : 'Confirmer'}
                                </Button>
                            </ContextMenuItem>
                        ) : (
                            <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={e => e.preventDefault()} onClick={() => setConfirming(true)}>
                                <Trash2 size={13} className="mr-2" /> Supprimer
                            </ContextMenuItem>
                        )}
                    </>
                )}
            </ContextMenuContent>
        </ContextMenu>
    )
}

// --- Sheet Appel à projet ---

type ProjectCallSheetProps = {
    open: boolean
    onClose: () => void
    onSaved: (pc: ProjectCall) => void
    onDeleted?: (id: number) => void
    axes: Axis[]
    statuses: Status[]
    editCall?: ProjectCall
}

function ProjectCallSheet({ open, onClose, onSaved, onDeleted, axes, statuses, editCall }: ProjectCallSheetProps) {
    const [title,       setTitle]       = useState('')
    const [description, setDescription] = useState('')
    const [axisId,      setAxisId]      = useState<number>(0)
    const [statusId,    setStatusId]    = useState<number>(0)
    const [startDate,   setStartDate]   = useState('')
    const [endDate,     setEndDate]     = useState('')
    const [budget,      setBudget]      = useState<number>(0)
    const [submitting,  setSubmitting]  = useState(false)
    const [deleting,    setDeleting]    = useState(false)
    const [confirming,  setConfirming]  = useState(false)
    const [error,       setError]       = useState<string | null>(null)

    useEffect(() => {
        if (!open) return
        if (editCall) {
            setTitle(editCall.title)
            setDescription(editCall.description)
            setAxisId(editCall.axis_id)
            setStatusId(editCall.status_id)
            setStartDate(editCall.start_date)
            setEndDate(editCall.end_date)
            setBudget(editCall.budget ?? 0)
        } else {
            setTitle(''); setDescription(''); setAxisId(axes[0]?.id ?? 0)
            setStatusId(statuses[0]?.id ?? 0); setStartDate(''); setEndDate(''); setBudget(0)
        }
        setError(null)
        setConfirming(false)
    }, [open])

    async function handleSubmit() {
        if (!title.trim() || !axisId) { setError('Titre et axe sont obligatoires.'); return }
        setSubmitting(true)
        try {
            const fields = { title, description, axis_id: axisId, status_id: statusId, start_date: startDate, end_date: endDate, budget }
            if (editCall) {
                await updateProjectCall(editCall.id, fields)
                onSaved({ ...editCall, ...fields })
            } else {
                const pc = await addProjectCall(fields)
                onSaved(pc)
            }
            onClose()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Erreur inconnue')
        } finally {
            setSubmitting(false)
        }
    }

    async function handleDeleteCall() {
        if (!editCall) return
        setDeleting(true)
        try {
            await deleteProjectCall(editCall.id)
            onDeleted?.(editCall.id)
            onClose()
        } finally {
            setDeleting(false)
            setConfirming(false)
        }
    }

    const aapStatuses = statuses.filter(s => s.context === 'project_call')

    return (
        <Sheet open={open} onOpenChange={v => { if (!v) { setConfirming(false); onClose() } }}>
            <SheetContent side="right" showCloseButton={false} className="!w-[440px] flex flex-col gap-0 p-0 rounded-md">
                <SheetHeader className="px-6 py-4 border-b flex flex-row items-center justify-between">
                    <SheetTitle>{editCall ? 'Modifier le dispositif' : 'Nouveau dispositif'}</SheetTitle>
                    {editCall && onDeleted && (
                        confirming ? (
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-destructive">Supprimer ?</span>
                                <Button variant="destructive" size="sm" className="h-7 ml-1" onClick={handleDeleteCall} disabled={deleting}>
                                    {deleting ? '...' : 'Confirmer'}
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7" onClick={() => setConfirming(false)}>Annuler</Button>
                            </div>
                        ) : (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive shrink-0" onClick={() => setConfirming(true)}>
                                <Trash2 size={14} />
                            </Button>
                        )
                    )}
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <Label>Titre *</Label>
                        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre du dispositif" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label>Description</Label>
                        <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Description..." />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label>Axe *</Label>
                        <Select value={axisId ? String(axisId) : ''} onValueChange={v => setAxisId(Number(v))}>
                            <SelectTrigger><SelectValue placeholder="Choisir un axe" /></SelectTrigger>
                            <SelectContent>
                                {axes.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    {aapStatuses.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                            <Label>Statut</Label>
                            <Select value={statusId ? String(statusId) : ''} onValueChange={v => setStatusId(Number(v))}>
                                <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
                                <SelectContent>
                                    {aapStatuses.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="flex gap-4">
                        <div className="flex flex-col gap-1.5 flex-1">
                            <Label>Date de début</Label>
                            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <div className="flex flex-col gap-1.5 flex-1">
                            <Label>Date de fin</Label>
                            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label>Budget alloué (€)</Label>
                        <Input
                            type="number"
                            min={0}
                            value={budget || ''}
                            onChange={e => setBudget(Number(e.target.value))}
                            placeholder="0"
                        />
                    </div>
                </div>

                <SheetFooter className="px-6 py-4 border-t flex flex-col gap-2">
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={onClose} disabled={submitting} className="rounded-md">Annuler</Button>
                        <Button onClick={handleSubmit} disabled={submitting} className="rounded-md">
                            {submitting ? 'Enregistrement...' : editCall ? 'Enregistrer' : 'Créer'}
                        </Button>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}

// --- Sheet Nouveau projet ---

type ProjectSheetProps = {
    open: boolean
    onClose: () => void
    onSaved: (p: Project) => void
    projectCalls: ProjectCall[]
    statuses: Status[]
    defaultCallId?: number
}

function ProjectSheet({ open, onClose, onSaved, projectCalls, statuses, defaultCallId}: ProjectSheetProps) {
    const projectStatuses = statuses.filter(s => s.context === 'project')

    const [title,       setTitle]       = useState('')
    const [description, setDescription] = useState('')
    const [budget,      setBudget]      = useState('')
    const [callId,      setCallId]      = useState<number>(0)
    const [statusId,    setStatusId]    = useState<number>(0)
    const [startDate, setStartDate]      = useState<string | null>(null)
    const [endDate, setEndDate]      = useState<string | null>(null)
    const [submitting,  setSubmitting]  = useState(false)
    const [error,       setError]       = useState<string | null>(null)

    useEffect(() => {
        if (!open) return
        setTitle(''); setDescription(''); setBudget('')
        setCallId(defaultCallId ?? projectCalls[0]?.id ?? 0)
        setStatusId(projectStatuses[0]?.id ?? 0)
        setError(null)
    }, [open])

    async function handleSubmit() {
        if (!title.trim() || !callId) { setError('Titre et dispositif sont obligatoires.'); return }
        setSubmitting(true)
        try {
            const p = await addProject({ title, description, budget: Number(budget) || 0, project_call_id: callId, status_id: statusId, start_date: startDate || "", end_date: endDate || ""})
            onSaved(p)
            onClose()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Erreur inconnue')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
            <SheetContent side="right" showCloseButton={false} className="!w-[440px] flex flex-col gap-0 p-0">
                <SheetHeader className="px-6 py-4 border-b">
                    <SheetTitle>Nouveau projet</SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <Label>Titre *</Label>
                        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre du projet" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label>Description</Label>
                        <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Description du projet..." />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label>Dispositif *</Label>
                        <Select value={callId ? String(callId) : ''} onValueChange={v => setCallId(Number(v))}>
                            <SelectTrigger><SelectValue placeholder="Choisir un AAP" /></SelectTrigger>
                            <SelectContent>
                                {projectCalls.map(pc => <SelectItem key={pc.id} value={String(pc.id)}>{pc.title}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    
                    {projectStatuses.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                        <Label>Statut</Label>
                        <Select value={statusId ? String(statusId) : ''} onValueChange={v => setStatusId(Number(v))}>
                            <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
                            <SelectContent>
                                {projectStatuses.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    )}

                     <div className="flex gap-2">
                        <div className="flex flex-col gap-1 flex-1">
                            <Label className="text-xs text-muted-foreground">Début</Label>
                            <Input type="date" onChange={e => setStartDate(e.target.value)} className="h-8 text-xs" />
                        </div>
                        <div className="flex flex-col gap-1 flex-1">
                            <Label className="text-xs text-muted-foreground">Fin</Label>
                            <Input type="date" onChange={e => setEndDate(e.target.value)} className="h-8 text-xs" />
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                        <Label>Budget total (€)</Label>
                        <Input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="0" />
                    </div>
                </div>

                <SheetFooter className="px-6 py-4 border-t flex flex-col gap-2">
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={onClose} disabled={submitting} className="rounded-md">Annuler</Button>
                        <Button onClick={handleSubmit} disabled={submitting} className="rounded-md">
                            {submitting ? 'Création...' : 'Créer'}
                        </Button>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}

// --- Dialog détail convention ---

type AgreementDetailProps = {
    open: boolean
    onClose: () => void
    agreement: AgreementFull | null
    partners: Partner[]
    statuses: Status[]
    axes: Axis[]
    projectId: number
    budgetDetails: BudgetDetail[]
    onSaved: (a: AgreementFull) => void
    onDeleted: (id: number) => void
}

function AgreementDetailDialog({ open, onClose, agreement, partners, statuses, axes, projectId, onSaved, onDeleted: _onDeleted, budgetDetails}: AgreementDetailProps) {
    const [editing, setEditing] = useState(false)

    useEffect(() => {
        if (!open) setEditing(false)
    }, [open])

    if (!agreement) return null

    const status = statuses.find(s => s.id === agreement.status_id)
    const rate   = financingRate(agreement.budget, agreement.grant)

    return (
        <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
            <DialogContent showCloseButton={false} style={{ maxWidth: '600px' }}>
                <DialogHeader>
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-1"> 
                            <DialogTitle className="text-base font-semibold leading-snug">{agreement.title}</DialogTitle>
                            <div className="flex items-center gap-2">
                                <span
                                    className="text-xs px-1.5 py-0.5 rounded-full border border-border"
                                    style={agreement.partner.color ? { backgroundColor: agreement.partner.color } : {}}
                                >
                                    {agreement.partner.name}
                                </span>
                                {status && (
                                    <span
                                        className="text-xs px-1.5 py-0.5 rounded-full border border-border text-black"
                                        style={{ backgroundColor: AGREEMENT_STATUS_COLORS[status.label] ?? '#f3f4f6' }}
                                    >
                                        {status.label}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditing(e => !e)}>
                                {editing ? "" : <Pencil size={13} />}
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClose}>
                                <X size={13} />
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex flex-col gap-4 mt-2">
                    {!editing && (
                        <div className="flex flex-col gap-3">
                            {agreement.description && (
                                <p className="text-sm text-muted-foreground">{agreement.description}</p>
                            )}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                {agreement.budget > 0 && (
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-muted-foreground">Budget</span>
                                        <span className="font-medium text-foreground">{fmt(agreement.budget)}</span>
                                    </div>
                                )}
                                {agreement.grant > 0 && (
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-muted-foreground">Subvention</span>
                                        <span className="font-medium text-foreground">{fmt(agreement.grant)}</span>
                                    </div>
                                )}
                                {rate !== null && (
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-muted-foreground">Taux financé</span>
                                        <span className="font-medium text-foreground">{rate} %</span>
                                    </div>
                                )}
                                {agreement.signed_date && (
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-muted-foreground">Date de signature</span>
                                        <span className="font-medium text-foreground">{formatDate(agreement.signed_date)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {editing && (
                        <AgreementForm
                            partners={partners}
                            statuses={statuses}
                            axes={axes}
                            projectId={projectId}
                            budgetDetails={budgetDetails}
                            initial={agreement}
                            onSaved={a => { onSaved(a); setEditing(false) }}
                            onCancel={() => setEditing(false)}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

type AgreementRowProps = {
    agreement: AgreementFull
    statuses: Status[]
    axe?: Axis
    onEdit: (a: AgreementFull) => void
    onDelete: (id: number) => void
    onOpen: (a: AgreementFull) => void
}


function AgreementRow({ agreement: a, statuses, axe, onEdit, onDelete, onOpen }: AgreementRowProps) {
    const rate   = financingRate(a.budget, a.grant)
    const status = statuses.find(s => s.id === a.status_id)
    return (
        <>
                <div onClick={() => onOpen(a)} className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border bg-muted/40 group cursor-pointer hover:bg-muted/70 transition-colors">
                    <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium truncate">{a.title}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {axe && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full border border-border shrink-0 text-black">
                                    {axe.name}
                                </span>
                            )}
                            {status && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full border border-border shrink-0 text-black"
                                    style={{ backgroundColor: AGREEMENT_STATUS_COLORS[status.label] ?? '#f3f4f6' }}>
                                    {status.label}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span
                                        className="text-xs px-2.5 py-0.5 rounded-full border border-border truncate inline-block max-w-[120px]"
                                        style={a.partner.color ? { backgroundColor: a.partner.color } : {}}
                                    >
                                        {a.partner.name}
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{a.partner.name}</p>
                                </TooltipContent>
                            </Tooltip>
                            {a.grant > 0 && <span className="font-medium text-foreground">{fmt(a.grant)}</span>}
                            {rate !== null && <span>{rate} %</span>}
                            {a.signed_date && <span>{formatDate(a.signed_date)}</span>}
                        </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0 ml-2">
                        <div
                            className="h-7 w-7 flex items-center justify-center rounded hover:bg-background text-muted-foreground hover:text-foreground"
                            onClick={e => { e.stopPropagation(); onEdit(a) }}
                        >
                            <Pencil size={13} />
                        </div>
                        <div
                            className="h-7 w-7 flex items-center justify-center rounded hover:bg-background text-muted-foreground hover:text-destructive"
                            onClick={e => { e.stopPropagation(); onDelete(a.id) }}
                        >
                            <Trash2 size={13} />
                        </div>
                    </div>
                </div>
        </>
    )
}

// --- Formulaire convention inline ---

type AgreementFormProps = {
    partners: Partner[]
    statuses: Status[]
    axes: Axis[]
    projectId: number
    initial?: AgreementFull
    budgetCategories?: BudgetCategory[]
    budgetDetails?: BudgetDetail[]
    onSaved: (a: AgreementFull) => void
    onCancel: () => void
}

function AgreementForm({ partners, statuses, axes, projectId, initial, budgetCategories: _budgetCategories, budgetDetails, onSaved, onCancel }: AgreementFormProps) {
    const agreementStatuses = statuses.filter(s => s.context === 'financial_agreement')
    const defaultStatusId   = agreementStatuses[0]?.id ?? 14

    const [title,         setTitle]         = useState(initial?.title          ?? '')
    const [description,   setDescription]   = useState(initial?.description    ?? '')
    const [partnerId,     setPartnerId]      = useState<number>(initial?.partner_id ?? partners[0]?.id ?? 0)
    const [statusId,      setStatusId]       = useState<number>(initial?.status_id ?? defaultStatusId)
    const [axisId,        setAxisId]         = useState<number | null>(initial?.axis_id ?? null)
    const [budget,        setBudget]         = useState(initial?.budget ? String(initial.budget) : '')
    const [grant,         setGrant]          = useState(initial?.grant  ? String(initial.grant)  : '')
    const [signedDate,    setSignedDate]     = useState(initial?.signed_date ?? '')
    const [budgetDetailId, setBudgetDetailId] = useState<number | null>(initial?.budget_detail_id ?? null)
    const [submitting,    setSubmitting]     = useState(false)
    const [error,         setError]          = useState<string | null>(null)

    const budgetDetailMap   = new Map((budgetDetails ?? []).map(d => [d.id, d]))
    const leafBudgetDetails = (budgetDetails ?? []).filter(d => d.parent_id !== null)
    const selectedDetail    = leafBudgetDetails.find(d => d.id === budgetDetailId) ?? null

    async function handleSubmit() {
        if (!title.trim() || !partnerId) { setError('Titre et partenaire sont obligatoires.'); return }
        setSubmitting(true)
        try {
            const fields = {
                title, description, partner_id: partnerId, project_id: projectId,
                axis_id: axisId, status_id: statusId,
                budget: Number(budget) || 0, grant: Number(grant) || 0, signed_date: signedDate,
                budget_detail_id: budgetDetailId,
            }
            const partner = partners.find(p => p.id === partnerId)!
            if (initial) {
                await updateAgreement(initial.id, fields)
                onSaved({ ...initial, ...fields, partner })
            } else {
                const a = await addAgreement(fields)
                onSaved({ ...a, partner })
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Erreur inconnue')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="flex flex-col gap-3 p-3 rounded-lg border border-border bg-muted/30">
            <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Titre *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre de la convention" className="h-8 text-xs" />
            </div>
            <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Description..." className="text-xs" />
            </div>
            <div className="flex gap-3">
                <div className="flex flex-col gap-1.5 flex-1">
                    <Label className="text-xs">Partenaire *</Label>

                    <SearchInput
                        data={partners}
                        onSelect={p => setPartnerId(p.id)}
                        getLabel={p => p.name}
                        placeholder="Rechercher un partenaire..."
                        value={partners.find(p => p.id === partnerId)?.name}
                    />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                    <Label className="text-xs">Statut</Label>
                    <Select value={statusId ? String(statusId) : ''} onValueChange={v => setStatusId(Number(v))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Statut" /></SelectTrigger>
                        <SelectContent>
                            {agreementStatuses.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Axe</Label>
                <Select value={axisId ? String(axisId) : 'none'} onValueChange={v => setAxisId(v === 'none' ? null : Number(v))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Aucun axe" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Aucun axe</SelectItem>
                        {axes.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex gap-3">
                <div className="flex flex-col gap-1.5 flex-1">
                    <Label className="text-xs">Budget (€)</Label>
                    <Input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="0" className="h-8 text-xs" />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                    <Label className="text-xs">Subvention (€)</Label>
                    <Input type="number" value={grant} onChange={e => setGrant(e.target.value)} placeholder="0" className="h-8 text-xs" />
                </div>
            </div>
            <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Date de signature</Label>
                <Input type="date" value={signedDate} onChange={e => setSignedDate(e.target.value)} className="h-8 text-xs" />
            </div>
            {leafBudgetDetails.length > 0 && (
                <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">Ligne budgétaire</Label>
                    <SearchInput
                        data={leafBudgetDetails}
                        onSelect={d => setBudgetDetailId(d.id)}
                        getLabel={d => d.title}
                        placeholder="Rechercher une ligne budgétaire..."
                        value={selectedDetail ? `${budgetDetailMap.get(selectedDetail.parent_id!)?.title ?? ''} › ${selectedDetail.title}` : undefined}
                        groupBy={d => ({ primary: budgetDetailMap.get(d.parent_id!)?.title ?? '' })}
                    />
                    {budgetDetailId && (
                        <button onClick={() => setBudgetDetailId(null)} className="self-start text-[10px] text-muted-foreground hover:text-foreground underline">
                            Retirer la ligne budgétaire
                        </button>
                    )}
                </div>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={onCancel} disabled={submitting} className="rounded-md">Annuler</Button>
                <Button size="sm" onClick={handleSubmit} disabled={submitting} className="rounded-md">
                    <Check size={13} className="mr-1" />
                    {submitting ? 'Enregistrement...' : initial ? 'Enregistrer' : 'Ajouter'}
                </Button>
            </div>
        </div>
    )
}


// --- Composant recherche membre avec suggestions ---

// --- Formulaire ajout partenaire projet ---

type ProjectPartnerFormProps = {
    partners: Partner[]
    initial?: ProjectPartnerFull
    onSaved: (partnerId: number, role: string, amount: number | null, label: string | null) => Promise<void>
    onCancel: () => void
}

function ProjectPartnerForm({ partners, initial, onSaved, onCancel }: ProjectPartnerFormProps) {
    const [partnerId,   setPartnerId]   = useState<number>(initial?.partner_id ?? partners[0]?.id ?? 0)
    const [role,        setRole]        = useState(initial?.role ?? PARTNER_ROLES[0])
    const [amount,      setAmount]      = useState(initial?.amount != null ? String(initial.amount) : '')
    const [label,       setLabel]       = useState(initial?.label ?? '')
    const [submitting,  setSubmitting]  = useState(false)

    async function handleSubmit() {
        if (!partnerId) return
        setSubmitting(true)
        try {
            await onSaved(partnerId, role, amount ? Number(amount) : null, label || null)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-muted/30">
            <div className="flex gap-2">
                <div className="flex-1">
                    <SearchInput
                        data={partners}
                        onSelect={p => setPartnerId(p.id)}
                        getLabel={p => p.name}
                        placeholder="Partenaire..."
                        value={partners.find(p => p.id === partnerId)?.name}
                    />
                </div>
                <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {PARTNER_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex gap-2">
                <Input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="Montant (€) — optionnel"
                    className="h-8 text-xs flex-1"
                />
                {amount && (
                    <Input
                        value={label}
                        onChange={e => setLabel(e.target.value)}
                        placeholder="Nature (ex: Apport en nature)"
                        className="h-8 text-xs flex-1"
                    />
                )}
            </div>
            <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={onCancel} disabled={submitting} className="rounded-md">Annuler</Button>
                <Button size="sm" onClick={handleSubmit} disabled={submitting || !partnerId} className="rounded-md">
                    <Check size={13} className="mr-1" />{submitting ? '...' : 'Ajouter'}
                </Button>
            </div>
        </div>
    )
}

// --- Milestone components ---

const MILESTONE_STATUS_COLORS: Record<string, string> = {
    'En cours':  '#dbeafe',
    'Terminé':   '#dcfce7',
    'Planifié':  '#f3f4f6',
    'Annulé':    '#f3f4f6',
    'A traiter': '#fee2e2',
    'A faire':   '#fee2e2',
}
const MILESTONE_STATUS_BORDER: Record<string, string> = {
    'En cours':  '#93c5fd',
    'Terminé':   '#86efac',
    'Planifié':  '#d1d5db',
    'Annulé':    '#d1d5db',
    'A traiter': '#fca5a5',
    'A faire':   '#fca5a5',
}

type MilestoneRowProps = {
    milestone: ProjectMilestone
    statuses: Status[]
    onEdit: () => void
    onDelete: () => void
}

function MilestoneRow({ milestone: m, statuses, onEdit, onDelete }: MilestoneRowProps) {
    const status = statuses.find(s => s.id === m.status_id)
    const isTermine = status?.label === 'Terminé'
    const isAnnule = status?.label === 'Annulé'
    const dotBg = MILESTONE_STATUS_COLORS[status?.label ?? ''] ?? '#f3f4f6'
    const dotBorder = MILESTONE_STATUS_BORDER[status?.label ?? ''] ?? '#d1d5db'
    return (
        <div className="relative flex gap-3 group">
            <div className="flex flex-col items-center shrink-0">
                <div
                    className="w-3 h-3 rounded-full border-2 shrink-0 mt-1 z-10"
                    style={{ backgroundColor: dotBg, borderColor: dotBorder }}
                />
            </div>
            <div className="flex-1 min-w-0 pb-5">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-0.5 min-w-0">
                        <span className={`text-xs font-medium ${isTermine || isAnnule ? 'line-through text-muted-foreground' : ''}`}>{m.title}</span>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            {m.due_date && <span>{formatDate(m.due_date)}</span>}
                            {status && <span className="px-1.5 py-0.5 rounded-full" style={{ backgroundColor: dotBg, border: `1px solid ${dotBorder}` }}>{status.label}</span>}
                        </div>
                        {m.description && <p className="text-[10px] text-muted-foreground mt-0.5">{m.description}</p>}
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
                        <div className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer" onClick={onEdit}>
                            <Pencil size={11} />
                        </div>
                        <div className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-destructive cursor-pointer" onClick={onDelete}>
                            <Trash2 size={11} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

type MilestoneFormProps = {
    statuses: Status[]
    initial?: ProjectMilestone
    onSaved: (fields: Omit<ProjectMilestone, 'id' | 'project_id'>) => Promise<void>
    onCancel: () => void
}

function MilestoneForm({ statuses, initial, onSaved, onCancel }: MilestoneFormProps) {
    const milestoneStatuses = statuses.filter(s => s.context === 'action_card')
    const [title,       setTitle]       = useState(initial?.title ?? '')
    const [description, setDescription] = useState(initial?.description ?? '')
    const [dueDate,     setDueDate]     = useState(initial?.due_date ?? '')
    const [statusId,    setStatusId]    = useState<number>(initial?.status_id ?? milestoneStatuses[0]?.id ?? 0)
    const [submitting,  setSubmitting]  = useState(false)

    async function handleSubmit() {
        if (!title.trim()) return
        setSubmitting(true)
        try {
            await onSaved({ title, description, due_date: dueDate, status_id: statusId })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-muted/30">
            <div className="flex gap-2">
                <Input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Titre du jalon *"
                    className="h-8 text-xs flex-1"
                />
                <Select value={statusId ? String(statusId) : ''} onValueChange={v => setStatusId(Number(v))}>
                    <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Statut" /></SelectTrigger>
                    <SelectContent>
                        {milestoneStatuses.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex gap-2">
                <Input
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Description (optionnel)"
                    className="h-8 text-xs flex-1"
                />
                <Input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="h-8 text-xs w-36"
                />
            </div>
            <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={onCancel} disabled={submitting} className="rounded-md">Annuler</Button>
                <Button size="sm" onClick={handleSubmit} disabled={submitting || !title.trim()} className="rounded-md">
                    <Check size={13} className="mr-1" />{submitting ? '...' : initial ? 'Enregistrer' : 'Ajouter'}
                </Button>
            </div>
        </div>
    )
}

// --- Formulaire création rapide fiche action ---

type ActionCardQuickCreateFormProps = {
    projectId: number
    statuses: Status[]
    members: Member[]
    partners: Partner[]
    onSaved: (card: ActionCardFull & { linkId: number }) => void
    onCancel: () => void
}

function ActionCardQuickCreateForm({ projectId, statuses, members, partners, onSaved, onCancel }: ActionCardQuickCreateFormProps) {
    const [categories,  setCategories]  = useState<Category[]>([])
    const [title,       setTitle]       = useState('')
    const [categoryId,  setCategoryId]  = useState<number>(0)
    const [statusId,    setStatusId]    = useState<number>(0)
    const [endDate,     setEndDate]     = useState('')
    const [ownerId,     setOwnerId]     = useState<number>(members[0]?.id ?? 0)
    const [submitting,  setSubmitting]  = useState(false)

    const actionStatuses = statuses.filter(s => s.context === 'action_card')
    const partnerMap = new Map(partners.map(p => [p.id, p]))

    useEffect(() => {
        getCategories().then(cats => {
            setCategories(cats)
            if (cats.length > 0) setCategoryId(cats[0].id)
        })
        if (actionStatuses.length > 0) setStatusId(actionStatuses[0].id)
    }, [])

    async function handleSubmit() {
        if (!title.trim() || !categoryId || !ownerId) return
        setSubmitting(true)
        try {
            const card = await createActionCardFull({
                title, description: '', start_date: '', end_date: endDate,
                status_id: statusId, category_id: categoryId, axis_id: null,
                owner_id: ownerId, members: [], project_id: null,
                todo_title: '', todo_items: [],
            })
            const linkId = await linkActionCardToProject(projectId, card.id)
            onSaved({ ...card, linkId })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-muted/30">
            <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Titre de la fiche *"
                className="h-8 text-xs"
                autoFocus
            />
            <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                    <SearchInput
                        data={categories}
                        onSelect={c => setCategoryId(c.id)}
                        getLabel={c => c.title}
                        placeholder="Catégorie..."
                        value={categories.find(c => c.id === categoryId)?.title}
                    />
                </div>
                <Select value={statusId ? String(statusId) : ''} onValueChange={v => setStatusId(Number(v))}>
                    <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Statut" /></SelectTrigger>
                    <SelectContent>
                        {actionStatuses.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                    <SearchInput
                        data={members}
                        onSelect={m => setOwnerId(m.id)}
                        getLabel={m => `${m.first_name} ${m.last_name}`}
                        placeholder="Responsable..."
                        value={(() => { const m = members.find(m => m.id === ownerId); return m ? `${m.first_name} ${m.last_name}` : undefined })()}
                        renderItem={m => {
                            const p = partnerMap.get(m.partner_id)
                            return (
                                <div className="flex items-center justify-between gap-2 w-full">
                                    <span>{m.first_name} {m.last_name}</span>
                                    {p && <span className="text-xs text-muted-foreground shrink-0">{p.name}</span>}
                                </div>
                            )
                        }}
                    />
                </div>
                <Input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="h-8 text-xs w-36 shrink-0"
                />
            </div>
            <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={onCancel} disabled={submitting} className="rounded-md">Annuler</Button>
                <Button size="sm" onClick={handleSubmit} disabled={submitting || !title.trim()} className="rounded-md">
                    <Check size={13} className="mr-1" />{submitting ? '...' : 'Créer'}
                </Button>
            </div>
        </div>
    )
}

// --- Formulaire création rapide membre ---

type MemberQuickCreateFormProps = {
    partners: Partner[]
    projectRole: string
    existingEmails?: string[]
    onSaved: (member: Member) => void
    onCancel: () => void
}

function MemberQuickCreateForm({ partners, projectRole, existingEmails = [], onSaved, onCancel }: MemberQuickCreateFormProps) {
    const [firstName,  setFirstName]  = useState('')
    const [lastName,   setLastName]   = useState('')
    const [email,      setEmail]      = useState('')
    const [position,   setPosition]   = useState('')
    const [statusVal,  setStatusVal]  = useState(MEMBER_STATUSES[0])
    const [partnerId,  setPartnerId]  = useState<number>(partners[0]?.id ?? 0)
    const [submitting, setSubmitting] = useState(false)
    const [emailError, setEmailError] = useState<string | null>(null)

    async function handleSubmit() {
        if (!firstName.trim() || !lastName.trim()) return
        if (email.trim() && existingEmails.map(e => e.toLowerCase()).includes(email.trim().toLowerCase())) {
            setEmailError('Un membre avec cet email existe déjà.')
            return
        }
        setSubmitting(true)
        try {
            const member = await addMember({
                first_name: firstName, last_name: lastName,
                email, position, status: statusVal,
                partner_id: partnerId, lab_id: 0,
                tel: '', genre: '', profile_image: '', is_staff: false,
            })
            onSaved(member)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-muted/30">
            <div className="flex gap-2">
                <Input value={firstName} onChange={e => setFirstName(e.target.value)}
                    placeholder="Prénom *" className="h-8 text-xs flex-1" autoFocus />
                <Input value={lastName} onChange={e => setLastName(e.target.value)}
                    placeholder="Nom *" className="h-8 text-xs flex-1" />
            </div>
            <div className="flex flex-col gap-1">
                <div className="flex gap-2">
                    <Input value={email} onChange={e => { setEmail(e.target.value); setEmailError(null) }}
                        placeholder="Email" className={`h-8 text-xs flex-1 ${emailError ? 'border-destructive' : ''}`} type="email" />
                    <Input value={position} onChange={e => setPosition(e.target.value)}
                        placeholder="Fonction" className="h-8 text-xs flex-1" />
                </div>
                {emailError && <p className="text-xs text-destructive">{emailError}</p>}
            </div>
            <div className="flex gap-2">
                <Select value={statusVal} onValueChange={setStatusVal}>
                    <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {MEMBER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
                <SearchInput
                    data={partners}
                    onSelect={p => setPartnerId(p.id)}
                    getLabel={p => p.name}
                    placeholder="Partenaire..."
                    value={partners.find(p => p.id === partnerId)?.name}
                />
            </div>
            <p className="text-xs text-muted-foreground">Rôle projet : <span className="font-medium text-foreground">{projectRole}</span></p>
            {(!firstName.trim() || !lastName.trim()) && (
                <p className="text-xs text-destructive">Prénom et nom sont obligatoires.</p>
            )}
            <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={onCancel} disabled={submitting} className="rounded-md">Annuler</Button>
                <Button size="sm" onClick={handleSubmit} disabled={submitting || !firstName.trim() || !lastName.trim()} className="rounded-md">
                    <Check size={13} className="mr-1" />{submitting ? '...' : 'Créer et ajouter'}
                </Button>
            </div>
        </div>
    )
}

// --- Formulaire création rapide partenaire ---

type PartnerQuickCreateFormProps = {
    projectRole: string
    onSaved: (partner: Partner) => void
    onCancel: () => void
}

function PartnerQuickCreateForm({ projectRole: _projectRole, onSaved, onCancel }: PartnerQuickCreateFormProps) {
    const [name,       setName]       = useState('')
    const [type,       setType]       = useState(PARTNER_TYPES[0])
    const [color,      setColor]      = useState('#E7E8E2')
    const [submitting, setSubmitting] = useState(false)

    async function handleSubmit() {
        if (!name.trim()) return
        setSubmitting(true)
        try {
            const partner = await addPartner({
                name, type, color,
                description: '', logo: '', status_id: 0, consortium: false,
            })
            onSaved(partner)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-muted/30">
            <div className="flex gap-2">
                <Input value={name} onChange={e => setName(e.target.value)}
                    placeholder="Nom du partenaire *" className="h-8 text-xs flex-1" autoFocus />
                <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="h-8 text-xs w-50 shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent position="popper">
                        {PARTNER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex flex-wrap gap-1.5">
                {PALETTE.map(c => (
                    <button key={c.hexa} title={c.label} type="button" onClick={() => setColor(c.hexa)}
                        className="w-4 h-7 rounded-full border-2 transition-all"
                        style={{ backgroundColor: c.hexa, borderColor: color === c.hexa ? '#000' : 'transparent' }}
                    />
                ))}
            </div>
            <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={onCancel} disabled={submitting} className="rounded-md">Annuler</Button>
                <Button size="sm" onClick={handleSubmit} disabled={submitting || !name.trim()} className="rounded-md">
                    <Check size={13} className="mr-1" />{submitting ? '...' : 'Créer et ajouter'}
                </Button>
            </div>
        </div>
    )
}

// --- Sheet détail projet ---

export type ProjectDetailSheetProps = {
    project: ProjectFull | null
    open: boolean
    onClose: () => void
    onUpdated: (p: Project) => void
    onDeleted: (id: number) => void
    onAgreementAdded: (a: FinancialAgreement) => void
    onAgreementDeleted: (id: number) => void
    partners: Partner[]
    projectCalls: ProjectCall[]
    axes: Axis[]
    statuses: Status[]
    members: Member[]
    projectTimes: TimeEntry[]
    axis: Axis[]
    onMemberAdd?: (projectId: number, memberId: number) => void
    onMemberRemove?: (id: number) => void
    onOpen?: (id: number) => void
    onMemberCreated?: (m: Member) => void
    onPartnerCreated?: (p: Partner) => void
    onTimeEntryAdded?: (e: TimeEntry) => void
    onTimeEntryUpdated?: (e: TimeEntry) => void
    onTimeEntryDeleted?: (id: number) => void
    allFormations: Formation[]
}

type detailViewMode = 'overview' | 'participants' | 'partners' | 'kpis' | 'publications' | 'formations' | 'tasks' | 'conventions' | 'budget' | 'files'

function SortableTab({ mode, label, icon, isActive, isEmpty, onActivate, onRemove }: {
    mode: detailViewMode
    label: string
    icon: React.ReactNode
    isActive: boolean
    isEmpty: boolean
    onActivate: () => void
    onRemove: () => void
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: mode })
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
    return (
        <button
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={onActivate}
            className={`relative flex items-center gap-1.5 px-3 py-2 text-sm z-10 transition-colors duration-300 text-xs whitespace-nowrap cursor-pointer active:cursor-grabbing ${isActive ? 'text-bold' : 'text-black'}`}
        >
            <span className="relative z-20 flex items-center gap-1.5">
                {icon}{label}
                {isEmpty && (
                    <span
                        role="button"
                        onClick={e => { e.stopPropagation(); onRemove() }}
                        className="ml-0.5 text-muted-foreground hover:text-foreground transition-colors leading-none"
                    >
                        <X size={10} />
                    </span>
                )}
            </span>
            {isActive && (
                <motion.div layoutId="activeDetailProjectTab" className="absolute inset-0 border-b-2 border-black z-10" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />
            )}
        </button>
    )
}

export function ProjectDetailSheet({ project, open, onClose, onUpdated, onDeleted, onAgreementAdded, onAgreementDeleted, partners, projectCalls, axes, statuses, members, projectTimes, axis, onMemberRemove, onOpen: _onOpen, onMemberCreated, onPartnerCreated, onTimeEntryAdded, onTimeEntryUpdated, onTimeEntryDeleted, allFormations }: ProjectDetailSheetProps) {
    const [agreements,   setAgreements]   = useState<AgreementFull[]>([])
    const [kpis, setKpis] = useState<Kpi[]>([])
    const [kpiEntries, setKpiEntries] = useState<KpiEntry[]>([])
    const [publications, setPublications] = useState<Publication[]>([])
    const [publicationMembers, setPublicationMembers] = useState<PublicationMember[]>([])
    const [allLabs, setAllLabs] = useState<Lab[]>([])
    const [editingPublication, setEditingPublication] = useState<Publication | null>(null)
    const [showPublicationForm, setShowPublicationForm] = useState(false)
    const [pubDraft, setPubDraft] = useState<Omit<Publication, 'id' | 'project_id'>>({ title: '', lab_id: null, subject: '', journal: '', year: '', doi: '' })
    const [pubAuthorIds, setPubAuthorIds] = useState<number[]>([])
    const [pubSaving, setPubSaving] = useState(false)
    const [pubError, setPubError] = useState<string | null>(null)
    const [loading,      setLoading]      = useState(false)
    const [editing,      setEditing]      = useState(false)
    const [draft,        setDraft]        = useState<Project | null>(null)
    const [showAddForm,  setShowAddForm]  = useState(false)
    const [editingAgreement, setEditingAgreement] = useState<AgreementFull | null>(null)
    const [saving,       setSaving]       = useState(false)
    const [confirming,   setConfirming]   = useState(false)
    const [deleting,     setDeleting]     = useState(false)
    const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([])
    const [selectedMembers, setSelectedMembers] = useState<ProjectMember[]>([])
    const [copied, setCopied] = useState(false)
    const [roleToAdd, setRoleToAdd] = useState<string>(ROLES[1])
    const [selectedKpi, setSelectedKpi] = useState<Kpi | null>(null)
    const pendingMemberIds = useRef(new Set<number>())
    const [selectedAgreement, setSelectedAgreement] = useState<AgreementFull | null>()
    const [projectPartners,  setProjectPartners]  = useState<ProjectPartnerFull[]>([])
    const [showAddPartner,   setShowAddPartner]   = useState(false)
    const [actionCards,      setActionCards]      = useState<(ActionCardFull & { linkId: number })[]>([])
    const [showLinkCard,       setShowLinkCard]       = useState(false)
    const [showCreateCard,     setShowCreateCard]     = useState(false)
    const [allActionCards,     setAllActionCards]     = useState<ActionCardFull[]>([])
    const [selectedActionCard, setSelectedActionCard] = useState<(ActionCardFull & { linkId: number }) | null>(null)
    const [selectedPartner,    setSelectedPartner]    = useState<PartnerCardFull | null>(null)
    const [_editingRolePmId, setEditingRolePmId]  = useState<number | null>(null)
    const [editingPartnerId, setEditingPartnerId] = useState<number | null>(null)
    const [showCreateMember, setShowCreateMember] = useState(false)
    const [showCreatePartner, setShowCreatePartner] = useState(false)
    const [expanded,         setExpanded]         = useState(true)
    const [milestones,       setMilestones]       = useState<ProjectMilestone[]>([])
    const [showAddMilestone, setShowAddMilestone] = useState(false)
    const [editingMilestone, setEditingMilestone] = useState<ProjectMilestone | null>(null)
    const [selectedPm, setSelectedPm] = useState<ProjectMember | null>(null)
    const [formations,     setFormations]     = useState<Formation[]>([])
    const [formationLinks, setFormationLinks] = useState<ProjectFormation[]>([])
    const [attachments,    setAttachments]    = useState<ProjectAttachment[]>([])
    const [newAttachLabel, setNewAttachLabel] = useState('')
    const [newAttachUrl,   setNewAttachUrl]   = useState('')
    const [showAttachForm, setShowAttachForm] = useState(false)
    const [projectExpanses, setProjectExpanses] = useState<Expanse[]>([])
    const [allExpanses, setAllExpanses] = useState<Expanse[]>([])
    const [expanseSuppliers, setExpanseSuppliers] = useState<Supplier[]>([])
    const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([])
    const [budgetDetails, setBudgetDetails] = useState<BudgetDetail[]>([])
    const [showLinkExpanse, setShowLinkExpanse]   = useState(false)
    const [showLinkAgreement, setShowLinkAgreement] = useState(false)
    const [allAgreementsForLink, setAllAgreementsForLink] = useState<AgreementFull[]>([])
    const [loadingLinkAgreements, setLoadingLinkAgreements] = useState(false)
    type TabDef = { mode: detailViewMode; label: string; icon: React.ReactNode }
    const ALL_OPTIONAL_TABS: TabDef[] = [
        { mode: 'participants', label: 'Membres',  icon: <Users size={13} /> },
        { mode: 'partners',     label: 'Partenaires',  icon: <Building2 size={13} /> },
        { mode: 'kpis',         label: 'Indicateurs',  icon: <BarChart2 size={13} /> },
        { mode: 'tasks',        label: 'Actions',      icon: <ListChecks size={13} /> },
        { mode: 'budget',       label: 'Dépenses',       icon: <Receipt size={13} /> },
        { mode: 'conventions',  label: 'Conventions',  icon: <ScrollText size={13} /> },
        { mode: 'publications', label: 'Publications', icon: <BookOpen size={13} /> },
        { mode: 'formations',   label: 'Formations',   icon: <GraduationCap size={13} /> },
        { mode: 'files',        label: 'Documents',    icon: <Paperclip size={13} /> },
    ]

    const [detailViewMode, setDetailViewMode] = useState<detailViewMode>('overview')
    const [activeOptionalTabs, setActiveOptionalTabs] = useState<detailViewMode[]>([])

    function addOptionalTab(mode: detailViewMode) {
        setActiveOptionalTabs(prev => prev.includes(mode) ? prev : [...prev, mode])
    }
    function removeOptionalTab(mode: detailViewMode) {
        setActiveOptionalTabs(prev => prev.filter(m => m !== mode))
        if (detailViewMode === mode) setDetailViewMode('overview')
    }

    const tabSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
    function handleTabDragEnd(event: DragEndEvent) {
        const { active, over } = event
        if (!over || active.id === over.id) return
        setActiveOptionalTabs(prev => {
            const oldIndex = prev.indexOf(active.id as detailViewMode)
            const newIndex = prev.indexOf(over.id as detailViewMode)
            return arrayMove(prev, oldIndex, newIndex)
        })
    }

    useEffect(() => {
        if (!project) return
        try {
            localStorage.setItem(`tabs_project_${project.id}`, JSON.stringify(activeOptionalTabs))
        } catch {
            // localStorage can be unavailable (e.g. browser privacy settings)
        }
    }, [activeOptionalTabs, project?.id])

    useEffect(() => {
        if (!open || !project) return
        setDraft({ ...project })
        setEditing(false)
        setShowAddForm(false)
        setEditingAgreement(null)
        setConfirming(false) 
        setSelectedMembers([])
        setExpanded(false)
        setShowAddMilestone(false)
        setEditingMilestone(null)
        setShowLinkCard(false)
        setShowCreateCard(false)
        setEditingRolePmId(null)
        setEditingPartnerId(null)
        setShowCreateMember(false)
        setShowCreatePartner(false)
        setSelectedPartner(null)
        setLoading(true)
        Promise.all([
            getAgreementsByProject(project.id),
            getProjectMembers(project.id),
            getKpis(),
            getKpiEntries(project.id),
            getProjectPartners(),
            getProjectMilestones(project.id),
            getActionCardsByProject(project.id),
            getFormationsByProject(project.id),
            getProjectFormationLinks(project.id),
            getProjectAttachments(project.id),
            getExpanses(),
            getSupliers(),
            getBudgetCategories(),
            getBudgetDetails(),
            getPublicationsByProject(project.id),
            getPublicationMembersByProject(project.id),
            getLabs(),
        ])
            .then(([agreements, members, kpis, kpiEntries, pp, ms, acs, formations, formationLinks, attachments, expanses, suppliers, cats, details, pubs, pubMembers, labs]) => {
                setAgreements(agreements as AgreementFull[])
                setProjectMembers(members)
                setKpis(kpis)
                setKpiEntries(kpiEntries)
                const partnerMap = new Map(partners.map(p => [p.id, p]))
                const fullPartners = (pp as ProjectPartner[])
                    .filter(p => p.project_id === project.id)
                    .map(p => ({ ...p, partner: partnerMap.get(p.partner_id) ?? { id: 0, name: '?', description: '', color: '', logo: '', status_id: 0, type: '', consortium: false } }))
                setProjectPartners(fullPartners)
                setMilestones(ms as ProjectMilestone[])
                setActionCards(acs as (ActionCardFull & { linkId: number })[])
                setFormations(formations as Formation[])
                setFormationLinks(formationLinks as ProjectFormation[])
                setAttachments(attachments as ProjectAttachment[])
                const allExp = expanses as Expanse[]
                setAllExpanses(allExp)
                setProjectExpanses(allExp.filter(e => e.project_id === project.id))
                setExpanseSuppliers(suppliers as Supplier[])
                setBudgetCategories(cats as BudgetCategory[])
                setBudgetDetails(details as BudgetDetail[])
                setPublications(pubs as Publication[])
                setPublicationMembers(pubMembers as PublicationMember[])
                setAllLabs(labs as Lab[])

                // Auto-affichage des onglets si données existantes
                let stored: detailViewMode[] = []
                try {
                    stored = JSON.parse(localStorage.getItem(`tabs_project_${project.id}`) ?? '[]') as detailViewMode[]
                } catch {
                    // localStorage can be unavailable (e.g. browser privacy settings)
                }
                const projectMembersData = members as ProjectMember[]
                const projectPartnersData = (pp as ProjectPartner[]).filter(p => p.project_id === project.id)
                const autoShow: detailViewMode[] = []
                if (projectMembersData.length > 0) autoShow.push('participants')
                if (projectPartnersData.length > 0) autoShow.push('partners')
                if ((kpiEntries as KpiEntry[]).length > 0) autoShow.push('kpis')
                if ((acs as ActionCardFull[]).length > 0) autoShow.push('tasks')
                if ((expanses as Expanse[]).filter(e => e.project_id === project.id).length > 0) autoShow.push('budget')
                if ((agreements as AgreementFull[]).length > 0) autoShow.push('conventions')
                if ((pubs as Publication[]).length > 0) autoShow.push('publications')
                if ((formations as Formation[]).length > 0) autoShow.push('formations')
                if ((attachments as ProjectAttachment[]).length > 0) autoShow.push('files')
                setActiveOptionalTabs([...new Set([...stored, ...autoShow])])
            })
            .finally(() => setLoading(false))
    }, [open, project?.id ?? 0])

    useEffect(() => {
        if (showLinkCard && allActionCards.length === 0) {
            getActionCardsFull().then(setAllActionCards)
        }
    }, [showLinkCard])

    function copyEmails() {
        const emails = selectedMembers
            .map(pm => members.find(m => m.id === pm.member_id)?.email ?? '')
            .filter(e => e.length > 0)
            .join(', ')

        navigator.clipboard.writeText(emails)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    function exportMembersCsv() {
        const headers = ['Prénom', 'Nom', 'Rôle', 'Email', 'Téléphone', 'Partenaire']
        const rows = selectedMembers.map(pm => {
            const m = members.find(m => m.id === pm.member_id)
            const p = partners.find(p => p.id === m?.partner_id)
            return [m?.first_name ?? '', m?.last_name ?? '', pm.role, m?.email ?? '', m?.tel ?? '', p?.name ?? '']
        })
        exportToCsv(`participants_${project?.title ?? 'projet'}.csv`, headers, rows)
    }

    async function removeMembers() {
        for (const m of selectedMembers) {
            await handleRemoveMember(m.id)
        }
        setSelectedMembers([])
    }

    function toggleSelect(pm: ProjectMember) {
        setSelectedMembers(prev =>
            prev.find(m => m.id === pm.id)
            ? prev.filter(m => m.id !== pm.id)
            : [...prev, pm]
        )
    }

    function toggleSelectAll() {
        setSelectedMembers(prev =>
            prev.length === projectMembers.length ? [] : [...projectMembers]
        )
    }

    async function saveProject() {
        if (!draft || !project) return
        setSaving(true)
        try {
            const patch = { title: draft.title, description: draft.description, budget: draft.budget, project_call_id: draft.project_call_id, status_id: draft.status_id, start_date: draft.start_date, end_date: draft.end_date }
            console.log('[saveProject] patch envoyé à Grist :', patch)
            await updateProject(project.id, patch)
            console.log('[saveProject] succès')
            onUpdated(draft)
            setEditing(false)
        } catch (err) {
            console.error('[saveProject] erreur Grist :', err)
        } finally {
            setSaving(false)
        }
    }

    function handleAgreementSaved(a: AgreementFull) {
        if (editingAgreement) {
            setAgreements(prev => prev.map(x => x.id === a.id ? a : x))
            setEditingAgreement(null)
        } else {
            setAgreements(prev => [...prev, a])
            setShowAddForm(false)
            onAgreementAdded(a)
        }
    }

    async function handleDeleteAgreement(id: number) {
        await deleteAgreement(id)
        setAgreements(prev => prev.filter(a => a.id !== id))
        onAgreementDeleted(id)
    }

    async function handleDeleteProject() {
        if (!project) return
        setDeleting(true)
        try {
            await deleteProject(project.id)
            onDeleted(project.id)
            onClose()
        } finally {
            setDeleting(false)
            setConfirming(false)
        }
    }

    async function handleAddMember(memberId: number) {
        if (!project) return
        if (pendingMemberIds.current.has(memberId)) return
        pendingMemberIds.current.add(memberId)
        try {
            const link = await addProjectMember(project.id, memberId, roleToAdd)
            setProjectMembers(prev =>
                prev.some(pm => pm.member_id === memberId) ? prev : [...prev, link]
            )
        } finally {
            pendingMemberIds.current.delete(memberId)
        }
    }

    async function handleRemoveMember(linkId: number) {
        await removeProjectMember(linkId)
        setProjectMembers(prev => prev.filter(pm => pm.id !== linkId))
        onMemberRemove?.(linkId)
    }

    async function handleUnlinkCard(linkId: number) {
        await removeProjectFromCard(linkId)
        setActionCards(prev => prev.filter(c => c.linkId !== linkId))
    }

    async function handleRoleChange(pmId: number, role: string) {
        await updateProjectMember(pmId, role)
        setProjectMembers(prev => prev.map(pm => pm.id === pmId ? { ...pm, role } : pm))
        setEditingRolePmId(null)
    }

    async function handleParticipationStatusChange(pmId: number, statusId: number | null) {
        await updateProjectMemberParticipationStatus(pmId, statusId)
        setProjectMembers(prev => prev.map(pm => pm.id === pmId ? { ...pm, participation_status_id: statusId ?? undefined } : pm))
    }

    if (!project) return null

    const linkedMemberIds = projectMembers.map(pm => pm.member_id)
    const availableMembers = members.filter(m => !linkedMemberIds.includes(m.id))
    const participationStatuses = statuses.filter(s => s.context === 'participation')
    const hasParticipants = projectMembers.some(pm => pm.role === 'Participant')

    const totalBudget = agreements.reduce((s, a) => s + a.budget, 0)
    const totalGrant  = agreements.reduce((s, a) => s + a.grant, 0)
    const operationalExpanses  = projectExpanses.filter(e => !e.agreement_id)
    const reversementExpanses  = projectExpanses.filter(e => !!e.agreement_id)
    const totalExpanses = projectExpanses.reduce((s, e) => s + e.amount, 0)
    const pStatus = statuses.find(s => s.id === project.status_id)

    const HEADER_GRADIENTS = [
        'linear-gradient(135deg, #e0e7ff 0%, #f0fdf4 100%)',
        'linear-gradient(135deg, #fce7f3 0%, #ede9fe 100%)',
        'linear-gradient(135deg, #fff7ed 0%, #fef9c3 100%)',
        'linear-gradient(135deg, #e0f2fe 0%, #f0fdf4 100%)',
        'linear-gradient(135deg, #f1f5f9 0%, #e0e7ff 100%)',
        'linear-gradient(135deg, #fdf4ff 0%, #fce7f3 100%)',
        'linear-gradient(135deg, #ecfdf5 0%, #e0f2fe 100%)',
        'linear-gradient(135deg, #fff1f2 0%, #fff7ed 100%)',
    ]
    const headerGradient = HEADER_GRADIENTS[project.id % HEADER_GRADIENTS.length]

    return (
        <>
        <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
            <SheetContent side="right" showCloseButton={false} className={`${expanded ? '!w-screen' : '!w-[520px]'} flex flex-col gap-0 p-0 transition-all duration-300`}>
                <SheetHeader className="flex flex-col gap-0 p-0 rounded-xl m-4 overflow-hidden" style={{ background: headerGradient ?? '#f9fafb' }}>
                    <div className="px-5 pt-5 pb-4 flex flex-col gap-3">

                        {/* Badge statut + boutons d'action */}
                        <div className="flex items-center justify-between gap-3">
                            {pStatus ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/70 text-gray-700">
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: PROJECT_STATUS_COLORS[pStatus.label] ?? '#6b7280' }} />
                                    {pStatus.label}
                                </span>
                            ) : <span />}
                            <div className="flex items-center gap-1 shrink-0">
                                {confirming ? (
                                    <>
                                        <span className="text-xs text-destructive font-medium">Supprimer ?</span>
                                        <Button size="sm" variant="destructive" className="h-7 rounded-lg" onClick={handleDeleteProject} disabled={deleting}>
                                            {deleting ? '...' : 'Confirmer'}
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-7 rounded-lg bg-white/50 hover:bg-white/80" onClick={() => setConfirming(false)}>Annuler</Button>
                                    </>
                                ) : (
                                    <>
                                        <Button size="icon-sm" variant="ghost" className="h-7 w-7 rounded-lg bg-white/40 hover:bg-white/70" onClick={() => setExpanded(v => !v)}>
                                            {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                                        </Button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button size="icon-sm" variant="ghost" className="h-7 w-7 rounded-lg bg-white/40 hover:bg-white/70">
                                                    <EllipsisIcon size={13} />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem variant="destructive" onClick={() => setConfirming(true)}>
                                                    <Trash2 size={13} />Supprimer
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Titre */}
                        <SheetTitle>
                            <span className="text-2xl font-semibold leading-tight text-gray-900">{project.title}</span>
                        </SheetTitle>

                        {/* Description */}
                        {project.description && (
                            <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{project.description}</p>
                        )}

                        {/* Progress bar temporelle */}
                        {(() => {
                            const progress = projectProgress(project.start_date, project.end_date)
                            if (progress === null) return null
                            return (
                                <div className="h-1 w-full rounded-full bg-black/10 overflow-hidden">
                                    <div className="h-full rounded-full bg-black/20 transition-all" style={{ width: `${progress}%` }} />
                                </div>
                            )
                        })()}
                    </div>
                </SheetHeader>

                {(
                    <div className="px-4 pt-3 shrink-0 border-b">
                        <ScrollableTabBar>
                            {/* Général — toujours visible */}
                            {([ { mode: 'overview' as detailViewMode, label: 'Général', icon: <LayoutGrid size={13} /> }]).map(({ mode, label, icon }) => (
                                <button
                                    key={mode}
                                    onClick={() => setDetailViewMode(mode)}
                                    className={`relative flex items-center gap-1.5 px-3 py-2 text-sm z-10 transition-colors duration-300 text-xs whitespace-nowrap ${detailViewMode === mode ? 'text-bold' : 'text-black'}`}
                                >
                                    <span className="relative z-20 flex items-center gap-1.5">{icon}{label}</span>
                                    {detailViewMode === mode && (
                                        <motion.div layoutId="activeDetailProjectTab" className="absolute inset-0 border-b-2 border-black z-10" transition={{ type: "spring", stiffness: 380, damping: 30 }} />
                                    )}
                                </button>
                            ))}

                            {/* Onglets optionnels actifs — drag & drop */}
                            <DndContext sensors={tabSensors} collisionDetection={closestCenter} onDragEnd={handleTabDragEnd} modifiers={[restrictToHorizontalAxis]}>
                                <SortableContext items={activeOptionalTabs} strategy={horizontalListSortingStrategy}>
                                    {ALL_OPTIONAL_TABS.filter(t => activeOptionalTabs.includes(t.mode))
                                        .sort((a, b) => activeOptionalTabs.indexOf(a.mode) - activeOptionalTabs.indexOf(b.mode))
                                        .map(({ mode, label, icon }) => {
                                            const isEmpty =
                                                (mode === 'participants' && projectMembers.length === 0)  ||
                                                (mode === 'partners'     && projectPartners.length === 0) ||
                                                (mode === 'kpis'         && kpiEntries.length === 0)      ||
                                                (mode === 'tasks'        && actionCards.length === 0)     ||
                                                (mode === 'budget'       && projectExpanses.length === 0) ||
                                                (mode === 'conventions'  && agreements.length === 0)      ||
                                                (mode === 'publications' && publications.length === 0)     ||
                                                (mode === 'formations'   && formations.length === 0)       ||
                                                (mode === 'files'        && attachments.length === 0)
                                            return (
                                                <SortableTab
                                                    key={mode}
                                                    mode={mode}
                                                    label={label}
                                                    icon={icon}
                                                    isActive={detailViewMode === mode}
                                                    isEmpty={isEmpty}
                                                    onActivate={() => setDetailViewMode(mode)}
                                                    onRemove={() => removeOptionalTab(mode)}
                                                />
                                            )
                                        })}
                                </SortableContext>
                            </DndContext>

                            {ALL_OPTIONAL_TABS.filter(t => !activeOptionalTabs.includes(t.mode)).length > 0 && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors whitespace-nowrap shrink-0 ml-1">
                                            <Plus size={12} />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="text-xs">
                                        {ALL_OPTIONAL_TABS.filter(t => !activeOptionalTabs.includes(t.mode)).map(({ mode, label, icon }) => (
                                            <DropdownMenuItem key={mode} onClick={() => { addOptionalTab(mode); setDetailViewMode(mode) }} className="flex items-center gap-2 text-xs">
                                                {icon}{label}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </ScrollableTabBar>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto px-6 py-5">

                    {/* ── GÉNÉRAL ─────────────────────────────── */}
                    {detailViewMode === "overview" && (
                        <div className="flex flex-col gap-6">

                    {/* Informations projet */}
                    <section className="flex flex-col gap-3 bg-white border border-border rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Informations</p>
                            {!editing && (
                                <Button size="icon-sm" variant="ghost" className="h-6 w-6 rounded-md" onClick={() => { setEditing(true); setDetailViewMode('overview') }}>
                                    <Pencil size={11} />
                                </Button>
                            )}
                        </div>
                        {editing && draft ? (
                            <div className="flex flex-col gap-2.5">
                                <div className="flex flex-col gap-1">
                                    <Label className="text-xs text-muted-foreground">Titre</Label>
                                    <Input value={draft.title} onChange={e => setDraft(d => d ? { ...d, title: e.target.value } : d)} className="h-8 text-xs" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <Label className="text-xs text-muted-foreground">Statut</Label>
                                    <Select value={String(draft.status_id)} onValueChange={v => setDraft(d => d ? { ...d, status_id: Number(v) } : d)}>
                                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>{statuses.filter(s => s.context === 'project').map(s => <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <Label className="text-xs text-muted-foreground">Dispositif</Label>
                                    <Select value={String(draft.project_call_id)} onValueChange={v => setDraft(d => d ? { ...d, project_call_id: Number(v) } : d)}>
                                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>{projectCalls.map(pc => <SelectItem key={pc.id} value={String(pc.id)}>{pc.title}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex flex-col gap-1 flex-1">
                                        <Label className="text-xs text-muted-foreground">Début</Label>
                                        <Input type="date" value={draft.start_date ?? ''} onChange={e => setDraft(d => d ? { ...d, start_date: e.target.value } : d)} className="h-8 text-xs" />
                                    </div>
                                    <div className="flex flex-col gap-1 flex-1">
                                        <Label className="text-xs text-muted-foreground">Fin</Label>
                                        <Input type="date" value={draft.end_date ?? ''} onChange={e => setDraft(d => d ? { ...d, end_date: e.target.value } : d)} className="h-8 text-xs" />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <Label className="text-xs text-muted-foreground">Budget (€)</Label>
                                    <Input type="number" value={draft.budget} onChange={e => setDraft(d => d ? { ...d, budget: Number(e.target.value) } : d)} className="h-8 text-xs" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <Label className="text-xs text-muted-foreground">Description</Label>
                                    <Textarea value={draft.description ?? ''} onChange={e => setDraft(d => d ? { ...d, description: e.target.value } : d)} rows={3} placeholder="Description du projet…" className="text-xs resize-none" />
                                </div>
                                <div className="flex gap-2 pt-1">
                                    <Button size="sm" variant="ghost" className="h-7 text-xs flex-1 rounded-md" onClick={() => { setEditing(false); setDraft({ ...project }) }}>
                                        <X size={12} className="mr-1" />Annuler
                                    </Button>
                                    <Button size="sm" className="h-7 text-xs flex-1 rounded-md" onClick={saveProject} disabled={saving}>
                                        <Check size={12} className="mr-1" />{saving ? '…' : 'Enregistrer'}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 text-xs">
                                <div className="flex justify-between gap-2"><span className="text-muted-foreground shrink-0">Statut</span><span>{pStatus?.label}</span></div>
                                <div className="flex justify-between gap-2"><span className="text-muted-foreground shrink-0">Dispositif</span><span className="text-right truncate">{project.projectCall.title}</span></div>
                                <div className="flex justify-between gap-2"><span className="text-muted-foreground shrink-0">Axe</span><span className="text-right">{project.projectCall.axis.name}</span></div>
                                {(project.start_date || project.end_date) && (
                                    <div className="flex justify-between gap-2">
                                        <span className="text-muted-foreground shrink-0">Période</span>
                                        <span className="text-right">{project.start_date ? formatDate(project.start_date) : '—'} → {project.end_date ? formatDate(project.end_date) : '—'}</span>
                                    </div>
                                )}
                                {project.budget > 0 && (
                                    <div className="flex justify-between gap-2">
                                        <span className="text-muted-foreground shrink-0">Budget</span>
                                        <span className="font-medium">{fmt(project.budget)}</span>
                                    </div>
                                )}
                                {totalGrant > 0 && (
                                    <div className="flex justify-between gap-2">
                                        <span className="text-muted-foreground shrink-0">Subventions</span>
                                        <span className="font-medium">{fmt(totalGrant)}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    {/* Jalons */}
                    <section className='flex flex-col gap-3 bg-white border border-border rounded-xl p-4'>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Jalons</p>
                            </div>
                            {!showAddMilestone && !editingMilestone && (
                                <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 rounded-md" onClick={() => setShowAddMilestone(true)}>
                                    <Plus size={11} />Ajouter
                                </Button>
                            )}
                        </div>

                        <div className="relative">
                                {milestones.length === 0 && !showAddMilestone && (
                                    <p className="text-xs text-muted-foreground italic">Aucun jalon</p>
                                )}

                                {milestones.length > 0 && (
                                    <div className="absolute left-[5px] top-2 bottom-6 w-px bg-border" />
                                )}

                                {milestones
                                    .slice()
                                    .sort((a, b) => a.due_date.localeCompare(b.due_date))
                                    .map(m =>
                                        editingMilestone?.id === m.id ? (
                                            <div key={m.id} className="pl-6 mb-3">
                                                <MilestoneForm
                                                    statuses={statuses}
                                                    initial={m}
                                                    onSaved={async (fields) => {
                                                        await updateProjectMilestone(m.id, fields)
                                                        setMilestones(prev => prev.map(x => x.id === m.id ? { ...m, ...fields } : x))
                                                        setEditingMilestone(null)
                                                    }}
                                                    onCancel={() => setEditingMilestone(null)}
                                                />
                                            </div>
                                        ) : (
                                            <MilestoneRow
                                                key={m.id}
                                                milestone={m}
                                                statuses={statuses}
                                                onEdit={() => setEditingMilestone(m)}
                                                onDelete={async () => {
                                                    await deleteProjectMilestone(m.id)
                                                    setMilestones(prev => prev.filter(x => x.id !== m.id))
                                                }}
                                            />
                                        )
                                    )}

                                {showAddMilestone && (
                                    <MilestoneForm
                                        statuses={statuses}
                                        onSaved={async (fields) => {
                                            const ms = await addProjectMilestone(project.id, fields)
                                            setMilestones(prev => [...prev, ms])
                                            setShowAddMilestone(false)
                                        }}
                                        onCancel={() => setShowAddMilestone(false)}
                                    />
                                )}
                        </div>
                    </section>

                        </div>
                    )}{/* fin overview */}

                    {/* ── PARTICIPANTS ─────────────────────────── */}
                    {detailViewMode === "participants" && (
                        <div className="flex flex-col gap-6">

                    {/* Participants */}
                    <section className="flex flex-col gap-3 bg-white border border-border rounded-xl p-4">
                        <div className="flex items-center justify-between group/header">
                            <div className="flex items-center gap-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Membres {projectMembers.length > 0 && ( <span>({projectMembers.length})</span>)}</p>
                            </div>
                            {selectedMembers.length > 0 && (
                                <div className="flex items-center gap-1">
                                    <span className="text-xs text-muted-foreground">{selectedMembers.length} sélectionné{selectedMembers.length > 1 ? 's' : ''}</span>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="outline" className="rounded-md" size="sm" onClick={copyEmails}>
                                                {copied ? <CheckIcon size={13} /> : <Copy size={13} />}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Copier email{selectedMembers.length > 1 ? 's' : ''}</p></TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="outline" className="rounded-md" size="sm" onClick={exportMembersCsv}>
                                                <FileDown size={13} />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Exporter en csv</p></TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="outline" className="rounded-md" size="sm" onClick={removeMembers}>
                                                <Trash size={13} />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Supprimer</p></TooltipContent>
                                    </Tooltip>
                                </div>
                            )}
                        </div>

                        {projectMembers.length > 0 && (
                            <Table className="text-xs">
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="h-7 w-6 px-2">
                                            <Checkbox
                                                checked={selectedMembers.length > 0 && selectedMembers.length < projectMembers.length ? 'indeterminate' : selectedMembers.length === projectMembers.length && projectMembers.length > 0}
                                                onCheckedChange={toggleSelectAll}
                                                className="h-3.5 w-3.5"
                                            />
                                        </TableHead>
                                        <TableHead className="h-7 px-2 text-xs font-normal text-muted-foreground">Nom</TableHead>
                                        <TableHead className="h-7 px-2 text-xs font-normal text-muted-foreground">Rôle</TableHead>
                                        <TableHead className="h-7 px-2 text-xs font-normal text-muted-foreground">Partenaire</TableHead>
                                        {hasParticipants && <TableHead className="h-7 px-2 text-xs font-normal text-muted-foreground">Participation</TableHead>}
                                        <TableHead className="h-7 px-2 text-xs font-normal text-muted-foreground text-right">Jours</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {projectMembers.slice().sort((a, b) => {
                                            const roleOrder = ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)
                                            if (roleOrder !== 0) return roleOrder
                                            const ma = members.find(m => m.id === a.member_id)
                                            const mb = members.find(m => m.id === b.member_id)
                                            const nameA = `${ma?.last_name ?? ''} ${ma?.first_name ?? ''}`.toLowerCase()
                                            const nameB = `${mb?.last_name ?? ''} ${mb?.first_name ?? ''}`.toLowerCase()
                                            return nameA.localeCompare(nameB, 'fr')
                                        }).map(pm => {
                                        const member = members.find(m => m.id === pm.member_id)
                                        if (!member) return null
                                        const partner = partners.find(p => p.id === member.partner_id)
                                        const total_entries = projectTimes.filter(pt => pt.member_id === pm.member_id).reduce((acc, t) => acc + t.days, 0)
                                        const isSelected = selectedMembers.some(m => m.id === pm.id)
                                        return (
                                            <TableRow
                                                key={pm.id}
                                                className={`group cursor-pointer ${isSelected ? 'bg-muted' : ''}`}
                                                onClick={() => setSelectedPm(pm)}
                                            >
                                                <TableCell className="px-2 py-1.5">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onClick={e => e.stopPropagation()}
                                                        onCheckedChange={() => toggleSelect(pm)}
                                                        className="h-3.5 w-3.5"
                                                    />
                                                </TableCell>
                                                <TableCell className="px-2 py-1.5 whitespace-nowrap font-normal">{member.first_name} {member.last_name}</TableCell>
                                                <TableCell className="px-0 py-1.5 whitespace-nowrap">
                                                    <Select value={pm.role} onValueChange={role => handleRoleChange(pm.id, role)}>
                                                        <SelectTrigger className="h-5 text-xs w-28 border-none p-0 shadow-none text-muted-foreground hover:text-foreground" onClick={e => e.stopPropagation()}><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell className="px-2 py-1.5">
                                                    {partner && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span
                                                                    className="text-xs px-2.5 py-0.5 rounded-full border border-border truncate inline-block max-w-[120px]"
                                                                    style={partner.color ? { backgroundColor: partner.color } : {}}
                                                                >
                                                                    {partner.name}
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>{partner.name}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </TableCell>
                                                {hasParticipants && (
                                                    <TableCell className="px-1 py-1.5" onClick={e => e.stopPropagation()}>
                                                        {pm.role === 'Participant' && (
                                                            <Select
                                                                value={pm.participation_status_id?.toString() ?? ''}
                                                                onValueChange={v => handleParticipationStatusChange(pm.id, v ? Number(v) : null)}
                                                            >
                                                                <SelectTrigger className="h-5 text-xs w-28 border-none p-0 shadow-none text-muted-foreground hover:text-foreground">
                                                                    <SelectValue placeholder="—" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {participationStatuses.map(s => (
                                                                        <SelectItem key={s.id} value={s.id.toString()}>{s.label}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        )}
                                                    </TableCell>
                                                )}
                                                <TableCell className="px-2 py-1.5 text-right whitespace-nowrap">
                                                    {total_entries > 0 && (
                                                        <span className="font-medium text-gray-700">{total_entries}</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        )}

                        <div className="flex flex-col gap-2 mt-1">
                                <div className="flex gap-2">
                                    <MemberSearchInput
                                        members={availableMembers}
                                        partners={partners}
                                        linkedMembers={projectMembers.map(pm => members.find(m => m.id === pm.member_id)!).filter(Boolean)}
                                        onConfirm={ids => ids.forEach(id => handleAddMember(id))}
                                    />
                                    <Select value={roleToAdd} onValueChange={setRoleToAdd}>
                                        <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    {!showCreateMember && (
                                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1 shrink-0 rounded-md" onClick={() => setShowCreateMember(true)}>
                                            <Plus size={11} />
                                        </Button>
                                    )}
                                </div>
                                {showCreateMember && (
                                    <MemberQuickCreateForm
                                        partners={partners}
                                        projectRole={roleToAdd}
                                        existingEmails={members.map(m => m.email)}
                                        onSaved={async member => {
                                            onMemberCreated?.(member)
                                            await handleAddMember(member.id)
                                            setShowCreateMember(false)
                                        }}
                                        onCancel={() => setShowCreateMember(false)}
                                    />
                                )}
                        </div>

                        {projectMembers.length === 0 && !showCreateMember && (
                            <p className="text-xs text-muted-foreground italic">Aucun participant</p>
                        )}
                    </section>

                        </div>
                    )}{/* fin participants */}

                    {/* ── PARTENAIRES ──────────────────────────── */}
                    {detailViewMode === "partners" && (
                        <div className="flex flex-col gap-6">

                    {/* Partenaires (standalone) */}
                    <section className="flex flex-col gap-3 bg-white border border-border rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Partenaires</p>
                            </div>
                            {!showAddPartner && !showCreatePartner && (
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 rounded-md" onClick={() => setShowAddPartner(true)}>
                                        <Plus size={11} />Lier
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 rounded-md" onClick={() => setShowCreatePartner(true)}>
                                        <Plus size={11} />Nouveau
                                    </Button>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col gap-2">
                            {projectPartners.length === 0 && !showAddPartner && !showCreatePartner && (
                                <p className="text-xs text-muted-foreground italic">Aucun partenaire</p>
                            )}
                            {showAddPartner && (
                                <ProjectPartnerForm
                                    partners={partners.filter(p => !projectPartners.some(pp => pp.partner_id === p.id))}
                                    onSaved={async (partnerId, role, amount, label) => {
                                        const pp = await addProjectPartner(project.id, partnerId, role, amount, label)
                                        const partner = partners.find(p => p.id === partnerId)!
                                        setProjectPartners(prev => [...prev, { ...pp, partner }])
                                        setShowAddPartner(false)
                                    }}
                                    onCancel={() => setShowAddPartner(false)}
                                />
                            )}
                            {showCreatePartner && (
                                <PartnerQuickCreateForm
                                    projectRole={PARTNER_ROLES[0]}
                                    onSaved={async partner => {
                                        onPartnerCreated?.(partner)
                                        const pp = await addProjectPartner(project.id, partner.id, PARTNER_ROLES[0], null, null)
                                        setProjectPartners(prev => [...prev, { ...pp, partner }])
                                        setShowCreatePartner(false)
                                    }}
                                    onCancel={() => setShowCreatePartner(false)}
                                />
                            )}
                            {projectPartners.map(pp => (
                                editingPartnerId === pp.id ? (
                                    <ProjectPartnerForm
                                        key={pp.id}
                                        partners={partners}
                                        initial={pp}
                                        onSaved={async (partnerId, role, amount, label) => {
                                            await updateProjectPartner(pp.id, { partner_id: partnerId, role, amount: amount ?? null, label: label ?? null })
                                            const partner = partners.find(p => p.id === partnerId)!
                                            setProjectPartners(prev => prev.map(x => x.id === pp.id ? { ...x, partner_id: partnerId, role, amount, label, partner } : x))
                                            setEditingPartnerId(null)
                                        }}
                                        onCancel={() => setEditingPartnerId(null)}
                                    />
                                ) : (
                                    <div key={pp.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-muted/40 group cursor-pointer hover:bg-muted/70" onClick={() => {
                                        const partnerMembers = members.filter(m => m.partner_id === pp.partner_id)
                                        const partnerAgreements = agreements.filter(a => a.partner_id === pp.partner_id)
                                        setSelectedPartner({ ...pp.partner, members: partnerMembers, agreements: partnerAgreements, projects: project ? [project] : [] })
                                    }}>
                                        <div className="flex flex-col items-start gap-2 min-w-0">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                     <span
                                                        className="shrink-0 text-xs px-2.5 py-0.5 rounded-full border border-border truncate max-w-[150px]"
                                                        style={pp.partner.color ? { backgroundColor: pp.partner.color } : {}}
                                                    >
                                                        {pp.partner.name}
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{pp.partner.name}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                            <span className="text-xs text-muted-foreground">{pp.role}</span>
                                            {pp.amount !== null && (
                                                <span className="text-xs font-medium text-foreground">
                                                    {pp.amount.toLocaleString('fr-FR')} €
                                                    {pp.label && <span className="font-normal text-muted-foreground ml-1">· {pp.label}</span>}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0 ml-2">
                                            <div className="h-5 w-5 flex items-center justify-center rounded hover:bg-background text-muted-foreground hover:text-foreground"
                                                onClick={e => { e.stopPropagation(); setEditingPartnerId(pp.id) }}>
                                                <Pencil size={11} />
                                            </div>
                                            <div
                                                className="h-5 w-5 flex items-center justify-center rounded hover:bg-background text-muted-foreground hover:text-destructive"
                                                onClick={e => {
                                                    e.stopPropagation()
                                                    removeProjectPartner(pp.id)
                                                    setProjectPartners(prev => prev.filter(x => x.id !== pp.id))
                                                }}
                                            >
                                                <X size={11} />
                                            </div>
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    </section>

                        </div>
                    )}{/* fin partners */}

                    {/* ── KPIs / INDICATEURS ───────────────────── */}
                    {detailViewMode === "kpis" && (
                        <div className="flex flex-col gap-6">

                    {/* KPIs / Indicateurs */}
                    <section className="flex flex-col gap-3 bg-white border border-border rounded-xl p-4">
                        <div className="flex items-center gap-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Indicateurs</p>
                        </div>

                        {kpis.length === 0 && (
                            <p className="text-xs text-muted-foreground italic">Aucun indicateur défini</p>
                        )}

                        <SearchInput
                            data={kpis}
                            onSelect={(kpi) => { setSelectedKpi(kpi) }}
                            getLabel={kpi => kpi.label}
                            placeholder="Rechercher un indicateur..."
                            groupBy={kpi => ({ primary: kpi.dimension })}
                            value={selectedKpi?.label}
                        />

                        

                        {kpis.map(kpi => {
                            const entries = kpiEntries
                                .filter(e => e.kpi_id === kpi.id)
                                .sort((a, b) => a.year.localeCompare(b.year))
                            const latest = entries.at(-1)
                            const total = entries.reduce((sum, e) => sum + e.value, 0)
                            if (!total) return null
                            return (
                                <div key={kpi.id} onClick={() => setSelectedKpi(kpi)} className="flex flex-col gap-1.5 rounded-lg border border-border px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-medium"><Badge className='rounded-md mr-2' variant="secondary">{kpi.dimension}</Badge> {kpi.label}</span>
                                        {latest && (
                                            <span className="text-sm font-semibold tabular-nums shrink-0">
                                                {total} <span className="text-xs font-normal text-muted-foreground">{kpi.unit}</span> 
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </section>

                        </div>
                    )}{/* fin kpis */}

                    {/* ── PUBLICATIONS ─────────────────────────── */}
                    {detailViewMode === "publications" && (
                        <div className="flex flex-col gap-6">

                    {/* Publications */}
                    <section className="flex flex-col gap-3 bg-white border border-border rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Publications</p>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setShowPublicationForm(true); setEditingPublication(null); setPubDraft({ title: '', lab_id: null, subject: '', journal: '', year: '', doi: '' }); setPubAuthorIds([]); setPubError(null) }}>
                                <Plus size={14} />
                            </Button>
                        </div>

                        {publications.length === 0 && !showPublicationForm && (
                            <p className="text-xs text-muted-foreground italic">Aucune publication</p>
                        )}

                        {showPublicationForm && (
                            <div className="flex flex-col gap-2 rounded-lg border border-border p-3 bg-muted/30">
                                <input className="text-xs border rounded px-2 py-1 w-full" placeholder="Titre *" value={pubDraft.title} onChange={e => setPubDraft(p => ({ ...p, title: e.target.value }))} />
                                <div>
                                    <p className="text-[11px] text-muted-foreground mb-1">Auteurs</p>
                                    <SearchInput
                                        data={members}
                                        getLabel={m => `${m.first_name} ${m.last_name}`}
                                        onSelect={m => setPubAuthorIds(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])}
                                        placeholder="Ajouter un auteur..."
                                        selectedIds={pubAuthorIds}
                                        groupBy={m => ({ primary: partners.find(p => p.id === m.partner_id)?.name ?? 'Autre' })}
                                    />
                                    {pubAuthorIds.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {pubAuthorIds.map(id => {
                                                const m = members.find(m => m.id === id)
                                                return m ? (
                                                    <span key={id} className="flex items-center gap-1 text-[11px] bg-muted rounded px-1.5 py-0.5">
                                                        {m.first_name} {m.last_name}
                                                        <button onClick={() => setPubAuthorIds(prev => prev.filter(i => i !== id))} className="text-muted-foreground hover:text-destructive">×</button>
                                                    </span>
                                                ) : null
                                            })}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-[11px] text-muted-foreground mb-1">Laboratoire</p>
                                    <SearchInput
                                        data={allLabs}
                                        getLabel={l => l.name}
                                        onSelect={l => setPubDraft(p => ({ ...p, lab_id: l.id }))}
                                        placeholder="Sélectionner un laboratoire..."
                                        value={allLabs.find(l => l.id === pubDraft.lab_id)?.name}
                                    />
                                </div>
                                <input className="text-xs border rounded px-2 py-1 w-full" placeholder="Sujet / mots-clés" value={pubDraft.subject} onChange={e => setPubDraft(p => ({ ...p, subject: e.target.value }))} />
                                <input className="text-xs border rounded px-2 py-1 w-full" placeholder="Revue / conférence" value={pubDraft.journal} onChange={e => setPubDraft(p => ({ ...p, journal: e.target.value }))} />
                                <div className="flex gap-2">
                                    <input className="text-xs border rounded px-2 py-1 w-20" placeholder="Année" value={pubDraft.year} onChange={e => setPubDraft(p => ({ ...p, year: e.target.value }))} />
                                    <input className="text-xs border rounded px-2 py-1 flex-1" placeholder="DOI / URL" value={pubDraft.doi} onChange={e => setPubDraft(p => ({ ...p, doi: e.target.value }))} />
                                </div>
                                {pubError && <p className="text-xs text-destructive">{pubError}</p>}
                                <div className="flex gap-2 justify-end">
                                    <Button variant="ghost" size="sm" disabled={pubSaving} onClick={() => { setShowPublicationForm(false); setEditingPublication(null); setPubError(null) }}>Annuler</Button>
                                    <Button size="sm" disabled={!pubDraft.title.trim() || pubSaving} onClick={async () => {
                                        setPubSaving(true)
                                        setPubError(null)
                                        try {
                                            if (editingPublication) {
                                                await updatePublication(editingPublication.id, pubDraft)
                                                setPublications(prev => prev.map(p => p.id === editingPublication.id ? { ...p, ...pubDraft } : p))
                                                const existing = publicationMembers.filter(pm => pm.publication_id === editingPublication.id)
                                                const toDelete = existing.filter(pm => !pubAuthorIds.includes(pm.member_id))
                                                const toAdd = pubAuthorIds.filter(id => !existing.find(pm => pm.member_id === id))
                                                await Promise.all(toDelete.map(pm => deletePublicationMember(pm.id)))
                                                const added = await Promise.all(toAdd.map(id => addPublicationMember(editingPublication.id, id)))
                                                setPublicationMembers(prev => [
                                                    ...prev.filter(pm => !toDelete.find(d => d.id === pm.id)),
                                                    ...added,
                                                ])
                                            } else {
                                                const pub = await addPublication({ project_id: project!.id, ...pubDraft })
                                                setPublications(prev => [...prev, pub])
                                                const added = await Promise.all(pubAuthorIds.map(id => addPublicationMember(pub.id, id)))
                                                setPublicationMembers(prev => [...prev, ...added])
                                            }
                                            setShowPublicationForm(false)
                                            setEditingPublication(null)
                                            setPubError(null)
                                        } catch (err) {
                                            console.error('[Publication] save error:', err)
                                            setPubError('Erreur lors de l\'enregistrement. Vérifiez que les tables Grist existent.')
                                        } finally {
                                            setPubSaving(false)
                                        }
                                    }}>
                                        <Check size={13} className="mr-1" />{pubSaving ? 'Enregistrement…' : editingPublication ? 'Modifier' : 'Ajouter'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {publications.map(pub => {
                            const authors = publicationMembers
                                .filter(pm => pm.publication_id === pub.id)
                                .map(pm => members.find(m => m.id === pm.member_id))
                                .filter(Boolean)
                            const lab = allLabs.find(l => l.id === pub.lab_id)
                            return (
                                <div key={pub.id} className="flex flex-col gap-1 group rounded-lg border border-border px-3 py-2.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="text-xs font-medium leading-snug">{pub.title}</span>
                                        <div className="flex gap-3 mt-1 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-3 w-3" onClick={() => {
                                                setEditingPublication(pub)
                                                setPubDraft({ title: pub.title, lab_id: pub.lab_id, subject: pub.subject, journal: pub.journal, year: pub.year, doi: pub.doi })
                                                setPubAuthorIds(publicationMembers.filter(pm => pm.publication_id === pub.id).map(pm => pm.member_id))
                                                setShowPublicationForm(true)
                                            }}>
                                                <Pencil size={8} />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-3 w-3 hover:text-destructive" onClick={async () => {
                                                await deletePublication(pub.id)
                                                setPublications(prev => prev.filter(p => p.id !== pub.id))
                                                setPublicationMembers(prev => prev.filter(pm => pm.publication_id !== pub.id))
                                            }}>
                                                <Trash2 size={8} />
                                            </Button>
                                        </div>
                                    </div>
                                    {authors.length > 0 && (
                                        <span className="text-[11px] text-muted-foreground">
                                            {authors.map(m => `${m!.first_name} ${m!.last_name}`).join(', ')}
                                        </span>
                                    )}
                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                                        {lab && <span>{lab.name}</span>}
                                        {pub.journal && <span>· {pub.journal}</span>}
                                        {pub.year && <span>· {pub.year}</span>}
                                    </div>
                                    {pub.subject && <span className="text-[11px] text-muted-foreground italic">{pub.subject}</span>}
                                    {pub.doi && <a href={pub.doi.startsWith('http') ? pub.doi : `https://doi.org/${pub.doi}`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-500 hover:underline truncate">{pub.doi}</a>}
                                </div>
                            )
                        })}
                    </section>

                        </div>
                    )}{/* fin publications */}

                    {/* ── FORMATIONS ───────────────────────────── */}
                    {detailViewMode === "formations" && (
                        <div className="flex flex-col gap-6">

                    {/* Formations */}
                    <section className="flex flex-col gap-3 bg-white border border-border rounded-xl p-4">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Formations</p>
                        <div className="flex flex-col gap-2">
                            <SearchInput
                                data={allFormations.filter(f => !formations.find(pf => pf.id === f.id))}
                                onSelect={async f => {
                                    const link = await addProjectFormation(project!.id, f.id)
                                    setFormations(prev => [...prev, f])
                                    setFormationLinks(prev => [...prev, link])
                                }}
                                getLabel={f => `${f.code} — ${f.title}`}
                                filterFn={(f, q) => {
                                    const partner = f.partner_id ? partners.find(p => p.id === f.partner_id) : null
                                    return `${f.code} ${f.title} ${partner?.name ?? ''}`.toLowerCase().includes(q.toLowerCase())
                                }}
                                groupBy={f => {
                                    const partner = f.partner_id ? partners.find(p => p.id === f.partner_id) : null
                                    return {
                                        primary: partner?.name ?? 'Sans partenaire',
                                        secondary: f.level,
                                        primaryStyle: partner?.color ? { backgroundColor: partner.color } : undefined,
                                    }
                                }}
                                renderItem={f => {
                                    const partner = f.partner_id ? partners.find(p => p.id === f.partner_id) : null
                                    return (
                                        <div className="flex flex-col gap-0.5 min-w-0">
                                            <span className="text-xs font-medium truncate">{f.title}</span>
                                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                                <span>{f.code}</span>
                                                <span>·</span>
                                                <span>{f.degree_type}</span>
                                                {partner && <><span>·</span><span className="truncate">{partner.name}</span></>}
                                            </div>
                                        </div>
                                    )
                                }}
                                placeholder="Rechercher une formation..."
                            />
                            {formations.length === 0 && (
                                <p className="text-xs text-muted-foreground italic">Aucune formation rattachée</p>
                            )}
                            {formations.map(f => {
                                const fPartner = f.partner_id ? partners.find(p => p.id === f.partner_id) : null
                                return (
                                    <div key={f.id} className="flex flex-col gap-1 rounded-lg border border-border px-3 py-2.5">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex flex-col gap-0.5 min-w-0">
                                                <span className="text-xs font-medium truncate">{f.title}</span>
                                                <span className="text-xs text-muted-foreground">{f.code} · {f.degree_type} · {f.level}</span>
                                                {fPartner && <span className="text-xs text-muted-foreground truncate">{fPartner.name}</span>}
                                            </div>
                                            <Button
                                                variant="ghost" size="icon" className="h-6 w-6 shrink-0 rounded-md text-muted-foreground hover:text-destructive"
                                                onClick={async () => {
                                                    const link = formationLinks.find(l => l.formation_id === f.id)
                                                    if (link) await removeProjectFormation(link.id)
                                                    setFormations(prev => prev.filter(x => x.id !== f.id))
                                                    setFormationLinks(prev => prev.filter(l => l.formation_id !== f.id))
                                                }}
                                            >
                                                <X size={12} />
                                            </Button>
                                        </div>
                                        {f.formacode && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {f.formacode.split(',').slice(0, 2).map((code, i) => (
                                                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground truncate max-w-[160px]">{code.trim()}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </section>

                        </div>
                    )}{/* fin formations */}

                    {/* ── ACTIONS ─────────────────────────────── */}
                    {detailViewMode === "tasks" && (
                        <div className="flex flex-col gap-6">

                    {/* Fiches action */}
                    <section className='flex flex-col gap-3 bg-white border border-border rounded-xl p-4'>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fiches action</p>
                            </div>
                            {!showLinkCard && !showCreateCard && (
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 rounded-md" onClick={() => setShowLinkCard(true)}>
                                        <Plus size={11} />Lier
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 rounded-md" onClick={() => setShowCreateCard(true)}>
                                        <Plus size={11} />Créer
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                                {actionCards.length === 0 && !showLinkCard && !showCreateCard && (
                                    <p className="text-xs text-muted-foreground italic">Aucune fiche action liée</p>
                                )}

                                {showLinkCard && (
                                    <div className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-muted/30">
                                        <p className="text-xs text-muted-foreground">Lier une fiche existante</p>
                                        <SearchInput
                                            data={allActionCards.filter(c => !actionCards.some(ac => ac.id === c.id))}
                                            onSelect={async card => {
                                                const linkId = await linkActionCardToProject(project.id, card.id)
                                                setActionCards(prev => [...prev, { ...card, linkId }])
                                                setShowLinkCard(false)
                                            }}
                                            getLabel={c => c.title}
                                            placeholder="Rechercher une fiche..."
                                            renderItem={card => (
                                                <div className="flex items-center justify-between gap-2 w-full">
                                                    <span className="truncate">{card.title}</span>
                                                    <span className="text-xs text-muted-foreground shrink-0">{card.category.title}</span>
                                                </div>
                                            )}
                                        />
                                        <div className="flex justify-end">
                                            <Button variant="outline" size="sm" className="rounded-md" onClick={() => setShowLinkCard(false)}>Annuler</Button>
                                        </div>
                                    </div>
                                )}

                                {showCreateCard && (
                                    <ActionCardQuickCreateForm
                                        projectId={project.id}
                                        statuses={statuses}
                                        members={members}
                                        partners={partners}
                                        onSaved={card => {
                                            setActionCards(prev => [...prev, card])
                                            setShowCreateCard(false)
                                        }}
                                        onCancel={() => setShowCreateCard(false)}
                                    />
                                )}

                                {actionCards.map(card => {
                                    const categoryColor = card.category.parent?.color ?? card.category.color ?? null
                                    return (
                                        <div
                                            key={card.id}
                                            className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-muted/40 group cursor-pointer hover:bg-muted/70 transition-colors"
                                            onClick={() => setSelectedActionCard(card)}
                                        >
                                            {categoryColor && (
                                                <div className="w-1.5 h-8 rounded-full shrink-0" style={{ backgroundColor: categoryColor }} />
                                            )}
                                            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                                <span className="text-sm font-medium truncate">{card.title}</span>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span>{card.category.parent ? `${card.category.parent.title} · ` : ''}{card.category.title}</span>
                                                    {card.end_date && <span>→ {formatDate(card.end_date)}</span>}
                                                </div>
                                            </div>
                                            <span
                                                className="shrink-0 text-xs px-1.5 py-0.5 rounded-full border border-border text-black"
                                                style={{ backgroundColor: PROJECT_STATUS_COLORS[card.status.label] ?? '#f3f4f6' }}
                                            >
                                                {card.status.label}
                                            </span>
                                            <div
                                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                                                onClick={e => { e.stopPropagation(); handleUnlinkCard(card.linkId) }}
                                            >
                                                <X size={13} />
                                            </div>
                                        </div>
                                    )
                                })}
                        </div>
                    </section>

                        </div>
                    )}{/* fin tasks */}

                    {/* ── PIÈCES JOINTES ──────────────────────── */}
                    {detailViewMode === "files" && (
                        <div className="flex flex-col gap-6">

                            {/* Pièces jointes */}
                            <section className='flex flex-col gap-3 bg-white border border-border rounded-xl p-4'>
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pièces jointes</p>
                                    </div>
                                    <Button variant="outline" size="xs" className="rounded-md gap-1" onClick={() => setShowAttachForm(v => !v)}>
                                        <Plus size={11} /> Ajouter
                                    </Button>
                                </div>

                                <div className="flex flex-col gap-2">
                                        {showAttachForm && (
                                            <div className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-muted/30">
                                                <Input
                                                    value={newAttachLabel}
                                                    onChange={e => setNewAttachLabel(e.target.value)}
                                                    placeholder="Libellé (ex. Convention signée)"
                                                    className="h-8 text-xs"
                                                />
                                                <Input
                                                    value={newAttachUrl}
                                                    onChange={e => setNewAttachUrl(e.target.value)}
                                                    placeholder="URL (https://...)"
                                                    className="h-8 text-xs"
                                                />
                                                <div className="flex gap-2 justify-end">
                                                    <Button variant="outline" size="sm" className="rounded-md" onClick={() => { setShowAttachForm(false); setNewAttachLabel(''); setNewAttachUrl('') }}>Annuler</Button>
                                                    <Button size="sm" className="rounded-md" disabled={!newAttachLabel.trim() || !newAttachUrl.trim()} onClick={async () => {
                                                        const a = await addProjectAttachment(project!.id, newAttachLabel.trim(), newAttachUrl.trim())
                                                        setAttachments(prev => [...prev, a])
                                                        setNewAttachLabel('')
                                                        setNewAttachUrl('')
                                                        setShowAttachForm(false)
                                                    }}>
                                                        <Check size={12} className="mr-1" /> Ajouter
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {attachments.length === 0 && !showAttachForm && (
                                            <p className="text-xs text-muted-foreground italic">Aucune pièce jointe</p>
                                        )}

                                        {attachments.map(a => (
                                            <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 group">
                                                <a
                                                    href={a.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 min-w-0 text-xs hover:underline"
                                                >
                                                    <ExternalLink size={12} className="shrink-0 text-muted-foreground" />
                                                    <span className="truncate">{a.label}</span>
                                                </a>
                                                <Button
                                                    variant="ghost" size="icon" className="h-6 w-6 shrink-0 rounded-md text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={async () => {
                                                        await deleteProjectAttachment(a.id)
                                                        setAttachments(prev => prev.filter(x => x.id !== a.id))
                                                    }}
                                                >
                                                    <X size={12} />
                                                </Button>
                                            </div>
                                        ))}
                                </div>
                            </section>

                        </div>
                    )}{/* fin files */}

                    {/* ── JALONS ──────────────────────────────── */}
                    {/* ── BUDGET ──────────────────────────────── */}
                    {detailViewMode === "budget" && (
                        <div className="flex flex-col gap-6">

                            {/* Dépenses */}
                     <section className='flex flex-col gap-3 bg-white border border-border rounded-xl p-4'>
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Dépenses {projectExpanses.length > 0 && <span>({projectExpanses.length})</span>}
                            </p>
                            {!showLinkExpanse && (
                                <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 rounded-md text-muted-foreground" onClick={() => setShowLinkExpanse(true)}>
                                    Rattacher
                                </Button>
                            )}
                        </div>

                        {showLinkExpanse && (
                            <div className="flex flex-col gap-2 p-3 rounded-lg border bg-muted/30">
                                <p className="text-xs font-medium">Rattacher une dépense existante</p>
                                <SearchInput
                                    data={allExpanses.filter(e => e.project_id !== project.id)}
                                    onSelect={async e => {
                                        await updateExpanse(e.id, { project_id: project.id })
                                        const linked = { ...e, project_id: project.id }
                                        setProjectExpanses(prev => [...prev, linked])
                                        setAllExpanses(prev => prev.map(x => x.id === e.id ? linked : x))
                                        setShowLinkExpanse(false)
                                    }}
                                    getLabel={e => e.title}
                                    placeholder="Rechercher une dépense…"
                                    groupBy={e => ({ primary: e.category })}
                                />
                                <div className="flex justify-end">
                                    <Button variant="outline" size="sm" className="h-6 text-xs rounded-md" onClick={() => setShowLinkExpanse(false)}>Annuler</Button>
                                </div>
                            </div>
                        )}

                        {loading ? (
                            <div className="flex flex-col gap-2">
                                {[1, 2].map(i => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}
                            </div>
                        ) : projectExpanses.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">Aucune dépense rattachée à ce projet</p>
                        ) : (
                            <>
                                <div className="rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="text-xs bg-muted/50">
                                                <TableHead className="h-7 text-xs">Intitulé</TableHead>
                                                <TableHead className="h-7 text-xs w-32">Catégorie</TableHead>
                                                <TableHead className="h-7 text-xs w-28 text-right">Montant</TableHead>
                                                <TableHead className="h-7 text-xs w-32">Fournisseur</TableHead>
                                                <TableHead className="h-7 text-xs w-24">Statut</TableHead>
                                                <TableHead className="h-7 text-xs w-24">Engagement</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {projectExpanses.map(e => {
                                                const supplier = e.supplier_id ? expanseSuppliers.find(s => s.id === e.supplier_id) : null
                                                const linkedAgreement = e.agreement_id ? agreements.find(a => a.id === e.agreement_id) : null
                                                const categoryColors: Record<string, string> = {
                                                    'Fonctionnement': '#ffedd5', 'Investissement': '#fef9c3',
                                                    'Personnel': '#dbeafe', 'Autre': '#f3f4f6',
                                                }
                                                const statusColors: Record<string, string> = {
                                                    'Engagé': '#dbeafe', 'Livré': '#fef9c3', 'Payé': '#dcfce7',
                                                }
                                                                return (
                                                    <TableRow key={e.id} className={`text-xs hover:bg-muted/30 ${linkedAgreement ? 'bg-blue-50/40' : ''}`}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <TableCell className="font-medium truncate max-w-[180px]">
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <span className="truncate">{e.title}</span>
                                                                        {linkedAgreement && (
                                                                            <span className="text-[10px] text-blue-600 font-normal">↳ {linkedAgreement.title}</span>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                            </TooltipTrigger>
                                                            <TooltipContent>{e.title}</TooltipContent>
                                                        </Tooltip>
                                                        <TableCell>
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: categoryColors[e.category] ?? '#f3f4f6' }}>
                                                                    {e.category}
                                                                </span>
                                                                {e.label && <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: '#f3f4f6' }}>{e.label}</span>}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right tabular-nums font-medium">{fmt(e.amount)}</TableCell>
                                                        <TableCell className="text-muted-foreground truncate">{supplier?.name ?? '—'}</TableCell>
                                                        <TableCell>
                                                            <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: statusColors[e.status] ?? '#f3f4f6' }}>
                                                                {e.status}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground tabular-nums">
                                                            {e.purchase_date ? new Date(e.purchase_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                                <div className="flex flex-col gap-1 text-xs border-t pt-2 mt-1">
                                    {reversementExpanses.length > 0 && (
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Dépenses opérationnelles</span>
                                            <span className="font-medium text-foreground">{fmt(operationalExpanses.reduce((s, e) => s + e.amount, 0))}</span>
                                        </div>
                                    )}
                                    {reversementExpanses.length > 0 && (
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Reversements conventions</span>
                                            <span className="font-medium text-foreground">{fmt(reversementExpanses.reduce((s, e) => s + e.amount, 0))}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-medium text-foreground">
                                        <span>Total engagé</span>
                                        <span>{fmt(totalExpanses)}</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </section>

                        </div>
                    )}{/* fin budget */}

                    {/* ── CONVENTIONS ─────────────────────────── */}
                    {detailViewMode === "conventions" && (
                        <div className="flex flex-col gap-6">

                    {/* Conventions */}
                     <section className='flex flex-col gap-3 bg-white border border-border rounded-xl p-4'>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Conventions</p>
                            </div>
                            {!showAddForm && !showLinkAgreement && !editingAgreement && (
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 rounded-md" onClick={() => setShowAddForm(true)}>
                                        <Plus size={11} />Nouvelle
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 rounded-md text-muted-foreground" onClick={async () => {
                                        setShowLinkAgreement(true)
                                        if (allAgreementsForLink.length === 0) {
                                            setLoadingLinkAgreements(true)
                                            const all = await getFinancialAgreements()
                                            const partnerMap = new Map(partners.map(p => [p.id, p]))
                                            setAllAgreementsForLink((all as FinancialAgreement[])
                                                .filter(a => a.project_id !== project.id)
                                                .map(a => ({ ...a, partner: partnerMap.get(a.partner_id) ?? { id: 0, name: '?', description: '', color: '', logo: '', status_id: 0, type: '', consortium: false } }))
                                            )
                                            setLoadingLinkAgreements(false)
                                        }
                                    }}>
                                        Rattacher
                                    </Button>
                                </div>
                            )}
                        </div>

                        {loading ? (
                            <div className="flex flex-col gap-2">
                                {[1, 2].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {agreements.map(a =>
                                    editingAgreement?.id === a.id ? (
                                        <AgreementForm
                                            key={a.id}
                                            partners={partners}
                                            statuses={statuses}
                                            axes={axes}
                                            projectId={project.id}
                                            initial={a}
                                            budgetCategories={budgetCategories}
                                            budgetDetails={budgetDetails}
                                            onSaved={handleAgreementSaved}
                                            onCancel={() => setEditingAgreement(null)}
                                        />
                                    ) : (
                                        <AgreementRow
                                            key={a.id}
                                            agreement={a}
                                            statuses={statuses}
                                            axe={axis.find(ax => ax.id === a.axis_id)}
                                            onEdit={setEditingAgreement}
                                            onDelete={handleDeleteAgreement}
                                            onOpen={() => setSelectedAgreement(a)}
                                        />
                                    )
                                )}

                                {showAddForm && (
                                    <AgreementForm
                                        partners={partners}
                                        statuses={statuses}
                                        axes={axes}
                                        projectId={project.id}
                                        budgetCategories={budgetCategories}
                                        budgetDetails={budgetDetails}
                                        onSaved={a => { handleAgreementSaved(a); setShowAddForm(false) }}
                                        onCancel={() => setShowAddForm(false)}
                                    />
                                )}

                                {showLinkAgreement && (
                                    <div className="flex flex-col gap-2 p-3 rounded-lg border bg-muted/30">
                                        <p className="text-xs font-medium">Rattacher une convention existante</p>
                                        {loadingLinkAgreements
                                            ? <p className="text-xs text-muted-foreground">Chargement…</p>
                                            : <SearchInput
                                                data={allAgreementsForLink}
                                                onSelect={async a => {
                                                    await updateAgreement(a.id, { project_id: project.id })
                                                    setAgreements(prev => [...prev, { ...a, project_id: project.id }])
                                                    onAgreementAdded({ ...a, project_id: project.id })
                                                    setAllAgreementsForLink(prev => prev.filter(x => x.id !== a.id))
                                                    setShowLinkAgreement(false)
                                                }}
                                                getLabel={a => a.title}
                                                placeholder="Rechercher une convention…"
                                                groupBy={a => ({ primary: a.partner.name })}
                                            />
                                        }
                                        <div className="flex justify-end">
                                            <Button variant="outline" size="sm" className="h-6 text-xs rounded-md" onClick={() => setShowLinkAgreement(false)}>Annuler</Button>
                                        </div>
                                    </div>
                                )}

                                {agreements.length === 0 && !showAddForm && !showLinkAgreement && (
                                    <p className="text-xs text-muted-foreground italic">Aucune convention</p>
                                )}
                            </div>
                        )}

                        {/* Totaux conventions */}
                        {agreements.length > 0 && (
                            <>
                                <Separator />
                                <div className="flex flex-col gap-1 text-xs">
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Budget total conventions</span>
                                        <span className="font-medium text-foreground">{fmt(totalBudget)}</span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Subventions accordées</span>
                                        <span className="font-medium text-foreground">{fmt(totalGrant)}</span>
                                    </div>
                                    {reversementExpanses.length > 0 && (
                                        <div className="flex justify-between text-muted-foreground">
                                            <span className="italic">Dont versé (comptabilisé en dépenses)</span>
                                            <span className="italic">{fmt(reversementExpanses.reduce((s, e) => s + e.amount, 0))}</span>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </section>

                        </div>
                    )}{/* fin conventions */}

                </div>
            </SheetContent>
        </Sheet>

        {/* Dialog détail convention */}
        <AgreementDetailDialog
            open={!!selectedAgreement}
            onClose={() => setSelectedAgreement(null)}
            agreement={selectedAgreement ?? null}
            partners={partners}
            statuses={statuses}
            axes={axes}
            projectId={project?.id ?? 0}
            budgetDetails={budgetDetails}
            onSaved={a => setAgreements(prev => prev.map(x => x.id === a.id ? a : x))}
            onDeleted={id => { setAgreements(prev => prev.filter(x => x.id !== id)); setSelectedAgreement(null) }}
        />

        {/* Dialog détail KPI */}
        <Dialog open={!!selectedKpi} onOpenChange={open => { if (!open) setSelectedKpi(null) }}>
            <DialogContent style={{ maxWidth: '550px' }}>
                {selectedKpi && (
                    <KpiEntryDialog
                        kpi={selectedKpi}
                        projectId={project?.id ?? 0}
                        entries={kpiEntries.filter(e => e.kpi_id === selectedKpi.id)}
                        currentUserId={0}
                        onEntryAdded={entry => setKpiEntries(prev => [...prev, entry])}
                        onEntryUpdated={entry => setKpiEntries(prev => prev.map(e => e.id === entry.id ? entry : e))}
                        onEntryDeleted={id => setKpiEntries(prev => prev.filter(e => e.id !== id))}
                    />
                )}
            </DialogContent>
        </Dialog>

        {/* Dialog déclarations de temps */}
        <Dialog open={!!selectedPm} onOpenChange={open => { if (!open) setSelectedPm(null) }}>
            <DialogContent style={{ maxWidth: '550px' }} className="flex flex-col max-h-[80vh]">
                {selectedPm && (() => {
                    const pmMember = members.find(m => m.id === selectedPm.member_id)
                    const pmPartner = pmMember ? partners.find(p => p.id === pmMember.partner_id) : undefined
                    if (!pmMember) return null
                    return (
                        <MemberTimeDialog
                            pm={selectedPm}
                            member={pmMember}
                            partner={pmPartner}
                            entries={projectTimes.filter(pt => pt.member_id === selectedPm.member_id)}
                            projectId={project?.id ?? 0}
                            onEntryAdded={e => onTimeEntryAdded?.(e)}
                            onEntryUpdated={e => onTimeEntryUpdated?.(e)}
                            onEntryDeleted={id => onTimeEntryDeleted?.(id)}
                        />
                    )
                })()}
            </DialogContent>
        </Dialog>


        {/* Sheet détail ActionCard */}
        {selectedActionCard && (
            <ActionCardDetailSheet
                card={toActionCardData(selectedActionCard)}
                open={!!selectedActionCard}
                onClose={() => setSelectedActionCard(null)}
                onUpdated={patch => {
                    setActionCards(prev => prev.map(c =>
                        c.id === selectedActionCard.id ? { ...c, ...patch } as (ActionCardFull & { linkId: number }) : c
                    ))
                    setSelectedActionCard(prev => prev ? { ...prev, ...patch } as (ActionCardFull & { linkId: number }) : null)
                }}
                onDeleted={id => {
                    setActionCards(prev => prev.filter(c => c.id !== id))
                    setSelectedActionCard(null)
                }}
            />
        )}
        {selectedPartner && (
            <PartnerDetailSheet
                partner={selectedPartner}
                open={!!selectedPartner}
                onClose={() => setSelectedPartner(null)}
                onUpdated={updated => {
                    setProjectPartners(prev => prev.map(pp =>
                        pp.partner_id === updated.id ? { ...pp, partner: updated } : pp
                    ))
                    setSelectedPartner(updated)
                }}
                onDeleted={id => {
                    setProjectPartners(prev => prev.filter(pp => pp.partner_id !== id))
                    setSelectedPartner(null)
                }}
            />
        )}
        </>
    )
}

function toActionCardData(card: ActionCardFull): ActionCardData {
    return {
        id:          card.id,
        title:       card.title,
        description: card.description,
        start_date:  card.start_date,
        end_date:    card.end_date,
        status:      { id: card.status.id, label: card.status.label, context: card.status.context },
        category:    {
            id:     card.category.id,
            title:  card.category.title,
            color:  card.category.color ?? null,
            parent: card.category.parent
                ? { id: card.category.parent.id, title: card.category.parent.title, color: card.category.parent.color ?? null }
                : undefined,
        },
        owner: card.owner
            ? { id: card.owner.id, first_name: card.owner.first_name, last_name: card.owner.last_name, position: card.owner.position }
            : undefined,
    }
}

// --- MemberTimeDialog ---

type MemberTimeDialogProps = {
    pm: ProjectMember
    member: Member
    partner?: Partner
    entries: TimeEntry[]
    projectId: number
    onEntryAdded: (e: TimeEntry) => void
    onEntryUpdated: (e: TimeEntry) => void
    onEntryDeleted: (id: number) => void
}

function MemberTimeDialog({ pm, member, partner, entries, projectId, onEntryAdded, onEntryUpdated, onEntryDeleted }: MemberTimeDialogProps) {
    const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
    const [showAddForm, setShowAddForm] = useState(false)
    const totalDays = entries.reduce((acc, e) => acc + e.days, 0)

    return (
        <>
            <DialogHeader>
                <DialogTitle className="text-sm font-semibold flex items-center gap-2">
                    {member.first_name} {member.last_name}
                    {partner && (
                        <span
                            className="text-[10px] font-normal px-1.5 py-0.5 rounded-full border border-border"
                            style={partner.color ? { backgroundColor: partner.color } : {}}
                        >
                            {partner.name}
                        </span>
                    )}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">{pm.role}{totalDays > 0 ? ` · ${totalDays}j déclarés` : ''}</p>
            </DialogHeader>

            <div className="flex flex-col gap-3 mt-2 overflow-y-auto min-h-0">
                {entries.length > 0 && (
                    <Table className="text-xs">
                        <TableHeader>
                            <TableRow className="hover:bg-transparent ">
                                <TableHead className="h-7 px-2 text-xs font-normal text-muted-foreground">Début</TableHead>
                                <TableHead className="h-7 px-2 text-xs font-normal text-muted-foreground">Fin</TableHead>
                                <TableHead className="h-7 px-2 text-xs font-normal text-muted-foreground text-right">Jours</TableHead>
                                <TableHead className="h-7 w-8 px-2" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {entries.map(entry => (
                                editingEntry?.id === entry.id ? (
                                    <TableRow key={entry.id} className="">
                                        <TableCell colSpan={4} className="px-2 py-1">
                                            <MemberTimeEntryForm
                                                projectId={projectId}
                                                memberId={member.id}
                                                initial={entry}
                                                onSaved={e => { onEntryUpdated(e); setEditingEntry(null) }}
                                                onCancel={() => setEditingEntry(null)}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <TableRow key={entry.id} className="group border-none hover:bg-muted cursor-pointer" onClick={() => setEditingEntry(entry)}>
                                        <TableCell className="px-2 py-1.5">{formatDate(entry.start_date)}</TableCell>
                                        <TableCell className="px-2 py-1.5">{formatDate(entry.end_date)}</TableCell>
                                        <TableCell className="px-2 py-1.5 text-right font-medium">{entry.days}j</TableCell>
                                        <TableCell className="px-2 py-1.5">
                                            <button
                                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                                onClick={async e => { e.stopPropagation(); await removeTimeEntry(entry.id); onEntryDeleted(entry.id) }}
                                            >
                                                <X size={13} />
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                )
                            ))}
                        </TableBody>
                    </Table>
                )}

                {!editingEntry && (
                    showAddForm ? (
                        <MemberTimeEntryForm
                            projectId={projectId}
                            memberId={member.id}
                            onSaved={e => { onEntryAdded(e); setShowAddForm(false) }}
                            onCancel={() => setShowAddForm(false)}
                        />
                    ) : (
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1 self-start rounded-md" onClick={() => setShowAddForm(true)}>
                            <Plus size={12} /> Ajouter une déclaration
                        </Button>
                    )
                )}
            </div>
        </>
    )
}

// --- MemberTimeEntryForm ---

type MemberTimeEntryFormProps = {
    projectId: number
    memberId: number
    initial?: TimeEntry
    onSaved: (e: TimeEntry) => void
    onCancel?: () => void
}

function MemberTimeEntryForm({ projectId, memberId, initial, onSaved, onCancel }: MemberTimeEntryFormProps) {
    const [days, setDays] = useState(initial?.days ?? 0)
    const [startDate, setStartDate] = useState(initial?.start_date ?? '')
    const [endDate, setEndDate] = useState(initial?.end_date ?? '')
    const [saving, setSaving] = useState(false)

    async function handleSave() {
        if (!days || !startDate || !endDate) return
        setSaving(true)
        try {
            if (initial) {
                await updateTimeEntry(initial.id, { days, start_date: startDate, end_date: endDate })
                onSaved({ ...initial, days, start_date: startDate, end_date: endDate })
            } else {
                const entry = await addTimeEntry(projectId, memberId, days, startDate, endDate)
                onSaved(entry)
                setDays(0); setStartDate(''); setEndDate('')
            }
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="flex items-end gap-2">
            <div className="flex flex-col gap-1 flex-1">
                <Label className="text-xs">Début</Label>
                <Input type="date" className="h-7 text-xs" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1 flex-1">
                <Label className="text-xs">Fin</Label>
                <Input type="date" className="h-7 text-xs" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1 w-16">
                <Label className="text-xs">Jours</Label>
                <Input type="number" min={0} className="h-7 text-xs" value={days || ''} onChange={e => setDays(Number(e.target.value))} />
            </div>
            <Button size="sm" className="h-7 text-xs rounded-md" disabled={saving || !days || !startDate || !endDate} onClick={handleSave}>
                {initial ? 'Modifier' : 'Ajouter'}
            </Button>
            {onCancel && (
                <Button size="sm" variant="ghost" className="h-7 text-xs rounded-md" onClick={onCancel}>Annuler</Button>
            )}
        </div>
    )
}

// --- KpiEntryDialog ---

type KpiEntryDialogProps = {
    kpi: Kpi
    projectId: number
    entries: KpiEntry[]
    currentUserId: number
    onEntryAdded: (e: KpiEntry) => void
    onEntryUpdated: (e: KpiEntry) => void
    onEntryDeleted: (id: number) => void
}

function KpiEntryDialog({ kpi, projectId, entries, currentUserId, onEntryAdded, onEntryUpdated, onEntryDeleted }: KpiEntryDialogProps) {
    const [editingId, setEditingId] = useState<number | null>(null)
    const [showAdd, setShowAdd] = useState(false)
    const sorted = [...entries].sort((a, b) => a.year.localeCompare(b.year))

    return (
        <>
            <DialogHeader>
                <DialogTitle className="text-sm font-semibold">{kpi.label}</DialogTitle>
                <p className="text-xs text-muted-foreground">{kpi.definition}</p>
            </DialogHeader>

            <div className="flex flex-col gap-2 mt-2">
                {sorted.length === 0 && !showAdd && (
                    <p className="text-xs text-muted-foreground italic">Aucune saisie pour ce KPI.</p>
                )}

                {sorted.map(entry => (
                    <div key={entry.id}>
                        {editingId === entry.id ? (
                            <KpiEntryForm
                                initial={entry}
                                kpi={kpi}
                                projectId={projectId}
                                currentUserId={currentUserId}
                                onSaved={updated => { onEntryUpdated(updated); setEditingId(null) }}
                                onCancel={() => setEditingId(null)}
                            />
                        ) : (
                            <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-border group">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-muted-foreground w-10">{entry.year}</span>
                                    <span className="text-sm font-semibold tabular-nums">{entry.value}</span>
                                    <span className="text-xs text-muted-foreground">{kpi.unit}</span>
                                    {entry.comment && <span className="text-xs text-muted-foreground truncate max-w-[300px]">{entry.comment}</span>}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingId(entry.id)} className="p-1 rounded hover:bg-muted">
                                        <Pencil size={12} />
                                    </button>
                                    <button onClick={async () => { await deleteKpiEntry(entry.id); onEntryDeleted(entry.id) }} className="p-1 rounded hover:bg-muted text-destructive">
                                        <Trash size={12} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {showAdd ? (
                    <KpiEntryForm
                        kpi={kpi}
                        projectId={projectId}
                        currentUserId={currentUserId}
                        onSaved={entry => { onEntryAdded(entry); setShowAdd(false) }}
                        onCancel={() => setShowAdd(false)}
                    />
                ) : (
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 self-start rounded-md" onClick={() => setShowAdd(true)}>
                        <Plus size={11} /> Ajouter une saisie
                    </Button>
                )}
            </div>
        </>
    )
}


// --- Filtre membres : dropdown avec recherche et groupement par établissement ---

type MemberFilterProps = {
    allMembers: Member[]
    allPartners: Partner[]
    selectedIds: number[]
    onChangeIds: (ids: number[]) => void
}

function MemberFilter({ allMembers, allPartners, selectedIds, onChangeIds }: MemberFilterProps) {
    const [query, setQuery] = useState('')
    const partnerMap = new Map(allPartners.map(p => [p.id, p]))

    const filtered = query.trim() === ''
        ? allMembers
        : allMembers.filter(m =>
            `${m.first_name} ${m.last_name}`.toLowerCase().includes(query.toLowerCase())
        )

    // Grouper par établissement
    const groupMap = new Map<number, { partner: Partner; members: Member[] }>()
    for (const m of filtered) {
        const partner = partnerMap.get(m.partner_id)
        if (!partner) continue
        if (!groupMap.has(partner.id)) groupMap.set(partner.id, { partner, members: [] })
        groupMap.get(partner.id)!.members.push(m)
    }
    const groups = Array.from(groupMap.values())

    function toggle(id: number) {
        onChangeIds(selectedIds.includes(id)
            ? selectedIds.filter(i => i !== id)
            : [...selectedIds, id]
        )
    }

    function toggleGroup(members: Member[]) {
        const ids = members.map(m => m.id)
        const allChecked = ids.every(id => selectedIds.includes(id))
        onChangeIds(allChecked
            ? selectedIds.filter(id => !ids.includes(id))
            : [...new Set([...selectedIds, ...ids])]
        )
    }

    function groupState(members: Member[]): boolean | 'indeterminate' {
        const count = members.filter(m => selectedIds.includes(m.id)).length
        if (count === 0) return false
        if (count === members.length) return true
        return 'indeterminate'
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant={selectedIds.length > 0 ? 'default' : 'outline'}
                    size="sm"
                    className="gap-2 rounded-md"
                >
                    <Users size={14} />
                    Membres
                    {selectedIds.length > 0 && (
                        <span className="text-xs opacity-75">{selectedIds.length}</span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60">
                <div className="px-2 py-1.5">
                    <Input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Rechercher un membre..."
                        className="h-7 text-xs"
                    />
                </div>
                <DropdownMenuSeparator />
                <div className="max-h-72 overflow-y-auto">
                {groups.map((group, i) => {
                    const state = groupState(group.members)
                    return (
                        <div key={group.partner.id}>
                            {i > 0 && <DropdownMenuSeparator />}
                            <DropdownMenuCheckboxItem
                                checked={state === true}
                                onCheckedChange={() => toggleGroup(group.members)}
                                className="font-medium gap-2"
                            >
                                <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-border"
                                    style={group.partner.color ? { backgroundColor: group.partner.color } : {}}
                                />
                                {group.partner.name}
                            </DropdownMenuCheckboxItem>
                            {group.members.map(m => (
                                <DropdownMenuCheckboxItem
                                    key={m.id}
                                    checked={selectedIds.includes(m.id)}
                                    onCheckedChange={() => toggle(m.id)}
                                    className="pl-7"
                                >
                                    {m.first_name} {m.last_name}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </div>
                    )
                })}
                </div>
                {selectedIds.length > 0 && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem checked={false} onCheckedChange={() => onChangeIds([])}>
                            Tout effacer
                        </DropdownMenuCheckboxItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

// --- KpiEntryForm ---

type KpiEntryFormProps = {
    kpi: Kpi
    projectId: number
    currentUserId: number
    initial?: KpiEntry
    onSaved: (e: KpiEntry) => void
    onCancel: () => void
}

function KpiEntryForm({ kpi, projectId, currentUserId, initial, onSaved, onCancel }: KpiEntryFormProps) {
    const currentYear = String(new Date().getFullYear())
    const [value,   setValue]   = useState(String(initial?.value ?? ''))
    const [year,    setYear]    = useState(initial?.year ?? currentYear)
    const [comment, setComment] = useState(initial?.comment ?? '')
    const [saving,  setSaving]  = useState(false)

    async function handleSave() {
        const v = Number(value)
        if (isNaN(v) || !year) return
        setSaving(true)
        try {
            if (initial) {
                await updateKpiEntry(initial.id, { value: v, year, comment })
                onSaved({ ...initial, value: v, year, comment })
            } else {
                const entry = await addKpiEntry({
                    kpi_id: kpi.id, project_id: projectId,
                    member_id: currentUserId, author_id: currentUserId,
                    value: v, year, comment, date: new Date().toISOString().slice(0, 10),
                })
                onSaved(entry)
            }
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2.5">
            <div className="flex gap-2">
                <div className="flex flex-col gap-1 flex-1">
                    <Label className="text-xs">Valeur ({kpi.unit})</Label>
                    <Input type="number" value={value} onChange={e => setValue(e.target.value)} className="h-7 text-sm" />
                </div>
                <div className="flex flex-col gap-1 w-20">
                    <Label className="text-xs">Année</Label>
                    <Input value={year} onChange={e => setYear(e.target.value)} className="h-7 text-sm" maxLength={4} />
                </div>
            </div>
            <div className="flex flex-col gap-1">
                <Label className="text-xs">Commentaire</Label>
                <Input value={comment} onChange={e => setComment(e.target.value)} className="h-7 text-sm" placeholder="Optionnel" />
            </div>
            <div className="flex gap-1.5 justify-end">
                <Button variant="ghost" size="sm" className="h-7 text-xs rounded-md" onClick={onCancel}>Annuler</Button>
                <Button size="sm" className="h-7 text-xs rounded-md" onClick={handleSave} disabled={saving}>
                    {saving ? '...' : initial ? 'Mettre à jour' : 'Enregistrer'}
                </Button>
            </div>
        </div>
    )
}

// --- Composant principal ---

export default function Projects() {
    const [projects,      setProjects]      = useState<ProjectFull[]>([])
    const [projectCalls,  setProjectCalls]  = useState<ProjectCallFull[]>([])
    const [axes,          setAxes]          = useState<Axis[]>([])
    const [statuses,      setStatuses]      = useState<Status[]>([])
    const [partners,      setPartners]      = useState<Partner[]>([])
    const [members,       setMembers]       = useState<Member[]>([])
    const [allProjectMembers, setAllProjectMembers] = useState<ProjectMember[]>([])
    const [allAgreements, setAllAgreements] = useState<FinancialAgreement[]>([])
    const [allFormations, setAllFormations] = useState<Formation[]>([])
    const [loading,       setLoading]       = useState(true)
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])


    // Filtres
    const [search,            setSearch]            = useState('')
    const [selectedAxisIds,   setSelectedAxisIds]   = useState<number[]>([])
    const [selectedCallIds,   setSelectedCallIds]   = useState<number[]>([])
    const [selectedStatuses, setSelectedStatuses] = useState<number[]>([])
    const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([])

    const [callSheetOpen,    setCallSheetOpen]    = useState(false)
    const [projectSheetOpen, setProjectSheetOpen] = useState(false)
    const [detailOpen,       setDetailOpen]       = useState(false)
    const [selectedProject,  setSelectedProject]  = useState<ProjectFull | null>(null)
    const [editingCall,      setEditingCall]      = useState<ProjectCall | undefined>()
    const [defaultCallId,    setDefaultCallId]    = useState<number | undefined>()

    const [multipleSelect,           setMultipleSelect]           = useState(false)
    const [selectedProjects,         setSelectedProjects]         = useState<ProjectFull[]>([])
    const [confirmingDeleteProjects, setConfirmingDeleteProjects] = useState(false)

    type ViewMode = 'cards' | 'table' | 'calendar'
    const [viewMode, setViewMode] = useState<ViewMode>('cards')
    const [ganttYear, setGanttYear] = useState(new Date().getFullYear())
    const [ganttViewMode, setGanttViewMode] = useState<GanttViewMode>(GanttViewMode.Month)

    type SortKey = 'title' | 'call' | 'axis' | 'status' | 'budget' | 'start_date' | 'end_date'
    const [sortKey,  setSortKey]  = useState<SortKey>('title')
    const [sortDir,  setSortDir]  = useState<'asc' | 'desc'>('asc')

    function handleSort(key: SortKey) {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortKey(key); setSortDir('asc') }
    }

    function handleViewMode(mode: ViewMode) {
        setViewMode(mode)
        setSearch('')
        setMultipleSelect(false)
    }


    useEffect(() => {
        Promise.all([getProjectCalls(), getProjects(), getAxes(), getStatuses(), getPartners(), getFinancialAgreements(), getMembers(), getTimeEntries(), getAllProjectMembers(), getFormations()])
            .then(([pcs, ps, axs, sts, pts, agrs, m, te, pm, formations]) => {
                const axisMap = new Map((axs as Axis[]).map(a => [a.id, a]))

                const fullCalls: ProjectCallFull[] = (pcs as ProjectCall[]).map(pc => ({
                    ...pc,
                    axis: axisMap.get(pc.axis_id) ?? { id: 0, name: 'Inconnu', description: '' },
                }))

                const callMap = new Map(fullCalls.map(pc => [pc.id, pc]))
                const fullProjects: ProjectFull[] = (ps as Project[]).map(p => ({
                    ...p,
                    projectCall: callMap.get(p.project_call_id) ?? { id: 0, axis_id: 0, title: 'Inconnu', description: '', start_date: '', end_date: '', status_id: 0, budget: 0, axis: { id: 0, name: 'Inconnu', description: '' } },
                }))

                setAxes(axs as Axis[])
                setStatuses(sts as Status[])
                setPartners(pts as Partner[])
                setProjectCalls(fullCalls)
                setProjects(fullProjects)
                setAllAgreements(agrs as FinancialAgreement[])
                setMembers(m)
                setTimeEntries(te)
                setAllProjectMembers(pm)
                setAllFormations(formations as Formation[])
            })
            .finally(() => setLoading(false))
    }, [])

    // Conventions enrichies par projet (pour les ProjectCards)
    const partnerMap = new Map(partners.map(p => [p.id, p]))
    const agreementsByProject = allAgreements.reduce<Map<number, AgreementFull[]>>((acc, a) => {
        const partner = partnerMap.get(a.partner_id)
        if (!partner) return acc
        const list = acc.get(a.project_id) ?? []
        acc.set(a.project_id, [...list, { ...a, partner }])
        return acc
    }, new Map())

    // Filtres

    const filteredCalls = projectCalls.filter(pc => {
        if (selectedAxisIds.length > 0 && !selectedAxisIds.includes(pc.axis_id)) return false
        if (selectedCallIds.length > 0 && !selectedCallIds.includes(pc.id)) return false
        return true
    })

    const filteredProjects = projects.filter(p => {
        if (!filteredCalls.find(pc => pc.id === p.project_call_id)) return false
        if (selectedStatuses.length > 0 && !selectedStatuses.includes(p.status_id)) return false
        if (selectedMemberIds.length > 0) {
            const projectMemberIds = allProjectMembers
                .filter(pm => pm.project_id === p.id)
                .map(pm => pm.member_id)
            if (!selectedMemberIds.some(id => projectMemberIds.includes(id))) return false
        }
        if (search.trim() && !p.title.toLowerCase().includes(search.toLowerCase())) return false
        return true
    })


    function handleProjectCreated(p: Project) {
        const call = projectCalls.find(pc => pc.id === p.project_call_id)!
        setProjects(prev => [...prev, { ...p, projectCall: call }])
        setProjectSheetOpen(false)
    }



    function handleCallCreated(pc: ProjectCall) {
        const axis = axes.find(a => a.id === pc.axis_id) ?? { id: 0, name: 'Inconnu', description: '' }
        const full: ProjectCallFull = { ...pc, axis }
        setProjectCalls(prev => {
            const existing = prev.find(p => p.id === pc.id)
            if (existing) return prev.map(p => p.id === pc.id ? full : p)
            return [...prev, full]
        })
        setCallSheetOpen(false)
        setEditingCall(undefined)
    }

    function handleProjectUpdated(p: Project) {
        console.log('handleProjectUpdated', p)
        const call = projectCalls.find(pc => pc.id === p.project_call_id)
        setProjects(prev => prev.map(x => x.id === p.id ? { ...x, ...p, projectCall: call ?? x.projectCall } : x))
        setSelectedProject(prev => {
            const updated = prev ? { ...prev, ...p, projectCall: call ?? prev.projectCall } : null
            console.log('setSelectedProject =>', updated)
            return updated
        })
    }

    function handleProjectDeleted(id: number) {
        setProjects(prev => prev.filter(p => p.id !== id))
        setSelectedProject(null)
        setDetailOpen(false)
    }

    function handleCallDeleted(id: number) {
        setProjectCalls(prev => prev.filter(pc => pc.id !== id))
        // retire aussi les projets liés à cet AAP
        setProjects(prev => prev.filter(p => p.project_call_id !== id))
    }

    function toggleProject(p: ProjectFull) {
        setSelectedProjects(prev =>
            prev.find(x => x.id === p.id)
                ? prev.filter(x => x.id !== p.id)
                : [...prev, p]
        )
    }

    async function handleDeleteSelectedProjects() {
        await Promise.all(selectedProjects.map(p => deleteProject(p.id)))
        setProjects(prev => prev.filter(p => !selectedProjects.find(sp => sp.id === p.id)))
        setSelectedProjects([])
        setMultipleSelect(false)
        setConfirmingDeleteProjects(false)
    }

    function copyProjectTitlesGroup() {
        navigator.clipboard.writeText(selectedProjects.map(p => p.title).join('\n'))
    }

    function handleAgreementAdded(a: FinancialAgreement) {
        setAllAgreements(prev => [...prev, a])
    }

    function handleAgreementDeleted(id: number) {
        setAllAgreements(prev => prev.filter(a => a.id !== id))
    }

    // Stats globales
    const activeAxisIds = [...new Set(filteredCalls.map(pc => pc.axis_id))]
    const activeAxes    = axes.filter(a => activeAxisIds.includes(a.id))

    return (
        <div className="flex flex-col h-full">

            {/* Toolbar */}
            
            <div className="flex items-center gap-2 px-6 py-3 border-b shrink-0 flex-wrap">
                <div className="bg-gray-200 rounded-full border p-1 flex relative shrink-0">
                    {([
                        { mode: 'cards',    label: 'Cartes',    icon: <LayoutGrid size={13} /> },
                        { mode: 'table',    label: 'Tableau',   icon: <Table2 size={13} /> },
                        { mode: 'calendar', label: 'Gantt',icon: <ChartGantt size={13} /> },
                    ] as { mode: ViewMode; label: string; icon: React.ReactNode }[]).map(({ mode, label, icon }) => (
                        <button
                            key={mode}
                            onClick={() => handleViewMode(mode)}
                            className={`relative flex items-center gap-1.5 px-4 py-1 rounded-full text-sm z-10 transition-colors duration-300 ${viewMode === mode ? 'text-white' : 'text-black'}`}
                        >
                            <span className="relative z-20 flex items-center gap-1.5">
                                {icon}{label}
                            </span>
                            {viewMode === mode && (
                                <motion.div
                                    layoutId="activeProjectTab"
                                    className="absolute inset-0 bg-black rounded-full z-10"
                                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                />
                            )}
                        </button>
                    ))}
                </div>
                <div className="relative flex-1 max-w-xs">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Rechercher un projet..."
                        className="pl-8 h-8 text-sm"
                    />
                </div>

                {/* Filtre membres */}
                <MemberFilter
                    allMembers={members}
                    allPartners={partners}
                    selectedIds={selectedMemberIds}
                    onChangeIds={setSelectedMemberIds}
                />

                {/* Filtre axes */}
                {(() => {
                    const active = selectedAxisIds.length
                    return (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2 rounded-md">
                                    <SlidersHorizontal size={14} />
                                    Axes
                                    {active > 0 && <span className="text-muted-foreground text-xs">{active}/{axes.length}</span>}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56">
                                {axes.map(a => (
                                    <DropdownMenuCheckboxItem
                                        key={a.id}
                                        checked={selectedAxisIds.includes(a.id)}
                                        onCheckedChange={() => setSelectedAxisIds(prev =>
                                            prev.includes(a.id) ? prev.filter(x => x !== a.id) : [...prev, a.id]
                                        )}
                                    >
                                        {a.name}
                                    </DropdownMenuCheckboxItem>
                                ))}
                                {active > 0 && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuCheckboxItem checked={false} onCheckedChange={() => setSelectedAxisIds([])}>
                                            Tout effacer
                                        </DropdownMenuCheckboxItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )
                })()}

                {/* Filtre AAP */}
                {(() => {
                    const active = selectedCallIds.length
                    const visibleCalls = selectedAxisIds.length > 0
                        ? projectCalls.filter(pc => selectedAxisIds.includes(pc.axis_id))
                        : projectCalls
                    return (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2 rounded-md">
                                    <SlidersHorizontal size={14} />
                                    Dispositifs
                                    {active > 0 && <span className="text-muted-foreground text-xs">{active}/{projectCalls.length}</span>}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-64 max-h-64 overflow-y-auto">
                                {visibleCalls.map(pc => (
                                    <DropdownMenuCheckboxItem
                                        key={pc.id}
                                        checked={selectedCallIds.includes(pc.id)}
                                        onCheckedChange={() => setSelectedCallIds(prev =>
                                            prev.includes(pc.id) ? prev.filter(x => x !== pc.id) : [...prev, pc.id]
                                        )}
                                    >
                                        {pc.title}
                                    </DropdownMenuCheckboxItem>
                                ))}
                                {active > 0 && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuCheckboxItem checked={false} onCheckedChange={() => setSelectedCallIds([])}>
                                            Tout effacer
                                        </DropdownMenuCheckboxItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )
                })()}

                {/* filtre Status */}
                {(() => {
                    const active = selectedStatuses.length
                    const projectStatuses = statuses.filter(s => s.context === "project")
                    return (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2 rounded-md">
                                    <SlidersHorizontal size={14} />
                                    Status
                                    {active > 0 && <span className="text-muted-foreground text-xs">{active}/{projectStatuses.length}</span>}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-64">
                                {projectStatuses.map(s => (
                                    <DropdownMenuCheckboxItem
                                        key={s.id}
                                        checked={selectedStatuses.includes(s.id)}
                                        onCheckedChange={() => setSelectedStatuses(prev =>
                                            prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]
                                        )}
                                    >
                                        {s.label}
                                    </DropdownMenuCheckboxItem>
                                ))}
                                {active > 0 && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuCheckboxItem checked={false} onCheckedChange={() => setSelectedStatuses([])}>
                                            Tout effacer
                                        </DropdownMenuCheckboxItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )
                })()}

                <div className="ml-auto flex items-center gap-2 shrink-0">
                    {viewMode === "cards" && (
                        <>
                        {multipleSelect ? (
                            <Button size="sm" variant="outline" className="gap-1.5 rounded-md" onClick={() => { setMultipleSelect(false); setSelectedProjects([]) }}>
                                <X size={14} /> Terminer
                            </Button>
                        ) : (
                            <Button size="sm" className="gap-1.5 rounded-md bg-transparent border border-border text-foreground hover:bg-muted" onClick={() => setMultipleSelect(true)}>
                                <ListChecks size={14} /> Sélection multiple
                            </Button>
                        )}
                        </>
                    )}
                    
                    <Button variant="outline" size="sm" className="gap-1.5 rounded-md" onClick={() => { setEditingCall(undefined); setCallSheetOpen(true) }}>
                        <Plus size={14} />Nouveau dispositif
                    </Button>
                    <Button size="sm" className="gap-1.5 rounded-md" onClick={() => { setDefaultCallId(undefined); setProjectSheetOpen(true) }}>
                        <Plus size={14} />Nouveau projet
                    </Button>
                </div>
            </div>
            
            {/* Vue Cartes */}
            {viewMode === "cards" && (
                <>
                {/* Colonnes par axe → AAP */}
                    {loading ? (
                        <div className="flex gap-4 p-6 overflow-x-auto">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-72 shrink-0 flex flex-col gap-3">
                                    <Skeleton className="h-8 w-40 rounded-lg" />
                                    {[1, 2].map(j => <Skeleton key={j} className="h-28 w-full rounded-xl" />)}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 overflow-x-auto overflow-y-hidden">
                            <div className="flex gap-0 h-full min-w-max">
                                {activeAxes.map((axis, axisIdx) => {
                                    const calls = filteredCalls.filter(pc => pc.axis_id === axis.id)
                                    if (calls.length === 0) return null
                                    return (
                                        <div key={axis.id} className={`flex flex-col h-full border-r ${axisIdx === 0 ? 'border-l' : ''}`}>
                                            {/* Header axe */}
                                            <div className="px-4 py-2 bg-muted/50 border-b">
                                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{axis.name}</span>
                                            </div>

                                            {/* Colonnes AAP */}
                                            <div className="flex flex-row h-full overflow-x-auto">
                                                {calls.sort((a, b) => (a.start_date ?? '').localeCompare(b.start_date)).sort((a,b) => (a.title).localeCompare(b.title)).map(pc => {
                                                    console.log("Calls :", calls)
                                                    const pcProjects = filteredProjects.filter(p => p.project_call_id === pc.id)
                                                    const pcStatus = statuses.find(s => s.id === pc.status_id)
                                                    const pcColor = pcStatus?.label === "Terminé" ? "#f3f4f6" : "#d1fae5"
                                                    const pcGrantTotal = pcProjects.reduce((sum, p) =>
                                                        sum + (agreementsByProject.get(p.id) ?? []).reduce((s, a) => s + (a.grant ?? 0), 0), 0
                                                    )

                                                    const pcGrantLength = pcProjects.reduce((sum, p) =>
                                                        sum + (agreementsByProject.get(p.id) ?? []).length, 0
                                                    )
                                                    
                                                    
                                                    const pcBudgetPct = pc.budget > 0 ? Math.round((pcGrantTotal / pc.budget) * 100) : null

                                                    return (
                                                        <div key={pc.id} className="w-72 shrink-0 flex flex-col h-full border-r last:border-r-0">
                                                            {/* Header AAP */}
                                                            <div className="px-4 py-3 border-b flex items-center justify-between gap-2 bg-background">
                                                                    <div className="flex flex-col w-full">
                                                                        
                                                                        <div className="flex flex-col min-w-0">
                                                                            <span className="text-sm font-medium truncate">{pc.title}</span>
                                                                            {(pc.start_date || pc.end_date) && (
                                                                                <span className="text-xs text-muted-foreground">
                                                                                    {formatDate(pc.start_date)}{pc.end_date ? ` → ${formatDate(pc.end_date)}` : ''}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                     
                                                                    
                                                                   
                                                                    {pc.budget > 0 && (
                                                                        <div className="mt-2 flex flex-col gap-0.5 mt-4">
                                                                            <div className="flex items-center justify-between text-xs">
                                                                                <span className="text-muted-foreground">Budget</span>
                                                                                <span className="font-medium">{pc.budget.toLocaleString('fr-FR')} €</span>
                                                                            </div>
                                                                            <div className="flex items-center justify-between text-xs">
                                                                                <span className="text-muted-foreground">Subventions allouées {pcGrantLength !== null ? ` (${pcGrantLength})` : ''}</span>
                                                                                <span className={`font-medium ${pcBudgetPct !== null && pcBudgetPct >= 100 ? 'text-green-600' : pcBudgetPct !== null && pcBudgetPct >= 75 ? 'text-amber-600' : ''}`}>
                                                                                    {pcGrantTotal.toLocaleString('fr-FR')} €
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    <div className="flex justify-between items-center gap-2 mt-4">
                                                                        {pcStatus && (
                                                                        <Badge className="rounded-full text-xs text-black shrink-0 mt-0.5" style={{backgroundColor:pcColor}}>
                                                                            {pcStatus.label}
                                                                        </Badge>
                                                                        )}

                                                                        <div className="flex items-center gap-1 shrink-0">
                                                                            <span className="text-xs text-muted-foreground">{pcProjects.length} projet{pcProjects.length > 1 ? 's' : ''}</span>
                                                                            <Button
                                                                                variant="ghost" size="icon" className="h-6 w-6 rounded-md"
                                                                                onClick={() => { setEditingCall(pc); setCallSheetOpen(true) }}
                                                                            >
                                                                                <Pencil size={11} />
                                                                            </Button>
                                                                            <Button
                                                                                variant="ghost" size="icon" className="h-6 w-6 rounded-md"
                                                                                onClick={() => { setDefaultCallId(pc.id); setProjectSheetOpen(true) }}
                                                                            >
                                                                                <Plus size={11} />
                                                                            </Button>
                                                                        </div>

                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Cartes projets */}
                                                            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                                                                {pcProjects.slice().sort((a, b) => {
                                                                            const byStatus = STATUS_ORDER.indexOf(statuses.find(s => s.id === a.status_id)?.label ?? '') - STATUS_ORDER.indexOf(statuses.find(s => s.id === b.status_id)?.label ?? '')
                                                                            if (byStatus !== 0) return byStatus

                                                                            const byDate = (b.start_date ?? '').localeCompare(a.start_date ?? '')
                                                                            if (byDate !== 0) return byDate

                                                                            return (a.title ?? '').localeCompare(b.title ?? '', 'fr')
                                                                        }).map(p => (
                                                                    <ProjectCard
                                                                        key={p.id}
                                                                        project={p}
                                                                        agreements={agreementsByProject.get(p.id) ?? []}
                                                                        statuses={statuses}
                                                                        onClick={() => { setSelectedProject(p); setDetailOpen(true) }}
                                                                        selectOn={multipleSelect}
                                                                        selected={!!selectedProjects.find(sp => sp.id === p.id)}
                                                                        onToggle={() => toggleProject(p)}
                                                                        onDelete={id => {
                                                                            setProjects(prev => prev.filter(x => x.id !== id))
                                                                            setSelectedProjects(prev => prev.filter(x => x.id !== id))
                                                                        }}
                                                                        onEdit={() => { setSelectedProject(p); setProjectSheetOpen(true) }}
                                                                        selectedProjects={selectedProjects}
                                                                        onSelectMultiple={() => { setMultipleSelect(true); toggleProject(p) }}
                                                                        onSelectAll={() => { setMultipleSelect(true); setSelectedProjects(filteredProjects) }}
                                                                    />
                                                                ))}
                                                                {pcProjects.length === 0 && (
                                                                    <p className="text-xs text-muted-foreground italic px-1">Aucun projet</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}

                                {filteredCalls.length === 0 && (
                                    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                                        Aucun dispositif correspondant aux filtres
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Floating selection bar */}
                    {multipleSelect && selectedProjects.length > 0 && (
                        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-3 py-2 rounded-full bg-foreground text-background shadow-xl">
                            {confirmingDeleteProjects ? (
                                <>
                                    <span className="text-sm px-2">Supprimer {selectedProjects.length} projet{selectedProjects.length > 1 ? 's' : ''} ?</span>
                                    <div className="w-px h-4 bg-background/20 mx-1" />
                                    <Button variant="ghost" size="sm" className="h-7 rounded-full text-background hover:text-background hover:bg-white/10 rounded-md" onClick={() => setConfirmingDeleteProjects(false)}>Annuler</Button>
                                    <Button variant="ghost" size="sm" className="h-7 rounded-full text-red-400 hover:text-red-300 hover:bg-white/10 rounded-md" onClick={handleDeleteSelectedProjects}>Confirmer</Button>
                                </>
                            ) : (
                                <>
                                    <span className="text-sm font-medium px-2">{selectedProjects.length} sélectionné{selectedProjects.length > 1 ? 's' : ''}</span>
                                    <div className="w-px h-4 bg-background/20 mx-1" />
                                    <Button variant="ghost" size="sm" className="h-7 gap-1.5 rounded-full text-background hover:text-background hover:bg-white/10 rounded-md" onClick={() => { setMultipleSelect(true); setSelectedProjects(filteredProjects) }}>
                                        <ListChecks size={13} /> Tout sélectionner
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 gap-1.5 rounded-full text-background hover:text-background hover:bg-white/10 rounded-md" onClick={copyProjectTitlesGroup}>
                                        <Copy size={13} /> Copier les titres
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 gap-1.5 rounded-full text-background hover:text-background hover:bg-white/10 rounded-md" onClick={() => exportToCsv(
                                        'projets.csv',
                                        ['Titre', 'Appel à projets', 'Axe', 'Budget (€)'],
                                        selectedProjects.map(p => [p.title, p.projectCall.title, p.projectCall.axis.name, p.budget])
                                    )}>
                                        <FileDown size={13} /> Exporter en CSV
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 gap-1.5 rounded-full text-red-400 hover:text-red-300 hover:bg-white/10 rounded-md" onClick={() => setConfirmingDeleteProjects(true)}>
                                        <Trash2 size={13} /> Supprimer
                                    </Button>
                                    <div className="w-px h-4 bg-background/20 mx-1" />
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-background hover:text-background hover:bg-white/10 rounded-md" onClick={() => { setMultipleSelect(false); setSelectedProjects([]) }}>
                                        <X size={13} />
                                    </Button>
                                </>
                            )}
                        </div>
                    )}
                
                </>
            )}

            {/* Vue Tableau */}
            {viewMode === 'table' && (() => {
                const statusMap = new Map(statuses.map(s => [s.id, s]))

                const sorted = [...filteredProjects].sort((a, b) => {
                    let va: string | number = ''
                    let vb: string | number = ''
                    if (sortKey === 'title')      { va = a.title;                          vb = b.title }
                    if (sortKey === 'call')       { va = a.projectCall.title;              vb = b.projectCall.title }
                    if (sortKey === 'axis')       { va = a.projectCall.axis.name;          vb = b.projectCall.axis.name }
                    if (sortKey === 'status')     { va = statusMap.get(a.status_id)?.label ?? ''; vb = statusMap.get(b.status_id)?.label ?? '' }
                    if (sortKey === 'budget')     { va = a.budget;                         vb = b.budget }
                    if (sortKey === 'start_date') { va = a.start_date;                     vb = b.start_date }
                    if (sortKey === 'end_date')   { va = a.end_date;                       vb = b.end_date }
                    if (va < vb) return sortDir === 'asc' ? -1 : 1
                    if (va > vb) return sortDir === 'asc' ? 1 : -1
                    return 0
                })

                const allSelected = sorted.length > 0 && sorted.every(p => selectedProjects.find(sp => sp.id === p.id))

                function SortIcon({ col }: { col: SortKey }) {
                    if (sortKey !== col) return <span className="ml-1 text-muted-foreground/40">↕</span>
                    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                }

                return (
                    <div className="flex-1 overflow-auto">
                        {loading ? (
                            <div className="flex flex-col gap-2 p-6">
                                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="sticky top-0 bg-background z-10 border-b">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-10 px-4">
                                            <Checkbox
                                                checked={allSelected}
                                                onCheckedChange={checked => {
                                                    setMultipleSelect(true)
                                                    setSelectedProjects(checked ? sorted : [])
                                                }}
                                            />
                                        </TableHead>
                                        <TableHead className="cursor-pointer select-none min-w-48" onClick={() => handleSort('title')}>
                                            Titre <SortIcon col="title" />
                                            <span className='text-xs ml-3 text-gray-500'>({sorted.length} projets)</span>
                                        </TableHead>
                                        <TableHead className="cursor-pointer select-none" onClick={() => handleSort('call')}>
                                            Dispositif <SortIcon col="call" />
                                        </TableHead>
                                        <TableHead className="cursor-pointer select-none" onClick={() => handleSort('axis')}>
                                            Axe <SortIcon col="axis" />
                                        </TableHead>
                                        <TableHead className="cursor-pointer select-none" onClick={() => handleSort('status')}>
                                            Statut <SortIcon col="status" />
                                        </TableHead>
                                        <TableHead className="cursor-pointer select-none text-right" onClick={() => handleSort('budget')}>
                                            Dépenses <SortIcon col="budget" />
                                        </TableHead>
                                        <TableHead className="text-right">Subvention</TableHead>
                                        <TableHead className="cursor-pointer select-none" onClick={() => handleSort('start_date')}>
                                            Début <SortIcon col="start_date" />
                                        </TableHead>
                                        <TableHead className="cursor-pointer select-none" onClick={() => handleSort('end_date')}>
                                            Fin <SortIcon col="end_date" />
                                        </TableHead>
                                        <TableHead className="w-16" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sorted.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={10} className="text-center text-muted-foreground py-12 italic">
                                                Aucun projet correspondant aux filtres
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {sorted.map(p => {
                                        const agreements = agreementsByProject.get(p.id) ?? []
                                        const totalGrant = agreements.reduce((s, a) => s + a.grant, 0)
                                        const status = statusMap.get(p.status_id)
                                        const isSelected = !!selectedProjects.find(sp => sp.id === p.id)
                                        return (
                                            <TableRow
                                                key={p.id}
                                                data-state={isSelected ? 'selected' : undefined}
                                                className="cursor-pointer group"
                                                onClick={() => { setSelectedProject(p); setDetailOpen(true) }}
                                            >
                                                <TableCell className="px-4" onClick={e => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={() => { setMultipleSelect(true); toggleProject(p) }}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium max-w-72">
                                                    <span className="truncate block">{p.title}</span>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground max-w-48">
                                                    <span className="truncate block">{p.projectCall.title}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-xs text-muted-foreground">{p.projectCall.axis.name}</span>
                                                </TableCell>
                                                <TableCell>
                                                    {status && (
                                                        <Badge variant="secondary" className="text-xs rounded-full text-black whitespace-nowrap"
                                                            style={{ backgroundColor: PROJECT_STATUS_COLORS[status.label] ?? '#f3f4f6' }}>
                                                            {status.label}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {p.budget > 0 ? p.budget.toLocaleString('fr-FR') + ' €' : <span className="text-muted-foreground">—</span>}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums text-green-700">
                                                    {totalGrant > 0 ? totalGrant.toLocaleString('fr-FR') + ' €' : <span className="text-muted-foreground">—</span>}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-xs">
                                                    {formatDate(p.start_date) ?? '—'}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-xs">
                                                    {formatDate(p.end_date) ?? '—'}
                                                </TableCell>
                                                <TableCell onClick={e => e.stopPropagation()}>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md"
                                                            onClick={() => { setSelectedProject(p); setProjectSheetOpen(true) }}>
                                                            <Pencil size={13} />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive rounded-md"
                                                            onClick={async () => { await deleteProject(p.id); setProjects(prev => prev.filter(x => x.id !== p.id)) }}>
                                                            <Trash2 size={13} />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        )}

                        {/* Floating selection bar — identique à la vue carte */}
                        {multipleSelect && selectedProjects.length > 0 && (
                            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-3 py-2 rounded-full bg-foreground text-background shadow-xl">
                                {confirmingDeleteProjects ? (
                                    <>
                                        <span className="text-sm px-2">Supprimer {selectedProjects.length} projet{selectedProjects.length > 1 ? 's' : ''} ?</span>
                                        <div className="w-px h-4 bg-background/20 mx-1" />
                                        <Button variant="ghost" size="sm" className="h-7 rounded-full text-background hover:text-background hover:bg-white/10 rounded-md" onClick={() => setConfirmingDeleteProjects(false)}>Annuler</Button>
                                        <Button variant="ghost" size="sm" className="h-7 rounded-full text-red-400 hover:text-red-300 hover:bg-white/10 rounded-md" onClick={handleDeleteSelectedProjects}>Confirmer</Button>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-sm font-medium px-2">{selectedProjects.length} sélectionné{selectedProjects.length > 1 ? 's' : ''}</span>
                                        <div className="w-px h-4 bg-background/20 mx-1" />
                                        <Button variant="ghost" size="sm" className="h-7 gap-1.5 rounded-full text-background hover:text-background hover:bg-white/10 rounded-md"
                                            onClick={() => { setMultipleSelect(true); setSelectedProjects(filteredProjects) }}>
                                            <ListChecks size={13} /> Tout sélectionner
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-7 gap-1.5 rounded-full text-background hover:text-background hover:bg-white/10 rounded-md" onClick={copyProjectTitlesGroup}>
                                            <Copy size={13} /> Copier les titres
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-7 gap-1.5 rounded-full text-background hover:text-background hover:bg-white/10 rounded-md"
                                            onClick={() => exportToCsv('projets.csv',
                                                ['Titre', 'Dispositif', 'Axe', 'Statut', 'Budget (€)', 'Subvention (€)', 'Début', 'Fin'],
                                                selectedProjects.map(p => {
                                                    const agrs = agreementsByProject.get(p.id) ?? []
                                                    const grant = agrs.reduce((s, a) => s + a.grant, 0)
                                                    const st = statusMap.get(p.status_id)?.label ?? ''
                                                    return [p.title, p.projectCall.title, p.projectCall.axis.name, st, String(p.budget), String(grant), p.start_date, p.end_date]
                                                })
                                            )}>
                                            <FileDown size={13} /> Exporter en CSV
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-7 gap-1.5 rounded-full text-red-400 hover:text-red-300 hover:bg-white/10 rounded-md"
                                            onClick={() => setConfirmingDeleteProjects(true)}>
                                            <Trash2 size={13} /> Supprimer
                                        </Button>
                                        <div className="w-px h-4 bg-background/20 mx-1" />
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-background hover:text-background hover:bg-white/10 rounded-md"
                                            onClick={() => { setMultipleSelect(false); setSelectedProjects([]) }}>
                                            <X size={13} />
                                        </Button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )
            })()}

            {/* Vue Calendrier */}
            {viewMode === 'calendar' && (() => {
                const withoutDates = filteredProjects.filter(p => !p.start_date || !p.end_date)

                // Projets qui chevauchent l'année sélectionnée
                const yearStart = new Date(ganttYear, 0, 1)
                const yearEnd   = new Date(ganttYear, 11, 31)
                const ganttTasks: GanttTask[] = filteredProjects
                    .filter(p => {
                        if (!p.start_date || !p.end_date) return false
                        const s = new Date(p.start_date)
                        const e = new Date(p.end_date)
                        return s < e && s <= yearEnd && e >= yearStart
                    })
                    .map(p => {
                        const status = statuses.find(s => s.id === p.status_id)
                        const bg = PROJECT_STATUS_COLORS[status?.label ?? ''] ?? '#dbeafe'
                        return {
                            id:       String(p.id),
                            name:     p.title,
                            start:    new Date(p.start_date),
                            end:      new Date(p.end_date),
                            progress: 0,
                            type:     'task' as const,
                            styles: {
                                backgroundColor:         bg,
                                backgroundSelectedColor: bg,
                                progressColor:           bg,
                                progressSelectedColor:   bg,
                            },
                        }
                    })

                return (
                    <div className="flex-1 overflow-auto p-6 flex flex-col gap-4">

                        {/* Contrôles */}
                        <div className="flex items-center justify-between flex-wrap gap-3 shrink-0">
                            {/* Navigation année */}
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" className="rounded-md h-7 w-7 p-0" onClick={() => setGanttYear(y => y - 1)}>‹</Button>
                                <span className="text-sm font-medium tabular-nums w-12 text-center">{ganttYear}</span>
                                <Button variant="outline" size="sm" className="rounded-md h-7 w-7 p-0" onClick={() => setGanttYear(y => y + 1)}>›</Button>
                            </div>

                            {/* Granularité */}
                            <div className="flex items-center gap-1 bg-muted rounded-full p-1">
                                {([
                                    { mode: GanttViewMode.Month, label: 'Mois' },
                                    { mode: GanttViewMode.Week,  label: 'Semaine' },
                                    { mode: GanttViewMode.Day,   label: 'Jour' },
                                ] as { mode: GanttViewMode; label: string }[]).map(({ mode, label }) => (
                                    <button
                                        key={mode}
                                        onClick={() => setGanttViewMode(mode)}
                                        className={`px-3 py-1 rounded-full text-xs transition-colors ${ganttViewMode === mode ? 'bg-white shadow text-black font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {withoutDates.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    {withoutDates.length} projet{withoutDates.length > 1 ? 's' : ''} sans date masqué{withoutDates.length > 1 ? 's' : ''}
                                </p>
                            )}
                        </div>

                        {loading ? (
                            <div className="flex flex-col gap-2">
                                {[1,2,3,4,5].map(i => <div key={i} className="h-10 w-full bg-muted animate-pulse rounded" />)}
                            </div>
                        ) : ganttTasks.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">Aucun projet sur {ganttYear}.</p>
                        ) : (
                            <div className="gantt-dark-labels">
                            <style>{`
                                .gantt-dark-labels text { fill: #1e293b !important; }
                                .gantt-task-row { cursor: pointer; transition: background 150ms; }
                                .gantt-task-row:hover { background: #f8fafc; }
                                .gantt-task-row:hover .gantt-task-title { color: #0f172a !important; }
                            `}</style>
                            <Gantt
                                tasks={ganttTasks}
                                viewMode={ganttViewMode}
                                locale="fr"
                                listCellWidth="200px"
                                columnWidth={ganttViewMode === GanttViewMode.Month ? 80 : ganttViewMode === GanttViewMode.Week ? 60 : 60}
                                rowHeight={40}
                                fontSize="12px"
                                headerHeight={50}
                                barCornerRadius={15}
                                TaskListHeader={({ headerHeight, fontFamily, fontSize }) => (
                                    <div style={{ fontFamily, fontSize, display: 'table', borderBottom: '#e6e4e4 1px solid', borderTop: '#e6e4e4 1px solid', borderLeft: '#e6e4e4 1px solid' }}>
                                        <div style={{ display: 'table-row', height: headerHeight - 2 }}>
                                            <div style={{ display: 'table-cell', minWidth: '260px', verticalAlign: 'middle', paddingLeft: 12, fontWeight: 600, color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Projet</div>
                                        </div>
                                    </div>
                                )}
                                TaskListTable={({ tasks, rowHeight, rowWidth, fontFamily, fontSize, locale }) => (
                                    <div style={{ fontFamily, fontSize, display: 'table', borderLeft: '#e6e4e4 1px solid', borderBottom: '#e6e4e4 1px solid' }}>
                                        {tasks.map(t => {
                                            const fmt = (d: Date) => d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })
                                            return (
                                                <div key={t.id} className="gantt-task-row" style={{ display: 'table-row', height: rowHeight, borderBottom: '1px solid #f1f5f9' }}>
                                                    <div style={{ display: 'table-cell', minWidth: rowWidth, maxWidth: rowWidth, verticalAlign: 'middle', paddingLeft: 12, paddingRight: 8, overflow: 'hidden' }}>
                                                        <div className="gantt-task-title" style={{ fontWeight: 500, color: '#1e293b', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                                                        <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: 1 }}>{fmt(t.start)} → {fmt(t.end)}</div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                                TooltipContent={({ task }) => {
                                    const p = filteredProjects.find(p => String(p.id) === task.id)
                                    if (!p) return null
                                    const status = statuses.find(s => s.id === p.status_id)
                                    const participantCount = allProjectMembers.filter(m => m.project_id === p.id).length
                                    const partnerCount = new Set(allAgreements.filter(a => a.project_id === p.id).map(a => a.partner_id)).size
                                    const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                                    return (
                                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', minWidth: 220, maxWidth: 300, fontFamily: 'inherit' }}>
                                            <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', marginBottom: 6, lineHeight: 1.3 }}>{p.title}</div>
                                            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>{fmt(task.start)} → {fmt(task.end)}</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {status && (
                                                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: PROJECT_STATUS_COLORS[status.label] ?? '#f1f5f9', color: '#475569', fontWeight: 500 }}>{status.label}</span>
                                                )}
                                                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#f1f5f9', color: '#475569' }}> {participantCount} participant{participantCount !== 1 ? 's' : ''}</span>
                                                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#f1f5f9', color: '#475569' }}> {partnerCount} partenaire{partnerCount !== 1 ? 's' : ''}</span>
                                            </div>
                                        </div>
                                    )
                                }}
                                onDoubleClick={task => {
                                    const p = filteredProjects.find(p => String(p.id) === task.id)
                                    if (p) { setSelectedProject(p); setDetailOpen(true) }
                                }}
                            />
                            </div>
                        )}
                    </div>
                )
            })()}

            {/* Sheets */}
            <ProjectCallSheet
                open={callSheetOpen}
                onClose={() => { setCallSheetOpen(false); setEditingCall(undefined) }}
                onSaved={handleCallCreated}
                onDeleted={handleCallDeleted}
                axes={axes}
                statuses={statuses}
                editCall={editingCall}
            />

            <ProjectSheet
                open={projectSheetOpen}
                onClose={() => setProjectSheetOpen(false)}
                onSaved={handleProjectCreated}
                projectCalls={projectCalls}
                statuses={statuses}
                defaultCallId={defaultCallId}
            />

            <ProjectDetailSheet
                open={detailOpen}
                project={selectedProject}
                onClose={() => { setDetailOpen(false); setSelectedProject(null) }}
                onUpdated={handleProjectUpdated}
                onDeleted={handleProjectDeleted}
                onAgreementAdded={handleAgreementAdded}
                onAgreementDeleted={handleAgreementDeleted}
                partners={partners}
                projectCalls={projectCalls}
                axes={axes}
                statuses={statuses}
                members={members}
                projectTimes={timeEntries.filter(te => te.project_id === selectedProject?.id)}
                axis={axes}
                onMemberCreated={m => setMembers(prev => [...prev, m])}
                onPartnerCreated={p => setPartners(prev => [...prev, p])}
                onTimeEntryAdded={e => setTimeEntries(prev => [...prev, e])}
                onTimeEntryUpdated={e => setTimeEntries(prev => prev.map(x => x.id === e.id ? e : x))}
                onTimeEntryDeleted={id => setTimeEntries(prev => prev.filter(e => e.id !== id))}
                allFormations={allFormations}
            />
        </div>
    )
}
