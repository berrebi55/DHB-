# 📘 DHB — Documentation complète de l'application

> Dernière mise à jour : octobre 2026. Ce document décrit **tout** ce qui a été construit.

---

## 1. Vue d'ensemble

**DHB** est un **groupe de services informatiques** présenté à travers **plusieurs sites web distincts** (une filiale = un site), tous pilotés depuis **un seul espace d'administration centralisé**.

- **Interventions** : sur site en **Île-de-France**, à distance **partout en France**.
- **Principes** : zéro invention (pas de faux avis/chiffres), SEO poussé propre à chaque site, français, RGPD, design premium.
- **Prix** : affichés **côté Particuliers** uniquement ; **côté Entreprises**, tout est sur **devis**.

**Volume total : ~164 pages web** + l'espace admin + un portail de développement.

---

## 2. Architecture

```
  3 SITES DISTINCTS (chacun son domaine/sous-domaine)        UN SEUL CERVEAU
  ┌───────────────┐  ┌──────────────────┐  ┌──────────────┐
  │  DHB Groupe   │  │ DHB Infogérance  │  │DHB Particul. │
  │  (vitrine)    │  │  (entreprises)   │  │(grand public)│
  └───────┬───────┘  └────────┬─────────┘  └──────┬───────┘
          └───────────────────┼───────────────────┘
                              ▼
                   ┌────────────────────────┐
                   │  ADMIN CENTRALISÉ       │
                   │  + Base Supabase        │  ← demandes, prix, tickets,
                   │  (partagée)             │     factures de TOUTES les filiales
                   └────────────────────────┘
```

**3 couches techniques :**
1. **Front (statique)** : pages HTML/CSS/JS rapides et bien référencées.
2. **Générateurs (Python)** : fabriquent les pages à partir de données (contenu facile à démultiplier).
3. **Backend (Supabase)** : base de données PostgreSQL + authentification + temps réel.

> Chaque site est **autonome** (ses propres fichiers), donc déployable seul sur son propre (sous-)domaine. Tous pointent vers **le même Supabase** = admin centralisé.

---

## 3. Les trois sites

### 3.1 DHB Infogérance (entreprises) — 130 pages
Le site le plus riche. Contenu :
- **7 pages services** : dépannage & assistance, maintenance du parc, supervision & monitoring (via NinjaOne), cybersécurité, sauvegarde & restauration, messagerie & cloud pro, infogérance globale.
- **9 pages locales (SEO local)** : Paris, Boulogne-Billancourt, Saint-Denis, Nanterre, Créteil, Versailles, Montreuil, Argenteuil + support à distance (France). Contenu **unique par ville**.
- **20 articles de blog** rédigés (cocon sémantique : pannes, sauvegarde, sécurité, messagerie, métier).
- **Base de 83 pannes & questions** (14 catégories) avec recherche + filtres : pannes techniques, réseau, messagerie, sécurité, matériel, logiciels, téléphonie/VoIP, **questions de décision/coût**, et **par secteur** (avocats, comptables, santé, commerce, association).
- **À propos, Contact, Mentions légales, Confidentialité, Plan du site, 404.**
- **Lead magnets** (guide gratuit contre email) sur tous les articles et fiches.

### 3.2 DHB Groupe (vitrine chapeau) — 5 pages
Présente le groupe et dirige vers les filiales.
- Accueil (présentation + filiales), Le groupe, Contact, Mentions légales, Confidentialité.

### 3.3 DHB Particuliers (grand public) — 29 pages
Ton chaleureux, accent **vert**, **prix affichés**.
- Accueil, **Abonnement & tarifs** (prix + FAQ), **Centre d'aide** (recherche + filtres).
- **22 fiches d'aide grand public** : ordinateur lent/panne, Internet/box/Wi-Fi, virus & arnaques, photos & données, email & comptes, smartphone, imprimante, conseils/achat, aide aux proches/seniors.
- Contact, À propos, Mentions légales, Confidentialité.

---

## 4. L'espace d'administration (`/admin/`)

Accès **privé** (connexion email + mot de passe via Supabase). **5 sections** :

| Section | Fonction |
|---|---|
| **📥 Demandes** | Toutes les demandes de devis/questions **en direct** (temps réel), filtrables par **filiale**, type, statut, recherche. Statuts (Nouveau → Contacté → Devis envoyé → Gagné/Perdu/Archivé), notes internes, lu/non lu, **date de relance**, suppression. |
| **🔔 À relancer** | Les demandes dont la date de relance est atteinte (pour ne jamais oublier un devis). Bouton « Relancé ✓ ». |
| **🎫 Tickets** | Tickets de support : création, priorité, statut (Ouvert → En cours → Résolu → Fermé), suppression. |
| **🧾 Factures** | Création de factures (HT/TVA/TTC), **numéro automatique continu** (ex. `2026-0001`), statut (Brouillon → Envoyée → Payée), **impression** (vue prête à imprimer/PDF). |
| **⚙️ Prix & paramètres** | **Édition des prix en direct** (abonnement + intervention Particuliers). La modification s'affiche **immédiatement** sur le site. |

> L'admin est **noindex** (invisible pour Google) et protégé par mot de passe.

---

## 5. La base de données (Supabase / PostgreSQL)

Script d'installation unique : **`supabase/full-setup.sql`**.

| Table | Contenu | Accès |
|---|---|---|
| `leads` | Demandes (devis/questions) : contact, message, filiale, statut, notes, relance | Création publique ; lecture/modif = admin |
| `settings` | Prix éditables par filiale | Lecture publique (prix affichés) ; écriture = admin |
| `tickets` | Tickets de support | Admin uniquement |
| `factures` | Factures + `facture_compteurs` (numérotation) | Admin uniquement |

**Sécurité** : chaque table a des règles RLS (Row Level Security). Le public ne peut que **créer une demande** et **lire les prix** ; tout le reste exige une connexion admin.

---

## 6. Fonctionnalités & automatisations

- **Formulaires → base** : chaque formulaire enregistre la demande dans Supabase, étiquetée par filiale, avec la page d'origine.
- **Temps réel** : une nouvelle demande apparaît **toute seule** dans l'admin.
- **Prix en direct** : modifiables depuis l'admin, reflétés instantanément sur le site (sans régénérer). La valeur statique reste dans le HTML (robuste + SEO).
- **Lead magnets** : capture d'email contre un guide gratuit sur les articles/fiches.
- **CRM** : relances (date + vue dédiée).
- **Tickets & Factures** : gestion complète dans l'admin.
- **CI (GitHub Actions)** : à chaque push, les sites sont régénérés et les liens vérifiés (`.github/workflows/build.yml`).
- **Notification email** (optionnelle) : fonction `supabase/functions/notify-new-lead` (à activer avec une clé Resend).

---

## 7. SEO (référencement)

- **1 titre + 1 description uniques par page**, 1 seul H1, structure Hn propre.
- **Données structurées JSON-LD** : Organization (groupe), LocalBusiness, Article, FAQPage, fil d'Ariane.
- **sitemap.xml + robots.txt** par site.
- **URLs claires** (ex. `/pannes-frequentes/imprimante-hors-ligne/`).
- **Cocon sémantique** : articles/Q&A → pages services (pilier) + maillage interne dense.
- **SEO local** (pages villes IdF) + **national** (page à distance).
- **Stratégie longue traîne** : bases de Q&A qui captent les recherches « problème » → tunnel vers devis/abonnement.

---

## 8. Design & accessibilité

- **Charte** : bleu nuit `#0B2A4A` + cyan `#2EC4FF` (Infogérance/Groupe) ; **vert** `#16a34a` (Particuliers). Police **Inter**.
- Responsive **mobile-first**, menu burger, en-tête collant, bouton flottant (appel/WhatsApp).
- Accessibilité : contrastes, navigation clavier, lien d'évitement, textes alternatifs.
- RGPD : bandeau cookies (refus = accepter), consentement sur les formulaires, pages légales.

---

## 9. Technique — comment ça marche

### Structure du projet
```
DHB-/
├─ index.html                 ← portail de dev (liens vers tout)
├─ sites/
│   ├─ groupe/  infogerance/  particuliers/   ← les 3 sites (chacun ses assets)
├─ admin/                     ← espace admin centralisé
├─ supabase/                  ← full-setup.sql + fonction email + guides
├─ build/                     ← générateurs Python (sans dépendance)
│   ├─ *.py                   → sites/infogerance/
│   ├─ groupe/build_groupe.py → sites/groupe/
│   └─ particuliers/build_particuliers.py → sites/particuliers/
└─ .github/workflows/build.yml ← CI
```

### Lancer en local
```bash
python -m http.server 8000      # (Windows : py -m http.server 8000)
# puis http://localhost:8000/
```

### Régénérer après modification du contenu
```bash
python3 build/build_all.py
```
(les 3 sites, la feuille de style commune et les polices hébergées localement ;
`DHB_LIENS=prod` pour des liens vers les vrais domaines). Titres, descriptions,
balises de partage, fil d'Ariane et sitemap sont produits par `build/marque.py` ;
les images de partage (`assets/img/og.png`) par `build/og/generer_og.mjs`.

---

## 10. Valeurs d'EXEMPLE à remplacer (marquées `[À COMPLÉTER]` / `[EXEMPLE]`)

- **Domaines** : `dhb-groupe.fr`, `pro.dhb-groupe.fr`, `dhb-assistance.fr`
- **Téléphone / email / WhatsApp**
- **Prix** Particuliers (19,90 €/mois, 59 € — exemples)
- **Mentions légales** : SIRET, forme juridique, siège, hébergeur
- **À propos** : présentation du/des fondateur(s)
- **Certifications / partenaires** réels
- **Lead magnets** : titre + fichier du guide PDF
- **Garanties** : uniquement des délais réellement tenables
- **Supervision** : lien vers la plateforme NinjaOne

---

## 11. Sécurité des clés

- Seule la **clé publique** Supabase est dans le code (protégée par RLS).
- La **clé secrète** n'est **jamais** dans le dépôt (uniquement variables d'env Supabase).
- Rappel : régénérer la clé secrète (elle a transité en clair lors de la mise en place).

---

## 12. Feuille de route

| État | Élément |
|---|---|
| ✅ Fait | 3 sites, admin centralisé (demandes, relances, tickets, factures, prix), base de données, CI, SEO de base |
| ⏳ À faire côté propriétaire | Vrais prix/infos, exécuter `full-setup.sql` (fait), compléter les `[À COMPLÉTER]` |
| 🔜 Prochaines briques | CMS (éditer le contenu graphiquement) + **mise en ligne** + déploiement auto, séquences email (Resend), paiement en ligne Stripe (Particuliers) |
| ⚠️ À valider | Conformité légale des **factures** (mentions, anti-fraude TVA) avec un comptable |

---

*Document généré pour le projet DHB. Modifiable à votre guise.*
