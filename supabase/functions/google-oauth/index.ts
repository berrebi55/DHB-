// =====================================================================
//  DHB — Edge Function : connexion du compte Google (OAuth).
//
//  POST { "action": "demarrer" }    (administrateur) → { url } : page Google
//  GET  ?code=…&state=…             retour de Google → enregistre l'accès puis
//                                    renvoie vers Système → Intégrations
//  POST { "action": "deconnecter" } (administrateur) → retire l'accès
//
//  Sécurité : seul un administrateur peut connecter / déconnecter ; le retour
//  de Google est vérifié par un état signé (10 minutes, administrateur
//  toujours valide). Le jeton est rangé côté serveur, jamais renvoyé.
//  Déploiement : supabase functions deploy google-oauth --no-verify-jwt
// =====================================================================
import { adminClient, cors, erreur, HttpError, json, requireUser } from "../_shared/securite.ts";
import { configGoogle, echangerCode, emailDuCompte, journal, revoquer, SCOPES, signerEtat, urlConsentement, verifierEtat } from "../_shared/google.ts";

function retour(resultat: string, raison?: string) {
  const base = (Deno.env.get("ADMIN_URL") ?? "").replace(/\/$/, "");
  const p = new URLSearchParams({ google: resultat, ...(raison ? { raison } : {}) });
  return new Response(null, { status: 302, headers: { Location: `${base}/systeme/integrations?${p}` } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const sb = adminClient();

  // ---- Retour de Google (navigateur redirigé par Google) ----
  if (req.method === "GET") {
    const u = new URL(req.url);
    const cfg = configGoogle();
    if (!cfg) return retour("erreur", "google_non_configure");
    if (u.searchParams.get("error")) {
      await journal(sb, "google", "connexion", "ignore", `Connexion annulée sur la page Google (${u.searchParams.get("error")}).`);
      return retour("refuse");
    }
    const etat = await verifierEtat(u.searchParams.get("state"), cfg.clientSecret);
    if (!etat) return retour("erreur", "etat_invalide");
    const { data: profil } = await sb.from("profiles").select("role").eq("id", etat.u).maybeSingle();
    if (profil?.role !== "admin") return retour("erreur", "reserve_admin");
    const code = u.searchParams.get("code");
    if (!code) return retour("erreur", "code_absent");
    try {
      const t = await echangerCode(cfg, code);
      if (!t.refreshToken) {
        await journal(sb, "google", "connexion", "erreur", "Google n'a pas fourni d'accès durable : retirez l'accès dans votre compte Google puis reconnectez.");
        return retour("erreur", "sans_acces_durable");
      }
      const manquants = SCOPES.filter((s) => s.startsWith("https://") && !t.scope.split(" ").includes(s));
      const compte = await emailDuCompte(t.accessToken);
      const { error: eJeton } = await sb.from("integration_credentials").upsert({ cle: "google", refresh_token: t.refreshToken, scopes: t.scope, updated_at: new Date().toISOString() });
      if (eJeton) {
        await journal(sb, "google", "connexion", "erreur", `Accès Google obtenu mais non enregistré : ${eJeton.message}`);
        return retour("erreur", "enregistrement_impossible");
      }
      await sb.from("integrations").update({
        statut: "connecte", compte, erreur: manquants.length ? `Autorisations non accordées : ${manquants.map((s) => s.split("/").pop()).join(", ")}` : null,
      }).eq("cle", "google");
      await journal(sb, "google", "connexion", "ok", `Compte Google connecté${compte ? ` (${compte})` : ""}.`);
      return retour("connecte");
    } catch (e) {
      await journal(sb, "google", "connexion", "erreur", `Échec de la connexion : ${(e as Error).message}`);
      return retour("erreur", "echange_impossible");
    }
  }

  try {
    if (req.method !== "POST") throw new HttpError(405, "methode_non_autorisee");
    const moi = await requireUser(req, sb);
    if (moi.role !== "admin") throw new HttpError(403, "reserve_admin");
    const { action } = await req.json().catch(() => ({})) as { action?: string };
    const cfg = configGoogle();

    if (action === "demarrer") {
      if (!cfg) throw new HttpError(503, "google_non_configure");
      return json({ url: urlConsentement(cfg, await signerEtat(moi.userId!, cfg.clientSecret)) });
    }
    if (action === "deconnecter") {
      const { data } = await sb.from("integration_credentials").select("refresh_token").eq("cle", "google").maybeSingle();
      if (data?.refresh_token) await revoquer(data.refresh_token);
      await sb.from("integration_credentials").delete().eq("cle", "google");
      await sb.from("integrations").update({ statut: "non_configure", compte: null, erreur: null }).eq("cle", "google");
      await journal(sb, "google", "deconnexion", "ok", `Compte Google déconnecté par ${moi.email ?? "un administrateur"}.`);
      return json({ ok: true });
    }
    throw new HttpError(400, "parametres_invalides");
  } catch (e) {
    return erreur(e);
  }
});
