// Tests navigateur du lot 9 : page Système → Automatisations.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { brancher, CLE_SESSION, session, HOTE } from "./faux-supabase.mjs";

const DIST = process.argv[2];
const AXE = fs.readFileSync(path.resolve("node_modules/axe-core/axe.min.js"), "utf8");
const res = []; const ok = (n, c, d) => res.push({ n, ok: !!c, d });
const nav = await chromium.launch({ channel: "chrome" });
const erreurs = []; const ecritures = [];
const REGLES = [
  { cle: "relance_devis", nom: "Relance des devis sans réponse", description: "SI un devis envoyé … ALORS relance.", declencheur: "quotidien", actif: true, delai_jours: 5, modele_cle: "relance_devis" },
  { cle: "bienvenue", nom: "Bienvenue aux nouveaux clients", description: "SI une fiche client est créée … ALORS bienvenue.", declencheur: "client_cree", actif: false, delai_jours: 0, modele_cle: "bienvenue" },
];
const MODELES = [{ cle: "relance_devis", nom: "Relance d'un devis" }, { cle: "bienvenue", nom: "Bienvenue (nouveau client)" }];
const EVS = [
  { id: "ev000000-0000-4000-8000-000000000001", created_at: "2026-10-22T08:00:00Z", type: "client_cree", objet_type: "client", objet_id: "00000002-0000-4000-8000-000000000001", statut: "erreur", tentatives: 5, prochaine_tentative: "2026-10-22T20:00:00Z", erreur: "Envoi impossible : resend_not_configured" },
  { id: "ev000000-0000-4000-8000-000000000002", created_at: "2026-10-22T09:00:00Z", type: "ticket_resolu", objet_type: "ticket", objet_id: "00000007-0000-4000-8000-000000000001", statut: "en_attente", tentatives: 1, prochaine_tentative: "2099-01-01T00:00:00Z", erreur: null },
];
const RUNS = [{ id: "ru000000-0000-4000-8000-000000000001", created_at: "2026-10-22T07:00:00Z", automatisation_cle: "relance_devis", objet_type: "devis", objet_id: "00000003-0000-4000-8000-000000000001", statut: "envoye", detail: "Email envoyé à client0@exemple.fr" }];

async function ouvrir(vue, role = "admin") {
  const ctx = await nav.newContext(vue === "mobile" ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 900 } });
  await brancher(ctx);
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "access-control-expose-headers": "content-range" };
  const json = (r, body) => r.fulfill({ status: 200, headers: { ...cors, "content-range": `0-${Math.max(body.length - 1, 0)}/${body.length}` }, contentType: "application/json", body: JSON.stringify(body) });
  await ctx.route(`${HOTE}/rest/v1/automatisations**`, (r) => {
    if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: cors });
    if (r.request().method() === "PATCH") { ecritures.push({ table: "automatisations", url: r.request().url(), corps: JSON.parse(r.request().postData() || "{}") }); return r.fulfill({ status: 204, headers: cors }); }
    return json(r, REGLES);
  });
  await ctx.route(`${HOTE}/rest/v1/email_modeles**`, (r) => json(r, MODELES));
  await ctx.route(`${HOTE}/rest/v1/evenements**`, (r) => json(r, EVS));
  await ctx.route(`${HOTE}/rest/v1/automatisation_runs**`, (r) => json(r, RUNS));
  await ctx.route(`${HOTE}/rest/v1/rpc/reessayer_evenement`, (r) => { if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: cors }); ecritures.push({ table: "rpc", corps: JSON.parse(r.request().postData() || "{}") }); return r.fulfill({ status: 204, headers: cors }); });
  await ctx.route(`${HOTE}/functions/v1/worker`, (r) => { if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: cors }); ecritures.push({ table: "worker" }); return r.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify({ ok: true, file: { traites: 2, erreurs: 0 }, quotidien: { relancesDevis: 1, relancesFactures: 0 } }) }); });
  if (role !== "admin") await ctx.route(`${HOTE}/rest/v1/profiles**`, (r) => r.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify({ id: "11111111-1111-1111-1111-111111111111", email: "admin@test.fr", nom: "Collab", role }) }));
  await ctx.route("http://admin.test/**", (r) => {
    let f = path.join(DIST, new URL(r.request().url()).pathname);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, "index.html");
    const ext = path.extname(f);
    return r.fulfill({ body: fs.readFileSync(f), contentType: ext === ".js" ? "application/javascript" : ext === ".css" ? "text/css" : "text/html" });
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erreurs.push(e.message));
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [CLE_SESSION, JSON.stringify(session())]);
  await page.goto("http://admin.test/systeme/automatisations", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  return { ctx, page };
}
const axe = (page) => page.evaluate(async (src) => {
  if (!window.axe) { const s = document.createElement("script"); s.textContent = src; document.head.appendChild(s); }
  const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] } });
  return r.violations.filter((v) => !["aria-required-children", "empty-table-header"].includes(v.id)).map((v) => `${v.id}(${v.nodes.length}): ${v.nodes[0]?.target}`);
}, AXE);

for (const vue of ["desktop", "mobile"]) {
  const { ctx, page } = await ouvrir(vue);
  const t = await page.locator("body").innerText();
  ok(`[${vue}] Règles affichées (nom, description, déclencheur, délai, modèle)`, /Relance des devis sans réponse/.test(t) && /Contrôle quotidien/.test(t) && /Quand : Client créé/.test(t) && /Relance d'un devis/.test(t));
  ok(`[${vue}] Alerte : événements en erreur expliqués`, /1 événement\(s\) en erreur/.test(t) && /Le CRM fonctionne normalement/.test(t));
  ok(`[${vue}] File : erreur lisible, en attente avec tentatives`, /resend_not_configured/.test(t) && /En attente/.test(t) && /1 tentative/.test(t));
  ok(`[${vue}] Dernières exécutions`, /Email envoyé à client0@exemple\.fr/.test(t) && /Envoyé/.test(t));
  const v = await axe(page); ok(`[${vue}] axe-core sans défaut`, v.length === 0, v);
  ok(`[${vue}] pas de débordement`, !(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
  if (vue === "desktop") {
    ecritures.length = 0;
    const carte = page.locator("section.panel", { has: page.locator("h2", { hasText: "Bienvenue aux nouveaux clients" }) });
    ok("Enregistrer désactivé tant que rien n'a changé", await carte.getByRole("button", { name: "Enregistrer" }).isDisabled());
    await carte.getByRole("switch").click();
    await carte.getByRole("spinbutton").fill("2");
    await carte.getByRole("button", { name: "Enregistrer" }).click(); await page.waitForTimeout(600);
    const w = ecritures.find((e) => e.table === "automatisations");
    ok("Admin : activer + délai 2 j enregistrés pour la bonne règle", w && w.corps.actif === true && w.corps.delai_jours === 2 && /cle=eq\.bienvenue/.test(w.url), w);
    await page.getByRole("button", { name: "Réessayer" }).click(); await page.waitForTimeout(500);
    ok("Admin : « Réessayer » appelle reessayer_evenement avec l'événement en erreur", ecritures.some((e) => e.table === "rpc" && e.corps.p_id === EVS[0].id));
    await page.getByRole("button", { name: "Lancer maintenant" }).click(); await page.waitForTimeout(700);
    ok("« Lancer maintenant » : robot appelé, bilan affiché", ecritures.some((e) => e.table === "worker") && /Robot exécuté : 2 événement\(s\) traité\(s\), 1 relance\(s\) de devis/.test(await page.locator(".ant-message").innerText()));
  }
  await ctx.close();
}
// Collaborateur : lecture seule
{
  const { ctx, page } = await ouvrir("desktop", "collaborateur");
  const t = await page.locator("body").innerText();
  ok("Collaborateur : message « réservé à l'administrateur », réglages désactivés, pas de « Réessayer »",
    /Seul un administrateur peut activer ou régler les règles/.test(t) && await page.getByRole("switch").first().isDisabled() && (await page.getByRole("button", { name: "Enregistrer" }).count()) === 0 && (await page.getByRole("button", { name: "Réessayer" }).count()) === 0);
  await ctx.close();
}
await nav.close();
ok("Aucune erreur JavaScript", erreurs.length === 0, erreurs);
for (const x of res) console.log(x.ok ? "OK   " : "ÉCHEC", x.n, x.ok ? "" : JSON.stringify(x.d)?.slice(0, 300));
console.log(`${res.filter((x) => x.ok).length} / ${res.length} tests back-office conformes`);
