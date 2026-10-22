// =====================================================================
//  DHB — Google Drive : un dossier par client (et ses sous-dossiers) dans
//  « DHB — Clients », copie des PDF des devis (dernière version) et des
//  factures (archive). Autorisation « drive.file » : DHB ne voit QUE les
//  dossiers et fichiers qu'il a lui-même créés, jamais le reste du Drive.
//
//  Utilisé par le robot (file d'événements) et par la fonction drive-sync
//  (bouton « Créer / réessayer » et rattrapage des clients existants).
// =====================================================================
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { HttpError } from "./securite.ts";
import { lireFichier } from "./documents.ts";
import type { Octets } from "./pdf.ts";

const URL_API = () => Deno.env.get("DRIVE_API_URL") || "https://www.googleapis.com";
const DOSSIER = "application/vnd.google-apps.folder";
const NOM_RACINE = "DHB — Clients";

/** Erreur Drive : « temporaire » = à réessayer plus tard (réseau, quota, panne Google). */
export class ErreurDrive extends Error {
  constructor(public temporaire: boolean, message: string) { super(message); }
}

async function appel(jeton: string, methode: string, chemin: string, corps?: BodyInit, type?: string) {
  let r: Response;
  try {
    r = await fetch(`${URL_API()}${chemin}`, { method: methode, headers: { Authorization: `Bearer ${jeton}`, ...(type ? { "Content-Type": type } : {}) }, body: corps });
  } catch {
    throw new ErreurDrive(true, "Google Drive injoignable");
  }
  if (r.status === 404) return null;
  if (!r.ok) {
    const d = await r.json().catch(() => ({})) as { error?: { message?: string; errors?: { reason?: string }[] } };
    const raison = d.error?.errors?.[0]?.reason ?? "";
    if (r.status === 429 || r.status >= 500 || /rateLimit/i.test(raison)) throw new ErreurDrive(true, `Google Drive momentanément indisponible (${r.status})`);
    if (r.status === 401 || r.status === 403) throw new ErreurDrive(false, "Accès à Google Drive refusé : reconnectez le compte Google (autorisation « Drive » nécessaire).");
    throw new ErreurDrive(false, `Google Drive refuse l'opération (${r.status}${d.error?.message ? ` : ${d.error.message}` : ""})`);
  }
  return await r.json().catch(() => ({})) as Record<string, unknown>;
}

const echapper = (t: string) => t.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

async function dossierExiste(jeton: string, id: string): Promise<boolean> {
  const f = await appel(jeton, "GET", `/drive/v3/files/${encodeURIComponent(id)}?fields=id,trashed`);
  return !!f && f.trashed !== true;
}
async function creerDossier(jeton: string, nom: string, parent?: string) {
  const f = await appel(jeton, "POST", "/drive/v3/files?fields=id,webViewLink", JSON.stringify({ name: nom, mimeType: DOSSIER, ...(parent ? { parents: [parent] } : {}) }), "application/json");
  if (!f?.id) throw new ErreurDrive(true, "Création du dossier Drive sans réponse");
  return { id: String(f.id), url: String(f.webViewLink ?? `https://drive.google.com/drive/folders/${f.id}`) };
}
async function sousDossier(jeton: string, parent: string, nom: string): Promise<string> {
  const q = encodeURIComponent(`'${echapper(parent)}' in parents and name = '${echapper(nom)}' and mimeType = '${DOSSIER}' and trashed = false`);
  const l = await appel(jeton, "GET", `/drive/v3/files?q=${q}&fields=files(id)&pageSize=1`) as { files?: { id: string }[] } | null;
  return l?.files?.[0]?.id ?? (await creerDossier(jeton, nom, parent)).id;
}

export interface ReglagesDrive { actif: boolean; sousDossiers: string[]; racineId: string | null }
export async function reglagesDrive(sb: SupabaseClient): Promise<ReglagesDrive> {
  const { data } = await sb.from("integrations").select("details").eq("cle", "drive").maybeSingle();
  const d = (data?.details ?? {}) as { actif?: boolean; sous_dossiers?: string[]; racine_id?: string };
  return { actif: d.actif === true, sousDossiers: Array.isArray(d.sous_dossiers) ? d.sous_dossiers : [], racineId: d.racine_id ?? null };
}

async function racine(sb: SupabaseClient, jeton: string, r: ReglagesDrive): Promise<string> {
  if (r.racineId && await dossierExiste(jeton, r.racineId)) return r.racineId;
  const d = await creerDossier(jeton, NOM_RACINE);
  const { data } = await sb.from("integrations").select("details").eq("cle", "drive").maybeSingle();
  await sb.from("integrations").update({ details: { ...(data?.details ?? {}), racine_id: d.id }, statut: "connecte", erreur: null, derniere_synchro: new Date().toISOString() }).eq("cle", "drive");
  r.racineId = d.id;
  return d.id;
}

/** Dossier du client (créé si besoin, recréé s'il a été supprimé du Drive) et ses sous-dossiers. */
export async function assurerDossierClient(sb: SupabaseClient, jeton: string, clientId: string, r: ReglagesDrive): Promise<{ id: string; sous: string[] }> {
  const { data: c } = await sb.from("clients").select("id, nom, entreprise, drive_folder_id").eq("id", clientId).maybeSingle();
  if (!c) throw new ErreurDrive(false, "Client introuvable");
  try {
    let id = c.drive_folder_id as string | null;
    if (!id || !(await dossierExiste(jeton, id))) {
      const d = await creerDossier(jeton, String(c.entreprise || c.nom || "Client").slice(0, 120), await racine(sb, jeton, r));
      id = d.id;
      await sb.from("clients").update({ drive_folder_id: d.id, drive_folder_url: d.url, drive_cree_le: new Date().toISOString() }).eq("id", c.id);
    }
    const sous: string[] = [];
    for (const nom of r.sousDossiers) sous.push(await sousDossier(jeton, id, nom));
    await sb.from("clients").update({ drive_sync_statut: "a_jour", drive_erreur: null }).eq("id", c.id);
    return { id, sous };
  } catch (e) {
    await sb.from("clients").update({ drive_sync_statut: "erreur", drive_erreur: (e as Error).message.slice(0, 300) }).eq("id", c.id);
    throw e;
  }
}

/** Copie un PDF dans le dossier du client : devis → 1er sous-dossier, facture → 2e. */
export async function copierDocument(sb: SupabaseClient, jeton: string, documentId: string, r: ReglagesDrive): Promise<"copie" | "remplace" | "deja" | "ignore"> {
  const { data: d } = await sb.from("documents").select("*").eq("id", documentId).maybeSingle();
  if (!d || !d.client_id) return "ignore";
  const dossier = await assurerDossierClient(sb, jeton, d.client_id, r);
  try {
    // Facture : l'archive ne change jamais → une seule copie.
    if (d.type === "facture" && d.drive_file_id && await dossierExiste(jeton, d.drive_file_id)) return "deja";
    let octets: Octets;
    try { octets = await lireFichier(sb, d.chemin); } catch (e) {
      if (e instanceof HttpError) throw new ErreurDrive(true, "PDF momentanément illisible dans le stockage DHB");
      throw e;
    }
    if (d.type === "devis" && d.drive_file_id && await dossierExiste(jeton, d.drive_file_id)) {
      await appel(jeton, "PATCH", `/upload/drive/v3/files/${encodeURIComponent(d.drive_file_id)}?uploadType=media`, octets, "application/pdf");
      await sb.from("documents").update({ drive_copie_le: new Date().toISOString(), drive_erreur: null }).eq("id", d.id);
      return "remplace";
    }
    const parent = dossier.sous[d.type === "devis" ? 0 : 1] ?? dossier.id;
    const limite = `dhb-${crypto.randomUUID()}`;
    const meta = JSON.stringify({ name: d.nom_fichier, parents: [parent], mimeType: "application/pdf" });
    const entete = new TextEncoder().encode(`--${limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${limite}\r\nContent-Type: application/pdf\r\n\r\n`);
    const fin = new TextEncoder().encode(`\r\n--${limite}--`);
    const corps = new Uint8Array(entete.length + octets.length + fin.length);
    corps.set(entete); corps.set(octets, entete.length); corps.set(fin, entete.length + octets.length);
    const f = await appel(jeton, "POST", "/upload/drive/v3/files?uploadType=multipart&fields=id", corps, `multipart/related; boundary=${limite}`);
    if (!f?.id) throw new ErreurDrive(true, "Envoi du PDF vers Drive sans réponse");
    await sb.from("documents").update({ drive_file_id: String(f.id), drive_copie_le: new Date().toISOString(), drive_erreur: null }).eq("id", d.id);
    return "copie";
  } catch (e) {
    await sb.from("documents").update({ drive_erreur: (e as Error).message.slice(0, 300) }).eq("id", d.id);
    throw e;
  }
}
