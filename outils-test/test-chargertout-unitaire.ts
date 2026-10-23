// Lot 15 : chargerTout() face à des serveurs simulés (plafonds, pagination ignorée, vide, erreurs).
import { chargerTout } from "./chargerTout.ts";
const res: [string, boolean, unknown][] = [];
const ok = (n: string, c: boolean, d?: unknown) => res.push([n, c, d]);
const lignes = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i }));
const serveur = (total: number, plafond: number, opts: { ignoreOffset?: boolean } = {}) => {
  let appels = 0;
  const f = (de: number, a: number) => {
    appels++;
    const t = lignes(total);
    const debut = opts.ignoreOffset ? 0 : de;
    return Promise.resolve({ data: t.slice(debut, Math.min(a + 1, debut + plafond)), error: null });
  };
  return { f, appels: () => appels };
};
for (const [total, plafond] of [[0, 1000], [5, 1000], [999, 1000], [1000, 1000], [1001, 1000], [2346, 1000], [2346, 300], [500, 500]]) {
  const s = serveur(total, plafond);
  const r = await chargerTout(s.f);
  ok(`${total} lignes, plafond ${plafond} : tout chargé (${s.appels()} requêtes)`, r.data.length === total && new Set(r.data.map((x) => x.id)).size === total && !r.tronque, { n: r.data.length, appels: s.appels() });
}
{
  const s = serveur(5, 1000, { ignoreOffset: true });
  const r = await chargerTout(s.f);
  ok(`Serveur qui ignore la pagination : 5 lignes, sans doublon ni boucle (${s.appels()} requêtes)`, r.data.length === 5 && s.appels() <= 2, { n: r.data.length, appels: s.appels() });
}
{
  const s = serveur(3000, 1000, { ignoreOffset: true });
  const r = await chargerTout(s.f);
  ok(`Serveur qui ignore la pagination (pages pleines) : arrêt après 2 requêtes`, r.data.length === 1000 && s.appels() === 2, { n: r.data.length, appels: s.appels() });
}
{
  let n = 0;
  const r = await chargerTout((de, a) => { n++; return Promise.resolve(n === 2 ? { data: null, error: { message: "panne" } } : { data: lignes(1500).slice(de, Math.min(a + 1, de + 1000)), error: null }); });
  ok("Erreur à la 2e page : remontée", r.error?.message === "panne");
}
{
  const s = serveur(5000, 1000);
  const r = await chargerTout(s.f, 2500);
  ok("Maximum atteint : arrêt et « tronqué »", r.data.length === 2500 && r.tronque);
}
for (const [n, c, d] of res) console.log(c ? "OK   " : "ÉCHEC", n, c ? "" : JSON.stringify(d));
console.log(`${res.filter((x) => x[1]).length} / ${res.length} tests unitaires de chargerTout conformes`);
