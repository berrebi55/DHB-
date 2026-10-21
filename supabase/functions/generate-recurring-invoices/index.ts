// =====================================================================
//  DHB — Edge Function : facturation récurrente automatique.
//  Pour chaque abonnement ACTIF dont la facture du mois n'a pas encore
//  été générée (et dont le jour de facturation est atteint), crée une
//  facture en brouillon et met à jour `derniere_facture_le`.
//
//  Déclenchement :
//    - manuel : bouton « Générer maintenant » dans l'admin (POST) ;
//    - automatique : pg_cron / Scheduled Function (1×/jour).
//
//  Secrets requis : aucun (utilise le service role fourni par Supabase).
//  Les factures restent en BROUILLON : tu les vérifies avant envoi.
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
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const today = new Date();
    const ymd = today.toISOString().slice(0, 10);
    const ym = ymd.slice(0, 7);
    const jour = today.getUTCDate();

    const { data: abos, error } = await sb
      .from("abonnements")
      .select("*")
      .eq("statut", "actif");
    if (error) return json({ error: error.message }, 200);

    const created: string[] = [];
    for (const a of abos ?? []) {
      const jourFact = a.jour_facturation ?? 1;
      const dejaCeMois =
        a.derniere_facture_le && String(a.derniere_facture_le).slice(0, 7) >= ym;
      if (dejaCeMois) continue; // déjà facturé ce mois-ci
      if (jour < jourFact) continue; // pas encore le jour de facturation

      const montant = Number(a.montant_mensuel) || 0;
      const { data: numero, error: e1 } = await sb.rpc("next_facture_numero");
      if (e1) continue;
      const { error: e2 } = await sb.from("factures").insert({
        entity: a.entity,
        numero,
        date_facture: ymd,
        client_id: a.client_id,
        client_nom: a.client_nom,
        libelle: `${a.libelle ?? "Abonnement"} — ${ym}`,
        quantite: 1,
        prix_unitaire: montant,
        tva_taux: 0,
        total_ht: montant,
        total_ttc: montant,
        status: "brouillon",
      });
      if (e2) continue;
      await sb
        .from("abonnements")
        .update({ derniere_facture_le: ymd })
        .eq("id", a.id);
      created.push(numero as string);
    }

    return json({ ok: true, generees: created.length, numeros: created }, 200);
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
