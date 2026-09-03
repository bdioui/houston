import { useRef, useState, useEffect, useCallback, useMemo } from "react"
import type { Partner, Project, ProjectPartner } from "@/lib/types"
import { getProjectPartners, getPartners, getProjects } from "@/lib/api"
import SearchInput from "@/components/SearchInput"
import { Users } from "lucide-react"

type Node    = { id: number; name: string; color: string }
type Edge    = { source: number; target: number; weight: number; projects: string[] }
type SimNode = Node & { x: number; y: number; vx: number; vy: number }

const REPULSION  = 4000
const SPRING     = 0.003
const TARGET_LEN = 160
const DAMPING    = 0.85
const GRAVITY    = 0.002
const MAX_LABEL  = 11

function trunc(name: string) {
    return name.length > MAX_LABEL ? name.slice(0, MAX_LABEL - 1) + '…' : name
}

function buildGraph(partners: Partner[], projects: Project[], projectPartners: ProjectPartner[]) {
    const nodes: Node[] = partners.map(p => ({ id: p.id, name: p.name, color: p.color }))
    const projectById   = new Map<number, string>(projects.map(p => [p.id, p.title]))
    const byProject     = new Map<number, number[]>()

    for (const pp of projectPartners) {
        const list = byProject.get(pp.project_id) ?? []
        list.push(pp.partner_id)
        byProject.set(pp.project_id, list)
    }

    const edgeMap = new Map<string, Edge>()
    for (const [projectId, partnerIds] of byProject) {
        const projectName = projectById.get(projectId) ?? `Projet ${projectId}`
        for (let i = 0; i < partnerIds.length; i++) {
            for (let j = i + 1; j < partnerIds.length; j++) {
                const a   = Math.min(partnerIds[i], partnerIds[j])
                const b   = Math.max(partnerIds[i], partnerIds[j])
                const key = `${a}-${b}`
                const ex  = edgeMap.get(key)
                if (ex) { ex.weight++; ex.projects.push(projectName) }
                else edgeMap.set(key, { source: a, target: b, weight: 1, projects: [projectName] })
            }
        }
    }
    return { nodes, edges: Array.from(edgeMap.values()) }
}

// ── Sidebar ────────────────────────────────────────────────────────────────
function Sidebar({
    nodes, edges, hoveredId, selectedIds, onHover, onSelect,
}: {
    nodes: Node[]
    edges: Edge[]
    hoveredId:   number | null
    selectedIds: number[]
    onHover:  (id: number | null) => void
    onSelect: (ids: number[]) => void
}) {
    const adjacency = useMemo(() => {
        const map = new Map<number, Set<number>>()
        for (const edge of edges) {
            if (!map.has(edge.source)) map.set(edge.source, new Set())
            if (!map.has(edge.target)) map.set(edge.target, new Set())
            map.get(edge.source)!.add(edge.target)
            map.get(edge.target)!.add(edge.source)
        }
        return map
    }, [edges])

    const sorted = useMemo(() =>
        [...nodes].sort((a, b) => (adjacency.get(b.id)?.size ?? 0) - (adjacency.get(a.id)?.size ?? 0)),
        [nodes, adjacency]
    )

    const maxLinks = useMemo(() =>
        Math.max(...nodes.map(n => adjacency.get(n.id)?.size ?? 0), 1),
        [nodes, adjacency]
    )

    const edgeMap = useMemo(() => {
        const map = new Map<string, Edge>()
        for (const e of edges) map.set(`${e.source}-${e.target}`, e)
        return map
    }, [edges])

    const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes])

    const selectedNeighbors = useMemo(() => {
        if (selectedIds.length === 0) return null
        const selSet = new Set(selectedIds)
        const neighborMap = new Map<number, Set<string>>()
        for (const selId of selectedIds) {
            for (const nid of adjacency.get(selId) ?? []) {
                if (selSet.has(nid)) continue
                if (!neighborMap.has(nid)) neighborMap.set(nid, new Set())
                const a = Math.min(selId, nid), b = Math.max(selId, nid)
                const edge = edgeMap.get(`${a}-${b}`)
                for (const p of edge?.projects ?? []) neighborMap.get(nid)!.add(p)
            }
        }
        return Array.from(neighborMap.entries()).flatMap(([nid, projs]) => {
            const nb = nodeMap.get(nid)
            if (!nb) return []
            return [{ node: nb, projects: Array.from(projs) }]
        })
    }, [selectedIds, adjacency, edgeMap, nodeMap])

    const allSelNeighborIds = useMemo(() => {
        if (selectedIds.length === 0) return null
        const s = new Set<number>()
        for (const selId of selectedIds) for (const nid of adjacency.get(selId) ?? []) s.add(nid)
        return s
    }, [selectedIds, adjacency])

    const uniqueProjects = selectedNeighbors ? new Set(selectedNeighbors.flatMap(n => n.projects)) : new Set<string>()

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="px-3 pt-3 pb-2 border-b border-gray-100 flex flex-col gap-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    Partenaires · {nodes.length}
                </p>
                <div className="flex items-center gap-1">
                    <SearchInput
                        data={sorted}
                        getLabel={n => n.name}
                        onSelect={n => {
                            const newIds = selectedIds.includes(n.id)
                                ? selectedIds.filter(id => id !== n.id)
                                : [...selectedIds, n.id]
                            onSelect(newIds)
                        }}
                        placeholder="Rechercher…"
                        selectedIds={selectedIds}
                        renderItem={n => (
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: n.color }} />
                                <span>{n.name}</span>
                            </span>
                        )}
                    />
                    {selectedIds.length > 0 && (
                        <button
                            onClick={() => onSelect([])}
                            className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Effacer la sélection"
                        >
                            ×
                        </button>
                    )}
                </div>
            </div>

            {selectedIds.length > 0 && (
                <div className="border-b border-indigo-100 bg-indigo-50 px-3 py-2 flex flex-col gap-1 shrink-0">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-indigo-600">
                            {selectedIds.length} partenaire{selectedIds.length > 1 ? 's' : ''} sélectionné{selectedIds.length > 1 ? 's' : ''}
                        </span>
                        <button onClick={() => onSelect([])} className="text-[10px] text-indigo-400 hover:text-indigo-600">
                            Effacer
                        </button>
                    </div>
                    {selectedNeighbors && (
                        <>
                            <p className="text-[10px] text-indigo-500">
                                {selectedNeighbors.length} partenaire{selectedNeighbors.length > 1 ? 's' : ''} en relation
                                {' · '}
                                {uniqueProjects.size} projet{uniqueProjects.size > 1 ? 's' : ''} en commun
                            </p>
                            {uniqueProjects.size > 0 && (
                                <div className="mt-0.5 max-h-20 overflow-y-auto flex flex-wrap gap-0.5">
                                    {Array.from(uniqueProjects).map((p, i) => (
                                        <span key={i} className="text-[8px] bg-white text-indigo-400 border border-indigo-200 rounded px-1 py-px leading-tight">
                                            {p}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            <div className="flex-1 overflow-y-auto">
                {sorted.map(node => {
                    const links      = adjacency.get(node.id)?.size ?? 0
                    const isHov      = hoveredId === node.id
                    const isSel      = selectedIds.includes(node.id)
                    const isNeighbor = allSelNeighborIds?.has(node.id) ?? false
                    const isDimmed   = selectedIds.length > 0 && !isSel && !isNeighbor

                    return (
                        <button
                            key={node.id}
                            className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                                isSel ? 'bg-indigo-50' : isHov ? 'bg-gray-50' : ''
                            } ${isDimmed ? 'opacity-30' : ''}`}
                            onMouseEnter={() => onHover(node.id)}
                            onMouseLeave={() => onHover(null)}
                            onClick={() => {
                                const newIds = isSel
                                    ? selectedIds.filter(id => id !== node.id)
                                    : [...selectedIds, node.id]
                                onSelect(newIds)
                            }}
                        >
                            <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ background: node.color ?? '#6366f1' }}
                            />
                            <span className={`text-xs truncate flex-1 ${isSel ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                {node.name}
                            </span>
                            <span className={`text-[10px] shrink-0 ${isSel ? 'text-indigo-500 font-semibold' : 'text-gray-400'}`}>
                                {links}
                            </span>
                            {isSel
                                ? <span className="text-indigo-500 font-bold text-sm shrink-0 leading-none">✓</span>
                                : (
                                    <div className="w-10 shrink-0">
                                        <div
                                            className="h-1 rounded-full"
                                            style={{ width: `${(links / maxLinks) * 100}%`, background: '#d1d5db' }}
                                        />
                                    </div>
                                )
                            }
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function PartnerGraph() {
    const canvasRef      = useRef<HTMLCanvasElement>(null)
    const containerRef   = useRef<HTMLDivElement>(null)
    const tooltipRef     = useRef<HTMLDivElement>(null)
    const hoveredRef         = useRef<number | null>(null)
    const selectedIdsRef     = useRef<number[]>([])
    const filterIdsRef       = useRef<Set<number> | null>(null)
    const consortiumOnlyRef  = useRef(false)
    const transformRef       = useRef({ x: 0, y: 0, scale: 1 })
    const fitSelectionRef    = useRef<(() => void) | null>(null)
    const [graph, setGraph]             = useState<{ nodes: Node[]; edges: Edge[] } | null>(null)
    const [hoveredId, setHoveredId]     = useState<number | null>(null)
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const [topN, setTopN]               = useState(50)
    const [fullscreen, setFullscreen]   = useState(false)
    const [consortiumListe, setConsortiumList] = useState<number[]>([])
    const [consortiumOnly, setConsortiumOnly] = useState(false)

    useEffect(() => {
        consortiumOnlyRef.current = consortiumOnly
        filterIdsRef.current = consortiumOnly ? new Set(consortiumListe) : null
    }, [consortiumOnly, consortiumListe])

    useEffect(() => {
        Promise.all([getPartners(), getProjects(), getProjectPartners()])
            .then(([p, proj, pp]) => {
                setGraph(buildGraph(p, proj, pp))
                setConsortiumList(p.filter(partner => partner.consortium).map(partner => partner.id))
            })
    }, [])

    const visibleGraph = useMemo(() => {
        if (!graph) return null
        const degree = new Map<number, number>()
        for (const e of graph.edges) {
            degree.set(e.source, (degree.get(e.source) ?? 0) + 1)
            degree.set(e.target, (degree.get(e.target) ?? 0) + 1)
        }
        const nodes = [...graph.nodes]
            .sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0))
            .slice(0, topN)
        const ids = new Set(nodes.map(n => n.id))
        return { nodes, edges: graph.edges.filter(e => ids.has(e.source) && ids.has(e.target)) }
    }, [graph, topN])

    const handleHover  = useCallback((id: number | null) => { hoveredRef.current = id; setHoveredId(id) }, [])
    const handleSelect = useCallback((ids: number[]) => { selectedIdsRef.current = ids; setSelectedIds(ids) }, [])

    useEffect(() => {
        if (selectedIds.length > 0) fitSelectionRef.current?.()
    }, [selectedIds])

    useEffect(() => {
        if (!canvasRef.current || !visibleGraph || !containerRef.current || !tooltipRef.current) return
        const canvas    = canvasRef.current    as HTMLCanvasElement
        const container = containerRef.current as HTMLDivElement
        const tooltip   = tooltipRef.current   as HTMLDivElement
        const g         = visibleGraph as NonNullable<typeof visibleGraph>
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
        if (!ctx) return

        let W = canvas.parentElement?.offsetWidth  || 500
        let H = canvas.parentElement?.offsetHeight || 420
        canvas.width  = W
        canvas.height = H
        let cx = W / 2, cy = H / 2

        const simNodes: SimNode[] = g.nodes.map((node, i) => {
            const angle = (2 * Math.PI * i) / g.nodes.length - Math.PI / 2
            const r = Math.min(cx, cy) * 0.6
            return { ...node, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), vx: 0, vy: 0 }
        })

        const nodeById  = new Map<number, SimNode>(simNodes.map(n => [n.id, n]))
        const adjacency = new Map<number, Set<number>>()
        for (const edge of g.edges) {
            if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set())
            if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set())
            adjacency.get(edge.source)!.add(edge.target)
            adjacency.get(edge.target)!.add(edge.source)
        }

        let dragging:       SimNode | null = null
        let isPanning     = false
        let mouseDownScreen = { x: 0, y: 0 }
        let panOrigin       = { x: 0, y: 0 }

        function screenPos(e: MouseEvent) {
            const rect = canvas.getBoundingClientRect()
            return {
                x: (e.clientX - rect.left) * (W / rect.width),
                y: (e.clientY - rect.top)  * (H / rect.height),
            }
        }

        function toWorld(sx: number, sy: number) {
            const { x: tx, y: ty, scale } = transformRef.current
            return { x: (sx - tx) / scale, y: (sy - ty) / scale }
        }

        function onMouseDown(e: MouseEvent) {
            const s = screenPos(e)
            mouseDownScreen = s
            const w = toWorld(s.x, s.y)
            dragging = simNodes.find(n => Math.hypot(n.x - w.x, n.y - w.y) < 12) ?? null
            if (dragging) { canvas.style.cursor = 'grabbing'; alpha = Math.max(alpha, 0.3); return }
            isPanning = true
            panOrigin = { x: transformRef.current.x, y: transformRef.current.y }
            canvas.style.cursor = 'move'
        }

        function onMouseMove(e: MouseEvent) {
            const s = screenPos(e)
            const w = toWorld(s.x, s.y)

            if (dragging) {
                dragging.x = w.x; dragging.y = w.y
                dragging.vx = 0;  dragging.vy = 0
                tooltip.style.display = 'none'
                return
            }
            if (isPanning) {
                transformRef.current.x = panOrigin.x + (s.x - mouseDownScreen.x)
                transformRef.current.y = panOrigin.y + (s.y - mouseDownScreen.y)
                return
            }

            const hovered = simNodes.find(n => Math.hypot(n.x - w.x, n.y - w.y) < 12)
            canvas.style.cursor = hovered ? 'grab' : 'default'
            const newId = hovered?.id ?? null
            if (newId !== hoveredRef.current) handleHover(newId)

            const cRect = container.getBoundingClientRect()
            const left  = Math.min(e.clientX - cRect.left + 12, cRect.width - 200)
            const top   = e.clientY - cRect.top - 36

            if (hovered) {
                tooltip.textContent = hovered.name
                tooltip.style.display = 'block'
                tooltip.style.left = `${left}px`
                tooltip.style.top  = `${top}px`
            } else {
                const threshold = 6 / transformRef.current.scale
                const hovEdge = g.edges.find(edge => {
                    const A = nodeById.get(edge.source), B = nodeById.get(edge.target)
                    if (!A || !B) return false
                    const dx = B.x - A.x, dy = B.y - A.y
                    const lenSq = dx * dx + dy * dy
                    if (lenSq === 0) return false
                    const t = Math.max(0, Math.min(1, ((w.x - A.x) * dx + (w.y - A.y) * dy) / lenSq))
                    return Math.hypot(w.x - (A.x + t * dx), w.y - (A.y + t * dy)) < threshold
                })
                if (hovEdge) {
                    tooltip.innerHTML = `<span style="font-weight:600;color:#a5b4fc">${hovEdge.projects.length} projet${hovEdge.projects.length > 1 ? 's' : ''}</span><br><span style="color:#d1d5db">${hovEdge.projects.join(' · ')}</span>`
                    tooltip.style.display = 'block'
                    tooltip.style.left = `${left}px`
                    tooltip.style.top  = `${top}px`
                    canvas.style.cursor = 'pointer'
                } else {
                    tooltip.style.display = 'none'
                }
            }
        }

        function onMouseUp(e: MouseEvent) {
            const s = screenPos(e)
            const moved = Math.hypot(s.x - mouseDownScreen.x, s.y - mouseDownScreen.y)
            if (!isPanning && moved < 4) {
                const w = toWorld(s.x, s.y)
                const clicked = simNodes.find(n => Math.hypot(n.x - w.x, n.y - w.y) < 12)
                if (clicked) {
                    const cur = selectedIdsRef.current
                    const newIds = cur.includes(clicked.id)
                        ? cur.filter(id => id !== clicked.id)
                        : [...cur, clicked.id]
                    handleSelect(newIds)
                } else {
                    handleSelect([])
                }
            }
            dragging  = null
            isPanning = false
            canvas.style.cursor = 'default'
        }

        function onMouseLeave() {
            dragging  = null
            isPanning = false
            handleHover(null)
            tooltip.style.display = 'none'
            canvas.style.cursor = 'default'
        }

        function onWheel(e: WheelEvent) {
            e.preventDefault()
            const s     = screenPos(e)
            const delta = e.deltaY > 0 ? 0.85 : 1.18
            const t     = transformRef.current
            const newScale = Math.max(0.15, Math.min(8, t.scale * delta))
            t.x = s.x - (s.x - t.x) * (newScale / t.scale)
            t.y = s.y - (s.y - t.y) * (newScale / t.scale)
            t.scale = newScale
        }

        canvas.addEventListener('mousedown',  onMouseDown)
        canvas.addEventListener('mousemove',  onMouseMove)
        canvas.addEventListener('mouseup',    onMouseUp)
        canvas.addEventListener('mouseleave', onMouseLeave)
        canvas.addEventListener('wheel',      onWheel, { passive: false })

        let alpha = 1.0

        function tick() {
            if (alpha < 0.001) return
            alpha *= 0.97
            for (let i = 0; i < simNodes.length; i++) {
                for (let j = i + 1; j < simNodes.length; j++) {
                    const A = simNodes[i], B = simNodes[j]
                    const dx = B.x - A.x, dy = B.y - A.y
                    const dist  = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
                    const force = REPULSION / (dist * dist) * alpha
                    const fx = force * dx / dist, fy = force * dy / dist
                    A.vx -= fx; A.vy -= fy; B.vx += fx; B.vy += fy
                }
            }
            for (const edge of g.edges) {
                const A = nodeById.get(edge.source), B = nodeById.get(edge.target)
                if (!A || !B) continue
                const dx = B.x - A.x, dy = B.y - A.y
                const dist  = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
                const force = (dist - TARGET_LEN) * SPRING * edge.weight * alpha
                const fx = force * dx / dist, fy = force * dy / dist
                A.vx += fx; A.vy += fy; B.vx -= fx; B.vy -= fy
            }
            const grav = GRAVITY / Math.max(1, simNodes.length / 20)
            for (const n of simNodes) {
                n.vx += (cx - n.x) * grav * alpha
                n.vy += (cy - n.y) * grav * alpha
            }
            for (const n of simNodes) {
                if (n === dragging) continue
                n.vx *= DAMPING; n.vy *= DAMPING
                n.x  += n.vx;    n.y  += n.vy
            }
        }

        function draw() {
            ctx.clearRect(0, 0, W, H)
            const { x: tx, y: ty, scale } = transformRef.current
            ctx.save()
            ctx.translate(tx, ty)
            ctx.scale(scale, scale)
            const selIds    = selectedIdsRef.current
            const selSet    = new Set(selIds)
            const activeIds = filterIdsRef.current
            const selNeighbors = new Set<number>()
            for (const sid of selIds) for (const nid of adjacency.get(sid) ?? []) selNeighbors.add(nid)


            const visibleNodeIds = selSet.size > 0
                ? new Set([...selSet, ...selNeighbors])
                : filterIdsRef.current

            for (const edge of g.edges) {
                const A = nodeById.get(edge.source), B = nodeById.get(edge.target)
                if (!A || !B) continue
                if (visibleNodeIds && (!visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target))) continue
                const aFiltered   = activeIds !== null && (!activeIds.has(edge.source) || !activeIds.has(edge.target))
                const isConnected = selSet.size > 0 && (selSet.has(edge.source) || selSet.has(edge.target))
                ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y)
                if (aFiltered) {
                    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.03)'
                } else if (selSet.size > 0 && !isConnected) {
                    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.08)'
                } else if (selSet.size > 0) {
                    const srcColor = selSet.has(edge.source) ? nodeById.get(edge.source)?.color : nodeById.get(edge.target)?.color
                    const op = Math.min(0.3 + edge.weight * 0.2, 0.9)
                    ctx.lineWidth = 2
                    ctx.strokeStyle = (srcColor ?? '#6366f1') + Math.round(op * 255).toString(16).padStart(2, '0')
                } else {
                    const colorA = nodeById.get(edge.source)?.color ?? '#6366f1'
                    const colorB = nodeById.get(edge.target)?.color ?? '#6366f1'
                    const op     = Math.min(0.3 + edge.weight * 0.08, 0.9)
                    const opHex  = Math.round(op * 255).toString(16).padStart(2, '0')
                    ctx.lineWidth = Math.min(1 + edge.weight * 0.3, 3)
                    const grad = ctx.createLinearGradient(A.x, A.y, B.x, B.y)
                    grad.addColorStop(0, colorA + opHex)
                    grad.addColorStop(1, colorB + opHex)
                    ctx.strokeStyle = grad
                }
                ctx.stroke()
            }

            for (const n of simNodes) {
                if (visibleNodeIds && !visibleNodeIds.has(n.id)) continue
                const isSelected = selSet.has(n.id)
                const isHovered  = n.id === hoveredRef.current
                const isNeighbor = selNeighbors.has(n.id) && !isSelected
                const isFiltered = activeIds !== null && !activeIds.has(n.id)
                const isDimmed   = isFiltered || (selSet.size > 0 && !isSelected && !isNeighbor)
                const radius     = isSelected ? 8 : 5

                ctx.globalAlpha = isDimmed ? 0.15 : 1

                if (isSelected) {
                    ctx.beginPath()
                    ctx.arc(n.x, n.y, radius + 5, 0, 2 * Math.PI)
                    ctx.fillStyle = (n.color ?? '#6366f1') + '33'
                    ctx.fill()
                } else if (isHovered) {
                    ctx.beginPath()
                    ctx.arc(n.x, n.y, radius + 4, 0, 2 * Math.PI)
                    ctx.fillStyle = 'rgba(0,0,0,0.07)'
                    ctx.fill()
                }

                ctx.beginPath()
                ctx.arc(n.x, n.y, radius, 0, 2 * Math.PI)
                ctx.fillStyle = n.color ?? '#6366f1'; ctx.fill()
                ctx.strokeStyle = '#fff'; ctx.lineWidth = isSelected ? 2.5 : 2; ctx.stroke()
                ctx.fillStyle = isDimmed ? '#bbb' : '#222'
                ctx.font      = isSelected ? 'bold 11px sans-serif' : '10px sans-serif'
                ctx.textAlign = 'center'
                ctx.fillText(trunc(n.name), n.x, n.y + (isSelected ? 28 : 22))
                ctx.globalAlpha = 1
            }
            ctx.restore()
        }

        function fitToVisible() {
            const selIds = selectedIdsRef.current
            const selSet = new Set(selIds)
            const nbSet  = new Set<number>()
            for (const sid of selIds) for (const nid of adjacency.get(sid) ?? []) nbSet.add(nid)
            const visibleIds = selSet.size > 0 ? new Set([...selSet, ...nbSet]) : null
            const visible = visibleIds ? simNodes.filter(n => visibleIds.has(n.id)) : simNodes
            if (visible.length === 0) return
            const pad = 60
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
            for (const n of visible) {
                minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x)
                minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y)
            }
            const bw = maxX - minX || 1, bh = maxY - minY || 1
            const newScale = Math.max(0.2, Math.min(4, Math.min((W - pad * 2) / bw, (H - pad * 2) / bh)))
            const mcx = (minX + maxX) / 2, mcy = (minY + maxY) / 2
            transformRef.current = { x: W / 2 - mcx * newScale, y: H / 2 - mcy * newScale, scale: newScale }
        }
        fitSelectionRef.current = fitToVisible

        let rafId: number
        function loop() {
            const newW = canvas.parentElement?.offsetWidth  || 0
            const newH = canvas.parentElement?.offsetHeight || 0
            if (newW > 0 && newW !== W) { W = newW; cx = W / 2; canvas.width  = W }
            if (newH > 0 && newH !== H) { H = newH; cy = H / 2; canvas.height = H }
            tick()
            draw()
            rafId = requestAnimationFrame(loop)
        }
        rafId = requestAnimationFrame(loop)

        return () => {
            cancelAnimationFrame(rafId)
            canvas.removeEventListener('mousedown',  onMouseDown)
            canvas.removeEventListener('mousemove',  onMouseMove)
            canvas.removeEventListener('mouseup',    onMouseUp)
            canvas.removeEventListener('mouseleave', onMouseLeave)
            canvas.removeEventListener('wheel',      onWheel)
        }
    }, [visibleGraph, handleHover, handleSelect])

    return (
        <div ref={containerRef} className="flex rounded-lg border border-gray-100 overflow-hidden bg-white"
            style={{ position: fullscreen ? 'fixed' : 'relative', inset: fullscreen ? 0 : undefined, zIndex: fullscreen ? 50 : undefined, height: fullscreen ? '100dvh' : 420, width: '100%' }}>
            <div
                ref={tooltipRef}
                style={{
                    display: 'none', position: 'absolute', pointerEvents: 'none',
                    background: '#1f2937', color: '#fff', borderRadius: 6,
                    padding: '4px 9px', fontSize: 11, fontWeight: 500,
                    whiteSpace: 'nowrap', zIndex: 10,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                }}
            />
            <div style={{ position: 'absolute', bottom: 10, right: 10, zIndex: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {([
                    { label: '+',  title: 'Zoom avant',    action: () => { const t = transformRef.current; const s = Math.min(8, t.scale * 1.25); t.x = (t.x - 250) * (s / t.scale) + 250; t.y = (t.y - 210) * (s / t.scale) + 210; t.scale = s } },
                    { label: '−',  title: 'Zoom arrière',  action: () => { const t = transformRef.current; const s = Math.max(0.15, t.scale * 0.8); t.x = (t.x - 250) * (s / t.scale) + 250; t.y = (t.y - 210) * (s / t.scale) + 210; t.scale = s } },
                    { label: '⌖',  title: 'Réinitialiser', action: () => { transformRef.current = { x: 0, y: 0, scale: 1 } } },
                    { label: fullscreen ? '✕' : '⛶', title: fullscreen ? 'Quitter le plein écran' : 'Plein écran', action: () => setFullscreen(f => !f) },
                ] as const).map(btn => (
                    <button key={btn.label} title={btn.title} onClick={btn.action}
                        style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.92)', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontSize: 16, lineHeight: 1, color: '#374151', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                        {btn.label}
                    </button>
                ))}
            </div>
            <div className="shrink-0 border-r border-gray-100 bg-gray-50/40 overflow-hidden" style={{ width: 210 }}>
                {visibleGraph
                    ? <Sidebar
                        nodes={visibleGraph.nodes}
                        edges={visibleGraph.edges}
                        hoveredId={hoveredId}
                        selectedIds={selectedIds}
                        onHover={handleHover}
                        onSelect={handleSelect}
                      />
                    : <div className="flex items-center justify-center h-full text-xs text-gray-300">Chargement…</div>
                }
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-100 bg-gray-50/40 shrink-0">
                    <span className="text-[10px] text-gray-400 font-medium mr-0.5">Top</span>
                    {[20, 50, 100, 200, 9999].map(n => {
                        const totalNodes = graph?.nodes.length ?? 0
                        const isWarn = n === 9999 && totalNodes > 200
                        return (
                            <button key={n} onClick={() => setTopN(n)}
                                title={isWarn ? `${totalNodes} nœuds — risque de lenteur` : undefined}
                                className={`text-[9px] px-1.5 py-0.5 rounded font-medium transition-colors ${
                                    topN === n
                                        ? isWarn ? 'bg-amber-500 text-white' : 'bg-indigo-500 text-white'
                                        : isWarn ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}>
                                {n === 9999 ? `Tous${isWarn ? ' ⚠' : ''}` : n}
                            </button>
                        )
                    })}

                    {consortiumListe.length > 0 && (
                        <button
                            onClick={() => setConsortiumOnly(v => !v)}
                            className={`flex items-center gap-1.5 text-xs px-2.5 py-0.2 rounded-md border transition-colors ${
                                consortiumOnly
                                    ? 'bg-amber-500 text-white border-amber-500'
                                    : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                            }`}
                        >
                            <Users size={12} /> Consortium
                        </button>
                    )}
                    <span className="ml-auto text-[10px] text-gray-400">{visibleGraph?.nodes.length ?? 0} partenaires</span>
                </div>
                <canvas ref={canvasRef} style={{ width: '100%', flex: 1, display: 'block' }} />
            </div>
        </div>
    )
}
