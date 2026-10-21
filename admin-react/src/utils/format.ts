export const eur = (n: number | string | null | undefined) =>
  (Number(n) || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " €";

export const dateFR = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("fr-FR") : "—";

export interface Ligne {
  libelle: string;
  qte: number;
  pu: number;
}

export const totalHT = (lignes: Ligne[]) =>
  (lignes || []).reduce((s, l) => s + (Number(l.qte) || 0) * (Number(l.pu) || 0), 0);
