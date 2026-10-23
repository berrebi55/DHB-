// Lot 18 de bout en bout : webhook Resend signé → email-entrant (Deno) → PostgREST → base de test,
// avec un faux Resend (emails reçus + pièces jointes) et un faux stockage. Robot (worker) pour les réessais.
import { spawn, execFileSync } from "node:child_process";
import crypto from "node:crypto";
import http from "node:http";

const RACINE = "C:/Users/CLAUDE/Documents/DHB-/supabase/functions";
const JWT_SECRET = "secret-jwt-de-test-au-moins-32-caracteres";
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const corpsJwt = `${b64u({ alg: "HS256", typ: "JWT" })}.${b64u({ role: "service_role", exp: Math.floor(Date.now() / 1000) + 3600 })}`;
const CLE_SERVEUR = `${corpsJwt}.${crypto.createHmac("sha256", JWT_SECRET).update(corpsJwt).digest("base64url")}`;
const CLE_SVIX = crypto.randomBytes(24);
const SECRET = "whsec_" + CLE_SVIX.toString("base64");
const sql = (q) => execFileSync("docker", ["exec", "dhb-test-pg", "psql", "-U", "postgres", "-d", "dhb_test", "-tAc", q]).toString().trim();
const uuid = () => crypto.randomUUID();

// ---------- Faux Resend + faux stockage + mandataire PostgREST ----------
const emails = new Map();          // id → email reçu (format API « receiving »)
const fichiers = new Map();        // id pièce → { octets, meta }
const stockage = new Map();        // chemin → octets
const etat = { resendEnPanne: false };
const lire = (req) => new Promise((ok) => { const c = []; req.on("data", (d) => c.push(d)); req.on("end", () => ok(Buffer.concat(c))); });
const envoi = (res, s, o) => { res.writeHead(s, { "Content-Type": "application/json" }); res.end(JSON.stringify(o)); };
const serveur = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  let m;
  if ((m = u.pathname.match(/^\/resend\/emails\/receiving\/([^/]+)(\/attachments)?$/))) {
    if (req.headers.authorization !== "Bearer re_test") return envoi(res, 401, {});
    if (etat.resendEnPanne) return envoi(res, 500, { message: "panne" });
    const e = emails.get(m[1]);
    if (!e) return envoi(res, 404, { message: "not found" });
    if (!m[2]) return envoi(res, 200, { object: "email", ...e, attachments: e.pieces.map(({ id, filename, content_type, size }) => ({ id, filename, content_type, size })) });
    return envoi(res, 200, { object: "list", has_more: false, data: e.pieces.map((p) => ({ ...p, download_url: `http://127.0.0.1:54322/cdn/${p.id}`, expires_at: new Date(Date.now() + 3600e3).toISOString() })) });
  }
  if ((m = u.pathname.match(/^\/cdn\/(.+)$/))) {
    const f = fichiers.get(m[1]);
    if (!f) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": "application/octet-stream" }); return res.end(f);
  }
  if ((m = u.pathname.match(/^\/storage\/v1\/object\/(?:authenticated\/)?documents\/(.+)$/))) {
    const chemin = decodeURIComponent(m[1]);
    if (req.method === "POST" || req.method === "PUT") { stockage.set(chemin, await lire(req)); return envoi(res, 200, { Key: `documents/${chemin}` }); }
    const f = stockage.get(chemin);
    if (!f) return envoi(res, 404, { message: "Object not found" });
    res.writeHead(200, { "Content-Type": "application/octet-stream" }); return res.end(f);
  }
  const corps = await lire(req);
  const p = http.request({ host: "127.0.0.1", port: 54330, path: req.url.replace(/^\/rest\/v1/, ""), method: req.method, headers: { ...req.headers, host: "127.0.0.1:54330" } },
    (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  p.end(corps);
});
await new Promise((ok) => serveur.listen(54322, "127.0.0.1", ok));

const ENV = { ...process.env, SUPABASE_URL: "http://127.0.0.1:54322", SUPABASE_SERVICE_ROLE_KEY: CLE_SERVEUR, RESEND_API_KEY: "re_test",
  RESEND_API_URL: "http://127.0.0.1:54322/resend", RESEND_WEBHOOK_SECRET: SECRET, NOTIFY_FROM: "DHB <dhb@notify.test>", CRON_SECRET: "cron-test" };
async function lancer(nom, port) {
  const p = spawn("node_modules/deno/deno.exe", ["run", "--allow-net", "--allow-env", "--allow-read", "lancer-fonction.ts", `${RACINE}/${nom}/index.ts`], { env: { ...ENV, PORT_TEST: String(port) } });
  let j = ""; p.stdout.on("data", (d) => (j += d)); p.stderr.on("data", (d) => (j += d));
  for (let i = 0; i < 160 && !/Listening/.test(j); i++) await new Promise((r) => setTimeout(r, 500));
  if (!/Listening/.test(j)) { console.log(j); process.exit(1); }
  return p;
}
const fEntrant = await lancer("email-entrant", 54381);
const fWorker = await lancer("worker", 54382);

const nettoyer = () => sql(`delete from public.tickets where client_email like '%@lot18e2e.test' or sujet like 'lot18e2e%';
  delete from public.evenements where type = 'email_recu';
  delete from public.ticket_messages where de_email like '%@lot18e2e.test';
  delete from public.clients where email ilike '%@lot18e2e.test';
  update public.integrations set details = '{"adresses": {"infogerance": "", "particuliers": ""}}' where cle = 'email_entrant';`);
nettoyer();
sql(`insert into public.clients (nom, entreprise, email, type, statut) values ('Claire Connue', 'Société Connue', 'Claire@Lot18e2e.test', 'entreprise', 'client'),
  ('Paul', null, 'paul_x@lot18e2e.test', 'particulier', 'client')`);

const res = []; const ok = (n, c, d) => res.push({ n, ok: !!c, d });
const signer = (id, t, corps, cle = CLE_SVIX) => `v1,${crypto.createHmac("sha256", cle).update(`${id}.${t}.${corps}`).digest("base64")}`;
async function webhook(evt, o = {}) {
  const corps = typeof evt === "string" ? evt : JSON.stringify(evt);
  const id = "msg_" + crypto.randomBytes(6).toString("hex"), t = String(o.t ?? Math.floor(Date.now() / 1000));
  const h = { "Content-Type": "application/json" };
  if (o.signature !== null) Object.assign(h, { "svix-id": id, "svix-timestamp": t, "svix-signature": o.signature ?? signer(id, t, o.corpsSigne ?? corps, o.cle) });
  const r = await fetch("http://127.0.0.1:54381/", { method: o.methode ?? "POST", headers: h, body: o.methode === "GET" ? undefined : corps });
  return { s: r.status, j: await r.json().catch(() => ({})) };
}
/** Prépare un email chez le faux Resend et envoie l'événement signé. */
async function recevoir(e, o = {}) {
  const id = e.id ?? uuid();
  emails.set(id, { id, from: e.de ?? "x@lot18e2e.test", to: e.a ?? ["support@lot18e2e.test"], received_for: [], subject: e.objet ?? "lot18e2e sujet", text: e.texte ?? null, html: e.html ?? null,
    headers: { from: e.from ?? e.de ?? "x@lot18e2e.test", ...(e.entetes ?? {}) }, message_id: e.message_id ?? `<${id}@mail.lot18e2e.test>`, created_at: new Date().toISOString(), pieces: e.pieces ?? [] });
  const r = await webhook({ type: "email.received", created_at: new Date().toISOString(), data: { email_id: id } }, o);
  return { ...r, id };
}
const ticketDe = (de) => sql(`select t.numero || '|' || t.status || '|' || coalesce(t.client_id::text,'') || '|' || t.a_qualifier || '|' || t.canal || '|' || t.entity from public.tickets t where t.client_email = '${de}' order by t.created_at desc limit 1`);
const nbMessages = (cond) => Number(sql(`select count(*) from public.ticket_messages where ${cond}`));

// ---------- 1. Sécurité de l'entrée ----------
let r = await webhook({}, { methode: "GET" }); ok("GET → 405", r.s === 405, r);
r = await webhook({ type: "email.received", data: { email_id: uuid() } }, { signature: null }); ok("Sans signature → 401", r.s === 401, r);
r = await webhook({ type: "email.received", data: { email_id: uuid() } }, { cle: crypto.randomBytes(24) }); ok("Mauvais secret → 401", r.s === 401, r);
r = await webhook({ type: "email.received", data: { email_id: uuid() } }, { t: Math.floor(Date.now() / 1000) - 600 }); ok("Signature vieille de 10 min → 401 (rejeu)", r.s === 401, r);
r = await webhook({ type: "email.received", data: { email_id: uuid() } }, { corpsSigne: JSON.stringify({ type: "email.received", data: { email_id: uuid() } }) });
ok("Contenu modifié après signature → 401", r.s === 401, r);
r = await webhook({ type: "email.sent", data: {} }); ok("Autre type d'événement → ignoré (200)", r.s === 200 && r.j.ignore === "email.sent", r);
r = await webhook({ type: "email.received", data: { email_id: "pas-un-uuid" } }); ok("Identifiant d'email invalide → 400", r.s === 400, r);
ok("Rien d'écrit par les appels refusés", sql("select count(*) from public.evenements where type = 'email_recu'") === "0");

// ---------- 2. Nouveau ticket ----------
r = await recevoir({ de: "claire@lot18e2e.test", from: "Claire Connue <claire@lot18e2e.test>", objet: "Imprimante en panne", texte: "Bonjour,\nl'imprimante ne marche plus.\nClaire" });
const [num1, st1, cl1, aq1, canal1] = ticketDe("claire@lot18e2e.test").split("|");
ok("Client connu (casse ignorée) : ticket « email », rattaché, pas à qualifier", r.s === 200 && r.j.statut === "traite" && cl1 && aq1 === "false" && canal1 === "email" && st1 === "ouvert", { r, t: ticketDe("claire@lot18e2e.test") });
ok("Message entrant : texte, nom de l'expéditeur, identifiant Resend", sql(`select texte || '|' || de_nom from public.ticket_messages where resend_id = '${r.id}'`) === "Bonjour,\nl'imprimante ne marche plus.\nClaire|Claire Connue");
ok("Journal du client : « Email reçu de Claire Connue (ticket #n) »", sql(`select count(*) from public.activites where titre = 'Email reçu de Claire Connue (ticket #${num1})'`) === "1");
const idDouble = r.id;
r = await webhook({ type: "email.received", data: { email_id: idDouble } });
ok("Même événement renvoyé par Resend : pas de doublon", r.s === 200 && r.j.deja_recu === true && nbMessages(`resend_id = '${idDouble}'`) === 1, r);

r = await recevoir({ de: "inconnu@lot18e2e.test", objet: "Question", texte: "Bonjour" });
const [, , cl2, aq2] = ticketDe("inconnu@lot18e2e.test").split("|");
ok("Expéditeur inconnu : ticket « à qualifier », jamais rattaché", r.j.statut === "traite" && cl2 === "" && aq2 === "true", ticketDe("inconnu@lot18e2e.test"));
r = await recevoir({ de: "paulyx@lot18e2e.test", objet: "Joker", texte: "x" });
ok("« _ » n'est pas un joker : paulyx ≠ paul_x → à qualifier", ticketDe("paulyx@lot18e2e.test").split("|")[3] === "true");

// ---------- 3. Fil de conversation ----------
sql(`update public.tickets set status = 'resolu' where numero = ${num1}`);
r = await recevoir({ de: "claire@lot18e2e.test", objet: `RE: [DHB #${num1}] Imprimante en panne`, texte: "Toujours en panne." });
ok("Réponse avec [DHB #n] du même client : ajoutée au ticket, ticket rouvert", sql(`select count(*) from public.ticket_messages m join public.tickets t on t.id = m.ticket_id where t.numero = ${num1}`) === "2"
  && sql(`select status from public.tickets where numero = ${num1}`) === "ouvert", r);
r = await recevoir({ de: "pirate@lot18e2e.test", objet: `[DHB #${num1}] je veux voir ce ticket`, texte: "x" });
ok("[DHB #n] d'un autre expéditeur : NOUVEAU ticket (pas d'accès à la conversation d'autrui)", sql(`select count(*) from public.ticket_messages m join public.tickets t on t.id = m.ticket_id where t.numero = ${num1}`) === "2"
  && /ne fait pas partie de ce ticket/.test(sql(`select texte from public.ticket_messages where resend_id = '${r.id}'`)), r);
const msgId = sql(`select message_id from public.ticket_messages where resend_id = '${idDouble}'`);
r = await recevoir({ de: "claire@lot18e2e.test", objet: "Une précision", texte: "Le modèle est X.", entetes: { "in-reply-to": msgId } });
ok("Réponse sans référence mais avec In-Reply-To connu : même ticket", sql(`select count(*) from public.ticket_messages m join public.tickets t on t.id = m.ticket_id where t.numero = ${num1}`) === "3", r);

// ---------- 4. Anti-boucle et filtres ----------
r = await recevoir({ de: "absent@lot18e2e.test", objet: "Absence", texte: "Je suis absent", entetes: { "auto-submitted": "auto-replied" } });
ok("Réponse automatique (Auto-Submitted) : ignorée, aucun ticket", r.j.statut === "ignore" && sql("select count(*) from public.tickets where client_email = 'absent@lot18e2e.test'") === "0", r);
r = await recevoir({ de: "dhb@notify.test", from: "DHB <dhb@notify.test>", objet: "Boucle", texte: "x" });
ok("Email envoyé par DHB lui-même : ignoré (pas de boucle)", r.j.statut === "ignore", r);
r = await recevoir({ de: "x@lot18e2e.test", from: '"Pirate" <a,b)@evil.test>', objet: "Injection", texte: "x" });
ok("Adresse d'expéditeur malformée : ignorée", r.j.statut === "ignore" && /illisible/.test(r.j.detail), r);
r = await recevoir({ de: "html@lot18e2e.test", objet: "HTML seul", html: "<p>Bonjour <b>équipe</b></p><script>alert(1)</script><p>Merci&nbsp;!</p>" });
const txt = sql(`select texte from public.ticket_messages where resend_id = '${r.id}'`);
ok("Email HTML seul : texte lisible, script supprimé", /Bonjour/.test(txt) && /équipe/.test(txt) && /Merci !/.test(txt) && !/alert|<script|<p>/.test(txt), txt);
sql(`insert into public.ticket_messages (ticket_id, sens, de_email, texte) select t.id, 'entrant', 'rafale@lot18e2e.test', 'x' from public.tickets t, generate_series(1, 20) where t.numero = ${num1}`);
r = await recevoir({ de: "rafale@lot18e2e.test", objet: "Encore", texte: "x" });
ok("Plus de 20 emails en une heure du même expéditeur : ignoré", r.j.statut === "ignore" && /trop d'emails/.test(r.j.detail), r);

// ---------- 5. Adresses de support ----------
sql(`update public.integrations set details = '{"adresses": {"infogerance": "support@pro.lot18e2e.test", "particuliers": "aide@assistance.lot18e2e.test"}}' where cle = 'email_entrant'`);
r = await recevoir({ de: "autre@lot18e2e.test", a: ["contact@ailleurs.test"], objet: "Pas pour nous", texte: "x" });
ok("Adresses configurées : email adressé ailleurs → ignoré", r.j.statut === "ignore", r);
r = await recevoir({ de: "part@lot18e2e.test", a: ["Aide <aide@assistance.lot18e2e.test>"], objet: "Mon PC", texte: "x" });
ok("Email vers l'adresse d'Assistance : ticket du site Assistance", r.j.statut === "traite" && ticketDe("part@lot18e2e.test").split("|")[5] === "particuliers", ticketDe("part@lot18e2e.test"));
sql(`update public.integrations set details = '{"adresses": {"infogerance": "", "particuliers": ""}}' where cle = 'email_entrant'`);

// ---------- 6. Pièces jointes ----------
const pdf = Buffer.from("%PDF-1.4 contenu de test"), png = crypto.randomBytes(2048);
const pieces = [
  { id: uuid(), filename: "facture.pdf", content_type: "application/pdf", size: pdf.length, octets: pdf },
  { id: uuid(), filename: "../../etc/photo écran.png", content_type: "image/png", size: png.length, octets: png },
  { id: uuid(), filename: "virus.exe", content_type: "application/octet-stream", size: 10, octets: Buffer.from("MZ") },
  { id: uuid(), filename: "page.html", content_type: "text/html", size: 20, octets: Buffer.from("<script>x</script>") },
  { id: uuid(), filename: "enorme.zip", content_type: "application/zip", size: 11 * 1024 * 1024, octets: Buffer.from("zip") },
];
for (const p of pieces) fichiers.set(p.id, p.octets);
r = await recevoir({ de: "claire@lot18e2e.test", objet: `Re: [DHB #${num1}] pièces`, texte: "Voici les fichiers.", pieces: pieces.map(({ octets, ...p }) => p) });
const lignes = sql(`select nom || '|' || taille || '|' || chemin from public.ticket_pieces p join public.ticket_messages m on m.id = p.message_id where m.resend_id = '${r.id}' order by nom`).split("\n").filter(Boolean);
ok("PDF et image conservés (2), contenu identique dans l'espace privé", lignes.length === 2 && lignes.every((l) => stockage.has(l.split("|")[2])) && stockage.get(lignes.find((l) => l.startsWith("facture.pdf")).split("|")[2]).equals(pdf), lignes);
ok("Nom dangereux nettoyé (pas de « .. » ni de « / ») et rangé sous tickets/<ticket>/", lignes.every((l) => { const [nom, , ch] = l.split("|"); return !nom.includes("..") && !nom.includes("/") && ch.startsWith("tickets/") && !ch.includes(".."); }), lignes);
ok("Exécutable, HTML et fichier trop gros refusés et signalés dans le message",
  /Pièces jointes non conservées : .*virus\.exe \(type de fichier refusé\).*page\.html \(type de fichier refusé\).*enorme\.zip \(trop volumineux\)/s.test(sql(`select texte from public.ticket_messages where resend_id = '${r.id}'`)));

// ---------- 7. Pannes et réessais ----------
etat.resendEnPanne = true;
r = await recevoir({ de: "panne@lot18e2e.test", objet: "Pendant la panne", texte: "x" });
ok("Resend en panne : réponse « réessai », événement gardé en file (1 tentative)", r.s === 200 && r.j.statut === "reessai"
  && sql(`select statut || '|' || tentatives from public.evenements where objet_id = '${r.id}'`) === "en_attente|1", { r, ev: sql(`select statut || '|' || tentatives || '|' || erreur from public.evenements where objet_id = '${r.id}'`) });
etat.resendEnPanne = false;
sql(`update public.evenements set prochaine_tentative = now() where objet_id = '${r.id}'`);
// La file de la base de test contient d'autres événements : le robot en traite 50 par passage.
let w;
for (let i = 0; i < 10 && sql(`select statut from public.evenements where objet_id = '${r.id}'`) === "en_attente"; i++)
  w = await fetch("http://127.0.0.1:54382/", { method: "POST", headers: { "Content-Type": "application/json", "x-cron-secret": "cron-test" }, body: "{}" }).then((x) => x.json());
ok("Robot : l'email en attente est traité au passage suivant", sql(`select statut from public.evenements where objet_id = '${r.id}'`) === "traite" && ticketDe("panne@lot18e2e.test") !== "", w);
const fantome = uuid();
r = await webhook({ type: "email.received", data: { email_id: fantome } });
ok("Email introuvable chez Resend : erreur définitive (pas de réessai sans fin)", sql(`select statut from public.evenements where objet_id = '${fantome}'`) === "erreur", r);

fEntrant.kill(); fWorker.kill(); serveur.close(); nettoyer();
for (const x of res) console.log(x.ok ? "OK   " : "ÉCHEC", x.n, x.ok ? "" : JSON.stringify(x.d)?.slice(0, 400));
console.log(`${res.filter((x) => x.ok).length} / ${res.length} scénarios email → ticket conformes`);
process.exit(0);
