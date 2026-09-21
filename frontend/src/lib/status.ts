import type { LifecycleCode, Status, StatusCode, StatusContext } from './types'

/**
 * Helpers du référentiel de statuts.
 *
 * Toute décision prise sur un statut passe par `code`. Ni par `id`, qui est
 * attribué par la base et n'a aucune stabilité d'une installation à l'autre, ni
 * par `label`, qui est du vocabulaire d'affichage et varie d'un contexte à
 * l'autre pour un même code — une convention « Soldée » est un projet
 * « Terminé ».
 *
 * Les deux formes ont été utilisées, et les deux ont cassé en silence : les
 * `status_id !== 3` d'`App.tsx` ne valaient que pour l'organisation héritée de
 * Grist, et les clés `'A traiter'` des couleurs de jalon n'ont jamais
 * correspondu au libellé réel, `'À traiter'`, accent compris.
 */

/** Ordre de lecture du cycle de vie, du plus ouvert au plus fermé. */
export const LIFECYCLE_ORDER: LifecycleCode[] = [
    'active',
    'on_hold',
    'todo',
    'done',
    'cancelled',
]

/** Codes qui appellent encore une action — et donc une alerte d'échéance. */
const OPEN_CODES = new Set<StatusCode>(['todo', 'active', 'on_hold'])

/** `true` tant que la chose n'est ni terminée ni annulée. */
export function isOpen(code: StatusCode | undefined | null): boolean {
    return code != null && OPEN_CODES.has(code)
}

/** `true` pour un statut terminal, quelle que soit la façon d'y arriver. */
export function isClosed(code: StatusCode | undefined | null): boolean {
    return code === 'done' || code === 'cancelled'
}

/** Le statut d'une ligne, ou `undefined` si elle n'en porte pas. */
export function statusOf(
    statuses: Status[],
    statusId: number | null | undefined,
): Status | undefined {
    return statusId == null ? undefined : statuses.find(s => s.id === statusId)
}

/** Le code d'une ligne, forme courte pour les comparaisons. */
export function codeOf(
    statuses: Status[],
    statusId: number | null | undefined,
): StatusCode | undefined {
    return statusOf(statuses, statusId)?.code
}

/**
 * L'identifiant à poser sur une ligne neuve.
 *
 * C'est ce qui remplace les `status_id: 1` en dur des formulaires : la valeur
 * par défaut se désigne par son sens, et se résout dans le référentiel chargé.
 */
export function defaultStatusId(
    statuses: Status[],
    context: StatusContext,
    code: StatusCode = 'todo',
): number | null {
    const exact = statuses.find(s => s.context === context && s.code === code)
    if (exact) return exact.id
    // Un contexte incomplet ne doit pas rendre un formulaire insoumissible :
    // à défaut du code demandé, la première ligne du contexte fait l'affaire.
    return statuses.find(s => s.context === context)?.id ?? null
}

/**
 * Lecture d'une palette indexée par code de cycle de vie.
 *
 * Passe par une fonction plutôt que par un accès direct parce que `Status.code`
 * est un `StatusCode` — cycle de vie *ou* présence — alors que les palettes ne
 * couvrent que le premier. Le rétrécissement se fait donc ici, une fois, au
 * lieu d'un `as LifecycleCode` répété à chaque appel.
 */
export function paletteColor(
    palette: Record<LifecycleCode, string>,
    code: StatusCode | undefined | null,
    fallback: string,
): string {
    return code != null && code in palette
        ? palette[code as LifecycleCode]
        : fallback
}

/** Les statuts d'un contexte, dans l'ordre de lecture du cycle de vie. */
export function statusesFor(statuses: Status[], context: StatusContext): Status[] {
    return statuses
        .filter(s => s.context === context)
        .sort(
            (a, b) =>
                LIFECYCLE_ORDER.indexOf(a.code as LifecycleCode) -
                LIFECYCLE_ORDER.indexOf(b.code as LifecycleCode),
        )
}
