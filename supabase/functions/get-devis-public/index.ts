// =====================================================================
//  DHB — Edge Function : lire un devis via son lien public (signature client).
//  Le client ouvre devis.html?token=... ; cette fonction renvoie les
//  données nécessaires à l'affichage, SANS exposer toute la table.
//
//  Utilise le service role (jamais exposé au navigateur).
//  Appel (GET)  : ?token=<uuid>
//  Appel (POST) : { token }
// =====================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = new URL(req.url);
    let token = url.searchParams.get("token");
    if (!token && req.method === "POST") token = (await req.json())?.token;
    if (!token) return json({ error: "token_manquant" }, 200);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data, error } = await sb
      .from("devis")
      .select(
        "numero, entity, client_nom, client_adresse, date_devis, validite_jours, lignes, tva_taux, total_ht, total_ttc, statut, signed_at, signature_nom",
      )
      .eq("public_token", token)
      .maybeSingle();

    if (error) return json({ error: error.message }, 200);
    if (!data) return json({ error: "introuvable" }, 200);
    return json({ ok: true, devis: data }, 200);
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
