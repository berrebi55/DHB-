// =====================================================================
//  DHB — envoi d'email UNIQUE pour toutes les fonctions serveur.
//
//  - envoi via Resend (RESEND_API_KEY, expéditeur NOTIFY_FROM) ;
//  - chaque envoi (réussi ou non) est inscrit dans public.emails ;
//  - EMAIL_REDIRECTION (facultatif) : tant que le domaine n'est pas vérifié
//    chez Resend, tous les emails partent vers CETTE adresse (la vôtre), avec
//    « [TEST → destinataire prévu] » dans le sujet. L'historique garde les deux.
// =====================================================================
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import type { Appelant } from "./securite.ts";

export type Origine = "manuel" | "devis" | "facture" | "relance_devis" | "relance_facture" | "alerte_demande" | "automatisation";
export interface PieceJointe { nom: string; octets: Uint8Array }
export interface Liens { client_id?: string | null; lead_id?: string | null; devis_id?: string | null; facture_id?: string | null; ticket_id?: string | null }
export interface Envoi {
  a: string;
  sujet: string;
  html: string;
  origine: Origine;
  modele?: string | null;
  liens?: Liens;
  par?: Appelant | null;
  piece?: PieceJointe | null;
}
export interface ResultatEnvoi { ok: boolean; code?: string; id?: string }

function base64(octets: Uint8Array): string {
  let s = "";
  for (let i = 0; i < octets.length; i += 0x8000) s += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Envoie un email et l'inscrit dans l'historique. Ne lève jamais d'exception. */
export async function envoyerEtJournaliser(sb: SupabaseClient, e: Envoi): Promise<ResultatEnvoi> {
  const redirection = (Deno.env.get("EMAIL_REDIRECTION") ?? "").trim();
  const destinataireReel = redirection || e.a;
  const sujet = redirection ? `[TEST → ${e.a}] ${e.sujet}` : e.sujet;
  const cle = Deno.env.get("RESEND_API_KEY");
  let code: string | null = null;
  let fournisseurId: string | null = null;

  if (!cle) {
    code = "resend_not_configured";
  } else {
    try {
      const base = (Deno.env.get("RESEND_API_URL") ?? "https://api.resend.com").replace(/\/$/, "");
      const r = await fetch(`${base}/emails`, {
        method: "POST",
        headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: Deno.env.get("NOTIFY_FROM") ?? "onboarding@resend.dev",
          to: [destinataireReel],
          subject: sujet,
          html: e.html,
          ...(e.piece ? { attachments: [{ filename: e.piece.nom, content: base64(e.piece.octets) }] } : {}),
        }),
      });
      const d = await r.json().catch(() => ({})) as { id?: string; message?: string };
      if (r.ok) fournisseurId = d.id ?? null;
      else code = String(d.message ?? "resend_error").slice(0, 300);
    } catch {
      code = "resend_injoignable";
    }
  }

  // Historique (une base pas encore mise à jour n'empêche pas l'envoi).
  const { data } = await sb.from("emails").insert({
    origine: e.origine,
    modele_cle: e.modele ?? null,
    destinataire: e.a,
    destinataire_reel: redirection || null,
    sujet: e.sujet,
    corps_html: e.html,
    piece_jointe: e.piece?.nom ?? null,
    statut: code ? "echec" : "envoye",
    erreur: code,
    fournisseur_id: fournisseurId,
    envoye_par: e.par?.userId ?? null,
    envoye_par_email: e.par?.email ?? null,
    client_id: e.liens?.client_id ?? null,
    lead_id: e.liens?.lead_id ?? null,
    devis_id: e.liens?.devis_id ?? null,
    facture_id: e.liens?.facture_id ?? null,
    ticket_id: e.liens?.ticket_id ?? null,
  }).select("id").maybeSingle();

  return { ok: !code, code: code ?? undefined, id: (data as { id?: string } | null)?.id };
}
