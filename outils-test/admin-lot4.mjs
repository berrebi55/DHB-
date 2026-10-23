// Tests navigateur du lot 4 dans le back-office (faux Supabase en mémoire).
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { brancher, CLE_SESSION, session, HOTE, donnees } from "./faux-supabase.mjs";

const DIST = process.argv[2];
const AXE = fs.readFileSync(path.resolve("node_modules/axe-core/axe.min.js"), "utf8");
const res = [];
const ok = (nom, cond, detail) => res.push({ nom, ok: !!cond, detail });
const LEAD = "00000001-0000-4000-8000-000000000001";
const CLIENT = "00000002-0000-4000-8000-000000000001";

const attribution = { source: "publicite", utm_source: "google", utm_medium: "cpc", utm_campaign: "infogerance-93", utm_term: "maintenance informatique", gclid: "ABC", referrer: "www.google.com", landing_page: "/services/" };
const nav = await chromium.launch({ channel: "chrome" });
const erreurs = [];
const envois = [];

async function ouvrir(vue, chemin) {
  const ctx = await nav.newContext(vue === "mobile" ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 900 } });
  await brancher(ctx);
  // Surcharges du faux Supabase pour ce lot (enregistrées après : prioritaires).
  await ctx.route(`${HOTE}/rest/v1/**`, async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-expose-headers": "content-range" };
    if (req.method() === "DELETE" && u.pathname.endsWith("/clients"))
      return route.fulfill({ status: 403, headers: cors, contentType: "application/json", body: JSON.stringify({ code: "42501", message: "Ce client a un historique (notes) : archivez-le au lieu de le supprimer." }) });
    if (["POST", "PATCH"].includes(req.method())) {
      envois.push({ m: req.method(), t: u.pathname.split("/").pop(), corps: JSON.parse(req.postData() || "{}") });
      const corps = JSON.parse(req.postData() || "{}");
      return route.fulfill({ status: 201, headers: cors, contentType: "application/json", body: JSON.stringify([{ id: "nouveau", created_at: new Date().toISOString(), ...(Array.isArray(corps) ? corps[0] : corps) }]) });
    }
    if (req.method() === "GET" && /\/(leads|notes)$/.test(u.pathname)) {
      const t = u.pathname.split("/").pop();
      const enrichir = (x, i) => t === "leads"
        ? { ...x, ...(i === 0 ? attribution : i === 1 ? { source: "recherche", referrer: "www.bing.com", landing_page: "/" } : i === 2 ? { source: "telephone" } : { source: null }) }
        : { ...x, body: x.contenu, type: ["appel", "note", "email", "rendez_vous", "note"][i % 5] };
      let rows = donnees(t).map(enrichir);
      const id = u.searchParams.get("id");
      if (id && id.startsWith("eq.")) rows = [rows.find((x) => x.id === id.slice(3)) ?? { ...rows[0], id: id.slice(3) }];
      const h = { ...cors, "content-range": `0-${rows.length - 1}/${rows.length}` };
      if ((req.headers()["accept"] || "").includes("vnd.pgrst.object")) return route.fulfill({ status: 200, headers: h, contentType: "application/json", body: JSON.stringify(rows[0]) });
      return route.fulfill({ status: 200, headers: h, contentType: "application/json", body: JSON.stringify(rows) });
    }
    return route.fallback();
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
async function axe(page) {
  return page.evaluate(async (src) => {
    if (!window.axe) { const s = document.createElement("script"); s.textContent = src; document.head.appendChild(s); }
    const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] } });
    return r.violations.filter((v) => !["aria-required-children", "empty-table-header"].includes(v.id)).map((v) => `${v.id}(${v.nodes.length})`);
  }, AXE);
}
const debord = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

for (const vue of ["desktop", "mobile"]) {
  // Fiche demande : panneau « Origine du contact ».
  {
    const { ctx, page } = await ouvrir(vue, `/leads/${LEAD}`);
    const txt = await page.locator("body").innerText();
    ok(`[${vue}] Fiche demande : origine affichée`, /Origine du contact/.test(txt) && /Publicité en ligne/.test(txt), "");
    ok(`[${vue}] Fiche demande : campagne, mot-clé, clic Ads, venu de, page d'arrivée`, ["infogerance-93", "maintenance informatique", "Clic Google Ads", "www.google.com", "/services/"].every((m) => txt.includes(m)));
    const v = await axe(page); ok(`[${vue}] Fiche demande : axe-core sans défaut`, v.length === 0, v);
    ok(`[${vue}] Fiche demande : pas de débordement`, !(await debord(page)));
    await page.screenshot({ path: `lot4/fiche-demande-${vue}.png`, fullPage: true });
    if (vue === "desktop") {
      envois.length = 0;
      await page.locator("label", { hasText: /^Origine/ }).locator(".ant-select-selector").click();
      await page.locator(".ant-select-item-option", { hasText: "Recommandation" }).click();
      await page.waitForTimeout(500);
      ok("Fiche demande : changer l'origine enregistre source=recommandation", envois.some((e) => e.t === "leads" && e.corps.source === "recommandation"), envois);
    }
    await ctx.close();
  }
  // Liste des demandes : filtre et origine sous le site.
  {
    const { ctx, page } = await ouvrir(vue, `/leads`);
    const txt = await page.locator("body").innerText();
    ok(`[${vue}] Liste : filtre « Origine du contact » présent`, (await page.getByLabel("Filtrer : origine du contact").count()) > 0);
    if (vue === "desktop") ok("Liste : origine affichée sous le site", /Publicité en ligne/.test(txt) && /Appel téléphonique/.test(txt));
    const v = await axe(page); ok(`[${vue}] Liste : axe-core sans défaut`, v.length === 0, v);
    ok(`[${vue}] Liste : pas de débordement`, !(await debord(page)));
    await ctx.close();
  }
  // Filtre par l'adresse : ?source=inconnue → requête « source is null ».
  if (vue === "desktop") {
    const { ctx, page } = await ouvrir(vue, `/leads?source=inconnue`);
    const urls = [];
    page.on("request", (r) => urls.push(r.url()));
    await page.reload({ waitUntil: "networkidle" });
    ok("Liste : filtre « Non renseignée » → source is null", urls.some((u) => /\/leads\?.*source=is\.null/.test(u)), urls.filter((u) => u.includes("/leads?")).slice(0, 2));
    await ctx.close();
  }
  // Fiche client : fil chronologique.
  {
    const { ctx, page } = await ouvrir(vue, `/clients/${CLIENT}?onglet=historique`);
    const txt = await page.locator("body").innerText();
    ok(`[${vue}] Fil client : journal + appels/emails/rendez-vous réunis`, /Appel/.test(txt) && /Rendez-vous/.test(txt) && /Nouvelle demande|Devis modifié/.test(txt), "");
    ok(`[${vue}] Fil client : pas de doublon « Note ajoutée »`, !/Note ajoutée/.test(txt));
    await page.getByText("Échanges", { exact: true }).click(); await page.waitForTimeout(300);
    const t2 = await page.locator(".feed").innerText();
    ok(`[${vue}] Fil client : filtre Échanges = notes seulement`, /Appel/.test(t2) && !/Devis modifié|Nouvelle demande/.test(t2));
    await page.getByText("Tout", { exact: true }).click(); await page.waitForTimeout(300);
    const v = await axe(page); ok(`[${vue}] Fil client : axe-core sans défaut`, v.length === 0, v);
    ok(`[${vue}] Fil client : pas de débordement`, !(await debord(page)));
    await page.screenshot({ path: `lot4/fil-client-${vue}.png`, fullPage: true });
    await ctx.close();
  }
  // Fiche client : enregistrer un appel.
  if (vue === "desktop") {
    const { ctx, page } = await ouvrir(vue, `/clients/${CLIENT}?onglet=notes`);
    envois.length = 0;
    await page.locator(".ant-segmented-item", { hasText: "Appel" }).first().click();
    const zone = page.getByLabel("Nouvelle note");
    ok("Notes : texte d'aide adapté à l'appel", /Résumé de l'appel/.test(await zone.getAttribute("placeholder")));
    await zone.fill("Client rappelé, devis à envoyer lundi");
    await page.getByRole("button", { name: "Ajouter", exact: true }).click(); await page.waitForTimeout(500);
    const e = envois.find((x) => x.t === "notes");
    ok("Notes : l'appel est enregistré avec type=appel et le client", e && e.corps.type === "appel" && e.corps.client_id === CLIENT, e);
    const v = await axe(page); ok("Notes : axe-core sans défaut", v.length === 0, v);
    await ctx.close();
  }
  // Suppression d'un client avec historique : message clair.
  if (vue === "desktop") {
    const { ctx, page } = await ouvrir(vue, `/clients/${CLIENT}`);
    await page.getByLabel("Plus d'actions").click();
    await page.getByText("Supprimer définitivement").click();
    const dlg = await page.locator(".ant-modal-confirm").innerText();
    ok("Suppression : la fenêtre explique « fiche vide seulement »", /fiche vide/.test(dlg));
    await page.locator(".ant-modal-confirm .ant-btn-dangerous").click(); await page.waitForTimeout(800);
    const msg = await page.locator(".ant-message").innerText().catch(() => "");
    ok("Suppression refusée : message de la base affiché tel quel", /archivez-le au lieu de le supprimer/.test(msg), msg);
    ok("Suppression refusée : on reste sur la fiche", page.url().includes(CLIENT));
    await ctx.close();
  }
  // Pilotage : demandes par origine.
  {
    const { ctx, page } = await ouvrir(vue, `/pilotage/commercial`);
    await page.getByText("Depuis le début").click(); await page.waitForTimeout(400);
    const txt = await page.locator("body").innerText();
    ok(`[${vue}] Pilotage : tableau « Demandes par origine du contact »`, /Demandes par origine du contact/.test(txt) && /Publicité en ligne/.test(txt) && /Non renseignée/.test(txt));
    const v = await axe(page); ok(`[${vue}] Pilotage : axe-core sans défaut`, v.length === 0, v);
    ok(`[${vue}] Pilotage : pas de débordement`, !(await debord(page)));
    await page.screenshot({ path: `lot4/pilotage-${vue}.png`, fullPage: true });
    await ctx.close();
  }
}
await nav.close();
ok("Aucune erreur JavaScript", erreurs.length === 0, erreurs);
for (const r of res) console.log(r.ok ? "OK   " : "ÉCHEC", r.nom, r.ok ? "" : JSON.stringify(r.detail ?? "").slice(0, 300));
console.log(`${res.filter((r) => r.ok).length} / ${res.length} tests back-office conformes`);
