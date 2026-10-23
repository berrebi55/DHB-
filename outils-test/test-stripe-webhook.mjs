// Bout en bout : événement Stripe signé → stripe-webhook (Deno) → PostgREST → base de test.
import { spawn, execFileSync } from "node:child_process";
import crypto from "node:crypto";
import http from "node:http";

const FONCTION = "C:/Users/CLAUDE/Documents/DHB-/supabase/functions/stripe-webhook/index.ts";
const SECRET = "whsec_test_lot7_secret";
const JWT_SECRET = "secret-jwt-de-test-au-moins-32-caracteres";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const corpsJwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ role: "service_role", exp: Math.floor(Date.now() / 1000) + 3600 })}`;
const CLE_SERVEUR = `${corpsJwt}.${crypto.createHmac("sha256", JWT_SECRET).update(corpsJwt).digest("base64url")}`;
const sql = (q) => execFileSync("docker", ["exec", "dhb-test-pg", "psql", "-U", "postgres", "-d", "dhb_test", "-tAc", q]).toString().trim();

// Mandataire : /rest/v1/* (adresse Supabase) → PostgREST.
const proxy = http.createServer((req, res) => {
  const cible = req.url.replace(/^\/rest\/v1/, "");
  const p = http.request({ host: "127.0.0.1", port: 54330, path: cible, method: req.method, headers: { ...req.headers, host: "127.0.0.1:54330" } }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  req.pipe(p);
});
await new Promise((ok) => proxy.listen(54322, "127.0.0.1", ok));

const deno = spawn("node_modules/deno/deno.exe", ["run", "--allow-net", "--allow-env", "--allow-read", "lancer-fonction.ts", FONCTION], {
  env: { ...process.env, SUPABASE_URL: "http://127.0.0.1:54322", SUPABASE_SERVICE_ROLE_KEY: CLE_SERVEUR, STRIPE_WEBHOOK_SECRET: SECRET, PORT_TEST: "54398", STRIPE_SECRET_KEY: "" },
});
let journal = ""; deno.stdout.on("data", (d) => (journal += d)); deno.stderr.on("data", (d) => (journal += d));
for (let i = 0; i < 120 && !/Listening/.test(journal); i++) await new Promise((r) => setTimeout(r, 500));
if (!/Listening/.test(journal)) { console.log(journal); process.exit(1); }

const nettoyer = () => sql(`set session_replication_role = replica;
  delete from public.paiements where reference like '%lot7e2e%';
  delete from public.factures where client_email like '%@e2e-lot7.fr';
  delete from public.abonnements where stripe_subscription_id like 'sub_lot7e2e%';
  delete from public.clients where email like '%@e2e-lot7.fr';
  delete from public.stripe_evenements where id like 'evt_lot7e2e%';`);
nettoyer();

const res = []; const ok = (n, c, d) => res.push({ n, ok: !!c, d });
const signer = (corps, { secret = SECRET, t = Math.floor(Date.now() / 1000) } = {}) => `t=${t},v1=${crypto.createHmac("sha256", secret).update(`${t}.${corps}`).digest("hex")}`;
async function envoyer(evt, opts = {}) {
  const corps = typeof evt === "string" ? evt : JSON.stringify(evt);
  const h = { "Content-Type": "application/json" };
  if (opts.signature !== null) h["Stripe-Signature"] = opts.signature ?? signer(opts.corpsSigne ?? corps, opts);
  const r = await fetch("http://127.0.0.1:54398/", { method: opts.methode ?? "POST", headers: h, body: opts.methode === "GET" ? undefined : corps });
  return { s: r.status, j: await r.json().catch(() => ({})) };
}
const evt = (id, type, objet) => ({ id: `evt_lot7e2e_${id}`, type, created: Math.floor(Date.now() / 1000), data: { object: objet } });
const session = (extra) => ({ id: "cs_test_lot7e2e", object: "checkout.session", payment_status: "paid", currency: "eur", mode: "payment", amount_total: 5900,
  payment_intent: "pi_lot7e2e_1", customer: "cus_lot7e2e", customer_details: { email: "Marie@E2E-Lot7.fr", name: "Marie Test", phone: "+33600000000", address: { line1: "2 rue du Test", postal_code: "93400", city: "Saint-Ouen" } }, ...extra });

// Sécurité de l'entrée
let r = await envoyer({}, { methode: "GET" }); ok("GET → 405", r.s === 405, r);
r = await envoyer(evt("a", "checkout.session.completed", session()), { signature: null }); ok("Sans signature → 400", r.s === 400 && r.j.error === "signature_invalide", r);
r = await envoyer(evt("a", "checkout.session.completed", session()), { secret: "whsec_mauvais" }); ok("Mauvais secret → 400", r.s === 400, r);
r = await envoyer(evt("a", "checkout.session.completed", session()), { t: Math.floor(Date.now() / 1000) - 900 }); ok("Signature vieille de 15 min → 400 (rejeu)", r.s === 400, r);
r = await envoyer(evt("a", "checkout.session.completed", session({ amount_total: 1 })), { corpsSigne: JSON.stringify(evt("a", "checkout.session.completed", session())) });
ok("Contenu modifié après signature → 400", r.s === 400, r);
r = await envoyer("{pas du json"); ok("JSON invalide (signé) → 400", r.s === 400 && r.j.error === "json_invalide", r);
r = await envoyer({ id: "pas_un_evt", type: "x" }); ok("Identifiant d'événement invalide → 400", r.s === 400, r);
ok("Aucune donnée écrite par les appels refusés", sql("select count(*) from public.stripe_evenements where id like 'evt_lot7e2e%'") === "0");

// Paiement ponctuel
r = await envoyer(evt("1", "checkout.session.completed", session()));
ok("Paiement ponctuel → 200 traité", r.s === 200 && r.j.resultat === "traite", r);
ok("Facture payée de 59 € au nom de Marie Test, adresse reprise", sql("select status || '/' || total_ttc::int || '/' || client_nom || '/' || client_adresse from public.factures where client_email = 'marie@e2e-lot7.fr'") === "payee/59/Marie Test/2 rue du Test, 93400 Saint-Ouen");
ok("Libellé par défaut (clé Stripe absente)", sql("select libelle from public.factures where client_email = 'marie@e2e-lot7.fr'") === "Intervention (paiement en ligne)");
ok("Paiement « stripe » référencé par le payment_intent", sql("select count(*) from public.paiements where reference = 'pi_lot7e2e_1' and moyen = 'stripe'") === "1");
r = await envoyer(evt("1", "checkout.session.completed", session())); ok("Même événement renvoyé → 200 déjà traité", r.s === 200 && r.j.resultat === "deja_traite", r);
ok("Toujours une seule facture", sql("select count(*) from public.factures where client_email = 'marie@e2e-lot7.fr'") === "1");

// Abonnement : session + invoice.paid du même 1er paiement → une seule facture ; puis renouvellement
const subSession = session({ id: "cs_test_lot7e2e_sub", mode: "subscription", amount_total: 1490, payment_intent: null, invoice: "in_lot7e2e_1", subscription: "sub_lot7e2e_A", customer_details: { email: "paul@e2e-lot7.fr", name: "Paul Abonné", address: {} } });
r = await envoyer(evt("2", "checkout.session.completed", subSession)); ok("Abonnement : 1er paiement → traité", r.s === 200 && r.j.resultat === "traite", r);
const facture = (id, cycle, montant) => ({ id, object: "invoice", amount_paid: montant, customer_email: "paul@e2e-lot7.fr", customer: "cus_lot7e2e", billing_reason: cycle,
  parent: { subscription_details: { subscription: "sub_lot7e2e_A" } }, lines: { data: [{ description: "1 × Abonnement sérénité (at €14.90 / month)", pricing: { price_details: { recurring: { interval: "month", interval_count: 1 } } } }] }, status_transitions: { paid_at: Math.floor(Date.now() / 1000) } });
r = await envoyer(evt("3", "invoice.paid", facture("in_lot7e2e_1", "subscription_create", 1490))); ok("invoice.paid du même 1er paiement → déjà traité", r.s === 200 && r.j.resultat === "deja_traite", r);
ok("Abonnement actif 14,90 €/mois, 1 facture", sql("select a.statut || '/' || a.montant_mensuel || '/' || (select count(*) from public.factures f where f.abonnement_id = a.id) from public.abonnements a where stripe_subscription_id = 'sub_lot7e2e_A'") === "actif/14.90/1");
r = await envoyer(evt("4", "invoice.paid", facture("in_lot7e2e_2", "subscription_cycle", 1490))); ok("Renouvellement (nouvelle facture Stripe) → traité", r.s === 200 && r.j.resultat === "traite", r);
ok("Renouvellement : 2 factures payées, libellé du produit Stripe", sql("select count(*) || '/' || string_agg(f.libelle, ' | ' order by f.numero) from public.factures f join public.abonnements a on a.id = f.abonnement_id where a.stripe_subscription_id = 'sub_lot7e2e_A' and f.status = 'payee'") === "2/Abonnement (paiement en ligne) | 1 × Abonnement sérénité (at €14.90 / month)");
r = await envoyer(evt("5", "customer.subscription.updated", { id: "sub_lot7e2e_A", status: "past_due" })); ok("Paiement d'abonnement en échec → suspendu", r.s === 200 && sql("select statut from public.abonnements where stripe_subscription_id = 'sub_lot7e2e_A'") === "suspendu", r);
r = await envoyer(evt("6", "customer.subscription.deleted", { id: "sub_lot7e2e_A", status: "canceled" })); ok("Résiliation → résilié", r.s === 200 && sql("select statut from public.abonnements where stripe_subscription_id = 'sub_lot7e2e_A'") === "resilie", r);

// Événements ignorés (mais journalisés)
r = await envoyer(evt("7", "checkout.session.completed", session({ id: "cs_x", payment_status: "unpaid", payment_intent: "pi_lot7e2e_x" }))); ok("Session non payée → ignorée", r.s === 200 && r.j.resultat === "ignore", r);
r = await envoyer(evt("8", "checkout.session.completed", session({ id: "cs_y", currency: "usd", payment_intent: "pi_lot7e2e_y" }))); ok("Devise USD → ignorée", r.s === 200 && r.j.resultat === "ignore", r);
r = await envoyer(evt("9", "charge.refunded", { id: "ch_1" })); ok("Type non utilisé → ignoré et journalisé", r.s === 200 && r.j.resultat === "ignore" && sql("select statut || '|' || resultat from public.stripe_evenements where id = 'evt_lot7e2e_9'") === "ignore|Événement non utilisé (charge.refunded)", r);

// Panne de la base pendant le traitement : 500 (Stripe réessaiera), erreur notée ; puis reprise
sql("revoke execute on function public.stripe_traiter_evenement(text, text, text, jsonb) from service_role");
r = await envoyer(evt("10", "checkout.session.completed", session({ id: "cs_z", payment_intent: "pi_lot7e2e_z", amount_total: 2000 })));
ok("Erreur de traitement → 500 et erreur notée", r.s === 500 && sql("select statut from public.stripe_evenements where id = 'evt_lot7e2e_10'") === "erreur", r);
sql("grant execute on function public.stripe_traiter_evenement(text, text, text, jsonb) to service_role");
r = await envoyer(evt("10", "checkout.session.completed", session({ id: "cs_z", payment_intent: "pi_lot7e2e_z", amount_total: 2000 })));
ok("Nouvel envoi par Stripe → traité, erreur effacée", r.s === 200 && r.j.resultat === "traite" && sql("select statut || coalesce(erreur, '') from public.stripe_evenements where id = 'evt_lot7e2e_10'") === "traite", r);
ok("Le client existant (même email) est réutilisé", sql("select count(*) from public.clients where lower(email) = 'marie@e2e-lot7.fr'") === "1");

nettoyer();
deno.kill(); proxy.close();
for (const x of res) console.log(x.ok ? "OK   " : "ÉCHEC", x.n, x.ok ? "" : JSON.stringify(x.d)?.slice(0, 300));
console.log(`${res.filter((x) => x.ok).length} / ${res.length} scénarios stripe-webhook conformes`);
process.exit(0);
