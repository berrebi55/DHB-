import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
const [, , ...fichiers] = process.argv;
const nav = await chromium.launch({ channel: "chrome" });
const page = await nav.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 1 });
await page.route("http://pdf.test/**", (r) => {
  const p = new URL(r.request().url()).pathname;
  if (p === "/") return r.fulfill({ contentType: "text/html", body: `<!doctype html><body style="margin:0;background:#888"><canvas id="c"></canvas><script type="module">
    import * as pdfjs from "/pdfjs/build/pdf.mjs";
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/build/pdf.worker.mjs";
    window.rendre = async (f, n) => { const doc = await pdfjs.getDocument({ url: "/fichier/" + f, standardFontDataUrl: "/pdfjs/standard_fonts/" }).promise;
      const pg = await doc.getPage(n); const vp = pg.getViewport({ scale: 1.5 }); const c = document.getElementById("c"); c.width = vp.width; c.height = vp.height;
      await pg.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise; return doc.numPages; };
    window.pret = true;</script></body>` });
  const f = p.startsWith("/pdfjs/") ? path.join("node_modules/pdfjs-dist", p.slice(7)) : path.join("pdf", p.slice(9));
  return r.fulfill({ contentType: f.endsWith(".mjs") ? "application/javascript" : "application/octet-stream", body: fs.readFileSync(f) });
});
await page.goto("http://pdf.test/"); await page.waitForFunction(() => window.pret);
for (const spec of fichiers) {
  const [f, n = "1"] = spec.split(":");
  await page.evaluate(([f, n]) => window.rendre(f, Number(n)), [f, n]);
  await page.locator("#c").screenshot({ path: `pdf/${f.replace(".pdf", "")}-p${n}.png` });
}
await nav.close();
