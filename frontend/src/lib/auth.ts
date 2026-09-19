import { get, post } from './client'
import { mockOrganizations, mockProgram } from './mock'
import type { Organization, OrgRole, Program } from './types'

// L'identité seule. Ni laboratoire ni fiche annuaire : ils dépendent du
// contexte choisi, et un compte rattaché à deux laboratoires n'a pas de réponse
// unique à donner.
export type AuthUser = {
    id: number
    email: string
    first_name: string
    last_name: string
}

// Les deux axes de cloisonnement, tels que le front doit les connaître. Ils
// voyagent ensemble parce qu'ils se périment ensemble : une déconnexion annule
// les sélections, et le backend les revérifie à chaque requête — ni le
// laboratoire ni le programme actifs ne sont donc des valeurs qu'on garde de
// son côté.
//
// `organization` à null n'est pas une anomalie : c'est l'état d'un compte
// rattaché à plusieurs laboratoires qui n'a pas encore choisi, et `program` à
// null celui d'un compte affecté à plusieurs programmes dans le laboratoire
// actif. Les collections cloisonnées répondent alors 409 — d'où les deux
// sélecteurs bloquants d'App.tsx, dans cet ordre.
//
// `member_id` accompagne l'organisation et non l'utilisateur : la fiche
// annuaire est propre au laboratoire, la même personne en ayant une par
// rattachement. Nul pour un compte de support, qui n'y figure pas.
//
// `org_role` aussi : on peut être administrateur d'un laboratoire et simple
// membre du suivant. Il ne décide que de l'affichage — le droit d'inviter est
// revérifié à chaque requête côté serveur.
export type Session = {
    user: AuthUser
    organization: Organization | null
    member_id: number | null
    org_role: OrgRole | null
    program: Program | null
}

type MeResponse = {
    authenticated: boolean
    user?: AuthUser
    organization?: Organization | null
    member_id?: number | null
    org_role?: OrgRole | null
    program?: Program | null
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

// En mode mock il n'y a pas de backend : rendre un utilisateur factice évite
// d'imposer un écran de connexion à un développement hors ligne.
const MOCK_USER: AuthUser = {
    id: 0,
    email: 'mock@local',
    first_name: 'Mock',
    last_name: '',
}

// Premier appel du démarrage, et pas seulement pour savoir qui est connecté :
// la vue est décorée @ensure_csrf_cookie côté Django. Sans ce GET, le cookie
// csrftoken n'existe pas et le POST de connexion qui suit part sans jeton.
export async function fetchMe(): Promise<Session | null> {
    if (USE_MOCK) {
        return {
            user: MOCK_USER,
            organization: mockOrganizations[0] ?? null,
            // La première fiche du jeu fictif, pour que l'en-tête ait un avatar
            // et un nom. En mode mock rien ne relie un compte à une fiche.
            member_id: 1,
            // Administrateur en mode fictif : c'est le seul moyen de voir
            // l'écran d'invitation sans backend. Les appels qu'il déclenche
            // échoueront, faute de branche mock — il n'y a rien à rejoindre.
            org_role: 'admin',
            program: mockProgram[0] ?? null,
        }
    }
    const res = await get<MeResponse>('/auth/me/')
    if (!res.authenticated || !res.user) return null
    return {
        user: res.user,
        organization: res.organization ?? null,
        member_id: res.member_id ?? null,
        org_role: res.org_role ?? null,
        program: res.program ?? null,
    }
}

// Ni login ni logout ne testent USE_MOCK : en mode mock, fetchMe() rend un
// utilisateur d'emblée, LoginScreen n'est donc jamais monté et ces deux
// fonctions restent inatteignables. Le court-circuit est en amont, une fois.
// La réponse du POST est ignorée au profit d'un fetchMe(). Elle porte bien
// l'utilisateur, mais ni le laboratoire ni le programme actifs : le middleware
// résout le contexte avant d'entrer dans la vue, donc avant que la session de
// connexion existe. Rejouer l'amorçage coûte un aller-retour et évite deux
// chemins de lecture du contexte qui divergeraient.
export async function login(email: string, password: string): Promise<Session> {
    await post<MeResponse>('/auth/login/', { email, password })
    return (await fetchMe()) as Session
}

export type SignupPayload = {
    email: string
    password: string
    first_name: string
    last_name: string
    organization_name: string
    program_name: string
    program_pfi: string
}

// Cinq objets naissent derrière ce seul appel : le laboratoire, le compte, sa
// fiche annuaire, un premier programme et l'affectation qui les relie. Le front
// n'en voit qu'un, et n'a pas à en savoir plus.
//
// Même fin que login(), pour la même raison : le POST ne peut rendre aucun des
// deux contextes, puisque le middleware les a résolus avant que le compte
// existe. Le fetchMe() qui suit les trouvera auto-sélectionnés — un nouveau
// compte n'a qu'un rattachement et qu'un programme, donc rien à choisir.
export async function signup(payload: SignupPayload): Promise<Session> {
    await post<MeResponse>('/auth/signup/', payload)
    return (await fetchMe()) as Session
}

export async function logout(): Promise<void> {
    await post<void>('/auth/logout/')
}
