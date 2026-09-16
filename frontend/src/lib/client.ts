// Seul fichier qui parle HTTP. Il remplace grist.ts dans l'architecture en
// couches : api.ts est son unique appelant, les vues ne le voient jamais.
//
// Différence de contrat avec grist.ts, volontaire : fetchTable() avalait ses
// erreurs et rendait [] (une table absente en Grist était bénigne). Ici on
// lève. Un backend indisponible n'est pas un cas bénin, et le taire donnerait
// une application vide sans message.

const BASE = '/api'

export class ApiError extends Error {
    // Champs déclarés explicitement : le tsconfig active erasableSyntaxOnly,
    // qui interdit les propriétés déclarées dans la signature du constructeur.
    readonly status: number
    readonly body: unknown

    constructor(status: number, body: unknown, message?: string) {
        super(message ?? `API ${status}`)
        this.name = 'ApiError'
        this.status = status
        this.body = body
    }
}

// Relu à chaque appel, jamais mémorisé : django.contrib.auth.login() appelle
// rotate_token() et remplace le jeton à la connexion. Un jeton capturé au
// démarrage serait périmé dès la première écriture qui suit.
function csrfToken(): string {
    return document.cookie.match(/(?:^|;\s*)csrftoken=([^;]*)/)?.[1] ?? ''
}

// Un champ de date vaut `null` quand il est vide, jamais `''`.
//
// Django refuse la chaîne vide sur un DateField — « La date n'a pas le bon
// format » — là où Grist l'acceptait comme valeur d'absence. Les formulaires,
// eux, ne peuvent pas produire autre chose : un `<input type="date">` contrôlé
// rend `''` quand on l'efface, et son `value` n'accepte pas `null`. La
// conversion doit donc se faire quelque part entre le formulaire et le réseau.
//
// Ici, et pas dans api.ts, parce qu'un point de passage unique ne s'oublie pas.
// La refaire dans chaque fonction d'écriture voudrait dire la réussir une
// trentaine de fois, puis à chaque fonction ajoutée — et un oubli ne se voit
// pas à la compilation, `''` étant un `string` parfaitement valide.
//
// La reconnaissance se fait sur le nom, ce qui tient parce que les deux sens
// ont été vérifiés contre les modèles : les 33 colonnes `DateField` du schéma
// portent toutes un de ces suffixes, et aucun champ non-date n'en porte —
// `year` est un CharField, où `''` est légitime, et il ne correspond à aucun.
// Les suffixes sont ancrés plutôt que cherchés en sous-chaîne, sans quoi un
// futur `validated` ou `candidate_id` passerait pour une date.
function isDateField(key: string): boolean {
    return key === 'date' || key === 'timestamp'
        || key.endsWith('_date') || key.endsWith('_time') || key.endsWith('_at')
}

// Superficiel, et c'est suffisant : tous les corps d'écriture sont plats.
// `createActionCardFull` est le seul appelant qui manipule des tableaux, et il
// les déplie en POST successifs dans api.ts — client.ts ne voit jamais le nid.
//
// Seule la chaîne vide est touchée. Une date renseignée, un `null` déjà posé,
// un champ d'un autre type : tout passe inchangé.
function blankDatesToNull(body: unknown): unknown {
    if (body === null || typeof body !== 'object' || Array.isArray(body)) return body
    const src = body as Record<string, unknown>
    let touched = false
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(src)) {
        if (v === '' && isDateField(k)) { out[k] = null; touched = true }
        else out[k] = v
    }
    // Une copie n'est faite que s'il y avait quelque chose à changer, et
    // l'objet de l'appelant n'est jamais muté : les vues gardent leur état de
    // formulaire intact, avec ses `''`, que le prochain rendu réaffichera.
    return touched ? out : body
}

async function request<T>(
    method: string,
    path: string,
    body?: unknown,
): Promise<T> {
    const isWrite = method !== 'GET' && method !== 'HEAD'

    // Un FormData traverse sans transformation : il porte un fichier, pas un
    // corps plat, et `blankDatesToNull` comme `JSON.stringify` n'ont rien à y
    // faire. Surtout, on ne pose pas `Content-Type` — seul le navigateur peut
    // l'écrire, parce qu'il doit y joindre le `boundary` qu'il vient de tirer.
    // Le fixer à la main produit un corps que Django ne sait pas découper.
    const isForm = body instanceof FormData
    if (isWrite && !isForm) body = blankDatesToNull(body)

    const res = await fetch(`${BASE}${path}`, {
        method,
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            ...(body === undefined || isForm ? {} : { 'Content-Type': 'application/json' }),
            ...(isWrite ? { 'X-CSRFToken': csrfToken() } : {}),
        },
        body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    })

    if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new ApiError(res.status, payload, detail(res.status, payload))
    }

    // 204 No Content : pas de corps à lire.
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}

function detail(status: number, payload: unknown): string {
    if (payload && typeof payload === 'object' && 'detail' in payload) {
        return String((payload as { detail: unknown }).detail)
    }
    if (status === 403) return 'Accès refusé (session expirée ou jeton CSRF invalide).'
    if (status === 502 || status === 503) return 'Le serveur est indisponible.'
    return `Erreur ${status}`
}

export const get = <T>(path: string) => request<T>('GET', path)
export const post = <T>(path: string, body?: unknown) => request<T>('POST', path, body)
export const patch = <T>(path: string, body: unknown) => request<T>('PATCH', path, body)
export const del = (path: string) => request<void>('DELETE', path)
