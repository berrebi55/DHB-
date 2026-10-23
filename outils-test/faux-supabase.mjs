// Faux Supabase (en mémoire) pour les tests navigateur du back-office.
// Toutes les requêtes vers https://fauxsupabase.test sont servies ici :
// aucune requête ne part vers une vraie base.
export const HOTE = "https://fauxsupabase.test";
const ADMIN = "11111111-1111-1111-1111-111111111111";
const jour = (d) => new Date(Date.now() + d * 86400000).toISOString();
const date = (d) => jour(d).slice(0, 10);
const uuid = (t, i) => `${t.toString(16).padStart(8, "0")}-0000-4000-8000-${String(i).padStart(12, "0")}`;

const CLIENTS = ["Cabinet Martin", "Boulangerie Durand", "Mme Leroy", "Association Horizon", "Garage Petit"];
const base = (t, i) => ({
  id: uuid(t, i + 1), created_at: jour(-i * 3), updated_at: jour(-i), client_id: uuid(2, (i % 5) + 1),
  client_nom: CLIENTS[i % 5], entity: ["infogerance", "particuliers", "groupe"][i % 3],
});
const gen = {
  leads: (i) => ({ ...base(1, i), nom: `Contact ${i + 1}`, entreprise: i % 2 ? "Société Exemple" : null, email: `contact${i}@exemple.fr`,
    telephone: "01 00 00 00 0" + i, message: "Mon ordinateur ne démarre plus depuis ce matin.", service: "Dépannage",
    type: i === 4 ? "question" : "devis", statut: ["nouveau", "a_contacter", "contacte", "devis_envoye", "gagne"][i % 5],
    status: ["nouveau", "a_contacter", "contacte", "devis_envoye", "gagne"][i % 5],
    priorite: ["normale", "haute", "urgente", "basse", "normale"][i % 5], type_client: i % 2 ? "entreprise" : "particulier",
    lu: i > 1, relance_le: date(i - 2), source_url: "/contact/" }),
  clients: (i) => ({ ...base(2, i), id: uuid(2, i + 1), nom: CLIENTS[i % 5], entreprise: CLIENTS[i % 5], email: `client${i}@exemple.fr`,
    telephone: "01 00 00 00 1" + i, ville: "Saint-Denis", statut: ["client", "prospect", "client", "inactif", "client"][i % 5],
    type_client: i % 2 ? "particulier" : "entreprise", archive: false, ca_encaisse: 1200 - i * 100, ca_facture: 1500 - i * 100,
    nb_devis: 2, nb_factures: 3, tickets_ouverts: i % 2, derniere_activite: jour(-i) }),
  devis: (i) => ({ ...base(3, i), numero: `DEV-2026-000${i + 1}`, status: ["brouillon", "envoye", "accepte", "refuse", "expire"][i % 5],
    date_devis: date(-i * 4), validite_jours: 30, total_ht: 450 + i * 50, total_ttc: 450 + i * 50, objet: "Maintenance du parc",
    lignes: [{ libelle: "Intervention", quantite: 1, prix_unitaire: 450, total: 450 }], token: "x" + i }),
  factures: (i) => ({ ...base(4, i), numero: `2026-000${i + 1}`, status: ["envoyee", "payee", "brouillon", "envoyee", "annulee"][i % 5],
    date_facture: date(-i * 10), echeance: date(-i * 10 + 30), echeance_effective: date(i === 3 ? -5 : 20), total_ht: 300 + i * 40,
    total_ttc: 300 + i * 40, montant_paye: i === 1 ? 340 : 0, reste_a_payer: i === 1 ? 0 : 300 + i * 40, en_retard: i === 3,
    paid_at: i === 1 ? `${date(-5)}T12:00:00Z` : null, lignes: [{ libelle: "Dépannage", quantite: 1, prix_unitaire: 300, total: 300 }] }),
  paiements: (i) => ({ ...base(5, i), facture_id: uuid(4, 2), montant: 120 + i * 10, date_paiement: date(-i * 7),
    moyen: ["virement", "carte", "cheque", "stripe", "especes"][i % 5], reference: "REF-" + i,
    factures: { numero: "2026-0002", client_nom: CLIENTS[i % 5] } }),
  abonnements: (i) => ({ ...base(6, i), libelle: "Abonnement sérénité", formule: "Sérénité", montant: 14.9 + i, periodicite: i % 2 ? "annuel" : "mensuel",
    status: ["actif", "actif", "suspendu", "resilie", "actif"][i % 5], statut: ["actif", "actif", "suspendu", "resilie", "actif"][i % 5],
    date_debut: date(-200), prochaine_facturation: date(i - 2) }),
  tickets: (i) => ({ ...base(7, i), titre: `Imprimante hors ligne ${i + 1}`, sujet: "Imprimante hors ligne", description: "L'imprimante n'est plus détectée.",
    status: ["ouvert", "en_cours", "resolu", "ferme", "ouvert"][i % 5], priorite: ["urgente", "haute", "normale", "basse", "normale"][i % 5],
    responsable: "admin@test.fr", commentaires: [] }),
  prestations: (i) => ({ ...base(8, i), libelle: ["Intervention sur site", "Assistance à distance", "Installation poste", "Audit sécurité", "Sauvegarde"][i],
    description: "Prestation standard", unite: "heure", prix: 60 + i * 10, prix_unitaire: 60 + i * 10, actif: i !== 4 }),
  notes: (i) => ({ ...base(9, i), contenu: "Client rappelé, rendez-vous fixé.", author_email: "admin@test.fr" }),
  activites: (i) => ({ ...base(10, i), user_id: ADMIN, user_email: "admin@test.fr", action: ["creation", "modification", "suppression", "creation", "modification"][i],
    table_name: ["leads", "devis", "factures", "clients", "tickets"][i], entite_table: ["leads", "devis", "factures", "clients", "tickets"][i],
    record_id: uuid(1, 1), titre: ["Nouvelle demande", "Devis modifié", "Facture supprimée", "Client créé", "Ticket modifié"][i], details: {} }),
  profiles: (i) => ({ id: i === 0 ? ADMIN : uuid(11, i), email: i === 0 ? "admin@test.fr" : `equipe${i}@test.fr`, nom: i === 0 ? "Admin Test" : `Équipe ${i}`,
    role: ["admin", "collaborateur", "en_attente", "collaborateur", "collaborateur"][i], created_at: jour(-30 * i) }),
  settings: (i) => ({ id: uuid(12, i + 1), entity: ["particuliers", "particuliers", "infogerance"][i % 3], key: ["abonnement_prix", "intervention_prix", "annonce"][i % 3],
    value: ["14,90", "59", ""][i % 3], updated_at: jour(-2) }),
  entreprise: () => ({ id: 1, raison_sociale: null, delai_paiement_jours: 30, validite_devis_jours: 30 }),
  sauvegardes: (i) => ({ id: uuid(13, i + 1), created_at: jour(-i), type: "nocturne", statut: i === 2 ? "echec" : "reussie", taille_octets: 24000 + i,
    sha256: "abc" + i, lignes: { leads: 5 }, run_url: "https://github.com/", erreur: i === 2 ? "export des données métier" : null, duree_secondes: 2 }),
};
gen.clients_vue = gen.clients;
gen.factures_vue = gen.factures;

export function donnees(table, vide) {
  if (vide || !gen[table]) return [];
  const n = table === "entreprise" ? 1 : table === "settings" ? 3 : 5;
  return Array.from({ length: n }, (_, i) => gen[table](i));
}

function b64(o) { return Buffer.from(JSON.stringify(o)).toString("base64url"); }
export const UTILISATEUR = { id: ADMIN, aud: "authenticated", role: "authenticated", email: "admin@test.fr", app_metadata: {}, user_metadata: {}, created_at: jour(-100) };
export function session() {
  const exp = Math.floor(Date.now() / 1000) + 86400;
  const jwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: ADMIN, role: "authenticated", email: "admin@test.fr", exp, aud: "authenticated" })}.signature`;
  return { access_token: jwt, refresh_token: "r", token_type: "bearer", expires_in: 86400, expires_at: exp, user: UTILISATEUR };
}
export const CLE_SESSION = "sb-fauxsupabase-auth-token";

export async function brancher(context, { vide = false } = {}) {
  await context.route(`${HOTE}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "access-control-expose-headers": "content-range" };
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    if (url.pathname.startsWith("/auth/v1/user")) return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify(UTILISATEUR) });
    if (url.pathname.startsWith("/auth/v1/")) return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: "{}" });
    if (url.pathname.startsWith("/rest/v1/rpc/")) return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: "null" });
    const m = url.pathname.match(/^\/rest\/v1\/([a-z_]+)/);
    if (m) {
      let rows = donnees(m[1], vide);
      const id = url.searchParams.get("id");
      if (id && id.startsWith("eq.")) {
        const v = id.slice(3);
        const r = rows.find((x) => String(x.id) === v) ?? (rows[0] ? { ...rows[0], id: m[1] === "entreprise" ? 1 : v } : null);
        rows = r ? [r] : [];
      }
      // Pagination comme PostgREST (offset / limit envoyés par .range()).
      const off = Number(url.searchParams.get("offset") || 0), lim = url.searchParams.get("limit");
      if (off || lim) rows = rows.slice(off, lim ? off + Number(lim) : undefined);
      const headers = { ...cors, "content-range": `0-${Math.max(rows.length - 1, 0)}/${rows.length}` };
      if (req.method() === "HEAD") return route.fulfill({ status: 200, headers });
      const objet = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
      if (objet) {
        if (!rows.length) return route.fulfill({ status: 406, headers, contentType: "application/json", body: JSON.stringify({ code: "PGRST116", message: "0 rows" }) });
        return route.fulfill({ status: 200, headers, contentType: "application/json", body: JSON.stringify(rows[0]) });
      }
      return route.fulfill({ status: 200, headers, contentType: "application/json", body: JSON.stringify(rows) });
    }
    if (url.pathname.startsWith("/functions/v1/")) return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: "{}" });
    return route.fulfill({ status: 404, headers: cors, body: "" });
  });
}
