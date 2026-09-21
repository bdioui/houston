import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/client'

function messages(err: unknown): string[] {
    if (!(err instanceof ApiError)) return ['Création impossible.']
    const body = err.body
    if (!body || typeof body !== 'object') return [err.message]
    const out = Object.values(body as Record<string, unknown>).flatMap(v =>
        Array.isArray(v) ? v.map(String) : [String(v)],
    )
    return out.length > 0 ? out : [err.message]
}

// Un seul champ, et c'est délibéré : `create_organization` nomme lui-même le
// premier programme. Demander les deux ici obligerait à expliquer les deux axes
// de cloisonnement à quelqu'un qui veut juste un espace à lui ; le programme se
// renomme ensuite comme n'importe quel autre.
export default function CreateOrganizationModal({
    open,
    onClose,
    onCreate,
}: {
    open: boolean
    onClose: () => void
    onCreate: (name: string) => Promise<void>
}) {
    const [name, setName] = useState('')
    const [errors, setErrors] = useState<string[]>([])
    const [pending, setPending] = useState(false)

    useEffect(() => {
        if (!open) return
        setName('')
        setErrors([])
    }, [open])

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        setPending(true)
        setErrors([])
        try {
            // La création bascule le laboratoire actif côté serveur ; c'est
            // `onCreate` qui refait le fetchMe(), seul à savoir où l'on
            // atterrit. On ne ferme qu'une fois l'écran remonté sur le nouveau
            // contexte, sinon on verrait l'ancien pendant un instant.
            await onCreate(name.trim())
            onClose()
        } catch (err) {
            setErrors(messages(err))
        } finally {
            setPending(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={o => !o && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Nouvel espace de travail</DialogTitle>
                    <DialogDescription>
                        Un laboratoire à part, avec son annuaire, ses projets et ses
                        finances. Vous en êtes l'administrateur, et l'application
                        bascule dessus aussitôt.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="org_name">Nom du laboratoire</Label>
                        <Input
                            id="org_name"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            maxLength={200}
                            autoFocus
                            required
                        />
                    </div>

                    {errors.length > 0 && (
                        <ul className="space-y-1 text-sm text-destructive">
                            {errors.map((m, i) => <li key={i}>{m}</li>)}
                        </ul>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
                            Annuler
                        </Button>
                        <Button type="submit" disabled={pending || name.trim() === ''}>
                            {pending ? 'Création…' : 'Créer'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
