import { genererPdf } from "file:///C:/Users/CLAUDE/Documents/DHB-/supabase/functions/_shared/pdf.ts";
const ent = { raison_sociale: "DHB Test", forme_juridique: "Entrepreneur individuel", adresse: "1 rue de l'Essai", code_postal: "93200", ville: "Saint-Denis",
  siret: "000 000 000 00000", email: "contact@exemple.fr", telephone: "01 00 00 00 00", iban: "FR76 0000 0000 0000", bic: "TESTFRPP",
  mentions_facture: "Paiement à réception par virement.", penalites_retard: "Pénalités : 3 fois le taux légal. Indemnité forfaitaire : 40 €.", conditions_devis: "Acompte de 30 % à la commande." };
const lignes = [
  { libelle: "Intervention sur site — diagnostic réseau", description: "Câblage, box, Wi-Fi\nRapport remis au client", qte: 2, pu: 60 },
  { libelle: "Licence antivirus (1 an)", qte: 3, pu: 38.5 },
  { libelle: "Forfait « sérénité » d'été", qte: 1, pu: 1003 },
];
const cas: Record<string, [ "devis" | "facture", Record<string, unknown>, Record<string, unknown> | null ]> = {
  "facture-complete": ["facture", { numero: "2026-0001", date_facture: "2026-10-22", date_echeance: "2026-11-21", client_nom: "Cabinet Martin", client_adresse: "12 avenue du Test\n93400 Saint-Ouen", client_email: "martin@exemple.fr", lignes, tva_taux: 0, total_ht: 1234.5, total_ttc: 1234.5, status: "envoyee" }, ent],
  "facture-entreprise-vide": ["facture", { numero: "2026-0002", date_facture: "2026-10-22", client_nom: "Mme Leroy", lignes, tva_taux: 0, total_ht: 1234.5, total_ttc: 1234.5, status: "envoyee" }, null],
  "devis-long": ["devis", { numero: "DEV-2026-0007", date_devis: "2026-10-22", validite_jours: 15, client_nom: "Association Horizon", statut: "brouillon", tva_taux: 0, total_ht: 3600, total_ttc: 3600,
    lignes: Array.from({ length: 60 }, (_, i) => ({ libelle: `Poste de travail n° ${i + 1} — mise à jour et sauvegarde`, description: i % 3 === 0 ? "Vérification de l'antivirus et des mises à jour" : "", qte: 1, pu: 60 })) }, ent],
  "devis-signe": ["devis", { numero: "DEV-2026-0008", date_devis: "2026-10-01", client_nom: "Garage Petit", lignes: lignes.slice(0, 1), tva_taux: 0, total_ht: 120, total_ttc: 120, statut: "accepte", signed_at: "2026-10-05T10:00:00Z", signature_nom: "Paul Petit" }, ent],
  "facture-tva20": ["facture", { numero: "2026-0003", date_facture: "2026-10-22", client_nom: "Société Exemple", lignes: lignes.slice(1, 2), tva_taux: 20, total_ht: 115.5, total_ttc: 138.6, status: "envoyee" }, { ...ent, tva_intracom: null }],
  "caracteres": ["facture", { numero: "2026-0004", date_facture: "2026-10-22", client_nom: "Émile Œuvre 😀", client_adresse: "Résidence\u202fdes Pins", lignes: [{ libelle: "Mot" + "x".repeat(150) + " fin — ok ✓", qte: 1, pu: 10 }], tva_taux: 0, total_ht: 10, total_ttc: 10, status: "payee" }, ent],
  "facture-annulee": ["facture", { numero: "2026-0005", date_facture: "2026-09-01", client_nom: "Client annulé", lignes: lignes.slice(0, 1), tva_taux: 0, total_ht: 120, total_ttc: 120, status: "annulee" }, ent],
  "facture-ancienne": ["facture", { numero: "2025-0042", date_facture: "2025-03-10", client_nom: "Ancien client", libelle: "Maintenance annuelle", quantite: 1, prix_unitaire: 480, tva_taux: 0, total_ht: 480, total_ttc: 480, status: "payee" }, ent],
};
for (const [nom, [type, d, e]] of Object.entries(cas)) {
  const debut = performance.now();
  const octets = await genererPdf(type, d, e);
  await Deno.writeFile(`pdf/${nom}.pdf`, octets);
  console.log(nom, octets.length, "octets", Math.round(performance.now() - debut), "ms");
}
