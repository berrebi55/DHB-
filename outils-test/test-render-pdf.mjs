// Exécute supabase/functions/render-pdf avec Deno contre le faux serveur Supabase.
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import { demarrer } from "./faux-serveur-supabase.mjs";

const FONCTION = "C:/Users/CLAUDE/Documents/DHB-/supabase/functions/render-pdf/index.ts";
const { etat, fermer } = await demarrer(54321);
const T = etat.tables;
T.entreprise.push({ id: 1, raison_sociale: "DHB Test", siret: "000", adresse: "1 rue", penalites_retard: "Pénalités légales." });
T.factures.push(
  { id: "aaaaaaaa-0000-4000-8000-000000000001", numero: "2026-0001", status: "envoyee", client_id: "cccccccc-0000-4000-8000-000000000001", client_nom: "Cabinet Martin", date_facture: "2026-10-22", lignes: [{ libelle: "Dépannage", qte: 1, pu: 90 }], tva_taux: 0, total_ht: 90, total_ttc: 90 },
  { id: "aaaaaaaa-0000-4000-8000-000000000002", numero: null, status: "brouillon", client_nom: "Brouillon SA", date_facture: "2026-10-22", lignes: [{ libelle: "Essai", qte: 1, pu: 10 }], tva_taux: 0, total_ht: 10, total_ttc: 10 },
  { id: "aaaaaaaa-0000-4000-8000-000000000003", numero: "2026-0003", status: "payee", client_nom: "Concurrence", date_facture: "2026-10-22", lignes: [{ libelle: "X", qte: 1, pu: 5 }], tva_taux: 0, total_ht: 5, total_ttc: 5 },
  { id: "aaaaaaaa-0000-4000-8000-000000000004", numero: "2026-0004", status: "envoyee", client_nom: "Panne", date_facture: "2026-10-22", lignes: [{ libelle: "Y", qte: 1, pu: 5 }], tva_taux: 0, total_ht: 5, total_ttc: 5 },
);
T.devis.push({ id: "bbbbbbbb-0000-4000-8000-000000000001", numero: "DEV-2026-0001", statut: "envoye", client_id: "cccccccc-0000-4000-8000-000000000001", client_nom: "Cabinet Martin", date_devis: "2026-10-22", lignes: [{ libelle: "Audit", qte: 1, pu: 300 }], tva_taux: 0, total_ht: 300, total_ttc: 300 });

const deno = spawn("node_modules/deno/deno.exe", ["run", "--allow-net", "--allow-env", "--allow-read", "lancer-fonction.ts", FONCTION], {
  env: { ...process.env, SUPABASE_URL: "http://127.0.0.1:54321", SUPABASE_SERVICE_ROLE_KEY: "cle-serveur-de-test" },
});
let journal = ""; deno.stdout.on("data", (d) => (journal += d)); deno.stderr.on("data", (d) => (journal += d));
for (let i = 0; i < 120 && !/Listening/.test(journal); i++) await new Promise((r) => setTimeout(r, 500));
if (!/Listening/.test(journal)) { console.log(journal); process.exit(1); }

const res = []; const ok = (n, c, d) => res.push({ n, ok: !!c, d });
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
async function appel(corps, jeton = "jeton-admin", methode = "POST") {
  const r = await fetch("http://127.0.0.1:54399/", { method: methode, headers: { "Content-Type": "application/json", ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}) }, body: methode === "POST" ? JSON.stringify(corps) : undefined });
  const type = r.headers.get("content-type") || "";
  const octets = Buffer.from(await r.arrayBuffer());
  return { s: r.status, type, archive: r.headers.get("x-document-archive"), dispo: r.headers.get("content-disposition"), octets, err: type.includes("json") ? JSON.parse(octets.toString()).error : null };
}
const F1 = "aaaaaaaa-0000-4000-8000-000000000001", FB = "aaaaaaaa-0000-4000-8000-000000000002", F3 = "aaaaaaaa-0000-4000-8000-000000000003", F4 = "aaaaaaaa-0000-4000-8000-000000000004", D1 = "bbbbbbbb-0000-4000-8000-000000000001";

// Accès
let r = await appel({ type: "facture", id: F1 }, null); ok("Sans jeton → 401", r.s === 401 && r.err === "non_authentifie", r);
r = await appel({ type: "facture", id: F1 }, "jeton-inconnu"); ok("Jeton invalide → 401", r.s === 401, r);
r = await appel({ type: "facture", id: F1 }, "jeton-attente"); ok("Compte en attente → 403", r.s === 403 && r.err === "acces_en_attente", r);
r = await appel(null, "jeton-admin", "GET"); ok("Méthode GET → 405", r.s === 405, r);
r = await appel({ type: "photo", id: F1 }); ok("Type inconnu → 400", r.s === 400 && r.err === "parametres_invalides", r);
r = await appel({ type: "facture", id: "1 or 1=1" }); ok("Identifiant invalide → 400", r.s === 400, r);
r = await appel({ type: "facture", id: "aaaaaaaa-0000-4000-8000-00000000ffff" }); ok("Facture inexistante → 404", r.s === 404 && r.err === "document_introuvable", r);

// Facture brouillon : aperçu non conservé
r = await appel({ type: "facture", id: FB });
ok("Brouillon : PDF renvoyé (aperçu)", r.s === 200 && r.type === "application/pdf" && r.archive === "apercu" && r.octets.slice(0, 5).toString() === "%PDF-", r.archive);
ok("Brouillon : nom de fichier", /Facture-brouillon\.pdf/.test(r.dispo), r.dispo);
ok("Brouillon : rien n'est conservé", T.documents.length === 0 && etat.fichiers.size === 0);

// Facture émise : archivage unique
r = await appel({ type: "facture", id: F1 });
const premier = r.octets;
const doc = T.documents.find((x) => x.facture_id === F1);
ok("Facture émise : PDF archivé", r.s === 200 && r.archive === "archive" && !!doc && etat.fichiers.has(`documents/factures/${F1}.pdf`));
ok("Facture émise : empreinte et taille enregistrées = fichier stocké", doc && doc.empreinte_sha256 === sha(etat.fichiers.get(`documents/factures/${F1}.pdf`)) && doc.taille_octets === premier.length);
ok("Facture émise : client, numéro, auteur enregistrés", doc && doc.client_id === "cccccccc-0000-4000-8000-000000000001" && doc.numero === "2026-0001" && doc.cree_par === "11111111-1111-1111-1111-111111111111" && doc.nom_fichier === "Facture-2026-0001.pdf");
T.entreprise[0].raison_sociale = "Nouveau nom";   // la fiche entreprise change ensuite…
await new Promise((x) => setTimeout(x, 1100));
r = await appel({ type: "facture", id: F1 }, "jeton-collab");
ok("Facture émise : 2e demande (collaborateur) → fichier archivé identique, jamais régénéré", r.s === 200 && sha(r.octets) === sha(premier) && T.documents.filter((x) => x.facture_id === F1).length === 1);

// Accès direct à un document archivé
r = await appel({ document_id: doc.id }); ok("Document archivé par identifiant", r.s === 200 && sha(r.octets) === sha(premier));
r = await appel({ document_id: "aaaaaaaa-0000-4000-8000-00000000eeee" }); ok("Document inexistant → 404", r.s === 404, r);
r = await appel({ document_id: "../../etc/passwd" }); ok("Identifiant de document invalide → 400", r.s === 400, r);

// Devis : dernière version conservée
r = await appel({ type: "devis", id: D1 });
const v1 = sha(r.octets);
ok("Devis : PDF conservé (mis à jour)", r.s === 200 && r.archive === "mis-a-jour" && T.documents.filter((x) => x.devis_id === D1).length === 1);
T.devis[0].lignes = [{ libelle: "Audit complet", qte: 2, pu: 300 }]; T.devis[0].total_ht = T.devis[0].total_ttc = 600;
await new Promise((x) => setTimeout(x, 1100));
r = await appel({ type: "devis", id: D1 });
const dDoc = T.documents.filter((x) => x.devis_id === D1);
ok("Devis modifié : nouvelle version, toujours une seule ligne « documents »", dDoc.length === 1 && sha(r.octets) !== v1 && dDoc[0].empreinte_sha256 === sha(etat.fichiers.get(`documents/devis/${D1}.pdf`)));

// Demandes simultanées sur une facture jamais archivée
const [a, b] = await Promise.all([appel({ type: "facture", id: F3 }), appel({ type: "facture", id: F3 })]);
const d3 = T.documents.filter((x) => x.facture_id === F3);
ok("Demandes simultanées : une seule archive, même fichier renvoyé aux deux", a.s === 200 && b.s === 200 && d3.length === 1 && sha(a.octets) === sha(b.octets) && d3[0].empreinte_sha256 === sha(a.octets), { a: a.s, b: b.s, n: d3.length });

// Stockage en panne
etat.stockageEnPanne = true;
r = await appel({ type: "devis", id: D1 }); ok("Stockage en panne : le devis est quand même renvoyé (aperçu)", r.s === 200 && r.archive === "apercu");
r = await appel({ type: "facture", id: F4 }); ok("Stockage en panne : facture émise non archivée → erreur claire 502", r.s === 502 && r.err === "stockage_indisponible" && !T.documents.some((x) => x.facture_id === F4), r);
etat.stockageEnPanne = false;
r = await appel({ type: "facture", id: F4 }); ok("Stockage rétabli : la facture s'archive normalement", r.s === 200 && T.documents.some((x) => x.facture_id === F4));

deno.kill(); fermer();
for (const x of res) console.log(x.ok ? "OK   " : "ÉCHEC", x.n, x.ok ? "" : JSON.stringify(x.d)?.slice(0, 300));
console.log(`${res.filter((x) => x.ok).length} / ${res.length} scénarios render-pdf conformes`);
process.exit(0);
