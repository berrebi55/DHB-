import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Message clair plutôt qu'un crash obscur si le .env manque.
  console.error(
    "Configuration Supabase manquante : crée un fichier .env (voir .env.example).",
  );
}

// Délai maximal par requête : un réseau qui ne répond plus donne une erreur
// affichée (avec « Réessayer ») au lieu d'un chargement infini.
export const DELAI_REQUETE_MS = 25_000;

const fetchAvecDelai: typeof fetch = (input, init) => {
  const ctrl = new AbortController();
  const minuteur = setTimeout(() => ctrl.abort(new DOMException("Délai dépassé", "TimeoutError")), DELAI_REQUETE_MS);
  const parent = init?.signal;
  if (parent) {
    if (parent.aborted) ctrl.abort(parent.reason);
    else parent.addEventListener("abort", () => ctrl.abort(parent.reason), { once: true });
  }
  return fetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(minuteur));
};

export const supabaseClient = createClient(url ?? "", anonKey ?? "", {
  // Pas de nouvelles tentatives internes à la librairie : elles se cumulaient
  // avec le délai (jusqu'à 4 × 25 s). Les relances sont gérées en un seul
  // endroit, par le cache (src/queryClient.ts).
  db: { schema: "public", retry: false },
  auth: { persistSession: true, autoRefreshToken: true },
  global: { fetch: fetchAvecDelai },
});
