import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Copy, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { getInvitations, createInvitation, revokeInvitation, getMembers, getProgram } from '@/lib/api'
import type { Invitation, Member, OrgRole, Program } from '@/lib/types'
import { ApiError } from '@/lib/client'

function messages(err: unknown): string[] {
    if (!(err instanceof ApiError)) return ['Invitation impossible.']
    const body = err.body
    if (!body || typeof body !== 'object') return [err.message]
    const out = Object.values(body as Record<string, unknown>).flatMap(v =>
        Array.isArray(v) ? v.map(String) : [String(v)],
    )
    return out.length > 0 ? out : [err.message]
}

// `Select` de Radix n'accepte pas la chaîne vide comme valeur d'élément : elle
// lui sert à signifier « rien de choisi ». D'où une sentinelle pour la fiche
// annuaire, qui est facultative, retraduite en `null` au moment de l'envoi.
//
// Le programme, lui, n'en a plus besoin : il est obligatoire, et son état « pas
// encore choisi » est la chaîne vide que Radix comprend déjà.
const NONE = 'none'

// La seule vue d'administration du laboratoire, et elle n'en administre qu'une
// chose : qui peut y entrer. Réservée aux administrateurs — App.tsx ne monte
// l'entrée de menu que pour eux, et `IsOrganizationAdmin` le revérifie.
export default function InvitationsModal({
    open,
    onClose,
}: {
    open: boolean
    onClose: () => void
}) {
    const [list, setList] = useState<Invitation[] | null>(null)
    const [members, setMembers] = useState<Member[]>([])
    const [programs, setPrograms] = useState<Program[]>([])
    const [form, setForm] = useState({
        email: '',
        first_name: '',
        last_name: '',
        role: 'member' as OrgRole,
        member_id: NONE,
        program_id: '',
    })
    const [errors, setErrors] = useState<string[]>([])
    const [pending, setPending] = useState(false)
    // Le lien de la dernière invitation émise. Le serveur ne le rend qu'une
    // fois : s'il disparaît de l'écran sans avoir été copié, l'invitation est
    // à révoquer et à refaire.
    const [fresh, setFresh] = useState<Invitation | null>(null)

    useEffect(() => {
        if (!open) return
        getInvitations().then(setList).catch(() => setList([]))
        getMembers().then(setMembers).catch(() => setMembers([]))
        getProgram()
            .then(ps => {
                setPrograms(ps)
                // Même convention que les deux sélecteurs de contexte : un
                // choix unique n'en est pas un, on le pose.
                if (ps.length === 1) setForm(f => ({ ...f, program_id: String(ps[0].id) }))
            })
            .catch(() => setPrograms([]))
    }, [open])

    const set = (key: 'email' | 'first_name' | 'last_name') => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(f => ({ ...f, [key]: e.target.value }))

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        setPending(true)
        setErrors([])
        try {
            const created = await createInvitation({
                email: form.email,
                first_name: form.first_name,
                last_name: form.last_name,
                role: form.role,
                member_id: form.member_id === NONE ? null : Number(form.member_id),
                program_id: Number(form.program_id),
            })
            setFresh(created)
            setList(l => [created, ...(l ?? [])])
            // Le programme survit à la remise à zéro : on invite en général
            // plusieurs personnes au même, et le rechoisir à chaque fois
            // n'apporte rien.
            setForm(f => ({ ...f, email: '', first_name: '', last_name: '', role: 'member', member_id: NONE }))
        } catch (err) {
            setErrors(messages(err))
        } finally {
            setPending(false)
        }
    }

    async function revoke(inv: Invitation) {
        try {
            await revokeInvitation(inv.id)
            setList(l => (l ?? []).filter(i => i.id !== inv.id))
            if (fresh?.id === inv.id) setFresh(null)
        } catch {
            toast.error('Révocation impossible.')
        }
    }

    function copy(url: string) {
        navigator.clipboard.writeText(url)
            .then(() => toast.success('Lien copié'))
            .catch(() => toast.error('Copie impossible ; sélectionnez le lien à la main.'))
    }

    return (
        <Dialog open={open} onOpenChange={o => !o && onClose()}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Inviter au laboratoire</DialogTitle>
                    <DialogDescription>
                        Aucun courriel n'est envoyé : le lien produit est à transmettre
                        vous-même, et il n'est affiché qu'une fois.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="inv_email">Adresse électronique</Label>
                        <Input id="inv_email" type="email" value={form.email} onChange={set('email')} required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="inv_first">Prénom</Label>
                            <Input id="inv_first" value={form.first_name} onChange={set('first_name')} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="inv_last">Nom</Label>
                            <Input id="inv_last" value={form.last_name} onChange={set('last_name')} />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                            <Label>Rôle</Label>
                            <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as OrgRole }))}>
                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="member">Membre</SelectItem>
                                    <SelectItem value="admin">Administrateur</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            {/* Obligatoire, et c'est la raison d'être du champ :
                                sans affectation, l'invité atterrit sur un
                                sélecteur de programme vide — rattaché au
                                laboratoire, et incapable d'y rien faire. */}
                            <Label>Programme</Label>
                            <Select value={form.program_id} onValueChange={v => setForm(f => ({ ...f, program_id: v }))}>
                                <SelectTrigger className="w-full"><SelectValue placeholder="À choisir" /></SelectTrigger>
                                <SelectContent>
                                    {programs.map(p => (
                                        <SelectItem key={p.id} value={String(p.id)}>
                                            {p.pfi ? `${p.pfi} — ${p.name}` : p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            {/* Deux usages sous un seul formulaire : laisser
                                vide crée une fiche annuaire à l'acceptation,
                                en désigner une donne un compte à quelqu'un qui
                                figure déjà dans l'annuaire. */}
                            <Label>Fiche existante</Label>
                            <Select value={form.member_id} onValueChange={v => setForm(f => ({ ...f, member_id: v }))}>
                                <SelectTrigger className="w-full"><SelectValue placeholder="Nouvelle" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={NONE}>Nouvelle fiche</SelectItem>
                                    {members.map(m => (
                                        <SelectItem key={m.id} value={String(m.id)}>
                                            {m.first_name} {m.last_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {errors.map(m => (
                        <p key={m} className="text-sm text-destructive">{m}</p>
                    ))}

                    {/* Le bouton porte la contrainte plutôt qu'un `required`
                        sur le Select : Radix rend un bouton, pas un input, et
                        la validation native du formulaire ne le voit pas. Le
                        sérialiseur refuserait de toute façon, en 400. */}
                    <Button type="submit" disabled={pending || !form.program_id}>
                        {pending ? 'Émission…' : 'Créer l\'invitation'}
                    </Button>
                </form>

                {fresh?.accept_url && (
                    <div className="rounded-md border bg-muted/40 p-3 space-y-2">
                        <p className="text-sm font-medium">Lien pour {fresh.email}</p>
                        <div className="flex gap-2">
                            <Input readOnly value={fresh.accept_url} className="font-mono text-xs" />
                            <Button type="button" variant="outline" onClick={() => copy(fresh.accept_url!)}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Valable jusqu'au {new Date(fresh.expires_at).toLocaleDateString('fr-FR')}.
                            Ce lien ne sera plus affiché.
                        </p>
                    </div>
                )}

                <div className="space-y-2">
                    <p className="text-sm font-medium">Invitations en attente</p>
                    {list === null && <p className="text-sm text-muted-foreground">Chargement…</p>}
                    {list?.length === 0 && (
                        <p className="text-sm text-muted-foreground">Aucune invitation en cours.</p>
                    )}
                    {list?.map(inv => (
                        <div key={inv.id} className="flex items-center gap-2 text-sm border-b py-2">
                            <div className="flex-1 min-w-0">
                                <span className="truncate">{inv.email}</span>
                                <span className="text-muted-foreground">
                                    {' '}— {inv.role === 'admin' ? 'administrateur' : 'membre'}
                                    {inv.accepted_at
                                        ? ', acceptée'
                                        : inv.is_expired
                                            ? ', expirée'
                                            : `, jusqu'au ${new Date(inv.expires_at).toLocaleDateString('fr-FR')}`}
                                </span>
                            </div>
                            <Button type="button" variant="ghost" size="sm" onClick={() => revoke(inv)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
}
