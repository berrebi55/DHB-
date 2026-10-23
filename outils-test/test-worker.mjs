// Bout en bout : base de test (déclencheurs réels) + PostgREST + worker (Deno) + faux Resend.
import { spawn, execFileSync } from "node:child_process";
import crypto from "node:crypto";
import http from "node:http";

const RACINE = "C:/Users/CLAUDE/Documents/DHB-/supabase/functions/";
const JWT_SECRET = "secret-jwt-de-test-au-moins-32-caracteres";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const corpsJwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ role: "service_role", exp: Math.floor(Date.now() / 1000) + 3600 })}`;
const CLE = `${corpsJwt}.${crypto.createHmac("sha256", JWT_SECRET).update(corpsJwt).digest("base64url")}`;
const sql = (q) => execFileSync("docker", ["exec", "dhb-test-pg", "psql", "-U", "postgres", "-d", "dhb_test", "-v", "ON_ERROR_STOP=1", "-tAc", q]).toString().trim();

const resend = []; let resendEnPanne = false;
const proxy = http.createServer((req, res) => {
  if (req.url === "/emails") {
    let b = ""; req.on("data", (d) => (b += d)); req.on("end", () => {
      if (resendEnPanne) { res.writeHead(500, { "Content-Type": "application/json" }); return res.end('{"message":"Service Resend indisponible"}'); }
      resend.push(JSON.parse(b)); res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ id: `re_${resend.length}` }));
    });
    return;
  }
  const p = http.request({ host: "127.0.0.1", port: 54330, path: req.url.replace(/^\/rest\/v1/, ""), method: req.method, headers: { ...req.headers, host: "127.0.0.1:54330" } }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  req.pipe(p);
});
await new Promise((ok) => proxy.listen(54322, "127.0.0.1", ok));

async function lancer(nom, port) {
  const p = spawn("node_modules/deno/deno.exe", ["run", "--allow-net", "--allow-env", "--allow-read", "lancer-fonction.ts", RACINE + nom + "/index.ts"], {
    env: { ...process.env, SUPABASE_URL: "http://127.0.0.1:54322", SUPABASE_SERVICE_ROLE_KEY: CLE, RESEND_API_URL: "http://127.0.0.1:54322", RESEND_API_KEY: "re_test", CRON_SECRET: "cron-test", PORT_TEST: String(port) },
  });
  let j = ""; p.stdout.on("data", (d) => (j += d)); p.stderr.on("data", (d) => (j += d));
  for (let i = 0; i < 120 && !/Listening/.test(j); i++) await new Promise((r) => setTimeout(r, 500));
  if (!/Listening/.test(j)) { console.log(j); process.exit(1); }
  return { p, appel: async (entetes = { "x-cron-secret": "cron-test" }) => {
    const r = await fetch(`http://127.0.0.1:${port}/`, { method: "POST", headers: { "Content-Type": "application/json", ...entetes }, body: "{}" });
    return { s: r.status, j: await r.json().catch(() => ({})) };
  } };
}

const nettoyer = () => sql(`set session_replication_role = replica;
  delete from public.automatisation_runs where objet_id in (select id from public.clients where nom like 'W9%') or objet_id in (select id from public.devis where client_nom like 'W9%')
    or objet_id in (select id from public.factures where client_nom like 'W9%') or objet_id in (select id from public.tickets where sujet like 'W9%');
  delete from public.emails where destinataire like '%@w9.fr';
  delete from public.evenements where objet_id in (select id from public.clients where nom like 'W9%') or objet_id in (select id from public.tickets where sujet like 'W9%')
    or objet_id in (select id from public.devis where client_nom like 'W9%') or objet_id in (select id from public.factures where client_nom like 'W9%');
  delete from public.factures where client_nom like 'W9%'; delete from public.devis where client_nom like 'W9%';
  delete from public.tickets where sujet like 'W9%'; delete from public.clients where nom like 'W9%';
  set session_replication_role = origin;
  update public.automatisations set actif = (cle in ('relance_devis','rappel_facture')), delai_jours = case cle when 'relance_devis' then 5 when 'rappel_facture' then 7 else 0 end;
  update public.entreprise set raison_sociale = 'DHB Test', telephone = '01 00 00 00 00', email = 'contact@exemple.fr' where id = 1;`);
nettoyer();
// Les autres événements de la base de test (tests précédents) sont mis de côté pour ce test.
sql("update public.evenements set statut = 'ignore' where statut in ('en_attente','erreur')");

const res = []; const ok = (n, c, d) => res.push({ n, ok: !!c, d });
const C1 = "c9c9c9c9-0000-4000-8000-000000000001";
sql(`insert into public.clients (id, nom, entreprise, email) values ('${C1}', 'W9 Claire', 'W9 Cabinet', 'claire@w9.fr');
  insert into public.devis (id, numero, client_id, client_nom, client_email, statut, envoye_at, total_ttc, date_devis) values
    ('c9c9c9c9-0000-4000-8000-0000000000d1', 'W9-DEV-1', '${C1}', 'W9 Cabinet', 'claire@w9.fr', 'envoye', now() - interval '6 days', 450, current_date - 6),
    ('c9c9c9c9-0000-4000-8000-0000000000d2', 'W9-DEV-2', '${C1}', 'W9 Cabinet', 'claire@w9.fr', 'envoye', now() - interval '2 days', 300, current_date - 2);
  insert into public.factures (id, numero, client_id, client_nom, client_email, status, date_facture, date_echeance, total_ht, total_ttc) values
    ('c9c9c9c9-0000-4000-8000-0000000000f1', 'W9-FAC-1', '${C1}', 'W9 Cabinet', 'claire@w9.fr', 'envoyee', current_date - 40, current_date - 10, 200, 200),
    ('c9c9c9c9-0000-4000-8000-0000000000f2', 'W9-FAC-2', '${C1}', 'W9 Cabinet', 'claire@w9.fr', 'envoyee', current_date - 33, current_date - 3, 100, 100);
  insert into public.tickets (id, sujet, client_id, status) values ('c9c9c9c9-0000-4000-8000-0000000000e1', 'W9 Imprimante', '${C1}', 'en_cours');
  update public.tickets set status = 'resolu' where id = 'c9c9c9c9-0000-4000-8000-0000000000e1';`);

const w = await lancer("worker", 54388);
let r = await w.appel({}); ok("Sans secret ni compte → 401", r.s === 401, r);
r = await w.appel();
ok("1er passage : événements des règles inactives ignorés (client créé, ticket résolu, devis, factures)", r.s === 200 && r.j.file.ignores >= 2 && sql(`select count(*) from public.evenements where objet_id in ('${C1}','c9c9c9c9-0000-4000-8000-0000000000e1') and statut = 'ignore'`) === "2", r.j);
ok("Relance de devis : seul le devis envoyé il y a 6 jours (délai 5 j)", r.j.quotidien.relancesDevis === 1 && sql("select count(*) from public.emails where origine = 'automatisation' and modele_cle = 'relance_devis' and devis_id = 'c9c9c9c9-0000-4000-8000-0000000000d1'") === "1" && sql("select count(*) from public.emails where devis_id = 'c9c9c9c9-0000-4000-8000-0000000000d2'") === "0", r.j);
ok("Rappel de facture : seule la facture en retard de 10 jours (délai 7 j)", r.j.quotidien.relancesFactures === 1 && sql("select count(*) from public.emails where modele_cle = 'rappel_facture' and facture_id = 'c9c9c9c9-0000-4000-8000-0000000000f1'") === "1" && sql("select count(*) from public.emails where facture_id = 'c9c9c9c9-0000-4000-8000-0000000000f2'") === "0", r.j);
const rappel = resend.find((m) => /W9-FAC-1/.test(m.subject));
ok("Rappel : texte du modèle rempli (numéro, reste, échéance, signature)", rappel && /Rappel — facture W9-FAC-1 — DHB Test/.test(rappel.subject) && /200,00/.test(rappel.html) && /DHB Test<br>01 00 00 00 00/.test(rappel.html) && rappel.to[0] === "claire@w9.fr", rappel?.subject);
ok("Dates de dernière relance mises à jour, exécutions journalisées", sql("select count(*) from public.devis where id = 'c9c9c9c9-0000-4000-8000-0000000000d1' and derniere_relance_le = current_date") === "1"
  && sql("select count(*) from public.automatisation_runs where statut = 'envoye' and objet_id in ('c9c9c9c9-0000-4000-8000-0000000000d1','c9c9c9c9-0000-4000-8000-0000000000f1')") === "2");
const n1 = resend.length;
r = await w.appel();
ok("2e passage aussitôt : aucune relance en double (7 jours minimum)", r.j.quotidien.relancesDevis === 0 && r.j.quotidien.relancesFactures === 0 && resend.length === n1, r.j);

// Règles activées
sql("update public.automatisations set actif = true where cle in ('bienvenue','ticket_resolu')");
const C2 = "c9c9c9c9-0000-4000-8000-000000000002";
sql(`insert into public.clients (id, nom, email) values ('${C2}', 'W9 Paul', 'paul@w9.fr');
  insert into public.tickets (id, sujet, client_id, status) values ('c9c9c9c9-0000-4000-8000-0000000000e2', 'W9 Wi-Fi', '${C2}', 'en_cours');
  update public.tickets set status = 'resolu' where id = 'c9c9c9c9-0000-4000-8000-0000000000e2';`);
r = await w.appel();
ok("Bienvenue : envoyé au nouveau client", resend.some((m) => m.to[0] === "paul@w9.fr" && /Bienvenue — DHB Test/.test(m.subject)), r.j);
ok("Ticket résolu : email avec le sujet du ticket", resend.some((m) => m.to[0] === "paul@w9.fr" && /W9 Wi-Fi/.test(m.subject)));
ok("Événements traités", sql(`select string_agg(statut, ',' order by type) from public.evenements where objet_id in ('${C2}','c9c9c9c9-0000-4000-8000-0000000000e2')`) === "traite,traite");
sql(`insert into public.evenements (type, objet_type, objet_id) values ('client_cree', 'client', '${C2}')`);
const n2 = resend.length;
r = await w.appel();
ok("« Une seule fois » : un 2e événement pour le même client n'envoie rien", resend.length === n2 && sql(`select count(*) from public.automatisation_runs where automatisation_cle = 'bienvenue' and objet_id = '${C2}' and statut = 'envoye'`) === "1", r.j);
const C3 = "c9c9c9c9-0000-4000-8000-000000000003";
sql(`insert into public.clients (id, nom) values ('${C3}', 'W9 Sans email')`);
r = await w.appel();
ok("Client sans email : ignoré avec la raison", sql(`select statut || '|' || detail from public.automatisation_runs where objet_id = '${C3}'`) === "ignore|Pas d'email sur la fiche");

// Délai sur une règle d'événement
sql("update public.automatisations set delai_jours = 2 where cle = 'bienvenue'");
const C4 = "c9c9c9c9-0000-4000-8000-000000000004";
sql(`insert into public.clients (id, nom, email) values ('${C4}', 'W9 Plus tard', 'tard@w9.fr')`);
r = await w.appel();
ok("Délai de 2 jours : événement reporté, rien envoyé", !resend.some((m) => m.to[0] === "tard@w9.fr") && sql(`select statut || '|' || (prochaine_tentative > now() + interval '47 hours')::text from public.evenements where objet_id = '${C4}'`) === "en_attente|true", r.j);
sql("update public.automatisations set delai_jours = 0 where cle = 'bienvenue'");
sql(`update public.evenements set prochaine_tentative = now(), created_at = now() - interval '3 days' where objet_id = '${C4}'`);
r = await w.appel();
ok("Délai écoulé : email envoyé", resend.some((m) => m.to[0] === "tard@w9.fr"));

// Panne d'envoi : nouvelles tentatives puis erreur
resendEnPanne = true;
const C5 = "c9c9c9c9-0000-4000-8000-000000000005";
sql(`insert into public.clients (id, nom, email) values ('${C5}', 'W9 Panne', 'panne@w9.fr')`);
r = await w.appel();
ok("Envoi en panne : événement gardé, 1 tentative, prochain essai dans ~5 min, erreur lisible", sql(`select statut || '|' || tentatives || '|' || (prochaine_tentative between now() + interval '4 minutes' and now() + interval '6 minutes')::text || '|' || erreur from public.evenements where objet_id = '${C5}'`) === "en_attente|1|true|Envoi impossible : Service Resend indisponible", r.j);
for (let i = 0; i < 4; i++) { sql(`update public.evenements set prochaine_tentative = now() where objet_id = '${C5}' and statut = 'en_attente'`); await w.appel(); }
ok("Après 5 tentatives : statut « erreur » (réessai possible par un admin)", sql(`select statut || '|' || tentatives from public.evenements where objet_id = '${C5}'`) === "erreur|5");
ok("Le CRM n'est pas bloqué : la fiche client existe et chaque échec est dans l'historique des emails", sql(`select count(*) from public.clients where id = '${C5}'`) === "1" && sql("select count(*) from public.emails where destinataire = 'panne@w9.fr' and statut = 'echec'") === "5");
resendEnPanne = false;
sql(`update public.evenements set statut = 'en_attente', tentatives = 0, prochaine_tentative = now(), erreur = null where objet_id = '${C5}'`);
r = await w.appel();
ok("Réessai après rétablissement : envoyé, événement traité", resend.some((m) => m.to[0] === "panne@w9.fr") && sql(`select statut from public.evenements where objet_id = '${C5}'`) === "traite");

// Deux robots en même temps sur le même événement : un seul email
const C6 = "c9c9c9c9-0000-4000-8000-000000000006";
sql(`insert into public.clients (id, nom, email) values ('${C6}', 'W9 Double', 'double@w9.fr')`);
const w2 = await lancer("worker", 54387);
await Promise.all([w.appel(), w2.appel()]);
ok("Deux robots simultanés : un seul email de bienvenue", resend.filter((m) => m.to[0] === "double@w9.fr").length === 1, resend.filter((m) => m.to[0] === "double@w9.fr").length);
w2.p.kill();

// Règle désactivée et send-reminders conservée
sql("update public.automatisations set actif = false where cle = 'relance_devis'");
sql("update public.devis set derniere_relance_le = null where client_nom like 'W9%'");
const sr = await lancer("send-reminders", 54386);
r = await sr.appel();
ok("send-reminders (ancienne planification) : même moteur, règle désactivée respectée", r.s === 200 && r.j.relancesDevis === 0 && "relancesFactures" in r.j, r.j);
sr.p.kill();

w.p.kill(); proxy.close();
nettoyer();
for (const x of res) console.log(x.ok ? "OK   " : "ÉCHEC", x.n, x.ok ? "" : JSON.stringify(x.d)?.slice(0, 300));
console.log(`${res.filter((x) => x.ok).length} / ${res.length} scénarios automatisations conformes`);
process.exit(0);
