import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { signup } from '@/lib/auth'
import type { Session } from '@/lib/auth'
import { ApiError } from '@/lib/client'

// Le backend valide champ par champ et rend un objet `{ champ: [messages] }`.
// L'aplatir plutôt que d'afficher un message unique : un mot de passe refusé
// remonte trois raisons à la fois, et n'en montrer qu'une ferait corriger le
// formulaire trois fois de suite.
function messages(err: unknown): string[] {
    if (!(err instanceof ApiError)) return ['Inscription impossible.']
    const body = err.body
    if (!body || typeof body !== 'object') return [err.message]
    const out = Object.values(body as Record<string, unknown>).flatMap(v =>
        Array.isArray(v) ? v.map(String) : [String(v)],
    )
    return out.length > 0 ? out : [err.message]
}

export default function SignupScreen({
    onSuccess,
    onCancel,
}: {
    onSuccess: (session: Session) => void
    onCancel: () => void
}) {
    const [form, setForm] = useState({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        organization_name: '',
        program_name: '',
        program_pfi: '',
    })
    const [errors, setErrors] = useState<string[]>([])
    const [pending, setPending] = useState(false)

    const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(f => ({ ...f, [key]: e.target.value }))

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        setPending(true)
        setErrors([])
        try {
            onSuccess(await signup(form))
        } catch (err) {
            setErrors(messages(err))
            setPending(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Créer un laboratoire</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={submit} className="space-y-4">
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
                            <Label htmlFor="email">Adresse électronique</Label>
                            <Input
                                id="email"
                                type="email"
                                autoComplete="username"
                                value={form.email}
                                onChange={set('email')}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Mot de passe</Label>
                            <Input
                                id="password"
                                type="password"
                                autoComplete="new-password"
                                value={form.password}
                                onChange={set('password')}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="organization_name">Nom du laboratoire</Label>
                            <Input
                                id="organization_name"
                                value={form.organization_name}
                                onChange={set('organization_name')}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-2 col-span-2">
                                <Label htmlFor="program_name">Premier programme</Label>
                                <Input
                                    id="program_name"
                                    value={form.program_name}
                                    onChange={set('program_name')}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="program_pfi">PFI</Label>
                                <Input
                                    id="program_pfi"
                                    placeholder="facultatif"
                                    value={form.program_pfi}
                                    onChange={set('program_pfi')}
                                />
                            </div>
                        </div>
                        {errors.map(m => (
                            <p key={m} className="text-sm text-destructive">{m}</p>
                        ))}
                        <Button type="submit" className="w-full" disabled={pending}>
                            {pending ? 'Création…' : 'Créer le laboratoire'}
                        </Button>
                        <Button type="button" variant="ghost" className="w-full" onClick={onCancel}>
                            J'ai déjà un compte
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
