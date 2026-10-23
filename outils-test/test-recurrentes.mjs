import { spawn } from "node:child_process";
import { demarrer } from "./faux-serveur-supabase.mjs";
const { etat, fermer } = await demarrer(54321);
etat.tables.entreprise.push({ id: 1, delai_paiement_jours: 30 });
(etat.tables.abonnements = []).push(
  { id: "a1", statut: "actif", libelle: "Infogérance", montant_mensuel: 200, jour_facturation: 1, entity: "infogerance", client_nom: "Cabinet" },
  { id: "a2", statut: "actif", libelle: "Sérénité", montant_mensuel: 14.9, jour_facturation: 1, entity: "particuliers", client_nom: "Marie", stripe_subscription_id: "sub_1" });
const deno = spawn("node_modules/deno/deno.exe", ["run", "--allow-net", "--allow-env", "--allow-read", "lancer-fonction.ts", "C:/Users/CLAUDE/Documents/DHB-/supabase/functions/generate-recurring-invoices/index.ts"],
  { env: { ...process.env, SUPABASE_URL: "http://127.0.0.1:54321", SUPABASE_SERVICE_ROLE_KEY: "x", PORT_TEST: "54396" } });
let j = ""; deno.stdout.on("data", (d) => (j += d)); deno.stderr.on("data", (d) => (j += d));
for (let i = 0; i < 120 && !/Listening/.test(j); i++) await new Promise((r) => setTimeout(r, 500));
const r = await (await fetch("http://127.0.0.1:54396/", { method: "POST", headers: { Authorization: "Bearer jeton-admin", "Content-Type": "application/json" }, body: "{}" })).json();
const ok1 = r.generees === 1 && etat.tables.factures.length === 1 && etat.tables.factures[0].libelle.startsWith("Infogérance");
const ok2 = r.ignores?.some((x) => x.id === "a2" && x.raison === "preleve_par_stripe");
console.log(ok1 ? "OK   " : "ÉCHEC", "Abonnement classique : facture brouillon générée", ok1 ? "" : JSON.stringify(r));
console.log(ok2 ? "OK   " : "ÉCHEC", "Abonnement Stripe : ignoré (prélevé par Stripe)", ok2 ? "" : JSON.stringify(r));
deno.kill(); fermer(); process.exit(0);
