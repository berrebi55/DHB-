// =====================================================================
//  DHB — Edge Function : relances automatiques par email.
//   - Devis « envoyé » depuis > DELAI_DEVIS jours, non signé → relance.
//   - Facture « envoyée » (impayée) depuis > DELAI_FACTURE jours → relance.
//  Anti-spam : au plus 1 relance tous les 7 jours (derniere_relance_le).
//
//  Déclenchement : cron quotidien, ou bouton manuel dans l'admin.
//  Secrets : RESEND_API_KEY, NOTIFY_FROM (sinon simulation sans envoi).
// =====================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DELAI_DEVIS = 7; // jours
const DELAI_FACTURE = 15; // jours

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const KEY = Deno.env.get("RESEND_API_KEY");
    const FROM = Deno.env.get("NOTIFY_FROM") ?? "onboarding@resend.dev";

    const now = new Date();
    const ymd = now.toISOString().slice(0, 10);
    const daysAgo = (n: number) =>
      new Date(now.getTime() - n * 86400000).toISOString();
    const weekAgo = daysAgo(7).slice(0, 10);

    let relancesDevis = 0;
    let relancesFactures = 0;

    // --- Devis envoyés, non signés, anciens ---
    const { data: devis } = await sb
      .from("devis")
      .select("id, numero, client_nom, client_email, created_at, signed_at, derniere_relance_le")
      .eq("statut", "envoye")
      .is("signed_at", null)
      .lt("created_at", daysAgo(DELAI_DEVIS));
    for (const d of devis ?? []) {
      if (!d.client_email) continue;
      if (d.derniere_relance_le && String(d.derniere_relance_le) > weekAgo) continue;
      await sendMail(KEY, FROM, d.client_email, `Votre devis ${d.numero} — DHB`, `
        <p>Bonjour ${d.client_nom ?? ""},</p>
        <p>Nous revenons vers vous concernant le devis <b>${d.numero}</b> que nous vous avons transmis.</p>
        <p>Il reste valable et nous restons disponibles pour toute question ou ajustement.</p>
        <p>Cordialement,<br>DHB</p>`);
      await sb.from("devis").update({ derniere_relance_le: ymd }).eq("id", d.id);
      relancesDevis++;
    }

    // --- Factures envoyées, impayées, anciennes ---
    const { data: factures } = await sb
      .from("factures")
      .select("id, numero, client_nom, client_email, date_facture, derniere_relance_le")
      .eq("status", "envoyee")
      .lt("date_facture", daysAgo(DELAI_FACTURE).slice(0, 10));
    for (const f of factures ?? []) {
      if (!f.client_email) continue;
      if (f.derniere_relance_le && String(f.derniere_relance_le) > weekAgo) continue;
      await sendMail(KEY, FROM, f.client_email, `Rappel — facture ${f.numero} — DHB`, `
        <p>Bonjour ${f.client_nom ?? ""},</p>
        <p>Sauf erreur de notre part, la facture <b>${f.numero}</b> reste en attente de règlement.</p>
        <p>Si le paiement a déjà été effectué, merci de ne pas tenir compte de ce message.</p>
        <p>Cordialement,<br>DHB</p>`);
      await sb.from("factures").update({ derniere_relance_le: ymd }).eq("id", f.id);
      relancesFactures++;
    }

    return json(
      { ok: true, relancesDevis, relancesFactures, email_actif: !!KEY },
      200,
    );
  } catch (e) {
    return json({ error: (e as Error).message }, 200);
  }
});

async function sendMail(
  key: string | undefined,
  from: string,
  to: string,
  subject: string,
  html: string,
) {
  if (!key) return; // pas de clé Resend : on throttle quand même sans envoyer
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
}

function json(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
