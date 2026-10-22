// =====================================================================
//  DHB — Edge Function : réception des événements Stripe (webhook).
//
//  Sécurité : chaque appel doit porter une signature Stripe valide
//  (en-tête Stripe-Signature, secret STRIPE_WEBHOOK_SECRET « whsec_… »),
//  datée de moins de 5 minutes. Sans secret configuré : 503, rien n'est lu.
//
//  Événements utilisés :
//  - checkout.session.completed / async_payment_succeeded (payée) :
//    paiement ponctuel ou premier paiement d'un abonnement ;
//  - invoice.paid : renouvellement d'un abonnement ;
//  - customer.subscription.updated / deleted : statut de l'abonnement.
//  Tout est enregistré par public.stripe_traiter_evenement (une transaction,
//  anti-doublon) : client, facture payée, paiement « stripe », abonnement.
//
//  Secrets : STRIPE_WEBHOOK_SECRET (obligatoire), STRIPE_SECRET_KEY
//  (facultatif : lit le libellé et la périodicité exacts du produit).
//  Déploiement : supabase functions deploy stripe-webhook --no-verify-jwt
//  Stripe → Developers → Webhooks → URL : https://<projet>.supabase.co/functions/v1/stripe-webhook
// =====================================================================
import { adminClient, json } from "../_shared/securite.ts";
import { analyser, signatureValide, type Objet } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "methode_non_autorisee" }, 405);
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret) return json({ error: "webhook_non_configure" }, 503);
  const corps = await req.text();
  if (!(await signatureValide(req.headers.get("stripe-signature"), corps, secret))) return json({ error: "signature_invalide" }, 400);

  let evt: Objet;
  try { evt = JSON.parse(corps); } catch { return json({ error: "json_invalide" }, 400); }
  if (typeof evt?.id !== "string" || !/^evt_[A-Za-z0-9_]+$/.test(evt.id)) return json({ error: "evenement_invalide" }, 400);

  const sb = adminClient();
  try {
    const { type, donnees } = await analyser(evt);
    const { data, error } = await sb.rpc("stripe_traiter_evenement", { p_id: evt.id, p_type_stripe: evt.type, p_type: type, p_d: donnees });
    if (error) throw new Error(error.message);
    return json({ recu: true, resultat: data });
  } catch (e) {
    // Erreur notée pour le suivi ; réponse 500 → Stripe renverra l'événement plus tard.
    const message = String((e as Error)?.message ?? e).slice(0, 500);
    await sb.from("stripe_evenements").upsert({ id: evt.id, type: String(evt.type ?? "?"), statut: "erreur", erreur: message }, { onConflict: "id" });
    return json({ error: "traitement_impossible" }, 500);
  }
});
