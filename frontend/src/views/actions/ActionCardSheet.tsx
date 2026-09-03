import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { X, Plus, Check } from 'lucide-react'
import {
    getStatuses, getCategories, getMembers, getPartners, getProjects, getAxes,
    getOrCreateOtherCategory, createActionCardFull, updateActionCard, type ActionCardCreateForm,
    getCommentsFull, addMember,
} from '@/lib/api'
import type { Status, Category, Member, Partner, Project, Axis, CommentFull } from '@/lib/types'
import SearchInput from '@/components/SearchInput'
import type { ActionCardData } from './ActionCard'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useCurrentUser } from '@/lib/userContext'

type Props = {
    open: boolean
    onClose: () => void
    onCreated: (card: ActionCardData) => void
    editCard?: ActionCardData
    onUpdated?: (card: ActionCardData) => void
}

const ROLES = ['Responsable', 'Contributeur', 'Observateur']

const MEMBER_STATUSES = [
    'Enseignant-chercheur', 'Chercheur', 'Ingénieur', 'Doctorant',
    'Post-doc', 'BIATSS', 'Autre',
]


const EMPTY_FORM: ActionCardCreateForm = {
    title: '', description: '',
    start_date: '', end_date: '',
    status_id: 0, category_id: 0, axis_id: null,
    owner_id: 0,
    members: [],
    project_id: null,
    todo_title: '', todo_items: [],
    
}

// --- Recherche membre avec suggestions ---

type MemberSearchInputProps = {
    members: Member[]
    partners: Partner[]
    onSelect: (member: Member) => void
}

function MemberSearchInput({ members, partners, onSelect }: MemberSearchInputProps) {
    const [query, setQuery] = useState('')
    const [open, setOpen]   = useState(false)
    const partnerMap = new Map(partners.map(p => [p.id, p]))

    const filtered = query.trim().length === 0 ? members : members.filter(m => {
        const full = `${m.first_name} ${m.last_name}`.toLowerCase()
        const partner = partnerMap.get(m.partner_id)?.name.toLowerCase() ?? ''
        return full.includes(query.toLowerCase()) || partner.includes(query.toLowerCase())
    })

    function select(m: Member) {
        onSelect(m)
        setQuery('')
        setOpen(false)
    }

    return (
        <div className="relative flex-1">
            <Input
                value={query}
                onChange={e => { setQuery(e.target.value); setOpen(true) }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                placeholder="Rechercher un membre..."
                className="h-8 text-xs"
            />
            {open && filtered.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md overflow-hidden">
                    <ul className="max-h-48 overflow-y-auto py-1">
                        {filtered.map(m => {
                            const partner = partnerMap.get(m.partner_id)
                            return (
                                <li
                                    key={m.id}
                                    onMouseDown={() => select(m)}
                                    className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-muted"
                                >
                                    <span>{m.first_name} {m.last_name}</span>
                                    {partner && (
                                        <span
                                            className="shrink-0 text-xs px-1.5 py-0.5 rounded-full border border-border"
                                            style={partner.color ? { backgroundColor: partner.color } : {}}
                                        >
                                            {partner.name}
                                        </span>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                </div>
            )}
        </div>
    )
}

// --- Formulaire création rapide membre ---

type MemberQuickCreateFormProps = {
    partners: Partner[]
    role: string
    existingEmails?: string[]
    onSaved: (member: Member) => void
    onCancel: () => void
}

function MemberQuickCreateForm({ partners, role, existingEmails = [], onSaved, onCancel }: MemberQuickCreateFormProps) {
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
            <p className="text-xs font-medium text-muted-foreground">
                Nouveau contact · rôle : <span className="text-foreground">{role}</span>
            </p>
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
                    <SelectTrigger className="h-8 text-xs w-40 shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent position="popper">
                        {MEMBER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
                <div className="flex-1 min-w-0">
                    <SearchInput
                        data={partners}
                        onSelect={p => setPartnerId(p.id)}
                        getLabel={p => p.name}
                        placeholder="Partenaire..."
                        value={partners.find(p => p.id === partnerId)?.name}
                    />
                </div>
            </div>
            <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={onCancel} disabled={submitting}>Annuler</Button>
                <Button size="sm" onClick={handleSubmit} disabled={submitting || !firstName.trim() || !lastName.trim()}>
                    <Check size={12} className="mr-1" />{submitting ? '...' : 'Créer et ajouter'}
                </Button>
            </div>
        </div>
    )
}

export default function ActionCardSheet({ open, onClose, onCreated, editCard, onUpdated }: Props) {
    const currentUser = useCurrentUser()
    const [form, setForm]             = useState<ActionCardCreateForm>(EMPTY_FORM)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError]           = useState<string | null>(null)

    const [statuses,   setStatuses]   = useState<Status[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [members,    setMembers]    = useState<Member[]>([])
    const [partners,   setPartners]   = useState<Partner[]>([])
    const [projects,   setProjects]   = useState<Project[]>([])
    const [axes,       setAxes]       = useState<Axis[]>([])
    const [_comments, setComments]     = useState<CommentFull[]>([])

    const [roleToAdd,       setRoleToAdd]       = useState<string>(ROLES[1])
    const [todoInput,       setTodoInput]       = useState('')
    const [showCreateMember, setShowCreateMember] = useState(false)


    useEffect(() => {
        if (!open) return
        Promise.all([
                getStatuses(), getCategories(), getMembers(), getPartners(), getProjects(), getAxes(),
                editCard ? getCommentsFull(editCard.id) : Promise.resolve([])
            ])
            .then(([s, c, m, pt, p, a, commentsFull]) => {
                setStatuses(s.filter(s => s.context === 'action_card'))
                setCategories(c)
                setMembers(m)
                setPartners(pt)
                setProjects(p)
                setAxes(a)
                setComments(commentsFull)
                if (editCard) {
                    setForm({
                        ...EMPTY_FORM,
                        title:       editCard.title,
                        description: editCard.description ?? '',
                        start_date:  editCard.start_date ?? '',
                        end_date:    editCard.end_date   ?? '',
                        status_id:   editCard.status.id,
                        category_id: editCard.category.id,
                        owner_id:    editCard.owner?.id ?? m[0]?.id ?? 0,
                    })
                } else {
                    const defaultMembers = currentUser && m.find(mb => mb.id === currentUser.id)
                        ? [{ member_id: currentUser.id, role: 'Responsable' }]
                        : []
                    setForm(f => ({
                        ...f,
                        status_id: s.find(s => s.context === 'action_card')?.id ?? 0,
                        owner_id:  currentUser?.id ?? m[0]?.id ?? 0,
                        members:   defaultMembers,
                    }))
                }
            })
    }, [open])

    function set<K extends keyof ActionCardCreateForm>(key: K, value: ActionCardCreateForm[K]) {
        setForm(prev => ({ ...prev, [key]: value }))
    }

    function addMemberById(id: number) {
        if (!id || form.members.some(m => m.member_id === id)) return
        set('members', [...form.members, { member_id: id, role: roleToAdd }])
    }

    function removeMember(memberId: number) {
        set('members', form.members.filter(m => m.member_id !== memberId))
    }

    function addTodoItem() {
        if (!todoInput.trim()) return
        set('todo_items', [...form.todo_items, todoInput.trim()])
        setTodoInput('')
    }

    function removeTodoItem(i: number) {
        set('todo_items', form.todo_items.filter((_, idx) => idx !== i))
    }

    async function handleSubmit() {
        const responsable = form.members.find(m => m.role === 'Responsable')
        if (!form.title.trim() || !form.status_id) {
            setError('Titre et statut sont obligatoires.')
            return
        }
        if (!editCard && !responsable) {
            setError('Au moins un participant avec le rôle Responsable est requis.')
            return
        }
        setError(null)
        setSubmitting(true)
        try {
            if (editCard) {
                const categoryId = form.category_id || editCard.category.id
                await updateActionCard(editCard.id, {
                    title:       form.title,
                    description: form.description,
                    start_date:  form.start_date,
                    end_date:    form.end_date,
                    status_id:   form.status_id,
                    category_id: categoryId,
                    owner_id:    form.owner_id,
                })
                const status     = statuses.find(s => s.id === form.status_id)
                const category   = categories.find(c => c.id === categoryId)
                const parentCat  = category?.parent_category_id
                    ? categories.find(c => c.id === category.parent_category_id)
                    : undefined
                const owner      = members.find(m => m.id === form.owner_id)
                if (!status || !category || !owner) {
                    setError('Statut, catégorie ou responsable introuvable — veuillez vérifier les données.')
                    return
                }
                onUpdated?.({
                    ...editCard,
                    title:       form.title,
                    description: form.description || undefined,
                    start_date:  form.start_date  || undefined,
                    end_date:    form.end_date     || undefined,
                    status:      { id: status.id, label: status.label, context: status.context },
                    category: {
                        id:     category.id,
                        title:  category.title,
                        color:  category.color ?? null,
                        parent: parentCat ? { id: parentCat.id, title: parentCat.title, color: parentCat.color ?? null } : undefined,
                    },
                    owner: { id: owner.id, first_name: owner.first_name, last_name: owner.last_name, position: owner.position },
                })
            } else {
                // Si aucune catégorie choisie, utiliser/créer "Autre"
                const categoryId = form.category_id || await getOrCreateOtherCategory()
                const full = await createActionCardFull({ ...form, category_id: categoryId, owner_id: responsable!.member_id })
                onCreated({
                    id:          full.id,
                    title:       full.title,
                    description: full.description || undefined,
                    status:      full.status,
                    category: {
                        id:     full.category.id,
                        title:  full.category.title,
                        parent: full.category.parent
                            ? { id: full.category.parent.id, title: full.category.parent.title }
                            : undefined,
                    },
                    owner: {
                        id:         full.owner.id,
                        first_name: full.owner.first_name,
                        last_name:  full.owner.last_name,
                        position:   full.owner.position,
                    },
                    start_date: full.start_date || undefined,
                    end_date:   full.end_date   || undefined,
                })
            }
            setForm(EMPTY_FORM)
            onClose()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Erreur inconnue')
        } finally {
            setSubmitting(false)
        }
    }

    // Toutes les catégories : parents en tête, enfants indentés
    const parentCategories = categories.filter(c => !c.parent_category_id)


    return (
        <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
            <SheetContent side="right" showCloseButton={false} className="!w-[480px] flex flex-col gap-0 p-0">
                <SheetHeader className="px-6 py-4 border-b">
                    <SheetTitle>
                        {editCard ? editCard.title : 'Nouvelle action card'}
                    </SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-6">

                    {/* Général */}
                    <section className="flex flex-col gap-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Général</p>

                        <div className="flex flex-col gap-1.5">
                            <Label>Titre *</Label>
                            <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Titre de l'action" />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label>Description</Label>
                            <Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Description..." rows={3} />
                        </div>

                        <div className="flex gap-4">
                            <div className="flex flex-col gap-1.5 flex-1">
                                <Label>Date de début</Label>
                                <Input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-1.5 flex-1">
                                <Label>Date de fin</Label>
                                <Input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
                            </div>
                        </div>
                    </section>

                    <Separator />

                    {/* Classification */}
                    <section className="flex flex-col gap-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Classification</p>

                        <div className="flex flex-col gap-1.5">
                            <Label>Statut</Label>
                            <Select value={String(form.status_id)} onValueChange={v => set('status_id', Number(v))}>
                                <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
                                <SelectContent>
                                    {statuses.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label>Catégorie </Label>
                            <Select value={form.category_id ? String(form.category_id) : 'none'} onValueChange={v => set('category_id', v === 'none' ? 0 : Number(v))}>
                                <SelectTrigger><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Autre</SelectItem>
                                    {parentCategories.map(parent => {
                                        const children = categories.filter(c => c.parent_category_id === parent.id)
                                        return (
                                            <div key={parent.id}>
                                                <SelectItem value={String(parent.id)} className="font-medium">
                                                    {parent.title}
                                                </SelectItem>
                                                {children.map(c => (
                                                    <SelectItem key={c.id} value={String(c.id)} className="pl-6 text-muted-foreground">
                                                        {c.title}
                                                    </SelectItem>
                                                ))}
                                            </div>
                                        )
                                    })}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label>Axe</Label>
                            <Select value={form.axis_id ? String(form.axis_id) : 'none'} onValueChange={v => set('axis_id', v === 'none' ? null : Number(v))}>
                                <SelectTrigger><SelectValue placeholder="Axe (optionnel)" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Aucun</SelectItem>
                                    {axes.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </section>

                    <Separator />

                    {/* Personnes */}
                    <section className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Participants</p>
                            {!showCreateMember && (
                                <Button variant="ghost" size="sm" className="h-6 text-xs gap-1"
                                    onClick={() => setShowCreateMember(true)}>
                                    <Plus size={11} />Nouveau contact
                                </Button>
                            )}
                        </div>

                        {!showCreateMember && (
                            <div className="flex gap-2">
                                <MemberSearchInput
                                    members={members.filter(m => !form.members.some(fm => fm.member_id === m.id))}
                                    partners={partners}
                                    onSelect={m => addMemberById(m.id)}
                                />
                                <Select value={roleToAdd} onValueChange={setRoleToAdd}>
                                    <SelectTrigger className="w-36 shrink-0"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {showCreateMember && (
                            <MemberQuickCreateForm
                                partners={partners}
                                role={roleToAdd}
                                existingEmails={members.map(m => m.email)}
                                onSaved={member => {
                                    setMembers(prev => [...prev, member])
                                    set('members', [...form.members, { member_id: member.id, role: roleToAdd }])
                                    setShowCreateMember(false)
                                }}
                                onCancel={() => setShowCreateMember(false)}
                            />
                        )}

                        {form.members.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                                {form.members.map(fm => {
                                    const m = members.find(m => m.id === fm.member_id)
                                    if (!m) return null
                                    const isResponsable = fm.role === 'Responsable'
                                    return (
                                        <Popover key={fm.member_id}>
                                            <PopoverTrigger asChild>
                                                <Badge
                                                    variant={isResponsable ? 'default' : 'secondary'}
                                                    className="gap-1.5 cursor-pointer"
                                                >
                                                    {m.first_name} {m.last_name} · {fm.role}
                                                    <button onClick={e => { e.stopPropagation(); removeMember(fm.member_id) }}>
                                                        <X size={10} />
                                                    </button>
                                                </Badge>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-64 p-3 flex flex-col gap-1">
                                                <p className="text-sm font-medium">{m.first_name} {m.last_name}</p>
                                                <p className="text-xs text-muted-foreground">{m.position ?? ''}</p>
                                                <p className="text-xs text-muted-foreground">{m.email}</p>
                                            </PopoverContent>
                                        </Popover>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground italic">Aucun participant — ajoutez au moins un Responsable.</p>
                        )}
                    </section>

                    <Separator />

                    {/* Projet */}
                    <section className="flex flex-col gap-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Projet</p>

                        <div className="flex flex-col gap-1.5">
                            <Label>Lier à un projet</Label>
                            <Select value={form.project_id ? String(form.project_id) : 'none'} onValueChange={v => set('project_id', v === 'none' ? null : Number(v))}>
                                <SelectTrigger><SelectValue placeholder="Projet (optionnel)" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Aucun</SelectItem>
                                    {projects.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </section>

                    <Separator />

                    {/* To-do */}
                    <section className="flex flex-col gap-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">To-do list</p>

                        <div className="flex flex-col gap-1.5">
                            <Label>Titre de la liste</Label>
                            <Input value={form.todo_title} onChange={e => set('todo_title', e.target.value)} placeholder="ex: Préparation logistique" />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label>Tâches</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={todoInput}
                                    onChange={e => setTodoInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addTodoItem()}
                                    placeholder="Ajouter une tâche..."
                                />
                                <Button variant="outline" size="icon" onClick={addTodoItem} disabled={!todoInput.trim()}>
                                    <Plus size={14} />
                                </Button>
                            </div>
                            {form.todo_items.length > 0 && (
                                <ul className="flex flex-col gap-1 mt-1">
                                    {form.todo_items.map((item, i) => (
                                        <li key={i} className="flex items-center justify-between text-sm px-2 py-1 rounded bg-muted">
                                            <span>{item}</span>
                                            <button onClick={() => removeTodoItem(i)} className="text-muted-foreground hover:text-foreground">
                                                <X size={12} />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </section>
                </div>

                <SheetFooter className="px-6 py-4 border-t flex flex-col gap-2">
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={onClose} disabled={submitting}>
                            Annuler
                        </Button>
                        <Button onClick={handleSubmit} disabled={submitting}>
                            {submitting ? (editCard ? 'Enregistrement...' : 'Création...') : (editCard ? 'Enregistrer' : 'Créer')}
                        </Button>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}
