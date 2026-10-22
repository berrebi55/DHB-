// =====================================================================
//  DHB — PDF des devis et factures : production, archivage, lecture.
//  Utilisé par render-pdf (téléchargement) et par les envois d'email (pièce
//  jointe). Règles (lot 6) :
//  - facture émise : PDF archivé UNE fois, jamais régénéré ni écrasé ;
//  - devis : dernière version conservée ;
//  - facture brouillon : aperçu non conservé.
// =====================================================================
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { HttpError } from "./securite.ts";
import { genererPdf, type Octets, type TypeDocument } from "./pdf.ts";

const ESPACE = "documents";
export const FACTURE_EMISE = ["envoyee", "payee", "annulee"];
export type EtatPdf = "archive" | "mis-a-jour" | "apercu";
export interface Pdf { octets: Octets; nom: string; etat: EtatPdf }

export const nomFichier = (type: TypeDocument, numero: string | null) =>
  `${type === "devis" ? "Devis" : "Facture"}-${(numero || "brouillon").replace(/[^A-Za-z0-9._-]+/g, "-")}.pdf`;

async function empreinte(octets: Octets) {
  const h = await crypto.subtle.digest("SHA-256", octets);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function lireFichier(sb: SupabaseClient, chemin: string): Promise<Octets> {
  const { data, error } = await sb.storage.from(ESPACE).download(chemin);
  if (error || !data) throw new HttpError(502, "stockage_indisponible");
  return new Uint8Array(await data.arrayBuffer());
}

/** PDF archivé d'un document (par l'identifiant de la ligne « documents »). */
export async function pdfArchive(sb: SupabaseClient, documentId: string): Promise<Pdf> {
  const { data: doc } = await sb.from("documents").select("*").eq("id", documentId).maybeSingle();
  if (!doc) throw new HttpError(404, "document_introuvable");
  return { octets: await lireFichier(sb, doc.chemin), nom: doc.nom_fichier, etat: "archive" };
}

/**
 * Archive le PDF d'une facture émise (une seule fois). Si une archive existe déjà
 * (ou un fichier déjà déposé), c'est elle qui est renvoyée : jamais d'écrasement.
 */
// deno-lint-ignore no-explicit-any
export async function archiverFacture(sb: SupabaseClient, f: any, octets: Octets, userId: string | null): Promise<Pdf> {
  const { data: existant } = await sb.from("documents").select("chemin, nom_fichier").eq("type", "facture").eq("facture_id", f.id).maybeSingle();
  if (existant) return { octets: await lireFichier(sb, existant.chemin), nom: existant.nom_fichier, etat: "archive" };
  const chemin = `factures/${f.id}.pdf`;
  const nom = nomFichier("facture", f.numero);
  const { error: eUp } = await sb.storage.from(ESPACE).upload(chemin, octets, { contentType: "application/pdf", upsert: false });
  if (eUp) octets = await lireFichier(sb, chemin);
  const { error: eIns } = await sb.from("documents").insert({
    type: "facture", facture_id: f.id, client_id: f.client_id ?? null, numero: f.numero ?? null,
    nom_fichier: nom, chemin, taille_octets: octets.length, empreinte_sha256: await empreinte(octets), cree_par: userId,
  });
  if (eIns) {
    // Deux demandes simultanées : l'autre a archivé en premier, on renvoie son fichier.
    const { data: gagnant } = await sb.from("documents").select("chemin, nom_fichier").eq("type", "facture").eq("facture_id", f.id).maybeSingle();
    if (gagnant) return { octets: await lireFichier(sb, gagnant.chemin), nom: gagnant.nom_fichier, etat: "archive" };
    throw new HttpError(500, "archivage_impossible");
  }
  return { octets, nom, etat: "archive" };
}

/** PDF d'un devis ou d'une facture selon les règles ci-dessus. */
export async function obtenirPdf(sb: SupabaseClient, type: TypeDocument, id: string, userId: string | null): Promise<Pdf> {
  const { data: d } = await sb.from(type === "devis" ? "devis" : "factures").select("*").eq("id", id).maybeSingle();
  if (!d) throw new HttpError(404, "document_introuvable");
  const { data: ent } = await sb.from("entreprise").select("*").eq("id", 1).maybeSingle();
  const nom = nomFichier(type, d.numero);

  if (type === "facture" && FACTURE_EMISE.includes(d.status)) {
    const { data: existant } = await sb.from("documents").select("chemin, nom_fichier").eq("type", "facture").eq("facture_id", d.id).maybeSingle();
    if (existant) return { octets: await lireFichier(sb, existant.chemin), nom: existant.nom_fichier, etat: "archive" };
    return await archiverFacture(sb, d, await genererPdf("facture", d, ent), userId);
  }

  const octets = await genererPdf(type, d, ent);
  if (type === "devis") {
    const chemin = `devis/${d.id}.pdf`;
    const { error: eUp } = await sb.storage.from(ESPACE).upload(chemin, octets, { contentType: "application/pdf", upsert: true });
    if (!eUp) {
      const ligne = {
        type: "devis", devis_id: d.id, client_id: d.client_id ?? null, numero: d.numero ?? null, nom_fichier: nom, chemin,
        taille_octets: octets.length, empreinte_sha256: await empreinte(octets), cree_par: userId, updated_at: new Date().toISOString(),
      };
      const { data: existant } = await sb.from("documents").select("id").eq("type", "devis").eq("devis_id", d.id).maybeSingle();
      if (existant) await sb.from("documents").update(ligne).eq("id", existant.id);
      else await sb.from("documents").insert(ligne);
    }
    // Stockage indisponible : le PDF est tout de même fourni (il se régénère).
    return { octets, nom, etat: eUp ? "apercu" : "mis-a-jour" };
  }
  return { octets, nom, etat: "apercu" };
}
