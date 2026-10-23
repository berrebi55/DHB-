// Lot 13 dans un vrai navigateur : polices locales, 404 profondes, images de partage, a11y.
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

for (const [cle, s] of Object.entries(SITES)) {
  for (const vue of ["desktop", "mobile"]) {
    const { ctx, page, externes, echecs } = await ouvrir(cle, vue);
    // Accueil : polices locales, aucune requête hors du site.
    await page.goto(`http://${cle}.test/`, { waitUntil: "networkidle" });
    const polices = await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/"/g, "")); });
    ok(`[${cle}/${vue}] Polices chargées depuis le site (${s.polices.join(", ")})`, s.polices.every((p) => polices.includes(p)), polices);
    // Seul autre domaine permis : Supabase (contenu du site, bloqué ici pour ne jamais toucher la vraie base).
    ok(`[${cle}/${vue}] Aucune requête vers Google (polices, mesure d'audience refusée)`, externes.every((h) => h.endsWith(".supabase.co")), externes);
    if (vue === "desktop") {
      const og = await page.evaluate(async () => { const r = await fetch("/assets/img/og.png"); const b = new Uint8Array(await r.arrayBuffer()); return { s: r.status, t: r.headers.get("content-type"), sig: String.fromCharCode(b[1], b[2], b[3]) }; });
      ok(`[${cle}] og.png servie (image PNG)`, og.s === 200 && og.t === "image/png" && og.sig === "PNG", og);
    }
    // Page avec fil d'Ariane : rendu inchangé, accessible.
    await page.goto(`http://${cle}.test${s.fil}`, { waitUntil: "networkidle" });
    const fil = await page.locator(".breadcrumb").first().innerText();
    ok(`[${cle}/${vue}] Fil d'Ariane visible (${fil.replace(/\s+/g, " ").slice(0, 60)})`, /^Accueil\s*\/\s*\S/.test(fil));
    let v = await axe(page); ok(`[${cle}/${vue}] Page avec fil : axe-core sans défaut`, v.length === 0, v);
    // 404 à une adresse profonde : stylée, liens vers la racine, aucun fichier manquant.
    echecs.length = 0;
    const r404 = await page.goto(`http://${cle}.test/une/adresse/qui/n-existe/pas/`, { waitUntil: "networkidle" });
    const etat = await page.evaluate(() => ({
      titre: document.querySelector("h1")?.textContent,
      css: [...document.styleSheets].some((x) => { try { return x.cssRules.length > 50; } catch { return false; } }),
      police: getComputedStyle(document.body).fontFamily,
      accueil: [...document.querySelectorAll("a")].find((a) => /Retour à l'accueil/.test(a.textContent))?.href,
      robots: document.querySelector('meta[name="robots"]')?.content,
    }));
    ok(`[${cle}/${vue}] 404 profonde : statut 404, page stylée, « Retour à l'accueil » → racine, noindex`,
      r404.status() === 404 && /Page introuvable/.test(etat.titre) && etat.css && /Inter/.test(etat.police) && etat.accueil === `http://${cle}.test/` && /noindex/.test(etat.robots), etat);
    ok(`[${cle}/${vue}] 404 profonde : aucune ressource manquante`, echecs.length === 0, echecs);
    v = await axe(page); ok(`[${cle}/${vue}] 404 : axe-core sans défaut`, v.length === 0, v);
    ok(`[${cle}/${vue}] 404 : pas de débordement`, !(await debord(page)));
    if (cle === "assistance") {
      await page.goto(`http://${cle}.test/paiement-reussi/`, { waitUntil: "networkidle" });
      const p = await page.evaluate(() => ({ robots: document.querySelector('meta[name="robots"]')?.content, base: !!document.querySelector("base"), css: [...document.styleSheets].some((x) => { try { return x.cssRules.length > 50; } catch { return false; } }) }));
      ok(`[${vue}] Retour de paiement : noindex, page stylée`, /noindex/.test(p.robots) && !p.base && p.css, p);
    }
    await ctx.close();
  }
}
await nav.close();
ok("Aucune erreur JavaScript", erreursJs.length === 0, erreursJs);
for (const x of res) console.log(x.ok ? "OK   " : "ÉCHEC", x.n, x.ok ? "" : JSON.stringify(x.d)?.slice(0, 300));
console.log(`${res.filter((x) => x.ok).length} / ${res.length} tests navigateur des sites conformes`);
