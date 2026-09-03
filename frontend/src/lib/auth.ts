import { get, post } from './client'

export type AuthUser = {
    id: number
    email: string
    first_name: string
    last_name: string
    organization_id: number | null
}

type MeResponse = { authenticated: boolean; user?: AuthUser }

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

// En mode mock il n'y a pas de backend : rendre un utilisateur factice évite
// d'imposer un écran de connexion à un développement hors ligne.
const MOCK_USER: AuthUser = {
    id: 0,
    email: 'mock@local',
    first_name: 'Mock',
    last_name: '',
    organization_id: 0,
}

// Premier appel du démarrage, et pas seulement pour savoir qui est connecté :
// la vue est décorée @ensure_csrf_cookie côté Django. Sans ce GET, le cookie
// csrftoken n'existe pas et le POST de connexion qui suit part sans jeton.
export async function fetchMe(): Promise<AuthUser | null> {
    if (USE_MOCK) return MOCK_USER
    const res = await get<MeResponse>('/auth/me/')
    return res.authenticated ? (res.user ?? null) : null
}

// Ni login ni logout ne testent USE_MOCK : en mode mock, fetchMe() rend un
// utilisateur d'emblée, LoginScreen n'est donc jamais monté et ces deux
// fonctions restent inatteignables. Le court-circuit est en amont, une fois.
export async function login(email: string, password: string): Promise<AuthUser> {
    const res = await post<MeResponse>('/auth/login/', { email, password })
    return res.user as AuthUser
}

export async function logout(): Promise<void> {
    await post<void>('/auth/logout/')
}
