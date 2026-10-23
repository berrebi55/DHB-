// Lot 16 côté back-office : demandes de type « guide ».
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { brancher, CLE_SESSION, session, HOTE, donnees } from "./faux-supabase.mjs";

const DIST = process.argv[2];
const AXE = fs.readFileSync(path.resolve("node_modules/axe-core/axe.min.js"), "utf8");
const res = []; const ok = (n, c, d) => res.push({ n, ok: !!c, d });
const nav = await chromium.launch({ channel: "chrome" });
const erreurs = [];
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "access-control-expose-headers": "content-range" };
// La demande n°2 est un guide téléchargé.
const leads = () => donnees("leads").map((l, i) => (i === 1 ? { ...l, type: "guide", nom: "Visiteur Guide", message: "Demande du guide « Sécurité PME »", status: "nouveau" } : l));

async function ouvrir(chemin) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 900 } });
  await brancher(ctx);
  await ctx.route(`${HOTE}/rest/v1/leads**`, (r) => {
    if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: cors });
    if (r.request().method() !== "GET") return r.fallback();
    const u = new URL(r.request().url());
    let rows = leads();
    const id = u.searchParams.get("id"); if (id?.startsWith("eq.")) rows = rows.filter((x) => x.id === id.slice(3));
    const t = u.searchParams.get("type");
    if (t === "eq.question") rows = rows.filter((x) => x.type === "question");
    if (t === "neq.question") rows = rows.filter((x) => x.type !== "question");
    const off = Number(u.searchParams.get("offset") || 0); rows = rows.slice(off);
    const h = { ...cors, "content-range": `0-${Math.max(rows.length - 1, 0)}/${rows.length}` };
    if ((r.request().headers()["accept"] || "").includes("vnd.pgrst.object")) return r.fulfill({ status: 200, headers: h, contentType: "application/json", body: JSON.stringify(rows[0]) });
    return r.fulfill({ status: 200, headers: h, contentType: "application/json", body: JSON.stringify(rows) });
  });
  await ctx.route("http://admin.test/**", (r) => {
    let f = path.join(DIST, new URL(r.request().url()).pathname);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, "index.html");
    const ext = path.extname(f);
    return r.fulfill({ body: fs.readFileSync(f), contentType: { ".js": "application/javascript", ".css": "text/css", ".woff2": "font/woff2" }[ext] || "text/html" });
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erreurs.push(`${chemin}: ${e.message}`));
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [CLE_SESSION, JSON.stringify(session())]);
  await page.goto("http://admin.test" + chemin, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  return { ctx, page };
}
const axe = (page) => page.evaluate(async (src) => {
  if (!window.axe) { const s = document.createElement("script"); s.textContent = src; document.head.appendChild(s); }
  const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] } });
  return r.violations.map((v) => `${v.id}(${v.nodes.length}): ${v.nodes[0]?.target}`);
}, AXE);

{
  const { ctx, page } = await ouvrir("/leads");
  const ligne = page.locator("tr", { hasText: "Visiteur Guide" });
  ok("Demandes : le guide apparaît avec l'étiquette « Guide téléchargé »", (await ligne.getByText("Guide téléchargé").count()) === 1);
  ok("Demandes : une seule étiquette « Guide téléchargé » (les devis n'en ont pas)", (await page.getByText("Guide téléchargé").count()) === 1);
  const v = await axe(page); ok("Demandes : axe-core sans défaut", v.length === 0, v);
  await ctx.close();
}
{
  const { ctx, page } = await ouvrir("/support/questions");
  ok("Questions reçues : le guide n'y figure pas", (await page.getByText("Visiteur Guide").count()) === 0);
  await ctx.close();
}
{
  const id = leads()[1].id;
  const { ctx, page } = await ouvrir(`/leads/${id}`);
  ok("Fiche : « Guide téléchargé — reçue le … »", /Guide téléchargé — reçue le/.test(await page.locator("body").innerText()));
  await page.getByRole("button", { name: "Plus d'actions" }).click();
  await page.getByRole("menuitem", { name: "Modifier" }).click();
  await page.locator(".ant-drawer-open .ant-segmented").waitFor();
  const choisi = await page.locator(".ant-drawer-open .ant-segmented-item-selected").innerText().catch((e) => String(e));
  ok("Modifier : la nature « Guide téléchargé » est proposée et sélectionnée", /Guide téléchargé/.test(choisi), choisi);
  await ctx.close();
}
await nav.close();
ok("Aucune erreur JavaScript", erreurs.length === 0, erreurs);
for (const x of res) console.log(x.ok ? "OK   " : "ÉCHEC", x.n, x.ok ? "" : JSON.stringify(x.d)?.slice(0, 300));
console.log(`${res.filter((x) => x.ok).length} / ${res.length} tests back-office du lot 16 conformes`);
