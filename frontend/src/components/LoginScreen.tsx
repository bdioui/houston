import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { login } from '@/lib/auth'
import type { AuthUser } from '@/lib/auth'
import { ApiError } from '@/lib/client'

export default function LoginScreen({ onSuccess }: { onSuccess: (user: AuthUser) => void }) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [pending, setPending] = useState(false)

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        setPending(true)
        setError(null)
        try {
            onSuccess(await login(email, password))
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Connexion impossible.')
            setPending(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>Houston</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Adresse électronique</Label>
                            <Input
                                id="email"
                                type="email"
                                autoComplete="username"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Mot de passe</Label>
                            <Input
                                id="password"
                                type="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error && <p className="text-sm text-destructive">{error}</p>}
                        <Button type="submit" className="w-full" disabled={pending}>
                            {pending ? 'Connexion…' : 'Se connecter'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
