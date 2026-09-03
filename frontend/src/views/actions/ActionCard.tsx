import { useState, useEffect, useRef } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Field, FieldLabel } from '@/components/ui/field'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { X, Plus, Pencil, Check, Trash2, Copy, CheckIcon, ListChecks, Trash, FileDown, Users, MessageCircle, Calendar, LayoutGrid, ListTodo, Building2, ScrollText, MapPin, MessageSquare, Maximize2, Minimize2 } from 'lucide-react'
import { exportToCsv } from '@/lib/utils'
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from '@/components/ui/context-menu'
import {
    getMemberActionCardsByCard, getProjectActionCardsByCard, getToDoListsWithItemsByCard,
    getStatuses, getCategories, getMembers, getProjects, getPartners, getFinancialAgreements,
    updateActionCard, updateToDoItem, updateToDoList, addToDoItemToList, addToDoListToCard, deleteToDoList,
    addMemberToCard, removeMemberFromCard, updateMemberRole, updateParticipationStatus, addProjectToCard, removeProjectFromCard,
    getAgreementActionCardsByCard, addAgreementToCard, removeAgreementFromCard,
    deleteActionCard,
    getCommentsFull, createComment, updateComment, deleteComment,
    addMember,
} from '@/lib/api'
import type { Status, Category, Member, Partner, Project, ToDoList, ToDoItem, MemberActionCard, ProjectActionCard, AgreementActionCard, FinancialAgreement, CommentFull } from '@/lib/types'
import { useCurrentUser } from '@/lib/userContext'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import SearchInput from '@/components/SearchInput'
import MemberSearchInput from '@/components/MemberSearchInput'
import { ScrollableTabBar } from '@/components/ScrollableTabBar'

const MEMBER_STATUSES = [
    'Enseignant-chercheur', 'Chercheur', 'Ingénieur', 'Doctorant',
    'Post-doc', 'BIATSS', 'Autre',
]
import { MapContainer, TileLayer, Marker, useMap} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// --- Types exportés (utilisés par Categories, DraggableCard, etc.) ---

export type { Status as StatusData, Category as CategoryData }

export type Owner = {
    id: number
    first_name: string
    last_name: string
    position?: string
}

export type ActionCardData = {
    id: number
    title: string
    description?: string
    status: Pick<Status, 'id' | 'label' | 'context'>
    category: {
        id: number
        title: string
        color?: string | null
        parent?: { id: number; title: string; color?: string | null }
    }
    owner?: Owner
    responsables?: Owner[]
    start_date?: string
    end_date?: string
    full_address?: string
    lon?: number | null
    lat?: number | null
}

// --- Helpers ---

const STATUS_COLORS: Record<string, string> = {
    'En cours':  '#d1fae5',
    'Planifié':  '#fef9c3',
    'Terminé':   '#f3f4f6',
    'Annulé':    '#fee2e2',
    'À traiter': '#ffedd5',
}

const ROLES = ['Responsable', 'Contributeur', 'Observateur', 'Prospect', 'Participant']

function formatDate(date?: string) {
    if (!date) return null
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// --- Sous-composant : ligne d'un todo item ---

type TodoItemRowProps = {
    item: ToDoItem
    onToggle: (item: ToDoItem) => void
    onDelete: (item: ToDoItem) => void
    onDueDateChange: (item: ToDoItem, due_date: string) => void
    onContentChange: (item: ToDoItem, content: string) => void
}

function TodoItemRow({ item, onToggle, onDelete, onDueDateChange, onContentChange }: TodoItemRowProps) {
    const [editingDate,    setEditingDate]    = useState(false)
    const [editingContent, setEditingContent] = useState(false)
    const [contentDraft,   setContentDraft]   = useState('')
    const done = item.status_id === 9
    const today = new Date().toISOString().slice(0, 10)
    const isOverdue = item.due_date && !done && item.due_date < today

    function startEditingContent(e: React.MouseEvent) {
        e.preventDefault()
        setContentDraft(item.content)
        setEditingContent(true)
    }

    function commitContent() {
        const trimmed = contentDraft.trim()
        if (trimmed && trimmed !== item.content) onContentChange(item, trimmed)
        setEditingContent(false)
    }

    return (
        <li className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted group">
            <Checkbox
                checked={done}
                onCheckedChange={() => onToggle(item)}
                id={`todo-${item.id}`}
            />
            {editingContent ? (
                <input
                    autoFocus
                    value={contentDraft}
                    onChange={e => setContentDraft(e.target.value)}
                    onBlur={commitContent}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitContent() } if (e.key === 'Escape') setEditingContent(false) }}
                    className="flex-1 text-sm bg-transparent border-b border-border outline-none"
                />
            ) : (
                <label
                    htmlFor={`todo-${item.id}`}
                    onDoubleClick={startEditingContent}
                    className={`flex-1 text-sm cursor-pointer select-none ${done ? 'line-through text-muted-foreground' : ''}`}
                >
                    {item.content}
                </label>
            )}
            {item.due_date || editingDate ? (
                <input
                    type="date"
                    autoFocus={editingDate && !item.due_date}
                    value={item.due_date ?? ''}
                    onChange={e => { onDueDateChange(item, e.target.value); setEditingDate(false) }}
                    onBlur={() => setEditingDate(false)}
                    onClick={e => e.stopPropagation()}
                    className={`text-xs border-none bg-transparent outline-none w-28 cursor-pointer ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}
                />
            ) : (
                <button
                    onClick={e => { e.stopPropagation(); setEditingDate(true) }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                >
                    <Calendar size={12} />
                </button>
            )}
            <button
                onClick={() => onDelete(item)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
            >
                <X size={12} />
            </button>
        </li>
    )
}

// --- Sous-composant : section todo list ---

type TodoSectionProps = {
    list: ToDoList & { items: ToDoItem[] }
    onToggle: (listId: number, item: ToDoItem) => void
    onDeleteItem: (listId: number, item: ToDoItem) => void
    onAddItem: (listId: number, content: string, due_date?: string) => void
    onDeleteList: (listId: number) => void
    onDueDateChange: (listId: number, item: ToDoItem, due_date: string) => void
    onContentChange: (listId: number, item: ToDoItem, content: string) => void
    onTitleChange: (listId: number, title: string) => void
}

function TodoSection({ list, onToggle, onDeleteItem, onAddItem, onDeleteList, onDueDateChange, onContentChange, onTitleChange }: TodoSectionProps) {
    const [input,        setInput]        = useState('')
    const [dueDate,      setDueDate]      = useState('')
    const [editingTitle, setEditingTitle] = useState(false)
    const [titleDraft,   setTitleDraft]   = useState('')
    const done = list.items.filter(i => i.status_id === 9).length

    function commitTitle() {
        const trimmed = titleDraft.trim()
        if (trimmed && trimmed !== list.title) onTitleChange(list.id, trimmed)
        setEditingTitle(false)
    }

    function submit() {
        if (!input.trim()) return
        onAddItem(list.id, input.trim(), dueDate || undefined)
        setInput('')
        setDueDate('')
    }

    return (
        <div className="flex flex-col gap-1 group/list">
            <div className="flex items-center justify-between px-1">
                {editingTitle ? (
                    <input
                        autoFocus
                        value={titleDraft}
                        onChange={e => setTitleDraft(e.target.value)}
                        onBlur={commitTitle}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitTitle() } if (e.key === 'Escape') setEditingTitle(false) }}
                        className="text-xs font-medium bg-transparent border-b border-border outline-none flex-1 mr-2"
                    />
                ) : (
                    <span
                        className="text-xs font-medium cursor-default"
                        onDoubleClick={() => { setTitleDraft(list.title); setEditingTitle(true) }}
                    >
                        {list.title}
                    </span>
                )}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{done}/{list.items.length}</span>
                    <button
                        onClick={() => onDeleteList(list.id)}
                        className="opacity-0 group-hover/list:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>
            <ul className="flex flex-col gap-0.5">
                {list.items.slice().sort((a, b) => {
                    if (!a.due_date && !b.due_date) return 0
                    if (!a.due_date) return 1
                    if (!b.due_date) return -1
                    return a.due_date.localeCompare(b.due_date)
                }).map(item => (
                    <TodoItemRow
                        key={item.id}
                        item={item}
                        onToggle={item => onToggle(list.id, item)}
                        onDelete={item => onDeleteItem(list.id, item)}
                        onDueDateChange={(item, due_date) => onDueDateChange(list.id, item, due_date)}
                        onContentChange={(item, content) => onContentChange(list.id, item, content)}
                    />
                ))}
            </ul>
            <div className="flex gap-2 mt-1">
                <Input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submit()}
                    placeholder="Nouvelle tâche..."
                    className="h-7 text-xs flex-1"
                />
                <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="h-7 text-xs border border-input rounded-md px-2 bg-background text-muted-foreground w-32"
                />
                <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={submit} disabled={!input.trim()}>
                    <Plus size={12} />
                </Button>
            </div>
        </div>
    )
}

// --- Composant recherche membre avec suggestions ---

// --- Composant recherche convention avec suggestions ---

type AgreementSearchInputProps = {
    agreements: FinancialAgreement[]
    partners:   Partner[]
    projects:   Project[]
    onSelect:   (agreement: FinancialAgreement) => void
}

function AgreementSearchInput({ agreements, partners, projects, onSelect }: AgreementSearchInputProps) {
    const [query, setQuery] = useState('')
    const [open, setOpen]   = useState(false)

    const partnerMap = new Map(partners.map(p => [p.id, p]))
    const projectMap = new Map(projects.map(p => [p.id, p]))

    const filtered = query.trim().length === 0 ? agreements : agreements.filter(a => {
        const partnerName = partnerMap.get(a.partner_id)?.name.toLowerCase() ?? ''
        const projectTitle = projectMap.get(a.project_id)?.title.toLowerCase() ?? ''
        return (
            a.title.toLowerCase().includes(query.toLowerCase()) ||
            partnerName.includes(query.toLowerCase()) ||
            projectTitle.includes(query.toLowerCase())
        )
    })

    function select(a: FinancialAgreement) {
        onSelect(a)
        setQuery('')
        setOpen(false)
    }

    return (
        <div className="relative">
            <Input
                value={query}
                onChange={e => { setQuery(e.target.value); setOpen(true) }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                placeholder="Rechercher une convention..."
                className="h-8 text-xs"
            />
            {open && filtered.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md overflow-hidden">
                    <ul className="max-h-56 overflow-y-auto py-1">
                        {filtered.map(a => {
                            const partner = partnerMap.get(a.partner_id)
                            const project = projectMap.get(a.project_id)
                            return (
                                <li
                                    key={a.id}
                                    onMouseDown={() => select(a)}
                                    className="flex flex-col gap-0.5 px-3 py-2 cursor-pointer hover:bg-muted"
                                >
                                    <span className="text-sm font-medium">{a.title}</span>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {project && (
                                            <span className="text-xs text-muted-foreground">{project.title}</span>
                                        )}
                                        {partner && (
                                            <span
                                                className="text-xs px-1.5 py-0.5 rounded-full border border-border"
                                                style={partner.color ? { backgroundColor: partner.color } : {}}
                                            >
                                                {partner.name}
                                            </span>
                                        )}
                                        {a.signed_date && (
                                            <span className="text-xs text-muted-foreground">signé le {formatDate(a.signed_date)}</span>
                                        )}
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            )}
        </div>
    )
}

// --- Comment Card ---

function CommentCard({ comment, onComment, onDelete, onEdit, isOwner }: {
    comment: CommentFull
    onComment: () => void
    onDelete: () => void
    onEdit: () => void
    isOwner: boolean
}) {
    return (
        <Card className="w-full mt-2 group">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                            <AvatarImage src={comment.owner.profile_image} />
                            <AvatarFallback className="text-xs">
                                {comment.owner.first_name[0]}{comment.owner.last_name[0]}
                            </AvatarFallback>
                        </Avatar>
                        {comment.owner.first_name} {comment.owner.last_name}
                    </div>
                    

                    <div className='opacity-0 group-hover:opacity-100 transition-opacity'>
                         <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-text-foreground" onClick={onComment}>
                            <MessageCircle size={14} />
                        </Button>
                        {isOwner && (
                            <>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onEdit}>
                                <Pencil size={14} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onDelete}>
                                <Trash2 size={14} />
                            </Button>
                            </>
                        )}
                        
                       
                    </div>
                </CardTitle>
                <CardDescription className="text-xs">
                    {new Date(comment.timestamp).toLocaleString('fr-FR')}
                </CardDescription>
            </CardHeader>
            <CardContent className="pb-0">
                <p className="text-sm">{comment.content}</p>
            </CardContent>
        </Card>
    )
}

// --- Sheet de détail / édition ---

type DetailSheetProps = {
    card: ActionCardData
    open: boolean
    onClose: () => void
    onUpdated: (patch: Partial<ActionCardData>) => void
    onDeleted?: (id: number) => void
}

// --- Formulaire création rapide membre (dans le sheet détail) ---

function MemberQuickCreateForm({ partners, role, onSaved, onCancel }: {
    partners: Partner[]
    role: string
    onSaved: (member: Member) => void
    onCancel: () => void
}) {
    const [firstName,  setFirstName]  = useState('')
    const [lastName,   setLastName]   = useState('')
    const [email,      setEmail]      = useState('')
    const [position,   setPosition]   = useState('')
    const [statusVal,  setStatusVal]  = useState(MEMBER_STATUSES[0])
    const [partnerId,  setPartnerId]  = useState<number>(partners[0]?.id ?? 0)
    const [submitting, setSubmitting] = useState(false)

    async function handleSubmit() {
        if (!firstName.trim() || !lastName.trim()) return
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
            <div className="flex gap-2">
                <Input value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="Email" className="h-8 text-xs flex-1" type="email" />
                <Input value={position} onChange={e => setPosition(e.target.value)}
                    placeholder="Fonction" className="h-8 text-xs flex-1" />
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

 type GeoFeature = {
        id: string
        properties: { label: string }
        geometry: { coordinates: [number, number] }
    }

type MapProps = {
    lon: number
    lat: number
}

function MapUpdater({ coords }: { coords: MapProps }) {
    const map = useMap()
    useEffect(() => {
        map.setView([coords.lat, coords.lon], 14)
    }, [coords.lat, coords.lon])
    return null
}

export function MiniMap({ coords }: { coords: MapProps }) {
    return (
        <MapContainer
            center={[coords.lat, coords.lon]}
            zoom={14}
            style={{ height: '200px', width: '100%' }}
            scrollWheelZoom={false}
            dragging={false}
            className='rounded-md'
        >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={[coords.lat, coords.lon]} />
            <MapUpdater coords={coords} />
        </MapContainer>
    )
}

const AddressAutocomplete = ({ location, setLocation, setCoords, onSelect } : { location: string, setLocation: (value: string) => void, setCoords: (value: MapProps | null) => void, onSelect: (fullAddress: string, lat: number, lon: number) => void}) => {
  
  
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeoFeature[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);


  // Gestion du clic en dehors pour fermer la liste
  useEffect(() => {
    function handleClickOutside(event: Event) {
        if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
            setShowSuggestions(false)
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  // Appel API avec debounce (attente de 300ms après la frappe)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.length > 2) {
        fetch(`https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(query)}&limit=5`)
          .then(res => res.json())
          .then(data => {
            setSuggestions(data.features || []);
            setShowSuggestions(true);
          })
          .catch(err => console.error("Erreur API BAN:", err));
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleSelect = (feature : GeoFeature) => {
    const [lon, lat] = feature.geometry.coordinates;
    const fullAddress = feature.properties.label;
    setQuery(fullAddress);
    setLocation(fullAddress); // Met à jour l'état parent
    setCoords({lon:lon, lat:lat});
    setShowSuggestions(false);
    onSelect(fullAddress, lat, lon)
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <Field>
        <FieldLabel htmlFor="input-field-address">Adresse</FieldLabel>
        <Input
          id="input-field-address"
          type="text"
          value={query || location}
          placeholder="Rechercher une adresse"
          onChange={(e) => {
            setQuery(e.target.value);
            setLocation(e.target.value);
          }}
          onFocus={() => query.length > 2 && setShowSuggestions(true)}
        />
      </Field>

      {/* Liste des suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 99999,
          backgroundColor: 'white',
          border: '1px solid #ddd',
          maxHeight: '200px',
          overflowY: 'auto',
          listStyle: 'none',
          padding: 0,
          margin: 0
        }}>
          {suggestions.map((feature) => (
            <li
              key={feature.id}
              onClick={() => handleSelect(feature)}
              style={{
                padding: '10px',
                cursor: 'pointer',
                borderBottom: '1px solid #eee',
                fontSize: '0.9rem'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              {feature.properties.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

type MemberLink    = MemberActionCard    & { member: Member }
type ProjectLink   = ProjectActionCard   & { project: Project }
type AgreementLink = AgreementActionCard & { agreement: FinancialAgreement }

type acDetailViewMode = 'overview' | 'todos' | 'participants' | 'projects' | 'agreements' | 'location' | 'comments'

function SortableTabAC({ mode, label, icon, isActive, isEmpty, onActivate, onRemove }: {
    mode: acDetailViewMode
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
            className={`relative flex items-center gap-1.5 px-3 py-2 text-sm z-10 transition-colors duration-300 text-xs whitespace-nowrap cursor-pointer active:cursor-grabbing ${isActive ? 'font-semibold' : 'text-black'}`}
        >
            <span className="relative z-20 flex items-center gap-1.5">
                {icon}{label}
                {isEmpty && (
                    <span role="button" onClick={e => { e.stopPropagation(); onRemove() }} className="ml-0.5 text-muted-foreground hover:text-foreground transition-colors leading-none">
                        <X size={10} />
                    </span>
                )}
            </span>
            {isActive && (
                <motion.div layoutId="activeACTab" className="absolute inset-0 border-b-2 border-black z-10" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />
            )}
        </button>
    )
}

export function ActionCardDetailSheet({ card, open, onClose, onUpdated, onDeleted }: DetailSheetProps) {
    const [loading, setLoading] = useState(true)
    const [expanded, setExpanded] = useState(false)

    // Données associées
    const [memberLinks,    setMemberLinks]    = useState<MemberLink[]>([])
    const [projectLinks,   setProjectLinks]   = useState<ProjectLink[]>([])
    const [agreementLinks, setAgreementLinks] = useState<AgreementLink[]>([])
    const [todoLists, setTodoLists] = useState<(ToDoList & { items: ToDoItem[] })[]>([])

    // Données de référence pour les selects
    const [allStatuses,         setAllStatuses]         = useState<Status[]>([])
    const [participationStatuses, setParticipationStatuses] = useState<Status[]>([])
    const [allCategories, setAllCategories] = useState<Category[]>([])
    const [allMembers,    setAllMembers]    = useState<Member[]>([])
    const [allPartners,   setAllPartners]   = useState<Partner[]>([])
    const [allProjects,   setAllProjects]   = useState<Project[]>([])
    const [allAgreements, setAllAgreements] = useState<FinancialAgreement[]>([])

    // Edits en cours
    const [editing, setEditing] = useState(false)
    const [draft, setDraft]     = useState<ActionCardData>(card)

    // Suppression
    const [confirming, setConfirming] = useState(false)
    const [deleting,   setDeleting]   = useState(false)


    // Ajout membres
    const [roleToAdd, setRoleToAdd] = useState(ROLES[1])
    const [selectedLinks, setSelectedLinks] = useState<MemberLink[]>([])
    const [copiedEmails, setCopiedEmails] = useState(false)

    // Ajout projet
    const [projectToAdd, setProjectToAdd] = useState('')

    // Ajout to-do list
    const [newListTitle, setNewListTitle] = useState('')
    const [showNewList, setShowNewList]   = useState(false)

    // Ajout Adress 
    const [location, setLocation] = useState('')
    const [coords, setCoords] = useState<MapProps | null>(null)

    // Togglers des section
    const [showCreateMember, setShowCreateMember] = useState(false)


    // Commentaires
    const currentUser = useCurrentUser()
    const [comments,        setComments]        = useState<CommentFull[]>([])
    const [newComment,      setNewComment]       = useState('')
    const [replyingTo,      setReplyingTo]       = useState<number | null>(null)
    const [replyContent,    setReplyContent]     = useState('')
    const [editingComment,  setEditingComment]   = useState<number | null>(null)
    const [editContent,     setEditContent]      = useState('')
    const [submittingComment, setSubmittingComment] = useState(false)

    async function handleAddComment() {
        if (!newComment.trim() || !currentUser) return
        setSubmittingComment(true)
        const created = await createComment({
            owner_id: currentUser.id,
            action_card_id: card.id,
            content: newComment.trim(),
            timestamp: new Date().toISOString(),
        })
        const newFull: CommentFull = { ...created, owner: currentUser, replies: [] }
        setComments(prev => [newFull, ...prev])
        setNewComment('')
        setSubmittingComment(false)
    }

    async function handleReply(parentId: number) {
        if (!replyContent.trim() || !currentUser) return
        setSubmittingComment(true)
        const created = await createComment({
            owner_id: currentUser.id,
            action_card_id: card.id,
            parent_comment_id: parentId,
            content: replyContent.trim(),
            timestamp: new Date().toISOString(),
        })
        const newReply: CommentFull = { ...created, owner: currentUser, replies: [] }
        setComments(prev => prev.map(c =>
            c.id === parentId ? { ...c, replies: [...(c.replies ?? []), newReply] } : c
        ))
        setReplyingTo(null)
        setReplyContent('')
        setSubmittingComment(false)
    }

    async function handleEditComment(id: number) {
        if (!editContent.trim()) return
        await updateComment(id, { content: editContent.trim() })
        setComments(prev => prev.map(c => {
            if (c.id === id) return { ...c, content: editContent.trim() }
            return { ...c, replies: c.replies?.map(r => r.id === id ? { ...r, content: editContent.trim() } : r) }
        }))
        setEditingComment(null)
        setEditContent('')
    }

    async function handleDeleteComment(id: number) {
        await deleteComment(id)
        setComments(prev =>
            prev.filter(c => c.id !== id)
                .map(c => ({ ...c, replies: c.replies?.filter(r => r.id !== id) }))
        )
    }

    const [showLocation, setshowLocation] = useState(false)

    // --- Tab navigation ---
    const ALL_AC_OPTIONAL_TABS: { mode: acDetailViewMode; label: string; icon: React.ReactNode }[] = [
        { mode: 'todos',        label: 'Tâches',       icon: <ListTodo size={13} /> },
        { mode: 'participants', label: 'Membres',  icon: <Users size={13} /> },
        { mode: 'projects',     label: 'Projets',      icon: <Building2 size={13} /> },
        { mode: 'agreements',   label: 'Conventions',  icon: <ScrollText size={13} /> },
        { mode: 'location',     label: 'Localisation', icon: <MapPin size={13} /> },
        { mode: 'comments',     label: 'Commentaires', icon: <MessageSquare size={13} /> },
    ]

    const [acTab, setAcTab] = useState<acDetailViewMode>('overview')
    const [activeACTabs, setActiveACTabs] = useState<acDetailViewMode[]>([])

    function addACTab(mode: acDetailViewMode) {
        setActiveACTabs(prev => prev.includes(mode) ? prev : [...prev, mode])
    }
    function removeACTab(mode: acDetailViewMode) {
        setActiveACTabs(prev => prev.filter(m => m !== mode))
        if (acTab === mode) setAcTab('overview')
    }

    const acTabSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
    function handleACTabDragEnd(event: DragEndEvent) {
        const { active, over } = event
        if (!over || active.id === over.id) return
        setActiveACTabs(prev => {
            const oldIndex = prev.indexOf(active.id as acDetailViewMode)
            const newIndex = prev.indexOf(over.id as acDetailViewMode)
            return arrayMove(prev, oldIndex, newIndex)
        })
    }

    useEffect(() => {
        try {
            localStorage.setItem(`tabs_actioncard_${card.id}`, JSON.stringify(activeACTabs))
        } catch {
            // localStorage can be unavailable (e.g. browser privacy settings)
        }
    }, [activeACTabs, card.id])

    useEffect(() => {
        if (!open) return
        setDraft(card)
        setEditing(false)
        setConfirming(false)
        setLoading(true)
        Promise.all([
            getMemberActionCardsByCard(card.id),
            getProjectActionCardsByCard(card.id),
            getAgreementActionCardsByCard(card.id),
            getToDoListsWithItemsByCard(card.id),
            getStatuses(),
            getCategories(),
            getMembers(),
            getPartners(),
            getProjects(),
            getFinancialAgreements(),
            getCommentsFull(card.id),
        ]).then(([ml, pl, al, tl, s, c, m, pt, p, agr, comments]) => {
            setMemberLinks(ml as MemberLink[])
            setProjectLinks(pl as ProjectLink[])
            setAgreementLinks(al as AgreementLink[])
            setTodoLists(tl)
            setAllStatuses(s.filter(st => st.context === 'action_card'))
            setParticipationStatuses(s.filter(st => st.context === 'participation'))
            setAllCategories(c)
            setAllMembers(m)
            setAllPartners(pt)
            setAllProjects(p)
            setAllAgreements(agr)
            setComments(comments)
            setLocation(card.full_address ?? '')
            setCoords(
                card.lat != null && card.lon != null
                    ? { lat: card.lat, lon: card.lon }
                    : null
            )
            setshowLocation(!!card.full_address)
            // Tab navigation auto-show
            let stored: acDetailViewMode[] = []
            try {
                stored = JSON.parse(localStorage.getItem(`tabs_actioncard_${card.id}`) ?? '[]') as acDetailViewMode[]
            } catch {
                // localStorage can be unavailable (e.g. browser privacy settings)
            }
            const autoShow: acDetailViewMode[] = []
            if (tl.length > 0) autoShow.push('todos')
            if (ml.length > 0) autoShow.push('participants')
            if (pl.length > 0) autoShow.push('projects')
            if (al.length > 0) autoShow.push('agreements')
            if (card.full_address) autoShow.push('location')
            if ((comments as CommentFull[]).length > 0) autoShow.push('comments')
            setActiveACTabs([...new Set([...stored, ...autoShow])])
        }).catch(err => console.error('[ActionCard] Promise.all failed:', err))
        .finally(() => setLoading(false))
    }, [open, card.id])

    function setDraftField<K extends keyof ActionCardData>(key: K, value: ActionCardData[K]) {
        setDraft(prev => ({ ...prev, [key]: value }))
    }

    async function saveEdit() {
        const patch: Parameters<typeof updateActionCard>[1] = {
            title:       draft.title,
            description: draft.description ?? '',
            start_date:  draft.start_date ?? '',
            end_date:    draft.end_date ?? '',
            status_id:   draft.status.id,
            category_id: draft.category.id,
            full_address: draft.full_address ?? '',
            lon: draft.lon ?? 0,  
            lat: draft.lat ?? 0,  
        }
        await updateActionCard(card.id, patch)

        // Reconstruire les champs enrichis pour onUpdated
        const newStatus = allStatuses.find(s => s.id === draft.status.id) ?? draft.status
        const rawCat    = allCategories.find(c => c.id === draft.category.id)
        const parentCat = rawCat?.parent_category_id
            ? allCategories.find(c => c.id === rawCat.parent_category_id)
            : undefined
        const newCategory = rawCat
            ? { id: rawCat.id, title: rawCat.title, parent: parentCat ? { id: parentCat.id, title: parentCat.title } : undefined }
            : draft.category

        onUpdated({ ...draft, status: newStatus, category: newCategory })
        setEditing(false)
    }

    function cancelEdit() {
        setDraft(card)
        setEditing(false)
    }

    // --- Todos ---

    function toggleTodo(listId: number, item: ToDoItem) {
        const newStatusId = item.status_id === 9 ? 8 : 9
        updateToDoItem(item.id, { status_id: newStatusId })
        setTodoLists(prev => prev.map(l =>
            l.id !== listId ? l : {
                ...l,
                items: l.items.map(i => i.id === item.id ? { ...i, status_id: newStatusId } : i),
            }
        ))
    }

    function deleteTodoItem(listId: number, item: ToDoItem) {
        updateToDoItem(item.id, { status_id: item.status_id })
        setTodoLists(prev => prev.map(l =>
            l.id !== listId ? l : { ...l, items: l.items.filter(i => i.id !== item.id) }
        ))
    }

    function updateDueDate(listId: number, item: ToDoItem, due_date: string) {
        updateToDoItem(item.id, { due_date })
        setTodoLists(prev => prev.map(l =>
            l.id !== listId ? l : { ...l, items: l.items.map(i => i.id === item.id ? { ...i, due_date } : i) }
        ))
    }

    function updateTodoContent(listId: number, item: ToDoItem, content: string) {
        updateToDoItem(item.id, { content })
        setTodoLists(prev => prev.map(l =>
            l.id !== listId ? l : { ...l, items: l.items.map(i => i.id === item.id ? { ...i, content } : i) }
        ))
    }

    function updateListTitle(listId: number, title: string) {
        updateToDoList(listId, title)
        setTodoLists(prev => prev.map(l => l.id !== listId ? l : { ...l, title }))
    }

    async function addTodoItem(listId: number, content: string, due_date?: string) {
        const newItem = await addToDoItemToList(listId, content, due_date)
        setTodoLists(prev => prev.map(l =>
            l.id !== listId ? l : { ...l, items: [...l.items, newItem] }
        ))
    }

    async function deleteList(listId: number) {
        await deleteToDoList(listId)
        setTodoLists(prev => prev.filter(l => l.id !== listId))
    }

    async function addList() {
        if (!newListTitle.trim()) return
        const newList = await addToDoListToCard(card.id, newListTitle.trim())
        setTodoLists(prev => [...prev, newList])
        setNewListTitle('')
        setShowNewList(false)
    }

    // --- Membres ---

    async function handleAddMemberById(memberId: number) {
        if (!memberId) return
        const link = await addMemberToCard(card.id, memberId, roleToAdd)
        setMemberLinks(prev => [...prev, link as MemberLink])
    }

    async function handleRemoveMember(linkId: number) {
        await removeMemberFromCard(linkId)
        setMemberLinks(prev => prev.filter(l => l.id !== linkId))
    }

    async function handleRoleChange(linkId: number, role: string) {
        await updateMemberRole(linkId, role)
        setMemberLinks(prev => prev.map(l => l.id === linkId ? { ...l, role } : l))
    }

    async function handleParticipationStatusChange(linkId: number, statusId: number | null) {
        await updateParticipationStatus(linkId, statusId)
        setMemberLinks(prev => prev.map(l => l.id === linkId ? { ...l, participation_status_id: statusId ?? undefined } : l))
    }

    function toggleSelectLink(l: MemberLink) {
        setSelectedLinks(prev => prev.some(s => s.id === l.id) ? prev.filter(s => s.id !== l.id) : [...prev, l])
    }

    function toggleSelectAllLinks() {
        setSelectedLinks(prev => prev.length === memberLinks.length ? [] : [...memberLinks])
    }

    async function handleRemoveSelected() {
        await Promise.all(selectedLinks.map(l => removeMemberFromCard(l.id)))
        setMemberLinks(prev => prev.filter(l => !selectedLinks.some(s => s.id === l.id)))
        setSelectedLinks([])
    }

    function copyMemberEmails() {
        const emails = selectedLinks.map(l => l.member.email).filter(e => !!e).join(', ')
        navigator.clipboard.writeText(emails)
        setCopiedEmails(true)
        setTimeout(() => setCopiedEmails(false), 2000)
    }

    function exportMembersCsv() {
        const headers = ['Prénom', 'Nom', 'Rôle', 'Email', 'Téléphone', 'Partenaire']
        const rows = selectedLinks.map(l => {
            const partner = allPartners.find(p => p.id === l.member.partner_id)
            return [l.member.first_name, l.member.last_name, l.role, l.member.email ?? '', l.member.tel ?? '', partner?.name ?? '']
        })
        exportToCsv(`participants_${card.title}.csv`, headers, rows)
    }

    // --- Projets ---

    async function handleAddProject() {
        const id = Number(projectToAdd)
        if (!id) return
        const link = await addProjectToCard(card.id, id)
        setProjectLinks(prev => [...prev, link as ProjectLink])
        setProjectToAdd('')
    }

    async function handleRemoveProject(linkId: number) {
        await removeProjectFromCard(linkId)
        setProjectLinks(prev => prev.filter(l => l.id !== linkId))
    }

    // --- Conventions ---

    async function handleAddAgreement(agreement: FinancialAgreement) {
        const link = await addAgreementToCard(card.id, agreement.id)
        setAgreementLinks(prev => [...prev, link as AgreementLink])
    }

    async function handleRemoveAgreement(linkId: number) {
        await removeAgreementFromCard(linkId)
        setAgreementLinks(prev => prev.filter(l => l.id !== linkId))
    }

    const statusColor = STATUS_COLORS[draft.status.label] ?? '#f3f4f6'

    const parentCategories = allCategories.filter(c => !c.parent_category_id)

    // Membres, projets et conventions non encore liés
    const linkedMemberIds     = memberLinks.map(l => l.member_id)
    const linkedProjectIds    = projectLinks.map(l => l.project_id)
    const linkedAgreementIds  = agreementLinks.map(l => l.financial_agreement_id)
    const availableMembers    = allMembers.filter(m => !linkedMemberIds.includes(m.id))
    const availableProjects   = allProjects.filter(p => !linkedProjectIds.includes(p.id))
    // Si des projets sont liés → on filtre les conventions à ces projets uniquement
    const availableAgreements = allAgreements
        .filter(a => !linkedAgreementIds.includes(a.id))
        .filter(a => linkedProjectIds.length === 0 || linkedProjectIds.includes(a.project_id))

    // Maps pour l'enrichissement dans les popovers
    const partnerMap = new Map(allPartners.map(p => [p.id, p]))
    const projectMap = new Map(allProjects.map(p => [p.id, p]))

    async function handleDelete() {
        setDeleting(true)
        try {
            await deleteActionCard(card.id)
            onDeleted?.(card.id)
            onClose()
        } finally {
            setDeleting(false)
            setConfirming(false)
        }
    }



    return (
        <Sheet open={open} onOpenChange={v => { if (!v) { setConfirming(false); onClose() } }}>
            <SheetContent side="right" showCloseButton={false} className={`${expanded ? '!w-screen !max-w-none' : '!w-[580px]'} flex flex-col gap-0 p-0 transition-all duration-300`}>
                <SheetHeader className="px-6 py-4 border-b flex flex-row items-center justify-between">
                    <SheetTitle className="flex-1 min-w-0 text-base truncate">
                        {editing ? (
                            <Input
                                value={draft.title}
                                onChange={e => setDraftField('title', e.target.value)}
                                className="w-full h-8 text-sm font-semibold"
                            />
                        ) : draft.title}
                    </SheetTitle>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button className="rounded-md" size="sm" variant="ghost" onClick={() => setExpanded(e => !e)}>
                            {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                        </Button>
                        {confirming ? (
                            <>
                                <span className="text-xs text-destructive">Supprimer ?</span>
                                <Button className="rounded-md h-7" size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>
                                    {deleting ? '...' : 'Confirmer'}
                                </Button>
                                <Button className="rounded-md h-7" size="sm" variant="ghost" onClick={() => setConfirming(false)}>Annuler</Button>
                            </>
                        ) : editing ? (
                            <>
                                <Button className="rounded-md" size="sm" variant="outline" onClick={cancelEdit}>Annuler</Button>
                                <Button className="rounded-md" size="sm" onClick={saveEdit}><Check size={13} className="mr-1" />Enregistrer</Button>
                            </>
                        ) : (
                            <>
                                <Button className="rounded-md" size="sm" variant="outline" onClick={() => setEditing(true)}>
                                    <Pencil size={13} className="mr-2" />Modifier
                                </Button>
                                <Button className="rounded-md" size="sm" variant="ghost" onClick={() => setConfirming(true)}>
                                    <Trash2 size={13} className="text-destructive" />
                                </Button>
                            </>
                        )}
                    </div>
                </SheetHeader>

                {/* Tab nav */}
                <div className="px-4 pt-3 shrink-0 border-b">
                    <ScrollableTabBar>
                        {/* Général — fixe */}
                        <button
                            onClick={() => setAcTab('overview')}
                            className={`relative flex items-center gap-1.5 px-3 py-2 text-sm z-10 transition-colors text-xs whitespace-nowrap cursor-pointer ${acTab === 'overview' ? 'font-semibold' : 'text-black'}`}
                        >
                            <span className="relative z-20 flex items-center gap-1.5"><LayoutGrid size={13} />Général</span>
                            {acTab === 'overview' && <motion.div layoutId="activeACTab" className="absolute inset-0 border-b-2 border-black z-10" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
                        </button>

                        {/* Onglets optionnels actifs */}
                        <DndContext sensors={acTabSensors} collisionDetection={closestCenter} onDragEnd={handleACTabDragEnd} modifiers={[restrictToHorizontalAxis]}>
                            <SortableContext items={activeACTabs} strategy={horizontalListSortingStrategy}>
                                {ALL_AC_OPTIONAL_TABS.filter(t => activeACTabs.includes(t.mode))
                                    .sort((a, b) => activeACTabs.indexOf(a.mode) - activeACTabs.indexOf(b.mode))
                                    .map(({ mode, label, icon }) => {
                                        const isEmpty =
                                            (mode === 'todos'        && todoLists.length === 0)    ||
                                            (mode === 'participants' && memberLinks.length === 0)   ||
                                            (mode === 'projects'     && projectLinks.length === 0)  ||
                                            (mode === 'agreements'   && agreementLinks.length === 0)||
                                            (mode === 'location'     && !showLocation)              ||
                                            (mode === 'comments'     && comments.length === 0)
                                        return (
                                            <SortableTabAC
                                                key={mode}
                                                mode={mode}
                                                label={label}
                                                icon={icon}
                                                isActive={acTab === mode}
                                                isEmpty={isEmpty}
                                                onActivate={() => setAcTab(mode)}
                                                onRemove={() => removeACTab(mode)}
                                            />
                                        )
                                    })}
                            </SortableContext>
                        </DndContext>

                        {/* Bouton + */}
                        {ALL_AC_OPTIONAL_TABS.filter(t => !activeACTabs.includes(t.mode)).length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors whitespace-nowrap shrink-0 ml-1">
                                        <Plus size={12} />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="text-xs">
                                    {ALL_AC_OPTIONAL_TABS.filter(t => !activeACTabs.includes(t.mode)).map(({ mode, label, icon }) => (
                                        <DropdownMenuItem key={mode} onClick={() => { addACTab(mode); setAcTab(mode) }} className="flex items-center gap-2 text-xs">
                                            {icon}{label}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </ScrollableTabBar>
                </div>

                {loading ? (
                    <div className="flex flex-col gap-3 p-6">
                        {[1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">

                        {acTab === 'overview' && (<>
                        {/* Statut + catégorie */}
                        <div className="flex flex-wrap items-center gap-2 rounded-xl">
                            <Badge variant="secondary" className="rounded-xl" style={{ backgroundColor: statusColor }}>
                                {draft.status.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                                {draft.category.parent ? `${draft.category.parent.title} › ${draft.category.title}` : draft.category.title}
                            </span>
                        </div>

                        {/* Champs éditables */}
                        {editing ? (
                            
                            <section className="flex flex-col gap-3">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Général</p>

                                <div className="flex flex-col gap-1.5">
                                    <Label>Description</Label>
                                    <Textarea
                                        value={draft.description ?? ''}
                                        onChange={e => setDraftField('description', e.target.value)}
                                        rows={3}
                                    />
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex flex-col gap-1.5 flex-1">
                                        <Label>Date de début</Label>
                                        <Input type="date" value={draft.start_date ?? ''} onChange={e => setDraftField('start_date', e.target.value)} />
                                    </div>
                                    <div className="flex flex-col gap-1.5 flex-1">
                                        <Label>Date de fin</Label>
                                        <Input type="date" value={draft.end_date ?? ''} onChange={e => setDraftField('end_date', e.target.value)} />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <Label>Statut</Label>
                                    <Select
                                        value={String(draft.status.id)}
                                        onValueChange={v => {
                                            const s = allStatuses.find(s => s.id === Number(v))
                                            if (s) setDraftField('status', s)
                                        }}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {allStatuses.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <Label>Catégorie</Label>
                                    <Select
                                        value={String(draft.category.id)}
                                        onValueChange={v => {
                                            const raw = allCategories.find(c => c.id === Number(v))
                                            if (!raw) return
                                            const parent = raw.parent_category_id
                                                ? allCategories.find(c => c.id === raw.parent_category_id)
                                                : undefined
                                            setDraftField('category', {
                                                id: raw.id,
                                                title: raw.title,
                                                parent: parent ? { id: parent.id, title: parent.title } : undefined,
                                            })
                                        }}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {parentCategories.map(parent => {
                                                const children = allCategories.filter(c => c.parent_category_id === parent.id)
                                                return (
                                                    <div key={parent.id}>
                                                        <SelectItem value={String(parent.id)} className="font-medium">{parent.title}</SelectItem>
                                                        {children.map(c => (
                                                            <SelectItem key={c.id} value={String(c.id)} className="pl-6 text-muted-foreground">{c.title}</SelectItem>
                                                        ))}
                                                    </div>
                                                )
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </section>
                       
                        ) : (
                             /* Vue lecture */
                           
                            <section className="flex flex-col gap-2 text-sm">
                                {card.description && (
                                    <p className="text-muted-foreground leading-relaxed">{card.description}</p>
                                )}
                                {(card.start_date || card.end_date) && (
                                    <p className="text-xs text-muted-foreground">
                                        {card.start_date && <span>Début : {formatDate(card.start_date)}</span>}
                                        {card.start_date && card.end_date && <span className="mx-2">·</span>}
                                        {card.end_date   && <span>Fin : {formatDate(card.end_date)}</span>}
                                    </p>
                                )}
                                {card.owner && (
                                    
                                    <p className="text-xs text-muted-foreground">
                                        Responsable : <span className="font-medium text-foreground">{card.owner.first_name} {card.owner.last_name}</span>
                                        {card.owner.position ? ` — ${card.owner.position}` : ''}
                                    </p>
                                )}
                            </section>
                            
                        )}

                        </>)}

                        {/* To-do lists */}
                        {acTab === 'todos' && (
                            <section className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tâches</p>
                                    <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setShowNewList(v => !v)}>
                                        <Plus size={11} />Nouvelle liste
                                    </Button>
                                </div>

                                {showNewList && (
                                    <div className="flex gap-2">
                                        <Input
                                            value={newListTitle}
                                            onChange={e => setNewListTitle(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && addList()}
                                            placeholder="Titre de la liste..."
                                            className="h-8 text-xs"
                                        />
                                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={addList} disabled={!newListTitle.trim()}>
                                            <Plus size={12} />
                                        </Button>
                                    </div>
                                )}

                                {todoLists.length > 0 ? (
                                    <div className="flex flex-col gap-5">
                                        {todoLists.map(list => (
                                            <TodoSection
                                                key={list.id}
                                                list={list}
                                                onToggle={toggleTodo}
                                                onDeleteItem={deleteTodoItem}
                                                onAddItem={addTodoItem}
                                                onDeleteList={deleteList}
                                                onDueDateChange={updateDueDate}
                                                onContentChange={updateTodoContent}
                                                onTitleChange={updateListTitle}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    !showNewList && (
                                        <p className="text-xs text-muted-foreground italic">Aucune liste de tâches</p>
                                    )
                                )}
                            </section>
                        )}
                        

                        {/* Participants */}
                        {acTab === 'participants' && (
                            <section className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Membres</p>
                                    <div className="flex items-center gap-1">
                                        {selectedLinks.length > 0 && (
                                            <>
                                                <span className="text-xs text-muted-foreground mr-1">{selectedLinks.length} sélectionné{selectedLinks.length > 1 ? 's' : ''}</span>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="outline" className="rounded-md" size="sm" onClick={copyMemberEmails}>
                                                            {copiedEmails ? <CheckIcon size={13} /> : <Copy size={13} />}
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>Copier email{selectedLinks.length > 1 ? 's' : ''}</p></TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="outline" className="rounded-md" size="sm" onClick={exportMembersCsv}>
                                                            <FileDown size={13} />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>Exporter en CSV</p></TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="outline" className="rounded-md" size="sm" onClick={handleRemoveSelected}>
                                                            <Trash size={13} />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>Retirer</p></TooltipContent>
                                                </Tooltip>
                                            </>
                                        )}
                                        {!showCreateMember && (
                                            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1"
                                                onClick={() => setShowCreateMember(true)}>
                                                <Plus size={11} />Nouveau contact
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {memberLinks.length > 0 && (
                                    <div>
                                        <Table className="text-xs">
                                            {(() => {
                                                const hasParticipants = memberLinks.some(l => l.role === 'Participant')
                                                return (
                                            <TableHeader>
                                                <TableRow className="hover:bg-transparent">
                                                    <TableHead className="h-7 w-6 px-2">
                                                        <Checkbox
                                                            checked={selectedLinks.length > 0 && selectedLinks.length < memberLinks.length ? 'indeterminate' : selectedLinks.length === memberLinks.length && memberLinks.length > 0}
                                                            onCheckedChange={toggleSelectAllLinks}
                                                            className="h-3.5 w-3.5"
                                                        />
                                                    </TableHead>
                                                    <TableHead className="h-7 px-2 text-xs font-normal text-muted-foreground">Nom</TableHead>
                                                    <TableHead className="h-7 px-2 text-xs font-normal text-muted-foreground">Rôle</TableHead>
                                                    {hasParticipants && <TableHead className="h-7 px-2 text-xs font-normal text-muted-foreground">Participation</TableHead>}
                                                    <TableHead className="h-7 px-2 text-xs font-normal text-muted-foreground">Partenaire</TableHead>
                                                    <TableHead className="h-7 w-6 px-2" />
                                                </TableRow>
                                            </TableHeader>
                                                )
                                            })()}
                                            <TableBody>
                                                {memberLinks.map(l => {
                                                    const partner = allPartners.find(p => p.id === l.member.partner_id)
                                                    const isSelected = selectedLinks.some(s => s.id === l.id)
                                                    return (
                                                        <Popover key={l.id}>
                                                            <TableRow className={`group ${isSelected ? 'bg-muted' : ''}`}>
                                                                <TableCell className="px-2 py-1.5">
                                                                    <Checkbox
                                                                        checked={isSelected}
                                                                        onCheckedChange={() => toggleSelectLink(l)}
                                                                        className="h-3.5 w-3.5"
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="px-2 py-1.5 whitespace-nowrap">
                                                                    <PopoverTrigger asChild>
                                                                        <button className="text-left hover:underline underline-offset-2">
                                                                            {l.member.first_name} {l.member.last_name}
                                                                        </button>
                                                                    </PopoverTrigger>
                                                                </TableCell>
                                                                <TableCell className="px-0 py-1.5">
                                                                    <Select value={l.role} onValueChange={role => handleRoleChange(l.id, role)}>
                                                                        <SelectTrigger className="h-5 text-xs w-28 border-none p-0 shadow-none text-muted-foreground hover:text-foreground" onClick={e => e.stopPropagation()}>
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </TableCell>
                                                                {memberLinks.some(ml => ml.role === 'Participant') && (
                                                                    <TableCell className="px-0 py-1.5">
                                                                        {l.role === 'Participant' ? (
                                                                            <Select
                                                                                value={l.participation_status_id?.toString() ?? ''}
                                                                                onValueChange={v => handleParticipationStatusChange(l.id, v ? Number(v) : null)}
                                                                            >
                                                                                <SelectTrigger className="h-5 text-xs w-24 border-none p-0 shadow-none text-muted-foreground hover:text-foreground" onClick={e => e.stopPropagation()}>
                                                                                    <SelectValue placeholder="—" />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    {participationStatuses.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.label}</SelectItem>)}
                                                                                </SelectContent>
                                                                            </Select>
                                                                        ) : <span className="text-muted-foreground px-2">—</span>}
                                                                    </TableCell>
                                                                )}
                                                                <TableCell className="px-2 py-1.5">
                                                                    {partner && (
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <span
                                                                                    className="text-xs px-2 py-0.5 rounded-full border border-border truncate inline-block max-w-[100px]"
                                                                                    style={partner.color ? { backgroundColor: partner.color } : {}}
                                                                                >
                                                                                    {partner.name}
                                                                                </span>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>{partner.name}</TooltipContent>
                                                                        </Tooltip>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="px-2 py-1.5">
                                                                    <button
                                                                        onClick={() => handleRemoveMember(l.id)}
                                                                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                                                    >
                                                                        <X size={13} />
                                                                    </button>
                                                                </TableCell>
                                                            </TableRow>
                                                            <PopoverContent align="start" className="w-72 p-4 flex flex-col gap-3">
                                                                <div className="flex items-center gap-3">
                                                                    <Avatar className="h-9 w-9 shrink-0">
                                                                        <AvatarImage src={l.member.profile_image} />
                                                                        <AvatarFallback className="text-sm bg-muted">
                                                                            {l.member.first_name[0]}{l.member.last_name[0]}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <div className="flex flex-col min-w-0">
                                                                        <span className="text-sm font-medium">{l.member.first_name} {l.member.last_name}</span>
                                                                        <span className="text-xs text-muted-foreground truncate">{l.member.position}</span>
                                                                    </div>
                                                                </div>
                                                                <Separator />
                                                                <div className="flex flex-col gap-2 text-xs">
                                                                    {l.member.status && (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="w-20 shrink-0 text-muted-foreground">Statut</span>
                                                                            <span>{l.member.status}</span>
                                                                        </div>
                                                                    )}
                                                                    {l.member.email && (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="w-20 shrink-0 text-muted-foreground">Email</span>
                                                                            <a href={`mailto:${l.member.email}`} className="truncate text-blue-600 hover:underline">{l.member.email}</a>
                                                                        </div>
                                                                    )}
                                                                    {l.member.tel && (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="w-20 shrink-0 text-muted-foreground">Téléphone</span>
                                                                            <a href={`tel:${l.member.tel}`} className="hover:underline">{l.member.tel}</a>
                                                                        </div>
                                                                    )}
                                                                    {partner && (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="w-20 shrink-0 text-muted-foreground">Partenaire</span>
                                                                            <span className="px-1.5 py-0.5 rounded-full border border-border" style={partner.color ? { backgroundColor: partner.color } : {}}>
                                                                                {partner.name}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}

                                {showCreateMember && (
                                    <MemberQuickCreateForm
                                        partners={allPartners}
                                        role={roleToAdd}
                                        onSaved={async member => {
                                            setAllMembers(prev => [...prev, member])
                                            await handleAddMemberById(member.id)
                                            setShowCreateMember(false)
                                        }}
                                        onCancel={() => setShowCreateMember(false)}
                                    />
                                )}

                                {!showCreateMember && availableMembers.length > 0 && (
                                    <div className="flex gap-2 items-start">
                                        <MemberSearchInput
                                            members={availableMembers}
                                            partners={allPartners}
                                            linkedMembers={memberLinks.map(l => l.member)}
                                            onConfirm={ids => ids.forEach(id => handleAddMemberById(id))}
                                        />
                                        <Select value={roleToAdd} onValueChange={setRoleToAdd}>
                                            <SelectTrigger className="w-32 h-8 text-xs shrink-0"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </section>
                        )}
                        

                        

                        {/* Projets liés */}
                        {acTab === 'projects' && (
                            <section className="flex flex-col gap-3">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Projets liés</p>

                                {projectLinks.length > 0 && (
                                    <div className="flex flex-col gap-1">
                                        {projectLinks.map(l => (
                                            <Popover key={l.id}>
                                                <PopoverTrigger asChild>
                                                    <div className="flex items-center justify-between px-2 py-1 rounded hover:bg-muted group cursor-pointer">
                                                        <span className="text-sm">{l.project.title}</span>
                                                        <div
                                                            onClick={e => { e.stopPropagation(); handleRemoveProject(l.id) }}
                                                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive cursor-pointer"
                                                        >
                                                            <X size={13} />
                                                        </div>
                                                    </div>
                                                </PopoverTrigger>
                                                <PopoverContent align="start" className="w-72 p-4 flex flex-col gap-3">
                                                    {/* En-tête */}
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-sm font-medium">{l.project.title}</span>
                                                    </div>

                                                    <Separator />

                                                    {/* Détails financiers */}
                                                    <div className="flex flex-col gap-2 text-xs">
                                                        {l.project.budget > 0 && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-24 shrink-0 text-muted-foreground">Budget total</span>
                                                                <span>{l.project.budget.toLocaleString('fr-FR')} €</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        ))}
                                    </div>
                                )}

                                {availableProjects.length > 0 && (
                                    <div className="flex gap-2">
                                        <Select value={projectToAdd} onValueChange={setProjectToAdd}>
                                            <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder="Lier un projet" /></SelectTrigger>
                                            <SelectContent>
                                                {availableProjects.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleAddProject} disabled={!projectToAdd}>
                                            <Plus size={13} />
                                        </Button>
                                    </div>
                                )}
                            </section>
                        )}
                       

                        

                        {/* Conventions liées */}
                        {acTab === 'agreements' && (
                                <section className="flex flex-col gap-3">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Conventions liées</p>

                                    {agreementLinks.length > 0 && (
                                        <div className="flex flex-col gap-1">
                                            {agreementLinks.map(l => {
                                                const agrPartner = partnerMap.get(l.agreement.partner_id)
                                                const agrProject = projectMap.get(l.agreement.project_id)
                                                return (
                                                    <Popover key={l.id}>
                                                        <PopoverTrigger asChild>
                                                            <div className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted group cursor-pointer">
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="text-sm truncate">{l.agreement.title}</span>
                                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                                        {agrProject && (
                                                                            <span className="text-xs text-muted-foreground truncate">{agrProject.title}</span>
                                                                        )}
                                                                        {agrProject && agrPartner && (
                                                                            <span className="text-xs text-muted-foreground">·</span>
                                                                        )}
                                                                        {agrPartner && (
                                                                            <span
                                                                                className="shrink-0 text-xs px-1.5 py-0.5 rounded-full border border-border"
                                                                                style={agrPartner.color ? { backgroundColor: agrPartner.color } : {}}
                                                                            >
                                                                                {agrPartner.name}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div
                                                                    onClick={e => { e.stopPropagation(); handleRemoveAgreement(l.id) }}
                                                                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive cursor-pointer ml-2 shrink-0"
                                                                >
                                                                    <X size={13} />
                                                                </div>
                                                            </div>
                                                        </PopoverTrigger>
                                                        <PopoverContent align="start" className="w-80 p-4 flex flex-col gap-3">
                                                            {/* En-tête */}
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-sm font-medium">{l.agreement.title}</span>
                                                                {l.agreement.description && (
                                                                    <span className="text-xs text-muted-foreground">{l.agreement.description}</span>
                                                                )}
                                                            </div>

                                                            <Separator />

                                                            <div className="flex flex-col gap-2 text-xs">
                                                                {agrProject && (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="w-28 shrink-0 text-muted-foreground">Projet</span>
                                                                        <span>{agrProject.title}</span>
                                                                    </div>
                                                                )}
                                                                {agrPartner && (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="w-28 shrink-0 text-muted-foreground">Partenaire</span>
                                                                        <span
                                                                            className="px-1.5 py-0.5 rounded-full border border-border"
                                                                            style={agrPartner.color ? { backgroundColor: agrPartner.color } : {}}
                                                                        >
                                                                            {agrPartner.name}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {l.agreement.signed_date && (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="w-28 shrink-0 text-muted-foreground">Date de signature</span>
                                                                        <span>{formatDate(l.agreement.signed_date)}</span>
                                                                    </div>
                                                                )}
                                                                {l.agreement.budget > 0 && (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="w-28 shrink-0 text-muted-foreground">Budget</span>
                                                                        <span>{l.agreement.budget.toLocaleString('fr-FR')} €</span>
                                                                    </div>
                                                                )}
                                                                {l.agreement.grant > 0 && (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="w-28 shrink-0 text-muted-foreground">Subvention</span>
                                                                        <span>{l.agreement.grant.toLocaleString('fr-FR')} €</span>
                                                                    </div>
                                                                )}
                                                                {l.agreement.budget > 0 && l.agreement.grant > 0 && (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="w-28 shrink-0 text-muted-foreground">Taux financ.</span>
                                                                        <span>{Math.round((l.agreement.grant / l.agreement.budget) * 100)} %</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {availableAgreements.length > 0 && (
                                        <AgreementSearchInput
                                            agreements={availableAgreements}
                                            partners={allPartners}
                                            projects={allProjects}
                                            onSelect={handleAddAgreement}
                                        />
                                    )}

                                    {availableAgreements.length === 0 && agreementLinks.length === 0 && (
                                        <p className="text-xs text-muted-foreground italic">
                                            {linkedProjectIds.length > 0
                                                ? 'Toutes les conventions des projets liés ont été rattachées'
                                                : 'Aucune convention disponible'}
                                        </p>
                                    )}
                                </section>
                        )}

                        {/* Localisation */}
                        {acTab === 'location' && (
                            <section className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Localisation</p>
                                        <Button
                                            variant="ghost"
                                            size="xs"
                                            className="text-muted-foreground hover:text-destructive"
                                            onClick={async () => {
                                                await updateActionCard(card.id, { full_address: '', lat: null, lon: null })
                                                onUpdated({ ...card, full_address: '', lat: null, lon: null })
                                                setLocation('')
                                                setCoords(null)
                                                setshowLocation(false)
                                            }}
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>

                                    <AddressAutocomplete
                                        location={location}
                                        setLocation={setLocation}
                                        setCoords = {setCoords}
                                        onSelect={async (address, lat, lon) => {
                                            await updateActionCard(card.id, { full_address: address, lat, lon })
                                            onUpdated({ ...card, full_address: address, lat, lon })
                                        }}
                                    />

                                    {coords !== null && (
                                        <MiniMap coords={coords} />
                                    )}
                            </section>
                        )}

                        

                        {acTab === 'comments' && <section className="flex flex-col gap-3">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Commentaires</p>
                            {/* Nouveau commentaire */}
                            <div className="flex gap-2 mt-1">
                                <Textarea
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    placeholder="Ajouter un commentaire..."
                                    className="text-sm min-h-[60px]"
                                />
                                <Button
                                    size="sm"
                                    disabled={!newComment.trim() || submittingComment}
                                    onClick={handleAddComment}
                                    className='rounded-md'
                                >
                                    <Check size={13} />
                                </Button>
                            </div>

                            <div className="flex flex-col gap-2">
                                {comments.map(comment => {
                                    console.log('currentUser email:', currentUser?.email)
                                    console.log('comment owner email:', comment.owner.email)
                                    return (
                                    <div key={comment.id}>
                                        {editingComment === comment.id ? (
                                            <div className="flex gap-2">
                                                <Textarea
                                                    value={editContent}
                                                    onChange={e => setEditContent(e.target.value)}
                                                    className="text-sm min-h-[60px]"
                                                />
                                                <div className="flex flex-col gap-1">
                                                    <Button size="sm" className='rounded-md' onClick={() => handleEditComment(comment.id)}>
                                                        <Check size={13} />
                                                    </Button>
                                                    <Button size="sm" className='rounded-md' variant="ghost" onClick={() => setEditingComment(null)}>
                                                        <X size={13} />
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <CommentCard
                                                comment={comment}
                                                onDelete={() => handleDeleteComment(comment.id)}
                                                onEdit={() => { setEditingComment(comment.id); setEditContent(comment.content) }}
                                                onComment={() => { setReplyingTo(comment.id); setReplyContent('') }}
                                                isOwner={currentUser?.email === comment.owner.email}
                                            />
                                        )}

                                        {replyingTo === comment.id && (
                                            <div className="ml-[60px] flex gap-2 mt-1">
                                                <Textarea
                                                    value={replyContent}
                                                    onChange={e => setReplyContent(e.target.value)}
                                                    placeholder="Votre réponse..."
                                                    className="text-sm min-h-[60px]"
                                                />
                                                <div className="flex flex-col gap-1">
                                                    <Button size="sm" className='rounded-md'  disabled={submittingComment} onClick={() => handleReply(comment.id)}>
                                                        <Check size={13} />
                                                    </Button>
                                                    <Button size="sm" className='rounded-md'  variant="ghost" onClick={() => setReplyingTo(null)}>
                                                        <X size={13} />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="ml-[60px]">
                                            {comment.replies?.map(reply => (
                                                <div key={reply.id}>
                                                    {editingComment === reply.id ? (
                                                        <div className="flex gap-2">
                                                            <Textarea
                                                                value={editContent}
                                                                onChange={e => setEditContent(e.target.value)}
                                                                className="text-sm min-h-[60px]"
                                                            />
                                                            <div className="flex flex-col gap-1">
                                                                <Button size="sm" onClick={() => handleEditComment(reply.id)}>
                                                                    <Check size={13} />
                                                                </Button>
                                                                <Button size="sm" variant="ghost" onClick={() => setEditingComment(null)}>
                                                                    <X size={13} />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <CommentCard
                                                            comment={reply}
                                                            onDelete={() => handleDeleteComment(reply.id)}
                                                            onEdit={() => { setEditingComment(reply.id); setEditContent(reply.content) }}
                                                            onComment={() => { setReplyingTo(comment.id); setReplyContent('') }}
                                                            isOwner={currentUser?.email === reply.owner.email}
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    )
                                }
                                )}
                            </div>
                        </section>}

                    </div>
                )}
            </SheetContent>
        </Sheet>
    )
}

// --- Composant principal carte ---

export default function ActionCard(props: ActionCardData & {
    onDeleted?: (id: number) => void
    onUpdated?: (patch: Partial<ActionCardData>) => void
    selectOn?: boolean
    selected?: boolean
    onToggle?: () => void
    onSelectMultiple?: () => void
    onSelectAll?: () => void
    selectedCards?: ActionCardData[]
}) {
    const { onDeleted, onUpdated: onUpdatedProp, selectOn, selected, onToggle, onSelectMultiple: _onSelectMultiple, onSelectAll, selectedCards = [] } = props
    const [open, setOpen]         = useState(false)
    const [data, setData]         = useState<ActionCardData>(props)
    const [copied, setCopied]     = useState(false)
    const [confirming, setConfirming] = useState(false)
    const [deleting, setDeleting] = useState(false)

    useEffect(() => { setData(props) }, [props])

    const { title, status, category, owner, start_date, end_date } = data
    const statusColor = STATUS_COLORS[data.status.label] ?? '#f3f4f6'

    function copyTitle() {
        navigator.clipboard.writeText(data.title)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    function copyTitles() {
        navigator.clipboard.writeText(selectedCards.map(c => c.title).join('\n'))
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    async function handleDelete() {
        setDeleting(true)
        try {
            await deleteActionCard(data.id)
            onDeleted?.(data.id)
        } finally {
            setDeleting(false)
            setConfirming(false)
        }
    }

    async function handleDeleteMultiple() {
        setDeleting(true)
        try {
            await Promise.all(selectedCards.map(c => deleteActionCard(c.id)))
            selectedCards.forEach(c => onDeleted?.(c.id))
            setConfirming(false)
        } finally {
            setDeleting(false)
        }
    }

    return (
        <>
        <ContextMenu onOpenChange={open => { if (!open) setConfirming(false) }}>
            <ContextMenuTrigger>
            <Card
                className={`cursor-pointer transition-all duration-200 focus:outline-none ${selected ? 'ring-2 ring-foreground shadow-none' : 'hover:shadow-md'}`}
                onClick={selectOn ? onToggle : () => setOpen(true)}
            >
                <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm leading-snug">{title}</CardTitle>
                        <Badge variant="secondary" className="shrink-0 text-xs rounded-xl" style={{ backgroundColor: statusColor }}>
                            {status.label}
                        </Badge>
                    </div>
                    <CardDescription className="text-xs">
                        {category.parent ? `${category.parent.title} › ${category.title}` : category.title}
                    </CardDescription>
                </CardHeader>

                {(owner || start_date || end_date) && (
                    <CardContent className="pt-0 flex items-center justify-between text-xs text-muted-foreground">
                        {(() => {
                            const { responsables } = data
                            const resp = responsables && responsables.length > 0 ? responsables : owner ? [owner] : []
                            if (resp.length === 0) return null
                            return (
                                <span className="flex items-center gap-1 mr-2.5">
                                    {resp[0].first_name} {resp[0].last_name}
                                    {resp.length > 1 && <span className="bg-muted rounded-full px-1.5">+{resp.length - 1}</span>}
                                </span>
                            )
                        })()}
                        {(start_date || end_date) && (
                            <span className="ml-auto">
                                {formatDate(start_date)}{end_date ? ` → ${formatDate(end_date)}` : ''}
                            </span>
                        )}
                    </CardContent>
                )}
            </Card>
            </ContextMenuTrigger>

            <ContextMenuContent className="w-52">
                {selectedCards.length > 1 ? (
                    <>  <ContextMenuItem onClick={onSelectAll}>
                    <ListChecks size={13} className="mr-2" /> Tout sélectionner
                </ContextMenuItem>
                <Separator />
                        <ContextMenuItem onSelect={e => e.preventDefault()} onClick={copyTitles}>
                            {copied ? <CheckIcon size={13} className="mr-2" /> : <Copy size={13} className="mr-2" />}
                            {copied ? 'Copié !' : `Copier les titres (${selectedCards.length})`}
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => exportToCsv(
                            'cartes.csv',
                            ['Titre', 'Statut', 'Catégorie', 'Responsable', 'Date début', 'Date fin'],
                            selectedCards.map(c => [
                                c.title, c.status.label,
                                c.category.parent ? `${c.category.parent.title} › ${c.category.title}` : c.category.title,
                                c.owner ? `${c.owner.first_name} ${c.owner.last_name}` : '',
                                c.start_date ?? '', c.end_date ?? '',
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
                                <Trash size={13} className="mr-2" /> Supprimer ({selectedCards.length})
                            </ContextMenuItem>
                        )}
                    </>
                ) : (
                    <>
                        <ContextMenuItem onClick={() => setOpen(true)}>
                            <Pencil size={13} className="mr-2" /> Éditer
                        </ContextMenuItem>
                        <ContextMenuItem onSelect={e => e.preventDefault()} onClick={copyTitle}>
                            {copied ? <CheckIcon size={13} className="mr-2" /> : <Copy size={13} className="mr-2" />}
                            {copied ? 'Copié !' : 'Copier le titre'}
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
                                <Trash size={13} className="mr-2" /> Supprimer
                            </ContextMenuItem>
                        )}
                    </>
                )}
            </ContextMenuContent>
        </ContextMenu>

        <ActionCardDetailSheet
            card={data}
            open={open}
            onClose={() => setOpen(false)}
            onUpdated={patch => {
                setData(prev => ({ ...prev, ...patch }))
                onUpdatedProp?.(patch)
            }}
            onDeleted={onDeleted}
        />
        </>
    )
}
