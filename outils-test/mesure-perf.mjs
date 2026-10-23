// Lot 15 : mesure des sites (poids, requêtes, ressources bloquantes, premier affichage)
// avec une connexion mobile ralentie (4G lente simulée par Chrome).
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const DEPOT = process.argv[2];
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "application/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };
const PAGES = { groupe: ["groupe", ["/"]], pro: ["infogerance", ["/", "/pannes-frequentes/", "/services/cybersecurite/"]], assistance: ["particuliers", ["/", "/aide/"]] };
const nav = await chromium.launch({ channel: "chrome" });
const lignes = [];
for (const [cle, [dossier, chemins]] of Object.entries(PAGES)) {
  for (const c of chemins) {
    const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    let octets = 0, n = 0;
    await ctx.route("**/*", (r) => {
      const u = new URL(r.request().url());
      if (u.host !== `${cle}.test`) return r.abort();
      let f = path.join(DEPOT, "sites", dossier, decodeURIComponent(u.pathname));
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
      if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: "" });
      const corps = fs.readFileSync(f); const ext = path.extname(f);
      // Taille transférée réaliste : texte compressé (gzip, comme un hébergeur), binaires tels quels.
      octets += [".html", ".css", ".js", ".svg"].includes(ext) ? zlib.gzipSync(corps).length : corps.length; n++;
      return r.fulfill({ status: 200, contentType: TYPES[ext] || "application/octet-stream", body: corps });
    });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await page.goto(`http://${cle}.test${c}`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    const m = await page.evaluate(() => {
      const fcp = performance.getEntriesByName("first-contentful-paint")[0]?.startTime;
      const lcp = new Promise((ok) => new PerformanceObserver((l) => { const e = l.getEntries(); ok(e[e.length - 1]?.startTime); }).observe({ type: "largest-contentful-paint", buffered: true }));
      const bloquants = performance.getEntriesByType("resource").filter((r) => r.renderBlockingStatus === "blocking").map((r) => r.name.split("/").pop());
      return Promise.all([fcp, lcp, bloquants]);
    });
    lignes.push({ page: `${cle}${c}`, ko: Math.round(octets / 1024), requetes: n, fcp_ms: Math.round(m[0]), lcp_ms: Math.round(m[1]), bloquants: m[2].join(", ") });
    await ctx.close();
  }
}
await nav.close();
console.table(lignes);
