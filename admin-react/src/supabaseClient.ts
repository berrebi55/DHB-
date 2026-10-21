import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Message clair plutôt qu'un crash obscur si le .env manque.
  // eslint-disable-next-line no-console
  console.error(
    "Configuration Supabase manquante : crée un fichier .env (voir .env.example).",
  );
}

export const supabaseClient = createClient(url ?? "", anonKey ?? "", {
  db: { schema: "public" },
  auth: { persistSession: true, autoRefreshToken: true },
});
