// =====================================================================
//  DHB — utilitaires partagés des Edge Functions : CORS, réponses JSON,
//  client service role, contrôle d'accès, échappement HTML, envoi d'email.
//
//  Règle : aucune fonction sensible ne fait confiance à la clé publique.
//  - requireUser()     : exige un utilisateur connecté (jeton de session).
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

/** Exige un utilisateur connecté. Renvoie son identité et son rôle. */
export async function requireUser(req: Request, sb: SupabaseClient): Promise<Appelant> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new HttpError(401, "non_authentifie");
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) throw new HttpError(401, "non_authentifie");
  const { data: profil } = await sb.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  return {
    type: "utilisateur",
    userId: data.user.id,
    email: data.user.email ?? undefined,
    role: profil?.role ?? "collaborateur",
  };
}

/** Accepte la planification (secret partagé) ou un utilisateur connecté. */
export async function requireCronOrUser(req: Request, sb: SupabaseClient): Promise<Appelant> {
  const secret = Deno.env.get("CRON_SECRET");
  const fourni = req.headers.get("x-cron-secret");
  if (secret && fourni && fourni === secret) return { type: "systeme" };
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

/** Envoi via Resend. Renvoie null si OK, sinon un code d'erreur. */
export async function envoyerEmail(to: string, subject: string, html: string): Promise<string | null> {
  const key = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("NOTIFY_FROM") ?? "onboarding@resend.dev";
  if (!key) return "resend_not_configured";
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    return (d as { message?: string })?.message ?? "resend_error";
  }
  return null;
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
