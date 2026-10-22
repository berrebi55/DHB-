import { MutationCache, QueryClient } from "@tanstack/react-query";

// Client de cache unique (Refine + écrans de pilotage).
// - pas de rechargement au retour sur l'onglet, données gardées 30 s ;
// - après toute modification réussie (création, mise à jour, suppression),
//   les indicateurs du tableau de bord / pilotage sont marqués à rafraîchir.
// Nouvelle tentative automatique : une seule, et jamais après un délai dépassé
// ou une erreur « définitive » (droits, donnée absente, requête invalide) —
// sinon un serveur muet ferait patienter plusieurs minutes.
function relancer(echecs: number, err: unknown): boolean {
  const e = err as { message?: string; status?: number; statusCode?: number; code?: string } | null;
  const msg = String(e?.message ?? "");
  const status = e?.status ?? e?.statusCode;
  if (/Délai dépassé|TimeoutError|aborted/i.test(msg)) return false;
  if (status && status >= 400 && status < 500) return false;
  if (e?.code && /^(PGRST|42|23)/.test(e.code)) return false;
  return echecs < 1;
}

export const queryClient: QueryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 30_000, retry: relancer } },
  mutationCache: new MutationCache({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["dhb"] });
    },
  }),
});
