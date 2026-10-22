import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/fr";

dayjs.extend(relativeTime);
dayjs.locale("fr");

const nf2 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** 1 234,50 € */
export const eur = (n: unknown) => `${nf2.format(Number(n) || 0)} €`;
/** 1 235 € (sans décimales, pour les indicateurs) */
export const eur0 = (n: unknown) => `${nf0.format(Math.round(Number(n) || 0))} €`;
export const num = (n: unknown) => nf0.format(Number(n) || 0);

export const dateFR = (d?: string | null) => (d ? dayjs(d).format("DD/MM/YYYY") : "—");
export const dateLongFR = (d?: string | null) => (d ? dayjs(d).format("D MMMM YYYY") : "—");
export const dateTimeFR = (d?: string | null) => (d ? dayjs(d).format("DD/MM/YYYY à HH:mm") : "—");
export const fromNow = (d?: string | null) => (d ? dayjs(d).fromNow() : "—");
export const todayISO = () => dayjs().format("YYYY-MM-DD");
export const addDaysISO = (d: string, n: number) => dayjs(d).add(n, "day").format("YYYY-MM-DD");

/**
 * Variation en % entre deux périodes. Renvoie null quand la comparaison n'a
 * pas de sens (période précédente vide) : on n'invente jamais de tendance.
 */
export function variation(current: number, previous: number): number | null {
  if (!previous || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export const pct = (v: number | null | undefined, digits = 1) =>
  v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(digits).replace(".", ",")} %`;

export interface Ligne {
  libelle: string;
  description?: string;
  qte: number;
  pu: number;
}

export const ligneTotal = (l: Partial<Ligne>) => (Number(l.qte) || 0) * (Number(l.pu) || 0);
export const totalHT = (lignes: Partial<Ligne>[] = []) => lignes.reduce((s, l) => s + ligneTotal(l), 0);

/** Nettoie une saisie de recherche avant de la placer dans un filtre PostgREST. */
export const cleanSearch = (q: string) => q.replace(/[%,()*\\]/g, " ").trim();

export const initiales = (s?: string | null) =>
  (s || "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
