// =====================================================================
//  DHB — Edge Function : PDF d'un devis ou d'une facture.
//
//  Sécurité : membre de l'équipe connecté obligatoire (requireUser). Les
//  fichiers sont rangés dans l'espace de stockage PRIVÉ « documents », lu et
//  écrit uniquement ici avec la clé serveur.
//
//  Règles :
//  - facture émise (envoyée, payée, annulée) : PDF produit et archivé UNE
//    fois ; ensuite on renvoie toujours ce même fichier (jamais régénéré) ;
//  - devis : PDF produit à chaque demande, dernière version conservée ;
//  - facture brouillon : aperçu produit à la volée, non conservé.
//
//  Appel (POST, jeton utilisateur) :
//    { "type": "devis" | "facture", "id": "<uuid>" }   → PDF du document
//    { "document_id": "<uuid>" }                        → PDF archivé
//  Réponse : le fichier PDF (Content-Type application/pdf).
//  Déploiement : supabase functions deploy render-pdf --no-verify-jwt
// =====================================================================
import { adminClient, cors, erreur, HttpError, requireUser } from "../_shared/securite.ts";
import { genererPdf, type Octets, type TypeDocument } from "../_shared/pdf.ts";

const ESPACE = "documents";
const EMISES = ["envoyee", "payee", "annulee"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function reponsePdf(octets: Octets, nom: string, archive: string) {
  return new Response(octets, {
    headers: {
      ...cors,
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nom}"`,
      "Access-Control-Expose-Headers": "Content-Disposition, X-Document-Archive",
      "X-Document-Archive": archive,   // « archive » | « mis-a-jour » | « apercu »
      "Cache-Control": "no-store",
    },
  });
}

const nomFichier = (type: TypeDocument, numero: string | null) =>
  `${type === "devis" ? "Devis" : "Facture"}-${(numero || "brouillon").replace(/[^A-Za-z0-9._-]+/g, "-")}.pdf`;

async function empreinte(octets: Octets) {
  const h = await crypto.subtle.digest("SHA-256", octets);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (req.method !== "POST") throw new HttpError(405, "methode_non_autorisee");
    const sb = adminClient();
    const moi = await requireUser(req, sb);
    const corps = await req.json().catch(() => ({})) as { type?: string; id?: string; document_id?: string };
    const stockage = sb.storage.from(ESPACE);

    const lireFichier = async (chemin: string): Promise<Octets> => {
      const { data, error } = await stockage.download(chemin);
      if (error || !data) throw new HttpError(502, "stockage_indisponible");
      return new Uint8Array(await data.arrayBuffer());
    };

    // 1) Document archivé demandé directement (liste « Documents » d'une fiche).
    if (corps.document_id !== undefined) {
      if (!UUID.test(String(corps.document_id))) throw new HttpError(400, "parametres_invalides");
      const { data: doc } = await sb.from("documents").select("*").eq("id", corps.document_id).maybeSingle();
      if (!doc) throw new HttpError(404, "document_introuvable");
      return reponsePdf(await lireFichier(doc.chemin), doc.nom_fichier, "archive");
    }

    const type = corps.type as TypeDocument;
    if (!["devis", "facture"].includes(type) || !UUID.test(String(corps.id))) throw new HttpError(400, "parametres_invalides");
    const { data: d } = await sb.from(type === "devis" ? "devis" : "factures").select("*").eq("id", corps.id).maybeSingle();
    if (!d) throw new HttpError(404, "document_introuvable");
    const { data: ent } = await sb.from("entreprise").select("*").eq("id", 1).maybeSingle();
    const nom = nomFichier(type, d.numero);

    // 2) Facture émise : archive unique, jamais régénérée.
    if (type === "facture" && EMISES.includes(d.status)) {
      const { data: existant } = await sb.from("documents").select("chemin, nom_fichier")
        .eq("type", "facture").eq("facture_id", d.id).maybeSingle();
      if (existant) return reponsePdf(await lireFichier(existant.chemin), existant.nom_fichier, "archive");

      const chemin = `factures/${d.id}.pdf`;
      let octets = await genererPdf("facture", d, ent);
      // Jamais d'écrasement : si le fichier existe déjà (demande simultanée ou tentative
      // précédente interrompue), c'est lui qui fait foi.
      const { error: eUp } = await stockage.upload(chemin, octets, { contentType: "application/pdf", upsert: false });
      if (eUp) octets = await lireFichier(chemin);
      const { error: eIns } = await sb.from("documents").insert({
        type: "facture", facture_id: d.id, client_id: d.client_id ?? null, numero: d.numero ?? null,
        nom_fichier: nom, chemin, taille_octets: octets.length, empreinte_sha256: await empreinte(octets), cree_par: moi.userId ?? null,
      });
      if (eIns) {
        // Deux demandes simultanées : l'autre a archivé en premier, on renvoie son fichier.
        const { data: gagnant } = await sb.from("documents").select("chemin, nom_fichier").eq("type", "facture").eq("facture_id", d.id).maybeSingle();
        if (gagnant) return reponsePdf(await lireFichier(gagnant.chemin), gagnant.nom_fichier, "archive");
        throw new HttpError(500, "archivage_impossible");
      }
      return reponsePdf(octets, nom, "archive");
    }

    const octets = await genererPdf(type, d, ent);

    // 3) Devis : dernière version conservée (le PDF reste disponible depuis les fiches).
    if (type === "devis") {
      const chemin = `devis/${d.id}.pdf`;
      const { error: eUp } = await stockage.upload(chemin, octets, { contentType: "application/pdf", upsert: true });
      if (!eUp) {
        const ligne = {
          type: "devis", devis_id: d.id, client_id: d.client_id ?? null, numero: d.numero ?? null, nom_fichier: nom, chemin,
          taille_octets: octets.length, empreinte_sha256: await empreinte(octets), cree_par: moi.userId ?? null, updated_at: new Date().toISOString(),
        };
        const { data: existant } = await sb.from("documents").select("id").eq("type", "devis").eq("devis_id", d.id).maybeSingle();
        if (existant) await sb.from("documents").update(ligne).eq("id", existant.id);
        else await sb.from("documents").insert(ligne);
      }
      // Stockage indisponible : le PDF est tout de même renvoyé (rien n'est perdu, il se régénère).
      return reponsePdf(octets, nom, eUp ? "apercu" : "mis-a-jour");
    }

    // 4) Facture brouillon : simple aperçu.
    return reponsePdf(octets, nom, "apercu");
  } catch (e) {
    return erreur(e);
  }
});
