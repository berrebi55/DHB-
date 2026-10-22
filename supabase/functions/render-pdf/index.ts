// =====================================================================
//  DHB — Edge Function : PDF d'un devis ou d'une facture.
//
//  Sécurité : membre de l'équipe connecté obligatoire (requireUser). Les
//  fichiers sont rangés dans l'espace de stockage PRIVÉ « documents », lu et
//  écrit uniquement par le serveur avec la clé serveur.
//
//  Règles (détail dans _shared/documents.ts) :
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
import { obtenirPdf, pdfArchive, type Pdf } from "../_shared/documents.ts";
import type { TypeDocument } from "../_shared/pdf.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function reponsePdf(p: Pdf) {
  return new Response(p.octets, {
    headers: {
      ...cors,
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${p.nom}"`,
      "Access-Control-Expose-Headers": "Content-Disposition, X-Document-Archive",
      "X-Document-Archive": p.etat,   // « archive » | « mis-a-jour » | « apercu »
      "Cache-Control": "no-store",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (req.method !== "POST") throw new HttpError(405, "methode_non_autorisee");
    const sb = adminClient();
    const moi = await requireUser(req, sb);
    const corps = await req.json().catch(() => ({})) as { type?: string; id?: string; document_id?: string };

    // Document archivé demandé directement (liste « Documents » d'une fiche).
    if (corps.document_id !== undefined) {
      if (!UUID.test(String(corps.document_id))) throw new HttpError(400, "parametres_invalides");
      return reponsePdf(await pdfArchive(sb, String(corps.document_id)));
    }
    const type = corps.type as TypeDocument;
    if (!["devis", "facture"].includes(type) || !UUID.test(String(corps.id))) throw new HttpError(400, "parametres_invalides");
    return reponsePdf(await obtenirPdf(sb, type, String(corps.id), moi.userId ?? null));
  } catch (e) {
    return erreur(e);
  }
});
