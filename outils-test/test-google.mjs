// Lot 10 : google-oauth, google-sync, integration-test, conversion GA4 du robot.
// Base de test réelle + PostgREST + fonctions (Deno) + faux Google.
import { spawn, execFileSync } from "node:child_process";
import crypto from "node:crypto";
import http from "node:http";

const RACINE = "C:/Users/CLAUDE/Documents/DHB-/supabase/functions/";
const JWT_SECRET = "secret-jwt-de-test-au-moins-32-caracteres";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const corpsJwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ role: "service_role", exp: Math.floor(Date.now() / 1000) + 3600 })}`;
const CLE = `${corpsJwt}.${crypto.createHmac("sha256", JWT_SECRET).update(corpsJwt).digest("base64url")}`;
const sql = (q) => execFileSync("docker", ["exec", "dhb-test-pg", "psql", "-U", "postgres", "-d", "dhb_test", "-v", "ON_ERROR_STOP=1", "-tAc", q]).toString().trim();
const CLIENT_SECRET = "secret-client-google-test";
const UTIL = { "jeton-admin": { id: "11111111-1111-1111-1111-111111111111", email: "admin@test.fr" }, "jeton-collab": { id: "22222222-2222-2222-2222-222222222222", email: "collab@test.fr" } };

// ---- Faux Google + mandataire Supabase (auth simulée, REST → PostgREST) ----
const g = { revoques: [], mp: [], mpEnPanne: false, rapports: 0 };
const LIGNES = [
  { dimensionValues: [{ value: "20261020" }, { value: "Organic Search" }], metricValues: [{ value: "40" }, { value: "35" }, { value: "2" }] },
  { dimensionValues: [{ value: "20261020" }, { value: "Direct" }], metricValues: [{ value: "12" }, { value: "11" }, { value: "0" }] },
  { dimensionValues: [{ value: "20261021" }, { value: "Organic Search" }], metricValues: [{ value: "51" }, { value: "44" }, { value: "3" }] },
];
const lire = (req) => new Promise((ok) => { let b = ""; req.on("data", (d) => (b += d)); req.on("end", () => ok(b)); });
const envoi = (res, s, o) => { res.writeHead(s, { "Content-Type": "application/json" }); res.end(o === undefined ? "" : JSON.stringify(o)); };
const serveur = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  const corps = await lire(req);
  if (u.pathname === "/auth/v1/user") { const x = UTIL[(req.headers.authorization || "").replace("Bearer ", "")]; return x ? envoi(res, 200, { id: x.id, email: x.email }) : envoi(res, 401, { message: "invalid JWT" }); }
  if (u.pathname === "/g/token") {
    const p = new URLSearchParams(corps);
    if (p.get("client_secret") !== CLIENT_SECRET) return envoi(res, 401, { error: "invalid_client" });
    if (p.get("grant_type") === "authorization_code") {
      if (p.get("code") === "bon-code") return envoi(res, 200, { access_token: "at1", refresh_token: "rt1", scope: "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/drive.file" });
      if (p.get("code") === "sans-refresh") return envoi(res, 200, { access_token: "at1", scope: "openid" });
      return envoi(res, 400, { error: "invalid_grant" });
    }
    if (p.get("grant_type") === "refresh_token") return p.get("refresh_token") === "rt1" ? envoi(res, 200, { access_token: "at2" }) : envoi(res, 400, { error: "invalid_grant" });
  }
  if (u.pathname === "/g/userinfo") return req.headers.authorization === "Bearer at1" ? envoi(res, 200, { email: "proprio@gmail.com" }) : envoi(res, 401, {});
  if (u.pathname === "/g/revoke") { g.revoques.push(u.searchParams.get("token")); return envoi(res, 200, {}); }
  const m = u.pathname.match(/^\/g\/v1beta\/properties\/(\d+):runReport$/);
  if (m) {
    g.rapports++;
    if (req.headers.authorization !== "Bearer at2") return envoi(res, 401, { error: { status: "UNAUTHENTICATED" } });
    if (m[1] !== "123456789") return envoi(res, 403, { error: { status: "PERMISSION_DENIED", message: "User does not have sufficient permissions" } });
    return envoi(res, 200, { rows: LIGNES });
  }
  if (u.pathname === "/g/mp/collect") {
    if (g.mpEnPanne) return envoi(res, 500, {});
    g.mp.push({ mesure: u.searchParams.get("measurement_id"), secret: u.searchParams.get("api_secret"), corps: JSON.parse(corps) }); res.writeHead(204); return res.end();
  }
  if (u.pathname === "/emails") return envoi(res, 200, { id: "re_x" });
  // REST → PostgREST
  const p = http.request({ host: "127.0.0.1", port: 54330, path: req.url.replace(/^\/rest\/v1/, ""), method: req.method, headers: { ...req.headers, host: "127.0.0.1:54330" } }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  p.end(corps);
});
await new Promise((ok) => serveur.listen(54322, "127.0.0.1", ok));
const ENV = {
  SUPABASE_URL: "http://127.0.0.1:54322", SUPABASE_SERVICE_ROLE_KEY: CLE, CRON_SECRET: "cron-test", ADMIN_URL: "https://admin.exemple.fr",
  GOOGLE_CLIENT_ID: "client-id-test.apps.googleusercontent.com", GOOGLE_CLIENT_SECRET: CLIENT_SECRET, GOOGLE_REDIRECT_URI: "https://projet.supabase.co/functions/v1/google-oauth",
  GOOGLE_AUTH_URL: "https://accounts.example/auth", GOOGLE_TOKEN_URL: "http://127.0.0.1:54322/g/token", GOOGLE_USERINFO_URL: "http://127.0.0.1:54322/g/userinfo",
  GOOGLE_REVOKE_URL: "http://127.0.0.1:54322/g/revoke", GA_DATA_URL: "http://127.0.0.1:54322/g", GA_MP_URL: "http://127.0.0.1:54322/g/mp/collect", GA_API_SECRET: "mp-secret-test",
  RESEND_API_KEY: "re_test", RESEND_API_URL: "http://127.0.0.1:54322",
};
const procs = [];
async function lancer(nom, port) {
  const p = spawn("node_modules/deno/deno.exe", ["run", "--allow-net", "--allow-env", "--allow-read", "lancer-fonction.ts", RACINE + nom + "/index.ts"], { env: { ...process.env, ...ENV, PORT_TEST: String(port) } });
  procs.push(p);
  let j = ""; p.stdout.on("data", (d) => (j += d)); p.stderr.on("data", (d) => (j += d));
  for (let i = 0; i < 120 && !/Listening/.test(j); i++) await new Promise((r) => setTimeout(r, 500));
  if (!/Listening/.test(j)) { console.log(j); process.exit(1); }
  return {
    post: async (corps, entetes = { Authorization: "Bearer jeton-admin" }) => { const r = await fetch(`http://127.0.0.1:${port}/`, { method: "POST", headers: { "Content-Type": "application/json", ...entetes }, body: JSON.stringify(corps) }); return { s: r.status, j: await r.json().catch(() => ({})) }; },
    get: async (qs) => { const r = await fetch(`http://127.0.0.1:${port}/?${qs}`, { redirect: "manual" }); return { s: r.status, loc: r.headers.get("location") }; },
  };
}
const etat = (u, exp) => { const c = Buffer.from(JSON.stringify({ u, exp, n: "x" })).toString("base64url"); return `${c}.${crypto.createHmac("sha256", CLIENT_SECRET).update(c).digest("base64url")}`; };

sql(`delete from public.integration_credentials; delete from public.integration_logs; delete from public.analytics_quotidien;
  update public.integrations set statut = 'non_configure', compte = null, details = '{}', erreur = null, derniere_synchro = null;
  update public.evenements set statut = 'ignore' where statut in ('en_attente','erreur');`);
const res = []; const ok = (n, c, d) => res.push({ n, ok: !!c, d });

// ================= google-oauth =================
const o = await lancer("google-oauth", 54385);
let r = await o.post({ action: "demarrer" }, {}); ok("Démarrer sans être connecté → 401", r.s === 401, r);
r = await o.post({ action: "demarrer" }, { Authorization: "Bearer jeton-collab" }); ok("Démarrer : collaborateur → 403 (administrateur uniquement)", r.s === 403 && r.j.error === "reserve_admin", r);
r = await o.post({ action: "demarrer" });
const url = r.j.url ? new URL(r.j.url) : null;
ok("Démarrer (admin) : page Google avec client, adresse de retour, accès durable et autorisations GA4 / Search Console / Drive",
  url && url.searchParams.get("client_id") === ENV.GOOGLE_CLIENT_ID && url.searchParams.get("redirect_uri") === ENV.GOOGLE_REDIRECT_URI && url.searchParams.get("access_type") === "offline"
  && ["analytics.readonly", "webmasters.readonly", "drive.file"].every((s) => url.searchParams.get("scope").includes(s)) && !!url.searchParams.get("state"), r.j);
const state = url.searchParams.get("state");
r = await o.get(`code=bon-code&state=${encodeURIComponent(state.slice(0, -2) + "xx")}`); ok("Retour avec un état falsifié → refusé", r.s === 302 && /google=erreur&raison=etat_invalide/.test(r.loc), r);
r = await o.get(`code=bon-code&state=${encodeURIComponent(etat("11111111-1111-1111-1111-111111111111", Date.now() - 1000))}`); ok("Retour avec un état expiré → refusé", /raison=etat_invalide/.test(r.loc), r);
r = await o.get(`code=bon-code&state=${encodeURIComponent(etat("22222222-2222-2222-2222-222222222222", Date.now() + 60000))}`); ok("Retour pour un collaborateur (état signé) → refusé", /raison=reserve_admin/.test(r.loc), r);
r = await o.get("error=access_denied&state=x"); ok("Connexion annulée sur la page Google → retour « refusé » et journal", /google=refuse/.test(r.loc) && sql("select count(*) from public.integration_logs where statut = 'ignore'") === "1", r);
r = await o.get(`code=sans-refresh&state=${encodeURIComponent(state)}`); ok("Google sans accès durable → message explicite, rien enregistré", /raison=sans_acces_durable/.test(r.loc) && sql("select count(*) from public.integration_credentials") === "0", r);
sql("revoke insert, update on public.integration_credentials from service_role");
r = await o.get(`code=bon-code&state=${encodeURIComponent(state)}`);
ok("Jeton non enregistrable → erreur signalée, statut PAS « connecté »", /raison=enregistrement_impossible/.test(r.loc) && sql("select statut from public.integrations where cle = 'google'") === "non_configure", r);
sql("grant insert, update on public.integration_credentials to service_role");
r = await o.get(`code=bon-code&state=${encodeURIComponent(state)}`);
ok("Connexion réussie → retour vers Système → Intégrations", r.s === 302 && r.loc === "https://admin.exemple.fr/systeme/integrations?google=connecte", r);
ok("Jeton rangé côté serveur, compte et statut enregistrés", sql("select refresh_token from public.integration_credentials where cle = 'google'") === "rt1"
  && sql("select statut || '|' || compte || '|' || coalesce(erreur, '∅') from public.integrations where cle = 'google'") === "connecte|proprio@gmail.com|∅");

// ================= integration-test =================
const t = await lancer("integration-test", 54384);
r = await t.post({});
ok("État : secrets définis signalés, aucune valeur renvoyée", r.s === 200 && r.j.secrets.google === true && r.j.secrets.ga4_conversions === true && r.j.secrets.emails === true && !JSON.stringify(r.j).includes(CLIENT_SECRET) && !JSON.stringify(r.j).includes("mp-secret-test") && !JSON.stringify(r.j).includes("rt1"), r.j);
r = await t.post({ tester: "google" }); ok("Tester l'accès Google → valide", r.j.google?.ok === true, r.j);
r = await t.post({}, {}); ok("État : non connecté → 401", r.s === 401);

// ================= google-sync =================
const s = await lancer("google-sync", 54383);
r = await s.post({}, { "x-cron-secret": "cron-test" }); ok("Copie sans propriété GA4 → 409 explicite", r.s === 409 && r.j.error === "ga4_propriete_manquante", r);
sql(`update public.integrations set details = '{"ga4_property_id":"123456789","ga4_measurement_id":"G-TEST12345"}' where cle = 'ga4'`);
r = await s.post({}, { "x-cron-secret": "cron-test" });
ok("Copie planifiée : 3 lignes (jour × canal) enregistrées", r.s === 200 && r.j.lignes === 3 && sql("select sum(sessions) || '/' || sum(utilisateurs) || '/' || sum(conversions) from public.analytics_quotidien") === "103/90/5", r.j);
ok("Copie : statut GA4 connecté, date de dernière copie, journal", sql("select statut || '|' || (derniere_synchro is not null)::text from public.integrations where cle = 'ga4'") === "connecte|true" && sql("select count(*) from public.integration_logs where cle = 'ga4' and action = 'synchro' and statut = 'ok'") === "1");
LIGNES[0].metricValues[0].value = "45";
r = await s.post({});
ok("2e copie (bouton, admin) : mise à jour sans doublon", r.s === 200 && sql("select count(*) || '/' || sum(sessions) from public.analytics_quotidien") === "3/108", r.j);
sql(`update public.integrations set details = '{"ga4_property_id":"999999999","ga4_measurement_id":"G-TEST12345"}' where cle = 'ga4'`);
r = await s.post({}, { "x-cron-secret": "cron-test" });
ok("Propriété non accessible → erreur claire, chiffres conservés", r.s === 502 && /refuse la demande \(permission_denied\)/.test(sql("select erreur from public.integrations where cle = 'ga4'")) && sql("select count(*) from public.analytics_quotidien") === "3", r);
sql(`update public.integrations set details = '{"ga4_property_id":"123456789","ga4_measurement_id":"G-TEST12345"}' where cle = 'ga4'`);
r = await s.post({}, {}); ok("Copie sans secret ni compte → 401", r.s === 401);

// ================= conversion GA4 par le robot =================
const w = await lancer("worker", 54382);
sql(`delete from public.leads where nom like 'G10%';
  insert into public.leads (entity, nom, email, ga_client_id, landing_page) values ('infogerance', 'G10 Avec GA', 'a@g10.fr', '1234567890.1700000000', '/');
  insert into public.leads (entity, nom, email) values ('infogerance', 'G10 Sans GA', 'b@g10.fr');`);
sql("update public.leads set status = 'gagne' where nom like 'G10%'");
r = await w.post({}, { "x-cron-secret": "cron-test" });
ok("Demande gagnée avec identifiant GA4 → conversion close_convert_lead envoyée", g.mp.length === 1 && g.mp[0].mesure === "G-TEST12345" && g.mp[0].secret === "mp-secret-test"
  && g.mp[0].corps.client_id === "1234567890.1700000000" && g.mp[0].corps.events[0].name === "close_convert_lead" && g.mp[0].corps.events[0].params.lead_source === "direct", g.mp);
ok("Demande gagnée sans identifiant GA4 (pas de consentement) → rien envoyé, événement terminé", sql("select string_agg(e.statut, ',' order by l.nom) from public.evenements e join public.leads l on l.id = e.objet_id where l.nom like 'G10%' and e.type = 'lead_gagne'") === "traite,traite");
g.mpEnPanne = true;
sql("update public.leads set status = 'contacte' where nom = 'G10 Avec GA'"); sql("update public.leads set status = 'gagne' where nom = 'G10 Avec GA'");
r = await w.post({}, { "x-cron-secret": "cron-test" });
ok("GA4 injoignable → conversion réessayée plus tard (1 tentative)", sql("select e.statut || '|' || e.tentatives from public.evenements e join public.leads l on l.id = e.objet_id where l.nom = 'G10 Avec GA' and e.type = 'lead_gagne' order by e.created_at desc limit 1") === "en_attente|1", r.j);
g.mpEnPanne = false;

// ================= Accès retiré puis déconnexion =================
sql("update public.integration_credentials set refresh_token = 'revoque'");
r = await s.post({});
ok("Accès retiré côté Google → statut erreur « reconnectez » sur Google et GA4", r.s === 409 && r.j.error === "google_acces_expire" && /reconnectez le compte Google/.test(sql("select erreur from public.integrations where cle = 'google'")), r);
sql("update public.integration_credentials set refresh_token = 'rt1'");
r = await o.post({ action: "deconnecter" }, { Authorization: "Bearer jeton-collab" }); ok("Déconnecter : collaborateur → 403", r.s === 403);
r = await o.post({ action: "deconnecter" });
ok("Déconnecter (admin) : accès révoqué chez Google, jeton supprimé, statut remis à zéro", r.s === 200 && g.revoques.includes("rt1") && sql("select count(*) from public.integration_credentials") === "0" && sql("select statut || coalesce(compte, '∅') from public.integrations where cle = 'google'") === "non_configure∅", r);

procs.forEach((p) => p.kill()); serveur.close();
sql("delete from public.leads where nom like 'G10%'; delete from public.analytics_quotidien; update public.integrations set statut = 'non_configure', compte = null, details = '{}', erreur = null, derniere_synchro = null;");
for (const x of res) console.log(x.ok ? "OK   " : "ÉCHEC", x.n, x.ok ? "" : JSON.stringify(x.d)?.slice(0, 400));
console.log(`${res.filter((x) => x.ok).length} / ${res.length} scénarios Google conformes`);
process.exit(0);
