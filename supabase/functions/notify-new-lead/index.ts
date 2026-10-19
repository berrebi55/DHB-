// =====================================================================
//  DHB — Fonction Edge : notification email à chaque nouvelle demande.
//  Déclenchée par un "Database Webhook" Supabase sur INSERT de public.leads.
//
//  ⚠️ La clé secrète n'est JAMAIS dans ce fichier : elle est lue depuis
//     les variables d'environnement de Supabase (voir README).
//
//  Variables d'environnement à définir dans Supabase
//  (Edge Functions → notify-new-lead → Settings → Secrets) :
//    RESEND_API_KEY   = clé API Resend (service d'envoi d'emails, offre gratuite)
//    NOTIFY_TO        = adresse qui reçoit les alertes (ex. contact@dhb-...)
//    NOTIFY_FROM      = expéditeur vérifié chez Resend (ex. site@votre-domaine.fr)
//
//  Déploiement : supabase functions deploy notify-new-lead
//  Puis créer un Database Webhook (Database → Webhooks) :
//    Table public.leads · Event INSERT · Type "Supabase Edge Functions"
//    · Function notify-new-lead.
// =====================================================================

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const lead = payload.record ?? payload; // webhook met la ligne dans "record"

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const NOTIFY_TO = Deno.env.get("NOTIFY_TO");
    const NOTIFY_FROM = Deno.env.get("NOTIFY_FROM") ?? "onboarding@resend.dev";

    if (!RESEND_API_KEY || !NOTIFY_TO) {
      return new Response("Configuration email manquante", { status: 200 });
    }

    const typeLabel = lead.type === "question" ? "Question" : "Demande de devis";
    const subject = `🔔 DHB — ${typeLabel} de ${lead.nom || lead.email || "un visiteur"}`;
    const html = `
      <h2>Nouvelle ${typeLabel.toLowerCase()}</h2>
      <ul>
        <li><b>Nom :</b> ${lead.nom || "—"}</li>
        <li><b>Entreprise :</b> ${lead.entreprise || "—"}</li>
        <li><b>Email :</b> ${lead.email || "—"}</li>
        <li><b>Téléphone :</b> ${lead.telephone || "—"}</li>
        <li><b>Service :</b> ${lead.service || "—"}</li>
        <li><b>Page :</b> ${lead.source_url || "—"}</li>
      </ul>
      <p><b>Message :</b><br>${(lead.message || "—").replace(/\n/g, "<br>")}</p>
      <hr>
      <p>Connectez-vous à l'espace admin pour traiter cette demande.</p>`;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: NOTIFY_FROM, to: [NOTIFY_TO], subject, html }),
    });

    if (!r.ok) {
      const t = await r.text();
      console.error("Resend error:", t);
      return new Response("Email non envoyé: " + t, { status: 200 });
    }
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response("Erreur: " + (e as Error).message, { status: 200 });
  }
});
