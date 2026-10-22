// =====================================================================
//  DHB — Edge Function : relances automatiques par email.
//   - Devis « envoyé » depuis plus de 7 jours, non signé → relance.
//   - Facture « envoyée » dont l'échéance est dépassée → rappel.
//  Anti-spam : au plus une relance tous les 7 jours (derniere_relance_le).
//
//  Sécurité : utilisateur connecté OU planification (x-cron-secret).
//  Secrets : RESEND_API_KEY, NOTIFY_FROM, CRON_SECRET (pour la planification).
//  Déploiement : supabase functions deploy send-reminders --no-verify-jwt
// =====================================================================
import {
  adminClient, cors, erreur, esc, json, marque, requireCronOrUser,
} from "../_shared/securite.ts";
import { envoyerEtJournaliser } from "../_shared/email.ts";

const DELAI_DEVIS = 7; // jours après envoi

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const sb = adminClient();
    const appelant = await requireCronOrUser(req, sb);
    const par = appelant.type === "utilisateur" ? appelant : null;
    const emailActif = !!Deno.env.get("RESEND_API_KEY");

    const now = new Date();
    const ymd = now.toISOString().slice(0, 10);
    const ilYa = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();
    const semaine = ilYa(7).slice(0, 10);

    const { data: ent } = await sb.from("entreprise").select("raison_sociale").eq("id", 1).maybeSingle();

    let relancesDevis = 0;
    let relancesFactures = 0;

    const { data: devis } = await sb
      .from("devis")
      .select("id, numero, entity, client_id, client_nom, client_email, created_at, envoye_at, derniere_relance_le")
      .eq("statut", "envoye")
      .is("signed_at", null);
    for (const d of devis ?? []) {
      const envoi = d.envoye_at ?? d.created_at;
      if (!d.client_email || envoi > ilYa(DELAI_DEVIS)) continue;
      if (d.derniere_relance_le && String(d.derniere_relance_le) > semaine) continue;
      if (!emailActif) continue;
      const societe = ent?.raison_sociale || marque(d.entity);
      const r = await envoyerEtJournaliser(sb, {
        a: d.client_email, sujet: `Votre devis ${d.numero} — ${societe}`, origine: "relance_devis", par,
        liens: { devis_id: d.id, client_id: d.client_id ?? null },
        html: `
        <p>Bonjour ${esc(d.client_nom)},</p>
        <p>Nous revenons vers vous au sujet du devis <b>${esc(d.numero)}</b> que nous vous avons transmis.</p>
        <p>Nous restons disponibles pour toute question ou ajustement.</p>
        <p>Cordialement,<br>${esc(societe)}</p>`,
      });
      if (!r.ok) continue;
      await sb.from("devis").update({ derniere_relance_le: ymd }).eq("id", d.id);
      relancesDevis++;
    }

    const { data: factures } = await sb
      .from("factures_vue")
      .select("id, numero, entity, client_id, client_nom, client_email, derniere_relance_le, reste_a_payer")
      .eq("en_retard", true);
    for (const f of factures ?? []) {
      if (!f.client_email) continue;
      if (f.derniere_relance_le && String(f.derniere_relance_le) > semaine) continue;
      if (!emailActif) continue;
      const societe = ent?.raison_sociale || marque(f.entity);
      const r = await envoyerEtJournaliser(sb, {
        a: f.client_email, sujet: `Rappel — facture ${f.numero} — ${societe}`, origine: "relance_facture", par,
        liens: { facture_id: f.id, client_id: f.client_id ?? null },
        html: `
        <p>Bonjour ${esc(f.client_nom)},</p>
        <p>Sauf erreur de notre part, la facture <b>${esc(f.numero)}</b> reste en attente de règlement.</p>
        <p>Si le paiement a déjà été effectué, merci de ne pas tenir compte de ce message.</p>
        <p>Cordialement,<br>${esc(societe)}</p>`,
      });
      if (!r.ok) continue;
      await sb.from("factures").update({ derniere_relance_le: ymd }).eq("id", f.id);
      relancesFactures++;
    }

    return json({ ok: true, relancesDevis, relancesFactures, email_actif: emailActif });
  } catch (e) {
    return erreur(e);
  }
});
