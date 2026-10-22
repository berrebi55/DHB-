// =====================================================================
//  DHB — Edge Function : robot des automatisations (à planifier toutes les
//  15 minutes). Traite la file d'événements puis les règles quotidiennes
//  (relances de devis, rappels de factures). Voir _shared/automatisations.ts.
//
//  Sécurité : planification (en-tête x-cron-secret = CRON_SECRET) ou membre
//  de l'équipe connecté (bouton « Lancer maintenant » de Système → Automatisations).
//  Appel (POST) : {} — réponse : { ok, file: {…}, quotidien: {…} }
//  Déploiement : supabase functions deploy worker --no-verify-jwt
// =====================================================================
import { adminClient, cors, erreur, json, requireCronOrUser } from "../_shared/securite.ts";
import { executerQuotidiennes, traiterFile } from "../_shared/automatisations.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const sb = adminClient();
    const appelant = await requireCronOrUser(req, sb);
    const par = appelant.type === "utilisateur" ? appelant : null;
    const file = await traiterFile(sb);
    const quotidien = await executerQuotidiennes(sb, par);
    return json({ ok: true, file, quotidien, email_actif: !!Deno.env.get("RESEND_API_KEY") });
  } catch (e) {
    return erreur(e);
  }
});
