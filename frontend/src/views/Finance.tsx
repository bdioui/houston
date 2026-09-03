import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarDays, AlertTriangle, Receipt, FilePenLine, Scale } from 'lucide-react'
import { Search, FileDown, Trash2, Trash, Pencil, Check, X, Plus, ChevronsUpDown, ChevronUp, ChevronDown, ChevronRight, FolderInput, Tag, Upload } from 'lucide-react'
import { motion } from 'framer-motion'
import { exportToCsv } from '@/lib/utils'
import SearchInput from '@/components/SearchInput'
import {
    getProgram, getExpanses, getBudgetCategories, getBudgetDetails, getSupliers, getProjects,
    getFinancialAgreements, getPartners, getStatuses, getSifacLines,
    deleteExpanse, deleteAgreement, updateExpanse, createExpanse, createSupplier, updateAgreement, addAgreement,
    createBudgetCategory, updateBudgetCategory, deleteBudgetCategory,
    createBudgetDetail, updateBudgetDetail, deleteBudgetDetail,
    ORPHAN_STATUS,
} from '@/lib/api'
import type { ImportSummary } from '@/lib/api'
import { prepareSifacImport, commitSifacImport } from '@/lib/sifac/import'
import type { SifacPreview } from '@/lib/sifac/import'
import { sifacCategory } from '@/lib/sifac/aggregate'
import type { Program, Expanse, BudgetCategory, BudgetDetail, Supplier, Project, FinancialAgreement, Partner, Status, SifacLine } from '@/lib/types'

const EXPANSE_CATEGORIES = ['Fonctionnement', 'Investissement', 'Personnel', 'Autre'] as const

const CATEGORY_COLORS: Record<string, string> = {
    'Fonctionnement': '#ffedd5',
    'Investissement': '#fef9c3',
    'Personnel':      '#dbeafe',
    'Autre':          '#f3f4f6',
}

const LABELS_BY_CATEGORY: Record<string, string[]> = {
    'Fonctionnement': ['Formation', 'Mission', 'Prestation', 'Facturation interne'],
    'Investissement': ['Immobilisation', 'Matériel', 'Logiciel'],
    'Personnel':      ['Personnel'],
    'Autre':          [],
}

const EXPANSE_STATUS_COLORS: Record<string, string> = {
    'Engagé':      '#dbeafe',
    'Livré':       '#fef9c3',
    'Payé':        '#dcfce7',
    [ORPHAN_STATUS]: '#fee2e2',
}

const AGREEMENT_STATUS_COLORS: Record<string, string> = {
    'En préparation': '#dbeafe',
    'Active':         '#dcfce7',
    'Soldée':         '#f3f4f6',
    'Annulée':        '#fee2e2',
}

function formatAmount(n: number) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)
}

function parseAmount(raw: string): number {
    return parseFloat(raw.replace(',', '.')) || 0
}

function formatDate(d: string) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Le montant réellement décaissé. SIFAC le connaît à l'euro près, y compris pour
// une commande partiellement payée ; une saisie manuelle ne renseigne pas ce
// compteur, on retombe alors sur le montant global si le statut dit « Payé ».
function paidAmount(e: Expanse): number {
    return e.source === 'sifac' ? e.amount_paid : (e.status === 'Payé' ? e.amount : 0)
}

// ─── Date range popover ─────────────────────────────────────────────────────

interface DateRangePopoverProps {
    label: string
    from: string
    to: string
    onFromChange: (v: string) => void
    onToChange: (v: string) => void
}

function DateRangePopover({ label, from, to, onFromChange, onToChange }: DateRangePopoverProps) {
    const active = from || to
    const summary = active
        ? [from ? new Date(from).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '…',
           to   ? new Date(to).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '…'].join(' → ')
        : null

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={`h-8 text-xs gap-1.5 bg-transparent rounded-md ${active ? 'border-primary/60 bg-primary/5 text-primary' : ''}`}
                >
                    <CalendarDays size={12} />
                    {summary ?? label}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
                <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-6">Du</span>
                        <Input type="date" value={from} onChange={e => onFromChange(e.target.value)} className="h-7 text-xs flex-1" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-6">Au</span>
                        <Input type="date" value={to} onChange={e => onToChange(e.target.value)} className="h-7 text-xs flex-1" />
                    </div>
                    {active && (
                        <Button variant="ghost" size="sm" className="h-6 text-xs self-end mt-1" onClick={() => { onFromChange(''); onToChange('') }}>
                            Effacer
                        </Button>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}

// ─── New supplier popover ───────────────────────────────────────────────────

interface NewSupplierPopoverProps {
    suppliers: Supplier[]
    onCreated: (s: Supplier) => void
}

function NewSupplierPopover({ suppliers, onCreated }: NewSupplierPopoverProps) {
    const [open, setOpen] = useState(false)
    const [name, setName] = useState('')
    const [siret, setSiret] = useState('')
    const [sifac_code, setSifacCode] = useState('')
    const [description, setDescription] = useState('')
    const [saving, setSaving] = useState(false)
    const [siretError, setSiretError] = useState('')

    function checkSiret(value: string) {
        if (!value) { setSiretError(''); return }
        if (!/^\d+$/.test(value) || value.length !== 14) {
            setSiretError('Le SIRET doit contenir exactement 14 chiffres')
        } else if (suppliers.some(s => s.siret === value)) {
            const existing = suppliers.find(s => s.siret === value)!
            setSiretError(`Déjà enregistré : ${existing.name}`)
        } else {
            setSiretError('')
        }
    }

    async function handleSubmit() {
        if (!name.trim() || siretError) return
        setSaving(true)
        try {
            const created = await createSupplier({ name: name.trim(), siret, description, sifac_code})
            onCreated(created)
            setOpen(false)
            setName(''); setSiret(''); setDescription(''); setSiretError('')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Popover open={open} onOpenChange={v => { setOpen(v); if (!v) { setName(''); setSiret(''); setDescription(''); setSiretError('') } }}>
            <PopoverTrigger asChild>
                <button className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <Plus size={12} />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="start">
                <p className="text-xs font-semibold mb-3">Nouveau fournisseur</p>
                <div className="flex flex-col gap-2">
                    <Input autoFocus placeholder="Nom *" value={name} onChange={e => setName(e.target.value)} className="h-7 text-xs" />
                    <div>
                        <Input
                            placeholder="SIRET (14 chiffres)"
                            value={siret}
                            maxLength={14}
                            onChange={e => { setSiret(e.target.value); checkSiret(e.target.value) }}
                            className={`h-7 text-xs font-mono ${siretError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                        />
                        {siretError && <p className="text-[10px] text-destructive mt-0.5 leading-tight">{siretError}</p>}
                    </div>

                    <div>
                        <Input
                            placeholder="Code SIFAC"
                            value={sifac_code}
                            onChange={e => { setSifacCode(e.target.value)}}
                            className={`h-7 text-xs font-mono`}
                        />
                    </div>
                    <Input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className="h-7 text-xs" />
                    <Button size="sm" className="h-7 text-xs mt-1 rounded-md" disabled={!name.trim() || !!siretError || saving} onClick={handleSubmit}>
                        {saving ? '…' : 'Créer le fournisseur'}
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}

// ─── Action bar partagée ────────────────────────────────────────────────────

interface ActionBarProps {
    count: number
    onExport: () => void
    onDelete: () => void
    onReclassify?: () => void
    onRecategorize?: () => void
}

function ActionBar({ count, onExport, onDelete, onReclassify, onRecategorize }: ActionBarProps) {
    return (
        <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground mr-1">{count} sélectionné{count > 1 ? 's' : ''}</span>
            {onReclassify && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-md" onClick={onReclassify}>
                            <FolderInput size={13} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Reclasser (ligne budgétaire)</TooltipContent>
                </Tooltip>
            )}
            {onRecategorize && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-md" onClick={onRecategorize}>
                            <Tag size={13} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Recatégoriser</TooltipContent>
                </Tooltip>
            )}
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-md" onClick={onExport}>
                        <FileDown size={13} />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Exporter</TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-md text-destructive hover:text-destructive" onClick={onDelete}>
                        <Trash size={13} />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Supprimer</TooltipContent>
            </Tooltip>
        </div>
    )
}

// ─── Détail des lignes comptables d'un flux ─────────────────────────────────

type AmountKey = 'amount_engaged' | 'amount_invoiced' | 'amount_paid' | 'amount_report'

function SifacLineDetail({ lines }: { lines: SifacLine[] }) {
    if (lines.length === 0) {
        return <p className="text-[11px] text-muted-foreground">Aucune ligne comptable pour ce flux.</p>
    }

    const sum = (k: AmountKey) => lines.reduce((s, l) => s + l[k], 0)
    const cell = (n: number) => (n === 0 ? <span className="text-muted-foreground">—</span> : formatAmount(n))

    return (
        <div className="rounded-md border bg-background overflow-hidden">
            <table className="w-full text-[11px]">
                <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                        <th className="text-left font-medium px-2 py-1">Rubrique</th>
                        <th className="text-left font-medium px-2 py-1">Facture</th>
                        <th className="text-left font-medium px-2 py-1">Compte</th>
                        <th className="text-center font-medium px-2 py-1">Exercice</th>
                        <th className="text-right font-medium px-2 py-1">Engagé</th>
                        <th className="text-right font-medium px-2 py-1">Facturé</th>
                        <th className="text-right font-medium px-2 py-1">Payé</th>
                        <th className="text-right font-medium px-2 py-1">Report</th>
                        <th className="text-left font-medium px-2 py-1">Paiement</th>
                    </tr>
                </thead>
                <tbody>
                    {lines.map(l => (
                        <tr key={l.id} className="border-t">
                            <td className="px-2 py-1">{l.rubrique || '—'}</td>
                            <td className="px-2 py-1 text-muted-foreground">{l.invoice_number || '—'}</td>
                            <td className="px-2 py-1 text-muted-foreground truncate max-w-32" title={l.account_label}>{l.account || '—'}</td>
                            <td className="px-2 py-1 text-center tabular-nums text-muted-foreground">{l.exercice}</td>
                            <td className="px-2 py-1 text-right tabular-nums">{cell(l.amount_engaged)}</td>
                            <td className="px-2 py-1 text-right tabular-nums">{cell(l.amount_invoiced)}</td>
                            <td className="px-2 py-1 text-right tabular-nums">{cell(l.amount_paid)}</td>
                            <td className="px-2 py-1 text-right tabular-nums">{cell(l.amount_report)}</td>
                            <td className="px-2 py-1 tabular-nums text-muted-foreground">{formatDate(l.payment_date)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot className="border-t bg-muted/30 font-medium">
                    <tr>
                        <td className="px-2 py-1" colSpan={4}>{lines.length} ligne{lines.length > 1 ? 's' : ''}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{cell(sum('amount_engaged'))}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{cell(sum('amount_invoiced'))}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{cell(sum('amount_paid'))}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{cell(sum('amount_report'))}</td>
                        <td className="px-2 py-1" />
                    </tr>
                </tfoot>
            </table>
        </div>
    )
}


// ─── Lignes du tableau financier détaillé ─────────────────────────────────────────────

function SifacLineDetailedTable({ lines }: { lines: SifacLine[] }) {
    if (lines.length === 0) {
        return <p className="text-[11px] text-muted-foreground">Aucune ligne comptable pour ce flux.</p>
    }

    const sum = (k: AmountKey) => lines.reduce((s, l) => s + l[k], 0)
    const cell = (n: number) => (n === 0 ? <span className="text-muted-foreground">—</span> : formatAmount(n))

    return (
        <div className="rounded-lg border bg-background overflow-hidden">
            <table className="w-full text-[11px]">
                <thead className="h-8 w-8 px-3">
                    <tr>
                        <th className="text-left font-medium px-4 py-3">N°flux</th>
                        <th className="text-left font-medium px-4 py-3">Rubrique</th>
                        <th className="text-left font-medium px-4 py-3">Intitulé</th>
                        <th className="text-left font-medium px-4 py-3">Catégorie</th>
                        <th className="text-left font-medium px-4 py-3">libéllé dépense</th>
                        <th className="text-left font-medium px-4 py-3">Facture</th>
                        <th className="text-right font-medium px-4 py-3">Engagé</th>
                        <th className="text-right font-medium px-4 py-3">Facturé</th>
                        <th className="text-right font-medium px-4 py-3">Payé</th>
                        <th className="text-right font-medium px-4 py-3">Report</th>
                        <th className="text-left font-medium px-4 py-3">Engagemnt</th>
                        <th className="text-left font-medium px-4 py-3">facturation</th>
                        <th className="text-left font-medium px-4 py-3">Paiement</th>
                    </tr>
                </thead>
                <tbody>
                    {lines.map(l => {
                        const category = sifacCategory(l.category)
                        return (

                            <tr key={l.id} className="border-t">
                                <td className="px-4 py-3">{l.flux_id || '—'}</td>
                                <td className="px-4 py-3">{l.rubrique || '—'}</td>
                                <td className="px-4 py-3">{l.flux_label || '—'}</td>
                                <td className="px-4 py-3">
                                                {category && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: CATEGORY_COLORS[category] ?? '#f3f4f6' }}>
                                                {category}
                                                </span>}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground truncate max-w-32" title={l.account_label}>{l.account || '—'}</td>
                                <td className="ppx-4 py-3 text-muted-foreground">{l.invoice_number || '—'}</td>
                                <td className="px-4 py-3 text-right tabular-nums">{cell(l.amount_engaged)}</td>
                                <td className="px-4 py-3 text-right tabular-nums">{cell(l.amount_invoiced)}</td>
                                <td className="px-4 py-3 text-right tabular-nums">{cell(l.amount_paid)}</td>
                                <td className="px-4 py-3 text-right tabular-nums">{cell(l.amount_report)}</td>
                                <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatDate(l.engagement_date)}</td>
                                <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatDate(l.invoice_date)}</td>
                                <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatDate(l.payment_date)}</td>
                            </tr>
                        
                        )
                    })}
                </tbody>
                <tfoot className="border-t bg-muted/30 font-medium">
                    <tr>
                        <td className="px-4 py-3" colSpan={6}>{lines.length} ligne{lines.length > 1 ? 's' : ''}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">{cell(sum('amount_engaged'))}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">{cell(sum('amount_invoiced'))}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">{cell(sum('amount_paid'))}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">{cell(sum('amount_report'))}</td>
                        <td className="px-4 py-3" />
                    </tr>
                </tfoot>
            </table>
        </div>
    )
}

// ─── Import SIFAC ───────────────────────────────────────────────────────────

function errorMessage(err: unknown): string {
    return err instanceof Error ? err.message : String(err)
}

interface SifacImportButtonProps {
    onImported: () => Promise<void> | void
}

function SifacImportButton({ onImported }: SifacImportButtonProps) {
    const fileRef = useRef<HTMLInputElement>(null)
    const [open, setOpen] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [preview, setPreview] = useState<SifacPreview | null>(null)
    const [exercice, setExercice] = useState('')
    const [summary, setSummary] = useState<ImportSummary | null>(null)

    const exerciceValid = /^\d{4}$/.test(exercice)

    async function handleFile(ev: React.ChangeEvent<HTMLInputElement>) {
        const file = ev.target.files?.[0]
        // Vider l'input permet de resélectionner le même fichier après coup.
        ev.target.value = ''
        if (!file) return

        setError(''); setPreview(null); setSummary(null); setExercice('')
        setOpen(true); setBusy(true)
        try {
            const p = await prepareSifacImport(file)
            setPreview(p)
            setExercice(String(p.exercice))
        } catch (err) {
            setError(errorMessage(err))
        } finally {
            setBusy(false)
        }
    }

    async function confirm() {
        if (!preview || !exerciceValid) return
        setBusy(true); setError('')
        try {
            const result = await commitSifacImport(preview, Number(exercice))
            setSummary(result)
            await onImported()
        } catch (err) {
            setError(errorMessage(err))
        } finally {
            setBusy(false)
        }
    }

    return (
        <>
            <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.XLSX,.XLS"
                className="hidden"
                onChange={handleFile}
            />
            <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1 rounded-md"
                onClick={() => fileRef.current?.click()}
            >
                <Upload size={11} /> Importer SIFAC
            </Button>

            <Dialog open={open} onOpenChange={o => { if (!o && !busy) setOpen(false) }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Import SIFAC</DialogTitle>
                        <DialogDescription>
                            {summary ? 'Import terminé.'
                                : preview ? 'Vérifiez l’exercice avant d’écraser le périmètre.'
                                : 'Lecture du fichier…'}
                        </DialogDescription>
                    </DialogHeader>

                    {error && (
                        <div className="flex gap-2 rounded-md bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                            <AlertTriangle size={14} className="shrink-0 mt-px" />
                            <span>{error}</span>
                        </div>
                    )}

                    {summary && (
                        <div className="flex flex-col gap-1 text-sm">
                            <p><span className="font-medium tabular-nums">{summary.created}</span> dépense{summary.created > 1 ? 's' : ''} créée{summary.created > 1 ? 's' : ''}</p>
                            <p><span className="font-medium tabular-nums">{summary.updated}</span> mise{summary.updated > 1 ? 's' : ''} à jour</p>
                            <p><span className="font-medium tabular-nums">{summary.orphaned}</span> passée{summary.orphaned > 1 ? 's' : ''} en « {ORPHAN_STATUS} »</p>
                            {summary.created > 0 && (
                                <p className="text-xs text-muted-foreground mt-2">
                                    Les dépenses créées n’ont ni catégorie ni ligne budgétaire : filtrez sur une catégorie vide pour les trier.
                                </p>
                            )}
                        </div>
                    )}

                    {preview && !summary && !error && (
                        <div className="flex flex-col gap-3">
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="rounded-lg border p-2">
                                    <p className="text-[10px] text-muted-foreground">Programme</p>
                                    <p className="text-sm font-medium mt-0.5 truncate">{preview.pfi}</p>
                                </div>
                                <div className="rounded-lg border p-2">
                                    <p className="text-[10px] text-muted-foreground">Lignes</p>
                                    <p className="text-sm font-medium mt-0.5 tabular-nums">{preview.lineCount}</p>
                                </div>
                                <div className="rounded-lg border p-2">
                                    <p className="text-[10px] text-muted-foreground">Dépenses</p>
                                    <p className="text-sm font-medium mt-0.5 tabular-nums">{preview.fluxCount}</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <Label>Exercice</Label>
                                <Input
                                    value={exercice}
                                    onChange={ev => setExercice(ev.target.value)}
                                    className="h-9 text-sm w-32 tabular-nums"
                                    placeholder="2026"
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    L’exercice n’est pas dans le fichier : {preview.exercice} est l’année majoritaire des écritures.
                                </p>
                            </div>

                            <div className="flex gap-2 rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                                <AlertTriangle size={14} className="shrink-0 mt-px" />
                                <span>
                                    Toutes les lignes déjà enregistrées pour {preview.pfi} sur l’exercice {exerciceValid ? exercice : '…'} seront remplacées.
                                    Le tri budgétaire des dépenses est conservé.
                                </span>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        {summary || error ? (
                            <Button size="sm" onClick={() => setOpen(false)}>Fermer</Button>
                        ) : (
                            <>
                                <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={busy}>Annuler</Button>
                                <Button size="sm" onClick={confirm} disabled={busy || !preview || !exerciceValid}>
                                    {busy ? 'Import en cours…' : 'Importer'}
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

// ─── Onglet Dépenses ────────────────────────────────────────────────────────

interface DepensesTabProps {
    expanses: Expanse[]
    setExpanses: React.Dispatch<React.SetStateAction<Expanse[]>>
    budgetCategories: BudgetCategory[]
    budgetDetails: BudgetDetail[]
    suppliers: Supplier[]
    setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>
    projects: Project[]
    agreements: FinancialAgreement[]
}

function DepensesTab({ expanses, setExpanses, budgetCategories, budgetDetails, suppliers, setSuppliers, projects, agreements }: DepensesTabProps) {
    type Display = 'grouped' | 'detailed'
    const [search, setSearch] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('all')
    const [labelFilter, setLabelFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')
    const [detailFilter, setDetailFilter] = useState<number | null>(null)
    const [purchaseFrom, setPurchaseFrom] = useState('')
    const [purchaseTo, setPurchaseTo] = useState('')
    const [paymentFrom, setPaymentFrom] = useState('')
    const [paymentTo, setPaymentTo] = useState('')
    const [sortKey, setSortKey] = useState<string | null>(null)
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
    const [selected, setSelected] = useState<Set<number>>(new Set())
    const [editingId, setEditingId] = useState<number | null>(null)
    const [draft, setDraft] = useState<Partial<Expanse>>({})
    const [isAdding, setIsAdding] = useState(false)
    const [newDraft, setNewDraft] = useState<Partial<Expanse>>({})
    const [saving, setSaving] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [expandedId, setExpandedId] = useState<number | null>(null)
    const [displayMode, setDisplayMode] = useState<Display>('grouped')
    // Les lignes comptables ne servent qu'au dépliage : on ne les charge qu'au
    // premier clic, et une seule fois pour toutes les dépenses.
    const [sifacLines, setSifacLines] = useState<SifacLine[] | null>(null)
    const [loadingLines, setLoadingLines] = useState(false)

    async function loadSifacLines() {
        if (sifacLines !== null || loadingLines) return
        setLoadingLines(true)
        try {
            setSifacLines(await getSifacLines())
        } finally {
            setLoadingLines(false)
        }
    }

    useEffect(() => {
        if (displayMode === 'detailed') void loadSifacLines()
    }, [displayMode])

    async function toggleDetail(id: number) {
        if (expandedId === id) { setExpandedId(null); return }
        setExpandedId(id)
        if (sifacLines !== null || loadingLines) return
        setLoadingLines(true)
        try {
            setSifacLines(await getSifacLines())
        } finally {
            setLoadingLines(false)
        }
    }

    const budgetDetailMap    = useMemo(() => new Map(budgetDetails.map(d => [d.id, d])), [budgetDetails])
    const leafBudgetDetails  = useMemo(() => budgetDetails.filter(d => d.parent_id !== null), [budgetDetails])
    const budgetCategoryMap  = useMemo(() => new Map(budgetCategories.map(c => [c.id, c])), [budgetCategories])
    const supplierMap        = useMemo(() => new Map(suppliers.map(s => [s.id, s])), [suppliers])
    const projectMap         = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects])
    const agreementMap       = useMemo(() => new Map(agreements.map(a => [a.id, a])), [agreements])

    const labels = useMemo(() => [...new Set(expanses.map(e => e.label))].filter(Boolean).sort(), [expanses])
    const labelsByCategory = useMemo(() => {
        const map: Record<string, string[]> = { ...LABELS_BY_CATEGORY }
        for (const e of expanses) {
            if (e.source === 'sifac' || !e.category || !e.label) continue
            if (!e.category || !e.label) continue
            if (!map[e.category]) map[e.category] = []
            if (!map[e.category].includes(e.label)) map[e.category].push(e.label)
        }
        for (const key of Object.keys(map)) map[key] = [...new Set(map[key])].sort()
        return map
    }, [expanses])

    function filterTest(e : Expanse){
            if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false
            if (categoryFilter !== 'all' && e.category !== categoryFilter) return false
            if (labelFilter !== 'all' && e.label !== labelFilter) return false
            if (statusFilter !== 'all' && e.status !== statusFilter) return false
            if (detailFilter !== null && e.budget_detail_id !== detailFilter) return false
            return true
    } 

    const statuses = useMemo(() => [...new Set(expanses.map(e => e.status))].filter(Boolean).sort(), [expanses])

    const filtered = useMemo(() => expanses.filter(e => {
        if(!filterTest(e)) return false
        if (purchaseFrom && (!e.purchase_date || e.purchase_date < purchaseFrom)) return false
        if (purchaseTo && (!e.purchase_date || e.purchase_date > purchaseTo)) return false
        if (paymentFrom && (!e.payment_date || e.payment_date < paymentFrom)) return false
        if (paymentTo && (!e.payment_date || e.payment_date > paymentTo)) return false
        return true
    }), [expanses, search, categoryFilter, labelFilter, statusFilter, detailFilter, purchaseFrom, purchaseTo, paymentFrom, paymentTo])

    const keptFlux = useMemo(
        () => new Set(expanses.filter(filterTest).map(e => e.flux_id)),
        [expanses, search, categoryFilter, labelFilter, statusFilter, detailFilter]
    )

    const visibleLines = useMemo(() => (sifacLines ?? []).filter(l =>
        keptFlux.has(l.flux_id)
        && (!paymentFrom || (l.payment_date && l.payment_date >= paymentFrom))
        && (!paymentTo   || (l.payment_date && l.payment_date <= paymentTo))
        )
        .sort((a,b) => a.flux_id.localeCompare(b.flux_id)),
        [sifacLines, keptFlux, paymentFrom, paymentTo])

    // Les cartes du haut suivent la vue affichée et ses filtres. En mode groupé
    // elles somment des dépenses entières ; en mode ligne, les écritures
    // visibles, seules à porter une date de paiement exacte.
    //
    // La troisième carte change de sens d'une vue à l'autre, elle porte donc son
    // libellé. En groupé, une dépense est engagée ou payée : le reste à payer se
    // déduit du total, et le payé se somme sur les décaissements réels plutôt
    // que sur le statut, pour qu'une commande partiellement réglée compte pour
    // ce qui est sorti. En ligne, engagé et payé sont deux colonnes distinctes
    // portées par des écritures différentes : les soustraire donnerait du
    // négatif dès qu'un filtre de date écarte la ligne COMMANDE.
    const totals = useMemo(() => {
        if (displayMode === 'detailed') {
            return {
                engaged: visibleLines.reduce((s, l) => s + l.amount_engaged, 0),
                paid:    visibleLines.reduce((s, l) => s + l.amount_paid, 0),
                third:   visibleLines.reduce((s, l) => s + l.amount_invoiced, 0),
                thirdLabel: 'Facturé',
                engagedHint: '',
            }
        }
        const all  = filtered.reduce((s, e) => s + e.amount, 0)
        const paid = filtered.reduce((s, e) => s + paidAmount(e), 0)
        return {
            engaged: all - paid,
            paid,
            third: all,
            thirdLabel: 'Total',
            engagedHint: 'Non encore payé',
        }
    }, [displayMode, visibleLines, filtered])

    const sorted = useMemo(() => {
        if (!sortKey) return filtered
        return [...filtered].sort((a, b) => {
            let va: string | number = '', vb: string | number = ''
            if (sortKey === 'title')         { va = a.title; vb = b.title }
            else if (sortKey === 'category') { va = a.category; vb = b.category }
            else if (sortKey === 'label')    { va = a.label; vb = b.label }
            else if (sortKey === 'detail')   { va = a.budget_detail_id ? (budgetDetailMap.get(a.budget_detail_id)?.title ?? '') : ''; vb = b.budget_detail_id ? (budgetDetailMap.get(b.budget_detail_id)?.title ?? '') : '' }
            else if (sortKey === 'amount')   { va = a.amount; vb = b.amount }
            else if (sortKey === 'supplier') { va = a.supplier_id ? (supplierMap.get(a.supplier_id)?.name ?? '') : ''; vb = b.supplier_id ? (supplierMap.get(b.supplier_id)?.name ?? '') : '' }
            else if (sortKey === 'project')  { va = a.project_id ? (projectMap.get(a.project_id)?.title ?? '') : ''; vb = b.project_id ? (projectMap.get(b.project_id)?.title ?? '') : '' }
            else if (sortKey === 'status')   { va = a.status; vb = b.status }
            else if (sortKey === 'purchase') { va = a.purchase_date ?? ''; vb = b.purchase_date ?? '' }
            else if (sortKey === 'payment')  { va = a.payment_date ?? ''; vb = b.payment_date ?? '' }
            const cmp = typeof va === 'number' ? va - (vb as number) : String(va).localeCompare(String(vb), 'fr', { sensitivity: 'base' })
            return sortDir === 'asc' ? cmp : -cmp
        })
    }, [filtered, sortKey, sortDir, budgetDetailMap, supplierMap, projectMap])

    function toggleSort(key: string) {
        if (sortKey === key) {
            if (sortDir === 'asc') setSortDir('desc')
            else { setSortKey(null); setSortDir('asc') }
        } else {
            setSortKey(key); setSortDir('asc')
        }
    }

    const allFilteredSelected = filtered.length > 0 && filtered.every(e => selected.has(e.id))
    const someSelected = filtered.some(e => selected.has(e.id))

    function toggleRow(id: number) {
        setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
    }

    function toggleAll() {
        if (allFilteredSelected) {
            setSelected(prev => { const n = new Set(prev); filtered.forEach(e => n.delete(e.id)); return n })
        } else {
            setSelected(prev => { const n = new Set(prev); filtered.forEach(e => n.add(e.id)); return n })
        }
    }

    function startAdd() {
        setIsAdding(true)
        setNewDraft({ title: '', category: 'Fonctionnement', label: '', status: 'Engagé', amount: 0, purchase_date: '', payment_date: '', delivery_date: '', description: '', budget_detail_id: leafBudgetDetails[0]?.id ?? null, supplier_id: null, project_id: null, agreement_id: null })
        setEditingId(null)
    }

    async function saveNew() {
        if (saving) return
        setSaving(true)
        try {
            const created = await createExpanse(newDraft as Omit<Expanse, 'id'>)
            setExpanses(prev => [created, ...prev])
            setIsAdding(false)
            setNewDraft({})
        } finally {
            setSaving(false)
        }
    }

    function cancelAdd() { setIsAdding(false); setNewDraft({}) }

    function startEdit(e: Expanse) {
        setEditingId(e.id)
        setDraft({ ...e })
    }

    async function saveEdit() {
        if (editingId == null) return
        const { id: _id, ...patch } = draft as Expanse
        await updateExpanse(editingId, patch)
        setExpanses(prev => prev.map(e => e.id === editingId ? { ...e, ...patch } : e))
        setEditingId(null)
        setDraft({})
    }

    function cancelEdit() { setEditingId(null); setDraft({}) }

    async function doDelete() {
        const ids = [...selected]
        await Promise.all(ids.map(id => deleteExpanse(id)))
        setExpanses(prev => prev.filter(e => !selected.has(e.id)))
        setSelected(new Set())
        setConfirmDelete(false)
    }

    function handleDelete() { setConfirmDelete(true) }

    const [bulkModal, setBulkModal] = useState<'detail' | 'category' | null>(null)
    const [bulkDetailId, setBulkDetailId] = useState<number | null>(null)
    const [bulkCategory, setBulkCategory] = useState('')
    const [bulkLabel, setBulkLabel] = useState('')
    const [bulkSaving, setBulkSaving] = useState(false)

    async function applyBulkReclassify() {
        if (bulkDetailId == null) return
        setBulkSaving(true)
        try {
            const ids = [...selected]
            await Promise.all(ids.map(id => updateExpanse(id, { budget_detail_id: bulkDetailId })))
            setExpanses(prev => prev.map(e => selected.has(e.id) ? { ...e, budget_detail_id: bulkDetailId } : e))
            setSelected(new Set())
            setBulkModal(null)
            setBulkDetailId(null)
        } finally { setBulkSaving(false) }
    }

    async function applyBulkCategory() {
        if (!bulkCategory) return
        setBulkSaving(true)
        try {
            const ids = [...selected]
            const patch: Partial<Expanse> = { category: bulkCategory, ...(bulkLabel ? { label: bulkLabel } : {}) }
            await Promise.all(ids.map(id => updateExpanse(id, patch)))
            setExpanses(prev => prev.map(e => selected.has(e.id) ? { ...e, ...patch } : e))
            setSelected(new Set())
            setBulkModal(null)
            setBulkCategory('')
            setBulkLabel('')
        } finally { setBulkSaving(false) }
    }

    function exportExpanses(rows: Expanse[], filename: string) {
        exportToCsv(filename, ['Intitulé', 'Catégorie', 'Libellé', 'Ligne budgétaire', 'Montant', 'Fournisseur', 'Projet', 'Statut', 'Date achat'], rows.map(e => [
            e.title,
            e.category,
            e.label,
            e.budget_detail_id ? (budgetDetailMap.get(e.budget_detail_id)?.title ?? '') : '',
            String(e.amount),
            e.supplier_id ? (supplierMap.get(e.supplier_id)?.name ?? '') : '',
            e.project_id ? (projectMap.get(e.project_id)?.title ?? '') : '',
            e.status,
            e.purchase_date,
        ]))
    }

    // Deux portées distinctes : la barre d'actions exporte la sélection, le
    // bouton permanent exporte ce qui est à l'écran. Les noms de fichier les
    // séparent, sinon on ne sait plus lequel on a téléchargé.
    function handleExport() {
        exportExpanses(filtered.filter(e => selected.has(e.id)), 'depenses-selection.csv')
    }

    // La vue ligne n'a pas de sélection : on exporte ce qui est affiché, filtres
    // compris. Les montants partent en brut, sans séparateur de milliers, pour
    // rester exploitables dans un tableur.
    function handleExportLines() {
        exportToCsv(
            'lignes-sifac.csv',
            ['N° flux', 'Rubrique', 'Intitulé', 'Catégorie', 'Compte', 'Libellé compte',
                'Facture', 'Engagé', 'Facturé', 'Payé', 'Report',
                'Engagement', 'Facturation', 'Paiement', 'Exercice'],
            visibleLines.map(l => [
                l.flux_id,
                l.rubrique,
                l.flux_label,
                sifacCategory(l.category),
                l.account,
                l.account_label,
                l.invoice_number,
                l.amount_engaged,
                l.amount_invoiced,
                l.amount_paid,
                l.amount_report,
                l.engagement_date,
                l.invoice_date,
                l.payment_date,
                l.exercice,
            ]),
        )
    }

    const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0)
    const exportCount = displayMode === 'detailed' ? visibleLines.length : sorted.length

    const selCount  = filtered.filter(e => selected.has(e.id)).length
    const selTotal  = expanses.filter(e => selected.has(e.id)).reduce((s, e) => s + e.amount, 0)
    const selPaye   = expanses.filter(e => selected.has(e.id)).reduce((s, e) => s + paidAmount(e), 0)
    const selEngage = selTotal - selPaye

    return (
        <div className="flex flex-col gap-4">
            {/* KPI bar */}
            <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Engagé</p>
                    <p className="text-xl font-semibold mt-1">{formatAmount(totals.engaged)}</p>
                    {totals.engagedHint && <p className="text-[10px] text-muted-foreground mt-0.5">{totals.engagedHint}</p>}
                    {displayMode === 'grouped' && selCount > 0 && <p className="text-[10px] text-primary/70 mt-1">Sélection · {formatAmount(selEngage)}</p>}
                </div>
                <div className="rounded-xl border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Payé</p>
                    <p className="text-xl font-semibold mt-1">{formatAmount(totals.paid)}</p>
                    {displayMode === 'grouped' && selCount > 0 && <p className="text-[10px] text-primary/70 mt-1">Sélection · {formatAmount(selPaye)}</p>}
                </div>
                <div className="rounded-xl border bg-card p-4">
                    <p className="text-xs text-muted-foreground">{totals.thirdLabel}</p>
                    <p className="text-xl font-semibold mt-1">{formatAmount(totals.third)}</p>
                    {displayMode === 'grouped' && selCount > 0 && <p className="text-[10px] text-primary/70 mt-1">Sélection · {formatAmount(selTotal)}</p>}
                </div>
            </div>

            {/* Filtres + action bar */}
            <div className="flex gap-2 flex-wrap items-center">
                 <div className="bg-gray-200 rounded-full border p-1 flex relative w-fit">
                {([
                        { mode: 'grouped',    label: 'Groupé',    icon: <Receipt size={13} /> },
                        { mode: 'detailed',    label: 'Détaillée',   icon: <FilePenLine size={13} /> },
                    ] as { mode: Display; label: string; icon: React.ReactNode }[]).map(({ mode, label, icon }) => (
                        <button
                            key={mode}
                            onClick={() => setDisplayMode(mode)}
                            className={`relative flex items-center gap-1.5 px-4 py-1 rounded-full text-sm z-10 transition-colors duration-300 ${displayMode === mode ? 'text-white' : 'text-black'}`}
                        >
                            <span className="relative z-20 flex items-center gap-1.5">
                                {icon}{label}
                            </span>
                            {displayMode === mode && (
                                <motion.div
                                    layoutId="ActiveMode"
                                    className="absolute inset-0 bg-black rounded-full z-10"
                                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                />
                            )}
                        </button>
                    ))}
            </div>
                <div className="relative flex-1 min-w-48">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Rechercher une dépense…" className="pl-8 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Catégorie" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Toutes les catégories</SelectItem>
                        {EXPANSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={labelFilter} onValueChange={setLabelFilter}>
                    <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Libellé" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous les libellés</SelectItem>
                        {labels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Statut" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
                <div className="flex items-center gap-1 w-48">
                    <SearchInput
                        data={leafBudgetDetails}
                        onSelect={d => setDetailFilter(d.id)}
                        getLabel={d => d.title}
                        value={detailFilter !== null ? (budgetDetailMap.get(detailFilter)?.title ?? '') : ''}
                        placeholder="Ligne budgétaire…"
                        dropdownClassName="min-w-[260px]"
                        groupBy={d => ({ primary: budgetDetailMap.get(d.parent_id!)?.title ?? '' })}
                    />
                    {detailFilter !== null && (
                        <button onClick={() => setDetailFilter(null)} className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground">
                            <X size={11} />
                        </button>
                    )}
                </div>
                <DateRangePopover
                    label="Engagement"
                    from={purchaseFrom} to={purchaseTo}
                    onFromChange={setPurchaseFrom} onToChange={setPurchaseTo}
                />
                <DateRangePopover
                    label="Paiement"
                    from={paymentFrom} to={paymentTo}
                    onFromChange={setPaymentFrom} onToChange={setPaymentTo}
                />
                {(search || categoryFilter !== 'all' || labelFilter !== 'all' || statusFilter !== 'all' || detailFilter !== null || purchaseFrom || purchaseTo || paymentFrom || paymentTo) && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setSearch(''); setCategoryFilter('all'); setLabelFilter('all'); setStatusFilter('all'); setDetailFilter(null); setPurchaseFrom(''); setPurchaseTo(''); setPaymentFrom(''); setPaymentTo('') }}>
                        Réinitialiser
                    </Button>
                )}
                <div className="ml-auto flex items-center gap-2">
                    {displayMode === 'grouped' && selCount > 0 && <ActionBar count={selCount} onExport={handleExport} onDelete={handleDelete} onReclassify={() => { setBulkDetailId(null); setBulkModal('detail') }} onRecategorize={() => { setBulkCategory(''); setBulkLabel(''); setBulkModal('category') }} />}
                    <Button
                        variant="outline" size="sm" className="h-8 text-xs gap-1 rounded-md"
                        disabled={exportCount === 0}
                        onClick={displayMode === 'detailed'
                            ? handleExportLines
                            : () => exportExpanses(sorted, 'depenses.csv')}
                    >
                        <FileDown size={11} /> Exporter {exportCount} {displayMode === 'detailed' ? 'ligne' : 'dépense'}{exportCount > 1 ? 's' : ''}
                    </Button>
                    {/* Copie explicite : en mode mock, getExpanses rend le tableau source
                        muté sur place. Sans nouvelle référence, les useMemo de filtrage
                        conservent leur résultat et le tableau resterait figé. */}
                    <SifacImportButton onImported={async () => {
                        setExpanses([...await getExpanses()])
                        setSifacLines(null)
                        setExpandedId(null)
                    }} />
                    <Button size="sm" className="h-8 text-xs gap-1 rounded-md" onClick={startAdd} disabled={isAdding}>
                        <Plus size={11} /> Nouvelle dépense
                    </Button>
                </div>
            </div>

            {/* Tableau */}
            {displayMode === "grouped" && (
                <>
                <div className="rounded-lg bg-background border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="text-xs bg-muted/50">
                            <TableHead className="h-8 w-8 px-3">
                                <Checkbox checked={allFilteredSelected ? true : someSelected ? 'indeterminate' : false} onCheckedChange={toggleAll} />
                            </TableHead>
                            {([
                                { key: 'title',    label: 'Intitulé',          className: 'h-8' },
                                { key: 'category', label: 'Catégorie',         className: 'h-8 w-36' },
                                { key: 'label',    label: 'Libellé dépense',   className: 'h-8 w-36' },
                                { key: 'detail',   label: 'Ligne budgétaire',  className: 'h-8 w-44' },
                                { key: 'amount',   label: 'Montant',           className: 'h-8 w-28 text-right' },
                                { key: 'supplier', label: 'Fournisseur', className: 'h-8 w-36' },
                                { key: 'project',  label: 'Projet',      className: 'h-8 w-36' },
                                { key: 'convention', label: 'Convention', className: 'h-8 w-40' },
                                { key: 'status',   label: 'Statut',      className: 'h-8 w-28' },
                                { key: 'purchase', label: 'Engagement',  className: 'h-8 w-28' },
                                { key: 'payment',  label: 'Paiement',    className: 'h-8 w-28' },
                            ] as const).map(col => (
                                <TableHead key={col.key} className={col.className}>
                                    <button
                                        onClick={() => toggleSort(col.key)}
                                        className="flex items-center gap-1 hover:text-foreground text-muted-foreground transition-colors w-full"
                                    >
                                        <span className={sortKey === col.key ? 'text-foreground font-medium' : ''}>{col.label}</span>
                                        {sortKey === col.key
                                            ? sortDir === 'asc' ? <ChevronUp size={11} className="shrink-0 text-foreground" /> : <ChevronDown size={11} className="shrink-0 text-foreground" />
                                            : <ChevronsUpDown size={11} className="shrink-0 opacity-40" />
                                        }
                                    </button>
                                </TableHead>
                            ))}
                            <TableHead className="h-8 w-16" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isAdding && (
                            <TableRow className="text-xs bg-blue-50/60">
                                <TableCell className="px-3" />
                                <TableCell>
                                    <Input autoFocus value={newDraft.title ?? ''} onChange={ev => setNewDraft(d => ({ ...d, title: ev.target.value }))} placeholder="Intitulé" className="h-7 text-xs" />
                                </TableCell>
                                <TableCell>
                                    <Select value={newDraft.category ?? ''} onValueChange={v => setNewDraft(d => ({ ...d, category: v }))}>
                                        <SelectTrigger className="h-7 text-xs w-full"><SelectValue placeholder="Catégorie" /></SelectTrigger>
                                        <SelectContent>{EXPANSE_CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <Select value={newDraft.label ?? ''} onValueChange={v => setNewDraft(d => ({ ...d, label: v }))}>
                                        <SelectTrigger className="h-7 text-xs w-full"><SelectValue placeholder="Libellé" /></SelectTrigger>
                                        <SelectContent>{(labelsByCategory[newDraft.category ?? ''] ?? labels).map(l => <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>)}</SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <SearchInput
                                        data={leafBudgetDetails}
                                        onSelect={d => setNewDraft(prev => ({ ...prev, budget_detail_id: d.id }))}
                                        getLabel={d => d.title}
                                        value={newDraft.budget_detail_id ? (budgetDetailMap.get(newDraft.budget_detail_id)?.title ?? '') : ''}
                                        placeholder="Ligne budgétaire…"
                                        dropdownClassName="min-w-[260px]"
                                        groupBy={d => ({ primary: budgetDetailMap.get(d.parent_id!)?.title ?? '' })}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input type="number" step="0.01" value={newDraft.amount ?? ''} onChange={ev => setNewDraft(d => ({ ...d, amount: parseAmount(ev.target.value) }))} placeholder="0" className="h-7 text-xs text-right" />
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1">
                                        <SearchInput
                                            data={suppliers}
                                            onSelect={s => setNewDraft(d => ({ ...d, supplier_id: s.id }))}
                                            getLabel={s => s.name}
                                            value={newDraft.supplier_id ? (supplierMap.get(newDraft.supplier_id)?.name ?? '') : ''}
                                            placeholder="Fournisseur…"
                                            dropdownClassName="min-w-[220px]"
                                        />
                                        <NewSupplierPopover
                                            suppliers={suppliers}
                                            onCreated={s => { setSuppliers(prev => [...prev, s]); setNewDraft(d => ({ ...d, supplier_id: s.id })) }}
                                        />
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <SearchInput
                                        data={projects}
                                        onSelect={p => setNewDraft(d => ({ ...d, project_id: p.id }))}
                                        getLabel={p => p.title}
                                        value={newDraft.project_id ? (projectMap.get(newDraft.project_id)?.title ?? '') : ''}
                                        placeholder="Projet…"
                                        dropdownClassName="min-w-[260px]"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Select value={newDraft.agreement_id != null ? String(newDraft.agreement_id) : '__none__'} onValueChange={v => setNewDraft(d => ({ ...d, agreement_id: v === '__none__' ? null : Number(v) }))}>
                                        <SelectTrigger className="h-7 text-xs w-full"><SelectValue placeholder="— Aucune —" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__" className="text-xs text-muted-foreground">— Aucune —</SelectItem>
                                            {agreements.map(a => <SelectItem key={a.id} value={String(a.id)} className="text-xs">{a.title}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <Select value={newDraft.status ?? ''} onValueChange={v => setNewDraft(d => ({ ...d, status: v }))}>
                                        <SelectTrigger className="h-7 text-xs w-full"><SelectValue /></SelectTrigger>
                                        <SelectContent>{Object.keys(EXPANSE_STATUS_COLORS).map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell><Input type="date" value={newDraft.purchase_date ?? ''} onChange={ev => setNewDraft(d => ({ ...d, purchase_date: ev.target.value }))} className="h-7 text-xs" /></TableCell>
                                <TableCell><Input type="date" value={newDraft.payment_date ?? ''} onChange={ev => setNewDraft(d => ({ ...d, payment_date: ev.target.value }))} className="h-7 text-xs" /></TableCell>
                                <TableCell>
                                    <div className="flex gap-1">
                                        <button onClick={saveNew} disabled={saving} className="p-1 rounded hover:bg-green-100 text-green-700 disabled:opacity-40"><Check size={13} /></button>
                                        <button onClick={cancelAdd} className="p-1 rounded hover:bg-red-100 text-red-500"><X size={13} /></button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                        {filtered.length === 0 && !isAdding ? (
                            <TableRow>
                                <TableCell colSpan={11} className="text-center text-sm text-muted-foreground py-8">
                                    Aucune dépense trouvée
                                </TableCell>
                            </TableRow>
                        ) : sorted.map(e => {
                            const isEditing = editingId === e.id
                            const isSelected = selected.has(e.id)
                            const detail = e.budget_detail_id ? budgetDetailMap.get(e.budget_detail_id) : null
                            const detailCategory = detail ? budgetCategoryMap.get(detail.budget_category_id) : null
                            const supplier = e.supplier_id ? supplierMap.get(e.supplier_id) : null
                            const project = e.project_id ? projectMap.get(e.project_id) : null

                            if (isEditing) return (
                                <TableRow key={e.id} className="text-xs bg-blue-50/60">
                                    <TableCell className="px-3">
                                        <Checkbox checked={isSelected} onCheckedChange={() => toggleRow(e.id)} />
                                    </TableCell>
                                    <TableCell>
                                        <Input value={draft.title ?? ''} onChange={ev => setDraft(d => ({ ...d, title: ev.target.value }))} className="h-7 text-xs" />
                                    </TableCell>
                                    <TableCell>
                                        <Select value={draft.category ?? ''} onValueChange={v => setDraft(d => ({ ...d, category: v }))}>
                                            <SelectTrigger className="h-7 text-xs w-full"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {EXPANSE_CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Select value={draft.label ?? ''} onValueChange={v => setDraft(d => ({ ...d, label: v }))}>
                                            <SelectTrigger className="h-7 text-xs w-full"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {(labelsByCategory[draft.category ?? ''] ?? labels).map(l => <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <SearchInput
                                            data={leafBudgetDetails}
                                            onSelect={d => setDraft(prev => ({ ...prev, budget_detail_id: d.id }))}
                                            getLabel={d => d.title}
                                            value={draft.budget_detail_id ? (budgetDetailMap.get(draft.budget_detail_id)?.title ?? '') : ''}
                                            placeholder="Ligne budgétaire…"
                                            dropdownClassName="min-w-[260px]"
                                            groupBy={d => ({ primary: budgetDetailMap.get(d.parent_id!)?.title ?? '' })}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" step="0.01" value={draft.amount ?? ''} onChange={ev => setDraft(d => ({ ...d, amount: parseAmount(ev.target.value) }))} className="h-7 text-xs text-right" />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <SearchInput
                                                data={suppliers}
                                                onSelect={s => setDraft(d => ({ ...d, supplier_id: s.id }))}
                                                getLabel={s => s.name}
                                                value={draft.supplier_id ? (supplierMap.get(draft.supplier_id)?.name ?? '') : ''}
                                                placeholder="Fournisseur…"
                                                dropdownClassName="min-w-[220px]"
                                            />
                                            <NewSupplierPopover
                                                suppliers={suppliers}
                                                onCreated={s => { setSuppliers(prev => [...prev, s]); setDraft(d => ({ ...d, supplier_id: s.id })) }}
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <SearchInput
                                            data={projects}
                                            onSelect={p => setDraft(d => ({ ...d, project_id: p.id }))}
                                            getLabel={p => p.title}
                                            value={draft.project_id ? (projectMap.get(draft.project_id)?.title ?? '') : ''}
                                            placeholder="Projet…"
                                            dropdownClassName="min-w-[260px]"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Select value={draft.agreement_id != null ? String(draft.agreement_id) : '__none__'} onValueChange={v => setDraft(d => ({ ...d, agreement_id: v === '__none__' ? null : Number(v) }))}>
                                            <SelectTrigger className="h-7 text-xs w-full"><SelectValue placeholder="— Aucune —" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="__none__" className="text-xs text-muted-foreground">— Aucune —</SelectItem>
                                                {agreements.map(a => <SelectItem key={a.id} value={String(a.id)} className="text-xs">{a.title}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Select value={draft.status ?? ''} onValueChange={v => setDraft(d => ({ ...d, status: v }))}>
                                            <SelectTrigger className="h-7 text-xs w-full"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {Object.keys(EXPANSE_STATUS_COLORS).map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Input type="date" value={draft.purchase_date ?? ''} onChange={ev => setDraft(d => ({ ...d, purchase_date: ev.target.value }))} className="h-7 text-xs" />
                                    </TableCell>
                                    <TableCell>
                                        <Input type="date" value={draft.payment_date ?? ''} onChange={ev => setDraft(d => ({ ...d, payment_date: ev.target.value }))} className="h-7 text-xs" />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <button onClick={saveEdit} className="p-1 rounded hover:bg-green-100 text-green-700"><Check size={13} /></button>
                                            <button onClick={cancelEdit} className="p-1 rounded hover:bg-muted text-muted-foreground"><X size={13} /></button>
                                            <button onClick={() => { setSelected(new Set([e.id])); setConfirmDelete(true) }} className="p-1 rounded hover:bg-red-100 text-red-500"><Trash2 size={13} /></button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )

                            return (
                                <React.Fragment key={e.id}>
                                <TableRow className={`text-xs group ${isSelected ? 'bg-muted/50' : 'hover:bg-muted/30'}`}>
                                    <TableCell className="px-3">
                                        <Checkbox checked={isSelected} onCheckedChange={() => toggleRow(e.id)} />
                                    </TableCell>
                                    <TableCell className="font-medium max-w-xs">
                                        <div className="flex items-center gap-1">
                                            {e.flux_id ? (
                                                <button
                                                    onClick={() => toggleDetail(e.id)}
                                                    className="shrink-0 p-0.5 rounded hover:bg-muted text-muted-foreground"
                                                    title="Lignes comptables SIFAC"
                                                >
                                                    {expandedId === e.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                                </button>
                                            ) : <span className="shrink-0 w-[18px]" />}
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="truncate block max-w-xs cursor-default">{e.title}</span>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom" className="max-w-xs text-xs">{e.description}</TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {e.category && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: CATEGORY_COLORS[e.category] ?? '#f3f4f6' }}>
                                            {e.category}
                                        </span>}
                                    </TableCell>
                                    <TableCell>
                                        {e.label && <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: CATEGORY_COLORS[e.category] ?? '#f3f4f6' }}>
                                            {e.label}
                                        </span>}
                                    </TableCell>
                                    <TableCell className="truncate max-w-44">
                                        <span className="text-foreground">{detail?.title ?? '—'}</span>
                                        {detailCategory && <p className="text-[10px] text-muted-foreground leading-tight">{detailCategory.title}</p>}
                                    </TableCell>
                                    <TableCell className="text-right font-medium tabular-nums">{formatAmount(e.amount)}</TableCell>
                                    <TableCell className="text-muted-foreground truncate">{supplier?.name ?? '—'}</TableCell>
                                    <TableCell className="text-muted-foreground truncate">{project?.title ?? '—'}</TableCell>
                                    <TableCell className="text-muted-foreground truncate">
                                        {e.agreement_id ? (
                                            <span className="text-[10px] text-blue-600 font-medium">
                                                ↳ {agreementMap.get(e.agreement_id)?.title ?? '—'}
                                            </span>
                                        ) : '—'}
                                    </TableCell>
                                    <TableCell>
                                        <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: EXPANSE_STATUS_COLORS[e.status] ?? '#f3f4f6' }}>
                                            {e.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground tabular-nums">{formatDate(e.purchase_date)}</TableCell>
                                    <TableCell className="text-muted-foreground tabular-nums">{formatDate(e.payment_date)}</TableCell>
                                    <TableCell>
                                        <button onClick={() => startEdit(e)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-opacity">
                                            <Pencil size={12} className="text-muted-foreground" />
                                        </button>
                                    </TableCell>
                                </TableRow>
                                {expandedId === e.id && (
                                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                                        <TableCell colSpan={13} className="p-0">
                                            <div className="px-10 py-3">
                                                {sifacLines === null
                                                    ? <p className="text-[11px] text-muted-foreground">Chargement des lignes comptables…</p>
                                                    : <SifacLineDetail lines={sifacLines.filter(l => l.flux_id === e.flux_id)} />}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                                </React.Fragment>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>
            {filtered.length > 0 && (
                <p className="text-xs text-muted-foreground text-right">
                    {filtered.length} dépense{filtered.length > 1 ? 's' : ''} · {formatAmount(totalFiltered)}
                </p>
            )}
            </>
            )}

            {displayMode === 'detailed' && (
                sifacLines === null
                    ? <p className="text-[11px] text-muted-foreground">Chargement des lignes comptables…</p>
                    : <SifacLineDetailedTable lines={visibleLines} />
                        )}

            {/* ── Modale reclassement ligne budgétaire ── */}
            <Dialog open={bulkModal === 'detail'} onOpenChange={open => { if (!open) setBulkModal(null) }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Reclasser {selCount} dépense{selCount > 1 ? 's' : ''}</DialogTitle>
                        <DialogDescription>Choisissez la nouvelle ligne budgétaire.</DialogDescription>
                    </DialogHeader>
                    <div className="py-1">
                        <SearchInput
                            data={leafBudgetDetails}
                            onSelect={d => setBulkDetailId(d.id)}
                            getLabel={d => d.title}
                            value={bulkDetailId ? (budgetDetailMap.get(bulkDetailId)?.title ?? '') : ''}
                            placeholder="Rechercher une ligne budgétaire…"
                            dropdownClassName="min-w-[320px]"
                            groupBy={d => ({ primary: budgetDetailMap.get(d.parent_id!)?.title ?? '' })}
                        />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" size="sm" onClick={() => setBulkModal(null)}>Annuler</Button>
                        <Button size="sm" onClick={applyBulkReclassify} disabled={bulkDetailId == null || bulkSaving}>
                            {bulkSaving ? 'Enregistrement…' : 'Appliquer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Modale recatégorisation ── */}
            <Dialog open={bulkModal === 'category'} onOpenChange={open => { if (!open) setBulkModal(null) }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Recatégoriser {selCount} dépense{selCount > 1 ? 's' : ''}</DialogTitle>
                        <DialogDescription>Choisissez la nouvelle catégorie et le libellé.</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 py-1">
                        <div className="flex flex-col gap-1">
                            <Label>Catégorie</Label>
                            <Select value={bulkCategory} onValueChange={v => { setBulkCategory(v); setBulkLabel('') }}>
                                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                                <SelectContent>{EXPANSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label>Libellé <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
                            <Select value={bulkLabel} onValueChange={setBulkLabel} disabled={!bulkCategory}>
                                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                                <SelectContent>{(labelsByCategory[bulkCategory] ?? []).map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" size="sm" onClick={() => setBulkModal(null)}>Annuler</Button>
                        <Button size="sm" onClick={applyBulkCategory} disabled={!bulkCategory || bulkSaving}>
                            {bulkSaving ? 'Enregistrement…' : 'Appliquer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Supprimer {selCount} dépense{selCount > 1 ? 's' : ''} ?</DialogTitle>
                        <DialogDescription>Cette action est irréversible.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>Annuler</Button>
                        <Button variant="destructive" size="sm" onClick={doDelete}>Supprimer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// ─── Onglet Conventions ─────────────────────────────────────────────────────

interface ConventionsTabProps {
    agreements: FinancialAgreement[]
    setAgreements: React.Dispatch<React.SetStateAction<FinancialAgreement[]>>
    partners: Partner[]
    projects: Project[]
    statuses: Status[]
    budgetCategories: BudgetCategory[]
    budgetDetails: BudgetDetail[]
}

function ConventionsTab({ agreements, setAgreements, partners, projects, statuses, budgetCategories, budgetDetails }: ConventionsTabProps) {
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [partnerFilter, setPartnerFilter] = useState<number | null>(null)
    const [projectFilter, setProjectFilter] = useState<number | null>(null)
    const [sortKey, setSortKey] = useState<string | null>(null)
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
    const [selected, setSelected] = useState<Set<number>>(new Set())
    const budgetDetailMap   = useMemo(() => new Map(budgetDetails.map(d => [d.id, d])), [budgetDetails])
    const leafBudgetDetails = useMemo(() => budgetDetails.filter(d => d.parent_id !== null), [budgetDetails])
    const budgetCategoryMap = useMemo(() => new Map(budgetCategories.map(c => [c.id, c])), [budgetCategories])
    const [editingId, setEditingId] = useState<number | null>(null)
    const [draft, setDraft] = useState<Partial<FinancialAgreement>>({})
    const [isAdding, setIsAdding] = useState(false)
    const [newDraft, setNewDraft] = useState<Partial<FinancialAgreement>>({})
    const [saving, setSaving] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)

    const partnerMap = useMemo(() => new Map(partners.map(p => [p.id, p])), [partners])
    const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects])
    const statusMap = useMemo(() => new Map(statuses.map(s => [s.id, s])), [statuses])
    const agreementStatuses = useMemo(() => statuses.filter(s => s.context === 'financial_agreement'), [statuses])

    const filtered = useMemo(() => agreements.filter(a => {
        if (search) {
            const q = search.toLowerCase()
            const partner = partnerMap.get(a.partner_id)
            if (!a.title.toLowerCase().includes(q) && !(partner?.name.toLowerCase().includes(q))) return false
        }
        if (statusFilter !== 'all') {
            const status = statusMap.get(a.status_id)
            if (status?.label !== statusFilter) return false
        }
        if (partnerFilter !== null && a.partner_id !== partnerFilter) return false
        if (projectFilter !== null && a.project_id !== projectFilter) return false
        return true
    }), [agreements, search, statusFilter, statusMap, partnerMap, partnerFilter, projectFilter])

    const totalGrant = agreements.reduce((s, a) => s + a.grant, 0)
    const totalBudget = agreements.reduce((s, a) => s + a.budget, 0)
    const activeCount = agreements.filter(a => statusMap.get(a.status_id)?.label === 'Active').length

    const allFilteredSelected = filtered.length > 0 && filtered.every(a => selected.has(a.id))
    const someSelected = filtered.some(a => selected.has(a.id))

    function toggleRow(id: number) {
        setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
    }

    function toggleAll() {
        if (allFilteredSelected) {
            setSelected(prev => { const n = new Set(prev); filtered.forEach(a => n.delete(a.id)); return n })
        } else {
            setSelected(prev => { const n = new Set(prev); filtered.forEach(a => n.add(a.id)); return n })
        }
    }

    function startAdd() {
        setIsAdding(true)
        setNewDraft({ title: '', description: '', budget: 0, grant: 0, signed_date: '', project_id: projects[0]?.id ?? 1, partner_id: partners[0]?.id ?? 1, axis_id: null, status_id: agreementStatuses[0]?.id ?? 1, budget_detail_id: null })
        setEditingId(null)
    }

    async function saveNew() {
        if (saving) return
        setSaving(true)
        try {
            const created = await addAgreement(newDraft as Omit<FinancialAgreement, 'id'>)
            setAgreements(prev => [created, ...prev])
            setIsAdding(false)
            setNewDraft({})
        } finally {
            setSaving(false)
        }
    }

    function cancelAdd() { setIsAdding(false); setNewDraft({}) }

    function startEdit(a: FinancialAgreement) { setEditingId(a.id); setDraft({ ...a }) }

    async function saveEdit() {
        if (editingId == null) return
        const { id: _id, ...patch } = draft as FinancialAgreement
        await updateAgreement(editingId, patch)
        setAgreements(prev => prev.map(a => a.id === editingId ? { ...a, ...patch } : a))
        setEditingId(null); setDraft({})
    }

    function cancelEdit() { setEditingId(null); setDraft({}) }

    async function doDelete() {
        await Promise.all([...selected].map(id => deleteAgreement(id)))
        setAgreements(prev => prev.filter(a => !selected.has(a.id)))
        setSelected(new Set())
        setConfirmDelete(false)
    }

    function handleDelete() { setConfirmDelete(true) }

    function handleExport() {
        const rows = filtered.filter(a => selected.has(a.id))
        exportToCsv('conventions.csv', ['Intitulé', 'Partenaire', 'Projet', 'Budget', 'Subvention', 'Statut', 'Date signature'], rows.map(a => [
            a.title,
            partnerMap.get(a.partner_id)?.name ?? '',
            projectMap.get(a.project_id)?.title ?? '',
            String(a.budget),
            String(a.grant),
            statusMap.get(a.status_id)?.label ?? '',
            a.signed_date,
        ]))
    }

    const sorted = useMemo(() => {
        if (!sortKey) return filtered
        return [...filtered].sort((a, b) => {
            let va: string | number = '', vb: string | number = ''
            if (sortKey === 'title')    { va = a.title; vb = b.title }
            else if (sortKey === 'partner') { va = partnerMap.get(a.partner_id)?.name ?? ''; vb = partnerMap.get(b.partner_id)?.name ?? '' }
            else if (sortKey === 'project') { va = projectMap.get(a.project_id)?.title ?? ''; vb = projectMap.get(b.project_id)?.title ?? '' }
            else if (sortKey === 'budget')  { va = a.budget; vb = b.budget }
            else if (sortKey === 'grant')   { va = a.grant; vb = b.grant }
            else if (sortKey === 'status')  { va = statusMap.get(a.status_id)?.label ?? ''; vb = statusMap.get(b.status_id)?.label ?? '' }
            else if (sortKey === 'signed')  { va = a.signed_date ?? ''; vb = b.signed_date ?? '' }
            const cmp = typeof va === 'number' ? va - (vb as number) : String(va).localeCompare(String(vb), 'fr', { sensitivity: 'base' })
            return sortDir === 'asc' ? cmp : -cmp
        })
    }, [filtered, sortKey, sortDir, partnerMap, projectMap, statusMap])

    function toggleSort(key: string) {
        if (sortKey === key) {
            if (sortDir === 'asc') setSortDir('desc')
            else { setSortKey(null); setSortDir('asc') }
        } else {
            setSortKey(key); setSortDir('asc')
        }
    }

    const selCount = filtered.filter(a => selected.has(a.id)).length

    return (
        <div className="flex flex-col gap-4">
            {/* KPI bar */}
            <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Total conventions</p>
                    <p className="text-xl font-semibold mt-1">{agreements.length} <span className="text-sm font-normal text-muted-foreground">({activeCount} actives)</span></p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Montant total engagé</p>
                    <p className="text-xl font-semibold mt-1">{formatAmount(totalBudget)}</p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Subventions accordées</p>
                    <p className="text-xl font-semibold mt-1">{formatAmount(totalGrant)}</p>
                </div>
            </div>

            {/* Filtres + action bar */}
            <div className="flex gap-2 flex-wrap items-center">
                <div className="relative flex-1 min-w-48">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Rechercher une convention…" className="pl-8 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Statut" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        {agreementStatuses.filter(s => s.label !== '').map(s => <SelectItem key={s.id} value={s.label}>{s.label}</SelectItem>)}
                    </SelectContent>
                </Select>
                <div className="flex items-center gap-1 w-44">
                    <SearchInput
                        data={partners}
                        onSelect={p => setPartnerFilter(p.id)}
                        getLabel={p => p.name}
                        value={partnerFilter !== null ? (partnerMap.get(partnerFilter)?.name ?? '') : ''}
                        placeholder="Partenaire…"
                        dropdownClassName="min-w-[220px]"
                    />
                    {partnerFilter !== null && (
                        <button onClick={() => setPartnerFilter(null)} className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground">
                            <X size={11} />
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-1 w-52">
                    <SearchInput
                        data={projects}
                        onSelect={p => setProjectFilter(p.id)}
                        getLabel={p => p.title}
                        value={projectFilter !== null ? (projectMap.get(projectFilter)?.title ?? '') : ''}
                        placeholder="Projet…"
                        dropdownClassName="min-w-[260px]"
                    />
                    {projectFilter !== null && (
                        <button onClick={() => setProjectFilter(null)} className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground">
                            <X size={11} />
                        </button>
                    )}
                </div>
                {(search || statusFilter !== 'all' || partnerFilter !== null || projectFilter !== null) && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setSearch(''); setStatusFilter('all'); setPartnerFilter(null); setProjectFilter(null) }}>
                        Réinitialiser
                    </Button>
                )}
                <div className="ml-auto flex items-center gap-2">
                    {selCount > 0 && <ActionBar count={selCount} onExport={handleExport} onDelete={handleDelete} />}
                    <Button size="sm" className="h-8 text-xs gap-1 rounded-md" onClick={startAdd} disabled={isAdding}>
                        <Plus size={11} /> Nouvelle convention
                    </Button>
                </div>
            </div>

            {/* Tableau */}
            <div className="rounded-lg border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="text-xs bg-muted/50">
                            <TableHead className="h-8 w-8 px-3">
                                <Checkbox
                                    checked={allFilteredSelected ? true : someSelected ? 'indeterminate' : false}
                                    onCheckedChange={toggleAll}
                                />
                            </TableHead>
                            {([
                                { key: 'title',   label: 'Intitulé',        className: 'h-8' },
                                { key: 'partner', label: 'Partenaire',      className: 'h-8 w-36' },
                                { key: 'project', label: 'Projet',          className: 'h-8 w-36' },
                                { key: 'detail',  label: 'Ligne budgétaire',className: 'h-8 w-40' },
                                { key: 'grant',   label: 'Montant',         className: 'h-8 w-28 text-right' },
                                { key: 'status',  label: 'Statut',          className: 'h-8 w-28' },
                                { key: 'signed',  label: 'Date signature',  className: 'h-8 w-28' },
                            ] as const).map(col => (
                                <TableHead key={col.key} className={col.className}>
                                    <button
                                        onClick={() => toggleSort(col.key)}
                                        className="flex items-center gap-1 hover:text-foreground text-muted-foreground transition-colors w-full"
                                    >
                                        <span className={sortKey === col.key ? 'text-foreground font-medium' : ''}>{col.label}</span>
                                        {sortKey === col.key
                                            ? sortDir === 'asc' ? <ChevronUp size={11} className="shrink-0 text-foreground" /> : <ChevronDown size={11} className="shrink-0 text-foreground" />
                                            : <ChevronsUpDown size={11} className="shrink-0 opacity-40" />
                                        }
                                    </button>
                                </TableHead>
                            ))}
                            <TableHead className="h-8 w-16" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isAdding && (
                            <TableRow className="text-xs bg-blue-50/60">
                                <TableCell className="px-3" />
                                <TableCell>
                                    <Input autoFocus value={newDraft.title ?? ''} onChange={ev => setNewDraft(d => ({ ...d, title: ev.target.value }))} placeholder="Intitulé" className="h-7 text-xs" />
                                </TableCell>
                                <TableCell>
                                    <SearchInput
                                        data={partners}
                                        onSelect={p => setNewDraft(d => ({ ...d, partner_id: p.id }))}
                                        getLabel={p => p.name}
                                        value={newDraft.partner_id ? (partnerMap.get(newDraft.partner_id)?.name ?? '') : ''}
                                        placeholder="Partenaire…"
                                        dropdownClassName="min-w-[220px]"
                                    />
                                </TableCell>
                                <TableCell>
                                    <SearchInput
                                        data={projects}
                                        onSelect={p => setNewDraft(d => ({ ...d, project_id: p.id }))}
                                        getLabel={p => p.title}
                                        value={newDraft.project_id ? (projectMap.get(newDraft.project_id)?.title ?? '') : ''}
                                        placeholder="Projet…"
                                        dropdownClassName="min-w-[260px]"
                                    />
                                </TableCell>
                                <TableCell>
                                    <SearchInput
                                        data={leafBudgetDetails}
                                        onSelect={d => setNewDraft(dr => ({ ...dr, budget_detail_id: d.id }))}
                                        getLabel={d => d.title}
                                        groupBy={d => ({ primary: budgetDetailMap.get(d.parent_id!)?.title ?? '' })}
                                        value={newDraft.budget_detail_id ? (budgetDetailMap.get(newDraft.budget_detail_id)?.title ?? '') : ''}
                                        placeholder="Ligne budgétaire…"
                                        dropdownClassName="min-w-[260px]"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input type="number" step="0.01" value={newDraft.grant ?? ''} onChange={ev => setNewDraft(d => ({ ...d, grant: parseAmount(ev.target.value) }))} placeholder="0" className="h-7 text-xs text-right" />
                                </TableCell>
                                <TableCell>
                                    <Select value={String(newDraft.status_id ?? '')} onValueChange={v => setNewDraft(d => ({ ...d, status_id: Number(v) }))}>
                                        <SelectTrigger className="h-7 text-xs w-full"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {agreementStatuses.map(s => <SelectItem key={s.id} value={String(s.id)} className="text-xs">{s.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <Input type="date" value={newDraft.signed_date ?? ''} onChange={ev => setNewDraft(d => ({ ...d, signed_date: ev.target.value }))} className="h-7 text-xs" />
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-1">
                                        <button onClick={saveNew} disabled={saving} className="p-1 rounded hover:bg-green-100 text-green-700 disabled:opacity-40"><Check size={13} /></button>
                                        <button onClick={cancelAdd} className="p-1 rounded hover:bg-muted text-muted-foreground"><X size={13} /></button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                        {filtered.length === 0 && !isAdding ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                                    Aucune convention trouvée
                                </TableCell>
                            </TableRow>
                        ) : sorted.map(a => {
                            const isSelected = selected.has(a.id)
                            const partner = partnerMap.get(a.partner_id)
                            const project = projectMap.get(a.project_id)
                            const status = statusMap.get(a.status_id)

                            if (editingId === a.id) return (
                                <TableRow key={a.id} className="text-xs bg-blue-50/60">
                                    <TableCell className="px-3">
                                        <Checkbox checked={isSelected} onCheckedChange={() => toggleRow(a.id)} />
                                    </TableCell>
                                    <TableCell>
                                        <Input value={draft.title ?? ''} onChange={ev => setDraft(d => ({ ...d, title: ev.target.value }))} className="h-7 text-xs" />
                                    </TableCell>
                                    <TableCell>
                                        <SearchInput
                                            data={partners}
                                            onSelect={p => setDraft(d => ({ ...d, partner_id: p.id }))}
                                            getLabel={p => p.name}
                                            value={draft.partner_id ? (partnerMap.get(draft.partner_id)?.name ?? '') : ''}
                                            placeholder="Partenaire…"
                                            dropdownClassName="min-w-[220px]"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <SearchInput
                                            data={projects}
                                            onSelect={p => setDraft(d => ({ ...d, project_id: p.id }))}
                                            getLabel={p => p.title}
                                            value={draft.project_id ? (projectMap.get(draft.project_id)?.title ?? '') : ''}
                                            placeholder="Projet…"
                                            dropdownClassName="min-w-[260px]"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <SearchInput
                                            data={leafBudgetDetails}
                                            onSelect={d => setDraft(dr => ({ ...dr, budget_detail_id: d.id }))}
                                            getLabel={d => d.title}
                                            groupBy={d => ({ primary: budgetDetailMap.get(d.parent_id!)?.title ?? '' })}
                                            value={draft.budget_detail_id ? (budgetDetailMap.get(draft.budget_detail_id)?.title ?? '') : ''}
                                            placeholder="Ligne budgétaire…"
                                            dropdownClassName="min-w-[260px]"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" step="0.01" value={draft.grant ?? ''} onChange={ev => setDraft(d => ({ ...d, grant: parseAmount(ev.target.value) }))} className="h-7 text-xs text-right" />
                                    </TableCell>
                                    <TableCell>
                                        <Select value={String(draft.status_id ?? '')} onValueChange={v => setDraft(d => ({ ...d, status_id: Number(v) }))}>
                                            <SelectTrigger className="h-7 text-xs w-full"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {agreementStatuses.map(s => <SelectItem key={s.id} value={String(s.id)} className="text-xs">{s.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Input type="date" value={draft.signed_date ?? ''} onChange={ev => setDraft(d => ({ ...d, signed_date: ev.target.value }))} className="h-7 text-xs" />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <button onClick={saveEdit} className="p-1 rounded hover:bg-green-100 text-green-700"><Check size={13} /></button>
                                            <button onClick={cancelEdit} className="p-1 rounded hover:bg-muted text-muted-foreground"><X size={13} /></button>
                                            <button onClick={() => { setSelected(new Set([a.id])); setConfirmDelete(true) }} className="p-1 rounded hover:bg-red-100 text-red-500"><Trash2 size={13} /></button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )

                            const detail   = a.budget_detail_id ? budgetDetailMap.get(a.budget_detail_id) : null
                            const detailCat = detail ? budgetCategoryMap.get(detail.budget_category_id) : null
                            return (
                                <TableRow key={a.id} className={`text-xs group ${isSelected ? 'bg-muted/50' : 'hover:bg-muted/30'}`}>
                                    <TableCell className="px-3">
                                        <Checkbox checked={isSelected} onCheckedChange={() => toggleRow(a.id)} />
                                    </TableCell>
                                    <TableCell className="font-medium max-w-xs">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="truncate block max-w-xs cursor-default">{a.title}</span>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="max-w-xs text-xs">{a.description}</TooltipContent>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell>
                                        {partner ? (
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium truncate block max-w-32" style={{ backgroundColor: partner.color + 50, color: 'black'}}>
                                                {partner.name}
                                            </span>
                                        ) : '—'}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground truncate max-w-36">{project?.title ?? '—'}</TableCell>
                                    <TableCell>
                                        {detail ? (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="truncate block max-w-36 cursor-default text-muted-foreground">{detail.title}</span>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom" className="text-xs">{detailCat?.title} › {detail.title}</TooltipContent>
                                            </Tooltip>
                                        ) : <span className="text-muted-foreground/50">—</span>}
                                    </TableCell>
                                    <TableCell className="text-right font-medium tabular-nums">{formatAmount(a.grant)}</TableCell>
                                    <TableCell>
                                        <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: AGREEMENT_STATUS_COLORS[status?.label ?? ''] ?? '#f3f4f6' }}>
                                            {status?.label ?? '—'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground tabular-nums">{formatDate(a.signed_date)}</TableCell>
                                    <TableCell>
                                        <button onClick={() => startEdit(a)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-opacity">
                                            <Pencil size={12} className="text-muted-foreground" />
                                        </button>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>
            {filtered.length > 0 && (
                <p className="text-xs text-muted-foreground text-right">
                    {filtered.length} convention{filtered.length > 1 ? 's' : ''} · {formatAmount(filtered.reduce((s, a) => s + a.grant, 0))} en subventions
                </p>
            )}

            <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Supprimer {selCount} convention{selCount > 1 ? 's' : ''} ?</DialogTitle>
                        <DialogDescription>Cette action est irréversible.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>Annuler</Button>
                        <Button variant="destructive" size="sm" onClick={doDelete}>Supprimer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// ─── Budget Tab ──────────────────────────────────────────────────────────────

function proratedBudget(d: BudgetDetail, year: number | null): number {
    if (year === null || !d.start_date || !d.end_date) return d.budget
    const start  = new Date(d.start_date), end = new Date(d.end_date)
    const yStart = new Date(year, 0, 1),  yEnd = new Date(year, 11, 31)
    const oStart = start < yStart ? yStart : start
    const oEnd   = end > yEnd ? yEnd : end
    if (oStart > oEnd) return 0
    const overlapMs = oEnd.getTime() - oStart.getTime() + 86400000
    const totalMs   = end.getTime() - start.getTime() + 86400000
    return Math.round(d.budget * overlapMs / totalMs)
}

function periodLabel(d: BudgetDetail): string | null {
    if (!d.start_date && !d.end_date) return null
    const fmt = (s: string) => new Date(s).toLocaleDateString('fr-FR', { month: '2-digit', year: 'numeric' })
    if (d.start_date && d.end_date) return `${fmt(d.start_date)} → ${fmt(d.end_date)}`
    if (d.start_date) return `Dès ${fmt(d.start_date)}`
    return `Jusqu'à ${fmt(d.end_date!)}`
}

function BudgetTab({
    program,
    expanses,
    budgetCategories,
    budgetDetails,
    setBudgetCategories,
    setBudgetDetails,
}: {
    program: Program | null
    expanses: Expanse[]
    budgetCategories: BudgetCategory[]
    budgetDetails: BudgetDetail[]
    setBudgetCategories: React.Dispatch<React.SetStateAction<BudgetCategory[]>>
    setBudgetDetails: React.Dispatch<React.SetStateAction<BudgetDetail[]>>
}) {
    const [budgetMode, setBudgetMode] = useState<'engaged' | 'paid'>('engaged')
    const [yearFilter, setYearFilter] = useState<number | null>(null)

    const groupDetails = useMemo(() => budgetDetails.filter(d => d.parent_id === null), [budgetDetails])
    const leafDetails  = useMemo(() => budgetDetails.filter(d => d.parent_id !== null),  [budgetDetails])

    const availableYears = useMemo(() => {
        const years = new Set<number>()
        leafDetails.forEach(d => {
            if (d.start_date && d.end_date) {
                const sy = new Date(d.start_date).getFullYear(), ey = new Date(d.end_date).getFullYear()
                for (let y = sy; y <= ey; y++) years.add(y)
            }
        })
        return [...years].sort()
    }, [leafDetails])

    function overlapsYear(d: BudgetDetail, year: number): boolean {
        if (!d.start_date || !d.end_date) return true
        return new Date(d.start_date).getFullYear() <= year && new Date(d.end_date).getFullYear() >= year
    }

    const visibleLeafs = useMemo(() =>
        yearFilter === null ? leafDetails : leafDetails.filter(d => overlapsYear(d, yearFilter)),
        [leafDetails, yearFilter]
    )
    const visibleLeafIds = useMemo(() => new Set(visibleLeafs.map(d => d.id)), [visibleLeafs])

    // ── Modals detail ───────────────────────────────────────────────────────────
    type DetailModalMode = 'create-group' | 'create-child' | 'edit' | 'delete'
    const [detailModal, setDetailModal] = useState<{
        mode: DetailModalMode; detail?: BudgetDetail; categoryId?: number; parentId?: number
    } | null>(null)
    const [detailForm, setDetailForm] = useState({ title: '', description: '', budget: 0, start_date: null as string | null, end_date: null as string | null })
    const [detailSaving, setDetailSaving] = useState(false)

    function openCreateGroup(categoryId: number) {
        setDetailForm({ title: '', description: '', budget: 0, start_date: null, end_date: null })
        setDetailModal({ mode: 'create-group', categoryId })
    }
    function openCreateChild(parentId: number, categoryId: number) {
        setDetailForm({ title: '', description: '', budget: 0, start_date: null, end_date: null })
        setDetailModal({ mode: 'create-child', parentId, categoryId })
    }
    function openEdit(d: BudgetDetail) {
        setDetailForm({ title: d.title, description: d.description, budget: d.budget, start_date: d.start_date, end_date: d.end_date })
        setDetailModal({ mode: 'edit', detail: d })
    }
    function openDelete(d: BudgetDetail) { setDetailModal({ mode: 'delete', detail: d }) }

    async function handleSaveDetail() {
        if (!detailModal) return
        setDetailSaving(true)
        try {
            if (detailModal.mode === 'create-group' && detailModal.categoryId != null) {
                await createBudgetDetail({ title: detailForm.title, description: detailForm.description, budget: detailForm.budget, budget_category_id: detailModal.categoryId, parent_id: null, start_date: detailForm.start_date, end_date: detailForm.end_date })
            } else if (detailModal.mode === 'create-child' && detailModal.parentId != null && detailModal.categoryId != null) {
                await createBudgetDetail({ ...detailForm, budget_category_id: detailModal.categoryId, parent_id: detailModal.parentId })
            } else if (detailModal.mode === 'edit' && detailModal.detail) {
                await updateBudgetDetail(detailModal.detail.id, { title: detailForm.title, description: detailForm.description, budget: detailForm.budget, start_date: detailForm.start_date, end_date: detailForm.end_date })
            }
            setBudgetDetails(await getBudgetDetails())
            setDetailModal(null)
        } finally { setDetailSaving(false) }
    }

    async function handleDeleteDetail() {
        if (!detailModal?.detail) return
        setDetailSaving(true)
        try {
            await deleteBudgetDetail(detailModal.detail.id)
            setBudgetDetails(await getBudgetDetails())
            setDetailModal(null)
        } finally { setDetailSaving(false) }
    }

    // ── Modals catégorie ────────────────────────────────────────────────────────
    type CatModalMode = 'create' | 'edit' | 'delete'
    const [catModal, setCatModal] = useState<{ mode: CatModalMode; cat?: BudgetCategory } | null>(null)
    const [catForm, setCatForm] = useState({ title: '' })
    const [catSaving, setCatSaving] = useState(false)

    function openCatCreate() { setCatForm({ title: '' }); setCatModal({ mode: 'create' }) }
    function openCatEdit(c: BudgetCategory) { setCatForm({ title: c.title }); setCatModal({ mode: 'edit', cat: c }) }
    function openCatDelete(c: BudgetCategory) { setCatModal({ mode: 'delete', cat: c }) }

    async function handleSaveCat() {
        if (!catModal) return
        setCatSaving(true)
        try {
            if (catModal.mode === 'create') await createBudgetCategory({ title: catForm.title, partner_id: null })
            else if (catModal.mode === 'edit' && catModal.cat) await updateBudgetCategory(catModal.cat.id, { title: catForm.title })
            setBudgetCategories(await getBudgetCategories())
            setCatModal(null)
        } finally { setCatSaving(false) }
    }

    async function handleDeleteCat() {
        if (!catModal?.cat) return
        setCatSaving(true)
        try {
            await deleteBudgetCategory(catModal.cat.id)
            setBudgetCategories(await getBudgetCategories())
            setBudgetDetails(await getBudgetDetails())
            setCatModal(null)
        } finally { setCatSaving(false) }
    }

    // ── Totaux ──────────────────────────────────────────────────────────────────
    const baseExpanses      = budgetMode === 'paid' ? expanses.filter(e => e.status === 'Payé') : expanses
    const visibleExpanses   = baseExpanses
        .filter(e => e.budget_detail_id === null || visibleLeafIds.has(e.budget_detail_id))
        .filter(e => yearFilter === null || !e.purchase_date || new Date(e.purchase_date).getFullYear() === yearFilter)
    const totalBudgetLines  = visibleLeafs.reduce((s, d) => s + proratedBudget(d, yearFilter), 0)
    const totalSpent        = visibleExpanses.reduce((s, e) => s + e.amount, 0)
    const totalReversements = visibleExpanses.filter(e => e.agreement_id != null).reduce((s, e) => s + e.amount, 0)
    const totalReste        = totalBudgetLines - totalSpent

    return (
        <div className="flex flex-col gap-4">
            {/* ── Toolbar ── */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <div className="flex text-sm rounded-lg border overflow-hidden w-fit">
                        <button onClick={() => setBudgetMode('engaged')} className={`px-3 py-1.5 transition-colors ${budgetMode === 'engaged' ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:text-foreground'}`}>Engagé</button>
                        <button onClick={() => setBudgetMode('paid')}    className={`px-3 py-1.5 transition-colors ${budgetMode === 'paid'    ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:text-foreground'}`}>Payé</button>
                    </div>
                    {availableYears.length > 0 && (
                        <div className="flex text-sm rounded-lg border overflow-hidden w-fit">
                            <button onClick={() => setYearFilter(null)} className={`px-3 py-1.5 transition-colors ${yearFilter === null ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:text-foreground'}`}>Tous</button>
                            {availableYears.map(y => (
                                <button key={y} onClick={() => setYearFilter(y)} className={`px-3 py-1.5 transition-colors ${yearFilter === y ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:text-foreground'}`}>{y}</button>
                            ))}
                        </div>
                    )}
                </div>
                <button onClick={openCatCreate} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Plus size={14} /> Nouvelle catégorie
                </button>
            </div>

            {/* ── Table 3 niveaux ── */}
            {budgetCategories.length === 0
                ? <p className="text-sm text-muted-foreground italic">Aucune catégorie budgétaire définie.</p>
                : (
                    <div className="rounded-xl border bg-card overflow-hidden">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="border-b bg-muted/40 text-muted-foreground text-xs">
                                    <th className="text-left font-normal px-4 py-2.5">Ligne</th>
                                    <th className="text-right font-normal px-4 py-2.5">{yearFilter ? `Budget ${yearFilter}` : 'Budget'}</th>
                                    <th className="text-right font-normal px-4 py-2.5">{budgetMode === 'paid' ? 'Payé' : 'Engagé'}</th>
                                    <th className="text-right font-normal px-4 py-2.5">Reste</th>
                                    <th className="text-right font-normal px-4 py-2.5">%</th>
                                    <th className="w-16 px-4 py-2.5" />
                                </tr>
                            </thead>
                            <tbody>
                                {budgetCategories.map(cat => {
                                    const catGroups   = groupDetails.filter(g => g.budget_category_id === cat.id)
                                    const catLeafs    = visibleLeafs.filter(l => l.budget_category_id === cat.id)
                                    const catAlloue   = catLeafs.reduce((s, d) => s + proratedBudget(d, yearFilter), 0)
                                    const catEnvelope = catGroups.reduce((s, grp) => {
                                        const grpLeafs = visibleLeafs.filter(l => l.parent_id === grp.id)
                                        return s + (grp.budget > 0 ? proratedBudget(grp, yearFilter) : grpLeafs.reduce((gs, d) => gs + proratedBudget(d, yearFilter), 0))
                                    }, 0)
                                    const catBudget   = catEnvelope
                                    const catSpent    = visibleExpanses.filter(e => catLeafs.some(d => d.id === e.budget_detail_id)).reduce((s, e) => s + e.amount, 0)
                                    const catReste    = catBudget - catSpent
                                    const catPct      = catBudget > 0 ? Math.round(catSpent / catBudget * 100) : 0
                                    return (
                                        <React.Fragment key={cat.id}>
                                            {/* ── Niveau 1 : Catégorie ── */}
                                            <tr className="border-b bg-muted/30 group/cat">
                                                <td className="px-4 py-2.5 font-semibold">
                                                    <span className="flex items-center gap-1.5">
                                                        {cat.title}
                                                        <span className="inline-flex gap-1 opacity-0 group-hover/cat:opacity-100 transition-opacity">
                                                            <button onClick={() => openCatEdit(cat)} className="text-muted-foreground hover:text-foreground"><Pencil size={11} /></button>
                                                            <button onClick={() => openCatDelete(cat)} className="text-muted-foreground hover:text-red-500"><Trash2 size={11} /></button>
                                                        </span>
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                                                    {formatAmount(catBudget)}
                                                    {catAlloue !== catEnvelope && catEnvelope > 0 && (
                                                        <div className="text-[10px] text-muted-foreground font-normal">alloué : {formatAmount(catAlloue)}</div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatAmount(catSpent)}</td>
                                                <td className="px-4 py-2.5 text-right tabular-nums font-medium" style={{ color: catReste < 0 ? '#ef4444' : undefined }}>{formatAmount(catReste)}</td>
                                                <td className="px-4 py-2.5 text-right tabular-nums font-medium" style={{ color: catReste < 0 ? '#ef4444' : catPct > 80 ? '#f59e0b' : '#22c55e' }}>{catPct} %</td>
                                                <td className="px-4 py-2.5 text-right">
                                                    <button onClick={() => openCreateGroup(cat.id)} className="text-muted-foreground hover:text-foreground" title="Ajouter un groupe"><Plus size={14} /></button>
                                                </td>
                                            </tr>
                                            {catGroups.map(grp => {
                                                const grpLeafs    = visibleLeafs.filter(l => l.parent_id === grp.id)
                                                const grpAlloue   = grpLeafs.reduce((s, d) => s + proratedBudget(d, yearFilter), 0)
                                                const grpEnvelope = grp.budget > 0 ? proratedBudget(grp, yearFilter) : grpAlloue
                                                const grpBudget   = grpEnvelope
                                                const grpSpent    = visibleExpanses.filter(e => grpLeafs.some(d => d.id === e.budget_detail_id)).reduce((s, e) => s + e.amount, 0)
                                                const grpReste    = grpBudget - grpSpent
                                                const grpPct      = grpBudget > 0 ? Math.round(grpSpent / grpBudget * 100) : 0
                                                return (
                                                    <React.Fragment key={`grp-${grp.id}`}>
                                                        {/* ── Niveau 2 : Groupe ── */}
                                                        <tr className="border-b bg-muted/10 group/grp">
                                                            <td className="px-4 pl-8 py-2 font-medium text-sm">
                                                                <span className="flex items-center gap-1.5">
                                                                    {grp.title}
                                                                    <span className="inline-flex gap-1 opacity-0 group-hover/grp:opacity-100 transition-opacity">
                                                                        <button onClick={() => openEdit(grp)} className="text-muted-foreground hover:text-foreground"><Pencil size={11} /></button>
                                                                        <button onClick={() => openDelete(grp)} className="text-muted-foreground hover:text-red-500"><Trash2 size={11} /></button>
                                                                    </span>
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2 text-right tabular-nums text-sm">
                                                                {grpBudget > 0 ? formatAmount(grpBudget) : '—'}
                                                                {grp.budget > 0 && grpAlloue !== grpEnvelope && (
                                                                    <div className="text-[10px] text-muted-foreground">alloué : {formatAmount(grpAlloue)}</div>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-2 text-right tabular-nums text-sm">{grpSpent > 0 ? formatAmount(grpSpent) : '—'}</td>
                                                            <td className="px-4 py-2 text-right tabular-nums text-sm" style={{ color: grpReste < 0 ? '#ef4444' : undefined }}>{grpBudget > 0 ? formatAmount(grpReste) : '—'}</td>
                                                            <td className="px-4 py-2 text-right tabular-nums text-sm" style={{ color: grpReste < 0 ? '#ef4444' : grpPct > 80 ? '#f59e0b' : grpPct > 0 ? '#22c55e' : undefined }}>{grpBudget > 0 ? `${grpPct} %` : '—'}</td>
                                                            <td className="px-4 py-2 text-right">
                                                                <button onClick={() => openCreateChild(grp.id, grp.budget_category_id)} className="text-muted-foreground hover:text-foreground" title="Ajouter une ligne"><Plus size={13} /></button>
                                                            </td>
                                                        </tr>
                                                        {grpLeafs.map(leaf => {
                                                            const leafBudget = proratedBudget(leaf, yearFilter)
                                            const leafSpent  = visibleExpanses.filter(e => e.budget_detail_id === leaf.id).reduce((s, e) => s + e.amount, 0)
                                                            const leafReste  = leafBudget - leafSpent
                                                            const leafPct    = leafBudget > 0 ? Math.round(leafSpent / leafBudget * 100) : 0
                                                            const period     = periodLabel(leaf)
                                                            return (
                                                                <tr key={`leaf-${leaf.id}`} className="border-b border-muted/20 group">
                                                                    <td className="px-4 pl-12 py-2 text-muted-foreground text-xs">
                                                                        <span className="flex items-center gap-2 flex-wrap">
                                                                            <span>{leaf.title}</span>
                                                                            {period && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-medium">{period}</span>}
                                                                            {yearFilter && leaf.start_date && leaf.end_date && (
                                                                                <span className="text-[10px] text-muted-foreground/60 italic">proratisé</span>
                                                                            )}
                                                                            <span className="inline-flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                <button onClick={() => openEdit(leaf)} className="text-muted-foreground hover:text-foreground"><Pencil size={11} /></button>
                                                                                <button onClick={() => openDelete(leaf)} className="text-muted-foreground hover:text-red-500"><Trash2 size={11} /></button>
                                                                            </span>
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-2 text-right tabular-nums text-xs text-muted-foreground">{formatAmount(leafBudget)}</td>
                                                                    <td className="px-4 py-2 text-right tabular-nums text-xs text-muted-foreground">{formatAmount(leafSpent)}</td>
                                                                    <td className="px-4 py-2 text-right tabular-nums text-xs" style={{ color: leafReste < 0 ? '#ef4444' : '#6b7280' }}>{formatAmount(leafReste)}</td>
                                                                    <td className="px-4 py-2 text-right tabular-nums text-xs" style={{ color: leafReste < 0 ? '#ef4444' : leafPct > 80 ? '#f59e0b' : '#6b7280' }}>{leafPct} %</td>
                                                                    <td />
                                                                </tr>
                                                            )
                                                        })}
                                                    </React.Fragment>
                                                )
                                            })}
                                        </React.Fragment>
                                    )
                                })}
                                {totalBudgetLines > 0 && (
                                    <tr className="border-t-2 font-medium">
                                        <td className="px-4 pt-3 pb-4">Total</td>
                                        <td className="px-4 pt-3 pb-4 text-right tabular-nums">{formatAmount(totalBudgetLines)}</td>
                                        <td className="px-4 pt-3 pb-4 text-right tabular-nums">{formatAmount(totalSpent)}</td>
                                        <td className="px-4 pt-3 pb-4 text-right tabular-nums" style={{ color: totalReste < 0 ? '#ef4444' : undefined }}>{formatAmount(totalReste)}</td>
                                        <td className="px-4 pt-3 pb-4 text-right tabular-nums text-muted-foreground">{totalBudgetLines > 0 ? Math.round(totalSpent / totalBudgetLines * 100) : 0} %</td>
                                        <td />
                                    </tr>
                                )}
                                {totalReversements > 0 && (
                                    <tr className="text-muted-foreground text-xs">
                                        <td className="px-4 py-1 italic">dont reversements conventions</td>
                                        <td className="px-4 py-1 text-right tabular-nums">—</td>
                                        <td className="px-4 py-1 text-right tabular-nums text-blue-600">{formatAmount(totalReversements)}</td>
                                        <td className="px-4 py-1 text-right tabular-nums">—</td>
                                        <td colSpan={2} />
                                    </tr>
                                )}
                                {program?.management_fee_rate != null && totalSpent > 0 && (() => {
                                    const feeAmt = Math.round(totalSpent * program.management_fee_rate / 100)
                                    return (
                                        <tr className="border-t text-muted-foreground text-xs">
                                            <td className="px-4 py-2.5 italic">Frais de gestion ({program.management_fee_rate} %)</td>
                                            <td className="px-4 py-2.5 text-right tabular-nums">—</td>
                                            <td className="px-4 py-2.5 text-right tabular-nums font-medium text-foreground">{formatAmount(feeAmt)}</td>
                                            <td className="px-4 py-2.5 text-right tabular-nums">—</td>
                                            <td colSpan={2} />
                                        </tr>
                                    )
                                })()}
                            </tbody>
                        </table>
                    </div>
                )
            }

            {/* ── Modal créer/modifier groupe ou ligne ── */}
            {detailModal && detailModal.mode !== 'delete' && (() => {
                const isGroup       = detailModal.mode === 'create-group'
                const isEdit        = detailModal.mode === 'edit'
                const editingGroup  = isEdit && detailModal.detail?.parent_id === null
                const catId         = isEdit ? detailModal.detail!.budget_category_id : detailModal.categoryId!
                const cat           = budgetCategories.find(c => c.id === catId)
                const parentGrp     = !isGroup && !editingGroup ? groupDetails.find(g => g.id === (isEdit ? detailModal.detail!.parent_id : detailModal.parentId)) : null
                const leafBudgets   = leafDetails.reduce((s, d) => s + d.budget, 0)
                const oldBudget     = isEdit && !editingGroup ? detailModal.detail!.budget : 0
                const newTotal      = leafBudgets - oldBudget + (detailForm.budget || 0)
                const programBudget = program?.budget ?? 0
                const delta         = newTotal - programBudget
                const budgetChanged = !isGroup && !editingGroup && detailForm.budget !== oldBudget
                return (
                    <Dialog open onOpenChange={open => { if (!open) setDetailModal(null) }}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>
                                    {isGroup ? 'Nouveau groupe' : editingGroup ? 'Renommer le groupe' : isEdit ? 'Modifier la ligne' : 'Nouvelle ligne budgétaire'}
                                </DialogTitle>
                                {cat && <DialogDescription>
                                    {cat.title}{parentGrp ? ` › ${parentGrp.title}` : ''}
                                </DialogDescription>}
                            </DialogHeader>
                            <div className="flex flex-col gap-3">
                                <div className="flex flex-col gap-1">
                                    <Label>Intitulé</Label>
                                    <input className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={detailForm.title} onChange={e => setDetailForm(f => ({ ...f, title: e.target.value }))} placeholder={isGroup || editingGroup ? 'Ex : Postdoctorants' : 'Ex : Contrat doctoral Dupont'} autoFocus />
                                </div>
                                {!isGroup && (
                                    <div className="flex flex-col gap-1">
                                        <Label>Description <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
                                        <input className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={detailForm.description} onChange={e => setDetailForm(f => ({ ...f, description: e.target.value }))} placeholder="Détail complémentaire" />
                                    </div>
                                )}
                                <div className="flex flex-col gap-1">
                                    <Label>{isGroup || editingGroup ? 'Enveloppe budgétaire (€)' : 'Budget total (€)'} <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
                                    <input type="number" min={0} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={detailForm.budget || ''} onChange={e => setDetailForm(f => ({ ...f, budget: parseFloat(e.target.value) || 0 }))} placeholder="0" />
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex flex-col gap-1 flex-1">
                                        <Label>Début <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
                                        <input type="date" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={detailForm.start_date ?? ''} onChange={e => setDetailForm(f => ({ ...f, start_date: e.target.value || null }))} />
                                    </div>
                                    <div className="flex flex-col gap-1 flex-1">
                                        <Label>Fin <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
                                        <input type="date" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={detailForm.end_date ?? ''} onChange={e => setDetailForm(f => ({ ...f, end_date: e.target.value || null }))} />
                                    </div>
                                </div>
                                {!isGroup && !editingGroup && budgetChanged && programBudget > 0 && (
                                    <div className={`flex gap-2 rounded-lg p-3 text-xs ${delta > 0 ? 'bg-red-50 text-red-700' : delta < 0 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-medium">Impact sur le budget programme</span>
                                            <span>Lignes : {formatAmount(leafBudgets)} → {formatAmount(newTotal)}</span>
                                            <span>Budget programme : {formatAmount(programBudget)}</span>
                                            {delta !== 0 && <span className="font-medium">{delta > 0 ? `Dépassement de ${formatAmount(delta)}` : `Marge restante : ${formatAmount(-delta)}`}</span>}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setDetailModal(null)}>Annuler</Button>
                                <Button onClick={handleSaveDetail} disabled={detailSaving || !detailForm.title.trim()}>
                                    {detailSaving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : isGroup ? 'Créer le groupe' : 'Ajouter'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )
            })()}

            {/* ── Modal supprimer groupe ou ligne ── */}
            {detailModal?.mode === 'delete' && detailModal.detail && (() => {
                const d           = detailModal.detail!
                const isGroup     = d.parent_id === null
                const children    = isGroup ? budgetDetails.filter(c => c.parent_id === d.id) : []
                const linked      = expanses.filter(e => e.budget_detail_id === d.id)
                const linkedTotal = linked.reduce((s, e) => s + e.amount, 0)
                const leafBudgets = leafDetails.reduce((s, ld) => s + ld.budget, 0)
                const newTotal    = isGroup ? leafBudgets - children.reduce((s, c) => s + c.budget, 0) : leafBudgets - d.budget
                const programBudget = program?.budget ?? 0
                return (
                    <Dialog open onOpenChange={open => { if (!open) setDetailModal(null) }}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Supprimer {isGroup ? 'le groupe' : 'la ligne'}</DialogTitle>
                                <DialogDescription>Cette action est irréversible.</DialogDescription>
                            </DialogHeader>
                            <div className="flex flex-col gap-3 text-sm">
                                <p>Vous allez supprimer <span className="font-medium">« {d.title} »</span>{!isGroup && ` (${formatAmount(d.budget)})`}.</p>
                                {isGroup && children.length > 0 && (
                                    <div className="flex gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                        <div className="flex flex-col gap-1">
                                            <span className="font-medium">{children.length} ligne{children.length > 1 ? 's' : ''} supprimée{children.length > 1 ? 's' : ''} ({formatAmount(children.reduce((s, c) => s + c.budget, 0))})</span>
                                            <ul className="list-disc list-inside space-y-0.5">{children.map(c => <li key={c.id}>{c.title}</li>)}</ul>
                                        </div>
                                    </div>
                                )}
                                {linked.length > 0 && (
                                    <div className="flex gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                        <div className="flex flex-col gap-1">
                                            <span className="font-medium">{linked.length} dépense{linked.length > 1 ? 's' : ''} non rattachée{linked.length > 1 ? 's' : ''} — {formatAmount(linkedTotal)}</span>
                                            <ul className="list-disc list-inside space-y-0.5">{linked.slice(0, 4).map(e => <li key={e.id}>{e.title}</li>)}{linked.length > 4 && <li>… et {linked.length - 4} autre{linked.length - 4 > 1 ? 's' : ''}</li>}</ul>
                                        </div>
                                    </div>
                                )}
                                {programBudget > 0 && newTotal !== leafBudgets && (
                                    <div className="flex gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                        <span>Total lignes : {formatAmount(leafBudgets)} → {formatAmount(newTotal)}</span>
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setDetailModal(null)}>Annuler</Button>
                                <Button variant="destructive" onClick={handleDeleteDetail} disabled={detailSaving}>{detailSaving ? 'Suppression…' : 'Supprimer'}</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )
            })()}

            {/* ── Modal catégorie ── */}
            {catModal && catModal.mode !== 'delete' && (
                <Dialog open onOpenChange={open => { if (!open) setCatModal(null) }}>
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader><DialogTitle>{catModal.mode === 'create' ? 'Nouvelle catégorie' : 'Renommer la catégorie'}</DialogTitle></DialogHeader>
                        <div className="flex flex-col gap-1">
                            <Label>Nom</Label>
                            <input className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={catForm.title} onChange={e => setCatForm({ title: e.target.value })} placeholder="Ex : Personnel" autoFocus />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setCatModal(null)}>Annuler</Button>
                            <Button onClick={handleSaveCat} disabled={catSaving || !catForm.title.trim()}>{catSaving ? 'Enregistrement…' : catModal.mode === 'create' ? 'Créer' : 'Renommer'}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
            {catModal?.mode === 'delete' && catModal.cat && (() => {
                const cat        = catModal.cat!
                const catDetails = budgetDetails.filter(d => d.budget_category_id === cat.id)
                const linkedExp  = expanses.filter(e => catDetails.some(d => d.id === e.budget_detail_id))
                return (
                    <Dialog open onOpenChange={open => { if (!open) setCatModal(null) }}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader><DialogTitle>Supprimer la catégorie</DialogTitle><DialogDescription>Cette action est irréversible.</DialogDescription></DialogHeader>
                            <div className="flex flex-col gap-3 text-sm">
                                <p>Vous allez supprimer la catégorie <span className="font-medium">« {cat.title} »</span> et ses {catDetails.length} ligne{catDetails.length > 1 ? 's' : ''}.</p>
                                {linkedExp.length > 0 && (
                                    <div className="flex gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                        <span>{linkedExp.length} dépense{linkedExp.length > 1 ? 's' : ''} ({formatAmount(linkedExp.reduce((s, e) => s + e.amount, 0))}) ne seront plus rattachées.</span>
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setCatModal(null)}>Annuler</Button>
                                <Button variant="destructive" onClick={handleDeleteCat} disabled={catSaving}>{catSaving ? 'Suppression…' : 'Supprimer'}</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )
            })()}
        </div>
    )
}

// ─── Page principale ─────────────────────────────────────────────────────────

type ViewMode = 'depenses' | 'conventions' | 'budget'

export default function Finance() {
    const [program, setProgram] = useState<Program | null>(null)
    const [expanses, setExpanses] = useState<Expanse[]>([])
    const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([])
    const [budgetDetails, setBudgetDetails] = useState<BudgetDetail[]>([])
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [projects, setProjects] = useState<Project[]>([])
    const [agreements, setAgreements] = useState<FinancialAgreement[]>([])
    const [partners, setPartners] = useState<Partner[]>([])
    const [statuses, setStatuses] = useState<Status[]>([])
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<ViewMode>('depenses')

    useEffect(() => {
        Promise.all([
            getProgram(),
            getExpanses(),
            getBudgetCategories(),
            getBudgetDetails(),
            getSupliers(),
            getProjects(),
            getFinancialAgreements(),
            getPartners(),
            getStatuses(),
        ]).then(([prog, exp, cats, details, sups, projs, agrs, parts, stats]) => {
            setProgram((prog as Program[])[0] ?? null)
            setExpanses(exp)
            setBudgetCategories(cats)
            setBudgetDetails(details)
            setSuppliers(sups)
            setProjects(projs)
            setAgreements(agrs)
            setPartners(parts)
            setStatuses(stats)
            setLoading(false)
        })
    }, [])

    if (loading) {
        return <div className="p-6 flex items-center justify-center text-sm text-muted-foreground">Chargement…</div>
    }

    return (
        <div className="m-5 flex flex-col gap-4">
            <div className="bg-gray-200 rounded-full border p-1 flex relative w-fit">
                {([
                        { mode: 'depenses',    label: 'Dépenses',    icon: <Receipt size={13} /> },
                        { mode: 'conventions',    label: 'Conventions',   icon: <FilePenLine size={13} /> },
                        { mode: 'budget',    label: 'Budget',   icon: <Scale size={13} /> },
                    ] as { mode: ViewMode; label: string; icon: React.ReactNode }[]).map(({ mode, label, icon }) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`relative flex items-center gap-1.5 px-4 py-1 rounded-full text-sm z-10 transition-colors duration-300 ${viewMode === mode ? 'text-white' : 'text-black'}`}
                        >
                            <span className="relative z-20 flex items-center gap-1.5">
                                {icon}{label}
                            </span>
                            {viewMode === mode && (
                                <motion.div
                                    layoutId="ActiveFinanceTab"
                                    className="absolute inset-0 bg-black rounded-full z-10"
                                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                />
                            )}
                        </button>
                    ))}
            </div>

            {viewMode === 'depenses' && (
                <DepensesTab
                    expanses={expanses}
                    setExpanses={setExpanses}
                    budgetCategories={budgetCategories}
                    budgetDetails={budgetDetails}
                    suppliers={suppliers}
                    setSuppliers={setSuppliers}
                    projects={projects}
                    agreements={agreements}
                />
            )}

            {viewMode === 'conventions' && (
                <ConventionsTab
                    agreements={agreements}
                    setAgreements={setAgreements}
                    partners={partners}
                    projects={projects}
                    statuses={statuses}
                    budgetCategories={budgetCategories}
                    budgetDetails={budgetDetails}
                />
            )}

            {viewMode === 'budget' && (
                <BudgetTab
                    program={program}
                    expanses={expanses}
                    budgetCategories={budgetCategories}
                    budgetDetails={budgetDetails}
                    setBudgetCategories={setBudgetCategories}
                    setBudgetDetails={setBudgetDetails}
                />
            )}
        </div>
    )
}
