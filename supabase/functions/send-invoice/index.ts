// =====================================================================
//  DHB — Fonction Edge : envoyer une facture par email (« voici votre facture »).
//  Scaffolding : s'active avec une clé Resend. Pour les factures LÉGALES et
//  l'e-invoicing 2026, privilégiez une application de facturation agréée.
//
//  Secrets (Edge Functions → send-invoice → Secrets) :
//    RESEND_API_KEY = clé Resend
//    NOTIFY_FROM    = expéditeur vérifié (ex. factures@votre-domaine.fr)
//
//  Déploiement : supabase functions deploy send-invoice
//  Appel (POST) : { to, nom, numero, total, date, libelle, entity }
// =====================================================================

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const KEY = Deno.env.get("RESEND_API_KEY");
    const FROM = Deno.env.get("NOTIFY_FROM") ?? "onboarding@resend.dev";
    if (!KEY) return json({ error: "resend_not_configured" }, 200);

    const { to, nom, numero, total, date, libelle, entity } = await req.json();
    if (!to) return json({ error: "email_manquant" }, 200);

    const marque = entity === "particuliers" ? "DHB Particuliers" : "DHB";
    const subject = `Votre facture ${numero ?? ""} — ${marque}`;
    const html = `
      <p>Bonjour ${nom ?? ""},</p>
      <p>Veuillez trouver ci-dessous le récapitulatif de votre facture.</p>
      <table style="border-collapse:collapse;margin:14px 0">
        <tr><td style="padding:4px 10px"><b>N° de facture</b></td><td style="padding:4px 10px">${numero ?? "—"}</td></tr>
        <tr><td style="padding:4px 10px"><b>Date</b></td><td style="padding:4px 10px">${date ?? "—"}</td></tr>
        <tr><td style="padding:4px 10px"><b>Prestation</b></td><td style="padding:4px 10px">${libelle ?? "—"}</td></tr>
        <tr><td style="padding:4px 10px"><b>Montant</b></td><td style="padding:4px 10px"><b>${total ?? "—"}</b></td></tr>
      </table>
      <p>Nous restons à votre disposition pour toute question.</p>
      <p>Cordialement,<br>${marque}</p>
      <hr><p style="color:#64748b;font-size:12px">Ce message a été envoyé automatiquement. TVA non applicable, art. 293 B du CGI (le cas échéant).</p>`;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
    const data = await r.json();
    if (!r.ok) return json({ error: data?.message ?? "resend_error" }, 200);
    return json({ ok: true }, 200);
  } catch (e) {
    return json({ error: (e as Error).message }, 200);
  }
});

function json(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
