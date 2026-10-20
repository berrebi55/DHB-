// =====================================================================
//  DHB — Fonction Edge : créer une session de paiement Stripe.
//  Scaffolding prêt à l'emploi : s'active en renseignant les secrets.
//
//  Secrets à définir dans Supabase (Edge Functions → create-checkout → Secrets) :
//    STRIPE_SECRET_KEY     = sk_live_... (ou sk_test_...)
//    STRIPE_PRICE_ABO      = price_...   (prix d'abonnement récurrent, créé dans Stripe)
//    STRIPE_PRICE_INT      = price_...   (prix de l'intervention, ponctuel) — optionnel
//    SITE_URL              = https://www.dhb-assistance.fr (retours succès/annulation)
//
//  Déploiement : supabase functions deploy create-checkout
//  Appel (POST) : { "plan": "abonnement" | "intervention" }
//  Réponse : { "url": "https://checkout.stripe.com/..." }
//
//  ⚠️ Tant que les secrets ne sont pas renseignés, la fonction renvoie une
//  erreur « non configuré » et le site retombe sur le formulaire de contact.
// =====================================================================

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const SITE = Deno.env.get("SITE_URL") ?? "";
    if (!KEY) {
      return json({ error: "stripe_not_configured" }, 200);
    }
    const { plan } = await req.json().catch(() => ({ plan: "abonnement" }));
    const isSub = plan !== "intervention";
    const price = isSub ? Deno.env.get("STRIPE_PRICE_ABO") : Deno.env.get("STRIPE_PRICE_INT");
    if (!price) return json({ error: "price_not_configured" }, 200);

    const form = new URLSearchParams();
    form.set("mode", isSub ? "subscription" : "payment");
    form.set("line_items[0][price]", price);
    form.set("line_items[0][quantity]", "1");
    form.set("success_url", `${SITE}/paiement-reussi/?session_id={CHECKOUT_SESSION_ID}`);
    form.set("cancel_url", `${SITE}/paiement-annule/`);
    form.set("allow_promotion_codes", "true");

    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    const data = await r.json();
    if (!r.ok) return json({ error: data?.error?.message ?? "stripe_error" }, 200);
    return json({ url: data.url }, 200);
  } catch (e) {
    return json({ error: (e as Error).message }, 200);
  }
});

function json(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
