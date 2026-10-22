// =====================================================================
//  DHB — Edge Function : Google Drive à la demande.
//
//  POST { "client_id": "<uuid>" }  → crée (ou recrée) le dossier du client et
//                                     copie ses PDF manquants (bouton de la fiche)
//  POST { "tous": true }           → rattrapage : clients sans dossier et PDF non
//                                     copiés, par lots de 25 (administrateur)
//  Sécurité : membre de l'équipe connecté (rattrapage : administrateur ou
//  planification). Prérequis : Drive activé et compte Google connecté.
//  Déploiement : supabase functions deploy drive-sync --no-verify-jwt
// =====================================================================
import { adminClient, cors, erreur, HttpError, json, requireCronOrUser } from "../_shared/securite.ts";
import { jetonAcces, journal } from "../_shared/google.ts";
import { assurerDossierClient, copierDocument, ErreurDrive, reglagesDrive } from "../_shared/drive.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOT = 25;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const sb = adminClient();
    const appelant = await requireCronOrUser(req, sb);
    const corps = await req.json().catch(() => ({})) as { client_id?: string; tous?: boolean };
    const r = await reglagesDrive(sb);
    if (!r.actif) throw new HttpError(409, "drive_desactive");
    const jeton = await jetonAcces(sb);

    // ---- Un client ----
    if (corps.client_id !== undefined) {
      if (!UUID.test(String(corps.client_id))) throw new HttpError(400, "parametres_invalides");
      try {
        const dossier = await assurerDossierClient(sb, jeton, corps.client_id, r);
        const { data: docs } = await sb.from("documents").select("id, type, drive_file_id").eq("client_id", corps.client_id);
        let copies = 0;
        for (const d of docs ?? []) if (!d.drive_file_id || d.type === "devis") { if ((await copierDocument(sb, jeton, d.id, r)) !== "deja") copies++; }
        const { data: c } = await sb.from("clients").select("drive_folder_url").eq("id", corps.client_id).maybeSingle();
        return json({ ok: true, dossier: dossier.id, url: c?.drive_folder_url ?? null, copies });
      } catch (e) {
        if (e instanceof ErreurDrive) return json({ error: e.temporaire ? "drive_indisponible" : "drive_refuse", message: e.message }, e.temporaire ? 503 : 502);
        throw e;
      }
    }

    // ---- Rattrapage ----
    if (corps.tous) {
      if (appelant.type === "utilisateur" && appelant.role !== "admin") throw new HttpError(403, "reserve_admin");
      const bilan = { dossiers: 0, copies: 0, erreurs: 0, restants: 0 };
      const { data: clients, count } = await sb.from("clients").select("id", { count: "exact" }).is("archived_at", null).is("drive_folder_id", null).limit(LOT);
      for (const c of clients ?? []) {
        try { await assurerDossierClient(sb, jeton, c.id, r); bilan.dossiers++; } catch { bilan.erreurs++; }
      }
      const { data: docs, count: nbDocs } = await sb.from("documents").select("id", { count: "exact" }).is("drive_file_id", null).not("client_id", "is", null).limit(LOT);
      for (const d of docs ?? []) {
        try { if ((await copierDocument(sb, jeton, d.id, r)) === "copie") bilan.copies++; } catch { bilan.erreurs++; }
      }
      bilan.restants = Math.max(0, (count ?? 0) - (clients?.length ?? 0)) + Math.max(0, (nbDocs ?? 0) - (docs?.length ?? 0));
      await journal(sb, "drive", "rattrapage", bilan.erreurs ? "erreur" : "ok",
        `${bilan.dossiers} dossier(s) créé(s), ${bilan.copies} PDF copié(s), ${bilan.erreurs} erreur(s), ${bilan.restants} restant(s).`);
      return json({ ok: true, ...bilan });
    }
    throw new HttpError(400, "parametres_invalides");
  } catch (e) {
    return erreur(e);
  }
});
