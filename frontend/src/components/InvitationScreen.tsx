import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchInvitation, acceptInvitation } from '@/lib/api'
import { fetchMe, logout as apiLogout } from '@/lib/auth'
import type { Session } from '@/lib/auth'
import type { InvitationPreview } from '@/lib/types'
import { ApiError } from '@/lib/client'

// Même aplatissement que SignupScreen, à une exception près : `code` est sauté.
// Les refus de cette route portent un couple `{ detail, code }` destiné au
// front — afficher « invitation_email_mismatch » sous la phrase qui l'explique
// ne dirait rien de plus à personne.
function messages(err: unknown): string[] {
    if (!(err instanceof ApiError)) return ['Acceptation impossible.']
    const body = err.body
    if (!body || typeof body !== 'object') return [err.message]
    const out = Object.entries(body as Record<string, unknown>)
        .filter(([key]) => key !== 'code')
        .flatMap(([, v]) => (Array.isArray(v) ? v.map(String) : [String(v)]))
    return out.length > 0 ? out : [err.message]
}

// Le seul écran de l'application qui s'atteint par une URL, et le seul qu'un
// anonyme puisse voir en dehors de la connexion. Il doit donc se suffire à
// lui-même : la vue de prévisualisation est décorée `ensure_csrf_cookie` côté
// Django, ce GET est ce qui rend le POST d'acceptation possible.
export default function InvitationScreen({
    token,
    session,
    onAccepted,
}: {
    token: string
    // La session déjà établie, si l'invité était connecté en arrivant. Elle
    // change tout : le serveur ne demande alors aucun mot de passe, il rattache
    // le compte en place — à condition que l'adresse corresponde.
    session: Session | null
    onAccepted: (session: Session) => void
}) {
    const [preview, setPreview] = useState<InvitationPreview | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [form, setForm] = useState({ password: '', first_name: '', last_name: '' })
    const [errors, setErrors] = useState<string[]>([])
    const [pending, setPending] = useState(false)

    useEffect(() => {
        fetchInvitation(token)
            .then(p => {
                setPreview(p)
                // Le prénom et le nom saisis par l'invitant servent de valeurs
                // par défaut : c'est lui qui connaît l'orthographe à laquelle
                // l'annuaire du laboratoire s'attend.
                setForm(f => ({ ...f, first_name: p.first_name, last_name: p.last_name }))
            })
            .catch(err => {
                if (!(err instanceof ApiError)) return setLoadError('Invitation indisponible.')
                // 410 et 404 disent deux choses distinctes, et la confusion
                // coûterait un aller-retour avec l'invitant : une invitation
                // périmée se redemande, un lien inconnu se vérifie.
                if (err.status === 410) return setLoadError('Cette invitation a expiré. Demandez-en une nouvelle.')
                if (err.status === 404) return setLoadError("Ce lien n'est plus valable : invitation inconnue, révoquée ou déjà acceptée.")
                setLoadError('Invitation indisponible.')
            })
    }, [token])

    const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(f => ({ ...f, [key]: e.target.value }))

    // L'invitation est nominative : acceptée depuis un autre compte, le serveur
    // répond 403. Le dire avant l'envoi évite de faire cliquer pour rien.
    const mismatch =
        session !== null &&
        preview !== null &&
        session.user.email.toLowerCase() !== preview.email.toLowerCase()

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        setPending(true)
        setErrors([])
        try {
            await acceptInvitation(token, session ? {} : form)
            // La réponse porte bien le laboratoire, mais pas le programme : le
            // serveur vient de purger la clé et c'est le middleware qui la
            // reposera au prochain appel, auto-sélectionnée s'il n'y a qu'une
            // affectation. Seul fetchMe() sait donc où l'on atterrit.
            const next = await fetchMe()
            if (next) onAccepted(next)
            else setErrors(['Compte rejoint, mais la session n\'a pas pu être ouverte.'])
        } catch (err) {
            setErrors(messages(err))
        } finally {
            setPending(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>
                        {preview ? `Rejoindre ${preview.organization_name}` : 'Invitation'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {preview === null && loadError === null && (
                        <p className="text-sm text-muted-foreground">Chargement…</p>
                    )}
                    {loadError !== null && <p className="text-sm text-destructive">{loadError}</p>}
                    {preview !== null && (
                        <form onSubmit={submit} className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Invitation adressée à <strong>{preview.email}</strong>.
                            </p>

                            {mismatch ? (
                                <>
                                    <p className="text-sm text-destructive">
                                        Vous êtes connecté sous {session?.user.email}. Cette
                                        invitation en vise une autre : déconnectez-vous pour
                                        l'accepter.
                                    </p>
                                    <Button
                                        type="button"
                                        className="w-full"
                                        onClick={() => apiLogout().then(() => window.location.reload())}
                                    >
                                        Se déconnecter
                                    </Button>
                                </>
                            ) : (
                                <>
                                    {session !== null && (
                                        <p className="text-sm text-muted-foreground">
                                            Ce laboratoire sera ajouté à votre compte ; rien
                                            d'autre à saisir.
                                        </p>
                                    )}
                                    {session === null && (
                                        <>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-2">
                                                    <Label htmlFor="first_name">Prénom</Label>
                                                    <Input id="first_name" value={form.first_name} onChange={set('first_name')} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="last_name">Nom</Label>
                                                    <Input id="last_name" value={form.last_name} onChange={set('last_name')} />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                {/* Le même champ pour deux gestes opposés :
                                                    il crée le compte si l'adresse est libre,
                                                    il l'authentifie sinon. C'est
                                                    `account_exists` qui le dit, et rien
                                                    d'autre ne distingue les deux écrans. */}
                                                <Label htmlFor="password">
                                                    {preview.account_exists
                                                        ? 'Mot de passe de votre compte'
                                                        : 'Choisissez un mot de passe'}
                                                </Label>
                                                <Input
                                                    id="password"
                                                    type="password"
                                                    autoComplete={preview.account_exists ? 'current-password' : 'new-password'}
                                                    value={form.password}
                                                    onChange={set('password')}
                                                    required
                                                />
                                            </div>
                                        </>
                                    )}
                                    {errors.map(m => (
                                        <p key={m} className="text-sm text-destructive">{m}</p>
                                    ))}
                                    <Button type="submit" className="w-full" disabled={pending}>
                                        {pending ? 'Validation…' : 'Rejoindre le laboratoire'}
                                    </Button>
                                </>
                            )}
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
