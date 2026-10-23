// Tests navigateur du lot 12 : Search Console (Intégrations) et Pilotage → SEO.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { brancher, CLE_SESSION, session, HOTE } from "./faux-supabase.mjs";

const DIST = process.argv[2];
const AXE = fs.readFileSync(path.resolve("node_modules/axe-core/axe.min.js"), "utf8");
const res = []; const ok = (n, c, d) => res.push({ n, ok: !!c, d });
const nav = await chromium.launch({ channel: "chrome" });
const erreurs = []; const appels = [];
const j = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const JOURS = [
  { site: "sc-domain:dhb-groupe.fr", jour: j(5), clics: 10, impressions: 200, position: 8 },
  { site: "sc-domain:dhb-groupe.fr", jour: j(4), clics: 20, impressions: 300, position: 6 },
  { site: "https://pro.dhb-groupe.fr/", jour: j(4), clics: 3, impressions: 50, position: 12 },
];
const REQ = [{ site: "sc-domain:dhb-groupe.fr", requete: "dépannage informatique saint-denis", clics: 12, impressions: 140, position: 4.2, periode_fin: j(2) }];
const PAGES = [{ site: "sc-domain:dhb-groupe.fr", page: "https://dhb-groupe.fr/contact/", clics: 9, impressions: 80, position: 5.5, periode_fin: j(2) }];

async function ouvrir(vue, chemin, { vide = false, erreurPatch = null } = {}) {
  const ctx = await nav.newContext(vue === "mobile" ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 900 } });
  await brancher(ctx);
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "access-control-expose-headers": "content-range" };
  const json = (r, b) => r.fulfill({ status: 200, headers: { ...cors, "content-range": `0-${Math.max(b.length - 1, 0)}/${b.length}` }, contentType: "application/json", body: JSON.stringify(b) });
  await ctx.route(`${HOTE}/rest/v1/integrations**`, (r) => {
    if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: cors });
    if (r.request().method() === "PATCH") {
      appels.push({ f: "patch", url: r.request().url(), corps: JSON.parse(r.request().postData() || "{}") });
      return erreurPatch ? r.fulfill({ status: 400, headers: cors, contentType: "application/json", body: JSON.stringify({ code: "22023", message: erreurPatch }) }) : r.fulfill({ status: 204, headers: cors });
    }
    return json(r, [
      { cle: "google", statut: "connecte", compte: "proprio@gmail.com", details: {}, derniere_synchro: null, erreur: null },
      { cle: "search_console", statut: "connecte", compte: null, details: { sites: ["sc-domain:dhb-groupe.fr"] }, derniere_synchro: new Date().toISOString(), erreur: null },
    ]);
  });
  for (const t of ["integration_logs", "stripe_evenements", "emails", "analytics_quotidien"]) await ctx.route(`${HOTE}/rest/v1/${t}**`, (r) => json(r, []));
  await ctx.route(`${HOTE}/rest/v1/seo_quotidien**`, (r) => json(r, vide ? [] : JOURS));
  await ctx.route(`${HOTE}/rest/v1/seo_requetes**`, (r) => json(r, vide ? [] : REQ));
  await ctx.route(`${HOTE}/rest/v1/seo_pages**`, (r) => json(r, vide ? [] : PAGES));
  await ctx.route(`${HOTE}/functions/v1/**`, (r) => {
    if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: cors });
    const nom = new URL(r.request().url()).pathname.split("/").pop(); appels.push({ f: nom });
    const rep = nom === "seo-sync" ? { ok: true, sites: [{ site: "sc-domain:dhb-groupe.fr", jours: 28 }] } : { secrets: { google: true } };
    return r.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify(rep) });
  });
  await ctx.route("http://admin.test/**", (r) => {
    let f = path.join(DIST, new URL(r.request().url()).pathname);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, "index.html");
    const ext = path.extname(f);
    return r.fulfill({ body: fs.readFileSync(f), contentType: ext === ".js" ? "application/javascript" : ext === ".css" ? "text/css" : "text/html" });
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erreurs.push(`${chemin}: ${e.message}`));
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [CLE_SESSION, JSON.stringify(session())]);
  await page.goto("http://admin.test" + chemin, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  return { ctx, page };
}
const axe = (page) => page.evaluate(async (src) => {
  if (!window.axe) { const s = document.createElement("script"); s.textContent = src; document.head.appendChild(s); }
  const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] } });
  return r.violations.filter((v) => !["aria-required-children", "empty-table-header"].includes(v.id)).map((v) => `${v.id}(${v.nodes.length}): ${v.nodes[0]?.target}`);
}, AXE);
const debord = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

for (const vue of ["desktop", "mobile"]) {
  {
    const { ctx, page } = await ouvrir(vue, "/pilotage/seo");
    const t = await page.locator("body").innerText();
    // dhb-groupe.fr : 30 clics / 500 impressions = 6,0 % ; position pondérée (8×200 + 6×300) / 500 = 6,8
    ok(`[${vue}] SEO : clics 30, impressions 500, taux 6,0 %, position 6,8 (pondérée)`, /\b30\b/.test(t) && /\b500\b/.test(t) && /6,0 %/.test(t) && /6,8/.test(t), t.slice(0, 400));
    ok(`[${vue}] SEO : requêtes (accents) et pages`, /dépannage informatique saint-denis/.test(t) && /\/contact\//.test(t));
    ok(`[${vue}] SEO : choix du site quand il y en a plusieurs`, (await page.getByRole("combobox", { name: "Site" }).count()) === 1);
    const v = await axe(page); ok(`[${vue}] SEO : axe-core sans défaut`, v.length === 0, v);
    ok(`[${vue}] SEO : pas de débordement`, !(await debord(page)));
    if (vue === "desktop") {
      await page.locator(".page-header .ant-select").click(); await page.locator(".ant-select-item-option", { hasText: "pro.dhb-groupe.fr" }).click(); await page.waitForTimeout(300);
      const t2 = await page.locator(".kpi-grid").innerText();
      ok("SEO : changer de site met à jour les chiffres (3 clics, position 12,0)", /\b3\b/.test(t2) && /12,0/.test(t2), t2);
    }
    await ctx.close();
  }
  {
    const { ctx, page } = await ouvrir(vue, "/pilotage/seo", { vide: true });
    const t = await page.locator("body").innerText();
    ok(`[${vue}] SEO sans données : explication, lien Intégrations, aucun chiffre`, /Pas encore de chiffres Search Console/.test(t) && /Système → Intégrations/.test(t) && !/Position moyenne/.test(t));
    await ctx.close();
  }
  {
    const { ctx, page } = await ouvrir(vue, "/systeme/integrations");
    const carte = page.locator("section.panel", { has: page.locator("h2", { hasText: "Google Search Console" }) });
    ok(`[${vue}] Carte Search Console : propriété affichée`, (await carte.getByLabel("Propriétés vérifiées (une par ligne)").inputValue()) === "sc-domain:dhb-groupe.fr");
    const v = await axe(page); ok(`[${vue}] Intégrations : axe-core sans défaut`, v.length === 0, v);
    if (vue === "desktop") {
      appels.length = 0;
      await carte.getByLabel("Propriétés vérifiées (une par ligne)").fill("sc-domain:dhb-groupe.fr\nhttps://pro.dhb-groupe.fr/\n");
      await carte.getByRole("button", { name: "Enregistrer" }).click(); await page.waitForTimeout(600);
      const p = appels.find((a) => a.f === "patch");
      ok("Search Console : 2 propriétés enregistrées (lignes vides ignorées)", p && /cle=eq\.search_console/.test(p.url) && JSON.stringify(p.corps.details.sites) === JSON.stringify(["sc-domain:dhb-groupe.fr", "https://pro.dhb-groupe.fr/"]), p);
      await carte.getByRole("button", { name: "Copier maintenant" }).click(); await page.waitForTimeout(600);
      ok("Search Console : copie à la demande", appels.some((a) => a.f === "seo-sync") && /Chiffres copiés pour 1 propriété/.test(await page.locator(".ant-message").innerText()));
    }
    await ctx.close();
  }
  if (vue === "desktop") {
    const { ctx, page } = await ouvrir(vue, "/systeme/integrations", { erreurPatch: "Propriété Search Console invalide : « dhb-groupe.fr » (ex. sc-domain:exemple.fr ou https://www.exemple.fr/)." });
    const carte = page.locator("section.panel", { has: page.locator("h2", { hasText: "Google Search Console" }) });
    await carte.getByLabel("Propriétés vérifiées (une par ligne)").fill("dhb-groupe.fr");
    await carte.getByRole("button", { name: "Enregistrer" }).click(); await page.waitForTimeout(600);
    ok("Propriété refusée par la base : message de la base affiché tel quel", /Propriété Search Console invalide : « dhb-groupe\.fr »/.test(await page.locator(".ant-message").innerText()));
    await ctx.close();
  }
}
await nav.close();
ok("Aucune erreur JavaScript", erreurs.length === 0, erreurs);
for (const x of res) console.log(x.ok ? "OK   " : "ÉCHEC", x.n, x.ok ? "" : JSON.stringify(x.d)?.slice(0, 300));
console.log(`${res.filter((x) => x.ok).length} / ${res.length} tests back-office conformes`);
