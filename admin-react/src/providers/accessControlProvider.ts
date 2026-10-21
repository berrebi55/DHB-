import type { AccessControlProvider } from "@refinedev/core";
import { supabaseClient } from "../supabaseClient";

// Règles simples :
//  - admin : tout.
//  - collaborateur : lecture partout, mais pas de suppression,
//    et pas d'accès aux paramètres (prix) ni à la gestion des utilisateurs.
const COLLAB_FORBIDDEN_RESOURCES = ["settings", "profiles"];

let cache: { role: string; at: number } | null = null;
async function getRole(): Promise<string> {
  if (cache && Date.now() - cache.at < 30_000) return cache.role;
  const { data } = await supabaseClient.auth.getUser();
  let role = "admin";
  if (data?.user) {
    const { data: p } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();
    role = p?.role ?? "admin";
  }
  cache = { role, at: Date.now() };
  return role;
}

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action }) => {
    const role = await getRole();
    if (role === "admin") return { can: true };
    // collaborateur
    if (resource && COLLAB_FORBIDDEN_RESOURCES.includes(resource)) {
      return { can: false, reason: "Réservé à l'administrateur." };
    }
    if (action === "delete") {
      return { can: false, reason: "Suppression réservée à l'administrateur." };
    }
    return { can: true };
  },
  options: { buttons: { enableAccessControl: true, hideIfUnauthorized: true } },
};
