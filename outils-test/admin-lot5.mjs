// Tests navigateur du lot 5 : blocs du tableau de bord, valeurs attendues
// calculées à la main à partir du jeu de données du faux Supabase.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { brancher, CLE_SESSION, session, HOTE, donnees } from "./faux-supabase.mjs";

const DIST = process.argv[2];
const VIDE = process.argv[3] === "vide";
const AXE = fs.readFileSync(path.resolve("node_modules/axe-core/axe.min.js"), "utf8");
const res = [];
const ok = (nom, cond, detail) => res.push({ nom, ok: !!cond, detail });
const nav = await chromium.launch({ channel: "chrome" });
const erreurs = [];

// Jeu de données : celui du faux Supabase, complété (origine des demandes, statut des devis).
const SOURCES = ["publicite", "recherche", "telephone", null, null];
const STATUTS_DEVIS = ["brouillon", "envoye", "accepte", "refuse", "expire"];
function lignes(t) {
  if (t === "profiles") return donnees(t);   // le compte admin existe toujours
  if (VIDE) return [];
  return donnees(t).map((x, i) => t === "leads" ? { ...x, source: SOURCES[i] } : t === "devis" ? { ...x, statut: STATUTS_DEVIS[i] } : x);
}

async function ouvrir(vue) {
  const ctx = await nav.newContext(vue === "mobile" ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 900 } });
  await brancher(ctx, { vide: VIDE });
  await ctx.route(`${HOTE}/rest/v1/**`, (route) => {
    const req = route.request(); const u = new URL(req.url()); const t = u.pathname.split("/").pop();
    if (req.method() !== "GET" || !["leads", "devis", "profiles"].includes(t)) return route.fallback();
    let rows = lignes(t);
    const id = u.searchParams.get("id");
    if (id && id.startsWith("eq.")) rows = rows.filter((x) => x.id === id.slice(3));
    if ((req.headers()["accept"] || "").includes("vnd.pgrst.object"))
      return route.fulfill({ status: rows.length ? 200 : 406, headers: { "access-control-allow-origin": "*" }, contentType: "application/json", body: JSON.stringify(rows[0] ?? { code: "PGRST116" }) });
    return route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "access-control-expose-headers": "content-range", "content-range": `0-${Math.max(rows.length - 1, 0)}/${rows.length}` }, contentType: "application/json", body: JSON.stringify(rows) });
  });
  await ctx.route("http://admin.test/**", (r) => {
    let f = path.join(DIST, new URL(r.request().url()).pathname);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, "index.html");
    const ext = path.extname(f);
    return r.fulfill({ body: fs.readFileSync(f), contentType: ext === ".js" ? "application/javascript" : ext === ".css" ? "text/css" : "text/html" });
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erreurs.push(e.message));
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [CLE_SESSION, JSON.stringify(session())]);
  await page.goto("http://admin.test/", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  return { ctx, page };
}
const norm = (s) => s.replace(/[\s  ]+/g, " ").trim();
async function valeur(page, bloc, libelle) {
  const panneau = page.locator("section.panel", { has: page.locator(".panel-head h2", { hasText: new RegExp(`^${bloc}$`) }) });
  const ligne = panneau.locator(".bloc-ligne", { has: page.locator(".l", { hasText: libelle }) }).first();
  if (!(await ligne.count())) return null;
  return norm(await ligne.locator(".v").innerText());
}

// Valeurs attendues (aujourd'hui = date d'exécution ; données relatives à aujourd'hui).
const ATTENDU = VIDE ? {
  "Commercial|Demandes reçues": "0", "Commercial|Taux de transformation": "—", "Commercial|Devis acceptés": "—", "Commercial|Devis en attente": "0 €",
  "Clients|Clients actifs": "0", "Finance|À encaisser": "0 €", "Finance|Panier moyen": "—", "Finance|Délai moyen de paiement": "—",
} : {
  "Commercial|Demandes reçues": "4",              // 5 demandes dont 1 question, toutes < 30 jours
  "Commercial|Taux de transformation": "0 %",     // aucune demande commerciale gagnée
  "Commercial|Devis acceptés": "25 %",            // 1 accepté / 4 envoyés (envoyé, accepté, refusé, expiré)
  "Commercial|Devis en attente": "500 €",         // le devis « envoyé » : 450 + 50
  "Commercial|Devis à relancer": "0",
  "Clients|Clients actifs": "3", "Clients|Prospects": "1", "Clients|Clients inactifs": "1",
  "Clients|Nouvelles fiches (30 j)": "5", "Clients|Tickets ouverts": "3",
  "Finance|À encaisser": "720 €",                 // 300 + 420 (factures envoyées)
  "Finance|En retard de paiement": "420 €",
  "Finance|Panier moyen": "340 €",                // une facture payée de 340 €
  "Finance|Délai moyen de paiement": "5 j",       // facturée il y a 10 j, payée il y a 5 j
  "Finance|Abonnements à facturer": "3",
  "Acquisition|Publicité en ligne": "1", "Acquisition|Recherche Google / Bing": "1",
  "Acquisition|Appel téléphonique": "1", "Acquisition|Non renseignée": "1",
};
// « Facturé ce mois » dépend du jour du mois : 300 € (aujourd'hui) + 340 € si la facture d'il y a 10 jours est dans le mois.
const jour = new Date().getDate();
if (!VIDE) ATTENDU[`Finance|Facturé en ${new Date().toLocaleString("fr-FR", { month: "long" })}`] = jour > 10 ? "640 €" : "300 €";

for (const vue of ["desktop", "mobile"]) {
  const { ctx, page } = await ouvrir(vue);
  for (const [cle, att] of Object.entries(ATTENDU)) {
    const [bloc, lib] = cle.split("|");
    const v = await valeur(page, bloc, lib);
    ok(`[${vue}] ${bloc} › ${lib} = ${att}`, v === att, v);
  }
  if (!VIDE) {
    const pcts = norm(await page.locator(".bloc-ligne", { hasText: "Publicité en ligne" }).innerText());
    ok(`[${vue}] Acquisition : part en %`, /25 %/.test(pcts), pcts);
    // Les lignes mènent aux listes filtrées.
    if (vue === "desktop") {
      await page.locator(".bloc-ligne", { hasText: "Non renseignée" }).click(); await page.waitForTimeout(400);
      ok("Clic Acquisition › Non renseignée → demandes sans origine", page.url().includes("/leads?statut=toutes&source=inconnue"), page.url());
      await page.goBack(); await page.waitForTimeout(500);
      await page.locator(".bloc-ligne", { hasText: "En retard de paiement" }).click(); await page.waitForTimeout(400);
      ok("Clic Finance › En retard → factures en retard", page.url().includes("/factures?etat=en_retard"), page.url());
    }
  } else {
    const t = await page.locator("body").innerText();
    ok(`[${vue}] Acquisition vide : message clair`, /Aucune demande ces 30 derniers jours/.test(t));
  }
  if (vue === "desktop") await page.goto("http://admin.test/", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const v = await page.evaluate(async (src) => {
    if (!window.axe) { const s = document.createElement("script"); s.textContent = src; document.head.appendChild(s); }
    const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] } });
    return r.violations.map((x) => `${x.id}(${x.nodes.length})`);
  }, AXE);
  ok(`[${vue}] axe-core sans défaut`, v.length === 0, v);
  ok(`[${vue}] pas de débordement`, !(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
  fs.mkdirSync("lot5", { recursive: true });
  await page.screenshot({ path: `lot5/tableau-${VIDE ? "vide-" : ""}${vue}.png`, fullPage: true });
  await ctx.close();
}
await nav.close();
ok("Aucune erreur JavaScript", erreurs.length === 0, erreurs);
for (const r of res) console.log(r.ok ? "OK   " : "ÉCHEC", r.nom, r.ok ? "" : JSON.stringify(r.detail));
console.log(`${res.filter((r) => r.ok).length} / ${res.length} tests tableau de bord conformes${VIDE ? " (base vide)" : ""}`);
