import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { Member, Partner } from '@/lib/types'

const MEMBER_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type ChipStatus = 'valid' | 'already_added' | 'invalid'
type MemberChip = { member?: Member; email: string; status: ChipStatus }

export type MemberSearchInputProps = {
    members: Member[]
    partners: Partner[]
    linkedMembers: Member[]
    onConfirm: (memberIds: number[]) => void
}

export default function MemberSearchInput({ members, partners, linkedMembers, onConfirm }: MemberSearchInputProps) {
    const [query, setQuery] = useState('')
    const [open, setOpen]   = useState(false)
    const [chips, setChips] = useState<MemberChip[]>([])
    const partnerMap = new Map(partners.map(p => [p.id, p]))
    const chippedEmails = new Set(chips.map(c => c.email))
    const linkedEmails = new Set(linkedMembers.map(m => m.email))

    const filtered = (query.trim().length === 0 ? members : members.filter(m => {
        const full = `${m.first_name} ${m.last_name}`.toLowerCase()
        const partner = partnerMap.get(m.partner_id)?.name.toLowerCase() ?? ''
        return full.includes(query.toLowerCase()) || m.email.includes(query.toLowerCase()) || partner.includes(query.toLowerCase())
    })).filter(m => !chippedEmails.has(m.email))

    function getStatus(email: string, member?: Member): ChipStatus {
        if (linkedEmails.has(email)) return 'already_added'
        if (!!member && MEMBER_EMAIL_REGEX.test(email)) return 'valid'
        return 'invalid'
    }

    function addChip(email: string) {
        if (!email || chippedEmails.has(email)) return
        const member = members.find(m => m.email === email)
        setChips(prev => [...prev, { member, email, status: getStatus(email, member) }])
        setQuery('')
    }

    function selectFromDropdown(m: Member) {
        if (chippedEmails.has(m.email)) return
        setChips(prev => [...prev, { member: m, email: m.email, status: getStatus(m.email, m) }])
        setQuery('')
        setOpen(false)
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const val = e.target.value
        if (/[\s,;]/.test(val)) {
            val.split(/[\s,;]+/).map(p => p.trim()).filter(Boolean).forEach(addChip)
        } else {
            setQuery(val)
            setOpen(true)
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addChip(query) }
        if (e.key === 'Backspace' && query === '') setChips(prev => prev.slice(0, -1))
    }

    const chipColors: Record<ChipStatus, string> = {
        valid:         'bg-green-100 text-green-700',
        already_added: 'bg-yellow-100 text-yellow-700',
        invalid:       'bg-red-100 text-red-600',
    }

    const validCount  = chips.filter(c => c.status === 'valid').length
    const invalidCount = chips.filter(c => c.status === 'invalid').length
    const alreadyCount = chips.filter(c => c.status === 'already_added').length

    return (
        <div className="flex flex-col gap-2 flex-1">
            <div className="relative">
                <div className="flex flex-wrap gap-1 items-center border rounded-md px-2 py-1 min-h-9 focus-within:ring-1 ring-ring">
                    {chips.map((chip, i) => (
                        <span key={i} className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${chipColors[chip.status]}`}>
                            {chip.member ? `${chip.member.first_name} ${chip.member.last_name}` : chip.email}
                            {chip.status === 'already_added' && <span className="opacity-60">(déjà ajouté)</span>}
                            <button onMouseDown={() => setChips(prev => prev.filter((_, j) => j !== i))} className="opacity-60 hover:opacity-100">×</button>
                        </span>
                    ))}
                    <input
                        value={query}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setOpen(true)}
                        onBlur={() => setTimeout(() => setOpen(false), 150)}
                        placeholder={chips.length === 0 ? "Rechercher ou saisir une adresse email..." : ""}
                        className="flex-1 min-w-32 outline-none text-sm bg-transparent"
                    />
                </div>
                {open && filtered.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md overflow-hidden">
                        <ul className="max-h-48 overflow-y-auto py-1">
                            {filtered.map(m => {
                                const partner = partnerMap.get(m.partner_id)
                                return (
                                    <li key={m.id} onMouseDown={() => selectFromDropdown(m)} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-muted">
                                        <span>{m.first_name} {m.last_name}</span>
                                        {partner && (
                                            <span className="shrink-0 text-xs px-1.5 py-0.5 rounded-full border border-border" style={partner.color ? { backgroundColor: partner.color } : {}}>
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
            {chips.length > 0 && (
                <div className="flex items-center gap-2">
                    <Button variant="ghost" className="border border-gray-200 self-start" disabled={validCount === 0} onMouseDown={() => {
                        onConfirm(chips.filter(c => c.status === 'valid' && c.member).map(c => c.member!.id))
                        setChips([])
                        setQuery('')
                    }}>
                        Ajouter {validCount} membre{validCount > 1 ? 's' : ''}
                    </Button>
                    {invalidCount > 0 && <span className="text-xs text-red-500">{invalidCount} invalide{invalidCount > 1 ? 's' : ''}</span>}
                    {alreadyCount > 0 && <span className="text-xs text-yellow-600">{alreadyCount} déjà ajouté{alreadyCount > 1 ? 's' : ''}</span>}
                </div>
            )}
        </div>
    )
}
