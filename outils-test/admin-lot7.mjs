// Tests navigateur du lot 7 : abonnements Stripe dans le back-office.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { brancher, CLE_SESSION, session, HOTE, donnees } from "./faux-supabase.mjs";

const DIST = process.argv[2];
const AXE = fs.readFileSync(path.resolve("node_modules/axe-core/axe.min.js"), "utf8");
const res = []; const ok = (n, c, d) => res.push({ n, ok: !!c, d });
const nav = await chromium.launch({ channel: "chrome" });
const erreurs = [];
// 5 abonnements du faux jeu : 3 actifs (0, 1, 4) ; le n° 0 devient « Stripe ».
const abos = () => donnees("abonnements").map((a, i) => ({ ...a, montant_mensuel: 14.9, jour_facturation: 1, derniere_facture_le: null, stripe_subscription_id: i === 0 ? "sub_123" : null }));

async function ouvrir(vue, chemin, { baseAncienne = false } = {}) {
  const ctx = await nav.newContext(vue === "mobile" ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 900 } });
  await brancher(ctx);
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-expose-headers": "content-range" };
  await ctx.route(`${HOTE}/rest/v1/abonnements**`, (r) => {
    const sel = new URL(r.request().url()).searchParams.get("select") || "";
    if (baseAncienne && sel.includes("stripe_subscription_id"))
      return r.fulfill({ status: 400, headers: cors, contentType: "application/json", body: JSON.stringify({ code: "42703", message: "column abonnements.stripe_subscription_id does not exist" }) });
    const u = new URL(r.request().url()), off = Number(u.searchParams.get("offset") || 0);
    const rows = abos().map((a) => (baseAncienne ? { ...a, stripe_subscription_id: undefined } : a)).slice(off);
    return r.fulfill({ status: 200, headers: { ...cors, "content-range": `0-4/5` }, contentType: "application/json", body: JSON.stringify(rows) });
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
  await page.goto("http://admin.test" + chemin, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  return { ctx, page };
}
const valeur = async (page, libelle) => (await page.locator(".bloc-ligne", { has: page.locator(".l", { hasText: libelle }) }).locator(".v").innerText()).trim();

for (const vue of ["desktop", "mobile"]) {
  let { ctx, page } = await ouvrir(vue, "/abonnements");
  const t = await page.locator("body").innerText();
  ok(`[${vue}] Abonnements : mention Stripe sur l'abonnement prélevé en ligne`, /Paiement en ligne \(Stripe\)|· Stripe/.test(t));
  ok(`[${vue}] Abonnements : alerte « facture à générer » seulement pour les 2 abonnements non Stripe`, (await page.locator("tbody, .m-list").getByText("Facture à générer").count()) === 2, await page.locator("tbody, .m-list").getByText("Facture à générer").count());
  const v = await page.evaluate(async (src) => {
    if (!window.axe) { const s = document.createElement("script"); s.textContent = src; document.head.appendChild(s); }
    const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] } });
    return r.violations.filter((x) => !["aria-required-children", "empty-table-header"].includes(x.id)).map((x) => `${x.id}(${x.nodes.length})`);
  }, AXE);
  ok(`[${vue}] Abonnements : axe-core sans défaut`, v.length === 0, v);
  await ctx.close();
  ({ ctx, page } = await ouvrir(vue, "/"));
  ok(`[${vue}] Tableau de bord : abonnements à facturer = 2 (Stripe exclu)`, (await valeur(page, "Abonnements à facturer")) === "2", await valeur(page, "Abonnements à facturer"));
  await ctx.close();
}
// Base pas encore mise à jour : la colonne Stripe n'existe pas → le tableau de bord se charge quand même.
const { ctx, page } = await ouvrir("desktop", "/", { baseAncienne: true });
const t = await page.locator("body").innerText();
ok("Base non mise à jour : tableau de bord chargé sans erreur", !/n'est pas à jour|Impossible/.test(t) && (await valeur(page, "Abonnements à facturer")) === "3", await valeur(page, "Abonnements à facturer").catch(() => "?"));
await ctx.close();
await nav.close();
ok("Aucune erreur JavaScript", erreurs.length === 0, erreurs);
for (const x of res) console.log(x.ok ? "OK   " : "ÉCHEC", x.n, x.ok ? "" : JSON.stringify(x.d)?.slice(0, 300));
console.log(`${res.filter((x) => x.ok).length} / ${res.length} tests back-office conformes`);
