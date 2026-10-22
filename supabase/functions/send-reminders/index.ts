// =====================================================================
//  DHB — Edge Function : relances automatiques par email (conservée pour
//  les planifications déjà en place ; le robot « worker » fait la même chose
//  et traite en plus la file d'événements).
//
//  Règles réglables dans Système → Automatisations (lot 9) :
//   - « Relance des devis sans réponse » : devis envoyé, non signé, après le délai ;
//   - « Rappel des factures en retard » : facture envoyée, échéance + délai dépassés.
//  Au plus une relance tous les 7 jours par document (derniere_relance_le).
//  Textes : modèles d'emails « relance_devis » et « rappel_facture ».
//
//  Sécurité : utilisateur connecté OU planification (x-cron-secret).
//  Déploiement : supabase functions deploy send-reminders --no-verify-jwt
// =====================================================================
import { adminClient, cors, erreur, json, requireCronOrUser } from "../_shared/securite.ts";
import { executerQuotidiennes } from "../_shared/automatisations.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const sb = adminClient();
    const appelant = await requireCronOrUser(req, sb);
    const bilan = await executerQuotidiennes(sb, appelant.type === "utilisateur" ? appelant : null);
    return json({ ok: true, ...bilan, email_actif: !!Deno.env.get("RESEND_API_KEY") });
  } catch (e) {
    return erreur(e);
  }
});
