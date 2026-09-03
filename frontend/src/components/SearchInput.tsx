import { useState } from "react"
import type { ReactNode, CSSProperties } from "react"
import { Input } from "@/components/ui/input"

type GroupMeta = {
    primary: string
    secondary?: string
    primaryStyle?: CSSProperties
}

type SearchInputProps<T extends { id: number }> = {
    data: T[]
    onSelect: (item: T) => void
    getLabel: (item: T) => string
    renderItem?: (item: T) => ReactNode
    filterFn?: (item: T, query: string) => boolean
    groupBy?: (item: T) => GroupMeta
    placeholder?: string
    value?: string
    orderBy?: string
    dropdownClassName?: string
    selectedIds?: number[]
    inline?: boolean
    dropdownUp?: boolean
}

export default function SearchInput<T extends { id: number }>({
    data,
    onSelect,
    getLabel,
    renderItem,
    filterFn,
    groupBy,
    placeholder = 'Rechercher...',
    value,
    orderBy,
    dropdownClassName,
    selectedIds,
    inline = false,
    dropdownUp = false,
}: SearchInputProps<T>) {
    const [query,   setQuery]   = useState('')
    const [open,    setOpen]    = useState(false)
    const [focused, setFocused] = useState(false)

    const displayValue = focused ? query : (value ?? query)

    const filtered = query.trim().length === 0 ? data : data.filter(item =>
        filterFn
            ? filterFn(item, query)
            : getLabel(item).toLowerCase().includes(query.toLowerCase())
    )

    const sorted = groupBy
        ? [...filtered].sort((a, b) => {
            const ga = groupBy(a), gb = groupBy(b)
            const primary = ga.primary.localeCompare(gb.primary)
            if (primary !== 0) return primary
            return (ga.secondary ?? '').localeCompare(gb.secondary ?? '')
        })
        : orderBy
        ? [...filtered].sort((a, b) => {
            const va = String((a as Record<string, unknown>)[orderBy] ?? '')
            const vb = String((b as Record<string, unknown>)[orderBy] ?? '')
            return va.localeCompare(vb, 'fr', { sensitivity: 'base' })
        })
        : filtered

    const isMulti = selectedIds !== undefined

    function select(item: T) {
        onSelect(item)
        if (!isMulti) {
            setQuery('')
            setFocused(false)
            setOpen(false)
        }
    }

    const showResults = inline ? sorted.length > 0 : (open && sorted.length > 0)

    return (
        <div className="relative flex-1">
            <Input
                value={displayValue}
                onChange={e => { setQuery(e.target.value); setOpen(true) }}
                onFocus={() => { setFocused(true); setQuery(''); setOpen(true) }}
                onBlur={inline ? undefined : () => setTimeout(() => { setOpen(false); setFocused(false); setQuery('') }, 150)}
                onKeyDown={e => e.stopPropagation()}
                placeholder={placeholder}
                className="h-8 text-xs"
            />
            {showResults && (
                <div
                    className={inline
                        ? `w-full${dropdownClassName ? ` ${dropdownClassName}` : ''}`
                        : `absolute z-50 w-full rounded-md border border-border bg-popover shadow-md overflow-hidden${dropdownUp ? ' bottom-full mb-1' : ' mt-1'}${dropdownClassName ? ` ${dropdownClassName}` : ''}`
                    }
                    onPointerMove={e => e.stopPropagation()}
                    onPointerLeave={e => e.stopPropagation()}
                >
                    <ul className="max-h-60 overflow-y-auto py-1">
                        {sorted.map((item, i) => {
                            const meta = groupBy ? groupBy(item) : null
                            const prev = groupBy && i > 0 ? groupBy(sorted[i - 1]) : null
                            const showPrimary = meta && meta.primary !== prev?.primary
                            const showSecondary = meta?.secondary && (showPrimary || meta.secondary !== prev?.secondary)
                            return (
                                <li key={item.id} className="contents">
                                    {showPrimary && (
                                        <div className="flex items-center gap-1.5 px-3 pt-2 pb-1 select-none">
                                            {meta.primaryStyle && (
                                                <span className="w-2 h-2 rounded-full shrink-0" style={meta.primaryStyle} />
                                            )}
                                            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                {meta.primary}
                                            </span>
                                        </div>
                                    )}
                                    {showSecondary && (
                                        <div className="px-5 pb-0.5 text-[10px] text-muted-foreground/70 italic select-none">
                                            {meta!.secondary}
                                        </div>
                                    )}
                                    <div
                                        onMouseDown={() => select(item)}
                                        className={`flex items-center justify-between gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-muted ${isMulti && selectedIds.includes(item.id) ? 'bg-indigo-50' : ''}`}
                                    >
                                        {renderItem ? renderItem(item) : <span>{getLabel(item)}</span>}
                                        {isMulti && selectedIds.includes(item.id) && (
                                            <span className="shrink-0 text-indigo-500 font-bold text-sm leading-none">✓</span>
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
