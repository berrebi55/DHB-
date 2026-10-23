// Tests navigateur du lot 11 : Google Drive (Intégrations, fiche client, documents).
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { brancher, CLE_SESSION, session, HOTE, donnees } from "./faux-supabase.mjs";

const DIST = process.argv[2];
const AXE = fs.readFileSync(path.resolve("node_modules/axe-core/axe.min.js"), "utf8");
const res = []; const ok = (n, c, d) => res.push({ n, ok: !!c, d });
const nav = await chromium.launch({ channel: "chrome" });
const erreurs = []; const appels = [];
const CL = "00000002-0000-4000-8000-000000000001";
const SOUS = ["01 - Devis", "02 - Factures", "03 - Contrats et abonnements", "04 - Parc informatique", "05 - Interventions", "06 - Échanges", "07 - Documents du client", "08 - Divers"];

async function ouvrir(vue, chemin, o = {}) {
  const { actif = true, connecte = true, client = {} } = o;
  const ctx = await nav.newContext(vue === "mobile" ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 900 } });
  await brancher(ctx);
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "access-control-expose-headers": "content-range" };
  const json = (r, b) => r.fulfill({ status: 200, headers: { ...cors, "content-range": `0-${Math.max((b.length ?? 1) - 1, 0)}/${b.length ?? 1}` }, contentType: "application/json", body: JSON.stringify(b) });
  const INTEG = [
    { cle: "google", statut: connecte ? "connecte" : "non_configure", compte: connecte ? "proprio@gmail.com" : null, details: {}, derniere_synchro: null, erreur: null },
    { cle: "ga4", statut: "non_configure", compte: null, details: {}, derniere_synchro: null, erreur: null },
    { cle: "drive", statut: actif ? "connecte" : "non_configure", compte: null, details: { actif, sous_dossiers: SOUS }, derniere_synchro: null, erreur: null },
  ];
  await ctx.route(`${HOTE}/rest/v1/integrations**`, (r) => {
    if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: cors });
    if (r.request().method() === "PATCH") { appels.push({ f: "patch", url: r.request().url(), corps: JSON.parse(r.request().postData() || "{}") }); return r.fulfill({ status: 204, headers: cors }); }
    const cle = new URL(r.request().url()).searchParams.get("cle");
    return json(r, cle ? INTEG.filter((i) => `eq.${i.cle}` === cle) : INTEG);
  });
  for (const t of ["integration_logs", "stripe_evenements", "emails", "analytics_quotidien"]) await ctx.route(`${HOTE}/rest/v1/${t}**`, (r) => json(r, []));
  await ctx.route(new RegExp(`${HOTE.replace(/\./g, "\\.")}/rest/v1/(clients|clients_vue)\\?`), (r) => {
    const rows = donnees("clients").map((c) => ({ ...c, ...(c.id === CL ? client : {}) }));
    const id = new URL(r.request().url()).searchParams.get("id");
    const sel = id ? rows.filter((x) => `eq.${x.id}` === id) : rows;
    if ((r.request().headers()["accept"] || "").includes("vnd.pgrst.object")) return r.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify(sel[0]) });
    return json(r, sel);
  });
  await ctx.route(`${HOTE}/rest/v1/documents**`, (r) => json(r, [
    { id: "dd000000-0000-4000-8000-000000000001", created_at: "2026-10-20T09:00:00Z", updated_at: "2026-10-20T09:00:00Z", type: "facture", numero: "2026-0001", nom_fichier: "Facture-2026-0001.pdf", taille_octets: 2713, drive_file_id: "f12", drive_erreur: null },
    { id: "dd000000-0000-4000-8000-000000000002", created_at: "2026-10-18T09:00:00Z", updated_at: "2026-10-21T09:00:00Z", type: "devis", numero: "DEV-2026-0003", nom_fichier: "Devis-DEV-2026-0003.pdf", taille_octets: 2318, drive_file_id: null, drive_erreur: "Google Drive momentanément indisponible (503)" },
  ]));
  await ctx.route(`${HOTE}/functions/v1/**`, (r) => {
    if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: cors });
    const nom = new URL(r.request().url()).pathname.split("/").pop(); const c = JSON.parse(r.request().postData() || "{}");
    appels.push({ f: nom, corps: c });
    const rep = nom === "drive-sync" ? (c.tous ? { ok: true, dossiers: 3, copies: 5, erreurs: 0, restants: 0 } : { ok: true, url: "https://drive.google.com/drive/folders/x", copies: 2 })
      : nom === "integration-test" ? { secrets: { google: true } } : {};
    return r.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify(rep) });
  });
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
  {
    const { ctx, page } = await ouvrir(vue, "/systeme/integrations");
    const carte = page.locator("section.panel", { has: page.locator("h2", { hasText: "Google Drive" }) });
    const t = await carte.innerText();
    ok(`[${vue}] Carte Drive : activée, 8 sous-dossiers affichés, rôle des 2 premiers expliqué`, /Activé/.test(t) && (await carte.getByRole("textbox").count()) === 8 && /le 1er reçoit les devis, le 2e les factures/.test(t));
    const v = await axe(page); ok(`[${vue}] Intégrations : axe-core sans défaut`, v.length === 0, v);
    ok(`[${vue}] Intégrations : pas de débordement`, !(await debord(page)));
    if (vue === "desktop") {
      appels.length = 0;
      await carte.getByLabel("Sous-dossier 3", { exact: true }).fill("03 - Contrats");
      await carte.getByLabel("Retirer le sous-dossier 8").click();
      await carte.getByRole("button", { name: "Enregistrer" }).click(); await page.waitForTimeout(600);
      const p = appels.find((a) => a.f === "patch");
      ok("Drive : sous-dossier renommé et un retiré → enregistrés (7), activation conservée", p && /cle=eq\.drive/.test(p.url) && p.corps.details.sous_dossiers.length === 7 && p.corps.details.sous_dossiers[2] === "03 - Contrats" && p.corps.details.actif === true, p);
      for (let i = 7; i > 2; i--) await carte.getByLabel(`Retirer le sous-dossier ${i}`).click();
      ok("Drive : impossible de descendre sous 2 sous-dossiers", await carte.getByLabel("Retirer le sous-dossier 2").isDisabled());
      await carte.getByRole("button", { name: "Créer les dossiers des clients existants" }).click(); await page.waitForTimeout(600);
      ok("Rattrapage : appelé, bilan affiché", appels.some((a) => a.f === "drive-sync" && a.corps.tous === true) && /3 dossier\(s\) créé\(s\), 5 PDF copié\(s\)/.test(await page.locator(".ant-message").innerText()));
    }
    await ctx.close();
  }
  {
    const { ctx, page } = await ouvrir(vue, "/systeme/integrations", { actif: false, connecte: false });
    const carte = page.locator("section.panel", { has: page.locator("h2", { hasText: "Google Drive" }) });
    ok(`[${vue}] Google non connecté : activation de Drive impossible, explication`, await carte.getByRole("switch").isDisabled() && /Connectez d'abord le compte Google/.test(await carte.innerText()));
    await ctx.close();
  }
  // ---- Fiche client
  {
    const { ctx, page } = await ouvrir(vue, `/clients/${CL}`, { client: { drive_folder_url: "https://drive.google.com/drive/folders/abc", drive_sync_statut: "a_jour" } });
    const lien = page.getByRole("link", { name: /Ouvrir le dossier/ });
    ok(`[${vue}] Fiche client : lien « Ouvrir le dossier » (nouvel onglet, sécurisé)`, (await lien.getAttribute("href")) === "https://drive.google.com/drive/folders/abc" && (await lien.getAttribute("target")) === "_blank" && /noopener/.test(await lien.getAttribute("rel")));
    const v = await axe(page); ok(`[${vue}] Fiche client : axe-core sans défaut`, v.length === 0, v);
    ok(`[${vue}] Fiche client : pas de débordement`, !(await debord(page)));
    await ctx.close();
  }
  {
    const { ctx, page } = await ouvrir(vue, `/clients/${CL}`, { client: { drive_folder_url: null, drive_sync_statut: "erreur", drive_erreur: "Accès à Google Drive refusé : reconnectez le compte Google." } });
    const t = await page.locator("body").innerText();
    ok(`[${vue}] Fiche client en erreur : raison affichée + « Réessayer »`, /Accès à Google Drive refusé/.test(t) && (await page.getByRole("button", { name: "Réessayer" }).count()) === 1);
    appels.length = 0;
    await page.getByRole("button", { name: "Réessayer" }).click(); await page.waitForTimeout(700);
    ok(`[${vue}] « Réessayer » : drive-sync pour ce client, confirmation`, appels.some((a) => a.f === "drive-sync" && a.corps.client_id === CL) && /Dossier Drive à jour \(2 PDF copié\(s\)\)/.test(await page.locator(".ant-message").innerText()));
    await ctx.close();
  }
  {
    const { ctx, page } = await ouvrir(vue, `/clients/${CL}`, { actif: false });
    ok(`[${vue}] Drive désactivé : aucune ligne Google Drive sur la fiche`, !/Google Drive/.test(await page.locator("body").innerText()));
    await ctx.close();
  }
  {
    const { ctx, page } = await ouvrir(vue, `/clients/${CL}?onglet=documents`);
    const t = await page.locator("body").innerText();
    ok(`[${vue}] Documents : copie Drive indiquée, erreur de copie expliquée`, /copié dans Google Drive/.test(t) && /copie Drive en erreur : Google Drive momentanément indisponible/.test(t));
    await ctx.close();
  }
}
await nav.close();
ok("Aucune erreur JavaScript", erreurs.length === 0, erreurs);
for (const x of res) console.log(x.ok ? "OK   " : "ÉCHEC", x.n, x.ok ? "" : JSON.stringify(x.d)?.slice(0, 300));
console.log(`${res.filter((x) => x.ok).length} / ${res.length} tests back-office conformes`);
