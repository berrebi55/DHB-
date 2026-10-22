import type { Entreprise } from "./hooks";
import { dateFR, eur, ligneTotal, type Ligne } from "./format";
import { label } from "./statuts";

// Rendu unique des devis et factures : le même HTML sert à l'aperçu à l'écran
// et à l'impression / PDF. Tout ce qui n'est pas renseigné dans
// Paramètres → Société apparaît comme « à compléter », jamais inventé.

export type DocKind = "DEVIS" | "FACTURE";

export interface DocData {
  numero?: string | null;
  entity?: string | null;
  date_devis?: string | null;
  date_facture?: string | null;
  date_echeance?: string | null;
  validite_jours?: number | null;
  client_nom?: string | null;
  client_email?: string | null;
  client_adresse?: string | null;
  lignes?: Ligne[] | null;
  libelle?: string | null;
  quantite?: number | null;
  prix_unitaire?: number | null;
  tva_taux?: number | null;
  total_ht?: number | null;
  total_ttc?: number | null;
  conditions?: string | null;
  status?: string | null;
  statut?: string | null;
  signed_at?: string | null;
  signature_nom?: string | null;
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
const nl = (s: unknown) => esc(s).replace(/\n/g, "<br>");
const aCompleter = (txt: string) => `<span class="a-completer">[À COMPLÉTER PAR LE PROPRIÉTAIRE : ${esc(txt)}]</span>`;

/** Lignes du document (rétrocompatible avec les anciennes factures mono-ligne). */
export function lignesDe(d: DocData): Ligne[] {
  if (Array.isArray(d.lignes) && d.lignes.length) return d.lignes;
  if (d.libelle) return [{ libelle: d.libelle, qte: Number(d.quantite) || 1, pu: Number(d.prix_unitaire) || 0 }];
  return [];
}

export function documentHtml(kind: DocKind, d: DocData, ent: Entreprise | null): string {
  const e = ent ?? {};
  const isDevis = kind === "DEVIS";
  const date = isDevis ? d.date_devis : d.date_facture;
  const tva = Number(d.tva_taux) || 0;
  const ht = Number(d.total_ht) || 0;
  const ttc = Number(d.total_ttc) || 0;

  const villeLigne = [e.code_postal, e.ville].filter(Boolean).join(" ");
  const emetteur = [
    e.raison_sociale ? `<b>${esc(e.raison_sociale)}</b>` : aCompleter("raison sociale"),
    e.forme_juridique ? esc(e.forme_juridique) : "",
    e.adresse ? esc(e.adresse) : aCompleter("adresse"),
    villeLigne ? esc(villeLigne) : "",
    e.siret ? `SIRET ${esc(e.siret)}` : aCompleter("SIRET"),
    tva > 0 ? (e.tva_intracom ? `TVA ${esc(e.tva_intracom)}` : aCompleter("n° TVA intracommunautaire")) : "",
    [e.email, e.telephone].filter(Boolean).map(esc).join(" · "),
  ].filter(Boolean).join("<br>");

  const rows = lignesDe(d)
    .map(
      (l) => `<tr>
        <td>${esc(l.libelle)}${l.description ? `<div style="color:#667085;font-size:12px;margin-top:2px">${nl(l.description)}</div>` : ""}</td>
        <td class="r">${esc(l.qte)}</td>
        <td class="r">${eur(l.pu)}</td>
        <td class="r">${eur(ligneTotal(l))}</td>
      </tr>`,
    )
    .join("");

  const meta = isDevis
    ? `Date : ${dateFR(date)}<br>Validité : ${esc(d.validite_jours ?? 30)} jours`
    : `Date : ${dateFR(date)}<br>Échéance : ${d.date_echeance ? dateFR(d.date_echeance) : "à réception"}`;

  const totaux = `
    <div class="p-totals">
      <div class="row"><span>Total HT</span><span>${eur(ht)}</span></div>
      ${tva > 0 ? `<div class="row"><span>TVA ${esc(tva)} %</span><span>${eur(ttc - ht)}</span></div>` : ""}
      <div class="row grand"><span>${tva > 0 ? "Total TTC" : "Total à payer"}</span><span>${eur(ttc)}</span></div>
      ${tva > 0 ? "" : `<div style="font-size:12px;color:#667085;text-align:right">TVA non applicable, art. 293 B du CGI</div>`}
    </div>`;

  let pied = "";
  if (isDevis) {
    const cond = d.conditions || e.conditions_devis;
    pied = `
      ${cond ? `<div><b>Conditions</b><br>${nl(cond)}</div>` : `<div>${aCompleter("conditions du devis (acompte, délais, modalités de paiement)")}</div>`}
      <div style="margin-top:14px">${
        d.signed_at
          ? `<b>Accepté en ligne</b> le ${dateFR(d.signed_at)} par ${esc(d.signature_nom)}.`
          : `Bon pour accord — date et signature du client :<div style="height:46px;border:1px dashed #d0d5dd;border-radius:6px;margin-top:6px;max-width:300px"></div>`
      }</div>`;
  } else {
    pied = `
      ${d.conditions || e.mentions_facture ? `<div>${nl(d.conditions || e.mentions_facture)}</div>` : ""}
      <div style="margin-top:6px">${e.penalites_retard ? nl(e.penalites_retard) : aCompleter("pénalités de retard et indemnité forfaitaire de recouvrement — à valider avec votre comptable")}</div>
      ${e.iban ? `<div style="margin-top:6px">Règlement par virement — IBAN ${esc(e.iban)}${e.bic ? ` · BIC ${esc(e.bic)}` : ""}</div>` : ""}`;
  }

  const etat = isDevis ? d.statut : d.status;
  const filigrane =
    etat === "brouillon" ? `<div style="color:#b54708;font-weight:600;font-size:12px;margin-bottom:10px">BROUILLON — document non émis</div>`
    : etat === "annulee" ? `<div style="color:#c02b2b;font-weight:600;font-size:12px;margin-bottom:10px">FACTURE ANNULÉE</div>`
    : "";

  return `
    ${filigrane}
    <div class="p-head">
      <div>
        <div class="p-title">${kind}</div>
        <div class="p-meta"><b>N° ${esc(d.numero || "—")}</b><br>${meta}</div>
      </div>
      <div class="p-from">${emetteur}</div>
    </div>
    <div class="p-to"><span style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#667085">${isDevis ? "Destinataire" : "Facturé à"}</span><br>
      <b>${esc(d.client_nom || "—")}</b>${d.client_adresse ? `<br>${nl(d.client_adresse)}` : ""}${d.client_email ? `<br>${esc(d.client_email)}` : ""}
    </div>
    <table>
      <thead><tr><th>Désignation</th><th class="r">Qté</th><th class="r">PU HT</th><th class="r">Total HT</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="4" style="color:#667085">Aucune ligne</td></tr>`}</tbody>
    </table>
    ${totaux}
    <div class="p-foot">${pied}</div>`;
}

const PRINT_CSS = `
  body{font-family:Inter,Arial,sans-serif;color:#1d2939;font-size:13px;margin:0;padding:32px 40px}
  .p-head{display:flex;justify-content:space-between;gap:24px;margin-bottom:26px}
  .p-title{font-size:22px;font-weight:700;letter-spacing:.02em;color:#0e1b2e}
  .p-meta{color:#5b6576;line-height:1.6}.p-from{text-align:right;line-height:1.5;color:#5b6576}.p-from b{color:#0e1b2e}
  .p-to{background:#f9fafb;border:1px solid #eef0f3;border-radius:8px;padding:12px 16px;margin-bottom:22px;line-height:1.5;max-width:360px}
  table{width:100%;border-collapse:collapse;margin-bottom:18px}
  th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#667085;border-bottom:1px solid #e3e7ed;padding:8px 6px}
  td{border-bottom:1px solid #eef0f3;padding:9px 6px;vertical-align:top}.r{text-align:right;white-space:nowrap}
  .p-totals{margin-left:auto;width:280px;display:flex;flex-direction:column;gap:6px}
  .p-totals .row{display:flex;justify-content:space-between}
  .p-totals .grand{font-size:15px;font-weight:700;color:#0e1b2e;border-top:1px solid #e3e7ed;padding-top:8px}
  .p-foot{margin-top:28px;padding-top:14px;border-top:1px solid #eef0f3;color:#667085;font-size:11.5px;line-height:1.6}
  .a-completer{background:#fff7e8;color:#93370d;border:1px dashed #fec84b;border-radius:4px;padding:0 4px}
  @page{margin:12mm}`;

/** Ouvre la boîte d'impression du navigateur (choisir « Enregistrer en PDF » pour télécharger). */
export function imprimerDocument(kind: DocKind, d: DocData, ent: Entreprise | null) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  document.body.appendChild(frame);
  const w = frame.contentWindow;
  if (!w) return;
  const titre = `${kind === "DEVIS" ? "Devis" : "Facture"} ${d.numero ?? ""}`.trim();
  w.document.open();
  w.document.write(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(titre)}</title><style>${PRINT_CSS}</style></head><body>${documentHtml(kind, d, ent)}</body></html>`,
  );
  w.document.close();
  setTimeout(() => {
    w.focus();
    w.print();
    setTimeout(() => frame.remove(), 1000);
  }, 250);
}

export const libelleStatutDoc = (kind: DocKind, v?: string | null) => label(kind === "DEVIS" ? "devis" : "facture", v);
