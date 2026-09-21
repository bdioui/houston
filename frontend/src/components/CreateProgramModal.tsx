import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/client'
import type { Program } from '@/lib/types'

export type ProgramDraft = Pick<Program, 'name' | 'pfi' | 'budget' | 'start_date' | 'end_date'>

function messages(err: unknown): string[] {
    if (!(err instanceof ApiError)) return ['Création impossible.']
    const body = err.body
    if (!body || typeof body !== 'object') return [err.message]
    const out = Object.values(body as Record<string, unknown>).flatMap(v =>
        Array.isArray(v) ? v.map(String) : [String(v)],
    )
    return out.length > 0 ? out : [err.message]
}

const EMPTY = { name: '', pfi: '', budget: '', start_date: '', end_date: '' }

// Plus de champs que pour un laboratoire, et pour une raison concrète : hormis
// le taux de frais de gestion, aucun écran ne permet encore de reprendre un
// programme après coup. Ce qui n'est pas saisi ici ne l'est plus du tout.
export default function CreateProgramModal({
    open,
    onClose,
    onCreate,
}: {
    open: boolean
    onClose: () => void
    onCreate: (draft: ProgramDraft) => Promise<void>
}) {
    const [form, setForm] = useState(EMPTY)
    const [errors, setErrors] = useState<string[]>([])
    const [pending, setPending] = useState(false)

    useEffect(() => {
        if (!open) return
        setForm(EMPTY)
        setErrors([])
    }, [open])

    const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(f => ({ ...f, [key]: e.target.value }))

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        setPending(true)
        setErrors([])
        try {
            await onCreate({
                name: form.name.trim(),
                pfi: form.pfi.trim(),
                budget: form.budget === '' ? 0 : Number(form.budget),
                // Une date vide vaut `null`, jamais `''` : Django refuse la
                // chaîne vide sur un DateField.
                start_date: form.start_date || null,
                end_date: form.end_date || null,
            })
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
                    <DialogTitle>Nouveau programme</DialogTitle>
                    <DialogDescription>
                        Dans le laboratoire courant. Vous y êtes affecté d'office, et
                        l'application bascule dessus.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="prog_name">Nom</Label>
                        <Input id="prog_name" value={form.name} onChange={set('name')} maxLength={200} autoFocus required />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            {/* Facultatif : un programme sur fonds propres n'a
                                pas de contrepartie comptable. Mais c'est la clé
                                de rapprochement SIFAC, et l'import refuse un
                                fichier dont le PFI ne correspond pas. */}
                            <Label htmlFor="prog_pfi">PFI</Label>
                            <Input id="prog_pfi" value={form.pfi} onChange={set('pfi')} maxLength={50} placeholder="Fonds propres" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="prog_budget">Budget (€)</Label>
                            <Input id="prog_budget" type="number" min="0" step="0.01" value={form.budget} onChange={set('budget')} placeholder="0" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="prog_start">Début</Label>
                            <Input id="prog_start" type="date" value={form.start_date} onChange={set('start_date')} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="prog_end">Fin</Label>
                            <Input id="prog_end" type="date" value={form.end_date} onChange={set('end_date')} />
                        </div>
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
                        <Button type="submit" disabled={pending || form.name.trim() === ''}>
                            {pending ? 'Création…' : 'Créer'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
