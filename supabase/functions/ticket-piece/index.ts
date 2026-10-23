// =====================================================================
//  DHB — Edge Function : télécharger une pièce jointe de ticket (lot 18).
//
//  Les fichiers reçus par email sont dans l'espace privé « documents »
//  (dossier tickets/). Cette fonction les remet à un membre de l'équipe
//  connecté, toujours en téléchargement (jamais affichés dans le navigateur :
//  un fichier piégé ne peut pas s'exécuter dans le back-office).
//
//  Appel (POST, jeton utilisateur) : { "piece_id": "<uuid>" }
//  Déploiement : supabase functions deploy ticket-piece --no-verify-jwt
// =====================================================================
import { adminClient, cors, erreur, HttpError, requireUser } from "../_shared/securite.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (req.method !== "POST") throw new HttpError(405, "methode_non_autorisee");
    const sb = adminClient();
    await requireUser(req, sb);
    const { piece_id } = await req.json().catch(() => ({})) as { piece_id?: string };
    if (!UUID.test(String(piece_id ?? ""))) throw new HttpError(400, "parametres_invalides");
    const { data: p } = await sb.from("ticket_pieces").select("nom, chemin").eq("id", piece_id).maybeSingle();
    if (!p) throw new HttpError(404, "piece_introuvable");
    const { data: f, error } = await sb.storage.from("documents").download(p.chemin);
    if (error || !f) throw new HttpError(502, "stockage_indisponible");
    const nomAscii = p.nom.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
    return new Response(await f.arrayBuffer(), {
      headers: {
        ...cors,
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${nomAscii}"; filename*=UTF-8''${encodeURIComponent(p.nom)}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return erreur(e);
  }
});
