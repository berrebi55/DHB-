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
  devis_clos: "Ce devis est refusé ou expiré : il ne peut plus être envoyé.",
  facture_annulee: "Cette facture est annulée : elle ne peut pas être envoyée.",
  email_invalide: "L'adresse email saisie n'est pas valide.",
};

const RESEAU = "La fonction serveur ne répond pas. Vérifiez qu'elle est déployée dans Supabase (voir README).";

export interface ResultatFonction<T> {
  ok: boolean;
  data?: T;
  message?: string;
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
  if (/violates check constraint/i.test(m)) return "Une valeur saisie n'est pas acceptée. Vérifiez le formulaire.";
  if (/Failed to fetch|NetworkError/i.test(m)) return "Connexion impossible. Vérifiez votre accès Internet.";
  return m ? `Erreur : ${m}` : "Une erreur inattendue est survenue.";
}
