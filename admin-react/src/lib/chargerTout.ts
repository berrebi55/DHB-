// Chargement complet d'une table, page par page (lot 15).
// Supabase limite chaque réponse (1 000 lignes par défaut, sans erreur) : sans
// pagination, les chiffres du pilotage seraient calculés sur une partie des
// données dès 1 000 factures, devis ou demandes. Fichier sans dépendance
// (testé tel quel côté serveur).

export const TAILLE_PAGE = 1000;
/** Au-delà, on s'arrête et on le signale (chiffres partiels) plutôt que de bloquer le navigateur. */
export const MAX_LIGNES = 50_000;

export interface Page<T> { data: T[] | null; error: { message: string } | null }

/**
 * `page(de, a)` doit renvoyer les lignes de rang `de` à `a` inclus, dans un ordre
 * stable (ex. `.order("id").range(de, a)`). On enchaîne les pages jusqu'à en
 * recevoir une incomplète. La taille réelle des pages est déduite de la première
 * réponse : un plafond du serveur plus petit que TAILLE_PAGE ne fait rien perdre.
 */
export async function chargerTout<T>(page: (de: number, a: number) => PromiseLike<Page<T>>, max = MAX_LIGNES):
  Promise<{ data: T[]; error: Page<T>["error"]; tronque: boolean }> {
  const lignes: T[] = [];
  let taille = TAILLE_PAGE;
  let premiere = "";
  for (;;) {
    const r = await page(lignes.length, lignes.length + taille - 1);
    if (r.error) return { data: lignes, error: r.error, tronque: false };
    const recu = r.data ?? [];
    // Serveur qui ignore la pagination (renvoie toujours les mêmes lignes) : on s'arrête.
    // Les lignes sont triées par id : on compare l'id de la première ligne de chaque page.
    const tete = recu.length ? JSON.stringify((recu[0] as { id?: unknown })?.id ?? recu[0]) : "";
    if (tete && tete === premiere) return { data: lignes, error: null, tronque: false };
    premiere = tete;
    lignes.push(...recu);
    if (lignes.length === recu.length && recu.length > 0 && recu.length < taille) {
      // Première page plus courte que demandé : soit tout est là, soit le serveur
      // plafonne plus bas. On vérifie avec la page suivante, à sa taille.
      taille = recu.length;
      continue;
    }
    if (recu.length < taille) return { data: lignes, error: null, tronque: false };
    if (lignes.length >= max) return { data: lignes.slice(0, max), error: null, tronque: true };
  }
}
