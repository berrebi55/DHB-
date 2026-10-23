// =====================================================================
//  DHB — Edge Function : notification email à chaque nouvelle demande.
//  Déclenchée par un « Database Webhook » Supabase sur INSERT de public.leads.
//
//  Sécurité :
//   - le texte saisi par le visiteur est échappé avant d'être mis dans l'email ;
//   - WEBHOOK_SECRET est OBLIGATOIRE : l'appel doit porter l'en-tête
//     x-webhook-secret avec cette valeur (à ajouter dans le webhook Supabase).
//
//  Secrets : RESEND_API_KEY, NOTIFY_TO (destinataire des alertes), NOTIFY_FROM,
//            WEBHOOK_SECRET (obligatoire), ADMIN_URL (lien vers le back-office).
//  Déploiement : supabase functions deploy notify-new-lead --no-verify-jwt
//  Webhook : Database → Webhooks → table public.leads · INSERT ·
//            Supabase Edge Functions · notify-new-lead · en-tête x-webhook-secret.
// =====================================================================
import { adminClient, esc, secretValide } from "../_shared/securite.ts";
import { envoyerEtJournaliser } from "../_shared/email.ts";

const SITES: Record<string, string> = {
  infogerance: "DHB Pro",
  particuliers: "DHB Assistance",
  groupe: "DHB Groupe",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const repondre = (status: number, code: string) =>
  new Response(JSON.stringify({ error: status < 300 ? undefined : code, ok: status < 300 || undefined }), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return repondre(405, "methode_non_autorisee");

    // Secret OBLIGATOIRE : sans WEBHOOK_SECRET configuré, la fonction refuse tout
    // (aucun appel anonyme ne peut déclencher d'email).
    const secret = Deno.env.get("WEBHOOK_SECRET");
    if (!secret) return repondre(503, "webhook_non_configure");
    if (!secretValide(req.headers.get("x-webhook-secret"), secret)) return repondre(401, "non_autorise");

    const payload = await req.json().catch(() => null);
    const lead = payload && typeof payload === "object" ? (payload.record ?? payload) : null;
    // Données attendues : un webhook INSERT sur public.leads avec une demande valide.
    const okWebhook = !payload?.type || (payload.type === "INSERT" && payload.table === "leads");
    if (!lead || typeof lead !== "object" || !okWebhook || !UUID.test(String(lead.id ?? ""))
        || (!lead.email && !lead.telephone)) {
      return repondre(400, "donnees_invalides");
    }

    const to = Deno.env.get("NOTIFY_TO");
    if (!to) return repondre(200, "email_non_configure");

    const typeLabel = lead.type === "question" ? "Question" : lead.type === "guide" ? "Guide téléchargé" : "Demande de devis";
    const site = SITES[lead.entity] ?? "site DHB";
    const adminUrl = Deno.env.get("ADMIN_URL");
    const subject = `${typeLabel} — ${String(lead.nom || lead.email || "un visiteur").slice(0, 80)} (${site})`;
    const html = `
      <div style="font-family:Arial,sans-serif;color:#101828">
        <h2 style="margin:0 0 12px">${esc(typeLabel)} — ${esc(site)}</h2>
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

    const r = await envoyerEtJournaliser(adminClient(), {
      a: to, sujet: subject, html, origine: "alerte_demande", liens: { lead_id: lead.id },
    });
    if (!r.ok) {
      console.error("Envoi email :", r.code);
      return repondre(502, "envoi_impossible");
    }
    return repondre(200, "ok");
  } catch (e) {
    console.error(e);
    return repondre(500, "erreur_interne");
  }
});
