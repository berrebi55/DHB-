// =====================================================================
//  DHB — Edge Function : email reçu par Resend Inbound (lot 18).
//
//  Resend appelle cette adresse à chaque email reçu sur une adresse de support
//  (événement « email.received », signé). L'email est mis en file (une seule
//  fois, même si Resend renvoie l'événement) puis traité aussitôt : ticket,
//  conversation, pièces jointes (voir _shared/tickets.ts). En cas d'échec, le
//  robot (worker) réessaie : 5 min, 30 min, 2 h, 12 h.
//
//  Sécurité : signature Svix obligatoire (secret RESEND_WEBHOOK_SECRET « whsec_… »),
//  horodatage de moins de 5 minutes (pas de rejeu).
//  Secrets : RESEND_API_KEY (lecture de l'email), RESEND_WEBHOOK_SECRET.
//  Déploiement : supabase functions deploy email-entrant --no-verify-jwt
// =====================================================================
import { adminClient, cors, erreur, HttpError, json } from "../_shared/securite.ts";
import { signatureSvixValide } from "../_shared/tickets.ts";
import { traiterEvenementEmail } from "../_shared/automatisations.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (req.method !== "POST") throw new HttpError(405, "methode_non_autorisee");
    const secret = Deno.env.get("RESEND_WEBHOOK_SECRET");
    if (!secret) throw new HttpError(503, "webhook_non_configure");
    const corps = await req.text();
    if (corps.length > 200_000) throw new HttpError(413, "trop_volumineux");
    if (!(await signatureSvixValide(req.headers, corps, secret))) return json({ error: "signature_invalide" }, 401);

    let evt: { type?: string; data?: { email_id?: string } };
    try { evt = JSON.parse(corps); } catch { throw new HttpError(400, "json_invalide"); }
    if (evt.type !== "email.received") return json({ ok: true, ignore: evt.type ?? "inconnu" });
    const emailId = String(evt.data?.email_id ?? "");
    if (!UUID.test(emailId)) throw new HttpError(400, "email_id_invalide");

    const sb = adminClient();
    // Mise en file (l'index unique empêche les doublons si Resend renvoie l'événement).
    const { data: ev, error } = await sb.from("evenements").insert({ type: "email_recu", objet_type: "email", objet_id: emailId }).select("*").maybeSingle();
    if (error?.code === "23505") return json({ ok: true, deja_recu: true });
    if (error || !ev) throw new HttpError(500, "file_indisponible");

    // Traitement immédiat ; en cas d'échec l'événement reste en file pour le robot.
    const issue = await traiterEvenementEmail(sb, ev);
    return json({ ok: true, ...issue });
  } catch (e) {
    return erreur(e);
  }
});
