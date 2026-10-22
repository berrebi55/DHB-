import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabaseClient } from "../supabaseClient";

// Messages compréhensibles pour chaque code d'erreur renvoyé par les fonctions serveur.
const MESSAGES: Record<string, string> = {
  resend_not_configured:
    "L'envoi d'emails n'est pas encore activé : ajoutez la clé Resend dans Supabase (voir README).",
  sign_base_not_configured:
    "L'adresse de la page de signature n'est pas configurée (variable SIGN_BASE dans Supabase).",
  email_client_manquant: "Ce document n'a pas d'adresse email client. Ajoutez-la puis réessayez.",
  non_authentifie: "Votre session a expiré. Reconnectez-vous puis réessayez.",
  reserve_admin: "Cette action est réservée aux administrateurs.",
  acces_en_attente: "Votre compte n'est pas encore validé par un administrateur.",
  devis_clos: "Ce devis est refusé ou expiré : il ne peut plus être envoyé.",
  facture_annulee: "Cette facture est annulée : elle ne peut pas être envoyée.",
  email_invalide: "L'adresse email saisie n'est pas valide.",
  stockage_indisponible: "Le stockage des documents ne répond pas. Réessayez dans un instant.",
  document_introuvable: "Ce document est introuvable (il a peut-être été supprimé).",
  parametres_invalides: "Demande invalide.",
  archivage_impossible: "Le PDF n'a pas pu être archivé. Réessayez dans un instant.",
};

const RESEAU = "La fonction serveur ne répond pas. Vérifiez qu'elle est déployée dans Supabase (voir README).";

export interface ResultatFonction<T> {
  ok: boolean;
  data?: T;
  message?: string;
}

/**
 * Télécharge le PDF d'un devis ou d'une facture (ou d'un document archivé),
 * produit côté serveur par la fonction render-pdf.
 */
export async function telechargerPdf(
  corps: { type: "devis" | "facture"; id: string } | { document_id: string },
): Promise<ResultatFonction<{ archive: string | null }>> {
  try {
    const { data } = await supabaseClient.auth.getSession();
    const jeton = data.session?.access_token;
    if (!jeton) return { ok: false, message: MESSAGES.non_authentifie };
    const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/render-pdf`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jeton}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    });
    if (!r.ok) {
      const code = String(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "");
      return { ok: false, message: MESSAGES[code] ?? (code ? `Erreur : ${code}` : RESEAU) };
    }
    const nom = /filename="([^"]+)"/.exec(r.headers.get("Content-Disposition") ?? "")?.[1] ?? "document.pdf";
    const url = URL.createObjectURL(await r.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = nom;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return { ok: true, data: { archive: r.headers.get("X-Document-Archive") } };
  } catch {
    return { ok: false, message: RESEAU };
  }
}

/** Appelle une Edge Function avec la session de l'utilisateur connecté. */
export async function appelerFonction<T = Record<string, unknown>>(
  name: string,
  body: Record<string, unknown> = {},
): Promise<ResultatFonction<T>> {
  try {
    const { data, error } = await supabaseClient.functions.invoke(name, { body });
    if (error) {
      let payload: Record<string, unknown> | undefined;
      if (error instanceof FunctionsHttpError) {
        payload = await error.context.json().catch(() => undefined);
      }
      const code = (payload?.error as string) ?? "";
      return { ok: false, data: payload as T, message: MESSAGES[code] ?? (code ? `Erreur : ${code}` : RESEAU) };
    }
    if (data && typeof data === "object" && "error" in data && data.error) {
      const code = String((data as { error: string }).error);
      return { ok: false, data: data as T, message: MESSAGES[code] ?? `Erreur : ${code}` };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, message: RESEAU };
  }
}

/** Traduit les erreurs PostgREST / Supabase les plus courantes. */
export function messageErreurBase(err: unknown): string {
  const m = String((err as { message?: string })?.message ?? err ?? "");
  if (/row-level security|permission denied/i.test(m))
    return "Action non autorisée pour votre rôle. Contactez un administrateur.";
  if (/does not exist|relation .* does not exist|schema cache/i.test(m))
    return "La base n'est pas à jour : exécutez supabase/full-setup.sql dans Supabase.";
  if (/archivez-le|ne peut pas être supprimée|ne peut plus être modifiée|ne peut pas repasser|ne peut pas être réactivée/i.test(m)) return m;
  if (/violates check constraint/i.test(m)) return "Une valeur saisie n'est pas acceptée. Vérifiez le formulaire.";
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return "Connexion impossible. Vérifiez votre accès Internet.";
  if (/Délai dépassé|TimeoutError|aborted|timeout/i.test(m)) return "Le serveur met trop de temps à répondre. Réessayez dans un instant.";
  if (/JWT expired|invalid JWT|not authenticated/i.test(m)) return "Votre session a expiré. Reconnectez-vous.";
  return m ? `Erreur : ${m}` : "Une erreur inattendue est survenue.";
}

/** Vrai si l'erreur signifie « cet enregistrement n'existe pas » (et non une panne). */
export function estIntrouvable(err: unknown): boolean {
  const e = err as { code?: string; message?: string; statusCode?: number } | null;
  return !!e && (e.code === "PGRST116" || e.statusCode === 406 || /0 rows|JSON object requested|no rows/i.test(String(e.message ?? "")));
}
