import type { Expanse } from '@/lib/types'
import type { FluxAggregate } from './aggregate'

export type Reconciliation = {
    toCreate: Omit<Expanse, 'id'>[]
    toUpdate: { id: number; patch: Partial<Expanse> }[]
    toOrphan: number[]
}

// Table « code tiers SIFAC → id de fiche fournisseur ». Elle est construite avant
// l'appel : reconcile ne crée aucun fournisseur, elle ne fait que la lire.
export type SupplierIndex = ReadonlyMap<string, number>

// Champs pilotés par SIFAC : eux seuls sont réécrits à chaque import. Tout le
// reste (projet, ligne budgétaire, libellé) est le tri fait à la main et doit
// survivre au ré-import.
type SifacOwned = Pick<Expanse,
    | 'title' | 'description' | 'status' | 'amount'
    | 'amount_engaged' | 'amount_invoiced' | 'amount_paid'
    | 'purchase_date' | 'invoice_date' | 'payment_date' | 'category'
    | 'supplier_id' | 'delivery_date' | 'label'>

// Record<K, true> impose l'exhaustivité : un champ ajouté à SifacOwned et oublié
// ici casse la compilation, au lieu d'être silencieusement ignoré à l'écriture.
const SIFAC_OWNED_FIELDS: Record<keyof SifacOwned, true> = {
    title: true, description: true, status: true, amount: true,
    amount_engaged: true, amount_invoiced: true, amount_paid: true,
    purchase_date: true, invoice_date: true, payment_date: true, category: true,
    supplier_id: true, delivery_date: true, label: true
}

export const SIFAC_OWNED_COLUMNS = Object.keys(SIFAC_OWNED_FIELDS)

// `fallbackSupplierId` couvre le cas où SIFAC ne désigne aucun tiers : les
// écritures de paie n'en portent pas. On conserve alors le fournisseur déjà en
// place au lieu d'effacer une affectation faite à la main.
function sifacOwned(
    a: FluxAggregate,
    suppliers: SupplierIndex,
    fallbackSupplierId: number | null,
): SifacOwned {
    return {
        title: a.title,
        description: a.supplier_name,
        status: a.status,
        amount: a.amount,
        amount_engaged: a.amount_engaged,
        amount_invoiced: a.amount_invoiced,
        amount_paid: a.amount_paid,
        purchase_date: a.purchase_date,
        invoice_date: a.invoice_date,
        payment_date: a.payment_date,
        category: a.category,
        label: a.account_label,
        supplier_id: suppliers.get(a.supplier_code) ?? fallbackSupplierId,
        delivery_date: a.delivery_date,
    }
}

function createFrom(a: FluxAggregate, suppliers: SupplierIndex): Omit<Expanse, 'id'> {
    return {
        ...sifacOwned(a, suppliers, null),
        flux_id: a.flux_id,
        source: 'sifac',
        budget_detail_id: null,
        project_id: null,
        agreement_id: null,
    }
}

// La clé est le flux seul, jamais le couple (flux, exercice) : une commande
// engagée sur un exercice et reportée sur le suivant doit retomber sur la même
// dépense au lieu d'en créer une seconde.
export function reconcile(
    aggregates: FluxAggregate[],
    expanses: Expanse[],
    suppliers: SupplierIndex,
): Reconciliation {
    const byFlux = new Map<string, Expanse>()
    for (const e of expanses) {
        // Le filtre sur `source` est ce qui empêche le balayage des orphelines
        // d'emporter les dépenses saisies à la main.
        if (e.source !== 'sifac' || e.flux_id === null) continue
        byFlux.set(e.flux_id, e)
    }

    const toCreate: Omit<Expanse, 'id'>[] = []
    const toUpdate: { id: number; patch: Partial<Expanse> }[] = []
    const seen = new Set<string>()

    for (const a of aggregates) {
        seen.add(a.flux_id)
        const existing = byFlux.get(a.flux_id)
        if (existing) toUpdate.push({ id: existing.id, patch: sifacOwned(a, suppliers, existing.supplier_id) })
        else toCreate.push(createFrom(a, suppliers))
    }

    const toOrphan: number[] = []
    for (const [flux_id, e] of byFlux) {
        if (!seen.has(flux_id)) toOrphan.push(e.id)
    }

    return { toCreate, toUpdate, toOrphan }
}
