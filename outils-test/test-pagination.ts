// Lot 15 : chargerTout() contre un vrai PostgREST plafonné (1 000 puis 300 lignes par réponse).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { chargerTout } from "./chargerTout.ts";

const enc = (o: unknown) => btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const cle = await crypto.subtle.importKey("raw", new TextEncoder().encode("secret-jwt-de-test-au-moins-32-caracteres"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
const corps = `${enc({ alg: "HS256", typ: "JWT" })}.${enc({ role: "service_role", exp: Math.floor(Date.now() / 1000) + 3600 })}`;
const sig = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign("HMAC", cle, new TextEncoder().encode(corps))))).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const JWT = `${corps}.${sig}`;
const sql = async (q: string) => {
  const p = new Deno.Command("docker", { args: ["exec", "dhb-test-pg", "psql", "-U", "postgres", "-d", "dhb_test", "-v", "ON_ERROR_STOP=1", "-tAc", q] });
  const o = await p.output(); return new TextDecoder().decode(o.stdout).trim();
};
const res: [string, boolean, unknown][] = [];
const ok = (n: string, c: boolean, d?: unknown) => res.push([n, c, d]);

const avant = Number(await sql("select count(*) from public.clients"));
await sql("insert into public.clients (nom, email) select 'Pagination ' || g, 'p' || g || '@test.invalid' from generate_series(1, 2345) g");
const total = avant + 2345;
try {
  for (const [plafond, port] of [[1000, 54340], [300, 54333]] as const) {
    // Le client parle directement à PostgREST (pas de passerelle /rest/v1).
    const sb = createClient(`http://127.0.0.1:${port}`, JWT, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${JWT}` } } });
    // @ts-ignore — PostgREST seul : on remplace l'URL REST par la racine.
    sb.rest.url = `http://127.0.0.1:${port}`;
    const naif = await sb.from("clients").select("id").limit(5000);
    ok(`[plafond ${plafond}] Ancienne méthode (.limit(5000)) : seulement ${naif.data?.length} lignes sur ${total}`, (naif.data?.length ?? 0) === plafond, naif.error);
    const r = await chargerTout<{ id: string }>((de, a) => sb.from("clients").select("id").order("id").range(de, a));
    const ids = new Set(r.data.map((x) => x.id));
    ok(`[plafond ${plafond}] chargerTout : ${r.data.length} lignes, toutes distinctes, rien de tronqué`, r.data.length === total && ids.size === total && !r.tronque && !r.error, { n: r.data.length, distinct: ids.size, e: r.error });
    const p = await chargerTout<{ id: string }>((de, a) => sb.from("clients").select("id").order("id").range(de, a), 1200);
    ok(`[plafond ${plafond}] Au-delà du maximum : arrêt à 1 200 et signalé « partiel »`, p.data.length === 1200 && p.tronque);
    const e = await chargerTout<{ id: string }>((de, a) => sb.from("clients").select("colonne_inexistante").order("id").range(de, a));
    ok(`[plafond ${plafond}] Erreur de la base remontée (pas de faux « vide »)`, !!e.error && e.data.length === 0, e.error);
  }
} finally {
  await sql("delete from public.clients where email like 'p%@test.invalid' and nom like 'Pagination %'");
}
ok("Base de test remise dans son état initial", Number(await sql("select count(*) from public.clients")) === avant);
for (const [n, c, d] of res) console.log(c ? "OK   " : "ÉCHEC", n, c ? "" : JSON.stringify(d));
console.log(`${res.filter((x) => x[1]).length} / ${res.length} tests de pagination conformes`);
