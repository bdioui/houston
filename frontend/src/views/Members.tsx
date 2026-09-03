import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getMembersFull, getPartners, getLabs, addMember, updateMember, deleteMember, addPartner, getGroups, getGroupMembers, removeMemberFromGroup, addMemberToGroup, addGroup, deleteGroup, getAllMemberActionCards, getAllProjectMembers, getActionCardsFull, getProjects, addMemberToCard, removeMemberFromCard, addProjectMember, removeProjectMember, createActionCardFull, addProject } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Plus, Pencil, X, Mail, Phone, ChevronDown, Trash2, CopyIcon, Trash, PencilIcon, ShareIcon, CheckIcon, ListChecks, Download, FileDown, BadgeCheck, Check, Tag, LayoutGrid, Table2, Users, ListTodo, FolderOpen } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { type MemberFull, type Partner, type Lab, type Group, type GroupMember, type ActionCardFull, type MemberActionCard, type ProjectMember, type Project } from '@/lib/types'
import { ProjectViewerSheet, ActionCardViewerSheet } from '@/components/viewers'
import { PARTNER_TYPES, PALETTE } from '@/lib/constants'
import { exportToCsv } from '@/lib/utils'
import {ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuGroup, ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger,}  from '@/components/ui/context-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import SearchInput from '@/components/SearchInput'
import { useCurrentUser } from '@/lib/userContext'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { motion } from "framer-motion"

// --- Constantes ---

const MEMBER_STATUSES = [
    'Enseignant-chercheur',
    'Chercheur',
    'BIATSS',
    'Doctorant',
    'Post-doc',
    'Salarié',
    'Fonctionnaire',
    'Élu',
    'Autre',
]

const GENRES = ['F', 'M', 'Autre']

type MemberForm = {
    first_name:    string
    last_name:     string
    position:      string
    email:         string
    tel:           string
    genre:         string
    status:        string
    partner_id:    number
    lab_id:        number
    profile_image: string
    is_staff:      boolean
}

const EMPTY_FORM: MemberForm = {
    first_name:    '',
    last_name:     '',
    position:      '',
    email:         '',
    tel:           '',
    genre:         'F',
    status:        'Enseignant-chercheur',
    partner_id:    0,
    lab_id:        0,
    profile_image: '',
    is_staff:      false,
}

// --- Quick-create partenaire ---

function PartnerQuickCreate({ onSaved, onCancel }: { onSaved: (p: Partner) => void; onCancel: () => void }) {
    const [name,       setName]       = useState('')
    const [type,       setType]       = useState(PARTNER_TYPES[0])
    const [color,      setColor]      = useState('#E7E8E2')
    const [submitting, setSubmitting] = useState(false)

    async function handleSubmit() {
        if (!name.trim()) return
        setSubmitting(true)
        try {
            const partner = await addPartner({ name, type, color, description: '', logo: '', status_id: 0, consortium: false })
            onSaved(partner)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex gap-2">
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nom du partenaire *" className="h-8 text-xs flex-1" autoFocus />
                <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="h-8 text-xs w-44 shrink-0"><SelectValue /></SelectTrigger>
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
                <Button variant="outline" size="sm" className="rounded-md" onClick={onCancel}>Annuler</Button>
                <Button size="sm" className="rounded-md" disabled={!name.trim() || submitting} onClick={handleSubmit}>
                    <Check size={12} className="mr-1" />{submitting ? '...' : 'Créer'}
                </Button>
            </div>
        </div>
    )
}

// --- Formulaire création / édition ---

type MemberFormSheetProps =
    | { mode: 'create'; partners: Partner[]; labs: Lab[]; existingEmails?: string[]; onCreated: (m: MemberFull) => void; onClose: () => void }
    | { mode: 'edit';   partners: Partner[]; labs: Lab[]; existingEmails?: string[]; member: MemberFull; onUpdated: (m: MemberFull) => void; onClose: () => void }

function MemberFormSheet(props: MemberFormSheetProps) {
    const isEdit = props.mode === 'edit'
    const [form, setForm] = useState<MemberForm>(
        isEdit
            ? {
                first_name:    props.member.first_name,
                last_name:     props.member.last_name,
                position:      props.member.position,
                email:         props.member.email,
                tel:           props.member.tel,
                genre:         props.member.genre,
                status:        props.member.status,
                partner_id:    props.member.partner_id,
                lab_id:        props.member.lab_id,
                profile_image: props.member.profile_image,
                is_staff:      props.member.is_staff,
            }
            : EMPTY_FORM
    )
    const [saving, setSaving] = useState(false)
    const [localPartners, setLocalPartners] = useState<Partner[]>(props.partners)
    const [showCreatePartner, setShowCreatePartner] = useState(false)
    const [emailError, setEmailError] = useState<string | null>(null)

    function setField<K extends keyof MemberForm>(key: K, value: MemberForm[K]) {
        if (key === 'email') setEmailError(null)
        setForm(prev => ({ ...prev, [key]: value }))
    }

    async function handleSave() {
        if (!form.first_name.trim() || !form.last_name.trim()) return
        const emailLower = form.email.trim().toLowerCase()
        const existingEmails = props.existingEmails ?? []
        const currentEmail = isEdit ? props.member.email.toLowerCase() : null
        if (emailLower && existingEmails.map(e => e.toLowerCase()).includes(emailLower) && emailLower !== currentEmail) {
            setEmailError('Un membre avec cet email existe déjà.')
            return
        }
        setSaving(true)
        try {
            const partner = localPartners.find(p => p.id === form.partner_id) ?? null
            const lab     = props.labs.find(l => l.id === form.lab_id) ?? null
            if (isEdit) {
                await updateMember(props.member.id, form)
                props.onUpdated({ ...props.member, ...form, partner, lab })
            } else {
                const created = await addMember(form)
                props.onCreated({ ...created, partner, lab })
            }
            props.onClose()
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="flex flex-col gap-4 px-6 py-4">
            <div className="flex gap-3">
                <div className="flex flex-col gap-1.5 flex-1">
                    <Label>Prénom</Label>
                    <Input value={form.first_name} onChange={e => setField('first_name', e.target.value)} placeholder="Prénom" />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                    <Label>Nom</Label>
                    <Input value={form.last_name} onChange={e => setField('last_name', e.target.value)} placeholder="Nom" />
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <Label>Poste</Label>
                <Input value={form.position} onChange={e => setField('position', e.target.value)} placeholder="Titre / fonction" />
            </div>

            <div className="flex gap-3">
                <div className="flex flex-col gap-1.5 flex-1">
                    <Label>Statut</Label>
                    <Select value={form.status} onValueChange={v => setField('status', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {MEMBER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex flex-col gap-1.5 w-28">
                    <Label>Genre</Label>
                    <Select value={form.genre} onValueChange={v => setField('genre', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                    <Label>Partenaire*</Label>
                    {!showCreatePartner && (
                        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 rounded-md text-muted-foreground" onClick={() => setShowCreatePartner(true)}>
                            <Plus size={11} /> Nouveau
                        </Button>
                    )}
                </div>
                {showCreatePartner ? (
                    <div className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-muted/30">
                        <PartnerQuickCreate
                            onSaved={p => {
                                setLocalPartners(prev => [...prev, p])
                                setField('partner_id', p.id)
                                setShowCreatePartner(false)
                            }}
                            onCancel={() => setShowCreatePartner(false)}
                        />
                    </div>
                ) : (
                    <SearchInput
                        data={localPartners}
                        onSelect={p => setField('partner_id', p.id)}
                        getLabel={p => p.name}
                        placeholder="Rechercher un partenaire..."
                        value={localPartners.find(p => p.id === form.partner_id)?.name}
                    />
                )}
            </div>



            <div className="flex flex-col gap-1.5">
                <Label>Laboratoire</Label>
                <SearchInput
                    data={props.labs}
                    onSelect={l => setField('lab_id', l.id)}
                    getLabel={l => l.name}
                    placeholder="Rechercher un partenaire..."
                    value={props.labs.find(l => l.id === form.lab_id)?.name}
                    orderBy='name'
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <Label>Email</Label>
                <Input
                    type="email"
                    value={form.email}
                    onChange={e => setField('email', e.target.value)}
                    placeholder="email@exemple.fr"
                    className={emailError ? 'border-destructive focus-visible:ring-destructive' : ''}
                />
                {emailError && <p className="text-xs text-destructive">{emailError}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
                <Label>Téléphone</Label>
                <Input type="tel" value={form.tel} onChange={e => setField('tel', e.target.value)} placeholder="06 00 00 00 00" />
            </div>

            <div className="flex flex-col gap-1.5">
                <Label>Photo de profil (URL)</Label>
                <div className="flex items-center gap-3">
                    <Input
                        value={form.profile_image}
                        onChange={e => setField('profile_image', e.target.value)}
                        placeholder="https://..."
                    />
                    {form.profile_image && (
                        <img
                            src={form.profile_image}
                            alt="Aperçu"
                            className="w-9 h-9 rounded-full object-cover shrink-0 border border-border"
                            onError={e => (e.currentTarget.style.display = 'none')}
                        />
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Checkbox
                    id="is_staff"
                    checked={form.is_staff}
                    onCheckedChange={v => setField('is_staff', Boolean(v))}
                />
                <Label htmlFor="is_staff">Membre de l'équipe (staff)</Label>
            </div>

            <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={props.onClose}>Annuler</Button>
                <Button
                    className="flex-1 bg-black"
                    onClick={handleSave}
                    disabled={saving || !form.first_name.trim() || !form.last_name.trim()}
                >
                    {saving ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer'}
                </Button>
            </div>
        </div>
    )
}


// --- Sheet de consultation ---

type MemberDetailSheetProps = {
    member:         MemberFull
    partners:       Partner[]
    labs:           Lab[]
    existingEmails: string[]
    open:           boolean
    onClose:        () => void
    onUpdated:      (m: MemberFull) => void
    onDeleted:      (id: number) => void
}

function MemberDetailSheet({ member, partners, labs, existingEmails, open, onClose, onUpdated, onDeleted }: MemberDetailSheetProps) {
    const currentUser = useCurrentUser()
    const [editing,    setEditing]    = useState(false)
    const [confirming, setConfirming] = useState(false)
    const [deleting,   setDeleting]   = useState(false)
    const [saving,     setSaving]     = useState(false)

    // ActionCards liées
    const [cardLinks,    setCardLinks]    = useState<(MemberActionCard & { card: ActionCardFull })[]>([])
    const [allCards,     setAllCards]     = useState<ActionCardFull[]>([])
    const [openCard,     setOpenCard]     = useState<ActionCardFull | null>(null)

    // Projets liés
    const [projectLinks, setProjectLinks] = useState<(ProjectMember & { project: Project })[]>([])
    const [allProjects,  setAllProjects]  = useState<Project[]>([])
    const [openProject,  setOpenProject]  = useState<Project | null>(null)

    // Quick-add ActionCard
    const [showCardCreate,  setShowCardCreate]  = useState(false)
    const [qCardTitle,      setQCardTitle]      = useState('')

    // Quick-add Projet
    const [showProjectCreate, setShowProjectCreate] = useState(false)
    const [qProjectTitle,     setQProjectTitle]     = useState('')
    const [qProjectBudget,    setQProjectBudget]    = useState('')

    useEffect(() => {
        if (!open) return
        setShowCardCreate(false)
        setShowProjectCreate(false)
        Promise.all([
            getAllMemberActionCards(),
            getActionCardsFull(),
            getAllProjectMembers(),
            getProjects(),
        ]).then(([memberCards, cards, projectMembers, projects]) => {
            const cardMap = new Map((cards as ActionCardFull[]).map(c => [c.id, c]))
            setCardLinks(
                (memberCards as MemberActionCard[])
                    .filter(l => l.member_id === member.id)
                    .map(l => ({ ...l, card: cardMap.get(l.action_card_id)! }))
                    .filter(l => l.card)
            )
            setAllCards(cards as ActionCardFull[])

            const projectMap = new Map((projects as Project[]).map(p => [p.id, p]))
            setProjectLinks(
                (projectMembers as ProjectMember[])
                    .filter(l => l.member_id === member.id)
                    .map(l => ({ ...l, project: projectMap.get(l.project_id)! }))
                    .filter(l => l.project)
            )
            setAllProjects(projects as Project[])
        })
    }, [open, member.id])

    async function handleDelete() {
        setDeleting(true)
        try {
            await deleteMember(member.id)
            onDeleted(member.id)
            onClose()
        } finally {
            setDeleting(false)
            setConfirming(false)
        }
    }

    async function handleLinkCard(card: ActionCardFull) {
        setSaving(true)
        try {
            const link = await addMemberToCard(card.id, member.id, 'Contributeur')
            setCardLinks(prev => [...prev, { ...link, card }])
        } finally { setSaving(false) }
    }

    async function handleUnlinkCard(linkId: number) {
        await removeMemberFromCard(linkId)
        setCardLinks(prev => prev.filter(l => l.id !== linkId))
    }

    async function handleCardQuickAdd() {
        if (!qCardTitle.trim()) return
        setSaving(true)
        try {
            const newCard = await createActionCardFull({
                title: qCardTitle.trim(),
                description: '',
                start_date: '',
                end_date: '',
                status_id: 1,
                category_id: 1,
                axis_id: null,
                owner_id: currentUser?.id ?? member.id,
                members: [{ member_id: member.id, role: 'Responsable' }],
                project_id: null,
                todo_title: '',
                todo_items: [],
            })
            setCardLinks(prev => [...prev, { id: 0, member_id: member.id, action_card_id: newCard.id, role: 'Responsable', card: newCard }])
            setAllCards(prev => [...prev, newCard])
            setQCardTitle('')
            setShowCardCreate(false)
        } finally { setSaving(false) }
    }

    async function handleLinkProject(p: Project) {
        setSaving(true)
        try {
            const link = await addProjectMember(p.id, member.id, 'Contributeur')
            setProjectLinks(prev => [...prev, { ...link, project: p }])
        } finally { setSaving(false) }
    }

    async function handleUnlinkProject(linkId: number) {
        await removeProjectMember(linkId)
        setProjectLinks(prev => prev.filter(l => l.id !== linkId))
    }

    async function handleProjectQuickAdd() {
        if (!qProjectTitle.trim()) return
        setSaving(true)
        try {
            const newProject = await addProject({
                title: qProjectTitle.trim(),
                description: '',
                budget: Number(qProjectBudget) || 0,
                project_call_id: 0,
                status_id: 1,
                start_date: '',
                end_date: '',
            })
            const link = await addProjectMember(newProject.id, member.id, 'Responsable')
            setProjectLinks(prev => [...prev, { ...link, project: newProject }])
            setAllProjects(prev => [...prev, newProject])
            setQProjectTitle('')
            setQProjectBudget('')
            setShowProjectCreate(false)
        } finally { setSaving(false) }
    }

    const linkedCardIds    = cardLinks.map(l => l.action_card_id)
    const linkedProjectIds = projectLinks.map(l => l.project_id)
    const availableCards    = allCards.filter(c => !linkedCardIds.includes(c.id))
    const availableProjects = allProjects.filter(p => !linkedProjectIds.includes(p.id))

    return (
    <>
        <Sheet open={open} onOpenChange={v => { if (!v) { setEditing(false); setConfirming(false); onClose() } }}>
            <SheetContent side="right" showCloseButton={false} className="!w-[560px] flex flex-col gap-0 p-0">

                {/* Header */}
                <SheetHeader className="px-6 py-4 border-b flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-9 w-9 shrink-0">
                            <AvatarImage src={member.profile_image} />
                            <AvatarFallback className="text-sm" style={{ backgroundColor: member.partner?.color ?? '#E7E8E2' }}>
                                {member.first_name[0]}{member.last_name[0]}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                            <SheetTitle className="text-base leading-tight">
                                {member.first_name} {member.last_name}
                            </SheetTitle>
                            <span className="text-xs text-muted-foreground truncate">{member.position}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        {confirming ? (
                            <>
                                <span className="text-xs text-destructive mr-1">Supprimer ?</span>
                                <Button variant="destructive" size="sm" className="h-7" onClick={handleDelete} disabled={deleting}>
                                    {deleting ? '...' : 'Confirmer'}
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7" onClick={() => setConfirming(false)}>
                                    Annuler
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(v => !v)}>
                                    <Pencil size={14} />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setConfirming(true)}>
                                    <Trash2 size={14} />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                                    <X size={14} />
                                </Button>
                            </>
                        )}
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto">
                    {/* Formulaire édition */}
                    {editing && (
                        <>
                            <MemberFormSheet
                                mode="edit"
                                partners={partners}
                                labs={labs}
                                existingEmails={existingEmails}
                                member={member}
                                onUpdated={m => { onUpdated(m); setEditing(false) }}
                                onClose={() => setEditing(false)}
                            />
                            <Separator />
                        </>
                    )}

                    <div className="flex flex-col gap-5 px-6 py-5">

                        {/* ── INFORMATIONS ── */}
                        <section className="flex flex-col gap-2 text-sm">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Informations</p>
                            <div className="flex flex-col gap-2 mt-1">
                                <div className="flex items-center gap-3">
                                    <span className="w-24 shrink-0 text-xs text-muted-foreground">Statut</span>
                                    <Badge variant="outline" className="text-xs">{member.status}</Badge>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="w-24 shrink-0 text-xs text-muted-foreground">Genre</span>
                                    <span>{member.genre}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="w-24 shrink-0 text-xs text-muted-foreground">Partenaire</span>
                                    {member.partner ? (
                                        <span className="text-xs px-2 py-0.5 rounded-full border border-border" style={{ backgroundColor: member.partner.color }}>
                                            {member.partner.name}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-muted-foreground italic">Aucun</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="w-24 shrink-0 text-xs text-muted-foreground">Laboratoire</span>
                                    {member.lab ? (
                                        <Badge variant="secondary" className="text-xs">{member.lab.name}</Badge>
                                    ) : (
                                        <span className="text-xs text-muted-foreground italic">Aucun</span>
                                    )}
                                </div>
                            </div>
                        </section>

                        <Separator />

                        {/* ── CONTACT ── */}
                        <section className="flex flex-col gap-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact</p>
                            <div className="flex flex-col gap-1 mt-1">
                                {member.email ? (
                                    <a href={`mailto:${member.email}`} className="flex items-center gap-3 px-2 py-2 rounded hover:bg-muted group">
                                        <Mail size={14} className="text-muted-foreground shrink-0" />
                                        <span className="text-sm text-blue-600 group-hover:underline">{member.email}</span>
                                    </a>
                                ) : (
                                    <p className="text-xs text-muted-foreground italic px-2">Aucun email renseigné</p>
                                )}
                                {member.tel && (
                                    <a href={`tel:${member.tel}`} className="flex items-center gap-3 px-2 py-2 rounded hover:bg-muted group">
                                        <Phone size={14} className="text-muted-foreground shrink-0" />
                                        <span className="text-sm group-hover:underline">{member.tel}</span>
                                    </a>
                                )}
                            </div>
                        </section>

                        <Separator />

                        {/* ── ACTION CARDS ── */}
                        <section className="flex flex-col gap-3">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Fiches actions ({cardLinks.length})
                            </p>
                            {cardLinks.length === 0 && !showCardCreate && (
                                <p className="text-xs text-muted-foreground italic">Aucune action liée</p>
                            )}
                            {cardLinks.length > 0 && (
                                <div className="flex flex-col gap-1">
                                    {cardLinks.map(l => (
                                        <div key={l.id} className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer" onClick={() => setOpenCard(l.card)}>
                                            <div
                                                className="w-2 h-2 rounded-full shrink-0"
                                                style={{ backgroundColor: l.card.category?.color ?? '#E7E8E2' }}
                                            />
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="text-sm truncate">{l.card.title}</span>
                                                <span className="text-xs text-muted-foreground">{l.card.status?.label}</span>
                                            </div>
                                            <Badge variant="outline" className="text-[10px] shrink-0">{l.role}</Badge>
                                            <Button
                                                variant="ghost" size="icon"
                                                className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive rounded-md"
                                                onClick={e => { e.stopPropagation(); handleUnlinkCard(l.id) }}
                                            >
                                                <X size={11} />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Lier une action existante */}
                            {!showCardCreate && (
                                <div className="mt-1">
                                    <SearchInput
                                        data={availableCards}
                                        onSelect={handleLinkCard}
                                        getLabel={c => c.title}
                                        filterFn={(c, q) => c.title.toLowerCase().includes(q.toLowerCase())}
                                        renderItem={c => (
                                            <div className="flex items-center gap-2 w-full min-w-0">
                                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.category?.color ?? '#E7E8E2' }} />
                                                <span className="text-xs truncate flex-1">{c.title}</span>
                                                <span className="text-xs text-muted-foreground shrink-0">{c.status?.label}</span>
                                            </div>
                                        )}
                                        placeholder="Rechercher une action à lier…"
                                    />
                                    {availableCards.length === 0 && allCards.length > 0 && (
                                        <p className="text-xs text-muted-foreground italic mt-1.5 px-1">
                                            Toutes les actions existantes sont déjà liées.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Bouton créer */}
                            {!showCardCreate && (
                                <button onClick={() => setShowCardCreate(true)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-0.5 w-fit">
                                    <Plus size={12} /> Créer une action
                                </button>
                            )}

                            {/* Quick-add ActionCard */}
                            {showCardCreate && (
                                <div className="flex flex-col gap-2 p-3 rounded-lg border bg-muted/30 mt-1">
                                    <Input placeholder="Titre de l'action *" value={qCardTitle} onChange={e => setQCardTitle(e.target.value)} className="h-7 text-xs" />
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" className="flex-1 h-7 text-xs rounded-md" onClick={() => { setShowCardCreate(false); setQCardTitle('') }}>Annuler</Button>
                                        <Button size="sm" className="flex-1 h-7 text-xs rounded-md" disabled={!qCardTitle.trim() || saving} onClick={handleCardQuickAdd}>
                                            {saving ? '…' : 'Créer'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </section>

                        <Separator />

                        {/* ── PROJETS ── */}
                        <section className="flex flex-col gap-3">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Projets ({projectLinks.length})
                            </p>
                            {projectLinks.length === 0 && !showProjectCreate && (
                                <p className="text-xs text-muted-foreground italic">Aucun projet lié</p>
                            )}
                            {projectLinks.length > 0 && (
                                <div className="flex flex-col gap-1">
                                    {projectLinks.map(l => (
                                        <div key={l.id} className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer" onClick={() => setOpenProject(l.project)}>
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="text-sm truncate">{l.project.title}</span>
                                                {l.project.budget > 0 && (
                                                    <span className="text-xs text-muted-foreground">{l.project.budget.toLocaleString('fr-FR')} €</span>
                                                )}
                                            </div>
                                            <Badge variant="outline" className="text-[10px] shrink-0">{l.role}</Badge>
                                            <Button
                                                variant="ghost" size="icon"
                                                className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive rounded-md"
                                                onClick={e => { e.stopPropagation(); handleUnlinkProject(l.id) }}
                                            >
                                                <X size={11} />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Lier un projet existant */}
                            {!showProjectCreate && (
                                <div className="mt-1">
                                    <SearchInput
                                        data={availableProjects}
                                        onSelect={handleLinkProject}
                                        getLabel={p => p.title}
                                        filterFn={(p, q) => p.title.toLowerCase().includes(q.toLowerCase())}
                                        placeholder="Rechercher un projet à lier…"
                                    />
                                    {availableProjects.length === 0 && allProjects.length > 0 && (
                                        <p className="text-xs text-muted-foreground italic mt-1.5 px-1">
                                            Tous les projets existants sont déjà liés.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Bouton créer */}
                            {!showProjectCreate && (
                                <button onClick={() => setShowProjectCreate(true)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground w-fit">
                                    <Plus size={12} /> Créer un projet
                                </button>
                            )}

                            {/* Quick-add Projet */}
                            {showProjectCreate && (
                                <div className="flex flex-col gap-2 p-3 rounded-lg border bg-muted/30">
                                    <Input placeholder="Titre du projet *" value={qProjectTitle} onChange={e => setQProjectTitle(e.target.value)} className="h-7 text-xs" />
                                    <Input type="number" placeholder="Budget (€)" value={qProjectBudget} onChange={e => setQProjectBudget(e.target.value)} className="h-7 text-xs" />
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" className="flex-1 h-7 text-xs rounded-md" onClick={() => { setShowProjectCreate(false); setQProjectTitle(''); setQProjectBudget('') }}>Annuler</Button>
                                        <Button size="sm" className="flex-1 h-7 text-xs rounded-md" disabled={!qProjectTitle.trim() || saving} onClick={handleProjectQuickAdd}>
                                            {saving ? '…' : 'Créer'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </section>

                    </div>
                </div>
            </SheetContent>
        </Sheet>

        {openCard && (
            <ActionCardViewerSheet
                card={openCard}
                open={!!openCard}
                onClose={() => setOpenCard(null)}
            />
        )}
        {openProject && (
            <ProjectViewerSheet
                project={openProject}
                open={!!openProject}
                onClose={() => setOpenProject(null)}
            />
        )}
    </>
    )
}

// --- Carte contact ---

function MemberCard({ member, onClick, selectOn, selected, onToggle, onDelete, selectedMembers, groups, groupLinks, actions, action_links, projects, projectLinks, onToggleGroup, onToggleMultipleGroup, onSelectAll, onAddToAction, onAddToProject, onAddMultipleToAction, onAddMultipleToProject}: {
    member: MemberFull
    onClick: () => void
    selectOn: boolean
    selected: boolean
    actions: ActionCardFull[]
    action_links: MemberActionCard[]
    projects: Project[]
    projectLinks: ProjectMember[]
    onToggle: () => void
    onDelete: (id: number) => void
    selectedMembers: MemberFull[]
    groups: Group[]
    groupLinks: GroupMember[]
    onToggleGroup: (member: MemberFull, groupId: number) => void
    onToggleMultipleGroup: (groupId: number) => void
    onSelectAll: () => void
    onAddToAction: (card: ActionCardFull) => void
    onAddToProject: (project: Project) => void
    onAddMultipleToAction: (card: ActionCardFull) => void
    onAddMultipleToProject: (project: Project) => void
}) {

    const [copied, setCopied] = useState(false)
    const [memberCopied, setMemberCopied] = useState(false)
    const [confirming, setConfirming] = useState(false)
    const [deleting,   setDeleting]   = useState(false)

    const linkedCardIds = action_links.filter(l => l.member_id === member.id).map(l => l.action_card_id)
    const availableActions = actions.filter(c => !linkedCardIds.includes(c.id))
    const linkedProjectIds = projectLinks.filter(l => l.member_id === member.id).map(l => l.project_id)
    const availableProjects = projects.filter(p => !linkedProjectIds.includes(p.id))

    function copyEmail() {
        navigator.clipboard.writeText(member.email)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    function copyEmails() {
        const emails = selectedMembers
            .map(m => m.email)
            .filter(Boolean)
            .join(', ')

        navigator.clipboard.writeText(emails)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    function copyMember() {
        const memberInfos = [
            `${member.first_name} ${member.last_name}`,
            member.partner?.name,
            member.position,
            member.email,
            member.tel,
        ].filter(Boolean).join('\n')

        navigator.clipboard.writeText(memberInfos)
        setMemberCopied(true)
        setTimeout(() => setMemberCopied(false), 2000)
    }

    function copyMembers() {
        const membersInfos = selectedMembers
            .map(m => [
                `${m.first_name} ${m.last_name}`,
                m.partner?.name,
                m.position,
                m.email,
                m.tel,
            ].filter(Boolean).join('\n'))
            .join('\n\n')

        navigator.clipboard.writeText(membersInfos)
        setMemberCopied(true)
        setTimeout(() => setMemberCopied(false), 2000)
    }

    function exportSelectedCSV() {
        const columns = [
            { key: 'first_name', label: 'Prénom' },
            { key: 'last_name',  label: 'Nom' },
            { key: 'position',   label: 'Poste' },
            { key: 'email',      label: 'Email' },
            { key: 'tel',        label: 'Téléphone' },
            { key: 'status',     label: 'Statut' },
            { key: 'partner',    label: 'Partenaire' },
        ]
        const rows = selectedMembers.map(m => ({
            first_name: m.first_name,
            last_name:  m.last_name,
            position:   m.position,
            email:      m.email,
            tel:        m.tel,
            status:     m.status,
            partner:    m.partner?.name ?? '',
        }))
        const header = columns.map(c => `"${c.label}"`).join(',')
        const body   = rows.map(r => columns.map(c => `"${(r[c.key as keyof typeof r] ?? '').replace(/"/g, '""')}"`).join(','))
        const csv    = ['﻿' + header, ...body].join('\n')
        const blob   = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url    = URL.createObjectURL(blob)
        const a      = document.createElement('a')
        a.href       = url
        a.download   = 'contacts.csv'
        a.click()
        URL.revokeObjectURL(url)
    }

    async function handleDelete() {
        setDeleting(true)
        try {
            await deleteMember(member.id)
            onDelete(member.id)
        } finally {
            setDeleting(false)
            setConfirming(false)
        }
    }

    async function handleDeleteMultiple() {
        setDeleting(true)
        try {
            await Promise.all(selectedMembers.map(m => deleteMember(m.id)))
            selectedMembers.forEach(m => onDelete(m.id))
            setConfirming(false)
        } finally {
            setDeleting(false)
        }
    }

    return (
        

        <ContextMenu onOpenChange={open => { if (!open) setConfirming(false) }}>

            <ContextMenuTrigger>

            <Card
                className={`cursor-pointer transition-all duration-200 ${
                    selected
                        ? 'bg-muted border-foreground shadow-none'
                        : 'hover:shadow-md'
                }`}
                onClick={selectOn ? onToggle : onClick}
            >

                <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                        <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                            <AvatarImage src={member.profile_image} />
                            <AvatarFallback className="text-sm" style={{ backgroundColor: member.partner?.color ?? '#E7E8E2' }}>
                                {member.first_name[0]}{member.last_name[0]}
                            </AvatarFallback>
                        </Avatar>
                       
                        <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <CardTitle className="text-sm leading-snug truncate">
                                        {member.first_name} {member.last_name}
                                    </CardTitle>
                                    <div className='bg-green-100 pr-2 rounded-full text-[10px] text-green-700 flex items-center'>
                                    {member.is_staff && (
                                        <>
                                        <BadgeCheck className="text-[10px] px-1.5 py-0 shrink-0 border-green-200 hover:bg-blue-100" />
                                        Equipe
                                        </>
                                        
                                    )}          
                                    </div>
                                </div>
                                
                                <Badge variant="outline" className="text-xs shrink-0">{member.status}</Badge> 
                            </div>
                            <CardDescription className="text-xs">{member.position}</CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-0 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    {member.partner ? (
                        <span
                            className="px-1.5 py-0.5 rounded-full border border-border text-xs shrink-0"
                            style={{ backgroundColor: member.partner.color }}
                        >
                            {member.partner.name}
                        </span>
                    ) : (
                        <span className="italic shrink-0">Sans partenaire</span>
                    )}
                    {member.email && (
                        <span className="truncate">{member.email}</span>
                    )}
                </CardContent>
            </Card>

        </ContextMenuTrigger>
            
            <ContextMenuContent>
                <ContextMenuGroup>
                    {selectOn ? (
                        <>
                        <ContextMenuItem onClick={onSelectAll}>
                            <CheckIcon size={14} /> Tout sélectionner
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                         <ContextMenuItem onSelect={e => e.preventDefault()} onClick={copyEmails}>
                            {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                            {copied ? 'Copié !' : 'Copier email'}
                        </ContextMenuItem>
                        <ContextMenuItem onSelect={e => e.preventDefault()} onClick={copyMembers}>
                            {memberCopied ? <CheckIcon /> : <ShareIcon />}
                            {memberCopied ? 'Infos copiées !' : 'Partager'}
                        </ContextMenuItem>
                        <ContextMenuItem onClick={exportSelectedCSV}>
                            <Download size={14} /> Exporter CSV ({selectedMembers.length})
                        </ContextMenuItem>
                        <ContextMenuSub>
                            <ContextMenuSubTrigger><Plus size={14} /> Ajouter au groupe</ContextMenuSubTrigger>
                            <ContextMenuSubContent>
                                {groups.map(g => {
                                    const memberIdsInGroup = groupLinks.filter(l => l.group_id === g.id).map(l => l.member_id)
                                    const allInGroup = selectedMembers.length > 0 && selectedMembers.every(m => memberIdsInGroup.includes(m.id))
                                    return (
                                        <ContextMenuItem key={g.id} onSelect={e => e.preventDefault()} onClick={() => onToggleMultipleGroup(g.id)}>
                                            {allInGroup ? <CheckIcon size={14} /> : <div className="w-[14px]" />}
                                            {g.name}
                                        </ContextMenuItem>
                                    )
                                })}
                            </ContextMenuSubContent>
                        </ContextMenuSub>
                        <ContextMenuSub>
                            <ContextMenuSubTrigger><Plus size={14} /> Ajouter à l'action</ContextMenuSubTrigger>
                            <ContextMenuSubContent className="p-0 w-64">
                                <div
                                    onPointerEnter={e => e.stopPropagation()}
                                    onPointerMove={e => e.stopPropagation()}
                                    onPointerLeave={e => e.stopPropagation()}
                                    className="p-1"
                                >
                                    <SearchInput
                                        data={actions}
                                        onSelect={c => onAddMultipleToAction(c)}
                                        getLabel={c => c.title}
                                        filterFn={(c, q) => c.title.toLowerCase().includes(q.toLowerCase())}
                                        renderItem={c => (
                                            <div className="flex items-center gap-2 w-full min-w-0">
                                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.category?.color ?? '#E7E8E2' }} />
                                                <span className="text-xs truncate flex-1">{c.title}</span>
                                            </div>
                                        )}
                                        placeholder="Rechercher une action…"
                                        inline
                                    />
                                </div>
                            </ContextMenuSubContent>
                        </ContextMenuSub>
                        <ContextMenuSub>
                            <ContextMenuSubTrigger><Plus size={14} /> Ajouter à un projet</ContextMenuSubTrigger>
                            <ContextMenuSubContent className="p-0 w-64">
                                <div
                                    onPointerEnter={e => e.stopPropagation()}
                                    onPointerMove={e => e.stopPropagation()}
                                    onPointerLeave={e => e.stopPropagation()}
                                    className="p-1"
                                >
                                    <SearchInput
                                        data={projects}
                                        onSelect={p => onAddMultipleToProject(p)}
                                        getLabel={p => p.title}
                                        filterFn={(p, q) => p.title.toLowerCase().includes(q.toLowerCase())}
                                        placeholder="Rechercher un projet…"
                                        inline
                                    />
                                </div>
                            </ContextMenuSubContent>
                        </ContextMenuSub>
</>
                        
                    
                    ) : (
                        <>
                        <ContextMenuItem onClick={onClick}><PencilIcon /> Editer </ContextMenuItem>
                        <ContextMenuItem onSelect={e => e.preventDefault()} onClick={copyEmail}>
                            {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                            {copied ? 'Copié !' : 'Copier email'}
                        </ContextMenuItem>
                        <ContextMenuItem onSelect={e => e.preventDefault()} onClick={copyMember}>
                            {memberCopied ? <CheckIcon /> : <ShareIcon />}
                            {memberCopied ? 'Infos copiées !' : 'Partager'}
                        </ContextMenuItem>
                        <ContextMenuSub>
                            <ContextMenuSubTrigger><Plus size={14} /> Ajouter au groupe</ContextMenuSubTrigger>
                            <ContextMenuSubContent>
                                {groups.map(g => {
                                    const isInGroup = groupLinks.some(l => l.member_id === member.id && l.group_id === g.id)
                                    return (
                                        <ContextMenuItem key={g.id} onSelect={e => e.preventDefault()} onClick={() => onToggleGroup(member, g.id)}>
                                            {isInGroup ? <CheckIcon size={14} /> : <div className="w-[14px]" />}
                                            {g.name}
                                        </ContextMenuItem>
                                    )
                                })}
                            </ContextMenuSubContent>
                        </ContextMenuSub>
                        <ContextMenuSub>
                            <ContextMenuSubTrigger><Plus size={14} /> Ajouter à l'action</ContextMenuSubTrigger>
                            <ContextMenuSubContent className="p-0 w-64">
                                <div
                                    onPointerEnter={e => e.stopPropagation()}
                                    onPointerMove={e => e.stopPropagation()}
                                    onPointerLeave={e => e.stopPropagation()}
                                    className="p-1"
                                >
                                    <SearchInput
                                        data={availableActions}
                                        onSelect={c => onAddToAction(c)}
                                        getLabel={c => c.title}
                                        filterFn={(c, q) => c.title.toLowerCase().includes(q.toLowerCase())}
                                        renderItem={c => (
                                            <div className="flex items-center gap-2 w-full min-w-0">
                                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.category?.color ?? '#E7E8E2' }} />
                                                <span className="text-xs truncate flex-1">{c.title}</span>
                                            </div>
                                        )}
                                        placeholder="Rechercher une action…"
                                        inline
                                    />
                                </div>
                            </ContextMenuSubContent>
                        </ContextMenuSub>
                        <ContextMenuSub>
                            <ContextMenuSubTrigger><Plus size={14} /> Ajouter à un projet</ContextMenuSubTrigger>
                            <ContextMenuSubContent className="p-0 w-64">
                                <div
                                    onPointerEnter={e => e.stopPropagation()}
                                    onPointerMove={e => e.stopPropagation()}
                                    onPointerLeave={e => e.stopPropagation()}
                                    className="p-1"
                                >
                                    <SearchInput
                                        data={availableProjects}
                                        onSelect={p => onAddToProject(p)}
                                        getLabel={p => p.title}
                                        filterFn={(p, q) => p.title.toLowerCase().includes(q.toLowerCase())}
                                        placeholder="Rechercher un projet…"
                                        inline
                                    />
                                </div>
                            </ContextMenuSubContent>
                        </ContextMenuSub>
                        </>
                    )}
                    
                </ContextMenuGroup>
                    <ContextMenuSeparator />
                <ContextMenuGroup>
                    {selectOn ? (
                        <>
                            {confirming ? (
                            <ContextMenuItem onSelect={e => e.preventDefault()}className="flex gap-2 p-1">
                                <Button variant="outline" size="sm" className="h-7 flex-1 border-md" onClick={() => setConfirming(false)}>
                                    Annuler
                                </Button>
                                <Button variant="destructive" size="sm" className="h-7 flex-1 border-md" onClick={handleDeleteMultiple} disabled={deleting}>
                                    {deleting ? '...' : `Confirmer (${selectedMembers.length} contacts)`}
                                </Button>
                            </ContextMenuItem>
                            
                        ) : (
                            <ContextMenuItem className="text-destructive focus:text-destructive" variant="destructive" onSelect={e => e.preventDefault()} onClick={() => setConfirming(true)}>
                                <Trash size={14} /> Supprimer
                            </ContextMenuItem>
                        )}
                        </>
                    ): (
                        <>
                            {confirming ? (
                            <ContextMenuItem onSelect={e => e.preventDefault()} className="flex gap-2 p-1">
                                <Button variant="outline" size="sm" className="h-7 flex-1 border-md" onClick={() => setConfirming(false)}>
                                    Annuler
                                </Button>
                                <Button variant="destructive" size="sm" className="h-7 flex-1 border-md" onClick={handleDelete} disabled={deleting}>
                                    {deleting ? '...' : 'Confirmer'}
                                </Button>
                            </ContextMenuItem>
                        ) : (
                            <ContextMenuItem className="text-destructive focus:text-destructive" variant="destructive" onSelect={e => e.preventDefault()} onClick={() => setConfirming(true)}>
                                <Trash size={14} /> Supprimer
                            </ContextMenuItem>
                        )}
                        </>
                    )}
                    
                </ContextMenuGroup>
            </ContextMenuContent>


        </ContextMenu>
        
    )
}

// --- Skeleton ---

function MemberCardSkeleton() {
    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                    <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                    <div className="flex flex-col gap-1.5 flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <Skeleton className="h-3 w-20" />
            </CardContent>
        </Card>
    )
}

// --- Page principale ---

export default function Members() {
    const [members,  setMembers]  = useState<MemberFull[]>([])
    const [partners, setPartners] = useState<Partner[]>([])
    const [actionCards, setActionCards] = useState<ActionCardFull[]>([])
    const [actionLinks, setActionLinks] = useState<MemberActionCard[]>([])
    const [projects, setProjects] = useState<Project[]>([])
    const [projectLinks, setProjectLinks] = useState<ProjectMember[]>([])
    const [labs,     setLabs]     = useState<Lab[]>([])
    const [groups, setGroups]     = useState<Group[]>([])
    const [groupLinks, setGroupLinks] = useState<GroupMember[]>([])
    const [loading,  setLoading]  = useState(false)
    const [error,    setError]    = useState('')
    const [query,         setQuery]         = useState('')
    const [isStaffFilter, setIsStaffFilter] = useState(false)
    const [statusFilter,  setStatusFilter]  = useState<string[]>([])
    const [partnerFilter, setPartnerFilter] = useState<number[]>([])
    const [groupFilter, setGroupFilter] = useState<number[]>([])
    const [groupSearch, setGroupSearch] = useState('')
    const [selected,       setSelected]       = useState<MemberFull | null>(null)
    const [showCreate,     setShowCreate]     = useState(false)
    const [partnerSearch,  setPartnerSearch]  = useState('')
    const [multipleSelect, setMultipleSelect] = useState(false)
    const [selectedMembers, setSelectedMembers] = useState<MemberFull[]>([])
    const [confirmingDelete, setConfirmingDelete] = useState(false)
    const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState<number | null>(null)
    const [myGroupsOnly, setMyGroupsOnly] = useState(false)
    type ViewMode = 'cards' | 'table'
    type MemberSortKey = 'name' | 'position' | 'status' | 'partner' | 'lab' | 'email'

    const [viewMode,   setViewMode]   = useState<ViewMode>('cards')
    const [sortKey,    setSortKey]    = useState<MemberSortKey>('name')
    const [sortDir,    setSortDir]    = useState<'asc' | 'desc'>('asc')

    function handleSort(col: MemberSortKey) {
        if (sortKey === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortKey(col); setSortDir('asc') }
    }

    function handleViewMode(mode: ViewMode) {
        setViewMode(mode)
        setMultipleSelect(false)
    }

    const currentUser = useCurrentUser()

    const displayedGroups = myGroupsOnly && currentUser
    ? groups.filter(g => g.owner_id === currentUser.id)
    : groups

    function copyEmailsGroup() {
        const emails = selectedMembers.map(m => m.email).filter(Boolean).join(', ')
        navigator.clipboard.writeText(emails)
    }

    function copyMembersGroup() {
        const info = selectedMembers
            .map(m => [
                `${m.first_name} ${m.last_name}`,
                m.partner?.name ? `Partenaire : ${m.partner.name}` : null,
                m.position    ? `Poste : ${m.position}`            : null,
                m.email       ? `Email : ${m.email}`               : null,
                m.tel         ? `Tél : ${m.tel}`                   : null,
            ].filter(Boolean).join('\n'))
            .join('\n\n')
        navigator.clipboard.writeText(info)
    }

    async function handleDeleteSelected() {
        await Promise.all(selectedMembers.map(m => deleteMember(m.id)))
        setMembers(prev => prev.filter(m => !selectedMembers.find(sm => sm.id === m.id)))
        setSelectedMembers([])
        setMultipleSelect(false)
        setConfirmingDelete(false)
    }

    function selectAll() {
        setSelectedMembers(filtered)
    }

    function toggleMember(member: MemberFull) {
        setSelectedMembers(prev =>
            prev.find(m => m.id === member.id)
                ? prev.filter(m => m.id !== member.id)
                : [...prev, member]
        )
        console.log(selectedMembers)
    }

    async function handleDeleteGroup(groupId: number) {
        await deleteGroup(groupId)
        setGroups(prev => prev.filter(g => g.id !== groupId))
        setGroupLinks(prev => prev.filter(l => l.group_id !== groupId))
        setGroupFilter(prev => prev.filter(id => id !== groupId))
        setConfirmDeleteGroupId(null)
    }

    async function handleCreateGroup(name: string) {
        if (!name) return
        setGroupSearch('')
        const group = await addGroup(name, currentUser?.id ?? null)
        setGroups(prev => prev.some(g => g.id === group.id) ? prev : [...prev, group])
    }

    async function handleToggleGroup(member: MemberFull, groupId: number) {
        const existingLink = groupLinks.find(l => l.member_id === member.id && l.group_id === groupId)
        if (existingLink) {
            await removeMemberFromGroup(existingLink.id)
            setGroupLinks(prev => prev.filter(l => l.id !== existingLink.id))
        } else {
            const link = await addMemberToGroup(member.id, groupId)
            setGroupLinks(prev => [...prev, link])
        }
    }

    async function handleToggleMultipleGroup(groupId: number) {
        const memberIdsInGroup = groupLinks.filter(l => l.group_id === groupId).map(l => l.member_id)
        const allInGroup = selectedMembers.length > 0 && selectedMembers.every(m => memberIdsInGroup.includes(m.id))

        if (allInGroup) {
            const linksToRemove = groupLinks.filter(l => l.group_id === groupId && selectedMembers.some(m => m.id === l.member_id))
            await Promise.all(linksToRemove.map(l => removeMemberFromGroup(l.id)))
            setGroupLinks(prev => prev.filter(l => !linksToRemove.find(lr => lr.id === l.id)))
        } else {
            const toAdd = selectedMembers.filter(m => !memberIdsInGroup.includes(m.id))
            const links = await Promise.all(toAdd.map(m => addMemberToGroup(m.id, groupId)))
            setGroupLinks(prev => [...prev, ...links])
        }
    }

    useEffect(() => {
    setLoading(true)
    Promise.all([getMembersFull(), getPartners(), getLabs(), getGroups(), getGroupMembers(), getActionCardsFull(), getAllMemberActionCards(), getProjects(), getAllProjectMembers()])
        .then(([m, p, l, g, gm, ac, mac, proj, pm]) => {
            setMembers(m)
            setPartners(p)
            setLabs(l)
            setGroups(g)
            setGroupLinks(gm)
            setActionCards(ac)
            setActionLinks(mac)
            setProjects(proj as Project[])
            setProjectLinks(pm as ProjectMember[])
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false))
}, [])

    const availableStatuses = [...new Set(members.map(m => m.status))].sort()

    const filtered = members.filter(m => {
        const matchesQuery = !query.trim() ||
            `${m.first_name} ${m.last_name}`.toLowerCase().includes(query.toLowerCase()) ||
            m.position.toLowerCase().includes(query.toLowerCase()) ||
            m.email.toLowerCase().includes(query.toLowerCase())
        const matchesStatus  = statusFilter.length === 0 || statusFilter.includes(m.status)
        const matchesPartner = partnerFilter.length === 0 || partnerFilter.includes(m.partner_id)
        const matchesGroup = groupFilter.length === 0 || groupLinks.some(l => groupFilter.includes(l.group_id) && l.member_id === m.id)
        const isStaff = isStaffFilter === true ? m.is_staff === true : true
        return matchesQuery && matchesStatus && matchesPartner && matchesGroup && isStaff
    })

    function handleUpdated(updated: MemberFull) {
        setMembers(prev => prev.map(m => m.id === updated.id ? updated : m))
        setSelected(updated)
    }

    function handleCreated(newMember: MemberFull) {
        setMembers(prev => [...prev, newMember])
        setShowCreate(false)
    }

    function handleDeleted(id: number) {
        setMembers(prev => prev.filter(m => m.id !== id))
        setSelected(null)
    }

    async function handleAddToAction(member: MemberFull, card: ActionCardFull) {
        const link = await addMemberToCard(card.id, member.id, 'Contributeur')
        setActionLinks(prev => [...prev, link])
        toast.success(`${member.first_name} ${member.last_name} ajouté à « ${card.title} »`)
    }

    async function handleAddToProject(member: MemberFull, project: Project) {
        const link = await addProjectMember(project.id, member.id, 'Contributeur')
        setProjectLinks(prev => [...prev, link])
        toast.success(`${member.first_name} ${member.last_name} ajouté à « ${project.title} »`)
    }

    async function handleAddMultipleToAction(card: ActionCardFull) {
        const toAdd    = selectedMembers.filter(m => !actionLinks.some(l => l.action_card_id === card.id && l.member_id === m.id))
        const skipped  = selectedMembers.length - toAdd.length
        const links    = await Promise.all(toAdd.map(m => addMemberToCard(card.id, m.id, 'Contributeur')))
        setActionLinks(prev => [...prev, ...links])
        const msg = toAdd.length > 0
            ? `${toAdd.length} membre${toAdd.length > 1 ? 's' : ''} ajouté${toAdd.length > 1 ? 's' : ''} à « ${card.title} »`
            : `Aucun membre ajouté à « ${card.title} »`
        const desc = skipped > 0 ? `${skipped} déjà présent${skipped > 1 ? 's' : ''}` : undefined
        toAdd.length > 0 ? toast.success(msg, { description: desc }) : toast.warning(msg, { description: desc })
    }

    async function handleAddMultipleToProject(project: Project) {
        const toAdd   = selectedMembers.filter(m => !projectLinks.some(l => l.project_id === project.id && l.member_id === m.id))
        const skipped = selectedMembers.length - toAdd.length
        const links   = await Promise.all(toAdd.map(m => addProjectMember(project.id, m.id, 'Contributeur')))
        setProjectLinks(prev => [...prev, ...links])
        const msg = toAdd.length > 0
            ? `${toAdd.length} membre${toAdd.length > 1 ? 's' : ''} ajouté${toAdd.length > 1 ? 's' : ''} à « ${project.title} »`
            : `Aucun membre ajouté à « ${project.title} »`
        const desc = skipped > 0 ? `${skipped} déjà présent${skipped > 1 ? 's' : ''}` : undefined
        toAdd.length > 0 ? toast.success(msg, { description: desc }) : toast.warning(msg, { description: desc })
    }

    return (
        <div className="m-5 flex flex-col gap-4">

            {/* Barre + filtres + bouton */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="bg-gray-200 rounded-full border p-1 flex relative">
                   {([
                        { mode: 'cards',    label: 'Cartes',    icon: <LayoutGrid size={13} /> },
                        { mode: 'table',    label: 'Tableau',   icon: <Table2 size={13} /> },
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
                                    layoutId="activeMemberTab"
                                    className="absolute inset-0 bg-black rounded-full z-10"
                                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                />
                            )}
                        </button>
                    ))}
                </div>

                <Input
                    placeholder="Rechercher un contact..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="max-w-sm"
                />

                {/* Filtre statut — multi-select */}
                <Popover>
                    <PopoverTrigger asChild>
                        <button className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition-colors ${
                            statusFilter.length > 0
                                ? 'bg-foreground text-background border-foreground'
                                : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                        }`}>
                            {statusFilter.length === 0
                                ? 'Tous les statuts'
                                : statusFilter.length === 1
                                    ? statusFilter[0]
                                    : `${statusFilter.length} statuts`
                            }
                            <ChevronDown size={12} />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-52 p-2 flex flex-col gap-0.5">
                        {statusFilter.length > 0 && (
                            <>
                                <button
                                    onClick={() => setStatusFilter([])}
                                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 text-left"
                                >
                                    Tout déselectionner
                                </button>
                                <Separator className="my-1" />
                            </>
                        )}
                        {availableStatuses.map(s => (
                            <label
                                key={s}
                                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-xs"
                            >
                                <Checkbox
                                    checked={statusFilter.includes(s)}
                                    onCheckedChange={checked => setStatusFilter(prev =>
                                        checked ? [...prev, s] : prev.filter(x => x !== s)
                                    )}
                                />
                                {s}
                            </label>
                        ))}
                    </PopoverContent>
                </Popover>

                {/* filtre isStaff */}
                <button
                        onClick={() => setIsStaffFilter(!isStaffFilter)}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition-colors ${
                            isStaffFilter
                                ? 'bg-green-200 text-white border-green-200 text-green-800'
                                : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                        }`}
                    >
                        <Users size={13}/> Equipe 
                    </button>


                {/* Filtre partenaire — multi-select avec recherche */}
                <Popover onOpenChange={open => { if (!open) setPartnerSearch('') }}>
                    <PopoverTrigger asChild>
                        <button className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition-colors ${
                            partnerFilter.length > 0
                                ? 'bg-foreground text-background border-foreground'
                                : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                        }`}>
                            {partnerFilter.length === 0
                                ? 'Tous les partenaires'
                                : partnerFilter.length === 1
                                    ? partners.find(p => p.id === partnerFilter[0])?.name ?? '1 partenaire'
                                    : `${partnerFilter.length} partenaires`
                            }
                            <ChevronDown size={12} />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-64 p-2 flex flex-col gap-0.5">
                        <Input
                            placeholder="Rechercher..."
                            value={partnerSearch}
                            onChange={e => setPartnerSearch(e.target.value)}
                            className="h-7 text-xs mb-1"
                            autoFocus
                        />
                        {partnerFilter.length > 0 && (
                            <>
                                <button
                                    onClick={() => setPartnerFilter([])}
                                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 text-left"
                                >
                                    Tout déselectionner
                                </button>
                                <Separator className="my-1" />
                            </>
                        )}
                        <div className="max-h-56 overflow-y-auto flex flex-col gap-0.5">
                            {partners
                                .filter(p => p.name.toLowerCase().includes(partnerSearch.toLowerCase()))
                                .map(p => (
                                    <label
                                        key={p.id}
                                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-xs"
                                    >
                                        <Checkbox
                                            checked={partnerFilter.includes(p.id)}
                                            onCheckedChange={checked => setPartnerFilter(prev =>
                                                checked ? [...prev, p.id] : prev.filter(x => x !== p.id)
                                            )}
                                        />
                                        <span className="flex items-center gap-1.5">
                                            {p.color && (
                                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                                            )}
                                            {p.name}
                                        </span>
                                    </label>
                                ))
                            }
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Filtre partenaire — multi-select avec recherche */}
                <Popover onOpenChange={open => { if (!open) { setGroupSearch(''); setConfirmDeleteGroupId(null) } }}>
                    <PopoverTrigger asChild>
                        <button className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition-colors ${
                            groupFilter.length > 0
                                ? 'bg-foreground text-background border-foreground'
                                : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                        }`}>
                            {groupFilter.length === 0
                                ? 'Tous les groupes'
                                : groupFilter.length === 1
                                    ? groups.find(g => g.id === groupFilter[0])?.name ?? '1 groupe'
                                    : `${groupFilter.length} groupes`
                            }
                            <ChevronDown size={12} />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-64 p-2 flex flex-col gap-0.5">
                        <Input
                            placeholder="Rechercher ou créer un groupe"
                            value={groupSearch}
                            onChange={e => setGroupSearch(e.target.value)}
                            className="h-7 text-xs mb-1"
                            autoFocus
                        />

                        {currentUser && (
                            <> 
                                <label className="flex items-center gap-2 px-2 py-1.5 cursor-pointer text-xs flex-1 min-w-0">
                                    <Checkbox id="terms-checkbox-basic" name="terms-checkbox-basic" onClick={() => setMyGroupsOnly(!myGroupsOnly)}/>
                                    <span className="truncate">Mes groupes</span>
                                </label>
                                
                                <Separator className="my-1" />
                            </>
                        )}

                        {groupFilter.length > 0 && (
                            <>
                                <button
                                    onClick={() => setGroupFilter([])}
                                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 text-left"
                                >
                                    Tout déselectionner
                                </button>
                                <Separator className="my-1" />
                            </>
                        )}
                        <div className="max-h-56 overflow-y-auto flex flex-col gap-0.5">
                            {displayedGroups
                                .filter(g => g.name.toLowerCase().includes(groupSearch.toLowerCase()))
                                .map(g => (
                                    <div key={g.id} className="flex items-center rounded hover:bg-muted group/item">
                                        {confirmDeleteGroupId === g.id ? (
                                            <div className="flex items-center gap-1 px-2 py-1 w-full">
                                                <span className="text-xs text-destructive flex-1">Supprimer ?</span>
                                                <button
                                                    onClick={() => setConfirmDeleteGroupId(null)}
                                                    className="text-xs px-1.5 py-0.5 rounded hover:bg-muted-foreground/20"
                                                >
                                                    Non
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteGroup(g.id)}
                                                    className="text-xs px-1.5 py-0.5 rounded text-destructive hover:bg-destructive/10 font-medium"
                                                >
                                                    Oui
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <label className="flex items-center gap-2 px-2 py-1.5 cursor-pointer text-xs flex-1 min-w-0">
                                                    <Checkbox
                                                        checked={groupFilter.includes(g.id)}
                                                        onCheckedChange={checked => setGroupFilter(prev =>
                                                            checked ? [...prev, g.id] : prev.filter(x => x !== g.id)
                                                        )}
                                                    />
                                                    <span className="truncate">{g.name}</span>
                                                </label>
                                                <button
                                                    onClick={e => { e.stopPropagation(); setConfirmDeleteGroupId(g.id) }}
                                                    className="opacity-0 group-hover/item:opacity-100 p-1 mr-1 rounded text-muted-foreground hover:text-destructive transition-opacity shrink-0"
                                                >
                                                    <Trash size={12} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ))
                            }
                            {groupSearch.trim() && !groups.some(g => g.name.toLowerCase() === groupSearch.trim().toLowerCase()) && (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault()
                                        handleCreateGroup(groupSearch.trim())}
                                    }
                                        className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-muted text-xs text-muted-foreground hover:text-foreground w-full text-left"
                                >
                                    <Plus size={12} />
                                    Créer « {groupSearch.trim()} »
                                </button>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>

                <span className="text-sm text-muted-foreground flex-1">
                    {filtered.length} contact{filtered.length > 1 ? 's' : ''}
                </span>

                {viewMode === 'cards' && (multipleSelect ? (
                    <Button size="sm" variant="outline" className="gap-1.5 rounded-md" onClick={() => { setMultipleSelect(false); setSelectedMembers([]) }}>
                        <X size={14} /> Terminer
                    </Button>
                ) : (
                    <Button size="sm" className="gap-1.5 rounded-md bg-transparent border border-border text-foreground hover:bg-muted" onClick={() => setMultipleSelect(true)}>
                        <ListChecks size={14} /> Sélection multiple
                    </Button>
                ))}

                <Button size="sm" className="gap-1.5 rounded-md" onClick={() => setShowCreate(true)}>
                    <Plus size={14} /> Nouveau contact
                </Button>
            </div>

            

            {error && <p className="text-sm text-destructive">Erreur : {error}</p>}


            {/* Grille */}
            { viewMode === "cards" && (
                <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {loading
                        ? [...Array(6)].map((_, i) => <MemberCardSkeleton key={i} />)
                        : filtered.map(member => (
                            <MemberCard
                                key={member.id}
                                member={member}
                                actions={actionCards}
                                action_links={actionLinks}
                                projects={projects}
                                projectLinks={projectLinks}
                                onClick={() => setSelected(member)}
                                selectOn= {multipleSelect}
                                selected={!!selectedMembers.find(m => m.id === member.id)}
                                onToggle={() => toggleMember(member)}
                                onDelete={handleDeleted}
                                selectedMembers={selectedMembers}
                                groups={groups}
                                groupLinks={groupLinks}
                                onToggleGroup={handleToggleGroup}
                                onToggleMultipleGroup={(groupId) => handleToggleMultipleGroup(groupId)}
                                onSelectAll={selectAll}
                                onAddToAction={card => handleAddToAction(member, card)}
                                onAddToProject={project => handleAddToProject(member, project)}
                                onAddMultipleToAction={handleAddMultipleToAction}
                                onAddMultipleToProject={handleAddMultipleToProject}
                            />
                        ))
                    }
                    {!loading && filtered.length === 0 && (
                        <p className="text-sm text-muted-foreground col-span-full text-center py-8">
                            Aucun contact ne correspond à la recherche.
                        </p>
                    )}
                </div>
                </>
            )}

            {/* Vue tableau */}
            {viewMode === 'table' && (() => {
                const sorted = [...filtered].sort((a, b) => {
                    let va = ''
                    let vb = ''
                    if (sortKey === 'name')     { va = `${a.first_name} ${a.last_name}`;  vb = `${b.first_name} ${b.last_name}` }
                    if (sortKey === 'position') { va = a.position;                         vb = b.position }
                    if (sortKey === 'status')   { va = a.status;                           vb = b.status }
                    if (sortKey === 'partner')  { va = a.partner?.name ?? '';              vb = b.partner?.name ?? '' }
                    if (sortKey === 'lab')      { va = a.lab?.name ?? '';                  vb = b.lab?.name ?? '' }
                    if (sortKey === 'email')    { va = a.email;                            vb = b.email }
                    if (va < vb) return sortDir === 'asc' ? -1 : 1
                    if (va > vb) return sortDir === 'asc' ? 1 : -1
                    return 0
                })

                const allSelected = sorted.length > 0 && sorted.every(m => !!selectedMembers.find(sm => sm.id === m.id))

                function SortIcon({ col }: { col: MemberSortKey }) {
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
                                                    setSelectedMembers(checked ? sorted : [])
                                                }}
                                            />
                                        </TableHead>
                                        <TableHead className="cursor-pointer select-none min-w-48" onClick={() => handleSort('name')}>
                                            Nom <SortIcon col="name" />
                                            <span className="text-xs ml-3 text-gray-500">({sorted.length})</span>
                                        </TableHead>
                                        <TableHead className="cursor-pointer select-none" onClick={() => handleSort('position')}>
                                            Poste <SortIcon col="position" />
                                        </TableHead>
                                        <TableHead className="cursor-pointer select-none" onClick={() => handleSort('status')}>
                                            Statut <SortIcon col="status" />
                                        </TableHead>
                                        <TableHead className="cursor-pointer select-none" onClick={() => handleSort('partner')}>
                                            Partenaire <SortIcon col="partner" />
                                        </TableHead>
                                        <TableHead className="cursor-pointer select-none" onClick={() => handleSort('lab')}>
                                            Laboratoire <SortIcon col="lab" />
                                        </TableHead>
                                        <TableHead className="cursor-pointer select-none" onClick={() => handleSort('email')}>
                                            Email <SortIcon col="email" />
                                        </TableHead>
                                        <TableHead>Téléphone</TableHead>
                                        <TableHead className="w-16" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sorted.length === 0 && (
                                        
                                            <TableRow>
                                                <TableCell colSpan={9} className="text-center text-muted-foreground py-12 italic">
                                                    Aucun contact correspondant aux filtres
                                                </TableCell>
                                            </TableRow>
                                            
                                        
                                    )}
                                    {sorted.map(m => {
                                        const isSelected = !!selectedMembers.find(sm => sm.id === m.id)
                                        return (
                                            <TableRow
                                                key={m.id}
                                                data-state={isSelected ? 'selected' : undefined}
                                                className="cursor-pointer group"
                                                onClick={() => setSelected(m)}
                                            >
                                                <TableCell className="px-4" onClick={e => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={() => { setMultipleSelect(true); toggleMember(m) }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-6 w-6 shrink-0">
                                                            <AvatarImage src={m.profile_image} />
                                                            <AvatarFallback className="text-[10px]" style={{ backgroundColor: m.partner?.color ?? '#E7E8E2' }}>
                                                                {m.first_name[0]}{m.last_name[0]}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="font-medium">{m.first_name} {m.last_name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground max-w-48">
                                                    <span className="truncate block">{m.position || '—'}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-xs whitespace-nowrap">{m.status}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {m.partner
                                                        ? <span className="text-xs px-2 py-0.5 rounded-full border border-border whitespace-nowrap" style={{ backgroundColor: m.partner.color }}>{m.partner.name}</span>
                                                        : <span className="text-muted-foreground">—</span>}
                                                </TableCell>
                                                <TableCell>
                                                    {m.lab
                                                        ? <Badge variant="secondary" className="text-xs whitespace-nowrap">{m.lab.name}</Badge>
                                                        : <span className="text-muted-foreground">—</span>}
                                                </TableCell>
                                                <TableCell>
                                                    {m.email
                                                        ? <a href={`mailto:${m.email}`} className="text-xs text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>{m.email}</a>
                                                        : <span className="text-muted-foreground">—</span>}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{m.tel || '—'}</TableCell>
                                                <TableCell onClick={e => e.stopPropagation()}>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => setSelected(m)}>
                                                            <Pencil size={13} />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive rounded-md"
                                                            onClick={async () => { await deleteMember(m.id); handleDeleted(m.id) }}>
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

                    </div>
                )
            })()}
            

            {/* Sheet consultation */}
            {selected && (
                <MemberDetailSheet
                    member={selected}
                    partners={partners}
                    labs={labs}
                    existingEmails={members.map(m => m.email)}
                    open={!!selected}
                    onClose={() => setSelected(null)}
                    onUpdated={handleUpdated}
                    onDeleted={handleDeleted}
                />
            )}

            {/* Sheet création */}
            <Sheet open={showCreate} onOpenChange={v => { if (!v) setShowCreate(false) }}>
                <SheetContent side="right" showCloseButton={false} className="!w-[480px] p-0 flex flex-col">
                    <SheetHeader className="px-6 py-4 border-b flex flex-row items-center justify-between shrink-0">
                        <SheetTitle>Nouveau contact</SheetTitle>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowCreate(false)}>
                            <X size={14} />
                        </Button>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto">
                        <MemberFormSheet
                            mode="create"
                            partners={partners}
                            labs={labs}
                            existingEmails={members.map(m => m.email)}
                            onCreated={handleCreated}
                            onClose={() => setShowCreate(false)}
                        />
                    </div>
                </SheetContent>
            </Sheet>

            {/* Floating selection bar */}
            {multipleSelect && selectedMembers.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-3 py-2 rounded-full bg-foreground text-background shadow-xl">
                    {confirmingDelete ? (
                        <>
                            <span className="text-sm px-2">Supprimer {selectedMembers.length} contact{selectedMembers.length > 1 ? 's' : ''} ?</span>
                            <div className="w-px h-4 bg-background/20 mx-1" />
                            <Button variant="ghost" size="sm" className="h-7 rounded-full text-background hover:text-background hover:bg-white/10" onClick={() => setConfirmingDelete(false)}>Annuler</Button>
                            <Button variant="ghost" size="sm" className="h-7 rounded-full text-red-400 hover:text-red-300 hover:bg-white/10" onClick={handleDeleteSelected}>Confirmer</Button>
                        </>
                    ) : (
                        <>
                            <span className="text-sm font-medium px-2">{selectedMembers.length} sélectionné{selectedMembers.length > 1 ? 's' : ''}</span>
                            <div className="w-px h-4 bg-background/20 mx-1" />
                            <Button variant="ghost" size="sm" className="h-7 gap-1.5 rounded-full text-background hover:text-background hover:bg-white/10" onClick={selectAll}>
                                <ListChecks size={13} /> Tout sélectionner
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 gap-1.5 rounded-full text-background hover:text-background hover:bg-white/10" onClick={copyEmailsGroup}>
                                <CopyIcon size={13} /> Copier emails
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 gap-1.5 rounded-full text-background hover:text-background hover:bg-white/10" onClick={copyMembersGroup}>
                                <ShareIcon size={13} /> Partager
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 gap-1.5 rounded-full text-background hover:text-background hover:bg-white/10" onClick={() => exportToCsv(
                                'contacts.csv',
                                ['Prénom', 'Nom', 'Poste', 'Email', 'Téléphone', 'Statut', 'Partenaire', 'Laboratoire'],
                                selectedMembers.map(m => [m.first_name, m.last_name, m.position, m.email, m.tel, m.status, m.partner?.name ?? '', m.lab?.name ?? ''])
                            )}>
                                <FileDown size={13} /> Exporter en CSV
                            </Button>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 gap-1.5 rounded-full text-background hover:text-background hover:bg-white/10">
                                        <Tag size={13} /> Groupes
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-52 p-1" side="top" align="center">
                                    {groups.length === 0 ? (
                                        <p className="text-xs text-muted-foreground px-2 py-1.5">Aucun groupe</p>
                                    ) : groups.map(g => {
                                        const memberIdsInGroup = groupLinks.filter(l => l.group_id === g.id).map(l => l.member_id)
                                        const allIn  = selectedMembers.length > 0 && selectedMembers.every(m => memberIdsInGroup.includes(m.id))
                                        const someIn = !allIn && selectedMembers.some(m => memberIdsInGroup.includes(m.id))
                                        return (
                                            <button
                                                key={g.id}
                                                onClick={() => handleToggleMultipleGroup(g.id)}
                                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent text-left"
                                            >
                                                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${allIn ? 'bg-primary border-primary text-primary-foreground' : someIn ? 'bg-primary/30 border-primary/50' : 'border-input'}`}>
                                                    {allIn && <Check size={10} />}
                                                    {someIn && <span className="w-2 h-0.5 bg-primary block" />}
                                                </span>
                                                <span className="truncate">{g.name}</span>
                                            </button>
                                        )
                                    })}
                                </PopoverContent>
                            </Popover>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 gap-1.5 rounded-full text-background hover:text-background hover:bg-white/10">
                                        <ListTodo size={13} /> Actions
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-1" side="top" align="center">
                                    <SearchInput
                                        data={actionCards}
                                        onSelect={handleAddMultipleToAction}
                                        getLabel={c => c.title}
                                        filterFn={(c, q) => c.title.toLowerCase().includes(q.toLowerCase())}
                                        renderItem={c => (
                                            <div className="flex items-center gap-2 w-full min-w-0">
                                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.category?.color ?? '#E7E8E2' }} />
                                                <span className="text-xs truncate flex-1">{c.title}</span>
                                            </div>
                                        )}
                                        placeholder="Rechercher une action…"
                                        dropdownUp
                                    />
                                </PopoverContent>
                            </Popover>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 gap-1.5 rounded-full text-background hover:text-background hover:bg-white/10">
                                        <FolderOpen size={13} /> Projets
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-1" side="top" align="center">
                                    <SearchInput
                                        data={projects}
                                        onSelect={handleAddMultipleToProject}
                                        getLabel={p => p.title}
                                        filterFn={(p, q) => p.title.toLowerCase().includes(q.toLowerCase())}
                                        placeholder="Rechercher un projet…"
                                        dropdownUp
                                    />
                                </PopoverContent>
                            </Popover>
                            <Button variant="ghost" size="sm" className="h-7 gap-1.5 rounded-full text-red-400 hover:text-red-300 hover:bg-white/10" onClick={() => setConfirmingDelete(true)}>
                                <Trash size={13} /> Supprimer
                            </Button>
                            <div className="w-px h-4 bg-background/20 mx-1" />
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-background hover:text-background hover:bg-white/10" onClick={() => { setMultipleSelect(false); setSelectedMembers([]) }}>
                                <X size={13} />
                            </Button>
                        </>
                    )}
                </div>
            )}

        </div>
    )
}
