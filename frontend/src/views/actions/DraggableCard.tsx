import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import ActionCard, { type ActionCardData } from './ActionCard'

type Props = {
    card: ActionCardData
    onDeleted?: (id: number) => void
    onUpdated?: (patch: Partial<ActionCardData>) => void
    selectOn?: boolean
    selected?: boolean
    onToggle?: () => void
    onSelectMultiple?: () => void
    onSelectAll?: () => void
    selectedCards?: ActionCardData[]
}

export default function DraggableCard({ card, onDeleted, onUpdated, selectOn, selected, onToggle, onSelectMultiple, onSelectAll, selectedCards }: Props) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: card.id,
        disabled: selectOn,
    })

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform) }}
            className={`transition-opacity ${selectOn ? '' : 'touch-none'} ${isDragging ? 'opacity-40' : ''}`}
            {...(selectOn ? {} : { ...listeners, ...attributes })}
        >
            <ActionCard
                {...card}
                onDeleted={onDeleted}
                onUpdated={onUpdated}
                selectOn={selectOn}
                selected={selected}
                onToggle={onToggle}
                onSelectMultiple={onSelectMultiple}
                onSelectAll={onSelectAll}
                selectedCards={selectedCards}
            />
        </div>
    )
}
