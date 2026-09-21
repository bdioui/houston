import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Copy, Trash2, UserPlus, Plus, ChevronDown, X, Crown } from 'lucide-react'
import { toast } from 'sonner'
import {
    getInvitations, createInvitation, revokeInvitation, getMembers, getProgram,
    getOrgMembers, setOrgMemberOwner, removeOrgMember,
    getProgramMembers, addProgramMember, setProgramMemberAdmin, removeProgramMember,
} from '@/lib/api'
import type { Invitation, Member, OrgMember, Program, ProgramMember } from '@/lib/types'
import { ApiError } from '@/lib/client'
import { useCurrentProgram, useCurrentUser } from '@/lib/userContext'

function messages(err: unknown): string[] {
    if (!(err instanceof ApiError)) return ['Opération impossible.']
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
const NONE = 'none'

function initials(first: string, last: string) {
    return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase() || '?'
}

/** L'écran de partage du programme actif : qui y travaille, et à quel titre.
 *
 * Centré sur le programme et non sur le laboratoire, parce que c'est le
 * périmètre dans lequel on travaille — comme le partage d'un document porte
 * sur le document ouvert. Le laboratoire n'en disparaît pas pour autant : il
 * fournit la seconde liste, celle des comptes présents mais non affectés, sans
 * laquelle « ajouter quelqu'un » supposerait de le réinviter.
 *
 * Les deux axes du cloisonnement s'y lisent côte à côte, et c'est voulu :
 * l'affectation au programme décide de ce que l'on voit, le titre porté dans ce
 * programme décide de qui peut en changer l'équipe. Ce sont deux questions
 * distinctes, et les séparer en deux écrans obligerait à les rapprocher de tête.
 *
 * Trois gestes, trois portées, et l'écran ne les mélange pas :
 *
 * - **Affecter / retirer du programme**, et **nommer un administrateur** de ce
 *   programme : ouverts à qui l'administre déjà.
 * - **Retirer du laboratoire** et **transmettre la propriété** : au seul
 *   propriétaire, parce qu'ils débordent le programme depuis lequel on les
 *   poserait.
 *
 * `isOwner` ne fait que griser des boutons. Chaque écriture est revérifiée côté
 * serveur, et un front qui mentirait n'obtiendrait qu'un 403.
 */
export default function ShareModal({
    open,
    onClose,
    isOwner,
}: {
    open: boolean
    onClose: () => void
    isOwner: boolean
}) {
    const program = useCurrentProgram()
    const currentUser = useCurrentUser()

    const [accounts, setAccounts] = useState<OrgMember[] | null>(null)
    const [links, setLinks] = useState<ProgramMember[]>([])
    const [list, setList] = useState<Invitation[] | null>(null)
    const [members, setMembers] = useState<Member[]>([])
    const [programs, setPrograms] = useState<Program[]>([])
    const [busy, setBusy] = useState<number | null>(null)
    const [errors, setErrors] = useState<string[]>([])

    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({
        email: '',
        first_name: '',
        last_name: '',
        is_program_admin: false,
        member_id: NONE,
        program_id: '',
    })
    const [pending, setPending] = useState(false)
    // Le lien de la dernière invitation émise. Le serveur ne le rend qu'une
    // fois : s'il disparaît de l'écran sans avoir été copié, l'invitation est
    // à révoquer et à refaire.
    const [fresh, setFresh] = useState<Invitation | null>(null)

    useEffect(() => {
        if (!open) return
        setErrors([])
        getOrgMembers().then(setAccounts).catch(() => setAccounts([]))
        getMembers().then(setMembers).catch(() => setMembers([]))
        // Les invitations du programme ouvert, pas celles du laboratoire : en
        // montrer d'un programme voisin laisserait croire qu'on attend ici
        // quelqu'un qui n'y viendra pas.
        getInvitations(program?.id).then(setList).catch(() => setList([]))
        getProgramMembers()
            .then(all => setLinks(all.filter(l => l.program_id === program?.id)))
            .catch(() => setLinks([]))
        getProgram()
            .then(ps => {
                setPrograms(ps)
                // Le programme ouvert, et non plus le seul de la liste quand
                // elle n'en compte qu'un : on invite dans le programme qu'on
                // est en train de partager, c'est le sens même de l'écran.
                if (program) setForm(f => ({ ...f, program_id: String(program.id) }))
            })
            .catch(() => setPrograms([]))
    }, [open, program])

    const set = (key: 'email' | 'first_name' | 'last_name') => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(f => ({ ...f, [key]: e.target.value }))

    // Son propre rattachement ne se modifie pas : se rétrograder refermerait
    // l'écran sur son auteur au milieu de son geste. Le serveur refuse de toute
    // façon en 400, le front n'évite qu'un clic mort.
    const isSelf = (a: OrgMember) => a.member_id !== null && a.member_id === currentUser?.id

    const affected = (accounts ?? []).filter(
        a => a.member_id !== null && links.some(l => l.member_id === a.member_id),
    )
    const rest = (accounts ?? []).filter(a => !affected.includes(a))

    // L'affectation du compte au programme ouvert, c'est-à-dire la ligne qui
    // porte son titre ici. Absente pour les comptes de la seconde liste.
    const linkOf = (account: OrgMember) =>
        links.find(l => l.member_id === account.member_id)

    // Le propriétaire administre ses programmes par affectation, pas par
    // dérogation : la ligne existe en base, `linkOf` la trouve, et cette
    // fonction n'a donc pas de cas particulier à traiter pour lui.
    const myLink = links.find(l => l.member_id === currentUser?.id)
    const canComposeTeam = isOwner || myLink?.is_admin === true

    async function grantOwnership(account: OrgMember) {
        setBusy(account.id)
        setErrors([])
        try {
            const updated = await setOrgMemberOwner(account.id, true)
            setAccounts(prev => (prev ?? []).map(a => (a.id === account.id ? updated : a)))
            toast.success(`${account.email} est désormais propriétaire du laboratoire`)
        } catch (err) {
            setErrors(messages(err))
        } finally {
            setBusy(null)
        }
    }

    async function changeProgramRole(account: OrgMember, admin: boolean) {
        const link = linkOf(account)
        if (!link) return
        setBusy(account.id)
        setErrors([])
        try {
            const updated = await setProgramMemberAdmin(link.id, admin)
            setLinks(prev => prev.map(l => (l.id === link.id ? updated : l)))
        } catch (err) {
            setErrors(messages(err))
        } finally {
            setBusy(null)
        }
    }

    async function detach(account: OrgMember) {
        setBusy(account.id)
        setErrors([])
        try {
            await removeOrgMember(account.id)
            setAccounts(prev => (prev ?? []).filter(a => a.id !== account.id))
            toast.success(`${account.email} n'a plus accès au laboratoire`)
        } catch (err) {
            setErrors(messages(err))
        } finally {
            setBusy(null)
        }
    }

    async function toggleProgram(account: OrgMember) {
        if (account.member_id === null || !program) return
        const link = linkOf(account)
        setBusy(account.id)
        setErrors([])
        try {
            if (link) {
                await removeProgramMember(link.id)
                setLinks(prev => prev.filter(l => l.id !== link.id))
            } else {
                const created = await addProgramMember(account.member_id, program.id)
                setLinks(prev => [...prev, created])
            }
        } catch (err) {
            setErrors(messages(err))
        } finally {
            setBusy(null)
        }
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        setPending(true)
        setErrors([])
        try {
            const created = await createInvitation({
                email: form.email,
                first_name: form.first_name,
                last_name: form.last_name,
                is_program_admin: form.is_program_admin,
                member_id: form.member_id === NONE ? null : Number(form.member_id),
                program_id: Number(form.program_id),
            })
            setFresh(created)
            setList(l => [created, ...(l ?? [])])
            setForm(f => ({
                ...f, email: '', first_name: '', last_name: '',
                is_program_admin: false, member_id: NONE,
            }))
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

    function row(account: OrgMember, inProgram: boolean) {
        const self = isSelf(account)
        return (
            <div key={account.id} className="flex items-center gap-3 py-2">
                <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-[10px] bg-muted">
                        {initials(account.first_name, account.last_name)}
                    </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm truncate">
                        {account.first_name} {account.last_name}
                        {self && <span className="text-muted-foreground"> (vous)</span>}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">{account.email}</span>
                </div>

                {/* Un compte de support accède au laboratoire sans figurer à son
                    annuaire. Sans fiche, aucune affectation possible : c'est par
                    elle que passe le lien vers un programme. */}
                {account.member_id === null ? (
                    <span className="text-xs text-muted-foreground italic shrink-0">Sans fiche annuaire</span>
                ) : inProgram ? (
                    // Se retirer soi-même du programme *ouvert* le ferait
                    // disparaître sous ses propres pieds : le middleware ne le
                    // résoudrait plus à la requête suivante. Même garde que sur
                    // la fiche annuaire, pour la même raison.
                    <Button
                        type="button" variant="ghost" size="sm" className="shrink-0 text-xs"
                        disabled={self || busy !== null || !canComposeTeam}
                        onClick={() => toggleProgram(account)}
                    >
                        Retirer du programme
                    </Button>
                ) : (
                    <Button
                        type="button" variant="ghost" size="sm" className="shrink-0 text-xs"
                        disabled={busy !== null || !canComposeTeam}
                        onClick={() => toggleProgram(account)}
                    >
                        <Plus className="h-3 w-3" /> Ajouter
                    </Button>
                )}

                {/* Le titre porté *dans ce programme*, et nulle part ailleurs.
                    Il n'a donc de sens que pour les comptes affectés : pour les
                    autres, la question n'est pas encore posée. */}
                {inProgram ? (
                    <Select
                        value={linkOf(account)?.is_admin ? 'admin' : 'member'}
                        disabled={self || busy !== null || !canComposeTeam}
                        onValueChange={v => changeProgramRole(account, v === 'admin')}
                    >
                        <SelectTrigger size="sm" className="w-32 shrink-0"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="member">Membre</SelectItem>
                            <SelectItem value="admin">Administrateur</SelectItem>
                        </SelectContent>
                    </Select>
                ) : (
                    <span className="w-32 shrink-0" />
                )}

                {/* La propriété du laboratoire se montre et se donne, elle ne se
                    reprend pas : destituer quelqu'un, c'est le retirer, sur la
                    croix d'à côté. Une bascule à deux valeurs laisserait croire
                    à un geste symétrique, et le serveur refuse de toute façon
                    qu'on touche à son propre rattachement — ce seul garde-fou
                    est ce qui garantit qu'il reste toujours un propriétaire. */}
                {account.is_owner ? (
                    <span className="flex w-36 shrink-0 items-center justify-center gap-1 text-xs text-muted-foreground">
                        <Crown className="h-3 w-3" /> Propriétaire
                    </span>
                ) : (
                    <Button
                        type="button" variant="ghost" size="sm" className="w-36 shrink-0 text-xs"
                        disabled={busy !== null || !isOwner}
                        title="Transmettre la propriété du laboratoire"
                        onClick={() => grantOwnership(account)}
                    >
                        <Crown className="h-3 w-3" /> Nommer propriétaire
                    </Button>
                )}

                <Button
                    type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                    disabled={self || busy !== null || !isOwner}
                    title="Retirer du laboratoire"
                    onClick={() => detach(account)}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        )
    }

    return (
        <Dialog open={open} onOpenChange={o => !o && onClose()}>
            <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        Partager « {program?.name ?? 'ce programme'} »
                    </DialogTitle>
                    <DialogDescription>
                        L'affectation au programme décide de ce que chacun voit ; le titre
                        porté dans ce programme décide de qui peut en changer l'équipe.
                    </DialogDescription>
                </DialogHeader>

                {!showForm && (
                    <Button type="button" variant="outline" className="justify-start" onClick={() => setShowForm(true)}>
                        <UserPlus className="h-4 w-4" /> Inviter quelqu'un
                    </Button>
                )}

                {showForm && (
                    <form onSubmit={submit} className="space-y-4 rounded-md border p-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Inviter au laboratoire</p>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowForm(false)}>
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Aucun courriel n'est envoyé : le lien produit est à transmettre
                            vous-même, et il n'est affiché qu'une fois.
                        </p>

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
                                {/* Le titre vaut dans le programme choisi juste
                                    à côté, pas dans le laboratoire : une
                                    invitation ne fabrique jamais un
                                    propriétaire. Entrer dans le laboratoire
                                    ouvre déjà tout l'annuaire ; en confier la
                                    forme à quelqu'un est un geste distinct, que
                                    le propriétaire pose lui-même après coup. */}
                                <Label>Rôle dans le programme</Label>
                                <Select
                                    value={form.is_program_admin ? 'admin' : 'member'}
                                    onValueChange={v => setForm(f => ({ ...f, is_program_admin: v === 'admin' }))}
                                >
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

                        {/* Le bouton porte la contrainte plutôt qu'un `required`
                            sur le Select : Radix rend un bouton, pas un input, et
                            la validation native du formulaire ne le voit pas. Le
                            sérialiseur refuserait de toute façon, en 400. */}
                        <Button type="submit" disabled={pending || !form.program_id}>
                            {pending ? 'Émission…' : 'Créer l\'invitation'}
                        </Button>
                    </form>
                )}

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

                {errors.map(m => (
                    <p key={m} className="text-sm text-destructive">{m}</p>
                ))}

                <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Travaillent sur ce programme ({affected.length})
                    </p>
                    {accounts === null && <p className="text-sm text-muted-foreground py-2">Chargement…</p>}
                    {accounts !== null && affected.length === 0 && (
                        <p className="text-sm text-muted-foreground py-2">Personne pour l'instant.</p>
                    )}
                    <div className="divide-y">{affected.map(a => row(a, true))}</div>
                </div>

                {rest.length > 0 && (
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Dans le laboratoire, hors de ce programme ({rest.length})
                        </p>
                        <div className="divide-y">{rest.map(a => row(a, false))}</div>
                    </div>
                )}

                <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Invitations en attente
                    </p>
                    {list === null && <p className="text-sm text-muted-foreground py-2">Chargement…</p>}
                    {list?.length === 0 && (
                        <p className="text-sm text-muted-foreground py-2">Aucune invitation en cours.</p>
                    )}
                    {list?.map(inv => (
                        <div key={inv.id} className="flex items-center gap-2 text-sm border-b py-2">
                            <div className="flex-1 min-w-0">
                                <span className="truncate">{inv.email}</span>
                                <span className="text-muted-foreground">
                                    {' '}— {inv.is_program_admin ? 'administrateur du programme' : 'membre'}
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
