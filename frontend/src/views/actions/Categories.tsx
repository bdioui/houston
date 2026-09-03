import { useState, useEffect } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core'
import ActionCard, { type ActionCardData } from './ActionCard'
import DraggableCard from './DraggableCard'
import DroppableColumn from './DroppableColumn'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { SlidersHorizontal, Plus, Pencil, Search, Users, ListChecks, X, Copy, Trash, FileDown } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getActionCardsFull, updateActionCard, deleteActionCard, getAxes, getMembers, getPartners, getAllAxisActionCards, getAllMemberActionCards } from '@/lib/api'
import type { ActionCardFull, Category, Axis, Member, Partner, AxisActionCard, MemberActionCard } from '@/lib/types'
import ActionCardSheet from './ActionCardSheet'
import { useCurrentUser } from '@/lib/userContext'
import { exportToCsv } from '@/lib/utils'
import CategorySheet from './CategorySheet'

// --- Mapping API → ActionCardData ---

function toCardData(card: ActionCardFull): ActionCardData {
    return {
        id:          card.id,
        title:       card.title,
        description: card.description || undefined,
        status: {
            id:      card.status.id,
            label:   card.status.label,
            context: card.status.context,
        },
        category: {
            id:     card.category.id,
            title:  card.category.title,
            color:  card.category.color ?? null,
            parent: card.category.parent
                ? { id: card.category.parent.id, title: card.category.parent.title, color: card.category.parent.color ?? null }
                : undefined,
        },
        owner: {
            id:         card.owner.id,
            first_name: card.owner.first_name,
            last_name:  card.owner.last_name,
            position:   card.owner.position,
        },
        start_date:   card.start_date   || undefined,
        end_date:     card.end_date     || undefined,
        full_address: card.full_address || undefined,
        lat:          card.lat          ?? undefined,
        lon:          card.lon          ?? undefined,
    }
}

// --- Structure de colonnes ---

type ChildCategory = { id: number; title: string }

type ColumnGroup = {
    id: number
    title: string
    color?: string | null
    children: ChildCategory[]
}

function buildColumnGroups(cards: ActionCardData[]): ColumnGroup[] {
    const groups = new Map<number, ColumnGroup>()

    for (const card of cards) {
        const { category } = card
        if (category.parent) {
            if (!groups.has(category.parent.id)) {
                groups.set(category.parent.id, { id: category.parent.id, title: category.parent.title, color: category.parent.color, children: [] })
            }
            const group = groups.get(category.parent.id)!
            if (!group.children.some(c => c.id === category.id)) {
                group.children.push({ id: category.id, title: category.title })
            }
        } else {
            if (!groups.has(category.id)) {
                groups.set(category.id, { id: category.id, title: category.title, color: category.color, children: [{ id: category.id, title: category.title }] })
            }
        }
    }

    return Array.from(groups.values())
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

// --- Composant ---

export default function Categories() {
    const currentUser = useCurrentUser()
    const [cards, setCards]               = useState<ActionCardData[]>([])
    const [loading, setLoading]           = useState(true)
    const [error, setError]               = useState<string | null>(null)
    const [visibleIds, setVisibleIds]     = useState<number[]>([])
    const [columnGroups, setColumnGroups] = useState<ColumnGroup[]>([])
    const [activeCard, setActiveCard]     = useState<ActionCardData | null>(null)
    const [overId, setOverId]             = useState<string | null>(null)
    const [sheetOpen, setSheetOpen]             = useState(false)
    const [catSheetOpen, setCatSheetOpen]       = useState(false)
    const [editingCategory, setEditingCategory] = useState<Category | undefined>()

    // Données de filtre
    const [allAxes,    setAllAxes]    = useState<Axis[]>([])
    const [allMembers, setAllMembers] = useState<Member[]>([])
    const [allPartners, setAllPartners] = useState<Partner[]>([])
    const [axisLinks,  setAxisLinks]  = useState<AxisActionCard[]>([])
    const [memberLinks, setMemberLinks] = useState<MemberActionCard[]>([])

    // États des filtres
    const [selectedAxeIds,    setSelectedAxeIds]    = useState<number[]>([])
    const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([])
    const [myCardsOnly,       setMyCardsOnly]       = useState(false)
    const [searchQuery,       setSearchQuery]       = useState('')
    const [selectAllCat, setSelectAllCat]                 = useState(false)

    // Multi-select
    const [multipleSelect,    setMultipleSelect]    = useState(false)
    const [selectedCards,     setSelectedCards]     = useState<ActionCardData[]>([])
    const [confirmingDelete,  setConfirmingDelete]  = useState(false)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    )

    function loadData() {
        return Promise.all([
            getActionCardsFull(),
            getAxes(),
            getMembers(),
            getPartners(),
            getAllAxisActionCards(),
            getAllMemberActionCards(),
        ])
            .then(([data, axes, members, partners, axLinks, memLinks]) => {
                const memberMap = new Map(members.map(m => [m.id, m]))
                const mapped = data.map(card => ({
                    ...toCardData(card),
                    responsables: memLinks
                        .filter(l => l.action_card_id === card.id && l.role === 'Responsable')
                        .map(l => memberMap.get(l.member_id))
                        .filter(Boolean) as import('./ActionCard').Owner[],
                }))
                const groups = buildColumnGroups(mapped)
                const allIds = mapped.map(c => c.category.id)

                setCards(mapped)
                setColumnGroups(groups)
                setVisibleIds([...new Set(allIds)])
                setAllAxes(axes)
                setAllMembers(members)
                setAllPartners(partners)
                setAxisLinks(axLinks)
                setMemberLinks(memLinks)
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false))
    }

    useEffect(() => { loadData() }, [])

    function toggleChild(id: number) {
        setVisibleIds(prev =>
            prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
        )
    }

    function toggleGroup(group: ColumnGroup) {
        const childIds = group.children.map(c => c.id)
        const allChecked = childIds.every(id => visibleIds.includes(id))
        setVisibleIds(prev =>
            allChecked
                ? prev.filter(id => !childIds.includes(id))
                : [...new Set([...prev, ...childIds])]
        )
    }

    function groupCheckedState(group: ColumnGroup): boolean | 'indeterminate' {
        const childIds = group.children.map(c => c.id)
        const checkedCount = childIds.filter(id => visibleIds.includes(id)).length
        if (checkedCount === 0) return false
        if (checkedCount === childIds.length) return true
        return 'indeterminate'
    }

    function onDragStart({ active }: DragStartEvent) {
        setActiveCard(cards.find(c => c.id === active.id) ?? null)
    }

    function onDragOver({ over }: { over: { id: string | number } | null }) {
        setOverId(over ? String(over.id) : null)
    }

    function onDragEnd({ active, over }: DragEndEvent) {
        setActiveCard(null)
        setOverId(null)

        if (!over) return

        // L'ID de la droppable est "col-{categoryId}"
        const targetCategoryId = Number(String(over.id).replace('col-', ''))
        const card = cards.find(c => c.id === active.id)
        if (!card || card.category.id === targetCategoryId) return

        // Retrouver la catégorie cible depuis les groupes existants
        let targetCategory: ActionCardData['category'] | undefined
        for (const group of columnGroups) {
            const child = group.children.find(c => c.id === targetCategoryId)
            if (child) {
                targetCategory = {
                    id: child.id,
                    title: child.title,
                    parent: group.children.length > 1
                        ? { id: group.id, title: group.title }
                        : undefined,
                }
                break
            }
        }

        if (!targetCategory) return

        // Mise à jour optimiste : on met à jour le state immédiatement
        setCards(prev => prev.map(c =>
            c.id === active.id ? { ...c, category: targetCategory! } : c
        ))

        // Persistance en base
        updateActionCard(Number(active.id), { category_id: targetCategoryId })
            .catch(() => {
                // En cas d'échec, on annule la mise à jour optimiste
                setCards(prev => prev.map(c =>
                    c.id === active.id ? { ...c, category: card.category } : c
                ))
            })
    }

    function toggleAxe(id: number) {
        setSelectedAxeIds(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id])
    }

    function toggleCard(card: ActionCardData) {
        setSelectedCards(prev =>
            prev.find(c => c.id === card.id)
                ? prev.filter(c => c.id !== card.id)
                : [...prev, card]
        )
    }

    function copySelectedTitles() {
        navigator.clipboard.writeText(selectedCards.map(c => c.title).join('\n'))
    }

    async function handleDeleteSelected() {
        await Promise.all(selectedCards.map(c => deleteActionCard(c.id)))
        setCards(prev => prev.filter(c => !selectedCards.find(sc => sc.id === c.id)))
        setSelectedCards([])
        setMultipleSelect(false)
        setConfirmingDelete(false)
    }

    function toggleAllCategories() {
        if(selectAllCat === true) {
            setSelectAllCat(false)
            setVisibleIds([])
            
         } else {
            setSelectAllCat(true)
            columnGroups.map(group => toggleGroup(group))
         }
    }

    // Cartes filtrées selon les 3 critères
    const filteredCards = cards.filter(card => {
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            if (!card.title.toLowerCase().includes(q) && !(card.description ?? '').toLowerCase().includes(q)) return false
        }
        if (selectedAxeIds.length > 0) {
            const cardAxes = axisLinks.filter(l => l.action_card_id === card.id).map(l => l.axis_id)
            if (!selectedAxeIds.some(id => cardAxes.includes(id))) return false
        }
        if (myCardsOnly && currentUser) {
            const cardResp = memberLinks.filter(l => l.action_card_id === card.id && l.role === 'Responsable').map(l => l.member_id)
            if (!cardResp.includes(currentUser.id)) return false
        }
        if (selectedMemberIds.length > 0) {
            const cardResp = memberLinks.filter(l => l.action_card_id === card.id && l.role === 'Responsable').map(l => l.member_id)
            if (!selectedMemberIds.some(id => cardResp.includes(id))) return false
        }
        return true
    })

    function openEditCategory(cat: Category) {
        setEditingCategory(cat)
        setCatSheetOpen(true)
    }

    function onCategorySaved(saved: Category) {
        setColumnGroups(prev => {
            // Édition : renommer group ou child
            if (editingCategory) {
                return prev.map(group => {
                    if (group.id === saved.id) return { ...group, title: saved.title, color: saved.color }
                    return {
                        ...group,
                        children: group.children.map(c =>
                            c.id === saved.id ? { ...c, title: saved.title } : c
                        ),
                    }
                })
            }
            // Création sans parent → nouvelle colonne racine
            if (!saved.parent_category_id) {
                const newGroup = { id: saved.id, title: saved.title, color: saved.color, children: [{ id: saved.id, title: saved.title }] }
                setVisibleIds(prev => [...prev, saved.id])
                return [...prev, newGroup]
            }
            // Création avec parent → ajouter child au groupe parent existant
            return prev.map(group => {
                if (group.id !== saved.parent_category_id) return group
                setVisibleIds(ids => [...ids, saved.id])
                return { ...group, children: [...group.children, { id: saved.id, title: saved.title }] }
            })
        })
        // Mettre à jour aussi les titres dans les cartes existantes
        if (editingCategory) {
            setCards(prev => prev.map(card => {
                if (card.category.id === saved.id)
                    return { ...card, category: { ...card.category, title: saved.title } }
                if (card.category.parent?.id === saved.id)
                    return { ...card, category: { ...card.category, parent: { ...card.category.parent!, title: saved.title } } }
                return card
            }))
        }
        setEditingCategory(undefined)
    }

    const visibleGroups = columnGroups
        .map(group => ({
            ...group,
            children: group.children.filter(c => visibleIds.includes(c.id)),
        }))
        .filter(group => group.children.length > 0)

    if (error) {
        return <p className="mt-6 text-sm text-destructive">Erreur : {error}</p>
    }

    if (loading) {
        return (
            <div className="mt-6 flex gap-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex flex-col gap-3 w-[260px]">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-28 w-full" />
                        <Skeleton className="h-28 w-full" />
                    </div>
                ))}
            </div>
        )
    }

    return (
        <>
        <DndContext
            sensors={sensors}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
        >
        <div className="mt-4 flex flex-col gap-4 mr-3 flex-1 min-h-0">

            {/* Barre d'actions */}
            <div className="flex items-center gap-2 flex-wrap">

                {/* Filtre catégories */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2 rounded-md">
                            <SlidersHorizontal size={14} />
                            Catégories
                            <span className="text-xs text-muted-foreground">
                                {visibleGroups.length}/{columnGroups.length}
                            </span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                        <div className="max-h-72 overflow-y-auto">
                        {columnGroups.map((group, i) => {
                            const state = groupCheckedState(group)
                            const hasChildren = group.children.length > 1
                            return (
                                <div key={group.id}>
                                    {i > 0 && <DropdownMenuSeparator />}
                                    <DropdownMenuCheckboxItem
                                        checked={state === true}
                                        className={hasChildren ? 'font-medium' : ''}
                                        onCheckedChange={() => toggleGroup(group)}
                                        onSelect={e => e.preventDefault()} 
                                    >
                                        {group.title}
                                        <span className="ml-auto text-xs text-muted-foreground">
                                            {filteredCards.filter(c => group.children.some(ch => ch.id === c.category.id)).length}
                                        </span>
                                    </DropdownMenuCheckboxItem>
                                    {hasChildren && group.children.map(child => (
                                        <DropdownMenuCheckboxItem
                                            key={child.id}
                                            checked={visibleIds.includes(child.id)}
                                            className="pl-7 text-muted-foreground"
                                            onCheckedChange={() => toggleChild(child.id)}
                                            onSelect={e => e.preventDefault()} 
                                        >
                                            {child.title}
                                            <span className="ml-auto text-xs text-muted-foreground">
                                                {filteredCards.filter(c => c.category.id === child.id).length}
                                            </span>
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </div>
                            )
                        })}
                        <DropdownMenuSeparator />
                        <div> 
                            {selectAllCat ? (
                                <DropdownMenuCheckboxItem className='text-gray-700 font-medium' checked={selectAllCat} onCheckedChange={toggleAllCategories} onSelect={e => e.preventDefault()} >
                                    Tout décocher
                                </DropdownMenuCheckboxItem>
                            ) : (
                                <DropdownMenuCheckboxItem className='text-gray-700 font-medium' checked={selectAllCat} onCheckedChange={toggleAllCategories} onSelect={e => e.preventDefault()} >
                                    Tout sélectionner
                                </DropdownMenuCheckboxItem>
                            )}
                           
                        </div>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Filtre axes */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant={selectedAxeIds.length > 0 ? 'default' : 'outline'}
                            size="sm"
                            className="gap-2 rounded-md"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-columns-gap" viewBox="0 0 16 16">
                            <path d="M6 1v3H1V1zM1 0a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V1a1 1 0 0 0-1-1zm14 12v3h-5v-3zm-5-1a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1zM6 8v7H1V8zM1 7a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1zm14-6v7h-5V1zm-5-1a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V1a1 1 0 0 0-1-1z"/>
                            </svg>
                            Axe
                            {selectedAxeIds.length > 0 && (
                                <span className="text-xs opacity-75">{selectedAxeIds.length}</span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-52">
                        <div className="max-h-72 overflow-y-auto">
                        {allAxes.map(axe => (
                            <DropdownMenuCheckboxItem
                                key={axe.id}
                                checked={selectedAxeIds.includes(axe.id)}
                                onCheckedChange={() => toggleAxe(axe.id)}
                            >
                                {axe.name}
                            </DropdownMenuCheckboxItem>
                        ))}
                        </div>
                        {selectedAxeIds.length > 0 && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem checked={false} onCheckedChange={() => setSelectedAxeIds([])}>
                                    Tout effacer
                                </DropdownMenuCheckboxItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Filtre membres */}
                <MemberFilter
                    allMembers={allMembers}
                    allPartners={allPartners}
                    selectedIds={selectedMemberIds}
                    onChangeIds={setSelectedMemberIds}
                />

                {/* Filtre "Mes cartes" */}
                {currentUser && (
                    <Button
                        variant={myCardsOnly ? 'default' : 'outline'}
                        size="sm"
                        className="gap-1.5 rounded-md"
                        onClick={() => setMyCardsOnly(v => !v)}
                    >
                        <Avatar className="h-5 w-5 shrink-0">
                            <AvatarImage src={currentUser.profile_image} />
                            <AvatarFallback className="text-[10px]" style={{ backgroundColor: currentUser.partner?.color ?? '#E7E8E2' }}>
                                {currentUser.first_name[0]}{currentUser.last_name[0]}
                            </AvatarFallback>
                        </Avatar>
                       
                        Mes cartes
                    </Button>
                )}

                {/* Barre de recherche */}
                <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Rechercher..."
                        className="h-8 pl-7 w-48 text-xs rounded-md"
                    />
                </div>

                <div className="ml-auto flex items-center gap-2">
                    {multipleSelect ? (
                        <Button size="sm" variant="outline" className="gap-1.5 rounded-md" onClick={() => { setMultipleSelect(false); setSelectedCards([]) }}>
                            <X size={14} /> Terminer
                        </Button>
                    ) : (
                        <Button size="sm" className="gap-1.5 rounded-md bg-transparent border border-border text-foreground hover:bg-muted" onClick={() => setMultipleSelect(true)}>
                            <ListChecks size={14} /> Sélection multiple
                        </Button>
                    )}
                    <Button size="sm" variant="outline" className="gap-2 rounded-md" onClick={() => { setEditingCategory(undefined); setCatSheetOpen(true) }}>
                        <Plus size={14} />
                        Catégorie
                    </Button>
                    <Button size="sm" className="gap-2 rounded-md" onClick={() => setSheetOpen(true)}>
                        <Plus size={14} />
                        Nouvelle carte
                    </Button>
                </div>
            </div>

            {/* Colonnes */}
            <ScrollArea className="w-full flex-1 min-h-0">
                <div className="flex gap-4 pb-4" style={{ minWidth: `${visibleGroups.length * 280}px` }}>
                    {visibleGroups.map(group => {
                        const totalCards = filteredCards.filter(c =>
                            group.children.some(ch => ch.id === c.category.id)
                        ).length
                        return (
                            <div key={group.id} className="flex flex-col gap-3 w-[300px] rounded-xl p-5 shrink-0">
                                <div className="flex items-center justify-between px-1 group/col">
                                    <span className="text-sm font-medium text-gray-700">{group.title}</span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => openEditCategory({ id: group.id, title: group.title, parent_category_id: null })}
                                            className="opacity-0 group-hover/col:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                                        >
                                            <Pencil size={12} />
                                        </button>
                                        <span className="text-xs text-muted-foreground bg-gray-100 rounded-full px-2 py-0.5">
                                            {totalCards}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-4">
                                    {group.children.map((child, i) => {
                                        const childCards = filteredCards.filter(c => c.category.id === child.id)
                                        return (
                                            <div key={child.id} className="flex flex-col gap-2">
                                                <div className={`flex items-center gap-1 ${i > 0 ? 'mt-1' : ''} group/child`}>
                                                    <span className={`text-xs text-muted-foreground ${group.children.length <= 1 ? 'invisible' : ''}`}>
                                                        {child.title}
                                                    </span>
                                                    {group.children.length > 1 && (
                                                        <button
                                                            onClick={() => openEditCategory({ id: child.id, title: child.title, parent_category_id: group.id })}
                                                            className="opacity-0 group-hover/child:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                                                        >
                                                            <Pencil size={10} />
                                                        </button>
                                                    )}
                                                    <div className="flex-1 h-px bg-gray-100" />
                                                </div>
                                                <DroppableColumn
                                                    id={`col-${child.id}`}
                                                    isOver={overId === `col-${child.id}`}
                                                >
                                                    {childCards.map(card => (
                                                        <DraggableCard
                                                            key={card.id}
                                                            card={card}
                                                            onDeleted={id => {
                                                                setCards(prev => prev.filter(c => c.id !== id))
                                                                setSelectedCards(prev => prev.filter(c => c.id !== id))
                                                            }}
                                                            onUpdated={patch => setCards(prev => prev.map(c => c.id === card.id ? { ...c, ...patch } : c))}
                                                            selectOn={multipleSelect}
                                                            selected={!!selectedCards.find(c => c.id === card.id)}
                                                            onToggle={() => toggleCard(card)}
                                                            onSelectMultiple={() => { setMultipleSelect(true); toggleCard(card) }}
                                                            onSelectAll={() => { setMultipleSelect(true); setSelectedCards(filteredCards) }}
                                                            selectedCards={selectedCards}
                                                        />
                                                    ))}
                                                </DroppableColumn>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>

        {/* Carte fantôme affichée sous le curseur pendant le drag */}
        <DragOverlay dropAnimation={null}>
            {activeCard && (
                <div className="rotate-1 scale-105 shadow-xl opacity-95 w-[260px]">
                    <ActionCard {...activeCard} />
                </div>
            )}
        </DragOverlay>

        </DndContext>

        <ActionCardSheet
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            onCreated={newCard => {
                setCards(prev => [...prev, newCard])
                setColumnGroups(buildColumnGroups([...cards, newCard]))
                setVisibleIds(prev => [...new Set([...prev, newCard.category.id])])
            }}
        />

        <CategorySheet
            open={catSheetOpen}
            category={editingCategory}
            onClose={() => { setCatSheetOpen(false); setEditingCategory(undefined) }}
            onSaved={onCategorySaved}
            onDeleted={() => { setCatSheetOpen(false); setEditingCategory(undefined); loadData() }}
        />

        {multipleSelect && selectedCards.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-3 py-2 rounded-full bg-foreground text-background shadow-xl">
                {confirmingDelete ? (
                    <>
                        <span className="text-sm px-2">Supprimer {selectedCards.length} carte{selectedCards.length > 1 ? 's' : ''} ?</span>
                        <div className="w-px h-4 bg-background/20 mx-1" />
                        <Button variant="ghost" size="sm" className="h-7 rounded-full text-background hover:text-background hover:bg-white/10" onClick={() => setConfirmingDelete(false)}>Annuler</Button>
                        <Button variant="ghost" size="sm" className="h-7 rounded-full text-red-400 hover:text-red-300 hover:bg-white/10" onClick={handleDeleteSelected}>Confirmer</Button>
                    </>
                ) : (
                    <>
                        <span className="text-sm font-medium px-2">{selectedCards.length} sélectionné{selectedCards.length > 1 ? 'es' : 'e'}</span>
                        <div className="w-px h-4 bg-background/20 mx-1" />
                        <Button variant="ghost" size="sm" className="h-7 gap-1.5 rounded-full text-background hover:text-background hover:bg-white/10" onClick={() => { setMultipleSelect(true); setSelectedCards(filteredCards) }}>
                            <ListChecks size={13} /> Tout sélectionner
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 gap-1.5 rounded-full text-background hover:text-background hover:bg-white/10" onClick={copySelectedTitles}>
                            <Copy size={13} /> Copier les titres
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 gap-1.5 rounded-full text-background hover:text-background hover:bg-white/10" onClick={() => exportToCsv(
                            'cartes.csv',
                            ['Titre', 'Statut', 'Catégorie', 'Responsable', 'Date début', 'Date fin'],
                            selectedCards.map(c => [c.title, c.status.label, c.category.title, c.owner ? `${c.owner.first_name} ${c.owner.last_name}` : '', c.start_date ?? '', c.end_date ?? ''])
                        )}>
                            <FileDown size={13} /> Exporter en CSV
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 gap-1.5 rounded-full text-red-400 hover:text-red-300 hover:bg-white/10" onClick={() => setConfirmingDelete(true)}>
                            <Trash size={13} /> Supprimer
                        </Button>
                        <div className="w-px h-4 bg-background/20 mx-1" />
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-background hover:text-background hover:bg-white/10" onClick={() => { setMultipleSelect(false); setSelectedCards([]) }}>
                            <X size={13} />
                        </Button>
                    </>
                )}
            </div>
        )}
        </>
    )
}
