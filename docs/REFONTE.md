# Refonte DHB — audit, architecture UX et design system

Ce document trace la réflexion produit menée avant la refonte (étapes 1 à 4),
puis ce qui a été livré. Il sert de référence pour les évolutions futures.

---

## 1. Audit de l'existant

### 1.1 Ce qui fonctionne et qui est conservé

- **Supabase** : authentification, Row Level Security, rôles `admin` / `collaborateur`
  (table `profiles`), Realtime sur `leads` et `tickets`.
- **Numérotation serveur** des factures (`AAAA-NNNN`) et des devis (`DEV-AAAA-NNNN`),
  continue par année.
- **Signature de devis en ligne** par jeton public (`public_token`), lecture et signature
  via Edge Functions en service role : les devis restent privés.
- **Prix et bandeau éditables en direct** (table `settings`, lecture publique) avec valeur
  statique de repli dans le HTML (bon pour le SEO).
- **Facturation récurrente**, **relances** et **envoi d'emails** via Edge Functions.
- **Sites publics statiques** générés en Python : SEO solide (JSON-LD, sitemaps, maillage
  pannes ↔ services ↔ zones ↔ blog, 13 pages locales, 83 fiches pannes, 22 fiches d'aide).

### 1.2 Problèmes du back-office

| Zone | Constat |
|---|---|
| **Navigation** | Menu plat de 8 entrées sans regroupement, pas de recherche globale, pas de création rapide, pas de fil d'Ariane. Sur mobile, simple menu replié. |
| **Dashboard** | Indicateurs non cliquables, aucune liste « à faire », aucune activité récente, aucune variation. Graphique « cumul » et camembert décoratifs. Boutons d'automatisation appelés avec la clé publique. |
| **Leads** | Statuts insuffisants (pas « À contacter » ni « Devis à préparer »), pas de priorité, pas de fiche détaillée, pas de notes, date de relance non modifiable, aucune conversion lead → client. Les questions et les demandes de devis sont mélangées. |
| **Clients** | Liste sans CA, sans activité, sans compteurs ; pas de ville ; pas d'archivage ; pas de fiche client (seulement un formulaire) ; notes limitées à un champ texte. |
| **Devis** | Pas de page de consultation ni d'aperçu, pas de duplication, pas d'envoi (lien à copier à la main), pas de conditions, catalogue de prestations inexistant dans l'interface, impression avec coordonnées en dur. |
| **Factures** | Création sur une seule ligne alors que les devis sont multi-lignes ; pas d'échéance ; aucune notion d'impayé ou de retard ; aucun suivi des paiements ; suppression possible d'une facture numérotée (rupture de la numérotation continue) ; pas de fiche. |
| **Abonnements** | Création seulement (pas de modification), pas de lien vers les factures générées, une seule alerte (renouvellement). |
| **Tickets** | Liste seulement : impossible de créer un ticket dans le nouvel admin, pas de fiche, pas de commentaires, pas de responsable, pas de lien client. |
| **Paramètres** | Prix et bandeau uniquement. Pas d'informations société (les devis et factures impriment des mentions en dur), pas de gestion des utilisateurs, pas d'écran sécurité, pas de journal d'activité. |
| **Statistiques** | Mêlées au dashboard ; ni entonnoir de conversion, ni statistiques devis, ni répartition particuliers / entreprises. |
| **Design** | Thème sombre « néon » rejeté. Étiquettes de statut incohérentes d'un écran à l'autre. États vides par défaut (« Pas de données »). Tableaux en défilement horizontal sur mobile. |
| **Cohérence** | Deux back-offices coexistent (`admin/` historique et `admin-react/`). |

### 1.3 Problèmes de sécurité relevés

| Gravité | Constat | Correctif |
|---|---|---|
| Élevée | `send-invoice` acceptait la clé publique et un destinataire / contenu libres : n'importe qui pouvait envoyer des emails depuis votre domaine. | Utilisateur connecté obligatoire ; la fonction relit la facture en base et n'écrit qu'à l'email du client. |
| Moyenne | `generate-recurring-invoices` et `send-reminders` déclenchables avec la clé publique. | Utilisateur connecté ou secret de planification (`CRON_SECRET`). |
| Moyenne | Politiques RLS « tout autorisé aux connectés » : un collaborateur pouvait supprimer par l'API malgré l'interface. | Suppression réservée aux admins **dans la base**. |
| Faible | `notify-new-lead` insérait le texte du visiteur sans échappement dans l'email. | Échappement HTML + secret de webhook optionnel. |

### 1.4 Problèmes des sites publics

- Les trois sites partagent la même feuille de style, le même hero bleu nuit avec halo
  cyan et grille, les mêmes cartes : seule la couleur d'accent change côté Particuliers
  (CSS en ligne). Ils ressemblent à des copies.
- Le hero du site Pro simule un tableau de supervision (« Postes opérationnels »…) :
  illustration, mais à la limite de la règle « ne rien inventer ».
- Ombres lourdes, cartes qui « sautent » au survol, boutons pilule avec halo, émojis
  utilisés comme icônes.
- Noms incohérents : « DHB Infogérance / DHB Particuliers » à l'écran, mais domaines
  `pro.` et `dhb-assistance`.
- Contenu masqué tant que l'animation au défilement ne s'est pas déclenchée.
- Accueils incomplets : pas de section zone ni FAQ sur Pro, pas de « comment ça marche »
  ni FAQ sur Assistance, Groupe très mince.
- Bouton WhatsApp flottant, bouton d'appel et bandeau cookies se chevauchent sur mobile.

---

## 2. Nouvelle architecture de navigation (back-office)

```
TABLEAU DE BORD
COMMERCIAL     Demandes · Clients · Devis · Prestations
FACTURATION    Factures · Paiements · Abonnements
SUPPORT        Tickets · Questions reçues
PILOTAGE       Statistiques · Chiffre d'affaires · Récurrent (MRR/ARR) · Performance commerciale
CONTENU        Prix & bandeau
SYSTÈME        Utilisateurs · Paramètres · Sécurité · Journal d'activité
```

Principes :

- **Sidebar fixe** sur ordinateur, repliable en icônes ; **tiroir** sur mobile.
- **En-tête** : fil d'Ariane, **recherche globale** (Ctrl/⌘ + K) sur clients, demandes,
  devis, factures et tickets, bouton **« Créer »** (demande, client, devis, facture, ticket).
- **Fiche client = page centrale** : toutes les demandes, devis, factures, paiements,
  abonnements, tickets, notes et l'historique d'un client au même endroit, avec actions
  rapides (créer un devis, une facture, un ticket, ajouter une note).
- **Tout est cliquable** : un indicateur ou une tâche du dashboard ouvre la liste déjà filtrée.
- **Filtres dans l'URL** : un lien comme `/factures?etat=en_retard` est partageable et
  reproductible.
- Les questions reçues des sites (type `question`) sont traitées dans **Support**, les
  demandes de devis dans **Commercial** : même table, deux usages distincts.

## 3. Modèle de données (évolutions, toutes additives)

| Élément | Ajout |
|---|---|
| `leads` | statuts `a_contacter`, `devis_a_preparer` ; `priorite` ; `type_client` (déduit automatiquement) |
| `clients` | `ville`, `code_postal`, `siret`, `archived_at`, `lead_id` |
| `devis` | `conditions`, `envoye_at`, `lead_id` |
| `factures` | `date_echeance`, `paid_at`, `devis_id`, `abonnement_id`, `conditions` |
| `tickets` | `responsable_id`, `resolved_at`, `closed_at` |
| `prestations` | `description`, `unite`, `actif` |
| `profiles` | `nom` |
| **nouveau** `paiements` | encaissements rattachés aux factures |
| **nouveau** `notes` | notes et commentaires (client, lead, ticket, devis, facture) |
| **nouveau** `activites` | journal alimenté **par la base** (triggers), donc fiable |
| **nouveau** `entreprise` | informations société imprimées sur devis et factures |
| **vues** `clients_vue`, `factures_vue` | agrégats (CA, compteurs, retard, reste à payer) |

Règles de calcul (aucune donnée inventée) :

- **CA encaissé** = somme des factures au statut « payée » (date : `paid_at`, sinon date de
  facture). Un paiement partiel est affiché sur la facture mais n'est compté qu'au solde.
- **Variation** affichée uniquement si la période de comparaison contient des données ;
  sinon « Pas de comparaison disponible ».
- **Facture en retard** = envoyée, non payée, échéance dépassée (échéance absente =
  paiement à réception).
- **MRR** = somme des abonnements actifs ; **ARR** = MRR × 12.

## 4. Design system

Direction : clair, sobre, SaaS professionnel. Pas de néon, pas de halo, pas de dégradés
décoratifs, ombres très légères, bordures fines seulement là où elles structurent.

| Rôle | Valeur |
|---|---|
| Fond application | `#F5F7FA` |
| Surfaces | `#FFFFFF`, bordure `#E3E7ED` |
| Texte principal / secondaire | `#101828` / `#5B6576` |
| Couleur principale | bleu profond `#2450D3` (survol `#1D40AB`, fond léger `#EEF3FF`) |
| Encre de marque | `#0E1B2E` |
| Succès / Attention / Erreur / Info | `#15803D` / `#B45309` / `#C02B2B` / `#0369A1` |
| Typographie | Inter (interface), chiffres tabulaires |
| Échelle | 12 · 13 · 14 (base) · 16 · 20 · 24 · 30 |
| Espacements | 4 · 8 · 12 · 16 · 24 · 32 |
| Rayons | 8 (contrôles) · 12 (cartes) |

Sites publics : une identité commune (mot-symbole DHB, encre bleu nuit, Inter pour le
texte, barre de liens entre les trois sites, même pied de page), et une personnalité par
site :

- **DHB Groupe** — institutionnel : titres en serif (Newsreader), bandeau bleu nuit plein,
  beaucoup d'air.
- **DHB Pro** — B2B : bleu profond, grilles structurées, formulaire de devis dès le haut
  de page, preuves concrètes (engagements, zone, méthode).
- **DHB Assistance** — grand public : vert-bleu apaisant, typographie plus grande, coins
  plus arrondis, tarifs visibles immédiatement, numéro de téléphone mis en avant.

---

## 5. Ce qui a été livré

- **Back-office** (`admin-react/`) entièrement reconstruit : navigation par
  sections, tableau de bord actionnable, CRM, devis/factures/paiements,
  abonnements, tickets, pilotage, système. Utilisation et déploiement :
  `admin-react/README.md`.
- **Base** : bloc « REFONTE v2 » de `supabase/full-setup.sql` (additif,
  idempotent, testé 3 fois de suite sur PostgreSQL 16).
- **Edge Functions** sécurisées (`supabase/functions/_shared/securite.ts`),
  nouvelles : `send-devis`, `invite-user`.
- **Sites publics** : identité commune `build/marque.py` + feuille de style
  commune (`sites/infogerance/assets/css/style.css`, copiée dans les deux
  autres sites), personnalités via `<body data-site="groupe|pro|assistance">`.
  Tout régénérer : `python3 build/build_all.py`
  (`DHB_LIENS=prod` pour des liens vers les vrais domaines).
- **Non modifiés** : `admin/index.html` (ancienne admin, dépréciée) et
  `sites/groupe/devis.html` (page de signature, autonome).

### Reste à compléter par le propriétaire

Tous les emplacements `[À COMPLÉTER PAR LE PROPRIÉTAIRE]` / `[EXEMPLE]` :
téléphone, emails, SIRET, forme juridique, hébergeur, histoire du groupe,
avis clients vérifiés, frais de déplacement, fiche entreprise (Système →
Paramètres : IBAN, mentions de facture, pénalités de retard).
