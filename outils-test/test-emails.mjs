// Lot 8 : email-send + fonctions d'envoi existantes passées par le module unique.
import { spawn } from "node:child_process";
import { demarrer } from "./faux-serveur-supabase.mjs";

const RACINE = "C:/Users/CLAUDE/Documents/DHB-/supabase/functions/";
const { etat, fermer } = await demarrer(54321);
const T = etat.tables;
const CL = "cccccccc-0000-4000-8000-000000000001", LE = "dddddddd-0000-4000-8000-000000000001", DE = "eeeeeeee-0000-4000-8000-000000000001",
  FA = "ffffffff-0000-4000-8000-000000000001", FB = "ffffffff-0000-4000-8000-000000000002", TI = "abababab-0000-4000-8000-000000000001", CL2 = "cccccccc-0000-4000-8000-000000000002";
T.entreprise.push({ id: 1, raison_sociale: "DHB Test", telephone: "01 00 00 00 00", email: "contact@exemple.fr" });
T.clients.push({ id: CL, nom: "Claire Martin", entreprise: "Cabinet Martin", email: "claire@cabinet.fr", entity: "infogerance" },
  { id: CL2, nom: "Sans Email", entity: "infogerance" });
T.leads = [{ id: LE, nom: "Paul <script>", email: "paul@exemple.fr", entity: "particuliers" }];
const facture = { id: FA, numero: "2026-0042", status: "envoyee", client_id: CL, client_nom: "Cabinet Martin", client_email: "compta@cabinet.fr", date_facture: "2026-10-01", date_echeance: "2026-10-31", lignes: [{ libelle: "Maintenance", qte: 1, pu: 300 }], tva_taux: 0, total_ht: 300, total_ttc: 300, entity: "infogerance" };
T.factures.push(facture, { ...facture, id: FB, numero: "2026-0043", status: "brouillon", date_echeance: null });
T.factures_vue = [{ ...facture, reste_a_payer: 120, echeance_effective: "2026-10-10", en_retard: true, derniere_relance_le: null }, { ...facture, id: FB, numero: "2026-0043", status: "brouillon", reste_a_payer: 300, echeance_effective: "2026-10-01" }];
T.devis.push({ id: DE, numero: "DEV-2026-0007", statut: "brouillon", client_id: CL, client_nom: "Cabinet Martin", client_email: "claire@cabinet.fr", date_devis: "2026-10-20", validite_jours: 30, lignes: [{ libelle: "Audit", qte: 1, pu: 450 }], total_ht: 450, total_ttc: 450, public_token: "tok", created_at: "2026-10-01T00:00:00Z" },
  { id: "eeeeeeee-0000-4000-8000-000000000002", numero: "DEV-2026-0001", statut: "envoye", client_id: CL, client_nom: "Cabinet Martin", client_email: "claire@cabinet.fr", envoye_at: "2026-09-01T00:00:00Z", created_at: "2026-09-01T00:00:00Z", signed_at: null, derniere_relance_le: null, lignes: [], total_ttc: 100 });
T.tickets = [{ id: TI, sujet: "Imprimante hors ligne", client_id: CL, client_email: null }];
// Règles et modèles du lot 9 (send-reminders passe désormais par les règles).
T.automatisations = [{ cle: "relance_devis", nom: "Relance", declencheur: "quotidien", actif: true, delai_jours: 5, modele_cle: "relance_devis" },
  { cle: "rappel_facture", nom: "Rappel", declencheur: "quotidien", actif: true, delai_jours: 0, modele_cle: "rappel_facture" }];
T.email_modeles = [{ cle: "relance_devis", sujet: "Votre devis {{devis_numero}}", corps: "Bonjour {{contact_nom}}", actif: true },
  { cle: "rappel_facture", sujet: "Rappel — facture {{facture_numero}}", corps: "Reste {{facture_reste}}", actif: true }];

const ENV = { SUPABASE_URL: "http://127.0.0.1:54321", SUPABASE_SERVICE_ROLE_KEY: "x", RESEND_API_URL: "http://127.0.0.1:54321", RESEND_API_KEY: "re_test", NOTIFY_FROM: "dhb@exemple.fr", SIGN_BASE: "https://exemple.fr/devis.html", CRON_SECRET: "cron-test", WEBHOOK_SECRET: "wh-test", NOTIFY_TO: "alertes@exemple.fr" };
async function lancer(nom, port, env = {}) {
  const p = spawn("node_modules/deno/deno.exe", ["run", "--allow-net", "--allow-env", "--allow-read", "lancer-fonction.ts", RACINE + nom + "/index.ts"], { env: { ...process.env, ...ENV, ...env, PORT_TEST: String(port) } });
  let j = ""; p.stdout.on("data", (d) => (j += d)); p.stderr.on("data", (d) => (j += d));
  for (let i = 0; i < 120 && !/Listening/.test(j); i++) await new Promise((r) => setTimeout(r, 500));
  if (!/Listening/.test(j)) { console.log(j); process.exit(1); }
  return { arreter: () => p.kill(), appel: async (corps, entetes = { Authorization: "Bearer jeton-admin" }) => {
    const r = await fetch(`http://127.0.0.1:${port}/`, { method: "POST", headers: { "Content-Type": "application/json", ...entetes }, body: JSON.stringify(corps) });
    return { s: r.status, j: await r.json().catch(() => ({})) };
  } };
}
const res = []; const ok = (n, c, d) => res.push({ n, ok: !!c, d });
const dernier = () => etat.resend[etat.resend.length - 1];
const dernierLog = () => T.emails[T.emails.length - 1];
etat.resend = [];

// ================= email-send =================
let f = await lancer("email-send", 54390);
let r = await f.appel({ cible: { type: "client", id: CL }, sujet: "Bonjour", corps: "x" }, {}); ok("Sans jeton → 401", r.s === 401, r);
r = await f.appel({ cible: { type: "client", id: CL }, sujet: "Bonjour", corps: "x" }, { Authorization: "Bearer jeton-attente" }); ok("Compte en attente → 403", r.s === 403, r);
r = await f.appel({ cible: { type: "paiement", id: CL }, sujet: "a", corps: "b" }); ok("Type de fiche inconnu → 400", r.s === 400, r);
r = await f.appel({ cible: { type: "client", id: CL }, sujet: "", corps: "b" }); ok("Sujet vide → 400", r.s === 400 && r.j.error === "sujet_ou_message_vide", r);
r = await f.appel({ cible: { type: "client", id: CL2 }, sujet: "a", corps: "b" }); ok("Fiche sans email → 422 email_client_manquant", r.s === 422 && r.j.error === "email_client_manquant", r);
r = await f.appel({ cible: { type: "client", id: CL }, sujet: "a", corps: "b", destinataire: "pirate@exemple.fr", a: "pirate@exemple.fr" });
ok("Destinataire imposé par la fiche (adresse fournie ignorée)", r.s === 200 && dernier().to[0] === "claire@cabinet.fr", dernier()?.to);

r = await f.appel({ cible: { type: "facture", id: FA }, sujet: "Rappel — facture {{facture_numero}}", corps: "Bonjour {{contact_nom}},\n\nReste {{facture_reste}} avant le {{facture_echeance}}.\n\n{{signature}}", apercu: true });
ok("Aperçu : variables remplies, rien envoyé", r.s === 200 && r.j.sujet === "Rappel — facture 2026-0042" && /Bonjour Claire Martin/.test(r.j.html) && /120,00/.test(r.j.html) && /10\/10\/2026/.test(r.j.html) && /DHB Test<br>01 00 00 00 00<br>contact@exemple.fr/.test(r.j.html) && etat.resend.length === 1, r.j);
ok("Aperçu : destinataire = email de la facture", r.j.destinataire === "compta@cabinet.fr", r.j.destinataire);
r = await f.appel({ cible: { type: "client", id: CL }, sujet: "Devis {{devis_numero}}", corps: "{{inconnue}} et {{ facture_reste }}" });
ok("Variables inconnues ou sans valeur → 422 avec la liste, rien envoyé", r.s === 422 && r.j.error === "variables_manquantes" && ["devis_numero", "inconnue", "facture_reste"].every((v) => r.j.variables.includes(v)) && etat.resend.length === 1, r.j);

r = await f.appel({ cible: { type: "lead", id: LE }, sujet: "Votre demande", corps: "Bonjour {{contact_nom}}, <b>test</b>", modele: "suivi_demande" });
ok("Demande : envoyé à l'email de la demande, texte échappé", r.s === 200 && dernier().to[0] === "paul@exemple.fr" && /Bonjour Paul &lt;script&gt;, &lt;b&gt;test&lt;\/b&gt;/.test(dernier().html), dernier()?.html);
ok("Historique : origine manuel, modèle, auteur, lien vers la demande", dernierLog().origine === "manuel" && dernierLog().modele_cle === "suivi_demande" && dernierLog().envoye_par_email === "admin@test.fr" && dernierLog().lead_id === LE && dernierLog().statut === "envoye" && /^re_\d+$/.test(dernierLog().fournisseur_id), { origine: dernierLog().origine, modele: dernierLog().modele_cle, par: dernierLog().envoye_par_email, lead: dernierLog().lead_id, statut: dernierLog().statut, fid: dernierLog().fournisseur_id });

r = await f.appel({ cible: { type: "facture", id: FA }, sujet: "Votre facture", corps: "Ci-joint.", joindre_pdf: true });
const pj = dernier().attachments?.[0];
ok("Facture : PDF joint (nom et contenu)", r.s === 200 && pj?.filename === "Facture-2026-0042.pdf" && Buffer.from(pj.content, "base64").slice(0, 5).toString() === "%PDF-", pj?.filename);
ok("Facture : PDF archivé à cette occasion, historique avec pièce jointe et client", T.documents.some((d) => d.facture_id === FA) && dernierLog().piece_jointe === "Facture-2026-0042.pdf" && dernierLog().client_id === CL && dernierLog().facture_id === FA);
r = await f.appel({ cible: { type: "facture", id: FB }, sujet: "x", corps: "y", joindre_pdf: true }); ok("Facture brouillon : PDF non joignable → 409", r.s === 409 && r.j.error === "facture_brouillon", r);
r = await f.appel({ cible: { type: "ticket", id: TI }, sujet: "x", corps: "y", joindre_pdf: true }); ok("Ticket : pas de PDF → 400", r.s === 400, r);
r = await f.appel({ cible: { type: "ticket", id: TI }, sujet: "Ticket « {{ticket_sujet}} »", corps: "Résolu." }); ok("Ticket sans email : email du client utilisé", r.s === 200 && dernier().to[0] === "claire@cabinet.fr" && dernier().subject === "Ticket « Imprimante hors ligne »", dernier()?.subject);

etat.resendEnPanne = true;
r = await f.appel({ cible: { type: "client", id: CL }, sujet: "a", corps: "b" });
ok("Resend en panne → 502 et échec inscrit dans l'historique", r.s === 502 && dernierLog().statut === "echec" && /indisponible/.test(dernierLog().erreur), { r, log: dernierLog() });
etat.resendEnPanne = false;
f.arreter();

// Redirection de test (domaine pas encore vérifié)
f = await lancer("email-send", 54391, { EMAIL_REDIRECTION: "moi@exemple.fr" });
r = await f.appel({ cible: { type: "client", id: CL }, sujet: "Bonjour", corps: "Test" });
ok("Redirection : envoyé à mon adresse, sujet marqué [TEST → client]", r.s === 200 && dernier().to[0] === "moi@exemple.fr" && dernier().subject === "[TEST → claire@cabinet.fr] Bonjour", dernier());
ok("Redirection : l'historique garde le destinataire prévu et l'adresse réelle", dernierLog().destinataire === "claire@cabinet.fr" && dernierLog().destinataire_reel === "moi@exemple.fr");
f.arreter();
f = await lancer("email-send", 54392, { RESEND_API_KEY: "" });
r = await f.appel({ cible: { type: "client", id: CL }, sujet: "a", corps: "b" }); ok("Sans clé Resend → 503 resend_not_configured", r.s === 503 && r.j.error === "resend_not_configured", r);
f.arreter();

// ================= send-invoice (facture brouillon → envoyée, PDF joint et archivé) =================
const avant = T.documents.length;
f = await lancer("send-invoice", 54393);
r = await f.appel({ facture_id: FB });
const pdfEnvoye = dernier().attachments?.[0]?.content;
ok("send-invoice : envoyé avec le PDF, facture passée « envoyée »", r.s === 200 && dernier().attachments?.[0]?.filename === "Facture-2026-0043.pdf" && T.factures.find((x) => x.id === FB).status === "envoyee", r);
const archive = etat.fichiers.get(`documents/factures/${FB}.pdf`);
ok("send-invoice : PDF archivé = exactement celui envoyé, sans bandeau brouillon", T.documents.length === avant + 1 && archive && archive.toString("base64") === pdfEnvoye && !Buffer.from(pdfEnvoye, "base64").toString("latin1").includes("BROUILLON"));
ok("send-invoice : historique (origine facture)", dernierLog().origine === "facture" && dernierLog().facture_id === FB);
r = await f.appel({ facture_id: FB });
ok("send-invoice : renvoi → même PDF archivé joint", r.s === 200 && dernier().attachments?.[0]?.content === pdfEnvoye);
f.arreter();

// ================= send-devis =================
f = await lancer("send-devis", 54394);
r = await f.appel({ devis_id: DE });
const pdfDevis = Buffer.from(dernier().attachments?.[0]?.content ?? "", "base64");
ok("send-devis : envoyé avec le PDF du devis (sans bandeau brouillon), devis « envoyé »", r.s === 200 && dernier().attachments[0].filename === "Devis-DEV-2026-0007.pdf" && pdfDevis.slice(0, 5).toString() === "%PDF-" && T.devis.find((x) => x.id === DE).statut === "envoye", r);
ok("send-devis : lien de signature et historique", /exemple\.fr\/devis\.html\?token=tok/.test(dernier().html) && dernierLog().origine === "devis" && dernierLog().devis_id === DE);
f.arreter();

// ================= send-reminders (planification) =================
f = await lancer("send-reminders", 54395);
const n0 = T.emails.length;
r = await f.appel({}, { "x-cron-secret": "cron-test" });
const relances = T.emails.slice(n0);
ok("send-reminders : 1 relance de devis + 1 rappel de facture, historisés (modèles, origine automatisation)", r.s === 200 && r.j.relancesDevis === 1 && r.j.relancesFactures === 1 && relances.map((x) => x.modele_cle).sort().join() === "rappel_facture,relance_devis" && relances.every((x) => x.origine === "automatisation"), r.j);
ok("send-reminders : sans auteur (planification), liens client", relances.every((x) => x.envoye_par === null && x.client_id === CL));
f.arreter();

// ================= notify-new-lead =================
f = await lancer("notify-new-lead", 54389);
r = await f.appel({ type: "INSERT", table: "leads", record: { id: LE, nom: "Paul", email: "paul@exemple.fr", entity: "particuliers", message: "Bonjour" } }, { "x-webhook-secret": "wh-test" });
ok("notify-new-lead : alerte envoyée à NOTIFY_TO et historisée", r.s === 200 && dernier().to[0] === "alertes@exemple.fr" && dernierLog().origine === "alerte_demande" && dernierLog().lead_id === LE, r);
r = await f.appel({ type: "INSERT", table: "leads", record: { id: LE, email: "x@y.fr" } }, { "x-webhook-secret": "mauvais" }); ok("notify-new-lead : mauvais secret toujours refusé (401)", r.s === 401);
f.arreter();

fermer();
for (const x of res) console.log(x.ok ? "OK   " : "ÉCHEC", x.n, x.ok ? "" : JSON.stringify(x.d)?.slice(0, 400));
console.log(`${res.filter((x) => x.ok).length} / ${res.length} scénarios emails conformes`);
process.exit(0);
