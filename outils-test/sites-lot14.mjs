// Lot 14 dans un vrai navigateur : pages modifiées (villes, fiches liées).
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const DEPOT = process.argv[2];
const AXE = fs.readFileSync(path.resolve("node_modules/axe-core/axe.min.js"), "utf8");
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "application/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".xml": "application/xml", ".txt": "text/plain", ".pdf": "application/pdf" };
const SITES = {
  groupe: { dossier: "groupe", polices: ["Inter", "Newsreader"], fil: "/le-groupe/" },
  pro: { dossier: "infogerance", polices: ["Inter"], fil: "/pannes-frequentes/" },
  assistance: { dossier: "particuliers", polices: ["Inter", "Nunito"], fil: "/aide/recuperer-photos-supprimees/" },
};
const res = []; const ok = (n, c, d) => res.push({ n, ok: !!c, d });
const nav = await chromium.launch({ channel: "chrome" });
const erreursJs = [];

// Hébergement statique type GitHub Pages : chaque site à la racine de son domaine, 404.html pour le reste.
async function ouvrir(cle, vue) {
  const racine = path.join(DEPOT, "sites", SITES[cle].dossier);
  const ctx = await nav.newContext(vue === "mobile" ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 900 } });
  const externes = [], echecs = [];
  await ctx.route("**/*", (r) => {
    const u = new URL(r.request().url());
    if (u.host !== `${cle}.test`) { externes.push(u.host); return r.abort(); }
    let f = path.join(racine, decodeURIComponent(u.pathname));
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
    if (!fs.existsSync(f)) return r.fulfill({ status: 404, contentType: TYPES[".html"], body: fs.readFileSync(path.join(racine, "404.html")) });
    return r.fulfill({ status: 200, contentType: TYPES[path.extname(f)] || "application/octet-stream", body: fs.readFileSync(f) });
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erreursJs.push(`${cle}: ${e.message}`));
  page.on("response", (r) => { if (r.status() >= 400 && r.request().resourceType() !== "document") echecs.push(`${r.status()} ${r.url()}`); });
  // Bandeau cookies : refusé d'avance (aucune mesure d'audience chargée).
  await page.addInitScript(() => { try { localStorage.setItem("dhb-cookie-consent", "refused"); } catch {} });
  return { ctx, page, externes, echecs };
}
const axe = (page) => page.evaluate(async (src) => {
  if (!window.axe) { const s = document.createElement("script"); s.textContent = src; document.head.appendChild(s); }
  const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] } });
  return r.violations.map((v) => `${v.id}(${v.nodes.length}): ${v.nodes[0]?.target}`);
}, AXE);
const debord = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

const PAGES = {
  pro: ["/zones/depannage-informatique-saint-denis/", "/zones/support-informatique-a-distance-france/", "/pannes-frequentes/mauvaise-qualite-appels-voip/", "/pannes-frequentes/ordinateur-ne-sallume-plus/"],
  assistance: ["/aide/imprimante-maison-nimprime-plus/", "/aide/recuperer-photos-supprimees/"],
};
for (const [cle, chemins] of Object.entries(PAGES)) {
  for (const vue of ["desktop", "mobile"]) {
    const { ctx, page, echecs } = await ouvrir(cle, vue);
    for (const c of chemins) {
      echecs.length = 0;
      const r = await page.goto(`http://${cle}.test${c}`, { waitUntil: "networkidle" });
      const liens = await page.evaluate(() => [...document.querySelectorAll(".related a")].map((a) => a.getAttribute("href")));
      ok(`[${cle}/${vue}] ${c} : 200, bloc de liens présent (${liens.length})`, r.status() === 200 && liens.length >= 4, liens);
      const v = await axe(page); ok(`[${cle}/${vue}] ${c} : axe-core sans défaut`, v.length === 0, v);
      ok(`[${cle}/${vue}] ${c} : pas de débordement, aucune ressource manquante`, !(await debord(page)) && echecs.length === 0, echecs);
      // Chaque lien du bloc mène à une page existante (pas la 404).
      for (const h of liens.slice(0, 7)) {
        const u = new URL(h, page.url()).pathname;
        const r2 = await page.evaluate(async (x) => (await fetch(x)).status, u);
        if (r2 !== 200) ok(`[${cle}] lien ${u} depuis ${c}`, false, r2);
      }
    }
    await ctx.close();
  }
}
await nav.close();
ok("Aucune erreur JavaScript", erreursJs.length === 0, erreursJs);
for (const x of res) console.log(x.ok ? "OK   " : "ÉCHEC", x.n, x.ok ? "" : JSON.stringify(x.d)?.slice(0, 300));
console.log(`${res.filter((x) => x.ok).length} / ${res.length} tests navigateur du lot 14 conformes`);
