// Libellés partagés dans toute l'admin.

export const ENTITY: Record<string, string> = {
  groupe: "Groupe",
  infogerance: "Infogérance",
  particuliers: "Particuliers",
};
export const ENTITY_OPTIONS = Object.entries(ENTITY).map(([value, label]) => ({
  value,
  label,
}));

export const LEAD_STATUS: Record<string, string> = {
  nouveau: "Nouveau",
  contacte: "Contacté",
  devis_envoye: "Devis envoyé",
  gagne: "Gagné",
  perdu: "Perdu",
  archive: "Archivé",
};

export const CLIENT_STATUT: Record<string, string> = {
  prospect: "Prospect",
  client: "Client",
  inactif: "Inactif",
};
export const CLIENT_TYPE: Record<string, string> = {
  entreprise: "Entreprise",
  particulier: "Particulier",
};

export const DEVIS_STATUT: Record<string, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  accepte: "Accepté",
  refuse: "Refusé",
  expire: "Expiré",
};

export const FACTURE_STATUT: Record<string, string> = {
  brouillon: "Brouillon",
  envoyee: "Envoyée",
  payee: "Payée",
  annulee: "Annulée",
};

export const ABO_STATUT: Record<string, string> = {
  actif: "Actif",
  suspendu: "Suspendu",
  resilie: "Résilié",
};

export const TICKET_STATUT: Record<string, string> = {
  ouvert: "Ouvert",
  en_cours: "En cours",
  resolu: "Résolu",
  ferme: "Fermé",
};
export const TICKET_PRIORITE: Record<string, string> = {
  basse: "Basse",
  normale: "Normale",
  haute: "Haute",
  urgente: "Urgente",
};

export const STATUS_COLOR: Record<string, string> = {
  nouveau: "blue",
  contacte: "gold",
  devis_envoye: "purple",
  gagne: "green",
  perdu: "red",
  archive: "default",
  prospect: "gold",
  client: "green",
  inactif: "default",
  brouillon: "default",
  envoye: "blue",
  envoyee: "blue",
  accepte: "green",
  payee: "green",
  refuse: "red",
  expire: "red",
  annulee: "red",
  actif: "green",
  suspendu: "gold",
  resilie: "red",
  ouvert: "blue",
  en_cours: "gold",
  resolu: "green",
  ferme: "default",
};

// Mapping valeur -> {value,label} pour les <Select>.
export const toOptions = (map: Record<string, string>) =>
  Object.entries(map).map(([value, label]) => ({ value, label }));
