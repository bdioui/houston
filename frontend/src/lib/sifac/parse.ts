import { readSheet } from 'read-excel-file/browser'
import type { Row } from 'read-excel-file/browser'
import type { SifacLine } from '@/lib/types'

type ParsedRow = Omit<SifacLine, 'id' | 'exercice'>
type Field = keyof ParsedRow

export type SifacImport = {
    pfi: string
    exercice: number
    rows: Omit<SifacLine, 'id'>[]
}

// SIFAC tronque ses en-têtes à 30 caractères ("Montant réceptionné non factur")
// et emploie des apostrophes typographiques : l'appariement se fait sur un
// préfixe normalisé, jamais sur l'égalité.
const HEADERS: Record<Field, string> = {
    pfi: 'programme de financement',
    flux_id: 'numero de flux',
    flux_label: 'libelle du flux',
    rubrique: 'rubrique de la piece',
    supplier_name: 'nom du tiers',
    supplier_code: 'numero du tiers fournisseur',
    account: 'compte general',
    account_label: 'libelle compte general',
    engagement_date: 'date initiale',
    amount_engaged: 'montant engage htr',
    amount_certified: 'montant htr des sf',
    amount_received: 'montant receptionne',
    csf_date: 'date comptable du csf',
    invoice_number: 'numero de facture',
    invoice_date: 'date comptable facture',
    invoice_text: 'texte facture',
    amount_invoiced: 'montant facture htr',
    amount_paid: 'montant paye',
    payment_date: 'date de paiement',
    amount_report: 'report',
    otp: "element d'otp",
    category: "compte d'execution budgetaire"
}

function normalizeHeader(v: unknown): string {
    return String(v ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')   // diacritiques combinants issus de NFD
        .replace(/[\u2018\u2019]/g, "'") // apostrophes typographiques SIFAC
        .replace(/\s+/g, ' ')              // \s couvre l'espace insécable
        .trim()
        .toLowerCase()
}

function toText(v: unknown): string {
    if (v === null || v === undefined) return ''
    if (v instanceof Date) return toDate(v)
    return String(v).trim()
}

function toNumber(v: unknown): number {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0
    if (typeof v === 'string') {
        const n = parseFloat(v.replace(/\s/g, '').replace(',', '.'))
        return Number.isFinite(n) ? n : 0
    }
    return 0
}

function toDate(v: unknown): string {
    if (v instanceof Date) {
        // Composantes locales : toISOString() décalerait la date d'un jour
        // pour tout fuseau à l'est de UTC, une écriture du 01/03 devenant 28/02.
        const pad = (n: number) => String(n).padStart(2, '0')
        return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`
    }
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10)
    return ''
}

// Une colonne mal appariée serait silencieusement vide en base : on échoue ici,
// bruyamment, plutôt que de laisser passer un import tronqué.
function mapHeaders(headerRow: Row): Record<Field, number> {
    const normalized = headerRow.map(normalizeHeader)
    const index = {} as Record<Field, number>
    const missing: string[] = []

    for (const [field, prefix] of Object.entries(HEADERS) as [Field, string][]) {
        const matches = normalized
            .map((h, i) => (h.startsWith(prefix) ? i : -1))
            .filter(i => i !== -1)

        if (matches.length === 0) missing.push(`${field} ("${prefix}…")`)
        else if (matches.length > 1) {
            const labels = matches.map(i => `"${headerRow[i]}"`).join(', ')
            throw new Error(`Colonne SIFAC ambiguë pour ${field} : ${labels}.`)
        } else index[field] = matches[0]
    }

    if (missing.length > 0) {
        throw new Error(`Colonnes SIFAC introuvables : ${missing.join(', ')}.`)
    }
    return index
}

// L'exercice n'est pas une donnée du fichier : les lignes de report portent la
// date d'engagement de l'année précédente. On propose l'année majoritaire, à
// charge pour l'utilisateur de confirmer.
function suggestExercice(rows: ParsedRow[]): number {
    const years = new Map<number, number>()
    for (const r of rows) {
        const d = r.invoice_date || r.payment_date || r.engagement_date
        if (!d) continue
        const y = Number(d.slice(0, 4))
        years.set(y, (years.get(y) ?? 0) + 1)
    }
    if (years.size === 0) throw new Error('Aucune date exploitable : exercice indéterminable.')
    return [...years.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

export async function parseSifacExport(file: File): Promise<SifacImport> {
    const sheet = await readSheet(file)
    if (sheet.length < 2) throw new Error('Fichier SIFAC vide ou sans ligne d\'en-tête.')

    const [headerRow, ...dataRows] = sheet
    const index = mapHeaders(headerRow)
    const at = (row: Row, field: Field) => row[index[field]]

    const parsed: ParsedRow[] = dataRows
        .filter(row => row.some(c => c !== null && c !== undefined && String(c).trim() !== ''))
        .map(row => ({
            pfi: toText(at(row, 'pfi')),
            flux_id: toText(at(row, 'flux_id')),
            flux_label: toText(at(row, 'flux_label')),
            rubrique: toText(at(row, 'rubrique')),
            supplier_name: toText(at(row, 'supplier_name')),
            supplier_code: toText(at(row, 'supplier_code')),
            account: toText(at(row, 'account')),
            account_label: toText(at(row, 'account_label')),
            engagement_date: toDate(at(row, 'engagement_date')),
            amount_engaged: toNumber(at(row, 'amount_engaged')),
            amount_certified: toNumber(at(row, 'amount_certified')),
            amount_received: toNumber(at(row, 'amount_received')),
            csf_date: toDate(at(row, 'csf_date')),
            invoice_number: toText(at(row, 'invoice_number')),
            invoice_date: toDate(at(row, 'invoice_date')),
            invoice_text: toText(at(row, 'invoice_text')),
            amount_invoiced: toNumber(at(row, 'amount_invoiced')),
            amount_paid: toNumber(at(row, 'amount_paid')),
            payment_date: toDate(at(row, 'payment_date')),
            amount_report: toNumber(at(row, 'amount_report')),
            otp: toText(at(row, 'otp')),
            category: toText(at(row, 'category'))
        }))
        .filter(r => r.flux_id !== '')

    if (parsed.length === 0) throw new Error('Aucune ligne exploitable dans le fichier.')

    // Le périmètre d'écrasement est le couple (PFI, exercice) : un fichier
    // multi-PFI le rendrait indéfini et effacerait le mauvais programme.
    const pfis = [...new Set(parsed.map(r => r.pfi).filter(Boolean))]
    if (pfis.length !== 1) {
        throw new Error(`L'export doit porter sur un seul PFI, ${pfis.length} trouvés : ${pfis.join(', ')}.`)
    }

    const exercice = suggestExercice(parsed)
    return { pfi: pfis[0], exercice, rows: parsed.map(r => ({ ...r, exercice })) }
}
