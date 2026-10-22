// =====================================================================
//  DHB — génération des PDF de devis et de factures (côté serveur).
//
//  Même contenu que l'aperçu imprimable du back-office (admin-react/src/lib/
//  document.ts) : émetteur lu dans la fiche entreprise, tout ce qui manque
//  apparaît « [À COMPLÉTER PAR LE PROPRIÉTAIRE : …] », jamais inventé ;
//  franchise de TVA : « TVA non applicable, art. 293 B du CGI ».
//  Polices standard (Helvetica) : aucun fichier de police à embarquer.
// =====================================================================
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "npm:pdf-lib@1.17.1";

export interface LignePdf { libelle?: string | null; description?: string | null; qte?: number | string | null; pu?: number | string | null }

export interface EntreprisePdf {
  raison_sociale?: string | null; forme_juridique?: string | null; siret?: string | null; tva_intracom?: string | null;
  adresse?: string | null; code_postal?: string | null; ville?: string | null; email?: string | null; telephone?: string | null;
  iban?: string | null; bic?: string | null; conditions_devis?: string | null; mentions_facture?: string | null; penalites_retard?: string | null;
}

export interface DocumentPdf {
  numero?: string | null;
  date_devis?: string | null; date_facture?: string | null; date_echeance?: string | null; validite_jours?: number | null;
  client_nom?: string | null; client_email?: string | null; client_adresse?: string | null;
  lignes?: LignePdf[] | null; libelle?: string | null; quantite?: number | null; prix_unitaire?: number | null;
  tva_taux?: number | string | null; total_ht?: number | string | null; total_ttc?: number | string | null;
  conditions?: string | null; status?: string | null; statut?: string | null;
  signed_at?: string | null; signature_nom?: string | null;
}

export type TypeDocument = "devis" | "facture";

// ---------- Mise en forme ----------
const A4 = { l: 595.28, h: 841.89 };
const MARGE = 42;
const BAS = 56;  // réserve pour le pied de page
const C = {
  encre: rgb(0.055, 0.106, 0.18), texte: rgb(0.114, 0.161, 0.224), doux: rgb(0.357, 0.396, 0.463), pale: rgb(0.4, 0.439, 0.522),
  trait: rgb(0.89, 0.906, 0.929), fond: rgb(0.976, 0.98, 0.984), orange: rgb(0.576, 0.216, 0.051), rouge: rgb(0.753, 0.169, 0.169),
};

export const montant = (n: unknown) => {
  const v = Number(n) || 0;
  const [ent, dec] = Math.abs(v).toFixed(2).split(".");
  return `${v < 0 ? "-" : ""}${ent.replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${dec} €`;
};
export const dateFr = (s?: string | null) => {
  if (!s) return "—";
  const [a, m, j] = String(s).slice(0, 10).split("-");
  return a && m && j ? `${j}/${m}/${a}` : String(s);
};
const aCompleter = (quoi: string) => `[À COMPLÉTER PAR LE PROPRIÉTAIRE : ${quoi}]`;

/** Lignes du document (compatible avec les anciennes factures à une seule ligne). */
export function lignesDe(d: DocumentPdf): LignePdf[] {
  if (Array.isArray(d.lignes) && d.lignes.length) return d.lignes;
  if (d.libelle) return [{ libelle: d.libelle, qte: Number(d.quantite) || 1, pu: Number(d.prix_unitaire) || 0 }];
  return [];
}

class Mise {
  pdf!: PDFDocument; page!: PDFPage; y = 0; f!: PDFFont; g!: PDFFont;
  private codables = new Map<string, boolean>();
  enTete?: () => void;   // en-tête de tableau à répéter sur une nouvelle page

  async init(titre: string) {
    this.pdf = await PDFDocument.create();
    this.pdf.setTitle(titre);
    this.pdf.setLanguage("fr-FR");
    this.pdf.setCreator("DHB — back-office");
    this.pdf.setProducer("DHB");
    this.f = await this.pdf.embedFont(StandardFonts.Helvetica);
    this.g = await this.pdf.embedFont(StandardFonts.HelveticaBold);
    this.nouvellePage();
  }
  nouvellePage() {
    this.page = this.pdf.addPage([A4.l, A4.h]);
    this.y = A4.h - MARGE;
  }
  /** Garantit la place pour h points, sinon passe à la page suivante. */
  place(h: number) {
    if (this.y - h < BAS) {
      this.nouvellePage();
      this.enTete?.();
    }
  }
  /** Remplace les caractères absents des polices standard (espaces fines, emojis…). */
  propre(s: unknown): string {
    const t = String(s ?? "").replace(/[    ]/g, " ").replace(/\t/g, " ").replace(/\r/g, "");
    let out = "";
    for (const ch of t) {
      if (ch === "\n") { out += ch; continue; }
      let ok = this.codables.get(ch);
      if (ok === undefined) {
        try { this.f.encodeText(ch); ok = true; } catch { ok = false; }
        this.codables.set(ch, ok);
      }
      out += ok ? ch : "?";
    }
    return out;
  }
  largeur(s: string, taille: number, gras = false) { return (gras ? this.g : this.f).widthOfTextAtSize(s, taille); }
  /** Découpe un texte en lignes tenant dans `max` points. */
  couper(s: unknown, taille: number, max: number, gras = false): string[] {
    const lignes: string[] = [];
    for (const para of this.propre(s).split("\n")) {
      let cur = "";
      for (const mot of para.split(/ +/)) {
        const essai = cur ? `${cur} ${mot}` : mot;
        if (this.largeur(essai, taille, gras) <= max) { cur = essai; continue; }
        if (cur) lignes.push(cur);
        // Mot plus long que la ligne : on le coupe.
        let m = mot;
        while (this.largeur(m, taille, gras) > max && m.length > 1) {
          let k = m.length - 1;
          while (k > 1 && this.largeur(m.slice(0, k), taille, gras) > max) k--;
          lignes.push(m.slice(0, k));
          m = m.slice(k);
        }
        cur = m;
      }
      lignes.push(cur);
    }
    return lignes;
  }
  texte(s: string, x: number, y: number, taille: number, opt: { gras?: boolean; couleur?: ReturnType<typeof rgb>; droite?: boolean } = {}) {
    const t = this.propre(s);
    const w = this.largeur(t, taille, opt.gras);
    this.page.drawText(t, { x: opt.droite ? x - w : x, y, size: taille, font: opt.gras ? this.g : this.f, color: opt.couleur ?? C.texte });
  }
  /** Paragraphe qui peut s'étendre sur plusieurs pages ; renvoie rien, avance this.y. */
  paragraphe(s: string, taille: number, x: number, max: number, opt: { gras?: boolean; couleur?: ReturnType<typeof rgb>; interligne?: number } = {}) {
    const h = taille * (opt.interligne ?? 1.45);
    for (const l of this.couper(s, taille, max, opt.gras)) {
      this.place(h);
      this.y -= h;
      this.texte(l, x, this.y + taille * 0.3, taille, opt);
    }
  }
  trait(x1: number, x2: number, y: number, couleur = C.trait, ep = 0.8) {
    this.page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: ep, color: couleur });
  }
}

/** Produit le PDF d'un devis ou d'une facture. */
export type Octets = Uint8Array<ArrayBuffer>;

export async function genererPdf(type: TypeDocument, d: DocumentPdf, ent: EntreprisePdf | null): Promise<Octets> {
  const e = ent ?? {};
  const devis = type === "devis";
  const titre = `${devis ? "Devis" : "Facture"} ${d.numero ?? ""}`.trim();
  const m = new Mise();
  await m.init(titre);
  const L = A4.l;
  const largeurUtile = L - 2 * MARGE;
  const tva = Number(d.tva_taux) || 0;
  const ht = Number(d.total_ht) || 0;
  const ttc = Number(d.total_ttc) || 0;

  // ---- Bandeau d'état ----
  const etat = devis ? d.statut : d.status;
  if (etat === "brouillon" || etat === "annulee") {
    m.texte(etat === "brouillon" ? "BROUILLON — document non émis" : "FACTURE ANNULÉE", MARGE, m.y - 9, 9, { gras: true, couleur: etat === "brouillon" ? C.orange : C.rouge });
    m.y -= 22;
  }

  // ---- En-tête : titre et références à gauche, émetteur à droite ----
  const haut = m.y;
  m.texte(devis ? "DEVIS" : "FACTURE", MARGE, m.y - 20, 22, { gras: true, couleur: C.encre });
  let yg = m.y - 40;
  m.texte(`N° ${d.numero || "—"}`, MARGE, yg, 10.5, { gras: true, couleur: C.encre }); yg -= 15;
  m.texte(`Date : ${dateFr(devis ? d.date_devis : d.date_facture)}`, MARGE, yg, 9.5, { couleur: C.doux }); yg -= 14;
  m.texte(devis ? `Validité : ${d.validite_jours ?? 30} jours` : `Échéance : ${d.date_echeance ? dateFr(d.date_echeance) : "à réception"}`, MARGE, yg, 9.5, { couleur: C.doux });

  const villeLigne = [e.code_postal, e.ville].filter(Boolean).join(" ");
  const emetteur: { t: string; gras?: boolean; manque?: boolean }[] = [
    e.raison_sociale ? { t: e.raison_sociale, gras: true } : { t: aCompleter("raison sociale"), manque: true },
    ...(e.forme_juridique ? [{ t: e.forme_juridique }] : []),
    e.adresse ? { t: e.adresse } : { t: aCompleter("adresse"), manque: true },
    ...(villeLigne ? [{ t: villeLigne }] : []),
    e.siret ? { t: `SIRET ${e.siret}` } : { t: aCompleter("SIRET"), manque: true },
    ...(tva > 0 ? [e.tva_intracom ? { t: `TVA ${e.tva_intracom}` } : { t: aCompleter("n° TVA intracommunautaire"), manque: true }] : []),
    ...([e.email, e.telephone].filter(Boolean).length ? [{ t: [e.email, e.telephone].filter(Boolean).join(" · ") }] : []),
  ];
  let yd = haut - 8;
  for (const x of emetteur) {
    for (const l of m.couper(x.t, 9, 230, x.gras)) {
      m.texte(l, L - MARGE, yd, 9, { gras: x.gras, droite: true, couleur: x.manque ? C.orange : x.gras ? C.encre : C.doux });
      yd -= 13;
    }
  }
  m.y = Math.min(yg, yd) - 22;

  // ---- Destinataire ----
  const largeurBloc = 270;
  const lignesClient: { t: string; gras?: boolean }[] = [
    { t: d.client_nom || "—", gras: true },
    ...(d.client_adresse ? m.couper(d.client_adresse, 9.5, largeurBloc - 24).map((t) => ({ t })) : []),
    ...(d.client_email ? [{ t: d.client_email }] : []),
  ];
  const hBloc = 28 + lignesClient.length * 13.5;
  m.page.drawRectangle({ x: MARGE, y: m.y - hBloc, width: largeurBloc, height: hBloc, color: C.fond, borderColor: C.trait, borderWidth: 0.8 });
  m.texte(devis ? "DESTINATAIRE" : "FACTURÉ À", MARGE + 12, m.y - 15, 7.5, { gras: true, couleur: C.pale });
  let yc = m.y - 30;
  for (const x of lignesClient) { m.texte(x.t, MARGE + 12, yc, 9.5, { gras: x.gras, couleur: x.gras ? C.encre : C.texte }); yc -= 13.5; }
  m.y -= hBloc + 24;

  // ---- Tableau des lignes ----
  const colQte = L - MARGE - 175, colPu = L - MARGE - 90, colTot = L - MARGE;
  const largeurDesignation = colQte - 40 - MARGE;
  const enTete = () => {
    m.texte("DÉSIGNATION", MARGE, m.y - 10, 7.5, { gras: true, couleur: C.pale });
    m.texte("QTÉ", colQte, m.y - 10, 7.5, { gras: true, couleur: C.pale, droite: true });
    m.texte("PU HT", colPu, m.y - 10, 7.5, { gras: true, couleur: C.pale, droite: true });
    m.texte("TOTAL HT", colTot, m.y - 10, 7.5, { gras: true, couleur: C.pale, droite: true });
    m.y -= 16;
    m.trait(MARGE, colTot, m.y);
  };
  m.place(40);
  enTete();
  m.enTete = enTete;
  const lignes = lignesDe(d);
  if (!lignes.length) {
    m.y -= 18; m.texte("Aucune ligne", MARGE, m.y + 4, 9.5, { couleur: C.pale });
  }
  for (const l of lignes) {
    const lib = m.couper(l.libelle || "—", 9.5, largeurDesignation);
    const desc = l.description ? m.couper(l.description, 8.5, largeurDesignation) : [];
    const hLigne = 10 + lib.length * 13 + desc.length * 11.5;
    m.place(Math.min(hLigne, 120));
    const yDebut = m.y;
    m.texte(String(l.qte ?? ""), colQte, yDebut - 14, 9.5, { droite: true });
    m.texte(montant(l.pu), colPu, yDebut - 14, 9.5, { droite: true });
    m.texte(montant((Number(l.qte) || 0) * (Number(l.pu) || 0)), colTot, yDebut - 14, 9.5, { droite: true });
    m.y -= 4;
    for (const t of lib) { m.place(13); m.y -= 13; m.texte(t, MARGE, m.y + 3, 9.5); }
    for (const t of desc) { m.place(11.5); m.y -= 11.5; m.texte(t, MARGE, m.y + 3, 8.5, { couleur: C.doux }); }
    m.y -= 6;
    m.trait(MARGE, colTot, m.y);
  }
  m.enTete = undefined;

  // ---- Totaux ----
  m.place(tva > 0 ? 90 : 80);
  const xT = L - MARGE - 220;
  m.y -= 20;
  m.texte("Total HT", xT, m.y, 9.5, { couleur: C.doux }); m.texte(montant(ht), colTot, m.y, 9.5, { droite: true });
  if (tva > 0) {
    m.y -= 16;
    m.texte(`TVA ${tva} %`, xT, m.y, 9.5, { couleur: C.doux }); m.texte(montant(ttc - ht), colTot, m.y, 9.5, { droite: true });
  }
  m.y -= 10; m.trait(xT, colTot, m.y); m.y -= 17;
  m.texte(tva > 0 ? "Total TTC" : "Total à payer", xT, m.y, 12, { gras: true, couleur: C.encre });
  m.texte(montant(ttc), colTot, m.y, 12, { gras: true, couleur: C.encre, droite: true });
  if (tva <= 0) { m.y -= 15; m.texte("TVA non applicable, art. 293 B du CGI", colTot, m.y, 8.5, { couleur: C.pale, droite: true }); }

  // ---- Conditions et mentions ----
  m.y -= 26;
  m.place(30);
  m.trait(MARGE, colTot, m.y);
  m.y -= 6;
  const petit = (t: string, opt: { gras?: boolean; couleur?: ReturnType<typeof rgb> } = {}) =>
    m.paragraphe(t, 8.5, MARGE, largeurUtile, { couleur: opt.couleur ?? C.pale, gras: opt.gras });
  if (devis) {
    const cond = d.conditions || e.conditions_devis;
    if (cond) { petit("Conditions", { gras: true, couleur: C.doux }); petit(cond); }
    else petit(aCompleter("conditions du devis (acompte, délais, modalités de paiement)"), { couleur: C.orange });
    m.y -= 8;
    if (d.signed_at) {
      petit(`Accepté en ligne le ${dateFr(d.signed_at)} par ${d.signature_nom || "le client"}.`, { gras: true, couleur: C.doux });
    } else {
      petit("Bon pour accord — date et signature du client :", { couleur: C.doux });
      m.place(56);
      m.y -= 50;
      m.page.drawRectangle({ x: MARGE, y: m.y, width: 220, height: 46, borderColor: rgb(0.816, 0.835, 0.867), borderWidth: 0.8, borderDashArray: [3, 3] });
    }
  } else {
    if (d.conditions || e.mentions_facture) petit(String(d.conditions || e.mentions_facture));
    m.y -= 4;
    if (e.penalites_retard) petit(e.penalites_retard);
    else petit(aCompleter("pénalités de retard et indemnité forfaitaire de recouvrement — à valider avec votre comptable"), { couleur: C.orange });
    if (e.iban) { m.y -= 4; petit(`Règlement par virement — IBAN ${e.iban}${e.bic ? ` · BIC ${e.bic}` : ""}`); }
  }

  // ---- Pied de chaque page : référence et numéro de page ----
  const pages = m.pdf.getPages();
  pages.forEach((p, i) => {
    const t = m.propre(`${titre} — page ${i + 1} / ${pages.length}`);
    p.drawText(t, { x: L - MARGE - m.f.widthOfTextAtSize(t, 8), y: 26, size: 8, font: m.f, color: C.pale });
  });
  return new Uint8Array(await m.pdf.save());
}
