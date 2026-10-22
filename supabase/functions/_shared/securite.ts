// =====================================================================
//  DHB — utilitaires partagés des Edge Functions : CORS, réponses JSON,
//  client service role, contrôle d'accès, échappement HTML.
//  (Envoi d'email : _shared/email.ts, module unique avec historique.)
//
//  Règle : aucune fonction sensible ne fait confiance à la clé publique.
//  - requireUser()     : exige un membre de l'équipe connecté (admin ou
//                        collaborateur) ; un compte « en_attente » est refusé.
//  - requireCronOrUser(): accepte en plus le secret de planification
//                          (en-tête x-cron-secret = variable CRON_SECRET).
// =====================================================================
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export class HttpError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

export interface Appelant {
  type: "utilisateur" | "systeme";
  userId?: string;
  email?: string;
  role?: string;
}

/** Comparaison de secrets à durée constante (évite de deviner un secret caractère par caractère). */
export function secretValide(fourni: string | null, attendu: string | undefined): boolean {
  if (!attendu || !fourni) return false;
  const a = new TextEncoder().encode(fourni);
  const b = new TextEncoder().encode(attendu);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

const ROLES_EQUIPE = ["admin", "collaborateur"];

/**
 * Exige un membre de l'équipe connecté et renvoie son identité et son rôle.
 * Un compte sans profil ou « en_attente » est refusé (403 acces_en_attente) :
 * jamais de droits par défaut.
 */
export async function requireUser(req: Request, sb: SupabaseClient): Promise<Appelant> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new HttpError(401, "non_authentifie");
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) throw new HttpError(401, "non_authentifie");
  const { data: profil } = await sb.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  const role = profil?.role ?? "en_attente";
  if (!ROLES_EQUIPE.includes(role)) throw new HttpError(403, "acces_en_attente");
  return {
    type: "utilisateur",
    userId: data.user.id,
    email: data.user.email ?? undefined,
    role,
  };
}

/** Accepte la planification (secret partagé) ou un membre de l'équipe connecté. */
export async function requireCronOrUser(req: Request, sb: SupabaseClient): Promise<Appelant> {
  if (secretValide(req.headers.get("x-cron-secret"), Deno.env.get("CRON_SECRET"))) return { type: "systeme" };
  return await requireUser(req, sb);
}

export function esc(v: unknown): string {
  return String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );
}

export function eur(n: unknown): string {
  const v = Number(n) || 0;
  return v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export function marque(entity: string | null | undefined): string {
  if (entity === "particuliers") return "DHB Assistance";
  if (entity === "groupe") return "DHB Groupe";
  return "DHB Pro";
}

/** Gestion uniforme des erreurs : codes lisibles par l'interface. */
export function erreur(e: unknown) {
  if (e instanceof HttpError) return json({ error: e.code }, e.status);
  return json({ error: (e as Error)?.message ?? "erreur_inconnue" }, 500);
}
