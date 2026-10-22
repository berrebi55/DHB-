import type { AuthProvider } from "@refinedev/core";
import { supabaseClient } from "../supabaseClient";

interface Profil {
  role: string;
  nom: string | null;
}

// Profil (rôle + nom) mis en cache 30 s pour éviter une requête à chaque contrôle.
let cache: { id: string; profil: Profil; at: number } | null = null;

export async function profilCourant(): Promise<(Profil & { id: string; email?: string }) | null> {
  const { data } = await supabaseClient.auth.getUser();
  const user = data?.user;
  if (!user) return null;
  if (cache && cache.id === user.id && Date.now() - cache.at < 30_000) {
    return { id: user.id, email: user.email, ...cache.profil };
  }
  // Jamais de droits par défaut : profil absent ou illisible = « en_attente ».
  // (La base applique de toute façon la même règle via RLS.)
  let profil: Profil = { role: "en_attente", nom: null };
  try {
    const { data: p } = await supabaseClient.from("profiles").select("role, nom").eq("id", user.id).maybeSingle();
    if (p) profil = { role: p.role, nom: p.nom ?? null };
  } catch {
    /* profil = en_attente */
  }
  cache = { id: user.id, profil, at: Date.now() };
  return { id: user.id, email: user.email, ...profil };
}

export const ROLES_EQUIPE = ["admin", "collaborateur"];
export const estEquipe = (role?: string | null) => !!role && ROLES_EQUIPE.includes(role);

export function viderCacheProfil() {
  cache = null;
}

export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      const message = /invalid login credentials/i.test(error.message)
        ? "Email ou mot de passe incorrect."
        : /email not confirmed/i.test(error.message)
          ? "Votre adresse email n'est pas encore confirmée."
          : error.message;
      return { success: false, error: { name: "Connexion impossible", message } };
    }
    viderCacheProfil();
    if (data?.session) return { success: true, redirectTo: "/" };
    return { success: false, error: { name: "Connexion impossible", message: "Réessayez dans un instant." } };
  },
  logout: async () => {
    await supabaseClient.auth.signOut();
    viderCacheProfil();
    return { success: true, redirectTo: "/login" };
  },
  onError: async (error) => {
    if (error?.statusCode === 401 || error?.code === "PGRST301") return { logout: true, redirectTo: "/login" };
    return { error };
  },
  check: async () => {
    const { data } = await supabaseClient.auth.getSession();
    if (data?.session) return { authenticated: true };
    return { authenticated: false, redirectTo: "/login" };
  },
  getPermissions: async () => (await profilCourant())?.role ?? null,
  getIdentity: async () => {
    const p = await profilCourant();
    if (!p) return null;
    return { id: p.id, name: p.nom || p.email || "Utilisateur", email: p.email, role: p.role };
  },
};
