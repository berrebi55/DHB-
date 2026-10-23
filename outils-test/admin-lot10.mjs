// Tests navigateur du lot 10 : Système → Intégrations, Pilotage → Acquisition, tableau de bord.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { brancher, CLE_SESSION, session, HOTE } from "./faux-supabase.mjs";

const DIST = process.argv[2];
const AXE = fs.readFileSync(path.resolve("node_modules/axe-core/axe.min.js"), "utf8");
const res = []; const ok = (n, c, d) => res.push({ n, ok: !!c, d });
const nav = await chromium.launch({ channel: "chrome" });
const erreurs = []; const appels = [];
const jourIlYa = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const ANALYTICS = [
  { jour: jourIlYa(2), canal: "Organic Search", sessions: 40, utilisateurs: 35, conversions: 2 },
  { jour: jourIlYa(2), canal: "Direct", sessions: 12, utilisateurs: 11, conversions: 0 },
  { jour: jourIlYa(3), canal: "Organic Search", sessions: 48, utilisateurs: 44, conversions: 3 },
];

async function ouvrir(vue, chemin, o = {}) {
  const { connecte = false, role = "admin", analytics = ANALYTICS } = o;
  const ctx = await nav.newContext(vue === "mobile" ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 900 } });
  await brancher(ctx);
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "access-control-expose-headers": "content-range" };
  const json = (r, body, s = 200) => r.fulfill({ status: s, headers: { ...cors, "content-range": `0-${Math.max((body.length ?? 1) - 1, 0)}/${body.length ?? 1}` }, contentType: "application/json", body: JSON.stringify(body) });
  const INTEG = [
    { cle: "google", statut: connecte ? "connecte" : "non_configure", compte: connecte ? "proprio@gmail.com" : null, details: {}, derniere_synchro: null, erreur: null },
    { cle: "ga4", statut: connecte ? "connecte" : "non_configure", compte: null, details: connecte ? { ga4_property_id: "123456789", ga4_measurement_id: "G-TEST12345" } : {}, derniere_synchro: connecte ? new Date(Date.now() - 3600000).toISOString() : null, erreur: null },
  ];
  await ctx.route(`${HOTE}/rest/v1/integrations**`, (r) => {
    if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: cors });
    if (r.request().method() === "PATCH") { appels.push({ f: "patch-integrations", url: r.request().url(), corps: JSON.parse(r.request().postData() || "{}") }); return r.fulfill({ status: 204, headers: cors }); }
    return json(r, INTEG);
  });
  await ctx.route(`${HOTE}/rest/v1/integration_logs**`, (r) => json(r, [{ id: "l1", created_at: new Date(Date.now() - 600000).toISOString(), cle: "ga4", action: "synchro", statut: "ok", message: "3 ligne(s) copiée(s) depuis Google Analytics." }]));
  await ctx.route(`${HOTE}/rest/v1/stripe_evenements**`, (r) => json(r, []));
  await ctx.route(`${HOTE}/rest/v1/emails**`, (r) => json(r, []));
  await ctx.route(`${HOTE}/rest/v1/analytics_quotidien**`, (r) => json(r, analytics));
  if (role !== "admin") await ctx.route(`${HOTE}/rest/v1/profiles**`, (r) => r.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify({ id: "11111111-1111-1111-1111-111111111111", email: "admin@test.fr", nom: "Collab", role }) }));
  await ctx.route(`${HOTE}/functions/v1/**`, (r) => {
    if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: cors });
    const nom = new URL(r.request().url()).pathname.split("/").pop();
    const c = JSON.parse(r.request().postData() || "{}");
    appels.push({ f: nom, corps: c });
    const rep = nom === "integration-test" ? (c.tester ? { secrets: {}, google: { ok: true } } : { secrets: { google: true, ga4_conversions: false, emails: true, emails_mode_test: true, emails_mode_test_adresse: "moi@exemple.fr", stripe: false, stripe_webhook: false, planification: true, alertes_demandes: false, admin_url: true } })
      : nom === "google-oauth" ? (c.action === "demarrer" ? { url: "https://accounts.example/auth?client_id=x&state=y" } : { ok: true })
      : nom === "google-sync" ? { ok: true, lignes: 3 } : {};
    return r.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify(rep) });
  });
  await ctx.route("https://accounts.example/**", (r) => r.fulfill({ contentType: "text/html", body: "<title>Google</title><h1>Page Google</h1>" }));
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
  // ---- Intégrations : non connecté
  {
    const { ctx, page } = await ouvrir(vue, "/systeme/integrations");
    const t = await page.locator("body").innerText();
    ok(`[${vue}] Intégrations : cartes Google, GA4, Emails, Stripe, Planification, Sauvegardes`, ["Compte Google", "Google Analytics 4", "Emails (Resend)", "Paiements en ligne (Stripe)", "Planification", "Sauvegardes"].every((x) => t.includes(x)));
    ok(`[${vue}] Intégrations : état des secrets (sans valeur), mode test des emails`, /Définis dans Supabase/.test(t) && /Secret GA_API_SECRET à définir/.test(t) && /Actif : tout part vers moi@exemple\.fr/.test(t));
    ok(`[${vue}] Intégrations : « Copier les chiffres » désactivé tant que Google n'est pas connecté`, await page.getByRole("button", { name: "Copier les chiffres maintenant" }).isDisabled());
    ok(`[${vue}] Intégrations : journal affiché`, /3 ligne\(s\) copiée\(s\)/.test(t));
    const v = await axe(page); ok(`[${vue}] Intégrations : axe-core sans défaut`, v.length === 0, v);
    ok(`[${vue}] Intégrations : pas de débordement`, !(await debord(page)));
    if (vue === "desktop") {
      appels.length = 0;
      await page.getByLabel("Identifiant de propriété").fill("UA-123");
      await page.locator("section.panel", { has: page.locator("h2", { hasText: "Google Analytics 4" }) }).getByRole("button", { name: "Enregistrer" }).click(); await page.waitForTimeout(400);
      ok("GA4 : identifiant de propriété invalide refusé avant envoi", /Chiffres uniquement/.test(await page.locator("body").innerText()) && !appels.some((a) => a.f === "patch-integrations"));
      await page.getByLabel("Identifiant de propriété").fill("123456789");
      await page.getByLabel("Identifiant de mesure").fill("g-abc123def4");
      await page.locator("section.panel", { has: page.locator("h2", { hasText: "Google Analytics 4" }) }).getByRole("button", { name: "Enregistrer" }).click(); await page.waitForTimeout(600);
      const p = appels.find((a) => a.f === "patch-integrations");
      ok("GA4 : réglages enregistrés (identifiant de mesure en majuscules)", p && /cle=eq\.ga4/.test(p.url) && p.corps.details.ga4_property_id === "123456789" && p.corps.details.ga4_measurement_id === "G-ABC123DEF4", p);
      await page.getByRole("button", { name: "Connecter Google" }).click();
      await page.waitForURL(/accounts\.example/, { timeout: 8000 }).catch(() => undefined);
      ok("Connecter Google : redirection vers la page Google renvoyée par le serveur", page.url().startsWith("https://accounts.example/auth") && appels.some((a) => a.f === "google-oauth" && a.corps.action === "demarrer"), page.url());
    }
    await ctx.close();
  }
  // ---- Intégrations : connecté
  {
    const { ctx, page } = await ouvrir(vue, "/systeme/integrations?google=connecte", { connecte: true });
    const t = await page.locator("body").innerText();
    ok(`[${vue}] Retour de Google : « Compte Google connecté », compte affiché`, /Compte Google connecté\./.test(t) && /proprio@gmail\.com/.test(t));
    if (vue === "desktop") {
      appels.length = 0;
      await page.getByRole("button", { name: "Copier les chiffres maintenant" }).click(); await page.waitForTimeout(600);
      ok("Copier maintenant : google-sync appelée, bilan affiché", appels.some((a) => a.f === "google-sync") && /3 ligne\(s\) copiée\(s\)/.test(await page.locator(".ant-message").innerText()));
      await page.getByRole("button", { name: "Tester l'accès" }).click(); await page.waitForTimeout(600);
      ok("Tester l'accès : succès affiché", appels.some((a) => a.f === "integration-test" && a.corps.tester === "google") && /Accès Google valide/.test(await page.locator(".ant-message").innerText()));
      await page.getByRole("button", { name: "Déconnecter" }).click(); await page.waitForTimeout(400);
      await page.locator(".ant-modal-confirm .ant-btn-dangerous").click(); await page.waitForTimeout(600);
      ok("Déconnecter : confirmation puis appel du serveur", appels.some((a) => a.f === "google-oauth" && a.corps.action === "deconnecter"));
    }
    await ctx.close();
  }
  // ---- Retour en erreur
  if (vue === "desktop") {
    const { ctx, page } = await ouvrir(vue, "/systeme/integrations?google=erreur&raison=sans_acces_durable");
    ok("Retour de Google en erreur : explication compréhensible", /Google n'a pas donné d'accès durable/.test(await page.locator("body").innerText()));
    await ctx.close();
  }
  // ---- Acquisition avec et sans données
  {
    const { ctx, page } = await ouvrir(vue, "/pilotage/acquisition");
    const t = await page.locator("body").innerText();
    ok(`[${vue}] Acquisition : sessions (100), visiteurs (90), canaux`, /100/.test(t) && /90/.test(t) && /Organic Search/.test(t) && /Direct/.test(t) && !/Aucun chiffre de visite/.test(t));
    ok(`[${vue}] Acquisition : demandes et taux pour 100 sessions`, /Demandes pour 100 sessions/.test(t) && /4,0 %/.test(t), t.match(/Demandes reçues[^\n]*\n[^\n]*/)?.[0]);
    const v = await axe(page); ok(`[${vue}] Acquisition : axe-core sans défaut`, v.length === 0, v);
    ok(`[${vue}] Acquisition : pas de débordement`, !(await debord(page)));
    await ctx.close();
  }
  {
    const { ctx, page } = await ouvrir(vue, "/pilotage/acquisition", { analytics: [] });
    const t = await page.locator("body").innerText();
    ok(`[${vue}] Acquisition sans GA : explication + lien Intégrations, aucun chiffre inventé`, /Aucun chiffre de visite pour l'instant/.test(t) && /Système → Intégrations/.test(t) && /Demandes reçues/.test(t));
    await ctx.close();
  }
  // ---- Tableau de bord
  {
    const { ctx, page } = await ouvrir(vue, "/");
    const t = await page.locator("body").innerText();
    ok(`[${vue}] Tableau de bord : visites (100) dans le bloc Acquisition`, /Visites \(Google Analytics\)/.test(t) && /4 demande\(s\), soit 4,0 %/.test(t));
    await ctx.close();
  }
  {
    const { ctx, page } = await ouvrir(vue, "/", { analytics: [] });
    ok(`[${vue}] Tableau de bord sans GA : pas de ligne Visites`, !/Visites \(Google Analytics\)/.test(await page.locator("body").innerText()));
    await ctx.close();
  }
}
// ---- Collaborateur
{
  const { ctx, page } = await ouvrir("desktop", "/systeme/integrations", { role: "collaborateur" });
  ok("Collaborateur : ni connexion ni réglages GA4", (await page.getByRole("button", { name: "Connecter Google" }).count()) === 0 && await page.getByLabel("Identifiant de propriété").isDisabled() && /Seul un administrateur peut connecter/.test(await page.locator("body").innerText()));
  await ctx.close();
}
await nav.close();
ok("Aucune erreur JavaScript", erreurs.length === 0, erreurs);
for (const x of res) console.log(x.ok ? "OK   " : "ÉCHEC", x.n, x.ok ? "" : JSON.stringify(x.d)?.slice(0, 300));
console.log(`${res.filter((x) => x.ok).length} / ${res.length} tests back-office conformes`);
