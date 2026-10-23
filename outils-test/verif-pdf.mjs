import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import fs from "node:fs";
const res = []; const ok = (n, c, d) => res.push({ n, ok: !!c, d });
async function lire(nom) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(`pdf/${nom}.pdf`)), standardFontDataUrl: "node_modules/pdfjs-dist/standard_fonts/", verbosity: 0 }).promise;
  const pages = []; let horsCadre = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const p = await doc.getPage(i); const vp = p.getViewport({ scale: 1 });
    const tc = await p.getTextContent();
    pages.push(tc.items.map((it) => it.str).filter((s) => s.trim()).join(" | "));
    for (const it of tc.items) { const x = it.transform[4]; if (it.str.trim() && (x < 30 || x + it.width > vp.width - 30)) horsCadre.push(`${it.str.slice(0, 30)}@${Math.round(x)}+${Math.round(it.width)}`); }
  }
  const meta = await doc.getMetadata();
  return { n: doc.numPages, t: pages.join(" || ").replace(/ \| /g, " "), pages, horsCadre, titre: meta.info.Title, langue: meta.info.Language };
}
let d = await lire("facture-complete");
for (const m of ["FACTURE", "N° 2026-0001", "Date : 22/10/2026", "Échéance : 21/11/2026", "DHB Test", "SIRET 000 000 000 00000", "FACTURÉ À", "Cabinet Martin", "93400 Saint-Ouen",
  "Intervention sur site — diagnostic réseau", "Rapport remis au client", "Forfait « sérénité » d'été", "1 003,00 €", "115,50 €", "Total à payer", "1 234,50 €",
  "TVA non applicable, art. 293 B du CGI", "Paiement à réception par virement.", "Pénalités", "IBAN FR76 0000 0000 0000 · BIC TESTFRPP", "page 1 / 1"])
  ok(`Facture complète : « ${m} »`, d.t.includes(m));
ok("Facture complète : aucune mention « À COMPLÉTER »", !d.t.includes("COMPLÉTER"));
ok("Facture complète : titre du fichier", d.titre === "Facture 2026-0001", d.titre);
d = await lire("facture-entreprise-vide");
for (const m of ["raison sociale", "adresse", "SIRET", "pénalités de retard"]) ok(`Entreprise vide : « À COMPLÉTER … ${m} »`, d.t.includes("[À COMPLÉTER PAR LE PROPRIÉTAIRE : " + m));
ok("Entreprise vide : aucun IBAN inventé", !d.t.includes("IBAN"));
ok("Entreprise vide : pas de n° TVA demandé en franchise", !d.t.includes("TVA intracommunautaire"));
d = await lire("devis-long");
ok("Devis 60 lignes : plusieurs pages", d.n >= 3, d.n);
ok("Devis 60 lignes : en-tête du tableau répété sur chaque page", d.pages.every((p) => p.includes("DÉSIGNATION")));
ok("Devis 60 lignes : 60 lignes présentes", (d.t.match(/Poste de travail n°/g) || []).length === 60);
ok("Devis 60 lignes : « page 3 / 3 » ou plus", new RegExp(`page ${d.n} / ${d.n}`).test(d.t));
ok("Devis brouillon : bandeau BROUILLON", d.t.includes("BROUILLON — document non émis"));
ok("Devis : validité", d.t.includes("Validité : 15 jours"));
ok("Devis : conditions + bon pour accord", d.t.includes("Acompte de 30 %") && d.t.includes("Bon pour accord"));
ok("Devis 60 lignes : total sur la dernière page", d.pages[d.n - 1].includes("3 600,00 €"));
d = await lire("devis-signe");
ok("Devis signé : « Accepté en ligne le 05/10/2026 par Paul Petit »", d.t.includes("Accepté en ligne le 05/10/2026 par Paul Petit."));
ok("Devis signé : pas de cadre de signature", !d.t.includes("Bon pour accord"));
d = await lire("facture-tva20");
ok("TVA 20 % : ligne TVA et total TTC", d.t.includes("TVA 20 %") && d.t.includes("23,10 €") && d.t.includes("Total TTC") && d.t.includes("138,60 €"));
ok("TVA 20 % : pas de mention art. 293 B", !d.t.includes("293 B"));
ok("TVA 20 % : n° TVA intracom à compléter", d.t.includes("À COMPLÉTER PAR LE PROPRIÉTAIRE : n° TVA intracommunautaire"));
d = await lire("caracteres");
ok("Caractères : accents et Œ conservés", d.t.includes("Émile Œuvre"));
ok("Caractères : emoji remplacé, pas d'erreur", d.t.includes("Émile Œuvre ?"));
ok("Caractères : espace fine remplacée", d.t.includes("Résidence des Pins"));
ok("Caractères : mot très long coupé, rien hors marge", d.horsCadre.length === 0, d.horsCadre);
ok("Facture annulée : bandeau", (await lire("facture-annulee")).t.includes("FACTURE ANNULÉE"));
d = await lire("facture-ancienne");
ok("Ancienne facture à une ligne : ligne et total", d.t.includes("Maintenance annuelle") && d.t.includes("480,00 €"));
for (const f of fs.readdirSync("pdf").filter((x) => x.endsWith(".pdf"))) {
  const r = await lire(f.replace(".pdf", ""));
  ok(`${f} : rien hors des marges`, r.horsCadre.length === 0, r.horsCadre.slice(0, 3));
  ok(`${f} : langue fr-FR`, r.langue === "fr-FR", r.langue);
}
for (const r of res) console.log(r.ok ? "OK   " : "ÉCHEC", r.n, r.ok ? "" : JSON.stringify(r.d));
console.log(`${res.filter((r) => r.ok).length} / ${res.length} contrôles PDF conformes`);
