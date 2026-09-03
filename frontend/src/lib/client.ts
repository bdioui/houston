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

async function request<T>(
    method: string,
    path: string,
    body?: unknown,
): Promise<T> {
    const isWrite = method !== 'GET' && method !== 'HEAD'

    const res = await fetch(`${BASE}${path}`, {
        method,
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
            ...(isWrite ? { 'X-CSRFToken': csrfToken() } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
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
