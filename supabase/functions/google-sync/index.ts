// =====================================================================
//  DHB — Edge Function : copie quotidienne des chiffres Google Analytics 4
//  (sessions, utilisateurs, événements clés par jour et par canal, 30 derniers
//  jours) dans public.analytics_quotidien → Pilotage → Acquisition.
//
//  Sécurité : planification (x-cron-secret) ou membre de l'équipe connecté.
//  Prérequis : compte Google connecté (Système → Intégrations) et identifiant
//  de propriété GA4 renseigné au même endroit.
//  Déploiement : supabase functions deploy google-sync --no-verify-jwt
// =====================================================================
import { adminClient, cors, erreur, HttpError, json, requireCronOrUser } from "../_shared/securite.ts";
import { jetonAcces, journal, rapportGa4 } from "../_shared/google.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const sb = adminClient();
  try {
    await requireCronOrUser(req, sb);
    const { data: ga4 } = await sb.from("integrations").select("details").eq("cle", "ga4").maybeSingle();
    const propriete = (ga4?.details as Record<string, string> | null)?.ga4_property_id;
    if (!propriete) throw new HttpError(409, "ga4_propriete_manquante");
    try {
      const lignes = await rapportGa4(await jetonAcces(sb), propriete);
      if (lignes.length) {
        const { error } = await sb.from("analytics_quotidien").upsert(lignes.map((l) => ({ ...l, copie_le: new Date().toISOString() })), { onConflict: "jour,canal" });
        if (error) throw new HttpError(500, "enregistrement_impossible");
      }
      await sb.from("integrations").update({ statut: "connecte", derniere_synchro: new Date().toISOString(), erreur: null }).eq("cle", "ga4");
      await journal(sb, "ga4", "synchro", "ok", `${lignes.length} ligne(s) copiée(s) depuis Google Analytics.`);
      return json({ ok: true, lignes: lignes.length });
    } catch (e) {
      const code = e instanceof HttpError ? e.code : "erreur_inconnue";
      const message = code === "google_non_connecte" ? "Compte Google non connecté."
        : code === "google_acces_expire" ? "Accès Google expiré : reconnectez le compte Google."
        : code.startsWith("ga4_") ? `Google Analytics refuse la demande (${code.slice(4)}) : vérifiez l'identifiant de propriété et l'accès du compte connecté.`
        : `Copie impossible (${code}).`;
      await sb.from("integrations").update({ statut: "erreur", erreur: message }).eq("cle", "ga4");
      await journal(sb, "ga4", "synchro", "erreur", message);
      throw e;
    }
  } catch (e) {
    return erreur(e);
  }
});
