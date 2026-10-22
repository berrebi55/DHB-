// =====================================================================
//  DHB — Edge Function : facturation récurrente.
//  Pour chaque abonnement ACTIF dont la facture du mois n'existe pas encore
//  (et dont le jour de facturation est atteint), crée une facture BROUILLON,
//  rattachée à l'abonnement et au client, avec l'échéance par défaut définie
//  dans Paramètres → Société.
//
//  Sécurité : utilisateur connecté OU planification avec l'en-tête
//  x-cron-secret = secret CRON_SECRET. La clé publique ne suffit plus.
//
//  Appel (POST) : {}                       → tous les abonnements dus
//                 { "abonnement_id": "…" } → un seul abonnement (bouton dédié)
//  Déploiement : supabase functions deploy generate-recurring-invoices --no-verify-jwt
// =====================================================================
import { adminClient, cors, erreur, json, requireCronOrUser } from "../_shared/securite.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const sb = adminClient();
    await requireCronOrUser(req, sb);
    const body = await req.json().catch(() => ({}));
    const seul: string | undefined = body?.abonnement_id;

    const today = new Date();
    const ymd = today.toISOString().slice(0, 10);
    const ym = ymd.slice(0, 7);
    const jour = today.getUTCDate();

    const { data: ent } = await sb.from("entreprise").select("delai_paiement_jours").eq("id", 1).maybeSingle();
    const delai = Number(ent?.delai_paiement_jours ?? 30);
    const echeance = new Date(today.getTime() + delai * 86400000).toISOString().slice(0, 10);

    let q = sb.from("abonnements").select("*").eq("statut", "actif");
    if (seul) q = q.eq("id", seul);
    const { data: abos, error } = await q;
    if (error) return json({ error: error.message }, 500);

    const crees: string[] = [];
    const ignores: { id: string; raison: string }[] = [];
    for (const a of abos ?? []) {
      const dejaCeMois = a.derniere_facture_le && String(a.derniere_facture_le).slice(0, 7) >= ym;
      if (dejaCeMois) { ignores.push({ id: a.id, raison: "deja_facture_ce_mois" }); continue; }
      // Le bouton « Générer maintenant » d'un abonnement précis ignore le jour de facturation.
      if (!seul && jour < (a.jour_facturation ?? 1)) { ignores.push({ id: a.id, raison: "jour_non_atteint" }); continue; }

      let email: string | null = null, adresse: string | null = null;
      if (a.client_id) {
        const { data: c } = await sb.from("clients").select("email, adresse, code_postal, ville").eq("id", a.client_id).maybeSingle();
        email = c?.email ?? null;
        adresse = [c?.adresse, [c?.code_postal, c?.ville].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null;
      }

      const montant = Number(a.montant_mensuel) || 0;
      const libelle = `${a.libelle ?? "Abonnement"} — ${ym}`;
      const { data: numero, error: e1 } = await sb.rpc("next_facture_numero");
      if (e1) { ignores.push({ id: a.id, raison: "numerotation" }); continue; }
      const { error: e2 } = await sb.from("factures").insert({
        entity: a.entity,
        numero,
        date_facture: ymd,
        date_echeance: echeance,
        client_id: a.client_id,
        client_nom: a.client_nom,
        client_email: email,
        client_adresse: adresse,
        abonnement_id: a.id,
        libelle,
        quantite: 1,
        prix_unitaire: montant,
        lignes: [{ libelle, qte: 1, pu: montant }],
        tva_taux: 0,
        total_ht: montant,
        total_ttc: montant,
        status: "brouillon",
      });
      if (e2) { ignores.push({ id: a.id, raison: e2.message }); continue; }
      await sb.from("abonnements").update({ derniere_facture_le: ymd }).eq("id", a.id);
      crees.push(numero as string);
    }

    return json({ ok: true, generees: crees.length, numeros: crees, ignores });
  } catch (e) {
    return erreur(e);
  }
});
