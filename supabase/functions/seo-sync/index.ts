// =====================================================================
//  DHB — Edge Function : copie des chiffres Google Search Console
//  (clics, impressions, position) → Pilotage → SEO.
//
//  Pour chaque propriété déclarée dans Système → Intégrations :
//   - chiffres par jour sur 30 jours (Google les publie avec 2 à 3 jours de retard) ;
//   - 100 premières requêtes et 100 premières pages sur les 28 derniers jours.
//  Sécurité : planification (x-cron-secret) ou membre de l'équipe connecté.
//  Prérequis : compte Google connecté avec l'autorisation Search Console.
//  Déploiement : supabase functions deploy seo-sync --no-verify-jwt
// =====================================================================
import { adminClient, cors, erreur, HttpError, json, requireCronOrUser } from "../_shared/securite.ts";
import { jetonAcces, journal } from "../_shared/google.ts";

const URL_API = () => Deno.env.get("SC_API_URL") || "https://www.googleapis.com";
const jourMoins = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
interface Ligne { keys: string[]; clicks: number; impressions: number; position: number }

async function requete(jeton: string, site: string, corps: Record<string, unknown>): Promise<Ligne[]> {
  let r: Response;
  try {
    r = await fetch(`${URL_API()}/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, {
      method: "POST", headers: { Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" }, body: JSON.stringify(corps),
    });
  } catch { throw new HttpError(502, "search_console_injoignable"); }
  const d = await r.json().catch(() => ({})) as { rows?: Ligne[]; error?: { status?: string } };
  if (r.status === 403) throw new HttpError(403, "search_console_acces_refuse");
  if (r.status === 404) throw new HttpError(404, "search_console_propriete_inconnue");
  if (!r.ok) throw new HttpError(502, `search_console_${(d.error?.status ?? "erreur").toLowerCase()}`);
  return d.rows ?? [];
}
const arrondi = (x: number) => Math.round((Number(x) || 0) * 100) / 100;

const MESSAGES: Record<string, string> = {
  search_console_acces_refuse: "le compte Google connecté n'a pas accès à cette propriété (ou l'autorisation Search Console n'a pas été donnée).",
  search_console_propriete_inconnue: "propriété inconnue de Search Console : vérifiez l'adresse exacte (sc-domain:… ou https://…/).",
  search_console_injoignable: "Search Console injoignable.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const sb = adminClient();
  try {
    await requireCronOrUser(req, sb);
    const { data: integ } = await sb.from("integrations").select("details").eq("cle", "search_console").maybeSingle();
    const sites = ((integ?.details ?? {}) as { sites?: string[] }).sites ?? [];
    if (!sites.length) throw new HttpError(409, "search_console_aucune_propriete");
    const jeton = await jetonAcces(sb);
    const fin = jourMoins(2), debut30 = jourMoins(31), debut28 = jourMoins(29);
    const bilan: { site: string; jours?: number; requetes?: number; pages?: number; erreur?: string }[] = [];

    for (const site of sites) {
      try {
        const jours = await requete(jeton, site, { startDate: debut30, endDate: fin, dimensions: ["date"], rowLimit: 1000 });
        if (jours.length) {
          await sb.from("seo_quotidien").upsert(jours.map((l) => ({ site, jour: l.keys[0], clics: Math.round(l.clicks), impressions: Math.round(l.impressions), position: arrondi(l.position), copie_le: new Date().toISOString() })), { onConflict: "site,jour" });
        }
        const requetes = await requete(jeton, site, { startDate: debut28, endDate: fin, dimensions: ["query"], rowLimit: 100 });
        const pages = await requete(jeton, site, { startDate: debut28, endDate: fin, dimensions: ["page"], rowLimit: 100 });
        // Les « tops » sont remplacés par ceux de la dernière période.
        await sb.from("seo_requetes").delete().eq("site", site);
        if (requetes.length) await sb.from("seo_requetes").insert(requetes.map((l) => ({ site, requete: l.keys[0].slice(0, 300), clics: Math.round(l.clicks), impressions: Math.round(l.impressions), position: arrondi(l.position), periode_fin: fin })));
        await sb.from("seo_pages").delete().eq("site", site);
        if (pages.length) await sb.from("seo_pages").insert(pages.map((l) => ({ site, page: l.keys[0].slice(0, 500), clics: Math.round(l.clicks), impressions: Math.round(l.impressions), position: arrondi(l.position), periode_fin: fin })));
        bilan.push({ site, jours: jours.length, requetes: requetes.length, pages: pages.length });
      } catch (e) {
        const code = e instanceof HttpError ? e.code : "erreur_inconnue";
        bilan.push({ site, erreur: code });
        await journal(sb, "search_console", "synchro", "erreur", `${site} : ${MESSAGES[code] ?? code}`);
      }
    }
    const erreurs = bilan.filter((b) => b.erreur);
    await sb.from("integrations").update({
      statut: erreurs.length === sites.length ? "erreur" : "connecte",
      erreur: erreurs.length ? erreurs.map((b) => `${b.site} : ${MESSAGES[b.erreur!] ?? b.erreur}`).join(" · ").slice(0, 500) : null,
      derniere_synchro: erreurs.length === sites.length ? undefined : new Date().toISOString(),
    }).eq("cle", "search_console");
    if (erreurs.length < sites.length) {
      await journal(sb, "search_console", "synchro", "ok", bilan.filter((b) => !b.erreur).map((b) => `${b.site} : ${b.jours} jour(s), ${b.requetes} requête(s), ${b.pages} page(s)`).join(" · "));
    }
    return json({ ok: erreurs.length < sites.length, sites: bilan }, erreurs.length === sites.length ? 502 : 200);
  } catch (e) {
    return erreur(e);
  }
});
