import React, { useState, useEffect } from 'react'
import {
    getProgram, getProjects, getStatuses, getPartners, getMembers,
    getFinancialAgreements, getAllProjectMembers, getActionCardsFull, getExpanses,
    getBudgetCategories, getBudgetDetails, updateProgram,
} from '@/lib/api'
import { type Program, type Project, type Status, type Partner, type Member, type FinancialAgreement, type ProjectMember, type ActionCardFull, type Expanse, type BudgetCategory, type BudgetDetail } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, Users, Briefcase, Building2, TrendingUp, Clock, Receipt, Pencil, Check, X, NetworkIcon, InfoIcon } from 'lucide-react'
import {ProjectViewerSheet, ActionCardViewerSheet} from '../components/viewers'
import PartnerGraph from '../components/partnerGraphView'
import MemberGraph from '../components/memberGraphView'
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import CalendarHeatmap, { type ReactCalendarHeatmapValue } from 'react-calendar-heatmap'
import 'react-calendar-heatmap/dist/styles.css'

// --- Helpers ---

function fmt(n: number) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.', ',') + ' M€'
    if (n >= 1_000)     return (n / 1_000).toFixed(0) + ' k€'
    return n.toLocaleString('fr-FR') + ' €'
}

function daysFromNow(dateStr: string): number {
    const d = new Date(dateStr)
    const now = new Date()
    return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function progressPercent(start: string, end: string): number {
    const s = new Date(start).getTime()
    const e = new Date(end).getTime()
    const now = Date.now()
    if (now <= s) return 0
    if (now >= e) return 100
    return Math.round(((now - s) / (e - s)) * 100)
}

// --- Sous-composants ---

function KpiCard({ icon, label, value, sub, accent }: {
    icon: React.ReactNode
    label: string
    value: string | number
    sub?: string
    accent?: string
}) {
    return (
        <div className="flex flex-col gap-2 p-4 rounded-xl border bg-card">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
                <span className="text-muted-foreground">{icon}</span>
            </div>
            <span className="text-2xl font-semibold tabular-nums" style={accent ? { color: accent } : {}}>{value}</span>
            {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
        </div>
    )
}


function AlertCard({ project, statusLabel, daysLeft, memberCount, grant, onOpen }: {
    project:     Project
    statusLabel: string
    daysLeft:    number
    memberCount: number
    grant:       number
    onOpen:      (p: Project) => void
}) {
    const overdue = daysLeft < 0
    return (
        <div
            onClick={() => onOpen(project)}
            className="cursor-pointer rounded-xl border bg-card p-4 flex flex-col gap-2 hover:shadow-md transition-shadow mt-2"
        >
            <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-sm leading-tight">{project.title}</span>
                <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${overdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {overdue ? `${Math.abs(daysLeft)}j de retard` : `dans ${daysLeft}j`}
                </span>
            </div>
            {project.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <span className="px-1.5 py-0.5 rounded bg-muted">{statusLabel}</span>
                <span className="flex items-center gap-1"><Users size={11} /> {memberCount}</span>
                {grant > 0 && <span className="flex items-center gap-1"><TrendingUp size={11} /> {fmt(grant)}</span>}
                {project.end_date && <span className="flex items-center gap-1 ml-auto"><Clock size={11} /> {new Date(project.end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
            </div>
        </div>
    )
}

function ActionAlert({ card, daysLeft, onOpen }: {
    card:    ActionCardFull
    daysLeft: number
    onOpen:  (c: ActionCardFull) => void
}) {
    const overdue = daysLeft < 0
    return (
        <div
            onClick={() => onOpen(card)}
            className="cursor-pointer rounded-xl border bg-card p-4 flex flex-col gap-2 hover:shadow-md transition-shadow mt-2"
        >
            <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-sm leading-tight">{card.title}</span>
                <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${overdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {overdue ? `${Math.abs(daysLeft)}j de retard` : `dans ${daysLeft}j`}
                </span>
            </div>
            {card.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{card.description}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <span className="px-1.5 py-0.5 rounded bg-muted">{card.status.label}</span>
                {card.owner && (
                    <span className="flex items-center gap-1">
                        <Users size={11} /> {card.owner.first_name} {card.owner.last_name}
                    </span>
                )}
                {card.end_date && (
                    <span className="flex items-center gap-1 ml-auto">
                        <Clock size={11} /> {new Date(card.end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                )}
            </div>
        </div>
    )
}

// --- Vue principale ---

export default function Dashboard() {

    const currentYear = new Date().getFullYear()
    const [loading, setLoading] = useState(true)

    const [program,        setProgram]        = useState<Program | null>(null)
    const [projects,       setProjects]       = useState<Project[]>([])
    const [actionCards,    setActionCards]    = useState<ActionCardFull[]>([])
    const [openProject, setOpenProject]       = useState<Project | null>(null)
    const [openCard, setOpenCard]         = useState<ActionCardFull | null>(null)
    const [staffModal, setStaffModal]         = useState<{ member: import('@/lib/types').Member; assignments: { project: import('@/lib/types').Project; role: string }[] } | null>(null)
    const [statuses,       setStatuses]       = useState<Status[]>([])
    const [partners,       setPartners]       = useState<Partner[]>([])
    const [members,        setMembers]        = useState<Member[]>([])
    const [agreements,     setAgreements]     = useState<FinancialAgreement[]>([])
    const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([])
    const [expanses,          setExpanses]          = useState<Expanse[]>([])
    const [budgetCategories,  setBudgetCategories]  = useState<BudgetCategory[]>([])
    const [budgetDetails,     setBudgetDetails]     = useState<BudgetDetail[]>([])
    const [editingFeeRate,    setEditingFeeRate]    = useState(false)
    const [feeRateDraft,      setFeeRateDraft]      = useState('')
    const [heatYear, setHeatYear] = useState(currentYear)

    async function saveFeeRate() {
        if (!program) return
        const rate = feeRateDraft.trim() === '' ? null : parseFloat(feeRateDraft)
        await updateProgram(program.id, { management_fee_rate: isNaN(rate as number) ? null : rate })
        setProgram(p => p ? { ...p, management_fee_rate: isNaN(rate as number) ? null : rate } : p)
        setEditingFeeRate(false)
    }

    useEffect(() => {
        Promise.all([
            getProgram(),
            getProjects(),
            getStatuses(),
            getPartners(),
            getMembers(),
            getFinancialAgreements(),
            getAllProjectMembers(),
            getActionCardsFull(),
            getExpanses(),
            getBudgetCategories(),
            getBudgetDetails(),
        ]).then(([prog, proj, stat, part, memb, agr, pm, ac, exp, cats, details]) => {
            setProgram((prog as Program[])[0] ?? null)
            setProjects(proj as Project[])
            setStatuses(stat as Status[])
            setPartners(part as Partner[])
            setMembers(memb as Member[])
            setAgreements(agr as FinancialAgreement[])
            setProjectMembers(pm as ProjectMember[])
            setActionCards(ac as ActionCardFull[])
            setExpanses(exp as Expanse[])
            setBudgetCategories(cats as BudgetCategory[])
            setBudgetDetails(details as BudgetDetail[])
        }).finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <div className="m-5 flex flex-col gap-6">
                <Skeleton className="h-28 w-full rounded-xl" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {[1,2].map(i => <Skeleton key={i} className="h-52 rounded-xl" />)}
                </div>
            </div>
        )
    }

    // ── Calculs ──

    const projectStatusMap = new Map(statuses.filter(s => s.context === 'project').map(s => [s.id, s]))
    const activeStatuses   = ['En cours', 'En attente', 'Suspendu']
    const activeProjects   = projects.filter(p => activeStatuses.includes(projectStatusMap.get(p.status_id)?.label ?? ''))
    const totalGrant           = agreements.reduce((s, a) => s + a.grant, 0)
    const totalBudget          = projects.reduce((s, p) => s + p.budget, 0)
    const totalExpanses        = expanses.reduce((s, e) => s + e.amount, 0)
    const totalReversements    = expanses.filter(e => e.agreement_id != null).reduce((s, e) => s + e.amount, 0)

    // - Heat Map - [...{date : 'YYYY-DD-MM', count : number}]

    function getDatesBetween(startDate: Date, endDate: Date) {
        // Validate inputs
        if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
            throw new Error("Invalid date objects");
        }
        
        // Normalize to midnight to avoid time zone issues
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(0, 0, 0, 0);

        const dates = [];
        const currentDate = new Date(start); // Create a copy

        while (currentDate <= end) {
            dates.push(new Date(currentDate)); // Push a copy
            currentDate.setDate(currentDate.getDate() + 1); // Increment by 1 day
        }
        
        return dates;
        }

    const validProjects = projects.filter(p => p.start_date && p.end_date)

    const heatmapValues = (() => {
        if (validProjects.length === 0) return []

        const yearStart = new Date(`${heatYear}-01-01`)
        const yearEnd   = new Date(`${heatYear}-12-31`)
        const dates = getDatesBetween(yearStart, yearEnd)
        const dateMap = new Map<string, { date: Date, count: number }>()

        dates.forEach(date => {
            const key = date.toISOString().split('T')[0]
            if (!dateMap.has(key)) dateMap.set(key, { date, count: 0 })
            validProjects.forEach(p => {
                if (date >= new Date(p.start_date) && date <= new Date(p.end_date)) {
                    dateMap.get(key)!.count++
                }
            })
        })

        return Array.from(dateMap.values()).map(({ date, count }) => ({
            date: date.toISOString().split('T')[0],
            count,
        }))
    })()



    // Top partenaires par subvention
    const grantByPartner = new Map<number, number>()
    agreements.forEach(a => {
        grantByPartner.set(a.partner_id, (grantByPartner.get(a.partner_id) ?? 0) + a.grant)
    })
    const topPartners = [...grantByPartner.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([id, grant]) => ({ partner: partners.find(p => p.id === id), grant }))
        .filter(r => r.partner)
    // ── Alertes ──

    // Projets se terminant dans < 60 jours
    const endingSoon = projects.filter(p => {
        if (!p.end_date) return false
        const d = daysFromNow(p.end_date)
        const label = projectStatusMap.get(p.status_id)?.label ?? ''
        return d >= 0 && d <= 60 && activeStatuses.includes(label)
    })

    console.log(endingSoon)
    console.log('statuses:', statuses.filter(s => s.context === 'project').map(s => s.label))
    console.log('project end_dates:', projects.map(p => p.end_date))
    console.log('endingSoon:', endingSoon)

    // Projets dont la date de fin est dépassée mais encore actifs
    const overdueProjects = projects.filter(p => {
        if (!p.end_date) return false
        const label = projectStatusMap.get(p.status_id)?.label ?? ''
        return daysFromNow(p.end_date) < 0 && activeStatuses.includes(label)
    })

    const activeActionStatuses = ['En cours', 'Planifié', 'À traiter']

    // Actions se terminant dans < 14 jours
    const actionEndingSoon = actionCards.filter(ac => {
        if (!ac.end_date) return false
        const d = daysFromNow(ac.end_date)
        return d >= 0 && d <= 14 && activeActionStatuses.includes(ac.status.label)
    })

    // Actions dont la date de fin est dépassée mais encore actives
    const overdueActionCards = actionCards.filter(ac => {
        if (!ac.end_date) return false
        return daysFromNow(ac.end_date) < 0 && activeActionStatuses.includes(ac.status.label)
    })

    // Conventions non signées
    const unsignedAgreements = agreements
        .filter(a => !a.signed_date)
        .map(a => {
            const project = projects.find(p => p.id === a.project_id)
            return `"${a.title}"${project ? ` (${project.title})` : ''}`
        })

    // Projets sans membres assignés
    const projectsWithoutMembers = projects
        .filter(p => {
            const label = projectStatusMap.get(p.status_id)?.label ?? ''
            return activeStatuses.includes(label) && !projectMembers.some(pm => pm.project_id === p.id)
        })
        .map(p => `"${p.title}"`)

    const hasAlerts = endingSoon.length + overdueProjects.length + actionEndingSoon.length + overdueActionCards.length + unsignedAgreements.length + projectsWithoutMembers.length > 0

    // ── Membres staff & leurs projets ──
    const staffMembers = members.filter(m => m.is_staff)
    const staffWithProjects = staffMembers.map(m => {
        const assignments = projectMembers
            .filter(pm => pm.member_id === m.id)
            .map(pm => ({ project: projects.find(p => p.id === pm.project_id)!, role: pm.role }))
            .filter(a => a.project != null)
        return { member: m, assignments }
    })

    // ── Programme ──
    const progPercent = program ? progressPercent(program.start_date, program.end_date) : 0
    const progDaysLeft = program ? daysFromNow(program.end_date) : null
    const progYearsLeft = progDaysLeft !== null ? (progDaysLeft / 365).toFixed(1) : null

    const STATUS_COLORS: Record<string, string> = {
        'En cours':   '#d1fae5',
        'Terminé':    '#f3f4f6',
        'Suspendu':   '#fef9c3',
        'En attente': '#dbeafe',
        'Planifié':   '#fef9c3',
    }

    return (
        <>
        <div className="m-5 flex flex-col gap-6 pb-10">

            {/* ── En-tête Programme ── */}
            {program && (
                <div className="rounded-xl overflow-hidden" style={{ position: 'relative', background: '#f0f2ff' }}>
                    <style>{`
                        @keyframes _blob1 {
                            0%   { transform: translate(0px, 0px) scale(1); }
                            25%  { transform: translate(60px, -40px) scale(1.08); }
                            50%  { transform: translate(20px, 50px) scale(0.92); }
                            75%  { transform: translate(-50px, 10px) scale(1.05); }
                            100% { transform: translate(0px, 0px) scale(1); }
                        }
                        @keyframes _blob2 {
                            0%   { transform: translate(0px, 0px) scale(1); }
                            30%  { transform: translate(-70px, 30px) scale(1.1); }
                            60%  { transform: translate(40px, -50px) scale(0.9); }
                            100% { transform: translate(0px, 0px) scale(1); }
                        }
                        @keyframes _blob3 {
                            0%   { transform: translate(0px, 0px) scale(1); }
                            40%  { transform: translate(50px, 40px) scale(0.88); }
                            70%  { transform: translate(-30px, -30px) scale(1.12); }
                            100% { transform: translate(0px, 0px) scale(1); }
                        }
                        @keyframes _blob4 {
                            0%   { transform: translate(0px, 0px) scale(1); }
                            35%  { transform: translate(-40px, -50px) scale(1.1); }
                            70%  { transform: translate(60px, 20px) scale(0.9); }
                            100% { transform: translate(0px, 0px) scale(1); }
                        }
                    `}</style>
                    {/* Blobs animés */}
                    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                        <div style={{
                            position: 'absolute', width: 360, height: 360,
                            borderRadius: '62% 38% 70% 30% / 44% 58% 42% 56%',
                            background: '#8ca2fa', filter: 'blur(72px)', opacity: 0.75,
                            top: -120, left: -80,
                            animation: '_blob1 12s ease-in-out infinite',
                            willChange: 'transform',
                        }} />
                        <div style={{
                            position: 'absolute', width: 300, height: 300,
                            borderRadius: '38% 62% 30% 70% / 56% 44% 56% 44%',
                            background: '#dbeafe', filter: 'blur(64px)', opacity: 0.65,
                            bottom: -100, right: '20%',
                            animation: '_blob2 16s ease-in-out infinite',
                            willChange: 'transform',
                        }} />
                        <div style={{
                            position: 'absolute', width: 340, height: 240,
                            borderRadius: '50% 50% 38% 62% / 62% 44% 56% 38%',
                            background: '#9e8ded', filter: 'blur(56px)', opacity: 0.7,
                            top: -60, right: '5%',
                            animation: '_blob3 9s ease-in-out infinite',
                            willChange: 'transform',
                        }} />
                        <div style={{
                            position: 'absolute', width: 200, height: 200,
                            borderRadius: '70% 30% 50% 50% / 38% 62% 38% 62%',
                            background: '#aedef8', filter: 'blur(50px)', opacity: 0.6,
                            bottom: -40, left: '35%',
                            animation: '_blob4 14s ease-in-out infinite',
                            willChange: 'transform',
                        }} />
                    </div>
                    {/* Voile glossy matte */}
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.42)', backdropFilter: 'blur(0.5px)' }} />
                    {/* Contenu */}
                    <div className="relative z-10 flex flex-col gap-3 p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Programme</span>
                                <h1 className="text-4xl font-semibold">{program.name}</h1>
                                {program.description && <p className="text-sm text-muted-foreground max-w-md mt-0.5">{program.description}</p>}
                            </div>
                            <div className="flex flex-col items-end gap-0.5 shrink-0">
                                <span className="text-XL text-black">
                                    {new Date(program.start_date).getFullYear()} — {new Date(program.end_date).getFullYear()}
                                </span>
                                <span className="text-2XL font-medium">
                                    {progPercent}% écoulé
                                    {progYearsLeft && parseFloat(progYearsLeft) > 0
                                        ? ` · ${progYearsLeft} ans restants`
                                        : ' · Programme terminé'}
                                </span>
                                {progDaysLeft !== null && progDaysLeft <= 365 && progDaysLeft > 0 && (
                                    <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                                        <AlertTriangle size={11} /> Moins d'un an restant
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="h-1 w-full rounded-full bg-black/10 overflow-hidden">
                            <div className="h-full rounded-full bg-black/20 transition-all" style={{ width: `${progPercent}%` }} />
                        </div>
                    </div>
                </div>
            )}

            {/* ── KPIs ── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <KpiCard
                    icon={<Briefcase size={16} />}
                    label="Projets actifs"
                    value={activeProjects.length}
                    sub={`${projects.length} au total`}
                />
                <KpiCard
                    icon={<Building2 size={16} />}
                    label="Partenaires"
                    value={partners.length}
                    sub={`dont ${partners.filter(p => p.consortium).length} faisant partie du consortium`}
                />
                <KpiCard
                    icon={<TrendingUp size={16} />}
                    label="Budget engagé"
                    value={fmt(totalExpanses)}
                    sub={program?.budget
                        ? `${Math.round((totalExpanses / program.budget) * 100)} % du budget programme`
                        : `sur ${fmt(totalBudget)} projets`
                    }
                />
                <KpiCard
                    icon={<Receipt size={16} />}
                    label="Dépenses réalisées"
                    value={fmt(totalExpanses)}
                    sub={totalReversements > 0 ? `dont ${fmt(totalReversements)} reversés aux partenaires` : totalGrant > 0 ? `${agreements.length} convention${agreements.length > 1 ? 's' : ''}` : undefined}
                />
                <KpiCard
                    icon={<Users size={16} />}
                    label="Contacts"
                    value={members.length}
                    sub={`${members.filter(m => m.is_staff).length} dans l'équipe`}
                />
            </div>

            {/* ── Graphiques ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

                {/* ── Courbe cumulative des dépenses ── */}
                {expanses.length > 0 && (() => {
                    // Grouper par année
                    const byYear = new Map<string, number>()
                    expanses.forEach(e => {
                        const year = e.purchase_date?.slice(0, 4)
                        if (!year || year < '2000') return
                        byYear.set(year, (byYear.get(year) ?? 0) + e.amount)
                    })
                    const sortedYears = [...byYear.entries()].sort((a, b) => a[0].localeCompare(b[0]))
                    if (sortedYears.length === 0) return null

                    // Points cumulatifs — un par année, plus un point à 0 en début
                    let cum = 0
                    const points = [
                        { year: '', cum: 0, amount: 0 },
                        ...sortedYears.map(([year, amount]) => {
                            cum += amount
                            return { year, amount, cum }
                        })
                    ]
                    const maxCum = points[points.length - 1].cum

                    // Paramètres SVG
                    const W = 560, H = 120, ML = 48, MB = 22, MT = 8, MR = 12
                    const iW = W - ML - MR, iH = H - MT - MB
                    const xOf = (i: number) => ML + (i / Math.max(points.length - 1, 1)) * iW
                    const yOf = (v: number) => MT + iH - (v / maxCum) * iH

                    const linePts = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(p.cum).toFixed(1)}`).join(' ')
                    const areaPath = `${linePts} L${xOf(points.length - 1).toFixed(1)},${(MT + iH).toFixed(1)} L${xOf(0).toFixed(1)},${(MT + iH).toFixed(1)} Z`
                    const yTicks = [0, 0.5, 1].map(f => ({ value: maxCum * f, y: yOf(maxCum * f) }))

                    return (
                        <div className="flex flex-col gap-3 p-5 rounded-xl border bg-card">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">Progression cumulée des dépenses</p>
                                <span className="text-xs text-muted-foreground tabular-nums">Total : {fmt(maxCum)}</span>
                            </div>
                            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 140 }}>
                                {yTicks.map(({ value, y }) => (
                                    <g key={value}>
                                        <line x1={ML} y1={y} x2={W - MR} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                                        <text x={ML - 4} y={y + 3.5} textAnchor="end" fontSize="9" fill="#9ca3af">{fmt(value)}</text>
                                    </g>
                                ))}
                                <path d={areaPath} fill="#3b82f6" fillOpacity="0.1" />
                                <path d={linePts} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                                {points.map((p, i) => p.year && (
                                    <g key={p.year}>
                                        <circle cx={xOf(i)} cy={yOf(p.cum)} r="4" fill="white" stroke="#3b82f6" strokeWidth="2" />
                                        <text x={xOf(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="#9ca3af">{p.year}</text>
                                        <text x={xOf(i)} y={yOf(p.cum) - 8} textAnchor="middle" fontSize="9" fill="#3b82f6" fontWeight="600">{fmt(p.cum)}</text>
                                    </g>
                                ))}
                                <line x1={ML} y1={MT + iH} x2={W - MR} y2={MT + iH} stroke="#e5e7eb" strokeWidth="1" />
                            </svg>
                        </div>
                    )
                })()}


                {/* Consommation budgétaire par catégorie */}
                <div className="flex flex-col gap-3 p-5 rounded-xl border bg-card">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Consommation budgétaire</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {editingFeeRate ? (
                                <>
                                    <span>Frais de gestion</span>
                                    <input
                                        type="number" min={0} max={100} step={0.1}
                                        value={feeRateDraft}
                                        onChange={e => setFeeRateDraft(e.target.value)}
                                        className="w-16 h-6 border rounded px-1.5 text-xs text-foreground"
                                        placeholder="0"
                                        autoFocus
                                        onKeyDown={e => { if (e.key === 'Enter') saveFeeRate(); if (e.key === 'Escape') setEditingFeeRate(false) }}
                                    />
                                    <span>%</span>
                                    <button onClick={saveFeeRate} className="text-green-600 hover:text-green-700"><Check size={12} /></button>
                                    <button onClick={() => setEditingFeeRate(false)} className="text-muted-foreground hover:text-foreground"><X size={12} /></button>
                                </>
                            ) : (
                                <button
                                    onClick={() => { setFeeRateDraft(program?.management_fee_rate != null ? String(program.management_fee_rate) : ''); setEditingFeeRate(true) }}
                                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                                    title="Définir les frais de gestion"
                                >
                                    {program?.management_fee_rate != null
                                        ? `Frais gestion : ${program.management_fee_rate} %`
                                        : 'Frais de gestion'
                                    }
                                    <Pencil size={10} />
                                </button>
                            )}
                        </div>
                    </div>
                    {budgetCategories.length === 0
                        ? <p className="text-xs text-muted-foreground italic">Aucune catégorie budgétaire</p>
                        : (() => {
                            const totalBudget = budgetDetails.reduce((s, d) => s + d.budget, 0)
                            const totalSpent  = expanses.reduce((s, e) => s + e.amount, 0)
                            const totalReste  = totalBudget - totalSpent
                            return (
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b text-muted-foreground">
                                            <th className="text-left font-normal pb-1.5">Catégorie</th>
                                            <th className="text-right font-normal pb-1.5 pl-3">Budget</th>
                                            <th className="text-right font-normal pb-1.5 pl-3">Engagé</th>
                                            <th className="text-right font-normal pb-1.5 pl-3">Reste</th>
                                            <th className="text-right font-normal pb-1.5 pl-3">%</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {budgetCategories.map(cat => {
                                            const details   = budgetDetails.filter(d => d.budget_category_id === cat.id)
                                            const catBudget = details.reduce((s, d) => s + d.budget, 0)
                                            const catSpent  = expanses.filter(e => details.some(d => d.id === e.budget_detail_id)).reduce((s, e) => s + e.amount, 0)
                                            const catReste  = catBudget - catSpent
                                            const catPct    = catBudget > 0 ? Math.round(catSpent / catBudget * 100) : 0
                                            const catOver   = catReste < 0
                                            return (
                                                <React.Fragment key={cat.id}>
                                                    <tr className="border-b border-muted/60">
                                                        <td className="py-1.5 font-medium">{cat.title}</td>
                                                        <td className="py-1.5 pl-3 text-right tabular-nums">{fmt(catBudget)}</td>
                                                        <td className="py-1.5 pl-3 text-right tabular-nums">{fmt(catSpent)}</td>
                                                        <td className="py-1.5 pl-3 text-right tabular-nums" style={{ color: catOver ? '#ef4444' : undefined }}>{fmt(catReste)}</td>
                                                        <td className="py-1.5 pl-3 text-right tabular-nums" style={{ color: catOver ? '#ef4444' : catPct > 80 ? '#f59e0b' : '#22c55e' }}>{catPct} %</td>
                                                    </tr>
                                                </React.Fragment>
                                            )
                                        })}
                                        {totalBudget > 0 && (
                                            <tr className="border-t-2 font-medium">
                                                <td className="pt-2">Total</td>
                                                <td className="pt-2 pl-3 text-right tabular-nums">{fmt(totalBudget)}</td>
                                                <td className="pt-2 pl-3 text-right tabular-nums">{fmt(totalSpent)}</td>
                                                <td className="pt-2 pl-3 text-right tabular-nums" style={{ color: totalReste < 0 ? '#ef4444' : undefined }}>{fmt(totalReste)}</td>
                                                <td className="pt-2 pl-3 text-right tabular-nums text-muted-foreground">{Math.round(totalSpent / totalBudget * 100)} %</td>
                                            </tr>
                                        )}
                                        {program?.management_fee_rate != null && totalSpent > 0 && (() => {
                                            const feeAmt = Math.round(totalSpent * program.management_fee_rate / 100)
                                            return (
                                                <tr className="border-t text-muted-foreground">
                                                    <td className="pt-1.5 text-xs italic">Frais de gestion ({program.management_fee_rate} %)</td>
                                                    <td className="pt-1.5 pl-3 text-right tabular-nums text-xs">—</td>
                                                    <td className="pt-1.5 pl-3 text-right tabular-nums text-xs">{fmt(feeAmt)}</td>
                                                    <td className="pt-1.5 pl-3 text-right tabular-nums text-xs">—</td>
                                                    <td />
                                                </tr>
                                            )
                                        })()}
                                    </tbody>
                                </table>
                            )
                        })()
                    }
                </div>

                <div className="flex flex-col gap-3 p-5 rounded-xl border bg-card">
                    <style>{`
                        .react-calendar-heatmap .color-empty    { fill: #f5f3ff; }
                        .react-calendar-heatmap .color-scale-1  { fill: #ede9fe; }
                        .react-calendar-heatmap .color-scale-2  { fill: #ddd6fe; }
                        .react-calendar-heatmap .color-scale-3  { fill: #c4b5fd; }
                        .react-calendar-heatmap .color-scale-4  { fill: #a78bfa; }
                        .react-calendar-heatmap .color-scale-5  { fill: #8b5cf6; }
                        .react-calendar-heatmap .color-scale-6  { fill: #7c3aed; }
                        .react-calendar-heatmap .color-scale-7  { fill: #6d28d9; }
                        .react-calendar-heatmap .color-scale-8  { fill: #5b21b6; }
                        .react-calendar-heatmap .color-scale-9  { fill: #4c1d95; }
                        .react-calendar-heatmap .color-scale-10 { fill: #2e1065; }
                    `}</style>
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Heat Map projet</p>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setHeatYear(y => y - 1)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">‹</button>
                            <span className="text-xs font-medium tabular-nums w-10 text-center">{heatYear}</span>
                            <button onClick={() => setHeatYear(y => y + 1)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">›</button>
                        </div>
                    </div>
                    <CalendarHeatmap
                        startDate={new Date(`${heatYear}-01-01`)}
                        endDate={new Date(`${heatYear}-12-31`)}
                        values={heatmapValues}
                        classForValue={(() => {
                            const max = Math.max(1, ...heatmapValues.map(v => v.count))
                            return (value: ReactCalendarHeatmapValue<string> | undefined) => {
                                const count = (value as any)?.count as number | undefined
                                if (!count) return 'color-empty'
                                const ratio = count / max
                                if (ratio < 0.10) return 'color-scale-1'
                                if (ratio < 0.20) return 'color-scale-2'
                                if (ratio < 0.30) return 'color-scale-3'
                                if (ratio < 0.40) return 'color-scale-4'
                                if (ratio < 0.50) return 'color-scale-5'
                                if (ratio < 0.60) return 'color-scale-6'
                                if (ratio < 0.70) return 'color-scale-7'
                                if (ratio < 0.80) return 'color-scale-8'
                                if (ratio < 0.90) return 'color-scale-9'
                                return 'color-scale-10'
                            }
                        })()}
                    />
                </div>

                {/* Top partenaires — camembert */}
                <div className="flex flex-col gap-4 p-5 rounded-xl border bg-card">
                    <p className="text-sm font-medium">Top partenaires par subvention</p>
                    {topPartners.length === 0
                        ? <p className="text-xs text-muted-foreground italic">Aucune convention enregistrée</p>
                        : (() => {
                            const total = topPartners.reduce((s, r) => s + r.grant, 0)
                            const R = 54, C = 2 * Math.PI * R
                            let offset = 0
                            return (
                                <div className="flex items-center gap-6">
                                    <svg width="140" height="140" viewBox="0 0 140 140" className="shrink-0 -rotate-90">
                                        {topPartners.map(({ partner, grant }) => {
                                            const pct   = grant / total
                                            const dash  = pct * C
                                            const gap   = C - dash
                                            const seg   = offset
                                            offset += dash
                                            return (
                                                <circle
                                                    key={partner!.id}
                                                    cx="70" cy="70" r={R}
                                                    fill="none"
                                                    stroke={partner!.color || '#e5e7eb'}
                                                    strokeWidth="22"
                                                    strokeDasharray={`${dash} ${gap}`}
                                                    strokeDashoffset={-seg}
                                                />
                                            )
                                        })}
                                    </svg>
                                    <div className="flex flex-col gap-2 min-w-0">
                                        {topPartners.map(({ partner, grant }) => (
                                            <div key={partner!.id} className="flex items-center gap-2 min-w-0">
                                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: partner!.color || '#e5e7eb' }} />
                                                <span className="text-xs text-muted-foreground truncate">{partner!.name}</span>
                                                <span className="text-xs font-medium tabular-nums ml-auto pl-2 text-green-700 shrink-0">{fmt(grant)}</span>
                                            </div>
                                        ))}
                                        <div className="pt-1 border-t mt-1 text-xs text-muted-foreground">
                                            Total : <span className="font-semibold text-foreground">{fmt(total)}</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })()
                    }
                </div>
            </div>

            {/* ── Graphes de relations ── */}
            <div className="flex flex-col gap-4">
                
                <p className="text-sm font-medium flex items-center gap-2">
                    <NetworkIcon size={15} />
                    Graph
                </p>
                
                
                <div className="flex flex-row gap-4">
                    <div className="rounded-xl border bg-card p-5 flex-1 min-w-0">
                        <div className='flex justify-between items-center mb-3'>
                            <div>
                                <p className="text-sm font-medium item-center">Réseau partenaires - {partners.length}</p>
                            </div>

                            <div>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <InfoIcon size={13}/>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Modélise les relations entre partenaires en fonction des projets sur lesquels ils coopèrent. 
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </div>
                        <PartnerGraph />
                    </div>
                    <div className="rounded-xl border bg-card p-5 flex-1 min-w-0">
                        <div className='flex justify-between items-center mb-3'>
                             <p className="text-sm font-medium">Réseau membres - {members.length}</p>
                             <Tooltip>
                                <TooltipTrigger>
                                    <InfoIcon size={13}/>
                                </TooltipTrigger>
                                <TooltipContent>
                                    Modélise les relations entre membres en fonction des projets sur lesquels ils coopèrent. 
                                </TooltipContent>
                            </Tooltip>
                        </div>
                        <MemberGraph />
                    </div>
                </div>
            </div>

            {staffWithProjects.length > 0 && (
                <div className="flex flex-col gap-3">
                    <p className="text-sm font-medium flex items-center gap-2">
                        <Users size={15} />
                        Équipe
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                        {staffWithProjects.map(({ member, assignments }) => {
                            const activeCount = assignments.filter(a => activeStatuses.includes(projectStatusMap.get(a.project.status_id)?.label ?? '')).length
                            const roleBreakdown = ['Responsable', 'Co-responsable', 'Contributeur'].map(r => ({
                                role: r,
                                count: assignments.filter(a => a.role === r).length,
                            })).filter(r => r.count > 0)
                            return (
                                <button
                                    key={member.id}
                                    onClick={() => setStaffModal({ member, assignments })}
                                    className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-left hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center gap-2.5">
                                        {member.profile_image
                                            ? <img src={member.profile_image} className="w-9 h-9 rounded-full object-cover shrink-0" />
                                            : <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-semibold text-muted-foreground">
                                                {member.first_name[0]}{member.last_name[0]}
                                              </div>
                                        }
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">{member.first_name} {member.last_name}</p>
                                            <p className="text-xs text-muted-foreground truncate">{member.position || member.status}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                        <span className="flex items-center gap-1 text-muted-foreground">
                                            <Briefcase size={11} />
                                            <span className="font-medium text-foreground">{assignments.length}</span> projet{assignments.length > 1 ? 's' : ''}
                                        </span>
                                        {activeCount > 0 && (
                                            <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                                                {activeCount} actif{activeCount > 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
                                    {roleBreakdown.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {roleBreakdown.map(({ role, count }) => (
                                                <span key={role} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                                    {role} ({count})
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* ── Alertes ── */}
            {hasAlerts && (
                <div className="flex flex-col gap-3">
                    <p className="text-sm font-medium flex items-center gap-2">
                        <AlertTriangle size={15} className="text-amber-500" />
                        Points d'attention
                    </p>
                    <div className="grid grid-cols-4 md:grid-cols-4 gap-3">
                        {endingSoon.length > 0 && (
                            <>  
                            <div>
                                 <p className='text-xs text-gray-500 mb-2'>Projets se terminant bientôt</p>
                                 <Separator />
                                    {endingSoon.map(p => (
                                        <AlertCard
                                            key={p.id}
                                            project={p}
                                            statusLabel={projectStatusMap.get(p.status_id)?.label ?? ''}
                                            daysLeft={daysFromNow(p.end_date)}
                                            memberCount={projectMembers.filter(pm => pm.project_id === p.id).length}
                                            grant={agreements.filter(a => a.project_id === p.id).reduce((s, a) => s + a.grant, 0)}
                                            onOpen={p => setOpenProject(p)}
                                        />
                                    ))}

                            </div>
                               
                            </>
                        )}

                        {overdueProjects.length > 0 && (
                            <>
                            <div>
                                <p className='text-xs text-gray-500 mb-2'>Projets en retard</p>
                                 <Separator />
                                {overdueProjects.map(p => (
                                    <AlertCard
                                        key={p.id}
                                        project={p}
                                        statusLabel={projectStatusMap.get(p.status_id)?.label ?? ''}
                                        daysLeft={daysFromNow(p.end_date)}
                                        memberCount={projectMembers.filter(pm => pm.project_id === p.id).length}
                                        grant={agreements.filter(a => a.project_id === p.id).reduce((s, a) => s + a.grant, 0)}
                                        onOpen={p => setOpenProject(p)}
                                    />
                                ))}
                            </div>
                            </>
                        )}

                        {actionEndingSoon.length > 0 && (
                            <div>
                                <p className='text-xs text-gray-500 mb-2'>Actions se terminant bientôt</p>
                                <Separator />
                                {actionEndingSoon.map(a => (
                                    <ActionAlert
                                        key={a.id}
                                        card={a}
                                        daysLeft={daysFromNow(a.end_date)}
                                        onOpen={a => setOpenCard(a)}
                                    />
                                ))}
                            </div>
                        )}

                        {overdueActionCards.length > 0 && (
                            <div>
                                <p className='text-xs text-gray-500 mb-2'>Actions en retard</p>
                                <Separator />
                                {overdueActionCards.map(a => (
                                    <ActionAlert
                                        key={a.id}
                                        card={a}
                                        daysLeft={daysFromNow(a.end_date)}
                                        onOpen={a => setOpenCard(a)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}


            {!hasAlerts && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-green-200 bg-green-50 text-green-700 text-sm">
                    <span>✓</span>
                    <span>Aucune alerte — tout est en ordre.</span>
                </div>
            )}     

        </div>

        {openProject && (
            <ProjectViewerSheet
                project={openProject}
                open={!!openProject}
                onClose={() => setOpenProject(null)}
                onUpdated={p => {
                    setProjects(prev => prev.map(x => x.id === p.id ? { ...x, ...p } : x))
                    setOpenProject(p)
                }}
            />
        )}

        {openCard && (
            <ActionCardViewerSheet
                card={openCard}
                open={!!openCard}
                onClose={() => setOpenCard(null)}
                onUpdated={c => {
                    setActionCards(prev => prev.map(x => x.id === c.id ? { ...x, ...c } : x))
                    setOpenCard(c)
                }}
            />
        )}

        <Dialog open={!!staffModal} onOpenChange={open => { if (!open) setStaffModal(null) }}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {staffModal && (
                            <>
                                {staffModal.member.profile_image
                                    ? <img src={staffModal.member.profile_image} className="w-8 h-8 rounded-full object-cover" />
                                    : <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                                        {staffModal.member.first_name[0]}{staffModal.member.last_name[0]}
                                      </div>
                                }
                                <span>{staffModal.member.first_name} {staffModal.member.last_name}</span>
                            </>
                        )}
                    </DialogTitle>
                </DialogHeader>
                {staffModal && (
                    <div className="flex flex-col gap-2 mt-1 max-h-[60vh] overflow-y-auto">
                        {staffModal.assignments.length === 0 && (
                            <p className="text-sm text-muted-foreground italic">Aucun projet assigné.</p>
                        )}
                        {staffModal.assignments.map(({ project, role }) => {
                            const statusLabel = projectStatusMap.get(project.status_id)?.label ?? ''
                            return (
                                <button
                                    key={project.id}
                                    onClick={() => { setStaffModal(null); setOpenProject(project) }}
                                    className="w-full h-auto flex items-start gap-3 rounded-lg border bg-card p-3 text-left hover:shadow-sm transition-shadow"
                                >
                                    <span
                                        className="mt-1 w-2 h-2 rounded-full shrink-0"
                                        style={{ backgroundColor: STATUS_COLORS[statusLabel] ?? '#e5e7eb' }}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium break-words">{project.title}</p>
                                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                            <span className="px-1.5 py-0.5 rounded bg-muted">{statusLabel}</span>
                                            <span>{role}</span>
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}
            </DialogContent>
        </Dialog>

        </>
    )
}
