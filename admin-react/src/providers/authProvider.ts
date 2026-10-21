import type { AuthProvider } from "@refinedev/core";
import { supabaseClient } from "../supabaseClient";

// Rôle lu dans la table `profiles` (role = 'admin' | 'collaborateur').
// En l'absence de profil, on considère 'admin' (le 1er compte = toi).
async function fetchRole(userId: string): Promise<string> {
  try {
    const { data } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    return data?.role ?? "admin";
  } catch {
    return "admin";
  }
}

export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { success: false, error };
    if (data?.session) return { success: true, redirectTo: "/" };
    return { success: false, error: { name: "Login", message: "Échec de connexion" } };
  },
  logout: async () => {
    await supabaseClient.auth.signOut();
    return { success: true, redirectTo: "/login" };
  },
  onError: async (error) => {
    if (error?.statusCode === 401) return { logout: true };
    return { error };
  },
  check: async () => {
    const { data } = await supabaseClient.auth.getSession();
    if (data?.session) return { authenticated: true };
    return { authenticated: false, redirectTo: "/login" };
  },
  getPermissions: async () => {
    const { data } = await supabaseClient.auth.getUser();
    if (!data?.user) return null;
    return await fetchRole(data.user.id);
  },
  getIdentity: async () => {
    const { data } = await supabaseClient.auth.getUser();
    if (!data?.user) return null;
    const role = await fetchRole(data.user.id);
    return {
      id: data.user.id,
      name: data.user.email ?? "Admin",
      email: data.user.email,
      role,
    };
  },
};
