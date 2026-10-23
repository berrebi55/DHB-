// Lot 13 : le back-office charge Inter depuis ses propres fichiers (aucune requête Google).
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { brancher, CLE_SESSION, session } from "./faux-supabase.mjs";
const DIST = process.argv[2];
const nav = await chromium.launch({ channel: "chrome" });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 900 } });
await brancher(ctx);
const hotes = new Set();
await ctx.route("http://admin.test/**", (r) => {
  let f = path.join(DIST, new URL(r.request().url()).pathname);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, "index.html");
  const ext = path.extname(f);
  return r.fulfill({ body: fs.readFileSync(f), contentType: { ".js": "application/javascript", ".css": "text/css", ".woff2": "font/woff2" }[ext] || "text/html" });
});
const page = await ctx.newPage();
page.on("request", (q) => hotes.add(new URL(q.url()).host));
await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [CLE_SESSION, JSON.stringify(session())]);
for (const chemin of ["/login", "/"]) {
  await page.goto("http://admin.test" + chemin, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
}
const polices = await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/"/g, "")); });
const famille = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
const r = [
  ["Police « Inter Variable » chargée depuis l'application", polices.includes("Inter Variable"), polices],
  ["Texte affiché en Inter", /Inter Variable/.test(famille), famille],
  ["Aucune requête vers Google", ![...hotes].some((h) => /google|gstatic/.test(h)), [...hotes]],
];
await nav.close();
for (const [n, c, d] of r) console.log(c ? "OK   " : "ÉCHEC", n, c ? "" : JSON.stringify(d));
console.log(`${r.filter((x) => x[1]).length} / ${r.length} tests polices du back-office conformes`);
