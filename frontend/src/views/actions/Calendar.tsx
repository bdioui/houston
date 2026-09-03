import { useState, useEffect } from 'react'
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import '@/styles/calendar.css'
import { getActionCardsFull, getStatuses, getAxes, getMembers, getPartners, getCategories, getAllAxisActionCards, getAllMemberActionCards } from '@/lib/api'
import type { ActionCardFull, Axis, Member, Partner, Category, AxisActionCard, MemberActionCard } from '@/lib/types'
import { type ActionCardData } from './ActionCard'
import { useCurrentUser } from '@/lib/userContext'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Plus, Search, Users, SlidersHorizontal } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import ActionCardSheet from './ActionCardSheet'

// --- Localizer français ---

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
    getDay,
    locales: { fr },
})

// --- Mapping ---

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
        start_date: card.start_date || undefined,
        end_date:   card.end_date   || undefined,
    }
}

type CalendarEvent = {
    id:       number
    title:    string
    start:    Date
    end:      Date
    resource: ActionCardData
}

// --- Filtre membres ---

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

    const groupMap = new Map<number, { partner: Partner; members: Member[] }>()
    for (const m of filtered) {
        const partner = partnerMap.get(m.partner_id)
        if (!partner) continue
        if (!groupMap.has(partner.id)) groupMap.set(partner.id, { partner, members: [] })
        groupMap.get(partner.id)!.members.push(m)
    }
    const groups = Array.from(groupMap.values())

    function toggle(id: number) {
        onChangeIds(selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id])
    }

    function toggleGroup(members: Member[]) {
        const ids = members.map(m => m.id)
        const allChecked = ids.every(id => selectedIds.includes(id))
        onChangeIds(allChecked ? selectedIds.filter(id => !ids.includes(id)) : [...new Set([...selectedIds, ...ids])])
    }

    function groupState(members: Member[]): boolean {
        const count = members.filter(m => selectedIds.includes(m.id)).length
        return count === members.length && count > 0
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant={selectedIds.length > 0 ? 'default' : 'outline'} size="sm" className="gap-2 rounded-md">
                    <Users size={14} />
                    Membres
                    {selectedIds.length > 0 && <span className="text-xs opacity-75">{selectedIds.length}</span>}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60">
                <div className="px-2 py-1.5">
                    <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un membre..." className="h-7 text-xs" />
                </div>
                <DropdownMenuSeparator />
                <div className="max-h-72 overflow-y-auto">
                {groups.map((group, i) => (
                    <div key={group.partner.id}>
                        {i > 0 && <DropdownMenuSeparator />}
                        <DropdownMenuCheckboxItem checked={groupState(group.members)} onCheckedChange={() => toggleGroup(group.members)} className="font-medium gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-border" style={group.partner.color ? { backgroundColor: group.partner.color } : {}} />
                            {group.partner.name}
                        </DropdownMenuCheckboxItem>
                        {group.members.map(m => (
                            <DropdownMenuCheckboxItem key={m.id} checked={selectedIds.includes(m.id)} onCheckedChange={() => toggle(m.id)} className="pl-7">
                                {m.first_name} {m.last_name}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </div>
                ))}
                </div>
                {selectedIds.length > 0 && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem checked={false} onCheckedChange={() => onChangeIds([])}>Tout effacer</DropdownMenuCheckboxItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

// --- Composant principal ---

export default function Calendar() {
    const currentUser = useCurrentUser()
    const [cards,        setCards]        = useState<ActionCardData[]>([])
    const [loading,      setLoading]      = useState(true)
    const [error,        setError]        = useState<string | null>(null)
    const [sheetOpen,    setSheetOpen]    = useState(false)
    const [selectedCard, setSelectedCard] = useState<ActionCardData | null>(null)
    const [currentDate,  setCurrentDate]  = useState(new Date())

    const [allAxes,       setAllAxes]       = useState<Axis[]>([])
    const [allMembers,    setAllMembers]    = useState<Member[]>([])
    const [allPartners,   setAllPartners]   = useState<Partner[]>([])
    const [allCategories, setAllCategories] = useState<Category[]>([])
    const [axisLinks,     setAxisLinks]     = useState<AxisActionCard[]>([])
    const [memberLinks,   setMemberLinks]   = useState<MemberActionCard[]>([])

    const [selectedAxeIds,      setSelectedAxeIds]      = useState<number[]>([])
    const [selectedMemberIds,   setSelectedMemberIds]   = useState<number[]>([])
    const [myCardsOnly,         setMyCardsOnly]         = useState(false)
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([])
    const [searchQuery,         setSearchQuery]         = useState('')

    useEffect(() => {
        Promise.all([
            getActionCardsFull(),
            getStatuses(),
            getAxes(),
            getMembers(),
            getPartners(),
            getCategories(),
            getAllAxisActionCards(),
            getAllMemberActionCards(),
        ]).then(([data, , axes, members, partners, categories, axLinks, memLinks]) => {
            const memberMap = new Map(members.map(m => [m.id, m]))
            setCards(data.map(card => ({
                ...toCardData(card),
                responsables: memLinks
                    .filter(l => l.action_card_id === card.id && l.role === 'Responsable')
                    .map(l => memberMap.get(l.member_id))
                    .filter(Boolean) as import('./ActionCard').Owner[],
            })))
            setAllAxes(axes)
            setAllMembers(members)
            setAllPartners(partners)
            setAllCategories(categories)
            setAxisLinks(axLinks)
            setMemberLinks(memLinks)
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false))
    }, [])

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
        if (selectedCategoryIds.length > 0) {
            if (!selectedCategoryIds.includes(card.category.id)) return false
        }
        return true
    })

    const unplanned = filteredCards.filter(c => !c.start_date || !c.end_date)

    const events: CalendarEvent[] = filteredCards
        .filter(c => c.start_date && c.end_date)
        .map(c => ({
            id:       c.id,
            title:    c.title,
            start:    new Date(c.start_date!),
            end:      new Date(c.end_date!),
            resource: c,
        }))

    if (error) return <p className="mt-6 text-sm text-destructive">Erreur : {error}</p>

    if (loading) {
        return (
            <div className="mt-6 flex flex-col gap-3">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-[600px] w-full" />
            </div>
        )
    }

    return (
        <>
        <div className="mt-4 flex flex-col gap-4">

            {/* Barre d'actions */}
            <div className="flex items-center gap-2 flex-wrap mr-3">

                {/* Filtre catégories */}
                {(() => {
                    const parents  = allCategories.filter(c => c.parent_category_id === null)
                    const children = allCategories.filter(c => c.parent_category_id !== null)
                    const activeParents = selectedCategoryIds.length === 0
                        ? parents.length
                        : parents.filter(p => {
                            const ids = children.filter(c => c.parent_category_id === p.id).map(c => c.id)
                            return (ids.length > 0 ? ids : [p.id]).some(id => selectedCategoryIds.includes(id))
                        }).length
                    return (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2 rounded-md">
                                    <SlidersHorizontal size={14} />
                                    Catégories
                                    <span className="text-xs text-muted-foreground">{activeParents}/{parents.length}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56">
                                <div className="max-h-72 overflow-y-auto">
                                {parents.map((parent, i) => {
                                    const subs   = children.filter(c => c.parent_category_id === parent.id)
                                    const allIds = subs.length > 0 ? subs.map(c => c.id) : [parent.id]
                                    const allChecked = allIds.every(id => selectedCategoryIds.includes(id))
                                    const parentCount = cards.filter(c =>
                                        subs.length > 0 ? subs.some(s => s.id === c.category.id) : c.category.id === parent.id
                                    ).length
                                    return (
                                        <div key={parent.id}>
                                            {i > 0 && <DropdownMenuSeparator />}
                                            <DropdownMenuCheckboxItem
                                                checked={allChecked}
                                                onCheckedChange={() => setSelectedCategoryIds(prev =>
                                                    allChecked ? prev.filter(id => !allIds.includes(id)) : [...new Set([...prev, ...allIds])]
                                                )}
                                                className={subs.length > 0 ? 'font-medium' : ''}
                                            >
                                                {parent.title}
                                                <span className="ml-auto text-xs text-muted-foreground">{parentCount}</span>
                                            </DropdownMenuCheckboxItem>
                                            {subs.map(sub => (
                                                <DropdownMenuCheckboxItem
                                                    key={sub.id}
                                                    checked={selectedCategoryIds.includes(sub.id)}
                                                    onCheckedChange={() => setSelectedCategoryIds(prev =>
                                                        prev.includes(sub.id) ? prev.filter(id => id !== sub.id) : [...prev, sub.id]
                                                    )}
                                                    className="pl-7 text-muted-foreground"
                                                >
                                                    {sub.title}
                                                    <span className="ml-auto text-xs">{cards.filter(c => c.category.id === sub.id).length}</span>
                                                </DropdownMenuCheckboxItem>
                                            ))}
                                        </div>
                                    )
                                })}
                                </div>
                                {selectedCategoryIds.length > 0 && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuCheckboxItem checked={false} onCheckedChange={() => setSelectedCategoryIds([])}>
                                            Tout effacer
                                        </DropdownMenuCheckboxItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )
                })()}

                {/* Filtre axes */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant={selectedAxeIds.length > 0 ? 'default' : 'outline'} size="sm" className="gap-2 rounded-md">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M6 1v3H1V1zM1 0a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V1a1 1 0 0 0-1-1zm14 12v3h-5v-3zm-5-1a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1zM6 8v7H1V8zM1 7a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1zm14-6v7h-5V1zm-5-1a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V1a1 1 0 0 0-1-1z"/>
                            </svg>
                            Axe
                            {selectedAxeIds.length > 0 && <span className="text-xs opacity-75">{selectedAxeIds.length}</span>}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-52">
                        <div className="max-h-72 overflow-y-auto">
                        {allAxes.map(axe => (
                            <DropdownMenuCheckboxItem
                                key={axe.id}
                                checked={selectedAxeIds.includes(axe.id)}
                                onCheckedChange={() => setSelectedAxeIds(prev =>
                                    prev.includes(axe.id) ? prev.filter(id => id !== axe.id) : [...prev, axe.id]
                                )}
                            >
                                {axe.name}
                            </DropdownMenuCheckboxItem>
                        ))}
                        </div>
                        {selectedAxeIds.length > 0 && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem checked={false} onCheckedChange={() => setSelectedAxeIds([])}>Tout effacer</DropdownMenuCheckboxItem>
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

                {/* Recherche */}
                <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Rechercher..."
                        className="h-8 pl-7 w-48 text-xs rounded-md"
                    />
                </div>

                <div className="ml-auto">
                    <Button size="sm" className="gap-2 rounded-md" onClick={() => { setSelectedCard(null); setSheetOpen(true) }}>

                        <Plus size={14} />
                        Nouvelle carte
                    </Button>
                </div>
            </div>

            {unplanned.length > 0 && (
                <p className="text-xs text-muted-foreground">
                    {unplanned.length} carte{unplanned.length > 1 ? 's' : ''} sans date non affichée{unplanned.length > 1 ? 's' : ''}
                </p>
            )}

            <div style={{ height: 900 }}>
                <BigCalendar
                    localizer={localizer}
                    events={events}
                    defaultView="month"
                    views={['month']}
                    culture="fr"
                    date={currentDate}
                    onNavigate={date => setCurrentDate(date)}
                    messages={{
                        today:    "Aujourd'hui",
                        previous: 'Précédent',
                        next:     'Suivant',
                        month:    'Mois',
                        week:     'Semaine',
                        day:      'Jour',
                        agenda:   'Agenda',
                        noEventsInRange: 'Aucune carte sur cette période.',
                        showMore: (count: number) => `+${count} de plus`,
                    }}
                    formats={{
                        monthHeaderFormat: (date: Date) =>
                            date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
                    }}
                    popup
                    startAccessor="start"
                    endAccessor="end"
                    onSelectEvent={event => {
                        setSelectedCard(event.resource as ActionCardData)
                        setSheetOpen(true)
                    }}
                    eventPropGetter={event => {
                        const card = event.resource as ActionCardData
                        const color = card.category.color ?? card.category.parent?.color ?? '#E8DEEE'
                        return {
                            style: {
                                backgroundColor: color,
                                borderColor:     color,
                                color:           '#2d2d2d',
                                borderRadius:    '4px',
                                fontSize:        '11px',
                                padding:         '1px 4px',
                                lineHeight:      '1.3',
                                minHeight:       '16px',
                            },
                        }
                    }}
                />
            </div>
        </div>

        {/* Sheet unique : lecture / édition / création */}
        <ActionCardSheet
            open={sheetOpen}
            editCard={selectedCard ?? undefined}
            onClose={() => { setSheetOpen(false); setSelectedCard(null) }}
            onCreated={card => { setCards(prev => [...prev, card]); setSheetOpen(false) }}
            onUpdated={card => { setCards(prev => prev.map(c => c.id === card.id ? card : c)); setSheetOpen(false); setSelectedCard(null) }}
        />
        </>
    )
}
