import { lazy, Suspense, useEffect, useState } from 'react'
import {
    getProjectCalls, getAxes, getStatuses, getPartners,
    getMembersFull, getFormations, getTimeEntries,
} from '@/lib/api'
import type { Project, ProjectCall, Axis, Status, Partner, Formation, TimeEntry, MemberFull, ActionCardFull } from '@/lib/types'
import type { ProjectFull, ProjectCallFull } from '@/views/Projects'
import type { ActionCardData } from '@/views/actions/ActionCard'

const ProjectDetailSheetLazy = lazy(() =>
    import('@/views/Projects').then(m => ({ default: m.ProjectDetailSheet }))
)
const ActionCardDetailSheetLazy = lazy(() =>
    import('@/views/actions/ActionCard').then(m => ({ default: m.ActionCardDetailSheet }))
)

// --- ProjectViewerSheet ---

type ProjectRefData = {
    projectFull:  ProjectFull
    projectCalls: ProjectCallFull[]
    axes:         Axis[]
    statuses:     Status[]
    partners:     Partner[]
    members:      MemberFull[]
    formations:   Formation[]
    times:        TimeEntry[]
}

export function ProjectViewerSheet({ project, open, onClose, onUpdated }: { project: Project; open: boolean; onClose: () => void; onUpdated?: (p: Project) => void }) {
    const [refData, setRefData] = useState<ProjectRefData | null>(null)

    useEffect(() => {
        if (!open) return
        setRefData(null)
        Promise.all([
            getProjectCalls(),
            getAxes(),
            getStatuses(),
            getPartners(),
            getMembersFull(),
            getFormations(),
            getTimeEntries(),
        ]).then(([calls, axes, statuses, partners, members, formations, times]) => {
            const axisMap = new Map((axes as Axis[]).map(a => [a.id, a]))
            const fullCalls: ProjectCallFull[] = (calls as ProjectCall[]).map(c => ({
                ...c,
                axis: axisMap.get(c.axis_id) ?? { id: 0, name: 'Inconnu', description: '' },
            }))
            const callMap = new Map(fullCalls.map(c => [c.id, c]))
            const projectFull: ProjectFull = {
                ...project,
                projectCall: callMap.get(project.project_call_id) ?? {
                    id: 0, axis_id: 0, title: 'Inconnu', description: '',
                    start_date: '', end_date: '', status_id: 0, budget: 0,
                    axis: { id: 0, name: 'Inconnu', description: '' },
                },
            }
            setRefData({
                projectFull,
                projectCalls: fullCalls,
                axes: axes as Axis[],
                statuses: statuses as Status[],
                partners: partners as Partner[],
                members: members as MemberFull[],
                formations: formations as Formation[],
                times: times as TimeEntry[],
            })
        })
    }, [open, project.id])

    if (!refData) return null

    return (
        <Suspense fallback={null}>
            <ProjectDetailSheetLazy
                open={open}
                project={refData.projectFull}
                onClose={onClose}
                onUpdated={p => {
                    setRefData(prev => prev ? { ...prev, projectFull: { ...prev.projectFull, ...p } } : null)
                    onUpdated?.(p)
                }}
                onDeleted={() => {}}
                onAgreementAdded={() => {}}
                onAgreementDeleted={() => {}}
                partners={refData.partners}
                projectCalls={refData.projectCalls}
                axes={refData.axes}
                statuses={refData.statuses}
                members={refData.members}
                projectTimes={refData.times.filter(t => t.project_id === project.id)}
                axis={refData.axes}
                allFormations={refData.formations}
            />
        </Suspense>
    )
}

// --- ActionCardViewerSheet ---

function toActionCardData(card: ActionCardFull): ActionCardData {
    return {
        id: card.id,
        title: card.title,
        description: card.description,
        status: card.status,
        category: {
            id: card.category.id,
            title: card.category.title,
            color: card.category.color,
            parent: card.category.parent
                ? { id: card.category.parent.id, title: card.category.parent.title, color: card.category.parent.color }
                : undefined,
        },
        owner: card.owner
            ? { id: card.owner.id, first_name: card.owner.first_name, last_name: card.owner.last_name, position: card.owner.position }
            : undefined,
        start_date: card.start_date,
        end_date: card.end_date,
        full_address: card.full_address,
        lat: card.lat,
        lon: card.lon,
    }
}

export function ActionCardViewerSheet({ card, open, onClose, onUpdated }: { card: ActionCardFull; open: boolean; onClose: () => void; onUpdated?: (c: ActionCardFull) => void }) {
    return (
        <Suspense fallback={null}>
            <ActionCardDetailSheetLazy
                card={toActionCardData(card)}
                open={open}
                onClose={onClose}
                onUpdated={c => onUpdated?.(c as unknown as ActionCardFull)}
                onDeleted={() => {}}
            />
        </Suspense>
    )
}
