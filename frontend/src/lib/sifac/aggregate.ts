import type { SifacLine } from '@/lib/types'

export type FluxStatus = 'Engagé' | 'Livré' | 'Payé'

export type FluxAggregate = {
    flux_id: string
    pfi: string
    title: string
    supplier_name: string
    supplier_code: string
    account: string
    account_label: string
    otp: string
    status: FluxStatus
    amount: number
    amount_engaged: number
    amount_invoiced: number
    amount_paid: number
    amount_report: number
    purchase_date: string
    invoice_date: string
    payment_date: string
    line_count: number
    category: string
    delivery_date: string
}

type Line = Omit<SifacLine, 'id'>

// Les montants sont des sommes de flottants : sans arrondi, un total nul
// ressort à 1e-13 et fait échouer la comparaison payé ≈ facturé.
function round2(n: number): number {
    return Math.round(n * 100) / 100
}

// Le compte d'exécution budgétaire SIFAC ne connaît que trois valeurs. Tout ce
// qui n'est ni FG ni IG relève de la masse salariale, y compris les écritures de
// paie qui ne portent pas de code du tout.
export function sifacCategory(code: string): string {
    return code === 'FG' ? 'Fonctionnement'
        : code === 'IG' ? 'Investissement'
            : 'Personnel'
}

function firstNonEmpty(lines: Line[], key: keyof Line): string {
    for (const l of lines) {
        const v = l[key]
        if (typeof v === 'string' && v !== '') return v
    }
    return ''
}

function boundDate(lines: Line[], key: keyof Line, pick: 'min' | 'max'): string {
    const dates = lines.map(l => l[key]).filter((v): v is string => typeof v === 'string' && v !== '')
    if (dates.length === 0) return ''
    return pick === 'min'
        ? dates.reduce((a, b) => (a < b ? a : b))
        : dates.reduce((a, b) => (a > b ? a : b))
}

// Une commande peut être facturée puis intégralement avoirée : le net retombe à
// zéro alors que des paiements ont bien eu lieu. Le statut se décide donc sur
// l'existence d'écritures, pas sur le signe des totaux.
function resolveStatus(lines: Line[], invoiced: number, paid: number): FluxStatus {
    const hasInvoice = lines.some(l => l.invoice_number !== '' || l.amount_invoiced !== 0)
    const hasPayment = lines.some(l => l.payment_date !== '' || l.amount_paid !== 0)

    if (!hasInvoice && !hasPayment) return 'Engagé'
    if (hasPayment && Math.abs(paid - invoiced) < 0.01) return 'Payé'
    if (invoiced > 0) return 'Livré'
    return 'Engagé'
}

function aggregateFlux(flux_id: string, lines: Line[]): FluxAggregate {
    const sum = (key: 'amount_engaged' | 'amount_invoiced' | 'amount_paid' | 'amount_report') =>
        round2(lines.reduce((s, l) => s + l[key], 0))

    const amount_engaged = sum('amount_engaged')
    const amount_invoiced = sum('amount_invoiced')
    const amount_paid = sum('amount_paid')
    const status = resolveStatus(lines, amount_invoiced, amount_paid)

    // Le montant affiché est celui de l'état atteint : une commande soldée vaut
    // ce qui a été payé, pas ce qui avait été engagé.
    const amount = status === 'Payé' ? amount_paid
        : status === 'Livré' ? amount_invoiced
            : amount_engaged

    const category = sifacCategory(firstNonEmpty(lines, 'category'))

    return {
        flux_id,
        pfi: firstNonEmpty(lines, 'pfi'),
        title: firstNonEmpty(lines, 'flux_label'),
        supplier_name: firstNonEmpty(lines, 'supplier_name'),
        supplier_code: firstNonEmpty(lines, 'supplier_code'),
        account: firstNonEmpty(lines, 'account'),
        account_label: firstNonEmpty(lines, 'account_label'),
        otp: firstNonEmpty(lines, 'otp'),
        status,
        amount,
        amount_engaged,
        amount_invoiced,
        amount_paid,
        amount_report: sum('amount_report'),
        purchase_date: boundDate(lines, 'engagement_date', 'min'),
        invoice_date: boundDate(lines, 'invoice_date', 'max'),
        payment_date: boundDate(lines, 'payment_date', 'max'),
        line_count: lines.length,
        category: category,
        delivery_date: boundDate(lines, 'csf_date', 'max')
    }
}

// Regroupe toutes les lignes fournies, tous exercices confondus : un flux engagé
// en 2025 et reporté en 2026 ne doit produire qu'une seule dépense.
export function aggregateByFlux(lines: Line[]): FluxAggregate[] {
    const groups = new Map<string, Line[]>()
    for (const line of lines) {
        if (line.flux_id === '') continue
        const group = groups.get(line.flux_id)
        if (group) group.push(line)
        else groups.set(line.flux_id, [line])
    }
    return [...groups].map(([flux_id, group]) => aggregateFlux(flux_id, group))
}
