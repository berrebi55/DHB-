// =====================================================================
//  DHB — Edge Function : signature/acceptation d'un devis par le client.
//  Le client clique « Accepter le devis » sur devis.html?token=...
//
//  Enregistre : signed_at, signature_nom, signature_ip, statut='accepte'.
//  Idempotent : un devis déjà signé n'est pas re-signé.
//  Appel (POST) : { token, signature_nom }
// =====================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { token, signature_nom } = await req.json();
    if (!token) return json({ error: "token_manquant" }, 200);
    if (!signature_nom || !String(signature_nom).trim())
      return json({ error: "nom_manquant" }, 200);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: devis } = await sb
      .from("devis")
      .select("id, signed_at, statut, date_devis, validite_jours")
      .eq("public_token", token)
      .maybeSingle();
    if (!devis) return json({ error: "introuvable" }, 200);
    if (devis.signed_at) return json({ ok: true, deja_signe: true }, 200);
    if (["refuse", "expire"].includes(devis.statut)) return json({ error: "devis_clos" }, 200);
    const fin = new Date(devis.date_devis);
    fin.setDate(fin.getDate() + Number(devis.validite_jours ?? 30));
    if (fin.getTime() < Date.now() - 86400000) return json({ error: "devis_expire" }, 200);

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const { error } = await sb
      .from("devis")
      .update({
        signed_at: new Date().toISOString(),
        signature_nom: String(signature_nom).trim(),
        signature_ip: ip,
        statut: "accepte",
      })
      .eq("id", devis.id);
    if (error) return json({ error: error.message }, 200);
    return json({ ok: true }, 200);
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
