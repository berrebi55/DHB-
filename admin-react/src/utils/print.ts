import { ENTITY } from "../constants";
import { eur, type Ligne } from "./format";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );

interface Doc {
  numero?: string;
  entity?: string;
  date_devis?: string;
  date_facture?: string;
  validite_jours?: number;
  client_nom?: string;
  client_adresse?: string;
  client_email?: string;
  lignes?: Ligne[];
  tva_taux?: number;
  total_ht?: number;
  total_ttc?: number;
}

function render(kind: "DEVIS" | "FACTURE", d: Doc) {
  const w = window.open("", "_blank");
  if (!w) return;
  const lignes = Array.isArray(d.lignes) ? d.lignes : [];
  const ht = Number(d.total_ht) || 0;
  const ttc = Number(d.total_ttc) || 0;
  const tvaMontant = ttc - ht;
  const rows = lignes
    .map(
      (l) =>
        `<tr><td>${esc(l.libelle)}</td><td>${l.qte}</td><td>${eur(l.pu)}</td><td>${eur(
          (Number(l.qte) || 0) * (Number(l.pu) || 0),
        )}</td></tr>`,
    )
    .join("");
  const dateLabel = kind === "DEVIS" ? d.date_devis : d.date_facture;
  const validite =
    kind === "DEVIS"
      ? `<div>Validité : ${d.validite_jours ?? 30} jours</div>`
      : "";
  const footer =
    kind === "DEVIS"
      ? `Devis valable ${d.validite_jours ?? 30} jours. [À COMPLÉTER : conditions, modalités de paiement, mentions légales.]`
      : `[À COMPLÉTER : conditions de paiement (ex. à réception), pénalités de retard, mentions légales obligatoires.]`;
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${kind} ${esc(
    d.numero,
  )}</title>
  <style>body{font-family:Arial,sans-serif;color:#0f2238;max-width:800px;margin:30px auto;padding:0 24px}
  h1{color:#0B2A4A} .row{display:flex;justify-content:space-between;gap:30px} table{width:100%;border-collapse:collapse;margin:24px 0}
  th,td{border:1px solid #ccc;padding:10px;text-align:left} th{background:#f1f5f9} .tot{text-align:right} .muted{color:#64748b;font-size:.85rem}
  .box{border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-top:10px}</style></head><body>
  <div class="row"><div><h1>${kind}</h1><div><strong>N° ${esc(d.numero)}</strong></div><div>Date : ${esc(
    dateLabel,
  )}</div>${validite}</div>
  <div style="text-align:right"><strong>DHB ${esc(
    ENTITY[d.entity ?? ""] || d.entity,
  )}</strong><div class="muted">[À COMPLÉTER : raison sociale, adresse,<br>SIRET, TVA intracommunautaire]</div></div></div>
  <div class="box"><strong>Client</strong><br>${esc(d.client_nom)}<br>${esc(
    d.client_adresse,
  )}<br>${esc(d.client_email)}</div>
  <table><thead><tr><th>Prestation</th><th>Qté</th><th>PU HT</th><th>Total HT</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="tot">Total HT : <strong>${eur(ht)}</strong><br>${
    Number(d.tva_taux) > 0
      ? `TVA (${d.tva_taux} %) : ${eur(tvaMontant)}<br>`
      : `<span class="muted">TVA non applicable, art. 293 B du CGI</span><br>`
  }
  <span style="font-size:1.3rem">${
    Number(d.tva_taux) > 0 ? "Total TTC" : "Total à payer"
  } : <strong>${eur(ttc)}</strong></span></div>
  <p class="muted" style="margin-top:30px">${footer}</p>
  <script>window.onload=function(){window.print();}<\/script></body></html>`);
  w.document.close();
}

export const printDevis = (d: Doc) => render("DEVIS", d);
export const printFacture = (d: Doc) => render("FACTURE", d);
