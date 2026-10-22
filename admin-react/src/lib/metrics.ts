import { useQuery } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";
import { supabaseClient } from "../supabaseClient";
import { LEAD_OUVERTS } from "./statuts";
import { messageErreurBase } from "./functions";

// ---------------------------------------------------------------------------
// Données de pilotage : lues telles quelles en base, jamais complétées.
// Règle « CA encaissé » : factures au statut payée, datées par paid_at
// (sinon date de facture). Voir docs/REFONTE.md §3.
// ---------------------------------------------------------------------------

export interface F { id: string; numero: string | null; status: string; total_ht: number; total_ttc: number; date_facture: string; date_echeance: string | null; paid_at: string | null; client_id: string | null; client_nom: string | null; entity: string; en_retard: boolean; reste_a_payer: number; abonnement_id: string | null; devis_id: string | null; created_at: string }
export interface D { id: string; numero: string | null; statut: string; total_ht: number; total_ttc: number; date_devis: string; created_at: string; envoye_at: string | null; signed_at: string | null; client_id: string | null; client_nom: string | null; lead_id: string | null; derniere_relance_le: string | null; entity: string }
export interface L { id: string; nom: string | null; entreprise: string | null; status: string; type: string; created_at: string; relance_at: string | null; priorite: string; client_id: string | null; entity: string; type_client: string | null; source?: string | null }
export interface A { id: string; client_nom: string | null; client_id: string | null; libelle: string | null; montant_mensuel: number; statut: string; date_debut: string; date_renouvellement: string | null; derniere_facture_le: string | null; jour_facturation: number | null; entity: string; stripe_subscription_id?: string | null }
export interface T { id: string; sujet: string; status: string; priorite: string; created_at: string; client_nom: string | null }
export interface C { id: string; type: string; statut: string; archived_at: string | null; created_at: string; entity: string }

export interface Donnees { factures: F[]; devis: D[]; leads: L[]; abonnements: A[]; tickets: T[]; clients: C[] }

const MAX = 5000;
const COLONNES_LEADS = "id, nom, entreprise, status, type, created_at, relance_at, priorite, client_id, entity, type_client";

const COLONNES_ABOS = "id, client_nom, client_id, libelle, montant_mensuel, statut, date_debut, date_renouvellement, derniere_facture_le, jour_facturation, entity";

// Colonnes ajoutées par les lots 4 (« source ») et 7 (« stripe_subscription_id ») :
// si la base n'est pas encore à jour, on charge les données sans elles.
type Reponse = { data: unknown[] | null; error: { message: string } | null };
async function chargerAvecRepli(table: string, colonnes: string, ajout: string): Promise<Reponse> {
  const r: Reponse = await supabaseClient.from(table).select(`${colonnes}, ${ajout}`).limit(MAX);
  if (r.error && new RegExp(ajout).test(r.error.message ?? "")) return await supabaseClient.from(table).select(colonnes).limit(MAX);
  return r;
}
const chargerLeads = () => chargerAvecRepli("leads", COLONNES_LEADS, "source");

async function chargerDonnees(): Promise<Donnees> {
  const [f, d, l, a, t, c] = await Promise.all([
    supabaseClient.from("factures_vue").select("id, numero, status, total_ht, total_ttc, date_facture, date_echeance, paid_at, client_id, client_nom, entity, en_retard, reste_a_payer, abonnement_id, devis_id, created_at").limit(MAX),
    supabaseClient.from("devis").select("id, numero, statut, total_ht, total_ttc, date_devis, created_at, envoye_at, signed_at, client_id, client_nom, lead_id, derniere_relance_le, entity").limit(MAX),
    chargerLeads(),
    chargerAvecRepli("abonnements", COLONNES_ABOS, "stripe_subscription_id"),
    supabaseClient.from("tickets").select("id, sujet, status, priorite, created_at, client_nom").limit(MAX),
    supabaseClient.from("clients").select("id, type, statut, archived_at, created_at, entity").limit(MAX),
  ]);
  const err = [f, d, l, a, t, c].find((r) => r.error)?.error;
  if (err) throw err;
  const n = <X,>(rows: X[] | null) => (rows ?? []).map((r: any) => ({ ...r, total_ht: Number(r.total_ht ?? 0), total_ttc: Number(r.total_ttc ?? 0), montant_mensuel: Number(r.montant_mensuel ?? 0), reste_a_payer: Number(r.reste_a_payer ?? 0) })) as X[];
  return { factures: n<F>(f.data as F[]), devis: n<D>(d.data as D[]), leads: n<L>(l.data as L[]), abonnements: n<A>(a.data as A[]), tickets: (t.data ?? []) as T[], clients: (c.data ?? []) as C[] };
}

/**
 * Données du tableau de bord et du pilotage, mises en cache 30 s et partagées
 * entre les écrans (pas de nouveau téléchargement à chaque visite). Une erreur
 * ou un délai dépassé produit un message, jamais un chargement infini.
 */
export function useDonnees() {
  const q = useQuery({ queryKey: ["dhb", "donnees-pilotage"], queryFn: chargerDonnees, staleTime: 30_000 });
  const msg = q.error ? String((q.error as { message?: string }).message ?? q.error) : null;
  const erreur = !msg ? null
    : /does not exist|schema cache/i.test(msg)
      ? "La base n'est pas à jour : exécutez supabase/full-setup.sql dans Supabase pour activer ces indicateurs."
      : messageErreurBase(q.error);
  return { data: q.data ?? null, erreur, loading: q.isLoading, recharger: () => { void q.refetch(); } };
}

// ---------------------------------------------------------------------------
// Calculs
// ---------------------------------------------------------------------------
export const dateEncaissement = (f: F) => dayjs(f.paid_at ?? f.date_facture);
const dans = (d: Dayjs, from: Dayjs, to: Dayjs) => !d.isBefore(from) && d.isBefore(to);

export function caEncaisse(factures: F[], from: Dayjs, to: Dayjs) {
  return factures.filter((f) => f.status === "payee" && dans(dateEncaissement(f), from, to)).reduce((s, f) => s + f.total_ttc, 0);
}
export function caFacture(factures: F[], from: Dayjs, to: Dayjs) {
  return factures.filter((f) => ["envoyee", "payee"].includes(f.status) && dans(dayjs(f.date_facture), from, to)).reduce((s, f) => s + f.total_ttc, 0);
}

export function serieMensuelle(factures: F[], mois = 12) {
  const debut = dayjs().startOf("month").subtract(mois - 1, "month");
  return Array.from({ length: mois }, (_, i) => {
    const m = debut.add(i, "month");
    return {
      cle: m.format("YYYY-MM"),
      mois: m.format("MMM YY").replace(".", ""),
      encaisse: Math.round(caEncaisse(factures, m, m.add(1, "month"))),
      facture: Math.round(caFacture(factures, m, m.add(1, "month"))),
    };
  });
}

export const mrr = (abos: A[]) => abos.filter((a) => a.statut === "actif").reduce((s, a) => s + a.montant_mensuel, 0);

export function kpis(d: Donnees) {
  const now = dayjs();
  const mois = now.startOf("month");
  const annee = now.startOf("year");
  const caMois = caEncaisse(d.factures, mois, now.add(1, "day"));
  const caMoisPrec = caEncaisse(d.factures, mois.subtract(1, "month"), mois);
  const caAnnee = caEncaisse(d.factures, annee, now.add(1, "day"));
  const caAnneePrec = caEncaisse(d.factures, annee.subtract(1, "year"), now.subtract(1, "year").add(1, "day"));
  const caTotal = d.factures.filter((f) => f.status === "payee").reduce((s, f) => s + f.total_ttc, 0);
  const impayees = d.factures.filter((f) => f.status === "envoyee");
  const enRetard = impayees.filter((f) => f.en_retard);
  const devisAttente = d.devis.filter((x) => x.statut === "envoye" && !x.signed_at);
  const prospects = (from: Dayjs, to: Dayjs) => d.leads.filter((l) => l.type !== "question" && dans(dayjs(l.created_at), from, to)).length;
  const p30 = prospects(now.subtract(30, "day"), now.add(1, "day"));
  const p60 = prospects(now.subtract(60, "day"), now.subtract(30, "day"));
  const r = mrr(d.abonnements);
  return {
    caMois, caMoisPrec, caAnnee, caAnneePrec, caTotal,
    impayeesNb: impayees.length,
    impayeesMontant: impayees.reduce((s, f) => s + f.reste_a_payer, 0),
    enRetardNb: enRetard.length,
    enRetardMontant: enRetard.reduce((s, f) => s + f.reste_a_payer, 0),
    devisAttenteNb: devisAttente.length,
    devisAttenteMontant: devisAttente.reduce((s, x) => s + x.total_ttc, 0),
    mrr: r, arr: r * 12,
    abosActifs: d.abonnements.filter((a) => a.statut === "actif").length,
    clientsActifs: d.clients.filter((c) => !c.archived_at && c.statut === "client").length,
    clientsTotal: d.clients.filter((c) => !c.archived_at).length,
    prospects30: p30, prospects30Prec: p60,
    ticketsOuverts: d.tickets.filter((t) => ["ouvert", "en_cours"].includes(t.status)).length,
    ticketsUrgents: d.tickets.filter((t) => ["ouvert", "en_cours"].includes(t.status) && t.priorite === "urgente").length,
  };
}

// ---------------------------------------------------------------------------
// Tâches du jour : chaque ligne renvoie vers la liste filtrée correspondante.
// ---------------------------------------------------------------------------
export interface Tache { cle: string; nombre: number; titre: string; detail: string; to: string; ton: "primary" | "warning" | "danger" | "info" | "success"; action?: "generer" }

export const devisARelancer = (x: D) => {
  const envoi = dayjs(x.envoye_at ?? x.created_at);
  const relance = x.derniere_relance_le ? dayjs(x.derniere_relance_le) : null;
  return x.statut === "envoye" && !x.signed_at && envoi.isBefore(dayjs().subtract(7, "day")) && (!relance || relance.isBefore(dayjs().subtract(7, "day")));
};
export const aboFactureADue = (a: A) => {
  // Prélevé par Stripe : la facture est créée automatiquement à chaque paiement reçu.
  if (a.statut !== "actif" || a.stripe_subscription_id) return false;
  const deja = a.derniere_facture_le && a.derniere_facture_le.slice(0, 7) >= dayjs().format("YYYY-MM");
  return !deja && dayjs().date() >= (a.jour_facturation ?? 1);
};
export const aboRenouvellementProche = (a: A) =>
  a.statut === "actif" && !!a.date_renouvellement && dayjs(a.date_renouvellement).diff(dayjs().startOf("day"), "day") <= 30;
export const leadRelanceDue = (l: L) => !!l.relance_at && !dayjs(l.relance_at).isAfter(dayjs(), "day") && LEAD_OUVERTS.includes(l.status);

export function taches(d: Donnees): Tache[] {
  const facturesParDevis = new Set(d.factures.filter((f) => f.devis_id && f.status !== "annulee").map((f) => f.devis_id));
  const plur = (n: number, s: string, p?: string) => (n > 1 ? p ?? `${s}s` : s);
  const list: Tache[] = [];
  const nouveaux = d.leads.filter((l) => l.type !== "question" && l.status === "nouveau");
  const questions = d.leads.filter((l) => l.type === "question" && l.status === "nouveau");
  const relLeads = d.leads.filter(leadRelanceDue);
  const relDevis = d.devis.filter(devisARelancer);
  const aFacturer = d.devis.filter((x) => x.statut === "accepte" && !facturesParDevis.has(x.id));
  const retard = d.factures.filter((f) => f.en_retard);
  const brouillons = d.factures.filter((f) => f.status === "brouillon");
  const aboDus = d.abonnements.filter(aboFactureADue);
  const renouv = d.abonnements.filter(aboRenouvellementProche);
  const urgents = d.tickets.filter((t) => ["ouvert", "en_cours"].includes(t.status) && t.priorite === "urgente");

  if (urgents.length) list.push({ cle: "urgents", nombre: urgents.length, titre: `${plur(urgents.length, "ticket urgent")} à traiter`, detail: urgents.slice(0, 2).map((t) => t.sujet).join(" · "), to: "/tickets?priorite=urgente", ton: "danger" });
  if (retard.length) list.push({ cle: "retard", nombre: retard.length, titre: `${plur(retard.length, "facture")} en retard de paiement`, detail: retard.slice(0, 2).map((f) => `${f.numero} — ${f.client_nom ?? ""}`).join(" · "), to: "/factures?etat=en_retard", ton: "danger" });
  if (nouveaux.length) list.push({ cle: "leads", nombre: nouveaux.length, titre: `${plur(nouveaux.length, "nouvelle demande")} de devis`, detail: nouveaux.slice(0, 2).map((l) => l.entreprise || l.nom).filter(Boolean).join(" · "), to: "/leads?statut=nouveau", ton: "primary" });
  if (relLeads.length) list.push({ cle: "relances", nombre: relLeads.length, titre: `${plur(relLeads.length, "relance")} de prospect prévue${relLeads.length > 1 ? "s" : ""}`, detail: "Date de relance atteinte", to: "/leads?relance=due", ton: "warning" });
  if (relDevis.length) list.push({ cle: "devis", nombre: relDevis.length, titre: `${plur(relDevis.length, "devis")} à relancer`, detail: "Envoyés depuis plus de 7 jours, sans réponse", to: "/devis?statut=envoye&relance=due", ton: "warning" });
  if (aFacturer.length) list.push({ cle: "afacturer", nombre: aFacturer.length, titre: `${plur(aFacturer.length, "devis accepté")} à facturer`, detail: aFacturer.slice(0, 2).map((x) => x.numero).join(" · "), to: "/devis?statut=accepte&facture=aucune", ton: "success" });
  if (aboDus.length) list.push({ cle: "abos", nombre: aboDus.length, titre: `${plur(aboDus.length, "facture")} d'abonnement à générer`, detail: "Facturation du mois en cours", to: "/abonnements?alerte=facture", ton: "info", action: "generer" });
  if (brouillons.length) list.push({ cle: "brouillons", nombre: brouillons.length, titre: `${plur(brouillons.length, "facture")} en brouillon à émettre`, detail: "Relire puis envoyer au client", to: "/factures?statut=brouillon", ton: "info" });
  if (renouv.length) list.push({ cle: "renouv", nombre: renouv.length, titre: `${plur(renouv.length, "abonnement")} à renouveler sous 30 jours`, detail: renouv.slice(0, 2).map((a) => a.client_nom).filter(Boolean).join(" · "), to: "/abonnements?alerte=renouvellement", ton: "warning" });
  if (questions.length) list.push({ cle: "questions", nombre: questions.length, titre: `${plur(questions.length, "question")} reçue${questions.length > 1 ? "s" : ""} sans réponse`, detail: "Depuis les sites", to: "/support/questions?statut=nouveau", ton: "primary" });
  return list;
}

// ---------------------------------------------------------------------------
// Blocs du tableau de bord (Commercial, Clients, Finance, Acquisition).
// Uniquement des données enregistrées ; un taux sans dénominateur reste null (« — »).
// ---------------------------------------------------------------------------
export interface Taux { n: number; d: number }
export const valeurTaux = (t: Taux) => (t.d > 0 ? (t.n / t.d) * 100 : null);

export function blocsTableau(d: Donnees) {
  const now = dayjs();
  const fin = now.add(1, "day");
  const j30 = now.subtract(30, "day");
  const j60 = now.subtract(60, "day");
  const j90 = now.subtract(90, "day");
  const mois = now.startOf("month");
  const an = now.subtract(12, "month");

  // Commercial
  const leadsCom = d.leads.filter((l) => l.type !== "question");
  const recus = (from: Dayjs, to: Dayjs) => leadsCom.filter((l) => dans(dayjs(l.created_at), from, to));
  const leads90 = recus(j90, fin);
  const devis90 = d.devis.filter((x) => dans(dayjs(x.date_devis), j90, fin));
  const devisAttente = d.devis.filter((x) => x.statut === "envoye" && !x.signed_at);
  const commercial = {
    demandes30: recus(j30, fin).length,
    demandes30Prec: recus(j60, j30).length,
    transformation90: { n: leads90.filter((l) => l.status === "gagne").length, d: leads90.length } as Taux,
    acceptation90: {
      n: devis90.filter((x) => x.statut === "accepte").length,
      d: devis90.filter((x) => ["envoye", "accepte", "refuse", "expire"].includes(x.statut)).length,
    } as Taux,
    devisAttenteNb: devisAttente.length,
    devisAttenteMontant: devisAttente.reduce((s, x) => s + x.total_ttc, 0),
    devisARelancer: d.devis.filter(devisARelancer).length,
    relancesDues: d.leads.filter(leadRelanceDue).length,
  };

  // Clients
  const vivants = d.clients.filter((c) => !c.archived_at);
  const ouverts = d.tickets.filter((t) => ["ouvert", "en_cours"].includes(t.status));
  const clients = {
    actifs: vivants.filter((c) => c.statut === "client").length,
    prospects: vivants.filter((c) => c.statut === "prospect").length,
    inactifs: vivants.filter((c) => c.statut === "inactif").length,
    nouveaux30: vivants.filter((c) => dans(dayjs(c.created_at), j30, fin)).length,
    ticketsOuverts: ouverts.length,
    ticketsUrgents: ouverts.filter((t) => t.priorite === "urgente").length,
  };

  // Finance (12 derniers mois pour le panier et le délai de paiement)
  const payees12 = d.factures.filter((f) => f.status === "payee" && dans(dateEncaissement(f), an, fin));
  const delais = payees12.filter((f) => f.paid_at).map((f) => Math.max(0, dayjs(f.paid_at!).diff(dayjs(f.date_facture), "day")));
  const impayees = d.factures.filter((f) => f.status === "envoyee");
  const retard = impayees.filter((f) => f.en_retard);
  const finance = {
    factureMois: caFacture(d.factures, mois, fin),
    encaisseMois: caEncaisse(d.factures, mois, fin),
    aEncaisser: impayees.reduce((s, f) => s + f.reste_a_payer, 0),
    retardNb: retard.length,
    retardMontant: retard.reduce((s, f) => s + f.reste_a_payer, 0),
    panierMoyen: payees12.length ? payees12.reduce((s, f) => s + f.total_ttc, 0) / payees12.length : null,
    delaiPaiementMoyen: delais.length ? delais.reduce((s, x) => s + x, 0) / delais.length : null,
    aboAFacturer: d.abonnements.filter(aboFactureADue).length,
  };

  // Acquisition : origine des demandes des 30 derniers jours (lot 4).
  const parOrigine = new Map<string | null, number>();
  recus(j30, fin).forEach((l) => parOrigine.set(l.source ?? null, (parOrigine.get(l.source ?? null) ?? 0) + 1));
  const acquisition = {
    total30: commercial.demandes30,
    origines: [...parOrigine.entries()].map(([source, nombre]) => ({ source, nombre })).sort((a, b) => b.nombre - a.nombre),
  };

  return { commercial, clients, finance, acquisition };
}
export type BlocsTableau = ReturnType<typeof blocsTableau>;
