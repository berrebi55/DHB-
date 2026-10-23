// Lot 11 : Google Drive de bout en bout (base réelle + PostgREST + robot / drive-sync + faux Drive).
import { spawn, execFileSync } from "node:child_process";
import crypto from "node:crypto";
import http from "node:http";

const RACINE = "C:/Users/CLAUDE/Documents/DHB-/supabase/functions/";
const JWT_SECRET = "secret-jwt-de-test-au-moins-32-caracteres";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const corpsJwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ role: "service_role", exp: Math.floor(Date.now() / 1000) + 3600 })}`;
const CLE = `${corpsJwt}.${crypto.createHmac("sha256", JWT_SECRET).update(corpsJwt).digest("base64url")}`;
const sql = (q) => execFileSync("docker", ["exec", "dhb-test-pg", "psql", "-U", "postgres", "-d", "dhb_test", "-v", "ON_ERROR_STOP=1", "-tAc", q]).toString().trim();
const UTIL = { "jeton-admin": { id: "11111111-1111-1111-1111-111111111111", email: "admin@test.fr" }, "jeton-collab": { id: "22222222-2222-2222-2222-222222222222", email: "collab@test.fr" } };

// ---- Faux Google Drive ----
const fichiers = new Map(); let n = 0; let mode = "ok"; const appelsDrive = [];
const nouveau = (o) => { const id = `f${++n}`; fichiers.set(id, { id, trashed: false, ...o }); return fichiers.get(id); };
const stockage = new Map();   // documents/<chemin> → octets
const lire = (req) => new Promise((ok) => { const b = []; req.on("data", (d) => b.push(d)); req.on("end", () => ok(Buffer.concat(b))); });
const envoi = (res, s, o) => { res.writeHead(s, { "Content-Type": "application/json" }); res.end(o === undefined ? "" : JSON.stringify(o)); };
const serveur = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  const corps = await lire(req);
  if (u.pathname === "/auth/v1/user") { const x = UTIL[(req.headers.authorization || "").replace("Bearer ", "")]; return x ? envoi(res, 200, { id: x.id, email: x.email }) : envoi(res, 401, {}); }
  if (u.pathname === "/g/token") return envoi(res, 200, { access_token: "at-drive" });
  if (u.pathname.startsWith("/storage/v1/object/documents/")) {
    const k = decodeURIComponent(u.pathname.slice("/storage/v1/object/documents/".length));
    return stockage.has(k) ? (res.writeHead(200, { "Content-Type": "application/pdf" }), res.end(stockage.get(k))) : envoi(res, 400, { statusCode: "404", error: "not_found" });
  }
  if (u.pathname.startsWith("/drive/") || u.pathname.startsWith("/upload/")) {
    appelsDrive.push(`${req.method} ${u.pathname}`);
    if (req.headers.authorization !== "Bearer at-drive") return envoi(res, 401, { error: { message: "Invalid Credentials" } });
    if (mode === "panne") return envoi(res, 503, { error: { message: "Backend Error" } });
    if (mode === "refus") return envoi(res, 403, { error: { message: "Insufficient Permission", errors: [{ reason: "insufficientPermissions" }] } });
    let m;
    // Comme Google Drive : un élément dont un dossier parent est à la corbeille y est aussi.
    const aLaCorbeille = (f) => !!f && (f.trashed || aLaCorbeille(fichiers.get(f.parents?.[0])));
    if (req.method === "GET" && (m = u.pathname.match(/^\/drive\/v3\/files\/([^/]+)$/))) { const f = fichiers.get(decodeURIComponent(m[1])); return f ? envoi(res, 200, { id: f.id, trashed: aLaCorbeille(f) }) : envoi(res, 404, { error: { message: "File not found" } }); }
    if (req.method === "GET" && u.pathname === "/drive/v3/files") {
      const q = u.searchParams.get("q"); const parent = q.match(/'([^']+)' in parents/)[1]; const nom = q.match(/name = '((?:[^'\\]|\\.)*)'/)[1].replace(/\\'/g, "'");
      return envoi(res, 200, { files: [...fichiers.values()].filter((f) => f.parents?.[0] === parent && f.name === nom && f.dossier && !f.trashed).slice(0, 1).map((f) => ({ id: f.id })) });
    }
    if (req.method === "POST" && u.pathname === "/drive/v3/files") { const o = JSON.parse(corps.toString()); const f = nouveau({ name: o.name, parents: o.parents, dossier: true }); return envoi(res, 200, { id: f.id, webViewLink: `https://drive.google.com/drive/folders/${f.id}` }); }
    if (req.method === "POST" && u.pathname === "/upload/drive/v3/files") {
      const lim = /boundary=(.+)$/.exec(req.headers["content-type"])[1]; const txt = corps.toString("latin1"); const parts = txt.split(`--${lim}`);
      const meta = JSON.parse(parts[1].split("\r\n\r\n")[1]); const contenu = Buffer.from(parts[2].split("\r\n\r\n").slice(1).join("\r\n\r\n").replace(/\r\n$/, ""), "latin1");
      const f = nouveau({ name: meta.name, parents: meta.parents, contenu }); return envoi(res, 200, { id: f.id });
    }
    if (req.method === "PATCH" && (m = u.pathname.match(/^\/upload\/drive\/v3\/files\/([^/]+)$/))) { const f = fichiers.get(m[1]); if (!f) return envoi(res, 404, {}); f.contenu = corps; return envoi(res, 200, { id: f.id }); }
    return envoi(res, 400, { error: { message: "requête inconnue " + u.pathname } });
  }
  const p = http.request({ host: "127.0.0.1", port: 54330, path: req.url.replace(/^\/rest\/v1/, ""), method: req.method, headers: { ...req.headers, host: "127.0.0.1:54330" } }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  p.end(corps);
});
await new Promise((ok) => serveur.listen(54322, "127.0.0.1", ok));
const ENV = { SUPABASE_URL: "http://127.0.0.1:54322", SUPABASE_SERVICE_ROLE_KEY: CLE, CRON_SECRET: "cron-test", GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "s", GOOGLE_REDIRECT_URI: "https://x/y",
  GOOGLE_TOKEN_URL: "http://127.0.0.1:54322/g/token", DRIVE_API_URL: "http://127.0.0.1:54322" };
const procs = [];
async function lancer(nom, port) {
  const p = spawn("node_modules/deno/deno.exe", ["run", "--allow-net", "--allow-env", "--allow-read", "lancer-fonction.ts", RACINE + nom + "/index.ts"], { env: { ...process.env, ...ENV, PORT_TEST: String(port) } });
  procs.push(p); let j = ""; p.stdout.on("data", (d) => (j += d)); p.stderr.on("data", (d) => (j += d));
  for (let i = 0; i < 120 && !/Listening/.test(j); i++) await new Promise((r) => setTimeout(r, 500));
  if (!/Listening/.test(j)) { console.log(j); process.exit(1); }
  return async (corps, entetes = { "x-cron-secret": "cron-test" }) => { const r = await fetch(`http://127.0.0.1:${port}/`, { method: "POST", headers: { "Content-Type": "application/json", ...entetes }, body: JSON.stringify(corps) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
}
const SOUS = '["01 - Devis", "02 - Factures", "03 - Contrats et abonnements", "04 - Parc informatique", "05 - Interventions", "06 - Échanges", "07 - Documents du client", "08 - Divers"]';
const nettoyer = () => sql(`set session_replication_role = replica;
  delete from public.evenements where objet_id in (select id from public.clients where nom like 'D11%') or objet_id in (select id from public.documents where chemin like 'test-d11/%');
  delete from public.documents where chemin like 'test-d11/%'; delete from public.factures where numero like 'D11-%'; delete from public.devis where numero like 'D11-%';
  delete from public.clients where nom like 'D11%'; delete from public.integration_credentials; delete from public.integration_logs where cle = 'drive';
  set session_replication_role = origin;
  update public.integrations set details = '{"actif": false, "sous_dossiers": ${SOUS}}', statut = 'non_configure', erreur = null where cle = 'drive';
  update public.evenements set statut = 'ignore' where statut in ('en_attente','erreur');`);
nettoyer();
const res = []; const ok = (n, c, d) => res.push({ n, ok: !!c, d });
const worker = await lancer("worker", 54381);
const ds = await lancer("drive-sync", 54380);
const dossiersDe = (parent) => [...fichiers.values()].filter((f) => f.parents?.[0] === parent && f.dossier).map((f) => f.name).sort();

// 1. Drive désactivé
sql("insert into public.clients (id, nom, email) values ('d11d11d1-0000-4000-8000-000000000001', 'D11 Avant', 'a@d11.fr')");
await worker({});
ok("Drive désactivé : rien n'est créé dans Drive, événement ignoré", appelsDrive.length === 0 && sql("select statut from public.evenements where objet_id = 'd11d11d1-0000-4000-8000-000000000001'") === "ignore");
let r = await ds({ client_id: "d11d11d1-0000-4000-8000-000000000001" }, { Authorization: "Bearer jeton-admin" }); ok("drive-sync avec Drive désactivé → 409", r.s === 409 && r.j.error === "drive_desactive", r);

// 2. Activation + Google connecté : dossier client
sql(`update public.integrations set details = jsonb_set(details, '{actif}', 'true') where cle = 'drive'; insert into public.integration_credentials (cle, refresh_token) values ('google', 'rt-test');`);
sql("insert into public.clients (id, nom, entreprise, email) values ('d11d11d1-0000-4000-8000-000000000002', 'D11 Claire', 'D11 Cabinet Martin', 'c@d11.fr')");
r = await worker({});
const racine = [...fichiers.values()].find((f) => f.name === "DHB — Clients");
const dossierClient = [...fichiers.values()].find((f) => f.name === "D11 Cabinet Martin");
ok("Nouveau client : « DHB — Clients » / « D11 Cabinet Martin » créés", racine && dossierClient && dossierClient.parents[0] === racine.id, [...fichiers.values()].map((f) => f.name));
ok("Les 8 sous-dossiers sont créés", JSON.stringify(dossiersDe(dossierClient?.id)) === JSON.stringify(JSON.parse(SOUS).sort()), dossiersDe(dossierClient?.id));
ok("Fiche client : statut « à jour », lien du dossier", sql("select drive_sync_statut || '|' || drive_folder_url from public.clients where id = 'd11d11d1-0000-4000-8000-000000000002'") === `a_jour|https://drive.google.com/drive/folders/${dossierClient?.id}`);
ok("Racine mémorisée", sql("select details->>'racine_id' from public.integrations where cle = 'drive'") === racine?.id);

// 3. PDF de devis puis nouvelle version
const pdf1 = Buffer.from("%PDF-1.7 devis v1"), pdf2 = Buffer.from("%PDF-1.7 devis v2 modifié");
stockage.set("test-d11/devis.pdf", pdf1);
sql(`insert into public.documents (id, type, client_id, numero, nom_fichier, chemin, empreinte_sha256) values ('d11d11d1-0000-4000-8000-0000000000d1', 'devis', 'd11d11d1-0000-4000-8000-000000000002', 'D11-DEV', 'Devis-D11-DEV.pdf', 'test-d11/devis.pdf', 'v1')`);
await worker({});
const dossierDevis = [...fichiers.values()].find((f) => f.name === "01 - Devis" && f.parents[0] === dossierClient.id);
const fDevis = [...fichiers.values()].find((f) => f.name === "Devis-D11-DEV.pdf");
ok("PDF du devis copié dans « 01 - Devis », contenu identique", fDevis && fDevis.parents[0] === dossierDevis.id && fDevis.contenu.equals(pdf1), fDevis?.parents);
ok("Document : copie notée (identifiant Drive)", sql("select drive_file_id from public.documents where id = 'd11d11d1-0000-4000-8000-0000000000d1'") === fDevis?.id);
stockage.set("test-d11/devis.pdf", pdf2);
sql("update public.documents set empreinte_sha256 = 'v2' where id = 'd11d11d1-0000-4000-8000-0000000000d1'");
await worker({});
ok("Nouvelle version du devis : fichier Drive remplacé (pas de doublon)", fDevis.contenu.equals(pdf2) && [...fichiers.values()].filter((f) => f.name === "Devis-D11-DEV.pdf").length === 1);

// 4. Facture : copie unique
stockage.set("test-d11/facture.pdf", Buffer.from("%PDF-1.7 facture"));
sql(`insert into public.factures (id, numero, status, client_nom, total_ht, total_ttc) values ('d11d11d1-0000-4000-8000-0000000000f1', 'D11-FAC', 'envoyee', 'D11', 10, 10);
  insert into public.documents (id, type, facture_id, client_id, numero, nom_fichier, chemin, empreinte_sha256) values ('d11d11d1-0000-4000-8000-0000000000a1', 'facture', 'd11d11d1-0000-4000-8000-0000000000f1', 'd11d11d1-0000-4000-8000-000000000002', 'D11-FAC', 'Facture-D11-FAC.pdf', 'test-d11/facture.pdf', 'f1');`);
await worker({});
const fFact = [...fichiers.values()].find((f) => f.name === "Facture-D11-FAC.pdf");
ok("PDF de facture copié dans « 02 - Factures »", fFact && fichiers.get(fFact.parents[0]).name === "02 - Factures");
sql("insert into public.evenements (type, objet_type, objet_id) values ('document_cree', 'document', 'd11d11d1-0000-4000-8000-0000000000a1')");
await worker({});
ok("Facture déjà copiée : aucune seconde copie", [...fichiers.values()].filter((f) => f.name === "Facture-D11-FAC.pdf").length === 1);

// 5. Panne de Drive : réessai plus tard
mode = "panne";
sql("insert into public.clients (id, nom, email) values ('d11d11d1-0000-4000-8000-000000000003', 'D11 Panne', 'p@d11.fr')");
await worker({});
ok("Drive en panne : événement gardé (1 tentative), fiche en erreur avec la raison", sql("select statut || '|' || tentatives from public.evenements where objet_id = 'd11d11d1-0000-4000-8000-000000000003'") === "en_attente|1"
  && /momentanément indisponible \(503\)/.test(sql("select drive_sync_statut || '|' || drive_erreur from public.clients where id = 'd11d11d1-0000-4000-8000-000000000003'")));
ok("Le CRM continue : la fiche client existe normalement", sql("select count(*) from public.clients where id = 'd11d11d1-0000-4000-8000-000000000003'") === "1");
mode = "ok";
sql("update public.evenements set prochaine_tentative = now() where objet_id = 'd11d11d1-0000-4000-8000-000000000003'");
await worker({});
ok("Drive rétabli : dossier créé, fiche « à jour », événement traité", sql("select c.drive_sync_statut || '|' || e.statut from public.clients c join public.evenements e on e.objet_id = c.id where c.id = 'd11d11d1-0000-4000-8000-000000000003'") === "a_jour|traite");

// 6. Accès refusé : erreur définitive, expliquée
mode = "refus";
sql("insert into public.clients (id, nom, email) values ('d11d11d1-0000-4000-8000-000000000004', 'D11 Refus', 'r@d11.fr')");
await worker({});
ok("Accès Drive refusé : pas de réessai inutile, erreur expliquée sur la fiche et au journal", sql("select statut from public.evenements where objet_id = 'd11d11d1-0000-4000-8000-000000000004'") === "traite"
  && /reconnectez le compte Google/.test(sql("select drive_erreur from public.clients where id = 'd11d11d1-0000-4000-8000-000000000004'")) && sql("select count(*) from public.integration_logs where cle = 'drive' and statut = 'erreur'") === "1");
mode = "ok";

// 7. Bouton de la fiche : créer / réessayer
r = await ds({ client_id: "d11d11d1-0000-4000-8000-000000000004" }, { Authorization: "Bearer jeton-collab" });
ok("Fiche : « Réessayer » (collaborateur) → dossier créé, lien renvoyé", r.s === 200 && /drive\.google\.com\/drive\/folders\//.test(r.j.url) && sql("select drive_sync_statut from public.clients where id = 'd11d11d1-0000-4000-8000-000000000004'") === "a_jour", r);
fichiers.get(dossierClient.id).trashed = true;
r = await ds({ client_id: "d11d11d1-0000-4000-8000-000000000002" }, { Authorization: "Bearer jeton-admin" });
const nouveauDossier = sql("select drive_folder_id from public.clients where id = 'd11d11d1-0000-4000-8000-000000000002'");
ok("Dossier supprimé dans Drive : recréé, PDF du devis recopié dedans", r.s === 200 && nouveauDossier !== dossierClient.id && [...fichiers.values()].some((f) => f.name === "Devis-D11-DEV.pdf" && fichiers.get(f.parents[0])?.parents?.[0] === nouveauDossier), r.j);

// 8. Rattrapage des clients existants
r = await ds({ tous: true }, { Authorization: "Bearer jeton-collab" }); ok("Rattrapage : collaborateur → 403", r.s === 403);
r = await ds({ tous: true }, { Authorization: "Bearer jeton-admin" });
ok("Rattrapage (admin) : client créé avant l'activation désormais pourvu d'un dossier", r.s === 200 && r.j.dossiers >= 1 && sql("select drive_sync_statut from public.clients where id = 'd11d11d1-0000-4000-8000-000000000001'") === "a_jour", r.j);

// 9. Sous-dossiers personnalisés
sql(`update public.integrations set details = jsonb_set(details, '{sous_dossiers}', '["Devis", "Factures", "Contrats"]') where cle = 'drive'`);
sql("insert into public.clients (id, nom, email) values ('d11d11d1-0000-4000-8000-000000000005', 'D11 Perso', 'x@d11.fr')");
await worker({});
const dPerso = [...fichiers.values()].find((f) => f.name === "D11 Perso");
ok("Sous-dossiers renommés par l'administrateur : utilisés pour les nouveaux clients", JSON.stringify(dossiersDe(dPerso?.id)) === JSON.stringify(["Contrats", "Devis", "Factures"]), dossiersDe(dPerso?.id));
ok("Un seul dossier racine pour tous les clients", [...fichiers.values()].filter((f) => f.name === "DHB — Clients").length === 1);

procs.forEach((p) => p.kill()); serveur.close();
nettoyer();
for (const x of res) console.log(x.ok ? "OK   " : "ÉCHEC", x.n, x.ok ? "" : JSON.stringify(x.d)?.slice(0, 400));
console.log(`${res.filter((x) => x.ok).length} / ${res.length} scénarios Drive conformes`);
process.exit(0);
