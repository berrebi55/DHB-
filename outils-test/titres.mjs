import { chromium } from "playwright";
import fs from "node:fs"; import path from "node:path";
const D = process.argv[2];
const b = await chromium.launch({ channel: "chrome" }); const c = await b.newContext({ viewport: { width: 1366, height: 900 } });
await c.route("http://s.test/**", (r) => { let f = path.join(D, "sites", new URL(r.request().url()).pathname); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f += "/index.html"; return fs.existsSync(f) ? r.fulfill({ body: fs.readFileSync(f), contentType: f.endsWith(".css") ? "text/css" : f.endsWith(".js") ? "application/javascript" : "text/html" }) : r.fulfill({ status: 404, body: "" }); });
await c.route(/supabase\.co|googletag/, (r) => r.abort());
const p = await c.newPage();
for (const u of ["/infogerance/pannes-frequentes/acces-refuse-dossier-partage/", "/particuliers/aide/aider-un-proche-age-a-distance/", "/infogerance/services/", "/particuliers/abonnement/", "/groupe/"]) {
  await p.goto("http://s.test" + u); await p.addStyleTag({ content: ".cookie-banner{display:none!important}.reveal{opacity:1!important;transform:none!important}" });
  const r = await p.evaluate(() => [...document.querySelectorAll("h2.h3, h3, .footer-col h2")].slice(0, 3).map((h) => { const s = getComputedStyle(h); return `${h.tagName}.${h.className} ${s.fontSize} ${s.fontWeight} ${s.fontFamily.split(",")[0]}`; }));
  console.log(u, r);
}
await p.goto("http://s.test/infogerance/pannes-frequentes/acces-refuse-dossier-partage/"); await p.addStyleTag({ content: ".cookie-banner{display:none!important}.reveal{opacity:1!important;transform:none!important}" });
await p.locator(".card").first().scrollIntoViewIfNeeded(); await p.screenshot({ path: "apres/captures/zoom-cartes-panne.png" });
await p.locator("footer").scrollIntoViewIfNeeded(); await p.screenshot({ path: "apres/captures/zoom-pied.png" });
await b.close();
