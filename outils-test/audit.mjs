// Mesure axe-core + captures desktop/mobile des sites et du back-office.
// Usage : node audit.mjs <etiquette> <racine_depot> <dossier_admin_dist>
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { brancher, CLE_SESSION, session } from "./faux-supabase.mjs";

const [, , ETIQ = "avant", DEPOT, ADMIN_DIST] = process.argv;
const SORTIE = path.resolve(ETIQ);
fs.mkdirSync(path.join(SORTIE, "captures"), { recursive: true });
const AXE = fs.readFileSync(path.resolve("node_modules/axe-core/axe.min.js"), "utf8");
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "application/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".pdf": "application/pdf", ".json": "application/json", ".xml": "application/xml", ".ico": "image/x-icon", ".woff2": "font/woff2" };

function servir(racine, spa) {
  return async (route) => {
    const u = new URL(route.request().url());
    let chemin = decodeURIComponent(u.pathname);
    // La 404 de Pro (<base href="/">) demande ses fichiers à la racine : on les sert depuis infogerance/.
    if (!spa && !/^\/(groupe|infogerance|particuliers)\//.test(chemin)) chemin = "/infogerance" + chemin;
    let f = path.join(racine, chemin);
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
    if (!fs.existsSync(f)) {
      if (spa) f = path.join(racine, "index.html");
      else return route.fulfill({ status: 404, contentType: "text/html", body: fs.readFileSync(path.join(DEPOT, "sites/infogerance/404.html")) });
    }
    return route.fulfill({ status: 200, contentType: TYPES[path.extname(f)] || "application/octet-stream", body: fs.readFileSync(f) });
  };
}

const premier = (d) => fs.readdirSync(path.join(DEPOT, d)).filter((x) => !x.includes(".")).sort()[0];
const SITES = [
  "/groupe/", "/groupe/le-groupe/", "/groupe/contact/",
  "/infogerance/", `/infogerance/services/${premier("sites/infogerance/services")}/`,
  `/infogerance/pannes-frequentes/${premier("sites/infogerance/pannes-frequentes")}/`,
  `/infogerance/zones/${premier("sites/infogerance/zones")}/`, "/infogerance/blog/",
  `/infogerance/blog/${premier("sites/infogerance/blog")}/`, "/infogerance/404.html",
  "/particuliers/", `/particuliers/aide/${premier("sites/particuliers/aide")}/`, "/particuliers/abonnement/",
];
const ADMIN = ["/login", "/", "/leads", "/clients", `/clients/00000002-0000-4000-8000-000000000001`, "/devis",
  "/devis/nouveau", "/factures", "/paiements", "/tickets", "/pilotage/statistiques", "/systeme/utilisateurs", "/systeme/journal"];

const VUES = [{ nom: "desktop", viewport: { width: 1366, height: 860 } }, { nom: "mobile", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }];

async function mesurer(page, nom, vue, bilan) {
  await page.waitForTimeout(900);
  const res = await page.evaluate(async (src) => {
    if (!window.axe) { const s = document.createElement("script"); s.textContent = src; document.head.appendChild(s); }
    const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] }, resultTypes: ["violations"] });
    return {
      violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, cibles: v.nodes.slice(0, 300).map((x) => x.target.join(" ") + " | " + (x.any[0]?.message || x.all[0]?.message || "").slice(0, 120)) })),
      debordement: document.documentElement.scrollWidth > window.innerWidth + 1,
      h: [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => h.tagName).join(" "),
    };
  }, AXE);
  const fichier = `${nom.replace(/[^a-z0-9]+/gi, "_")}-${vue}.png`;
  await page.screenshot({ path: path.join(SORTIE, "captures", fichier), fullPage: vue === "desktop" ? false : false });
  bilan.push({ page: nom, vue, ...res });
}

const navigateur = await chromium.launch({ channel: "chrome" });
const bilan = [];
const erreursJS = [];
for (const vue of VUES) {
  // ---- Sites ----
  const ctxS = await navigateur.newContext({ viewport: vue.viewport, isMobile: !!vue.isMobile, hasTouch: !!vue.hasTouch, locale: "fr-FR" });
  await ctxS.route("http://sites.test/**", servir(path.join(DEPOT, "sites"), false));
  await ctxS.route("https://yjnaxzlvuwrvyyqxnvgn.supabase.co/**", (r) => r.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: "[]" }));
  await ctxS.route(/googletagmanager|google-analytics/, (r) => r.abort());
  for (const p of SITES) {
    const page = await ctxS.newPage();
    page.on("pageerror", (e) => erreursJS.push(`${p} ${vue.nom}: ${e.message}`));
    await page.goto("http://sites.test" + p, { waitUntil: "load" });
    await mesurer(page, "site" + p, vue.nom, bilan);
    await page.close();
  }
  await ctxS.close();
  // ---- Back-office ----
  const ctxA = await navigateur.newContext({ viewport: vue.viewport, isMobile: !!vue.isMobile, hasTouch: !!vue.hasTouch, locale: "fr-FR" });
  await brancher(ctxA);
  await ctxA.route("http://admin.test/**", servir(ADMIN_DIST, true));
  for (const p of ADMIN) {
    const page = await ctxA.newPage();
    page.on("pageerror", (e) => erreursJS.push(`admin${p} ${vue.nom}: ${e.message}`));
    if (p !== "/login") await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [CLE_SESSION, JSON.stringify(session())]);
    await page.goto("http://admin.test" + p, { waitUntil: "networkidle" });
    await mesurer(page, "admin" + p, vue.nom, bilan);
    await page.close();
  }
  await ctxA.close();
}
await navigateur.close();

const total = {};
for (const b of bilan) for (const v of b.violations) total[v.id] = (total[v.id] || 0) + v.n;
fs.writeFileSync(path.join(SORTIE, "bilan.json"), JSON.stringify({ total, erreursJS, bilan }, null, 1));
console.log("Total par règle (desktop + mobile) :", total);
console.log("Débordements :", bilan.filter((b) => b.debordement).map((b) => b.page + " " + b.vue));
console.log("Erreurs JS :", erreursJS.length ? erreursJS : "aucune");
