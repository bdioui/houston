// Grist expose une variable globale `grist` dans le contexte du widget.
// Ce fichier se contente de convertir le format colonnaire Grist en tableau de lignes brutes.
// La normalisation des types est faite dans normalize.ts.

type GristColumnarData = { id: number[]; [col: string]: unknown[] }


type ApplyResult = { retValues: number[] }

type GristAPI = {
    ready: (options?: { requiredAccess?: string }) => void
    onRecords: (callback: (records: Record<string, unknown>[]) => void) => void
    onRecord:  (callback: (record:  Record<string, unknown>) => void) => void
    docApi: {
        fetchTable:       (tableId: string) => Promise<GristColumnarData>
        applyUserActions: (actions: unknown[][]) => Promise<ApplyResult>
    }
}

function getGrist(): GristAPI {
    const g = (window as unknown as { grist?: GristAPI }).grist
    if (!g) throw new Error('Grist API non disponible — le widget n\'est pas chargé dans Grist.')
    return g
}

export function gristReady(options?: { requiredAccess?: string }) {
    getGrist().ready(options)
}

// Convertit { col: [val1, val2] } → [{ col: val1 }, { col: val2 }]
function columnarToRows(data: GristColumnarData): Record<string, unknown>[] {
    return data.id.map((id, i) => {
        const row: Record<string, unknown> = { id }
        for (const col of Object.keys(data)) {
            if (col !== 'id') row[col] = data[col][i]
        }
        return row
    })
}

export async function fetchTable(tableId: string): Promise<Record<string, unknown>[]> {
    try {
        const data = await getGrist().docApi.fetchTable(tableId)
        return columnarToRows(data)
    } catch (err) {
        // Table inexistante ou pas encore créée → retourner un tableau vide
        // plutôt que de bloquer le chargement de toute l'application
        console.warn(`[Grist] fetchTable("${tableId}") a échoué :`, err)
        return []
    }
}

// Crée un enregistrement et retourne son id
export async function addRecord(
    tableId: string,
    fields: Record<string, unknown>
): Promise<number> {
    const result = await getGrist().docApi.applyUserActions([
        ['AddRecord', tableId, null, fields]
    ])
    return result.retValues[0]
}

// Crée plusieurs enregistrements en une seule transaction et retourne leurs ids
export async function addRecords(
    tableId: string,
    records: Record<string, unknown>[]
): Promise<number[]> {
    if (records.length === 0) return []
    const actions = records.map(fields => ['AddRecord', tableId, null, fields])
    const result = await getGrist().docApi.applyUserActions(actions)
    return result.retValues
}

// Remplace un périmètre de lignes : suppression et réinsertion dans une seule
// transaction Grist, pour qu'un échec ne laisse jamais le périmètre vidé.
// `columns` fixe l'ordre des colonnes : une clé absente d'un enregistrement
// devient `undefined` à sa place au lieu de décaler toute la colonne.
export async function replaceRecords(
    tableId: string,
    rowIdsToDelete: number[],
    records: Record<string, unknown>[],
    columns: string[]
): Promise<void> {
    const actions: unknown[][] = []

    if (rowIdsToDelete.length > 0) {
        actions.push(['BulkRemoveRecord', tableId, rowIdsToDelete])
    }

    if (records.length > 0) {
        const colsObj: Record<string, unknown[]> = {}
        for (const col of columns) {
            colsObj[col] = records.map(r => r[col])
        }
        // Autant de null que d'enregistrements, sinon Grist n'insère que les premiers
        actions.push(['BulkAddRecord', tableId, records.map(() => null), colsObj])
    }

    if (actions.length === 0) return
    await getGrist().docApi.applyUserActions(actions)
}

// Met à jour une ou plusieurs colonnes sur une ligne existante.
// patch = { category_id: 3, status_id: 2 } par exemple
export async function updateRecord(
    tableId: string,
    rowId: number,
    patch: Record<string, unknown>
): Promise<void> {
    // Format Grist : ['BulkUpdateRecord', tableId, [rowId], { col: [val] }]
    // Le dict des colonnes NE doit PAS contenir 'id' (déjà passé comme 3ème argument)
    const colsObj: Record<string, unknown[]> = {}
    for (const [col, val] of Object.entries(patch)) {
        colsObj[col] = [val]
    }
    await getGrist().docApi.applyUserActions([['BulkUpdateRecord', tableId, [rowId], colsObj]])
}

// Met à jour N lignes en une seule action : un import SIFAC touche plusieurs
// centaines de dépenses, autant d'appels séparés seraient lents et laisseraient
// un import interrompu à moitié appliqué.
// Suppose que tous les enregistrements portent les mêmes colonnes — c'est le cas
// des patches produits par reconcile.ts.
export async function updateRecords(
    tableId: string,
    rowIds: number[],
    records: Record<string, unknown>[],
    columns: string[]
): Promise<void> {
    if (rowIds.length === 0) return

    const colsObj: Record<string, unknown[]> = {}
    for (const col of columns) {
        // 'id' est déjà passé en troisième argument : le répéter ici ferait
        // échouer l'action.
        if (col === 'id') continue
        colsObj[col] = records.map(r => r[col])
    }

    await getGrist().docApi.applyUserActions([['BulkUpdateRecord', tableId, rowIds, colsObj]])
}

// Supprime une ligne par son id
export async function deleteRecord(tableId: string, rowId: number): Promise<void> {
    await getGrist().docApi.applyUserActions([['RemoveRecord', tableId, rowId]])
}
