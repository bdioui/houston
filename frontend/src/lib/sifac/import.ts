import { getExpanses, getSifacLines, getSupliers, createSupplier, replaceSifacLines, applyReconciliation } from '@/lib/api'
import type { ImportSummary } from '@/lib/api'
import type { SifacLine } from '@/lib/types'
import { parseSifacExport } from './parse'
import { aggregateByFlux } from './aggregate'
import { reconcile } from './reconcile'
import type { FluxAggregate } from './aggregate'
import type { SupplierIndex } from './reconcile'

export type SifacPreview = {
    pfi: string
    exercice: number
    rows: Omit<SifacLine, 'id'>[]
    lineCount: number
    fluxCount: number
}

// Premier temps : on lit le fichier sans rien écrire. L'exercice retourné n'est
// qu'une proposition — il n'existe nulle part dans l'export et conditionne le
// périmètre qui sera écrasé, donc il doit passer par l'utilisateur.
export async function prepareSifacImport(file: File): Promise<SifacPreview> {
    const { pfi, exercice, rows } = await parseSifacExport(file)
    return {
        pfi,
        exercice,
        rows,
        lineCount: rows.length,
        fluxCount: aggregateByFlux(rows).length,
    }
}

// Garantit qu'une fiche fournisseur existe pour chaque code tiers rencontré, et
// rend la table code → id que reconcile consultera.
//
// Le rapprochement se fait sur `sifac_code` seul, jamais sur le nom : SIFAC a
// déjà dédoublonné ses tiers, son code est stable, un nom ne l'est pas. Les
// fiches saisies à la main avant SIFAC n'ont pas de code — elles ne matchent
// donc pas et l'import créera un doublon, à fusionner une fois à la main.
async function resolveSuppliers(aggregates: FluxAggregate[]): Promise<SupplierIndex> {
    const byCode = new Map<string, number>()
    for (const s of await getSupliers()) {
        if (s.sifac_code !== '') byCode.set(s.sifac_code, s.id)
    }

    // Un code vide n'est pas un fournisseur inconnu : les écritures de paie ne
    // portent aucun tiers. Les créer donnerait une fiche au nom vide sur
    // laquelle toute la masse salariale viendrait pointer.
    const missing = new Map<string, string>()
    for (const a of aggregates) {
        if (a.supplier_code === '' || byCode.has(a.supplier_code)) continue
        missing.set(a.supplier_code, a.supplier_name)
    }

    for (const [sifac_code, name] of missing) {
        const created = await createSupplier({ name, description: '', siret: '', sifac_code })
        byCode.set(sifac_code, created.id)
    }

    return byCode
}

// Second temps : on écrit. L'exercice confirmé peut différer de celui proposé,
// les lignes sont donc réestampillées avant remplacement.
export async function commitSifacImport(
    preview: SifacPreview,
    exercice: number,
): Promise<ImportSummary> {
    const rows = preview.rows.map(r => ({ ...r, exercice }))
    await replaceSifacLines(preview.pfi, exercice, rows)

    // On réagrège sur la table entière, pas sur le seul périmètre importé : un
    // flux engagé en 2025 et reporté en 2026 a ses lignes réparties sur deux
    // exercices et doit rester une dépense unique.
    const aggregates = aggregateByFlux(await getSifacLines())

    // Les fournisseurs sont créés avant la reconciliation : leurs ids doivent
    // exister au moment où les dépenses sont fabriquées.
    const suppliers = await resolveSuppliers(aggregates)

    const summary = await applyReconciliation(
        reconcile(aggregates, await getExpanses(), suppliers),
    )

    return summary
}
