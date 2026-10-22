// =====================================================================
//  DHB — Edge Function : état de la configuration des intégrations.
//  Indique quels secrets sont définis (JAMAIS leur valeur) et, à la demande,
//  vérifie que l'accès Google fonctionne encore.
//
//  POST {}                     → { secrets: { google: true, … } }
//  POST { "tester": "google" } → { secrets, google: { ok, message } }
//  Sécurité : membre de l'équipe connecté.
//  Déploiement : supabase functions deploy integration-test --no-verify-jwt
// =====================================================================
import { adminClient, cors, erreur, HttpError, json, requireUser } from "../_shared/securite.ts";
import { configGoogle, jetonAcces, journal } from "../_shared/google.ts";

const defini = (...cles: string[]) => cles.every((k) => !!Deno.env.get(k));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const sb = adminClient();
    await requireUser(req, sb);
    const corps = await req.json().catch(() => ({})) as { tester?: string };
    const secrets = {
      google: !!configGoogle(),
      ga4_conversions: defini("GA_API_SECRET"),
      emails: defini("RESEND_API_KEY"),
      emails_mode_test: !!Deno.env.get("EMAIL_REDIRECTION"),
      emails_mode_test_adresse: Deno.env.get("EMAIL_REDIRECTION") || null,
      stripe: defini("STRIPE_SECRET_KEY"),
      stripe_webhook: defini("STRIPE_WEBHOOK_SECRET"),
      planification: defini("CRON_SECRET"),
      alertes_demandes: defini("WEBHOOK_SECRET", "NOTIFY_TO"),
      admin_url: defini("ADMIN_URL"),
    };
    if (corps.tester === "google") {
      try {
        await jetonAcces(sb);
        await sb.from("integrations").update({ statut: "connecte", erreur: null }).eq("cle", "google");
        await journal(sb, "google", "test", "ok", "Accès Google vérifié.");
        return json({ secrets, google: { ok: true, message: "Accès Google valide." } });
      } catch (e) {
        const code = e instanceof HttpError ? e.code : "erreur_inconnue";
        return json({ secrets, google: { ok: false, code } });
      }
    }
    return json({ secrets });
  } catch (e) {
    return erreur(e);
  }
});
