// =====================================================================
//  DHB — Edge Function : email écrit depuis une fiche du back-office
//  (client, demande, devis, facture, ticket).
//
//  Sécurité : membre de l'équipe connecté. Le destinataire n'est JAMAIS
//  choisi par l'appelant : c'est l'email enregistré sur la fiche (impossible
//  de s'en servir pour écrire à n'importe qui). Texte échappé avant envoi.
//  Les {{variables}} sont remplies avec les données de la fiche ; une
//  variable inconnue ou vide bloque l'envoi (422 variables_manquantes).
//
//  Appel (POST, jeton utilisateur) :
//    { "cible": { "type": "facture", "id": "<uuid>" }, "sujet": "…", "corps": "…",
//      "modele": "rappel_facture", "joindre_pdf": true, "apercu": false }
//  « apercu » : renvoie { destinataire, sujet, html } sans rien envoyer.
//  Déploiement : supabase functions deploy email-send --no-verify-jwt
// =====================================================================
import { adminClient, cors, erreur, HttpError, json, requireUser } from "../_shared/securite.ts";
import { envoyerEtJournaliser } from "../_shared/email.ts";
import { contexte, remplir, texteEnHtml, TYPES_CIBLE, type TypeCible } from "../_shared/modeles.ts";
import { obtenirPdf } from "../_shared/documents.ts";
import { adressesSupport } from "../_shared/tickets.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (req.method !== "POST") throw new HttpError(405, "methode_non_autorisee");
    const sb = adminClient();
    const moi = await requireUser(req, sb);
    const b = await req.json().catch(() => ({})) as {
      cible?: { type?: string; id?: string }; sujet?: string; corps?: string; modele?: string; joindre_pdf?: boolean; apercu?: boolean;
    };
    const type = b.cible?.type as TypeCible;
    const id = String(b.cible?.id ?? "");
    if (!TYPES_CIBLE.includes(type) || !UUID.test(id)) throw new HttpError(400, "parametres_invalides");
    const sujetBrut = String(b.sujet ?? "").trim();
    const corpsBrut = String(b.corps ?? "").trim();
    if (!sujetBrut || !corpsBrut) throw new HttpError(400, "sujet_ou_message_vide");
    if (sujetBrut.length > 200 || corpsBrut.length > 10000) throw new HttpError(400, "message_trop_long");
    const modele = b.modele && /^[a-z0-9_]{2,40}$/.test(b.modele) ? b.modele : null;

    const ctx = await contexte(sb, type, id);
    if (!ctx) throw new HttpError(404, "fiche_introuvable");
    if (!ctx.destinataire) throw new HttpError(422, "email_client_manquant");

    const s = remplir(sujetBrut, ctx.vars);
    const c = remplir(corpsBrut, ctx.vars);
    const manquantes = [...new Set([...s.manquantes, ...c.manquantes])];
    if (manquantes.length) return json({ error: "variables_manquantes", variables: manquantes }, 422);
    let sujet = s.texte.replace(/[\r\n]+/g, " ").slice(0, 200);
    // Ticket : référence [DHB #n] dans l'objet (la réponse du client revient dans le même fil)
    // et « répondre à » l'adresse de support du site.
    let repondreA: string | null = null;
    if (type === "ticket") {
      if (!/\[DHB #\d+\]/.test(sujet)) sujet = `[DHB #${ctx.fiche.numero}] ${sujet}`.slice(0, 200);
      repondreA = (await adressesSupport(sb))[ctx.entity ?? "infogerance"] ?? null;
    }
    const html = texteEnHtml(c.texte);

    const joindre = !!b.joindre_pdf;
    if (joindre && !["devis", "facture"].includes(type)) throw new HttpError(400, "piece_jointe_impossible");
    if (joindre && type === "facture" && ctx.fiche.status === "brouillon") throw new HttpError(409, "facture_brouillon");

    if (b.apercu) {
      return json({ destinataire: ctx.destinataire, sujet, html, redirection: Deno.env.get("EMAIL_REDIRECTION") || null });
    }

    const pdf = joindre ? await obtenirPdf(sb, type as "devis" | "facture", id, moi.userId ?? null) : null;
    const r = await envoyerEtJournaliser(sb, {
      a: ctx.destinataire, sujet, html, origine: "manuel", modele, liens: ctx.liens, par: moi,
      piece: pdf ? { nom: pdf.nom, octets: pdf.octets } : null, repondreA,
    });
    if (r.ok && type === "ticket") {
      await sb.from("ticket_messages").insert({
        ticket_id: id, sens: "sortant", de_email: repondreA, a_email: ctx.destinataire, sujet, texte: c.texte.slice(0, 50000),
        email_id: r.id ?? null, auteur_id: moi.userId ?? null,
      });
      if (ctx.fiche.status === "ouvert") await sb.from("tickets").update({ status: "en_cours" }).eq("id", id);
    }
    if (!r.ok) return json({ error: r.code, email_id: r.id }, r.code === "resend_not_configured" ? 503 : 502);
    return json({ ok: true, email_id: r.id, destinataire: ctx.destinataire });
  } catch (e) {
    return erreur(e);
  }
});
