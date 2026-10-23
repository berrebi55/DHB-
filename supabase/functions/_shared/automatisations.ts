// =====================================================================
//  DHB — moteur des automatisations (règles « SI … ALORS email … »).
//
//  - File d'événements (public.evenements, émis par la base) : chaque
//    événement est « réservé » avant traitement (jamais traité deux fois en
//    parallèle) ; en cas d'échec d'envoi : nouvelle tentative plus tard
//    (5 min, 30 min, 2 h, 12 h), puis « erreur » lisible après 5 essais.
//  - Règles quotidiennes : relance des devis sans réponse, rappel des
//    factures en retard (au plus une fois tous les 7 jours par document).
//  Les emails utilisent les modèles (public.email_modeles) et le module
//  d'envoi unique (historique, redirection de test).
// =====================================================================
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { HttpError, type Appelant } from "./securite.ts";
import { envoyerEtJournaliser } from "./email.ts";
import { contexte, remplir, texteEnHtml, type TypeCible } from "./modeles.ts";
import { envoyerConversion, jetonAcces, journal as journalIntegration } from "./google.ts";
import { assurerDossierClient, copierDocument, ErreurDrive, reglagesDrive, type ReglagesDrive } from "./drive.ts";
import { traiterEmailRecu } from "./tickets.ts";

export interface Regle { cle: string; nom: string; declencheur: string; actif: boolean; delai_jours: number; modele_cle: string | null }
type Issue = { statut: "envoye" | "echec" | "ignore"; detail: string; email_id?: string; temporaire?: boolean };

const ATTENTES_MIN = [5, 30, 120, 720];      // délais entre deux tentatives (minutes)
const MAX_TENTATIVES = 5;
const UNE_FOIS = ["bienvenue", "ticket_resolu"];
const jour = (decalageJours = 0) => new Date(Date.now() + decalageJours * 86400000).toISOString().slice(0, 10);

export async function regles(sb: SupabaseClient): Promise<Regle[]> {
  const { data } = await sb.from("automatisations").select("cle, nom, declencheur, actif, delai_jours, modele_cle");
  return (data ?? []) as Regle[];
}

/** Envoie l'email d'une règle pour une fiche ; « temporaire » = à réessayer plus tard. */
export async function appliquerRegle(sb: SupabaseClient, r: Regle, type: TypeCible, id: string, par: Appelant | null = null): Promise<Issue> {
  if (!r.modele_cle) return { statut: "ignore", detail: "Aucun modèle d'email choisi pour cette règle" };
  const { data: m } = await sb.from("email_modeles").select("sujet, corps, actif").eq("cle", r.modele_cle).maybeSingle();
  if (!m || !m.actif) return { statut: "ignore", detail: `Modèle « ${r.modele_cle} » absent ou désactivé` };
  const ctx = await contexte(sb, type, id);
  if (!ctx) return { statut: "ignore", detail: "Fiche introuvable (supprimée ?)" };
  if (!ctx.destinataire) return { statut: "ignore", detail: "Pas d'email sur la fiche" };
  const s = remplir(m.sujet || r.nom, ctx.vars);
  const c = remplir(m.corps, ctx.vars);
  const manquantes = [...new Set([...s.manquantes, ...c.manquantes])];
  if (manquantes.length) return { statut: "echec", detail: `Informations manquantes sur la fiche : ${manquantes.map((v) => `{{${v}}}`).join(", ")}` };
  const e = await envoyerEtJournaliser(sb, {
    a: ctx.destinataire, sujet: s.texte.replace(/[\r\n]+/g, " ").slice(0, 200), html: texteEnHtml(c.texte),
    origine: "automatisation", modele: r.modele_cle, liens: ctx.liens, par,
  });
  if (!e.ok) return { statut: "echec", detail: `Envoi impossible : ${e.code}`, email_id: e.id, temporaire: true };
  return { statut: "envoye", detail: `Email envoyé à ${ctx.destinataire}`, email_id: e.id };
}

/**
 * Demande gagnée → conversion « close_convert_lead » envoyée à GA4 (Measurement
 * Protocol), seulement si le visiteur avait accepté la mesure d'audience (identifiant
 * GA4 enregistré avec sa demande) et si GA4 est configuré. « temporaire » = à réessayer.
 */
export async function conversionGa4(sb: SupabaseClient, leadId: string): Promise<{ statut: "ok" | "ignore" | "temporaire"; message: string }> {
  const secret = Deno.env.get("GA_API_SECRET");
  const { data: ga4 } = await sb.from("integrations").select("details").eq("cle", "ga4").maybeSingle();
  const mesure = (ga4?.details as Record<string, string> | null)?.ga4_measurement_id;
  if (!secret || !mesure) return { statut: "ignore", message: "GA4 non configuré pour les conversions" };
  const { data: lead } = await sb.from("leads").select("ga_client_id, source").eq("id", leadId).maybeSingle();
  if (!lead?.ga_client_id) return { statut: "ignore", message: "Pas d'identifiant GA4 (mesure d'audience refusée ou demande saisie à la main)" };
  try {
    const ok = await envoyerConversion(mesure, secret, lead.ga_client_id, "close_convert_lead", lead.source ? { lead_source: lead.source } : {});
    if (!ok) return { statut: "temporaire", message: "GA4 a refusé la conversion" };
    await journalIntegration(sb, "ga4", "conversion", "ok", "Conversion « demande gagnée » envoyée à Google Analytics.");
    return { statut: "ok", message: "Conversion envoyée" };
  } catch {
    return { statut: "temporaire", message: "Google Analytics injoignable" };
  }
}

async function journaliser(sb: SupabaseClient, r: Regle, type: string, id: string, i: Issue) {
  await sb.from("automatisation_runs").insert({ automatisation_cle: r.cle, objet_type: type, objet_id: id, statut: i.statut, detail: i.detail, email_id: i.email_id ?? null });
}

/** Traite les événements en attente (au plus `maxi`). */
type Evenement = { id: string; type: string; objet_id: string; tentatives: number | null };

/**
 * Email reçu (lot 18) : ticket + conversation. Échec temporaire (Resend, stockage)
 * → nouvel essai plus tard ; email introuvable chez Resend → erreur définitive.
 */
export async function traiterEvenementEmail(sb: SupabaseClient, ev: Evenement) {
  try {
    const issue = await traiterEmailRecu(sb, ev.objet_id);
    await sb.from("evenements").update({ statut: issue.statut, traite_le: new Date().toISOString(), erreur: issue.statut === "ignore" ? issue.detail : null }).eq("id", ev.id);
    return issue;
  } catch (e) {
    const code = e instanceof HttpError ? e.code : "erreur_inconnue";
    const tentatives = (ev.tentatives ?? 0) + 1;
    const fin = tentatives >= MAX_TENTATIVES || code === "email_introuvable_chez_resend";
    await sb.from("evenements").update({
      tentatives, erreur: code, statut: fin ? "erreur" : "en_attente",
      prochaine_tentative: new Date(Date.now() + ATTENTES_MIN[Math.min(tentatives - 1, ATTENTES_MIN.length - 1)] * 60000).toISOString(),
    }).eq("id", ev.id);
    return { statut: fin ? "erreur" : "reessai", detail: code };
  }
}

export async function traiterFile(sb: SupabaseClient, maxi = 50) {
  const bilan = { traites: 0, ignores: 0, reportes: 0, erreurs: 0 };
  const toutes = await regles(sb);

  // Google Drive (lot 11) : dossier client et copie des PDF, si activé et Google connecté.
  let drive: ReglagesDrive | null | undefined;
  let jeton: string | undefined;
  const driveActif = async () => {
    if (drive !== undefined) return drive;
    const r = await reglagesDrive(sb);
    const { data: cred } = await sb.from("integration_credentials").select("cle").eq("cle", "google").maybeSingle();
    drive = r.actif && cred ? r : null;
    return drive;
  };
  const effetDrive = async (ev: { type: string; objet_id: string }): Promise<string | null> => {
    const r = await driveActif();
    if (!r) return null;
    try { jeton ??= await jetonAcces(sb); } catch { return "Google non joignable ou accès expiré"; }
    try {
      if (ev.type === "client_cree") await assurerDossierClient(sb, jeton, ev.objet_id, r);
      else await copierDocument(sb, jeton, ev.objet_id, r);
      return null;
    } catch (e) {
      if (e instanceof ErreurDrive && e.temporaire) return e.message;
      await journalIntegration(sb, "drive", "copie", "erreur", (e as Error).message);
      return null;   // erreur définitive : visible sur la fiche, pas de nouvel essai automatique
    }
  };
  const maintenant = new Date().toISOString();
  // Les emails reçus passent en premier : un client ne doit pas attendre derrière un arriéré.
  const { data: emails } = await sb.from("evenements").select("*").eq("statut", "en_attente").eq("type", "email_recu")
    .lte("prochaine_tentative", maintenant).order("created_at", { ascending: true }).limit(maxi);
  const { data: autres } = await sb.from("evenements").select("*").eq("statut", "en_attente").neq("type", "email_recu")
    .lte("prochaine_tentative", maintenant).order("created_at", { ascending: true }).limit(Math.max(maxi - (emails?.length ?? 0), 0));
  const evs = [...(emails ?? []), ...(autres ?? [])];
  for (const ev of evs) {
    // Réservation : si un autre traitement l'a pris entre-temps, on passe.
    const { data: pris } = await sb.from("evenements").update({ prochaine_tentative: new Date(Date.now() + 10 * 60000).toISOString() })
      .eq("id", ev.id).eq("statut", "en_attente").lte("prochaine_tentative", maintenant).select("id");
    if (!pris?.length) continue;

    if (ev.type === "email_recu") {
      const i = await traiterEvenementEmail(sb, ev);
      if (i.statut === "traite") bilan.traites++; else if (i.statut === "ignore") bilan.ignores++; else bilan.erreurs++;
      continue;
    }
    const actives = toutes.filter((r) => r.actif && r.declencheur === ev.type);
    const conversion = ev.type === "lead_gagne";
    const versDrive = ["client_cree", "document_cree", "document_maj"].includes(ev.type) && !!(await driveActif());
    if (!actives.length && !conversion && !versDrive) {
      await sb.from("evenements").update({ statut: "ignore", traite_le: new Date().toISOString(), erreur: null }).eq("id", ev.id);
      bilan.ignores++; continue;
    }
    // Délai : on attend la date prévue (l'événement reste en attente jusque-là).
    const echeance = Math.max(0, ...actives.map((r) => new Date(ev.created_at).getTime() + r.delai_jours * 86400000));
    if (echeance > Date.now()) {
      // Le dossier Drive n'attend pas le délai d'un email (il sera vérifié de nouveau à l'échéance).
      if (versDrive) await effetDrive(ev);
      await sb.from("evenements").update({ prochaine_tentative: new Date(echeance).toISOString() }).eq("id", ev.id);
      bilan.reportes++; continue;
    }
    let temporaire: string | null = null;
    if (versDrive) temporaire = await effetDrive(ev);
    if (conversion) {
      const c = await conversionGa4(sb, ev.objet_id);
      if (c.statut === "temporaire") temporaire = c.message;
    }
    for (const r of actives) {
      if (UNE_FOIS.includes(r.cle)) {
        const { data: deja } = await sb.from("automatisation_runs").select("id").eq("automatisation_cle", r.cle).eq("objet_id", ev.objet_id).eq("statut", "envoye").limit(1);
        if (deja?.length) continue;
      }
      const issue = await appliquerRegle(sb, r, ev.objet_type as TypeCible, ev.objet_id);
      await journaliser(sb, r, ev.objet_type, ev.objet_id, issue);
      if (issue.temporaire) temporaire = issue.detail;
    }
    if (temporaire) {
      const tentatives = (ev.tentatives ?? 0) + 1;
      const fin = tentatives >= MAX_TENTATIVES;
      await sb.from("evenements").update({
        tentatives, erreur: temporaire, statut: fin ? "erreur" : "en_attente",
        prochaine_tentative: new Date(Date.now() + ATTENTES_MIN[Math.min(tentatives - 1, ATTENTES_MIN.length - 1)] * 60000).toISOString(),
      }).eq("id", ev.id);
      bilan.erreurs++;
    } else {
      await sb.from("evenements").update({ statut: "traite", traite_le: new Date().toISOString(), erreur: null }).eq("id", ev.id);
      bilan.traites++;
    }
  }
  // Ménage : événements terminés depuis plus de 90 jours.
  await sb.from("evenements").delete().in("statut", ["traite", "ignore"]).lt("created_at", new Date(Date.now() - 90 * 86400000).toISOString());
  return bilan;
}

/** Règles quotidiennes : relances de devis et rappels de factures. */
export async function executerQuotidiennes(sb: SupabaseClient, par: Appelant | null = null) {
  const toutes = await regles(sb);
  const bilan = { relancesDevis: 0, relancesFactures: 0, echecs: 0 };
  const aujourdhui = jour();
  const ilYa7 = jour(-7);

  const devis = toutes.find((r) => r.cle === "relance_devis" && r.actif);
  if (devis) {
    const limite = new Date(Date.now() - devis.delai_jours * 86400000).toISOString();
    const { data } = await sb.from("devis").select("id, envoye_at, created_at, derniere_relance_le").eq("statut", "envoye").is("signed_at", null);
    for (const d of data ?? []) {
      if ((d.envoye_at ?? d.created_at) > limite) continue;
      if (d.derniere_relance_le && String(d.derniere_relance_le) > ilYa7) continue;
      const issue = await appliquerRegle(sb, devis, "devis", d.id, par);
      await journaliser(sb, devis, "devis", d.id, issue);
      if (issue.statut === "envoye") {
        await sb.from("devis").update({ derniere_relance_le: aujourdhui }).eq("id", d.id);
        bilan.relancesDevis++;
      } else if (issue.statut === "echec") bilan.echecs++;
    }
  }

  const factures = toutes.find((r) => r.cle === "rappel_facture" && r.actif);
  if (factures) {
    const limite = jour(-factures.delai_jours);
    const { data } = await sb.from("factures_vue").select("id, echeance_effective, derniere_relance_le").eq("en_retard", true);
    for (const f of data ?? []) {
      if (String(f.echeance_effective) > limite) continue;
      if (f.derniere_relance_le && String(f.derniere_relance_le) > ilYa7) continue;
      const issue = await appliquerRegle(sb, factures, "facture", f.id, par);
      await journaliser(sb, factures, "facture", f.id, issue);
      if (issue.statut === "envoye") {
        await sb.from("factures").update({ derniere_relance_le: aujourdhui }).eq("id", f.id);
        bilan.relancesFactures++;
      } else if (issue.statut === "echec") bilan.echecs++;
    }
  }
  return bilan;
}
