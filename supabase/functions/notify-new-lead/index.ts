// =====================================================================
//  DHB — Edge Function : notification email à chaque nouvelle demande.
//  Déclenchée par un « Database Webhook » Supabase sur INSERT de public.leads.
//
//  Sécurité :
//   - le texte saisi par le visiteur est échappé avant d'être mis dans l'email ;
//   - si WEBHOOK_SECRET est défini, l'appel doit porter l'en-tête
//     x-webhook-secret avec cette valeur (à ajouter dans le webhook Supabase).
//
//  Secrets : RESEND_API_KEY, NOTIFY_TO (destinataire des alertes), NOTIFY_FROM,
//            WEBHOOK_SECRET (recommandé), ADMIN_URL (lien vers le back-office).
//  Déploiement : supabase functions deploy notify-new-lead --no-verify-jwt
//  Webhook : Database → Webhooks → table public.leads · INSERT ·
//            Supabase Edge Functions · notify-new-lead · en-tête x-webhook-secret.
// =====================================================================
import { envoyerEmail, esc } from "../_shared/securite.ts";

const SITES: Record<string, string> = {
  infogerance: "DHB Pro",
  particuliers: "DHB Assistance",
  groupe: "DHB Groupe",
};

Deno.serve(async (req) => {
  try {
    const secret = Deno.env.get("WEBHOOK_SECRET");
    if (secret && req.headers.get("x-webhook-secret") !== secret) {
      return new Response("Non autorisé", { status: 401 });
    }
    const to = Deno.env.get("NOTIFY_TO");
    if (!to) return new Response("Configuration email manquante", { status: 200 });

    const payload = await req.json();
    const lead = payload.record ?? payload;

    const typeLabel = lead.type === "question" ? "Question" : "Demande de devis";
    const site = SITES[lead.entity] ?? "site DHB";
    const adminUrl = Deno.env.get("ADMIN_URL");
    const subject = `${typeLabel} — ${String(lead.nom || lead.email || "un visiteur").slice(0, 80)} (${site})`;
    const html = `
      <div style="font-family:Arial,sans-serif;color:#101828">
        <h2 style="margin:0 0 12px">${esc(typeLabel)} reçue sur ${esc(site)}</h2>
        <table style="border-collapse:collapse">
          <tr><td style="padding:3px 12px 3px 0"><b>Nom</b></td><td>${esc(lead.nom) || "—"}</td></tr>
          <tr><td style="padding:3px 12px 3px 0"><b>Entreprise</b></td><td>${esc(lead.entreprise) || "—"}</td></tr>
          <tr><td style="padding:3px 12px 3px 0"><b>Email</b></td><td>${esc(lead.email) || "—"}</td></tr>
          <tr><td style="padding:3px 12px 3px 0"><b>Téléphone</b></td><td>${esc(lead.telephone) || "—"}</td></tr>
          <tr><td style="padding:3px 12px 3px 0"><b>Service</b></td><td>${esc(lead.service) || "—"}</td></tr>
          <tr><td style="padding:3px 12px 3px 0"><b>Page</b></td><td>${esc(lead.source_url) || "—"}</td></tr>
        </table>
        <p style="margin-top:14px"><b>Message :</b><br>${esc(lead.message || "—").replace(/\n/g, "<br>")}</p>
        ${adminUrl ? `<p><a href="${esc(adminUrl)}/leads/${esc(lead.id)}">Ouvrir la demande dans le back-office</a></p>` : ""}
      </div>`;

    const err = await envoyerEmail(to, subject, html);
    if (err) {
      console.error("Envoi email :", err);
      return new Response("Erreur d'envoi", { status: 500 });
    }
    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response("Erreur", { status: 500 });
  }
});
