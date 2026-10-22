// Génère les images de partage (Open Graph, 1200 × 630, PNG) des trois sites.
// Les réseaux sociaux n'acceptent pas le SVG : on dessine la carte en HTML,
// avec la feuille de style et les polices du site, puis on la photographie.
//
//   cd build/og && npm install --no-save playwright@1.49.1 && npx playwright install chromium
//   node generer_og.mjs
// (à relancer seulement si les couleurs, le logo ou les accroches changent ;
//  accroches identiques à SITES[…]["accroche"] dans build/marque.py)
//
// Textes repris des sites (aucune promesse nouvelle).
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = process.env.DHB_DEPOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CARTES = {
  groupe: { dossier: "groupe", label: "Groupe", titre: "Services informatiques pour les entreprises et les particuliers", pied: "DHB Pro · DHB Assistance", polices: { Inter: "inter", Newsreader: "newsreader" } },
  pro: { dossier: "infogerance", label: "Pro", titre: "Infogérance, maintenance & cybersécurité pour les entreprises", pied: "Sur site en Île-de-France · à distance partout en France", polices: { Inter: "inter" } },
  assistance: { dossier: "particuliers", label: "Assistance", titre: "Assistance & dépannage informatique pour les particuliers", pied: "À domicile en Île-de-France · à distance partout en France", polices: { Inter: "inter", Nunito: "nunito" } },
};

const html = (site, c) => `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<link rel="stylesheet" href="../css/style.css">
<style>
  ${Object.entries(c.polices).map(([fam, f]) => `@font-face { font-family: '${fam}'; font-weight: 100 1000; src: url(../fonts/${f}-latin-wght-normal.woff2) format('woff2'); }`).join(" ")}
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
  .og { box-sizing: border-box; width: 1200px; height: 630px; padding: 80px 90px; display: flex; flex-direction: column;
        background: linear-gradient(135deg, var(--primary-700), var(--primary)); color: #fff; position: relative; }
  .og::after { content: ""; position: absolute; right: -140px; top: -160px; width: 560px; height: 560px; border-radius: 50%; background: rgba(255,255,255,.07); }
  .og .logo-mark { color: #fff; font-size: 64px; }
  .og .logo-label { font-size: 22px; padding: 8px 14px; border-radius: 10px; background: rgba(255,255,255,.14); color: #fff; }
  .og .logo { display: inline-flex; align-items: center; gap: 18px; }
  .og h1 { font-family: var(--font-display); font-size: 58px; line-height: 1.12; margin: auto 0 0; max-width: 960px; color: #fff; letter-spacing: -0.01em; }
  .og p { font-size: 28px; font-weight: 600; margin: 28px 0 0; color: rgba(255,255,255,.85); }
</style></head>
<body data-site="${site}"><div class="og">
  <span class="logo"><span class="logo-mark">DHB</span><span class="logo-label">${c.label}</span></span>
  <h1>${c.titre}</h1><p>${c.pied}</p>
</div></body></html>`;

const nav = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
for (const [site, c] of Object.entries(CARTES)) {
  const page = await nav.newPage({ viewport: { width: 1200, height: 630 } });
  const dossier = path.join(REPO, "sites", c.dossier, "assets", "img");
  // La page est servie depuis assets/img/ : la feuille de style et les polices du site s'appliquent.
  await page.route("http://og.local/**", async (r) => {
    const u = new URL(r.request().url());
    if (u.pathname === "/assets/img/carte.html") return r.fulfill({ contentType: "text/html", body: html(site, c) });
    return r.fulfill({ path: path.join(REPO, "sites", c.dossier, decodeURIComponent(u.pathname)) });
  });
  await page.goto("http://og.local/assets/img/carte.html", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(dossier, "og.png"), type: "png" });
  console.log(`${c.dossier}/assets/img/og.png`);
  await page.close();
}
await nav.close();
