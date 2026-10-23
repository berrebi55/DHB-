// Tests navigateur du lot 4 : origine de la visite jointe aux demandes.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
const DEPOT = process.argv[2];
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "application/javascript", ".svg": "image/svg+xml" };
const res = [];
const ok = (nom, cond, detail) => res.push({ nom, ok: !!cond, detail });

async function contexte(nav, { refus = false, consentement = null } = {}) {
  const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
  const envois = [];
  // Deux « domaines » DHB servis depuis le dépôt + un faux moteur de recherche.
  for (const hote of ["pro.dhb.test", "assistance.dhb.test"]) {
    await ctx.route(`http://${hote}/**`, (r) => {
      const u = new URL(r.request().url());
      const site = hote.startsWith("pro") ? "infogerance" : "particuliers";
      let f = path.join(DEPOT, "sites", site, decodeURIComponent(u.pathname));
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
      if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: "" });
      return r.fulfill({ status: 200, contentType: TYPES[path.extname(f)] || "application/octet-stream", body: fs.readFileSync(f) });
    });
  }
  await ctx.route("http://www.google.test/**", (r) => r.fulfill({ contentType: "text/html", body: `<a id="l" href="${new URL(r.request().url()).searchParams.get("q")}">résultat</a>` }));
  await ctx.route("https://yjnaxzlvuwrvyyqxnvgn.supabase.co/**", async (r) => {
    const req = r.request();
    const h = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
    if (req.method() === "OPTIONS") return r.fulfill({ status: 204, headers: h });
    if (req.method() === "POST" && req.url().includes("/rest/v1/leads")) {
      const corps = JSON.parse(req.postData() || "{}");
      envois.push(corps);
      if (refus && "landing_page" in corps)
        return r.fulfill({ status: 400, headers: h, contentType: "application/json", body: JSON.stringify({ code: "PGRST204", message: "Could not find the 'landing_page' column of 'leads' in the schema cache" }) });
      return r.fulfill({ status: 201, headers: h, body: "" });
    }
    return r.fulfill({ status: 200, headers: h, contentType: "application/json", body: "[]" });
  });
  await ctx.route(/googletagmanager/, (r) => r.abort());
  if (consentement) await ctx.addInitScript((v) => { try { localStorage.setItem("dhb-cookie-consent", v); } catch (e) {} ; if (v === "accepted") document.cookie = "_ga=GA1.1.1234567890.1700000000; path=/"; }, consentement);
  return { ctx, envois };
}

async function envoyer(page) {
  const form = page.locator("form[data-demo-form]").first();
  await form.locator('[name="nom"]').fill("Test Lot4");
  const email = form.locator('[name="email"]');
  if (await email.count()) await email.fill("test@exemple.fr");
  const tel = form.locator('[name="telephone"]');
  if (await tel.count()) await tel.fill("0102030405");
  const msg = form.locator('[name="message"]');
  if (await msg.count()) await msg.fill("Bonjour");
  for (const cb of await form.locator('input[type="checkbox"][required]').all()) await cb.check();
  await page.waitForTimeout(3200);   // délai anti-robot
  await form.locator('button[type="submit"]').click();
  await page.waitForTimeout(800);
  return { ok: await form.locator(".form-ok.show").count(), err: await form.locator(".form-err").count() };
}

const nav = await chromium.launch({ channel: "chrome" });
const erreurs = [];

// 1) Arrivée par une campagne, navigation interne, puis envoi depuis une autre page.
{
  const { ctx, envois } = await contexte(nav);
  const p = await ctx.newPage(); p.on("pageerror", (e) => erreurs.push(e.message));
  await p.goto("http://pro.dhb.test/services/?utm_source=google&utm_medium=cpc&utm_campaign=infogerance-93&gclid=ABC123");
  await p.goto("http://pro.dhb.test/contact/");
  const r = await envoyer(p);
  const e = envois[0] || {};
  ok("Campagne : demande envoyée et confirmée", r.ok && envois.length === 1);
  ok("Campagne : paramètres transmis", e.utm_source === "google" && e.utm_medium === "cpc" && e.utm_campaign === "infogerance-93" && e.gclid === "ABC123", e);
  ok("Campagne : page d'arrivée = première page de la visite", e.landing_page === "/services/", e.landing_page);
  ok("Campagne : source_url = page du formulaire, sans paramètres", e.source_url === "/contact/", e.source_url);
  ok("Visiteur : la source n'est jamais envoyée par le site", !("source" in e));
  ok("Sans consentement : aucun identifiant GA4", !("ga_client_id" in e));
  await ctx.close();
}
// 2) Arrivée depuis un moteur de recherche (site d'origine = domaine seulement).
{
  const { ctx, envois } = await contexte(nav);
  const p = await ctx.newPage(); p.on("pageerror", (e) => erreurs.push(e.message));
  await p.goto("http://www.google.test/search?q=" + encodeURIComponent("http://pro.dhb.test/contact/?x=1"));
  await p.click("#l"); await p.waitForLoadState("load");
  await envoyer(p);
  const e = envois[0] || {};
  ok("Moteur de recherche : site d'origine = domaine seul", e.referrer === "www.google.test", e.referrer);
  ok("Moteur de recherche : pas de paramètre de campagne inventé", !e.utm_source && !e.gclid);
  await ctx.close();
}
// 3) Mesure d'audience acceptée : identifiant GA4 joint.
{
  const { ctx, envois } = await contexte(nav, { consentement: "accepted" });
  const p = await ctx.newPage(); p.on("pageerror", (e) => erreurs.push(e.message));
  await p.goto("http://assistance.dhb.test/contact/");
  await envoyer(p);
  ok("Consentement accepté : identifiant GA4 joint", (envois[0] || {}).ga_client_id === "1234567890.1700000000", envois[0]);
  await ctx.close();
}
// 4) Base pas encore mise à jour (colonne inconnue) : la demande est renvoyée sans l'origine.
{
  const { ctx, envois } = await contexte(nav, { refus: true });
  const p = await ctx.newPage(); p.on("pageerror", (e) => erreurs.push(e.message));
  await p.goto("http://pro.dhb.test/contact/?utm_source=newsletter");
  const r = await envoyer(p);
  ok("Base non mise à jour : 2e envoi sans les champs d'origine", envois.length === 2 && !("landing_page" in envois[1]) && envois[1].nom === "Test Lot4", envois.length);
  ok("Base non mise à jour : le visiteur voit la confirmation", r.ok && !r.err);
  await ctx.close();
}
// 5) Anti-robot inchangé : envoi trop rapide → rien n'est transmis.
{
  const { ctx, envois } = await contexte(nav);
  const p = await ctx.newPage();
  await p.goto("http://pro.dhb.test/contact/");
  const form = p.locator("form[data-demo-form]").first();
  await form.locator('[name="nom"]').fill("Robot"); await form.locator('[name="email"]').fill("r@exemple.fr");
  for (const cb of await form.locator('input[type="checkbox"][required]').all()) await cb.check();
  await form.locator('button[type="submit"]').click(); await p.waitForTimeout(500);
  ok("Anti-robot : envoi < 3 s non transmis", envois.length === 0);
  await ctx.close();
}
await nav.close();
ok("Aucune erreur JavaScript", erreurs.length === 0, erreurs);
for (const r of res) console.log(r.ok ? "OK   " : "ÉCHEC", r.nom, r.ok ? "" : JSON.stringify(r.detail));
console.log(`${res.filter((r) => r.ok).length} / ${res.length} tests navigateur conformes`);
fs.writeFileSync("lot4-envois.json", "");
