// =====================================================================
//  DHB — Edge Function : envoyer un devis au client, avec son lien de
//  consultation et de signature en ligne.
//
//  Sécurité : utilisateur connecté obligatoire ; le devis est relu en base
//  et l'email part uniquement vers l'adresse du client du devis.
//
//  Secrets : RESEND_API_KEY, NOTIFY_FROM,
//            SIGN_BASE = URL publique de la page devis.html
//                        (ex. https://www.dhb-groupe.fr/devis.html)
//  Appel (POST, jeton utilisateur) : { "devis_id": "<uuid>" }
//  Réponse : { ok: true, lien } — ou { error, lien } si l'email n'a pas pu
//  partir (le lien reste utilisable pour un envoi manuel).
//  Déploiement : supabase functions deploy send-devis --no-verify-jwt
// =====================================================================
import {
  adminClient, cors, envoyerEmail, erreur, esc, eur, HttpError, json, marque, requireUser,
} from "../_shared/securite.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const sb = adminClient();
    await requireUser(req, sb);

    const { devis_id } = await req.json().catch(() => ({}));
    if (!devis_id) throw new HttpError(400, "devis_id_manquant");

    const { data: d } = await sb.from("devis").select("*").eq("id", devis_id).maybeSingle();
    if (!d) throw new HttpError(404, "devis_introuvable");
    if (["refuse", "expire"].includes(d.statut)) throw new HttpError(409, "devis_clos");

    const base = Deno.env.get("SIGN_BASE");
    if (!base) throw new HttpError(503, "sign_base_not_configured");
    const lien = `${base}?token=${d.public_token}`;
    if (!d.client_email) return json({ error: "email_client_manquant", lien }, 422);

    const { data: ent } = await sb.from("entreprise").select("raison_sociale").eq("id", 1).maybeSingle();
    const societe = ent?.raison_sociale || marque(d.entity);

    const html = `
      <div style="font-family:Arial,sans-serif;color:#101828;max-width:560px">
        <p>Bonjour ${esc(d.client_nom)},</p>
        <p>Comme convenu, voici notre proposition <b>${esc(d.numero)}</b>
           d'un montant de <b>${eur(d.total_ttc)}</b>, valable ${esc(d.validite_jours ?? 30)} jours.</p>
        <p style="margin:22px 0">
          <a href="${esc(lien)}" style="background:#2450D3;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">
            Consulter et accepter le devis
          </a>
        </p>
        <p style="color:#667085;font-size:13px">Si le bouton ne fonctionne pas, copiez ce lien : ${esc(lien)}</p>
        <p>Cordialement,<br>${esc(societe)}</p>
      </div>`;

    const err = await envoyerEmail(d.client_email, `Votre devis ${d.numero ?? ""} — ${societe}`, html);
    if (err) return json({ error: err, lien }, err === "resend_not_configured" ? 503 : 502);

    await sb.from("devis")
      .update({ statut: d.statut === "brouillon" ? "envoye" : d.statut, envoye_at: new Date().toISOString() })
      .eq("id", d.id);
    return json({ ok: true, lien });
  } catch (e) {
    return erreur(e);
  }
});
