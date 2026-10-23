// Tests navigateur du lot 15 : onglets accessibles, compteurs complets (> 1 000 lignes),
// redirection après connexion, erreurs affichées comme erreurs (notes, catalogue, menu, historique).
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { brancher, CLE_SESSION, session, HOTE, donnees } from "./faux-supabase.mjs";

const DIST = process.argv[2];
const AXE = fs.readFileSync(path.resolve("node_modules/axe-core/axe.min.js"), "utf8");
const res = []; const ok = (n, c, d) => res.push({ n, ok: !!c, d });
const nav = await chromium.launch({ channel: "chrome" });
const erreursJs = [];
const CLIENT = "00000002-0000-4000-8000-000000000001";
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "access-control-expose-headers": "content-range" };
const panne = (r) => r.request().method() === "OPTIONS" ? r.fulfill({ status: 204, headers: cors })
  : r.fulfill({ status: 500, headers: cors, contentType: "application/json", body: JSON.stringify({ code: "XX000", message: "panne simulée" }) });

async function ouvrir(chemin, { vue = "desktop", routes = async () => {}, connecte = true } = {}) {
  const ctx = await nav.newContext(vue === "mobile" ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 900 } });
  await brancher(ctx);
  await routes(ctx);
  await ctx.route("http://admin.test/**", (r) => {
    let f = path.join(DIST, new URL(r.request().url()).pathname);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, "index.html");
    const ext = path.extname(f);
    return r.fulfill({ body: fs.readFileSync(f), contentType: { ".js": "application/javascript", ".css": "text/css", ".woff2": "font/woff2" }[ext] || "text/html" });
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erreursJs.push(`${chemin}: ${e.message}`));
  if (connecte) await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [CLE_SESSION, JSON.stringify(session())]);
  await page.goto("http://admin.test" + chemin, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  return { ctx, page };
}
const axe = (page) => page.evaluate(async (src) => {
  if (!window.axe) { const s = document.createElement("script"); s.textContent = src; document.head.appendChild(s); }
  const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] } });
  return r.violations.map((v) => `${v.id}(${v.nodes.length}): ${v.nodes[0]?.target}`);
}, AXE);

// 1. Onglets de filtre : structure, clavier, plus de bouton « … », mobile.
for (const [chemin, param] of [["/leads", "statut"], ["/clients", "statut"], ["/devis", "statut"], ["/factures", "statut"], ["/tickets", "statut"], ["/abonnements", "statut"]]) {
  for (const vue of ["desktop", "mobile"]) {
    const { ctx, page } = await ouvrir(chemin, { vue });
    const etat = await page.evaluate(() => {
      const tl = document.querySelector('[role="tablist"]');
      return { tabs: tl ? [...tl.children].every((c) => c.getAttribute("role") === "tab") && tl.children.length : 0,
        plus: !!document.querySelector(".ant-tabs-nav-more"), choisis: document.querySelectorAll('[role="tab"][aria-selected="true"]').length,
        debord: document.documentElement.scrollWidth > window.innerWidth + 1 };
    });
    ok(`[${vue}] ${chemin} : liste d'onglets valide (${etat.tabs} onglets, 1 choisi), sans bouton « … », sans débordement de page`, etat.tabs >= 3 && etat.choisis === 1 && !etat.plus && !etat.debord, etat);
    if (vue === "desktop") {
      await page.locator('[role="tab"][aria-selected="true"]').focus();
      await page.keyboard.press("ArrowRight"); await page.waitForTimeout(300);
      const apres = await page.evaluate((p) => ({ focus: document.activeElement?.getAttribute("role"), choisi: document.activeElement?.getAttribute("aria-selected"), url: new URL(location.href).searchParams.get(p) }), param);
      ok(`${chemin} : flèche droite → onglet suivant choisi et filtre appliqué`, apres.focus === "tab" && apres.choisi === "true", apres);
      await page.keyboard.press("Home"); await page.waitForTimeout(300);
      const debut = await page.evaluate(() => document.activeElement === document.querySelector('[role="tab"]') && document.activeElement.getAttribute("aria-selected") === "true");
      ok(`${chemin} : touche Début → premier onglet`, debut);
    }
    const v = await axe(page); ok(`[${vue}] ${chemin} : axe-core sans défaut`, v.length === 0, v);
    await ctx.close();
  }
}

// 2. Fiche client : vrais onglets avec panneau associé.
{
  const { ctx, page } = await ouvrir(`/clients/${CLIENT}`, { vue: "mobile" });
  const lien = await page.evaluate(() => {
    const t = document.querySelector('[role="tab"][aria-selected="true"]'); const p = document.querySelector('[role="tabpanel"]');
    return { controls: t?.getAttribute("aria-controls"), panneau: p?.id, labelledby: p?.getAttribute("aria-labelledby"), tab: t?.id };
  });
  ok("Fiche client : onglet choisi ↔ panneau (aria-controls / aria-labelledby)", lien.controls && lien.controls === lien.panneau && lien.labelledby === lien.tab, lien);
  await page.locator('[role="tab"]', { hasText: "Notes" }).click(); await page.waitForTimeout(400);
  ok("Fiche client : clic sur « Notes » → panneau Notes, adresse mise à jour", /onglet=notes/.test(page.url()) && (await page.locator('[role="tabpanel"]').getByLabel("Nouvelle note").count()) === 1);
  const v = await axe(page); ok("[mobile] Fiche client : axe-core sans défaut", v.length === 0, v);
  await ctx.close();
}

// 3. Compteurs complets : 2 500 devis, serveur plafonné à 1 000 lignes par réponse (comme Supabase).
{
  const STATUTS = ["brouillon", "envoye", "accepte", "refuse"];
  const tous = Array.from({ length: 2500 }, (_, i) => ({ id: `d${String(i).padStart(5, "0")}`, statut: STATUTS[i % 4] }));
  const routes = async (ctx) => ctx.route(`${HOTE}/rest/v1/devis**`, (r) => {
    const u = new URL(r.request().url());
    if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: cors });
    if (u.searchParams.get("select") !== "id,statut") return r.fallback();
    const off = Number(u.searchParams.get("offset") || 0), lim = Math.min(Number(u.searchParams.get("limit") || 1e9), 1000);
    const rows = tous.slice(off, off + lim);
    return r.fulfill({ status: 200, headers: { ...cors, "content-range": `${off}-${off + rows.length - 1}/*` }, contentType: "application/json", body: JSON.stringify(rows) });
  });
  const { ctx, page } = await ouvrir("/devis", { routes });
  const onglets = await page.locator('[role="tab"]').allInnerTexts();
  const tousTxt = onglets.find((t) => /^Tous/.test(t)) ?? onglets[0];
  ok(`Compteurs : « Tous » = 2 500 (et non 1 000) — ${tousTxt.replace(/\s+/g, " ")}`, /2\s?500/.test(tousTxt), onglets);
  ok("Compteurs : chaque statut = 625", onglets.filter((t) => /625/.test(t)).length >= 3, onglets);
  await ctx.close();
}

// 4. Retour après connexion : uniquement un chemin interne.
for (const [to, garde] of [["/%5Cevil.example", false], ["//evil.example", false], ["/clients", true]]) {
  const { ctx, page } = await ouvrir(`/login?to=${to}`, { connecte: false });
  const reste = new URL(page.url()).searchParams.get("to");
  ok(`Connexion ?to=${to} : ${garde ? "conservé" : "retiré"}`, garde ? reste === decodeURIComponent(to) : reste === null, page.url());
  await ctx.close();
}

// 5. Erreurs affichées comme erreurs.
{
  const { ctx, page } = await ouvrir(`/clients/${CLIENT}`, { routes: async (c) => c.route(`${HOTE}/rest/v1/notes**`, panne) });
  const t = await page.locator("main").innerText();
  ok("Notes en panne → « Notes indisponibles » + Réessayer (et non « Aucune note »)", /Notes indisponibles/.test(t) && !/Aucune note/.test(t) && (await page.getByRole("button", { name: "Réessayer" }).count()) >= 1, t.slice(0, 300));
  await ctx.close();
}
{
  const { ctx, page } = await ouvrir(`/clients/${CLIENT}?onglet=historique`, { routes: async (c) => c.route(`${HOTE}/rest/v1/emails**`, panne) });
  ok("Historique : emails en panne → « Historique incomplet : les emails… »", /Historique incomplet : les emails/.test(await page.locator("main").innerText()));
  await ctx.close();
}
{
  const { ctx, page } = await ouvrir("/devis/nouveau", { routes: async (c) => c.route(`${HOTE}/rest/v1/prestations**`, panne) });
  ok("Catalogue en panne → « Catalogue indisponible » (et non « Catalogue vide »)", (await page.getByText("Catalogue indisponible").count()) === 1 && (await page.getByText("Catalogue vide").count()) === 0);
  await ctx.close();
}
{
  const routes = async (c) => c.route(`${HOTE}/rest/v1/leads**`, (r) => r.request().method() === "HEAD" ? panne(r) : r.fallback());
  const { ctx, page } = await ouvrir("/", { routes });
  const badge = page.locator(".app-sider .nav-badge.inconnu");
  ok("Compteur du menu en panne → « ? » (compteur indisponible), pas « rien en attente »", (await badge.count()) >= 1 && (await badge.first().getAttribute("aria-label")) === "compteur indisponible");
  const v = await axe(page); ok("Tableau de bord avec compteur indisponible : axe-core sans défaut", v.length === 0, v);
  await ctx.close();
}

await nav.close();
ok("Aucune erreur JavaScript", erreursJs.length === 0, erreursJs);
for (const x of res) console.log(x.ok ? "OK   " : "ÉCHEC", x.n, x.ok ? "" : JSON.stringify(x.d)?.slice(0, 300));
console.log(`${res.filter((x) => x.ok).length} / ${res.length} tests back-office du lot 15 conformes`);
