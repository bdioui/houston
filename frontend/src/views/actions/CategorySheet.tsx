import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/lib/api'
import type { Category } from '@/lib/types'
import { Trash2 } from 'lucide-react'

type Props = {
    open: boolean
    category?: Category        // fourni → mode édition, absent → mode création
    onClose: () => void
    onSaved: (category: Category) => void
    onDeleted?: (id: number) => void
}

export default function CategorySheet({ open, category, onClose, onSaved, onDeleted }: Props) {
    const [title,      setTitle]      = useState('')
    const [parentId,   setParentId]   = useState<number | null>(null)
    const [parents,    setParents]    = useState<Category[]>([])
    const [submitting, setSubmitting] = useState(false)
    const [color,      setColor]      = useState<string | null>(null)
    const [error,      setError]      = useState<string | null>(null)
    const [confirming, setConfirming] = useState(false)
    const [deleting,   setDeleting]   = useState(false)

    const isEdit = !!category
    
    const CAT_COLORS = [
        { label: 'Lavande', hexa: '#D8CFEE' },
        { label: 'Rose',    hexa: '#EEC5EF' },
        { label: 'Jaune',   hexa: '#EDD803' },
        { label: 'Gris',    hexa: '#E7E8E2' },
        { label: 'Bleu',    hexa: '#C5D2EF' },
    ]

    useEffect(() => {
        if (!open) return
        setTitle(category?.title ?? '')
        setParentId(category?.parent_category_id ?? null)
        setColor(category?.color ?? null)
        setError(null)
        setConfirming(false)
        getCategories().then(all => {
            // Seules les catégories sans parent peuvent être parent
            setParents(all.filter(c => !c.parent_category_id && c.id !== category?.id))
        })
    }, [open, category])

    async function handleSubmit() {
        if (!title.trim()) {
            setError('Le titre est obligatoire.')
            return
        }
        setError(null)
        setSubmitting(true)
        try {
            if (isEdit) {
                await updateCategory(category!.id, { title: title.trim(), parent_category_id: parentId, color })
                onSaved({ ...category!, title: title.trim(), parent_category_id: parentId, color })
            } else {
                const created = await createCategory(title.trim(), parentId, color)
                onSaved(created)
            }
            onClose()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Erreur inconnue')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
            <SheetContent side="right" showCloseButton={false} className="!w-[400px] flex flex-col gap-0 p-0">
                <SheetHeader className="px-6 py-4 border-b">
                    <SheetTitle>{isEdit ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <Label>Titre *</Label>
                        <Input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                            placeholder="Nom de la catégorie"
                            autoFocus
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label>Catégorie parente <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
                        <Select
                            value={parentId ? String(parentId) : 'none'}
                            onValueChange={v => setParentId(v === 'none' ? null : Number(v))}
                        >
                            <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Aucune (catégorie racine)</SelectItem>
                                {parents.map(p => (
                                    <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Si une catégorie parente est choisie, cette catégorie apparaîtra comme sous-catégorie.
                        </p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label>Couleur <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
                        <Select
                            value={color ? String(color) : 'none'}
                            onValueChange={c => setColor(c === 'none' ? null : String(c))}
                        >
                            <SelectTrigger><SelectValue placeholder="Aucune (catégorie racine)" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Aucune</SelectItem>
                                {CAT_COLORS.map(c => (
                                    <SelectItem key={c.label} value={String(c.hexa)}><div className='flex'><div className='w-5 h-5 rounded-full border border-border mr-2' style={{backgroundColor: c.hexa}}></div><div>{c.label}</div></div></SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <SheetFooter className="px-6 py-4 border-t flex flex-col gap-2">
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <div className="flex gap-2 justify-between">
                        {isEdit && category?.title !== 'Autre' && (
                            confirming ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-destructive">Supprimer ?</span>
                                    <Button size="sm" variant="destructive" className="rounded-md h-7" disabled={deleting} onClick={async () => {
                                        setDeleting(true)
                                        try {
                                            await deleteCategory(category!.id)
                                            onDeleted?.(category!.id)
                                            onClose()
                                        } finally {
                                            setDeleting(false)
                                            setConfirming(false)
                                        }
                                    }}>
                                        {deleting ? '...' : 'Confirmer'}
                                    </Button>
                                    <Button size="sm" variant="ghost" className="rounded-md h-7" onClick={() => setConfirming(false)}>Annuler</Button>
                                </div>
                            ) : (
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive rounded-md" onClick={() => setConfirming(true)}>
                                    <Trash2 size={14} /> Supprimer
                                </Button>
                            )
                        )}
                        <div className="flex gap-2 ml-auto">
                            <Button variant="outline" onClick={onClose} disabled={submitting}>Annuler</Button>
                            <Button onClick={handleSubmit} disabled={submitting}>
                                {submitting ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer'}
                            </Button>
                        </div>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}
