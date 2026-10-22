// =====================================================================
//  DHB — Google : connexion OAuth (compte Google du propriétaire), jeton
//  d'accès, Google Analytics 4 (rapports, conversions côté serveur).
//
//  Secrets (Supabase → Edge Functions → Secrets) :
//    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET  (Google Cloud → Identifiants OAuth)
//    GOOGLE_REDIRECT_URI  = https://<projet>.supabase.co/functions/v1/google-oauth
//    GA_API_SECRET        (GA4 → Flux de données → Secrets de l'API Measurement Protocol)
//    ADMIN_URL            (retour vers le back-office après la connexion)
//  Le jeton de renouvellement est rangé dans public.integration_credentials,
//  table illisible depuis l'API (serveur uniquement).
// =====================================================================
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { HttpError, secretValide } from "./securite.ts";

// Adresses Google (remplaçables uniquement pour les tests automatisés).
const env = (k: string, d: string) => Deno.env.get(k) || d;
const URL_AUTH = () => env("GOOGLE_AUTH_URL", "https://accounts.google.com/o/oauth2/v2/auth");
const URL_TOKEN = () => env("GOOGLE_TOKEN_URL", "https://oauth2.googleapis.com/token");
const URL_REVOKE = () => env("GOOGLE_REVOKE_URL", "https://oauth2.googleapis.com/revoke");
const URL_USERINFO = () => env("GOOGLE_USERINFO_URL", "https://openidconnect.googleapis.com/v1/userinfo");
const URL_GA_DATA = () => env("GA_DATA_URL", "https://analyticsdata.googleapis.com");
const URL_GA_MP = () => env("GA_MP_URL", "https://www.google-analytics.com/mp/collect");

/** Autorisations demandées : lecture GA4 et Search Console, fichiers Drive créés par DHB. */
export const SCOPES = [
  "openid", "email",
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/drive.file",
];

export interface ConfigGoogle { clientId: string; clientSecret: string; redirectUri: string }
export function configGoogle(): ConfigGoogle | null {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID"), clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET"), redirectUri = Deno.env.get("GOOGLE_REDIRECT_URI");
  return clientId && clientSecret && redirectUri ? { clientId, clientSecret, redirectUri } : null;
}

const b64u = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function hmac(secret: string, texte: string) {
  const cle = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64u(new Uint8Array(await crypto.subtle.sign("HMAC", cle, new TextEncoder().encode(texte))));
}

/** État OAuth signé (anti-falsification) : qui a lancé la connexion, valable 10 minutes. */
export async function signerEtat(userId: string, secret: string): Promise<string> {
  const corps = b64u(new TextEncoder().encode(JSON.stringify({ u: userId, exp: Date.now() + 10 * 60000, n: crypto.randomUUID() })));
  return `${corps}.${await hmac(secret, corps)}`;
}
export async function verifierEtat(etat: string | null, secret: string): Promise<{ u: string } | null> {
  if (!etat || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(etat)) return null;
  const [corps, sig] = etat.split(".");
  if (!secretValide(sig, await hmac(secret, corps))) return null;
  try {
    const d = JSON.parse(atob(corps.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof d.u === "string" && Number(d.exp) > Date.now() ? { u: d.u } : null;
  } catch { return null; }
}

export function urlConsentement(cfg: ConfigGoogle, etat: string): string {
  const p = new URLSearchParams({
    client_id: cfg.clientId, redirect_uri: cfg.redirectUri, response_type: "code", scope: SCOPES.join(" "),
    access_type: "offline", prompt: "consent", include_granted_scopes: "true", state: etat,
  });
  return `${URL_AUTH()}?${p}`;
}

async function appelToken(params: Record<string, string>) {
  const r = await fetch(URL_TOKEN(), { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(params) });
  const d = await r.json().catch(() => ({})) as Record<string, string>;
  return { ok: r.ok, d };
}

export async function echangerCode(cfg: ConfigGoogle, code: string) {
  const { ok, d } = await appelToken({ code, client_id: cfg.clientId, client_secret: cfg.clientSecret, redirect_uri: cfg.redirectUri, grant_type: "authorization_code" });
  if (!ok || !d.access_token) throw new HttpError(502, `google_${d.error ?? "echange_impossible"}`);
  return { accessToken: d.access_token, refreshToken: d.refresh_token as string | undefined, scope: d.scope ?? "" };
}

export async function emailDuCompte(accessToken: string): Promise<string | null> {
  const r = await fetch(URL_USERINFO(), { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!r.ok) return null;
  return ((await r.json().catch(() => ({}))) as { email?: string }).email ?? null;
}

export async function revoquer(jeton: string) {
  await fetch(`${URL_REVOKE()}?token=${encodeURIComponent(jeton)}`, { method: "POST" }).catch(() => undefined);
}

export async function journal(sb: SupabaseClient, cle: string, action: string, statut: "ok" | "erreur" | "ignore", message: string) {
  await sb.from("integration_logs").insert({ cle, action, statut, message: message.slice(0, 500) });
}

/** Jeton d'accès Google à partir du jeton de renouvellement enregistré. */
export async function jetonAcces(sb: SupabaseClient): Promise<string> {
  const cfg = configGoogle();
  if (!cfg) throw new HttpError(503, "google_non_configure");
  const { data } = await sb.from("integration_credentials").select("refresh_token").eq("cle", "google").maybeSingle();
  if (!data?.refresh_token) throw new HttpError(409, "google_non_connecte");
  const { ok, d } = await appelToken({ refresh_token: data.refresh_token, client_id: cfg.clientId, client_secret: cfg.clientSecret, grant_type: "refresh_token" });
  if (!ok || !d.access_token) {
    // Accès retiré côté Google (ou application en mode « test » expirée après 7 jours).
    const message = d.error === "invalid_grant"
      ? "Accès Google expiré ou retiré : reconnectez le compte Google."
      : `Google refuse le renouvellement de l'accès (${d.error ?? "erreur inconnue"}).`;
    await sb.from("integrations").update({ statut: "erreur", erreur: message }).eq("cle", "google");
    await journal(sb, "google", "jeton", "erreur", message);
    throw new HttpError(409, d.error === "invalid_grant" ? "google_acces_expire" : "google_jeton_impossible");
  }
  return d.access_token;
}

export interface LigneGa4 { jour: string; canal: string; sessions: number; utilisateurs: number; conversions: number }

/** Sessions, utilisateurs et événements clés par jour et par canal (GA4 Data API). */
export async function rapportGa4(accessToken: string, propertyId: string, jours = 30): Promise<LigneGa4[]> {
  const r = await fetch(`${URL_GA_DATA()}/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      dateRanges: [{ startDate: `${jours}daysAgo`, endDate: "yesterday" }],
      dimensions: [{ name: "date" }, { name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "keyEvents" }],
      limit: 10000,
    }),
  });
  const d = await r.json().catch(() => ({})) as { rows?: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[]; error?: { message?: string; status?: string } };
  if (!r.ok) throw new HttpError(502, `ga4_${(d.error?.status ?? "erreur").toLowerCase()}`);
  return (d.rows ?? []).map((x) => {
    const j = x.dimensionValues[0].value;   // AAAAMMJJ
    return {
      jour: `${j.slice(0, 4)}-${j.slice(4, 6)}-${j.slice(6, 8)}`,
      canal: (x.dimensionValues[1].value || "(non défini)").slice(0, 80),
      sessions: Math.round(Number(x.metricValues[0].value) || 0),
      utilisateurs: Math.round(Number(x.metricValues[1].value) || 0),
      conversions: Math.round(Number(x.metricValues[2].value) || 0),
    };
  });
}

/** Conversion côté serveur (GA4 Measurement Protocol). Vrai si GA4 l'a acceptée. */
export async function envoyerConversion(measurementId: string, apiSecret: string, clientId: string, nom: string, params: Record<string, unknown> = {}) {
  const url = `${URL_GA_MP()}?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`;
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_id: clientId, events: [{ name: nom, params }] }) });
  return r.ok;
}
