// Tests navigateur du lot 6 : téléchargement des PDF depuis le back-office.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { brancher, CLE_SESSION, session, HOTE } from "./faux-supabase.mjs";

const DIST = process.argv[2];
const AXE = fs.readFileSync(path.resolve("node_modules/axe-core/axe.min.js"), "utf8");
const PDF = fs.readFileSync("pdf/facture-complete.pdf");
const res = []; const ok = (n, c, d) => res.push({ n, ok: !!c, d });
const nav = await chromium.launch({ channel: "chrome" });
const erreurs = []; const appels = [];
let panne = false;
const DOCS = [
  { id: "dddddddd-0000-4000-8000-000000000001", created_at: "2026-10-20T09:00:00Z", updated_at: "2026-10-20T09:00:00Z", type: "facture", numero: "2026-0001", nom_fichier: "Facture-2026-0001.pdf", taille_octets: 2713, client_id: "00000002-0000-4000-8000-000000000001" },
  { id: "dddddddd-0000-4000-8000-000000000002", created_at: "2026-10-18T09:00:00Z", updated_at: "2026-10-21T15:30:00Z", type: "devis", numero: "DEV-2026-0003", nom_fichier: "Devis-DEV-2026-0003.pdf", taille_octets: 2318, client_id: "00000002-0000-4000-8000-000000000001" },
];

async function ouvrir(vue, chemin) {
  const ctx = await nav.newContext({ acceptDownloads: true, ...(vue === "mobile" ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 900 } }) });
  await brancher(ctx);
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
  await ctx.route(`${HOTE}/functions/v1/render-pdf`, async (r) => {
    if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: cors });
    appels.push({ corps: JSON.parse(r.request().postData() || "{}"), auth: r.request().headers()["authorization"] });
    if (panne) return r.fulfill({ status: 502, headers: cors, contentType: "application/json", body: JSON.stringify({ error: "stockage_indisponible" }) });
    const c = JSON.parse(r.request().postData() || "{}");
    const nom = c.document_id ? DOCS.find((d) => d.id === c.document_id)?.nom_fichier : c.type === "devis" ? "Devis-DEV-2026-0001.pdf" : "Facture-2026-0001.pdf";
    return r.fulfill({ status: 200, headers: { ...cors, "access-control-expose-headers": "Content-Disposition, X-Document-Archive", "content-disposition": `attachment; filename="${nom}"`, "x-document-archive": "archive" }, contentType: "application/pdf", body: PDF });
  });
  await ctx.route(`${HOTE}/rest/v1/documents**`, (r) => r.fulfill({ status: 200, headers: { ...cors, "access-control-expose-headers": "content-range", "content-range": `0-1/2` }, contentType: "application/json", body: JSON.stringify(DOCS) }));
  await ctx.route("http://admin.test/**", (r) => {
    let f = path.join(DIST, new URL(r.request().url()).pathname);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, "index.html");
    const ext = path.extname(f);
    return r.fulfill({ body: fs.readFileSync(f), contentType: ext === ".js" ? "application/javascript" : ext === ".css" ? "text/css" : "text/html" });
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erreurs.push(e.message));
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [CLE_SESSION, JSON.stringify(session())]);
  await page.goto("http://admin.test" + chemin, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  return { ctx, page };
}
const axe = (page) => page.evaluate(async (src) => {
  if (!window.axe) { const s = document.createElement("script"); s.textContent = src; document.head.appendChild(s); }
  const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] } });
  return r.violations.filter((v) => !["aria-required-children", "empty-table-header"].includes(v.id)).map((v) => `${v.id}(${v.nodes.length})`);
}, AXE);

for (const vue of ["desktop", "mobile"]) {
  for (const [type, chemin, attendu] of [["devis", "/devis/00000003-0000-4000-8000-000000000001", "Devis-DEV-2026-0001.pdf"], ["facture", "/factures/00000004-0000-4000-8000-000000000001", "Facture-2026-0001.pdf"]]) {
    const { ctx, page } = await ouvrir(vue, chemin);
    appels.length = 0;
    const bouton = page.getByRole("button", { name: /Télécharger le PDF/ });
    ok(`[${vue}] ${type} : bouton « Télécharger le PDF » visible`, await bouton.isVisible());
    const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 10000 }), bouton.click()]);
    const fichier = await dl.path();
    ok(`[${vue}] ${type} : fichier reçu « ${attendu} »`, dl.suggestedFilename() === attendu && fs.readFileSync(fichier).slice(0, 5).toString() === "%PDF-", dl.suggestedFilename());
    ok(`[${vue}] ${type} : appel avec le jeton de session et le bon document`, appels[0]?.corps.type === type && /^Bearer ey/.test(appels[0]?.auth || ""), appels[0]);
    const v = await axe(page); ok(`[${vue}] ${type} : axe-core sans défaut`, v.length === 0, v);
    ok(`[${vue}] ${type} : pas de débordement`, !(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    if (vue === "desktop" && type === "facture") {
      panne = true;
      await bouton.click(); await page.waitForTimeout(800);
      const msg = await page.locator(".ant-message").innerText().catch(() => "");
      ok("Erreur serveur : message compréhensible", /stockage des documents ne répond pas/.test(msg), msg);
      panne = false;
      const plus = await page.getByLabel("Plus d'actions").click().then(() => page.locator(".ant-dropdown").innerText());
      ok("Facture : l'ancien « Télécharger en PDF » (impression) a disparu du menu", !/Télécharger en PDF/.test(plus), plus);
    }
    await ctx.close();
  }
  // Onglet Documents de la fiche client
  const { ctx, page } = await ouvrir(vue, "/clients/00000002-0000-4000-8000-000000000001?onglet=documents");
  const t = await page.locator("body").innerText();
  ok(`[${vue}] Fiche client : onglet Documents listé`, /Facture 2026-0001/.test(t) && /Devis DEV-2026-0003/.test(t) && /Archivé le/.test(t) && /Version du/.test(t), "");
  appels.length = 0;
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 10000 }), page.getByRole("button", { name: "Télécharger Facture-2026-0001.pdf" }).click()]);
  ok(`[${vue}] Fiche client : téléchargement par identifiant de document`, appels[0]?.corps.document_id === DOCS[0].id && dl.suggestedFilename() === "Facture-2026-0001.pdf", appels[0]);
  const v = await axe(page); ok(`[${vue}] Fiche client : axe-core sans défaut`, v.length === 0, v);
  ok(`[${vue}] Fiche client : pas de débordement`, !(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
  fs.mkdirSync("lot6", { recursive: true });
  await page.screenshot({ path: `lot6/documents-${vue}.png`, fullPage: true });
  await ctx.close();
}
await nav.close();
ok("Aucune erreur JavaScript", erreurs.length === 0, erreurs);
for (const x of res) console.log(x.ok ? "OK   " : "ÉCHEC", x.n, x.ok ? "" : JSON.stringify(x.d)?.slice(0, 300));
console.log(`${res.filter((x) => x.ok).length} / ${res.length} tests back-office conformes`);
