// Lot 16 dans un vrai navigateur : outils interactifs, guides (type « guide »), mesure d'audience.
// Supabase et Google sont interceptés : rien n'est envoyé à l'extérieur.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const DEPOT = process.argv[2];
const AXE = fs.readFileSync(path.resolve("node_modules/axe-core/axe.min.js"), "utf8");
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "application/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".pdf": "application/pdf" };
const DOSSIERS = { pro: "infogerance", assistance: "particuliers" };
const res = []; const ok = (n, c, d) => res.push({ n, ok: !!c, d });
const nav = await chromium.launch({ channel: "chrome" });
const erreursJs = [];

async function ouvrir(cle, chemin, { vue = "desktop", consent = "refused" } = {}) {
  const racine = path.join(DEPOT, "sites", DOSSIERS[cle]);
  const ctx = await nav.newContext(vue === "mobile" ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 900 } });
  const envois = [], externes = [];
  await ctx.route("**/*", async (r) => {
    const u = new URL(r.request().url());
    if (u.host.endsWith(".supabase.co")) {
      if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
      if (r.request().method() === "POST") envois.push({ chemin: u.pathname, corps: JSON.parse(r.request().postData() || "{}") });
      return r.fulfill({ status: 201, headers: { "access-control-allow-origin": "*" }, contentType: "application/json", body: "[]" });
    }
    if (u.host !== `${cle}.test`) { externes.push(u.host); return r.abort(); }
    let f = path.join(racine, decodeURIComponent(u.pathname));
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
    if (!fs.existsSync(f)) return r.fulfill({ status: 404, contentType: TYPES[".html"], body: fs.readFileSync(path.join(racine, "404.html")) });
    let corps = fs.readFileSync(f);
    // Mesure d'audience « configurée » pour le test (identifiant factice) : les événements restent dans dataLayer.
    if (f.endsWith("suivi.js")) corps = Buffer.from(corps.toString().replace("var GA_ID = 'G-XXXXXXXXXX'", "var GA_ID = 'G-TEST000000'"));
    return r.fulfill({ status: 200, contentType: TYPES[path.extname(f)] || "application/octet-stream", body: corps });
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erreursJs.push(`${chemin}: ${e.message}`));
  await page.addInitScript((c) => { try { localStorage.setItem("dhb-cookie-consent", c); } catch {} }, consent);
  await page.goto(`http://${cle}.test${chemin}`, { waitUntil: "networkidle" });
  return { ctx, page, envois, externes };
}
const axe = (page) => page.evaluate(async (src) => {
  if (!window.axe) { const s = document.createElement("script"); s.textContent = src; document.head.appendChild(s); }
  const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] } });
  return r.violations.map((v) => `${v.id}(${v.nodes.length}): ${v.nodes[0]?.target}`);
}, AXE);
const evenements = (page) => page.evaluate(() => (window.dataLayer || []).filter((a) => a[0] === "event").map((a) => ({ nom: a[1], p: a[2] })));
const debord = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
const statut = (page, href) => page.evaluate(async (h) => (await fetch(h)).status, href);

// 1. Auto-diagnostic sécurité (Pro)
for (const vue of ["desktop", "mobile"]) {
  const { ctx, page } = await ouvrir("pro", "/outils/auto-diagnostic-securite/", { vue, consent: "accepted" });
  ok(`[${vue}] Diagnostic : 7 questions × 3 réponses, libellés accessibles`, (await page.locator("fieldset.outil-question").count()) === 7 && (await page.getByRole("radio").count()) === 21);
  let v = await axe(page); ok(`[${vue}] Diagnostic : axe-core sans défaut`, v.length === 0, v);
  // Réponses : oui partout sauf point 1 (non) et point 3 (je ne sais pas)
  for (let i = 1; i <= 7; i++) await page.locator(`input[name="p${i}"][value="${i === 1 ? "non" : i === 3 ? "nsp" : "oui"}"]`).check();
  await page.getByRole("button", { name: "Voir mon résultat" }).click();
  const r = page.locator("#diag-resultat");
  const t = await r.innerText();
  ok(`[${vue}] Résultat : « 5 points sur 7 en place », 2 points à renforcer dont 1 « à vérifier »`, /5 points sur 7 en place/.test(t) && (await r.locator("li").count()) === 2 && /\(à vérifier\)/.test(t), t.slice(0, 300));
  ok(`[${vue}] Résultat : « À faire » repris de la checklist`, /À faire : déployer un gestionnaire de mots de passe pour l'équipe\./.test(t) && /À faire : vérifier qu'une sauvegarde se restaure réellement\./.test(t));
  ok(`[${vue}] Focus déplacé sur le titre du résultat`, await page.evaluate(() => document.activeElement === document.querySelector("#diag-resultat h2")));
  const liens = await r.locator("a").evaluateAll((as) => as.map((a) => a.href));
  const st = []; for (const h of liens) st.push(await statut(page, h));
  ok(`[${vue}] Liens « pour aller plus loin » valides (${st.join(", ")})`, st.length === 2 && st.every((s) => s === 200), liens);
  v = await axe(page); ok(`[${vue}] Résultat affiché : axe-core sans défaut, sans débordement`, v.length === 0 && !(await debord(page)), v);
  const ev = (await evenements(page)).find((e) => e.nom === "outil_termine");
  ok(`[${vue}] Mesure (consentement accepté) : outil_termine, score 5, rien de personnel`, ev && ev.p.outil === "diagnostic_securite" && ev.p.score === 5 && Object.keys(ev.p).sort().join() === "outil,page,score,site", ev);
  if (vue === "desktop") {
    for (let i = 1; i <= 7; i++) await page.locator(`input[name="p${i}"][value="oui"]`).check();
    await page.getByRole("button", { name: "Voir mon résultat" }).click();
    ok("Tout « oui » : « 7 points sur 7 en place », aucune liste", /7 points sur 7 en place/.test(await r.innerText()) && (await r.locator("li").count()) === 0);
  }
  await ctx.close();
}
{
  const { ctx, page, externes } = await ouvrir("pro", "/outils/auto-diagnostic-securite/", { consent: "refused" });
  for (let i = 1; i <= 7; i++) await page.locator(`input[name="p${i}"][value="oui"]`).check();
  await page.getByRole("button", { name: "Voir mon résultat" }).click();
  ok("Consentement refusé : aucun événement, aucune requête vers Google ; réponses jamais envoyées", (await evenements(page)).length === 0 && !externes.some((h) => /google/.test(h)));
  await ctx.close();
}
{
  const { ctx, page } = await ouvrir("pro", "/services/cybersecurite/");
  const h = await page.getByRole("link", { name: /auto-diagnostic sécurité \(7 questions\)/ }).getAttribute("href");
  ok("Page Cybersécurité : lien vers l'auto-diagnostic", h && (await statut(page, new URL(h, page.url()).pathname)) === 200, h);
  await ctx.close();
}

// 2. « Arnaque ou pas ? » (Assistance)
for (const vue of ["desktop", "mobile"]) {
  const { ctx, page } = await ouvrir("assistance", "/outils/arnaque-ou-pas/", { vue, consent: "accepted" });
  let v = await axe(page); ok(`[${vue}] Arnaque ou pas : axe-core sans défaut`, v.length === 0, v);
  // Situation 1 : piège ; 2 à 4 : bon réflexe
  const choisir = async (i, bon) => page.locator(`input[name="s${i}"][data-bon="${bon ? 1 : 0}"]`).check();
  await choisir(1, false);
  const r1 = await page.locator("fieldset").nth(0).locator(".outil-retour").innerText();
  ok(`[${vue}] Piège choisi → « Attention : c'est le piège », bon réflexe et signal d'alerte du guide`, /Attention : c’est le piège\./.test(r1) && /site officiel du transporteur/.test(r1) && /Signal d’alerte : un lien bizarre/.test(r1), r1);
  ok(`[${vue}] Réponse verrouillée après le choix`, (await page.locator('input[name="s1"]:disabled').count()) === 2);
  ok(`[${vue}] Résultat caché tant que tout n'est pas répondu`, await page.locator("#arnaques-resultat").isHidden());
  for (const i of [2, 3, 4]) await choisir(i, true);
  const r2 = await page.locator("fieldset").nth(1).locator(".outil-retour").innerText();
  ok(`[${vue}] Bon réflexe → « Bon réflexe. » + « Microsoft ne fait jamais ça »`, /Bon réflexe\./.test(r2) && /Microsoft ne fait jamais ça/.test(r2), r2);
  const fin = await page.locator("#arnaques-resultat").innerText();
  ok(`[${vue}] Bilan « 3 bons réflexes sur 4 » + les 4 réflexes du guide`, /3 bons réflexes sur 4/.test(fin) && (await page.locator("#arnaques-resultat li").count()) === 4, fin.slice(0, 200));
  const liens = await page.locator("#arnaques-resultat a").evaluateAll((as) => as.map((a) => new URL(a.href).pathname));
  const st = []; for (const h of liens) st.push(await statut(page, h));
  ok(`[${vue}] Liens vers le centre d'aide valides`, st.length === 3 && st.every((s) => s === 200), liens);
  v = await axe(page); ok(`[${vue}] Bilan affiché : axe-core sans défaut, sans débordement`, v.length === 0 && !(await debord(page)), v);
  const ev = (await evenements(page)).find((e) => e.nom === "outil_termine");
  ok(`[${vue}] Mesure : outil_termine « arnaque_ou_pas », score 3`, ev && ev.p.outil === "arnaque_ou_pas" && ev.p.score === 3, ev);
  await ctx.close();
}

// 3. Guides : type « guide », formulation exacte, mention RGPD, événement distinct.
for (const [cle, chemin] of [["pro", "/pannes-frequentes/ordinateur-ne-sallume-plus/"], ["assistance", "/aide/recuperer-photos-supprimees/"], ["pro", "/outils/auto-diagnostic-securite/"]]) {
  const { ctx, page, envois } = await ouvrir(cle, chemin, { consent: "accepted" });
  const lm = page.locator(".lead-magnet").first();
  const txt = await lm.innerText();
  ok(`[${cle}${chemin}] Guide : « pour le télécharger » (plus de promesse d'envoi), bouton « Télécharger le guide »`, /pour le télécharger/.test(txt) && !/pour le recevoir/.test(txt) && (await lm.getByRole("button", { name: "Télécharger le guide" }).count()) === 1, txt.slice(0, 200));
  const rgpd = await lm.locator(".lm-rgpd a").getAttribute("href");
  ok(`[${cle}${chemin}] Mention RGPD + lien vers la politique de confidentialité valide`, /jamais revendu/.test(txt) && (await statut(page, new URL(rgpd, page.url()).pathname)) === 200, rgpd);
  await page.waitForTimeout(3100);   // anti-robot du formulaire : pas d'envoi dans les 3 premières secondes
  await lm.getByLabel("Votre email").fill("visiteur@exemple.fr");
  await lm.getByRole("button", { name: "Télécharger le guide" }).click();
  await page.waitForTimeout(600);
  const e = envois.find((x) => x.chemin === "/rest/v1/leads");
  ok(`[${cle}${chemin}] Demande enregistrée avec type « guide »`, e && e.corps.type === "guide" && e.corps.email === "visiteur@exemple.fr", e);
  const pdf = await lm.locator(".form-ok a").getAttribute("href");
  ok(`[${cle}${chemin}] Lien de téléchargement affiché et PDF servi`, await lm.locator(".form-ok").isVisible() && (await statut(page, new URL(pdf, page.url()).pathname)) === 200, pdf);
  const evs = (await evenements(page)).map((x) => x.nom);
  ok(`[${cle}${chemin}] Mesure : telechargement_guide (et pas generate_lead)`, evs.includes("telechargement_guide") && !evs.includes("generate_lead"), evs);
  await ctx.close();
}
// Une vraie demande de contact reste une conversion generate_lead.
{
  const { ctx, page, envois } = await ouvrir("pro", "/contact/", { consent: "accepted" });
  await page.waitForTimeout(3100);
  const f = page.locator("form[data-demo-form]").first();
  await f.locator('[name="nom"]').fill("Test Lot16");
  await f.locator('[name="email"]').fill("contact@exemple.fr");
  const msg = f.locator('[name="message"]'); if (await msg.count()) await msg.fill("Besoin d'un devis");
  await f.locator('button[type="submit"]').click();
  await page.waitForTimeout(600);
  const evs = (await evenements(page)).map((x) => x.nom);
  ok("Formulaire de contact : type « devis », événement generate_lead conservé", envois.some((x) => x.corps.type === "devis") && evs.includes("generate_lead"), { envois, evs });
  await ctx.close();
}
await nav.close();
ok("Aucune erreur JavaScript", erreursJs.length === 0, erreursJs);
for (const x of res) console.log(x.ok ? "OK   " : "ÉCHEC", x.n, x.ok ? "" : JSON.stringify(x.d)?.slice(0, 300));
console.log(`${res.filter((x) => x.ok).length} / ${res.length} tests navigateur du lot 16 conformes`);
