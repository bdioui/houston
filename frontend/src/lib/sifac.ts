// Ce qui reste de `src/lib/sifac/` côté navigateur.
//
// Le reste de la chaîne — parse, aggregate, reconcile, import — est parti dans
// `backend/sifac/`. Cette fonction ne l'a pas suivi parce qu'elle sert deux
// besoins distincts : le serveur en a besoin pour agréger, l'écran Finance en a
// besoin pour afficher la vue « Ligne », qui lit des `SifacLine` brutes et n'a
// donc aucune dépense agrégée où lire la catégorie déjà calculée.
//
// C'est donc un doublon assumé de `sifac_category()` (backend/sifac/aggregate.py).
// Trois valeurs figées par SIFAC, qui n'ont jamais bougé : le coût d'un aller-
// retour serveur pour les recalculer dépasserait celui de les réécrire.
export function sifacCategory(code: string): string {
    return code === 'FG' ? 'Fonctionnement'
        : code === 'IG' ? 'Investissement'
            : 'Personnel'
}
