// =====================================================================
//  DHB — modèles d'emails : variables {{…}} et mise en forme.
//
//  Les valeurs viennent UNIQUEMENT des données enregistrées (fiche client,
//  demande, devis, facture, ticket, fiche entreprise). Une variable inconnue
//  ou vide bloque l'envoi : jamais d'email avec « {{facture_numero}} » ou un
//  trou à la place d'une information.
// =====================================================================
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { esc, eur, marque } from "./securite.ts";
import type { Liens } from "./email.ts";

export type TypeCible = "client" | "lead" | "devis" | "facture" | "ticket";
export const TYPES_CIBLE: TypeCible[] = ["client", "lead", "devis", "facture", "ticket"];

/** Variables disponibles (affichées dans le back-office). */
export const VARIABLES: { cle: string; libelle: string; cibles: TypeCible[] | "toutes" }[] = [
  { cle: "contact_nom", libelle: "Nom du contact", cibles: "toutes" },
  { cle: "client_nom", libelle: "Client (entreprise ou nom)", cibles: "toutes" },
  { cle: "societe", libelle: "Votre société (fiche entreprise)", cibles: "toutes" },
  { cle: "signature", libelle: "Signature : société, téléphone, email", cibles: "toutes" },
  { cle: "date_du_jour", libelle: "Date du jour", cibles: "toutes" },
  { cle: "devis_numero", libelle: "N° du devis", cibles: ["devis"] },
  { cle: "devis_montant", libelle: "Montant du devis", cibles: ["devis"] },
  { cle: "devis_date", libelle: "Date du devis", cibles: ["devis"] },
  { cle: "devis_validite", libelle: "Validité du devis", cibles: ["devis"] },
  { cle: "facture_numero", libelle: "N° de la facture", cibles: ["facture"] },
  { cle: "facture_montant", libelle: "Montant de la facture", cibles: ["facture"] },
  { cle: "facture_reste", libelle: "Reste à payer", cibles: ["facture"] },
  { cle: "facture_echeance", libelle: "Échéance", cibles: ["facture"] },
  { cle: "ticket_sujet", libelle: "Sujet du ticket", cibles: ["ticket"] },
];

const dateFr = (s?: string | null) => {
  if (!s) return "";
  const [a, m, j] = String(s).slice(0, 10).split("-");
  return a && m && j ? `${j}/${m}/${a}` : "";
};
const aujourdhui = () => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris" }).format(new Date());

export interface Contexte {
  destinataire: string | null;
  vars: Record<string, string>;
  liens: Liens;
  entity: string | null;
  // deno-lint-ignore no-explicit-any
  fiche: any;
}

const TABLES: Record<TypeCible, string> = { client: "clients", lead: "leads", devis: "devis", facture: "factures_vue", ticket: "tickets" };

/** Données d'une fiche pour remplir un modèle ; null si la fiche n'existe pas. */
export async function contexte(sb: SupabaseClient, type: TypeCible, id: string): Promise<Contexte | null> {
  const { data: f } = await sb.from(TABLES[type]).select("*").eq("id", id).maybeSingle();
  if (!f) return null;
  const clientId: string | null = type === "client" ? f.id : f.client_id ?? null;
  const { data: c } = clientId && type !== "client"
    ? await sb.from("clients").select("*").eq("id", clientId).maybeSingle()
    : { data: type === "client" ? f : null };
  const { data: ent } = await sb.from("entreprise").select("raison_sociale, telephone, email").eq("id", 1).maybeSingle();
  const entity: string | null = f.entity ?? c?.entity ?? null;
  const societe = ent?.raison_sociale || marque(entity);

  const vars: Record<string, string> = {
    societe,
    signature: [societe, ent?.telephone, ent?.email].filter(Boolean).join("\n"),
    date_du_jour: aujourdhui(),
    contact_nom: (type === "lead" ? f.nom : c?.nom) || f.client_nom || c?.entreprise || "",
    client_nom: (type === "lead" ? f.entreprise || f.nom : c?.entreprise || c?.nom) || f.client_nom || "",
  };
  if (type === "devis") {
    Object.assign(vars, {
      devis_numero: f.numero ?? "", devis_montant: eur(f.total_ttc), devis_date: dateFr(f.date_devis),
      devis_validite: `${f.validite_jours ?? 30} jours`,
    });
  }
  if (type === "facture") {
    Object.assign(vars, {
      facture_numero: f.numero ?? "", facture_montant: eur(f.total_ttc), facture_reste: eur(f.reste_a_payer ?? f.total_ttc),
      facture_echeance: dateFr(f.echeance_effective ?? f.date_echeance ?? f.date_facture),
    });
  }
  if (type === "ticket") vars.ticket_sujet = f.sujet ?? "";

  const destinataire: string | null =
    (type === "client" ? f.email : type === "lead" ? f.email : f.client_email) || c?.email || null;
  const liens: Liens = { client_id: clientId };
  if (type === "lead") liens.lead_id = f.id;
  if (type === "devis") liens.devis_id = f.id;
  if (type === "facture") liens.facture_id = f.id;
  if (type === "ticket") liens.ticket_id = f.id;
  return { destinataire, vars, liens, entity, fiche: f };
}

/** Remplace les {{variables}} ; renvoie aussi celles qui sont inconnues ou vides. */
export function remplir(texte: string, vars: Record<string, string>): { texte: string; manquantes: string[] } {
  const manquantes = new Set<string>();
  const t = String(texte ?? "").replace(/\{\{\s*([^}]*?)\s*\}\}/g, (_, nom: string) => {
    const v = vars[nom];
    if (v === undefined || String(v).trim() === "") { manquantes.add(nom); return `{{${nom}}}`; }
    return String(v);
  });
  return { texte: t, manquantes: [...manquantes] };
}

/** Texte saisi → HTML sûr (échappé), paragraphes et retours à la ligne conservés. */
export function texteEnHtml(texte: string): string {
  const paragraphes = String(texte).replace(/\r/g, "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const corps = paragraphes.map((p) => `<p style="margin:0 0 14px">${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
  return `<div style="font-family:Arial,sans-serif;color:#101828;font-size:15px;line-height:1.55;max-width:600px">${corps}</div>`;
}
