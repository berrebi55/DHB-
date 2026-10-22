// Référentiel unique des statuts : libellés et tons identiques sur tous les écrans.

export type Tone = "neutral" | "primary" | "info" | "success" | "warning" | "danger" | "purple";

export interface StatutDef {
  value: string;
  label: string;
  tone: Tone;
}

const toMap = (list: StatutDef[]) =>
  Object.fromEntries(list.map((s) => [s.value, s])) as Record<string, StatutDef>;

export const LEAD_STATUTS: StatutDef[] = [
  { value: "nouveau", label: "Nouveau", tone: "primary" },
  { value: "a_contacter", label: "À contacter", tone: "warning" },
  { value: "contacte", label: "Contacté", tone: "info" },
  { value: "devis_a_preparer", label: "Devis à préparer", tone: "purple" },
  { value: "devis_envoye", label: "Devis envoyé", tone: "info" },
  { value: "gagne", label: "Gagné", tone: "success" },
  { value: "perdu", label: "Perdu", tone: "danger" },
  { value: "archive", label: "Archivé", tone: "neutral" },
];
export const LEAD_OUVERTS = ["nouveau", "a_contacter", "contacte", "devis_a_preparer", "devis_envoye"];

export const PRIORITES: StatutDef[] = [
  { value: "basse", label: "Basse", tone: "neutral" },
  { value: "normale", label: "Normale", tone: "info" },
  { value: "haute", label: "Haute", tone: "warning" },
  { value: "urgente", label: "Urgente", tone: "danger" },
];

export const CLIENT_STATUTS: StatutDef[] = [
  { value: "prospect", label: "Prospect", tone: "warning" },
  { value: "client", label: "Client", tone: "success" },
  { value: "inactif", label: "Inactif", tone: "neutral" },
];

export const DEVIS_STATUTS: StatutDef[] = [
  { value: "brouillon", label: "Brouillon", tone: "neutral" },
  { value: "envoye", label: "Envoyé", tone: "info" },
  { value: "accepte", label: "Accepté", tone: "success" },
  { value: "refuse", label: "Refusé", tone: "danger" },
  { value: "expire", label: "Expiré", tone: "warning" },
];

export const FACTURE_STATUTS: StatutDef[] = [
  { value: "brouillon", label: "Brouillon", tone: "neutral" },
  { value: "envoyee", label: "Envoyée", tone: "info" },
  { value: "payee", label: "Payée", tone: "success" },
  { value: "annulee", label: "Annulée", tone: "danger" },
];

export const ABO_STATUTS: StatutDef[] = [
  { value: "actif", label: "Actif", tone: "success" },
  { value: "suspendu", label: "Suspendu", tone: "warning" },
  { value: "resilie", label: "Résilié", tone: "neutral" },
];

export const TICKET_STATUTS: StatutDef[] = [
  { value: "ouvert", label: "Ouvert", tone: "primary" },
  { value: "en_cours", label: "En cours", tone: "warning" },
  { value: "resolu", label: "Résolu", tone: "success" },
  { value: "ferme", label: "Fermé", tone: "neutral" },
];

export const MOYENS_PAIEMENT: StatutDef[] = [
  { value: "virement", label: "Virement", tone: "info" },
  { value: "carte", label: "Carte bancaire", tone: "info" },
  { value: "prelevement", label: "Prélèvement", tone: "info" },
  { value: "cheque", label: "Chèque", tone: "info" },
  { value: "especes", label: "Espèces", tone: "info" },
  { value: "stripe", label: "Stripe (en ligne)", tone: "info" },
  { value: "autre", label: "Autre", tone: "neutral" },
];

export const ENTITES: StatutDef[] = [
  { value: "infogerance", label: "DHB Pro", tone: "primary" },
  { value: "particuliers", label: "DHB Assistance", tone: "success" },
  { value: "groupe", label: "DHB Groupe", tone: "neutral" },
];

export const TYPES_CLIENT: StatutDef[] = [
  { value: "entreprise", label: "Entreprise", tone: "info" },
  { value: "particulier", label: "Particulier", tone: "purple" },
];

// Origine d'une demande : calculée par la base pour les formulaires des sites
// (supabase/full-setup.sql, classer_source_lead), choisie à la main sinon.
export const SOURCES_LEAD: StatutDef[] = [
  { value: "recherche", label: "Recherche Google / Bing", tone: "info" },
  { value: "publicite", label: "Publicité en ligne", tone: "warning" },
  { value: "reseaux_sociaux", label: "Réseaux sociaux", tone: "purple" },
  { value: "email", label: "Campagne email", tone: "primary" },
  { value: "site_referent", label: "Lien depuis un autre site", tone: "info" },
  { value: "site_dhb", label: "Autre site DHB", tone: "neutral" },
  { value: "direct", label: "Accès direct", tone: "neutral" },
  { value: "telephone", label: "Appel téléphonique", tone: "success" },
  { value: "recommandation", label: "Recommandation", tone: "success" },
  { value: "autre", label: "Autre", tone: "neutral" },
];

export const TYPES_NOTE: StatutDef[] = [
  { value: "note", label: "Note", tone: "neutral" },
  { value: "appel", label: "Appel", tone: "success" },
  { value: "email", label: "Email", tone: "info" },
  { value: "rendez_vous", label: "Rendez-vous", tone: "purple" },
];

export const MAPS = {
  lead: toMap(LEAD_STATUTS),
  priorite: toMap(PRIORITES),
  client: toMap(CLIENT_STATUTS),
  devis: toMap(DEVIS_STATUTS),
  facture: toMap(FACTURE_STATUTS),
  abo: toMap(ABO_STATUTS),
  ticket: toMap(TICKET_STATUTS),
  moyen: toMap(MOYENS_PAIEMENT),
  entite: toMap(ENTITES),
  typeClient: toMap(TYPES_CLIENT),
  source: toMap(SOURCES_LEAD),
  note: toMap(TYPES_NOTE),
};
export type StatutKind = keyof typeof MAPS;

export const options = (list: StatutDef[]) => list.map((s) => ({ value: s.value, label: s.label }));
export const label = (kind: StatutKind, v?: string | null) => (v ? MAPS[kind][v]?.label ?? v : "—");
