// Lot 12 : seo-sync de bout en bout (base réelle + PostgREST + Deno + faux Search Console).
import { spawn, execFileSync } from "node:child_process";
import crypto from "node:crypto";
import http from "node:http";

const JWT_SECRET = "secret-jwt-de-test-au-moins-32-caracteres";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const corpsJwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ role: "service_role", exp: Math.floor(Date.now() / 1000) + 3600 })}`;
const CLE = `${corpsJwt}.${crypto.createHmac("sha256", JWT_SECRET).update(corpsJwt).digest("base64url")}`;
const sql = (q) => execFileSync("docker", ["exec", "dhb-test-pg", "psql", "-U", "postgres", "-d", "dhb_test", "-v", "ON_ERROR_STOP=1", "-tAc", q]).toString().trim();
const jourMoins = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

const demandes = []; let nbRequetes = 3;
const lire = (req) => new Promise((ok) => { let b = ""; req.on("data", (d) => (b += d)); req.on("end", () => ok(b)); });
const envoi = (res, s, o) => { res.writeHead(s, { "Content-Type": "application/json" }); res.end(o === undefined ? "" : JSON.stringify(o)); };
const serveur = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x"); const corps = await lire(req);
  if (u.pathname === "/auth/v1/user") return req.headers.authorization === "Bearer jeton-admin" ? envoi(res, 200, { id: "11111111-1111-1111-1111-111111111111", email: "admin@test.fr" }) : envoi(res, 401, {});
  if (u.pathname === "/g/token") return envoi(res, 200, { access_token: "at-sc" });
  const m = u.pathname.match(/^\/webmasters\/v3\/sites\/(.+)\/searchAnalytics\/query$/);
  if (m) {
    const site = decodeURIComponent(m[1]); const c = JSON.parse(corps); demandes.push({ site, ...c });
    if (req.headers.authorization !== "Bearer at-sc") return envoi(res, 401, {});
    if (site === "https://refuse.example/") return envoi(res, 403, { error: { status: "PERMISSION_DENIED" } });
    if (site === "sc-domain:inconnu.example") return envoi(res, 404, { error: { status: "NOT_FOUND" } });
    const dim = c.dimensions[0];
    if (dim === "date") return envoi(res, 200, { rows: [3, 4, 5].map((j, i) => ({ keys: [jourMoins(j)], clicks: 10 + i, impressions: 200 + i * 10, ctr: 0.05, position: 7.456 })) });
    if (dim === "query") return envoi(res, 200, { rows: Array.from({ length: nbRequetes }, (_, i) => ({ keys: [["dépannage informatique saint-denis", "infogérance pme", "maintenance parc informatique"][i] ?? `req ${i}`], clicks: 5 - i, impressions: 60, ctr: 0.08, position: 4.2 })) });
    if (dim === "page") return envoi(res, 200, { rows: [{ keys: ["https://pro.dhb-test.fr/"], clicks: 9, impressions: 150, ctr: 0.06, position: 5.5 }] });
  }
  const p = http.request({ host: "127.0.0.1", port: 54330, path: req.url.replace(/^\/rest\/v1/, ""), method: req.method, headers: { ...req.headers, host: "127.0.0.1:54330" } }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  p.end(corps);
});
await new Promise((ok) => serveur.listen(54322, "127.0.0.1", ok));
const p = spawn("node_modules/deno/deno.exe", ["run", "--allow-net", "--allow-env", "--allow-read", "lancer-fonction.ts", "C:/Users/CLAUDE/Documents/DHB-/supabase/functions/seo-sync/index.ts"], {
  env: { ...process.env, SUPABASE_URL: "http://127.0.0.1:54322", SUPABASE_SERVICE_ROLE_KEY: CLE, CRON_SECRET: "cron-test", GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "s", GOOGLE_REDIRECT_URI: "https://x/y", GOOGLE_TOKEN_URL: "http://127.0.0.1:54322/g/token", SC_API_URL: "http://127.0.0.1:54322", PORT_TEST: "54379" },
});
let j = ""; p.stdout.on("data", (d) => (j += d)); p.stderr.on("data", (d) => (j += d));
for (let i = 0; i < 120 && !/Listening/.test(j); i++) await new Promise((r) => setTimeout(r, 500));
const appel = async (entetes = { "x-cron-secret": "cron-test" }) => { const r = await fetch("http://127.0.0.1:54379/", { method: "POST", headers: { "Content-Type": "application/json", ...entetes }, body: "{}" }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const nettoyer = () => sql(`delete from public.seo_quotidien; delete from public.seo_requetes; delete from public.seo_pages; delete from public.integration_credentials; delete from public.integration_logs where cle = 'search_console';
  update public.integrations set details = '{}', statut = 'non_configure', erreur = null, derniere_synchro = null where cle = 'search_console';`);
nettoyer();
const res = []; const ok = (n, c, d) => res.push({ n, ok: !!c, d });

let r = await appel({}); ok("Sans secret ni compte → 401", r.s === 401);
r = await appel(); ok("Aucune propriété déclarée → 409 explicite", r.s === 409 && r.j.error === "search_console_aucune_propriete", r);
sql(`update public.integrations set details = '{"sites": ["sc-domain:dhb-test.fr"]}' where cle = 'search_console'`);
r = await appel(); ok("Compte Google non connecté → 409", r.s === 409 && r.j.error === "google_non_connecte", r);
sql("insert into public.integration_credentials (cle, refresh_token) values ('google', 'rt-test')");
r = await appel({ Authorization: "Bearer jeton-admin" });
ok("Copie (bouton) : 3 jours, 3 requêtes, 1 page", r.s === 200 && r.j.sites[0].jours === 3 && r.j.sites[0].requetes === 3 && r.j.sites[0].pages === 1, r.j);
const d0 = demandes.find((x) => x.dimensions[0] === "date");
ok("Période demandée : 30 jours jusqu'à J-2 (décalage de Google)", d0.endDate === jourMoins(2) && d0.startDate === jourMoins(31), d0);
ok("Tops sur 28 jours, 100 lignes au plus", demandes.filter((x) => x.dimensions[0] !== "date").every((x) => x.startDate === jourMoins(29) && x.rowLimit === 100));
ok("Chiffres enregistrés (clics, impressions, position arrondie)", sql("select sum(clics) || '/' || sum(impressions) || '/' || max(position) from public.seo_quotidien where site = 'sc-domain:dhb-test.fr'") === "33/630/7.46");
ok("Requêtes avec accents conservées", sql("select requete from public.seo_requetes where clics = 5") === "dépannage informatique saint-denis");
ok("Statut connecté, dernière copie, journal", sql("select statut || '|' || (derniere_synchro is not null)::text from public.integrations where cle = 'search_console'") === "connecte|true" && sql("select count(*) from public.integration_logs where cle = 'search_console' and statut = 'ok'") === "1");
nbRequetes = 1;
r = await appel();
ok("2e copie : jours mis à jour sans doublon, top des requêtes remplacé", sql("select count(*) from public.seo_quotidien") === "3" && sql("select count(*) from public.seo_requetes") === "1", r.j);
sql(`update public.integrations set details = '{"sites": ["sc-domain:dhb-test.fr", "https://refuse.example/", "sc-domain:inconnu.example"]}' where cle = 'search_console'`);
r = await appel();
ok("Plusieurs propriétés : la bonne est copiée, les autres expliquées", r.s === 200 && r.j.sites.filter((x) => x.erreur).length === 2
  && /n'a pas accès à cette propriété/.test(sql("select erreur from public.integrations where cle = 'search_console'")) && /vérifiez l'adresse exacte/.test(sql("select erreur from public.integrations where cle = 'search_console'")), r.j);
sql(`update public.integrations set details = '{"sites": ["https://refuse.example/"]}' where cle = 'search_console'`);
r = await appel();
ok("Toutes en erreur → 502, statut erreur, chiffres déjà copiés conservés", r.s === 502 && sql("select statut from public.integrations where cle = 'search_console'") === "erreur" && sql("select count(*) from public.seo_quotidien") === "3", r);

p.kill(); serveur.close(); nettoyer();
for (const x of res) console.log(x.ok ? "OK   " : "ÉCHEC", x.n, x.ok ? "" : JSON.stringify(x.d)?.slice(0, 400));
console.log(`${res.filter((x) => x.ok).length} / ${res.length} scénarios Search Console conformes`);
process.exit(0);
