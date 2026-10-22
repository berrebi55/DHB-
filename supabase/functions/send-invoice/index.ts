// =====================================================================
//  DHB — Edge Function : envoyer une facture par email au client.
//
//  Sécurité : utilisateur connecté obligatoire. La fonction relit la facture
//  en base et n'écrit QU'À l'email du client de cette facture : impossible de
//  s'en servir pour envoyer un message arbitraire.
//
//  Secrets : RESEND_API_KEY, NOTIFY_FROM (expéditeur vérifié chez Resend).
//  Appel (POST, jeton utilisateur) : { "facture_id": "<uuid>" }
//  Déploiement : supabase functions deploy send-invoice --no-verify-jwt
//  (l'authentification est vérifiée dans la fonction elle-même)
// =====================================================================
import {
  adminClient, cors, envoyerEmail, erreur, esc, eur, HttpError, json, marque, requireUser,
} from "../_shared/securite.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const sb = adminClient();
    await requireUser(req, sb);

    const { facture_id } = await req.json().catch(() => ({}));
    if (!facture_id) throw new HttpError(400, "facture_id_manquant");

    const { data: f } = await sb.from("factures").select("*").eq("id", facture_id).maybeSingle();
    if (!f) throw new HttpError(404, "facture_introuvable");
    if (f.status === "annulee") throw new HttpError(409, "facture_annulee");
    if (!f.client_email) throw new HttpError(422, "email_client_manquant");

    const { data: ent } = await sb.from("entreprise").select("*").eq("id", 1).maybeSingle();
    const societe = ent?.raison_sociale || marque(f.entity);
    const lignes = Array.isArray(f.lignes) && f.lignes.length
      ? f.lignes
      : [{ libelle: f.libelle, qte: f.quantite, pu: f.prix_unitaire }];
    const rows = lignes.map((l: { libelle?: string; qte?: number; pu?: number }) =>
      `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee">${esc(l.libelle)}</td>` +
      `<td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${esc(l.qte)}</td>` +
      `<td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${eur((Number(l.qte) || 0) * (Number(l.pu) || 0))}</td></tr>`
    ).join("");
    const tvaMention = Number(f.tva_taux) > 0 ? "" : "<p style=\"color:#667085;font-size:12px\">TVA non applicable, art. 293 B du CGI.</p>";
    const echeance = f.date_echeance ?? f.date_facture;

    const html = `
      <div style="font-family:Arial,sans-serif;color:#101828;max-width:560px">
        <p>Bonjour ${esc(f.client_nom)},</p>
        <p>Veuillez trouver ci-dessous le récapitulatif de votre facture.</p>
        <table style="border-collapse:collapse;margin:12px 0">
          <tr><td style="padding:3px 10px 3px 0"><b>Facture</b></td><td>${esc(f.numero)}</td></tr>
          <tr><td style="padding:3px 10px 3px 0"><b>Date</b></td><td>${esc(f.date_facture)}</td></tr>
          <tr><td style="padding:3px 10px 3px 0"><b>Échéance</b></td><td>${esc(echeance)}</td></tr>
        </table>
        <table style="border-collapse:collapse;width:100%;margin:12px 0">${rows}</table>
        <p style="font-size:16px"><b>Total : ${eur(f.total_ttc)}</b></p>
        ${tvaMention}
        <p>Nous restons à votre disposition pour toute question.</p>
        <p>Cordialement,<br>${esc(societe)}</p>
      </div>`;

    const err = await envoyerEmail(f.client_email, `Votre facture ${f.numero ?? ""} — ${societe}`, html);
    if (err) return json({ error: err }, err === "resend_not_configured" ? 503 : 502);

    if (f.status === "brouillon") {
      await sb.from("factures").update({ status: "envoyee" }).eq("id", f.id);
    }
    return json({ ok: true });
  } catch (e) {
    return erreur(e);
  }
});
