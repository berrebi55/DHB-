// Faux serveur Supabase (HTTP) pour exécuter les Edge Functions avec Deno :
// Auth (jetons de test), PostgREST minimal (eq, select, insert, update) et Storage.
import http from "node:http";

export function demarrer(port = 54321) {
  const etat = {
    utilisateurs: {
      "jeton-admin": { id: "11111111-1111-1111-1111-111111111111", email: "admin@test.fr", role: "admin" },
      "jeton-collab": { id: "22222222-2222-2222-2222-222222222222", email: "collab@test.fr", role: "collaborateur" },
      "jeton-attente": { id: "33333333-3333-3333-3333-333333333333", email: "attente@test.fr", role: "en_attente" },
    },
    tables: { devis: [], factures: [], entreprise: [], documents: [], profiles: [], clients: [], notes: [], emails: [] },
    fichiers: new Map(),
    stockageEnPanne: false,
    appels: [],
  };
  for (const u of Object.values(etat.utilisateurs)) etat.tables.profiles.push({ id: u.id, email: u.email, role: u.role });

  const lireCorps = (req) => new Promise((ok) => { const b = []; req.on("data", (c) => b.push(c)); req.on("end", () => ok(Buffer.concat(b))); });
  const filtrer = (rows, params) => rows.filter((r) => [...params.entries()].every(([k, v]) => {
    if (["select", "order", "limit", "offset", "on_conflict", "columns"].includes(k)) return true;
    if (v.startsWith("eq.")) return String(r[k]) === v.slice(3);
    if (v.startsWith("is.")) return v === "is.null" ? r[k] == null : true;
    if (v.startsWith("in.(")) return v.slice(4, -1).split(",").includes(String(r[k]));
    return true;
  }));
  const envoyer = (res, status, corps, type = "application/json", entetes = {}) => {
    res.writeHead(status, { "Content-Type": type, ...entetes });
    res.end(typeof corps === "string" || Buffer.isBuffer(corps) ? corps : JSON.stringify(corps));
  };

  const serveur = http.createServer(async (req, res) => {
    const u = new URL(req.url, `http://localhost:${port}`);
    const corps = await lireCorps(req);
    etat.appels.push(`${req.method} ${u.pathname}`);
    // ---- Auth ----
    if (u.pathname === "/auth/v1/user") {
      const jeton = (req.headers.authorization || "").replace(/^Bearer /, "");
      const util = etat.utilisateurs[jeton];
      return util ? envoyer(res, 200, { id: util.id, email: util.email, aud: "authenticated", role: "authenticated" }) : envoyer(res, 401, { message: "invalid JWT" });
    }
    // ---- Storage ----
    const s = u.pathname.match(/^\/storage\/v1\/object\/([^/]+)\/(.+)$/);
    if (s) {
      if (etat.stockageEnPanne) return envoyer(res, 503, { message: "Service Unavailable" });
      const cle = `${s[1]}/${decodeURIComponent(s[2])}`;
      if (req.method === "GET") return etat.fichiers.has(cle) ? envoyer(res, 200, etat.fichiers.get(cle), "application/pdf") : envoyer(res, 400, { statusCode: "404", error: "not_found", message: "Object not found" });
      if (req.method === "POST" || req.method === "PUT") {
        const upsert = req.headers["x-upsert"] === "true";
        if (etat.fichiers.has(cle) && !upsert) return envoyer(res, 400, { statusCode: "409", error: "Duplicate", message: "The resource already exists" });
        etat.fichiers.set(cle, corps);
        return envoyer(res, 200, { Key: cle });
      }
    }
    // ---- Faux Resend ----
    if (u.pathname === "/emails" && req.method === "POST") {
      const m = JSON.parse(corps.toString() || "{}");
      etat.resend = etat.resend ?? [];
      if (etat.resendEnPanne) return envoyer(res, 500, { message: "Service Resend indisponible" });
      if ((req.headers.authorization || "") !== "Bearer re_test") return envoyer(res, 401, { message: "API key is invalid" });
      etat.resend.push(m);
      return envoyer(res, 200, { id: `re_${etat.resend.length}` });
    }
    // ---- RPC ----
    if (u.pathname === "/rest/v1/rpc/next_facture_numero") { etat.numero = (etat.numero ?? 0) + 1; return envoyer(res, 200, JSON.stringify(`2026-${String(etat.numero).padStart(4, "0")}`)); }
    // ---- PostgREST ----
    const t = u.pathname.match(/^\/rest\/v1\/([a-z_]+)$/);
    if (t) {
      const table = etat.tables[t[1]] ?? (etat.tables[t[1]] = []);
      const objet = (req.headers.accept || "").includes("vnd.pgrst.object");
      if (req.method === "GET") {
        const rows = filtrer(table, u.searchParams);
        if (objet) return rows.length === 1 ? envoyer(res, 200, rows[0]) : envoyer(res, 406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" });
        return envoyer(res, 200, rows);
      }
      if (req.method === "POST") {
        const nouvelles = [].concat(JSON.parse(corps.toString() || "{}"));
        for (const n of nouvelles) {
          if (t[1] === "documents" && table.some((x) => x.type === n.type && ((n.type === "facture" && x.facture_id === n.facture_id) || (n.type === "devis" && x.devis_id === n.devis_id))))
            return envoyer(res, 409, { code: "23505", message: "duplicate key value violates unique constraint" });
          table.push({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...n });
        }
        const crees = table.slice(-nouvelles.length);
        if ((req.headers.accept || "").includes("vnd.pgrst.object")) return envoyer(res, 201, crees[0]);
        return envoyer(res, 201, (req.headers.prefer || "").includes("return=representation") ? crees : "", "application/json");
      }
      if (req.method === "PATCH") {
        const maj = JSON.parse(corps.toString() || "{}");
        const rows = filtrer(table, u.searchParams);
        rows.forEach((r) => Object.assign(r, maj));
        return envoyer(res, 200, (req.headers.prefer || "").includes("return=representation") ? rows : "");
      }
    }
    envoyer(res, 404, { message: "inconnu " + u.pathname });
  });
  return new Promise((ok) => serveur.listen(port, "127.0.0.1", () => ok({ etat, fermer: () => serveur.close() })));
}
