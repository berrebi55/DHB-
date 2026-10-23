# PROMPT COMPLET — Projet DHB (à donner tel quel à une IA)

> Ce document décrit **tout** le projet DHB dans son état actuel : métier, règles, trois sites publics, back-office, base de données, sécurité, fonctions serveur, mesure d'audience, déploiement, tests et ce qui reste à compléter. Il sert de brief complet pour qu'une IA (ou un développeur) comprenne, reproduise, corrige ou fasse évoluer l'application sans rien deviner.
> Tout est en **français**.

---

## 0. RÔLE ATTENDU DE L'IA

Tu es un lead développeur / designer produit qui reprend un projet existant. Avant toute modification :
1. Lis ce document en entier.
2. Reformule ce que tu as compris et pose tes questions **avant** d'agir si quelque chose est ambigu (le propriétaire veut qu'on reformule/demande plutôt que de supposer).
3. Ne casse jamais la sécurité, la base de données ni les fonctionnalités existantes (voir §3 et §9).
4. Travaille par petits changements vérifiés (build, test navigateur, test SQL), puis commit.

---

## 1. LE MÉTIER ET LE PROPRIÉTAIRE

- **DHB** : micro-entreprise **individuelle** (une seule personne) de **services informatiques**, basée en Île-de-France, intervention **sur site en Île-de-France** (priorité au nord de Paris : Saint-Denis, Saint-Ouen, Aubervilliers, Épinay-sur-Seine, Pantin) et **à distance partout en France**.
- Trois activités / marques :
  - **DHB Groupe** : vitrine institutionnelle qui présente les deux activités.
  - **DHB Pro** : infogérance, maintenance, dépannage, cybersécurité, sauvegarde, messagerie cloud pour **entreprises** (TPE, PME, cabinets, commerces, associations). **Pas de prix affichés : tout se fait sur devis.**
  - **DHB Assistance** (ex « DHB Particuliers ») : dépannage et accompagnement pour **particuliers** (ordinateur, virus, box/Wi-Fi, photos, smartphone, aide aux proches/seniors). **Prix affichés** : intervention ponctuelle (dès **59 €**) et abonnement sérénité (dès **14,90 €/mois**), modifiables depuis le back-office.
- Statut fiscal : **micro-entreprise en franchise de TVA** → toutes les factures/devis portent « TVA non applicable, art. 293 B du CGI ». Aucune TVA calculée.
- Le propriétaire n'est pas développeur : les explications doivent être simples, pas à pas, sans jargon.

---

## 2. RÈGLES ABSOLUES (NON NÉGOCIABLES)

1. **Zéro invention** : aucun faux avis, faux chiffre, fausse certification, faux partenaire, fausse statistique, fausse adresse, faux SIRET. Toute information manquante est marquée exactement `[À COMPLÉTER PAR LE PROPRIÉTAIRE]` (ou `[EXEMPLE]` pour une valeur provisoire : téléphone, emails, domaines).
2. **Prix uniquement côté particuliers.** Côté entreprises : devis uniquement.
3. **Franchise de TVA** respectée partout (devis, factures, aperçus, PDF).
4. **Jamais de donnée fiscale inventée** (SIRET, TVA intracom, IBAN, mentions légales : laissés vides avec « À compléter » tant que non renseignés dans Système → Paramètres).
5. **Clé secrète Supabase jamais dans le dépôt ni dans le front** : seulement la clé *publishable*. La clé secrète (`sb_secret_…`) reste dans les secrets Supabase.
6. **Ne pas casser** : Supabase Auth, RLS, rôles admin/collaborateur, permissions, sécurité des devis publics (jetons), Edge Functions. Un collaborateur ne doit **jamais** obtenir des droits qu'il n'a pas.
7. **Style** : abandon définitif du « cyber néon / futuriste / gaming ». Rendu **professionnel, premium, sobre, rassurant, façon SaaS moderne**. **Pas de logo graphique** (le propriétaire a rejeté tous les logos) : simple wordmark « DHB » + étiquette de marque.
8. Pas d'émojis dans les sites publics (icônes SVG).

---

## 3. ARCHITECTURE GLOBALE

```
DHB-/
├─ sites/
│  ├─ groupe/          → DHB Groupe (HTML statique généré)
│  ├─ infogerance/     → DHB Pro (HTML statique généré) — source des assets communs
│  └─ particuliers/    → DHB Assistance (HTML statique généré)
├─ build/              → générateurs Python (aucune dépendance externe)
│  ├─ marque.py        → identité commune : barre inter-sites, en-tête, pied, cookies, scripts
│  ├─ base.py, build.py, pages_*.py, *_data.py   → site Pro
│  ├─ groupe/build_groupe.py
│  ├─ particuliers/build_particuliers.py (+ aide_data.py)
│  └─ build_all.py     → régénère les 3 sites + synchronise CSS/JS communs
├─ admin-react/        → back-office (Vite + React 18 + TypeScript + Refine + Ant Design)
├─ supabase/
│  ├─ full-setup.sql   → schéma complet, idempotent (relançable)
│  ├─ functions/       → Edge Functions (Deno) + _shared/securite.ts
│  └─ README-SETUP.md, STRIPE-SETUP.md
├─ docs/REFONTE.md     → audit, navigation, design system, mesure d'audience
├─ start.bat           → lanceur Windows (génère les sites + serveur + back-office)
```

- **Sites publics** : HTML/CSS/JS statiques (pas de framework), générés par Python. Un seul `style.css` et un seul `main.js` (source : `sites/infogerance/assets`, copiés dans les deux autres sites par `build_all.py`). La « personnalité » de chaque site passe par `<body data-site="groupe|pro|assistance">`.
- **Back-office** : application monopage React, hébergée à part (Vercel/Netlify), qui parle directement à Supabase.
- **Backend** : Supabase = PostgreSQL + Auth + Row Level Security + Realtime + Edge Functions (Deno).
- Clé publique + URL Supabase dans `sites/*/assets/js/supabase-config.js` et `admin-react/.env` (URL `https://yjnaxzlvuwrvyyqxnvgn.supabase.co`, clé `sb_publishable_16JlSXS7tzUjlgGAQsmr8w_ZCIRTkSE`).

Lancer en local : `start.bat` (Windows) ou `python3 build/build_all.py` + `python3 -m http.server 8000` (sites sur `http://localhost:8000/sites/<site>/`) + `cd admin-react && npm install && npm run dev` (`http://localhost:5173`). Pour des liens inter-sites vers les vrais domaines : `DHB_LIENS=prod python3 build/build_all.py`.

---

## 4. LES TROIS SITES PUBLICS

### 4.1 Identité commune (build/marque.py + style.css)
- **Barre supérieure inter-sites** : « DHB Groupe · DHB Pro · DHB Assistance » (site courant souligné) + téléphone.
- **En-tête** : wordmark « DHB » + étiquette (GROUPE / PRO / ASSISTANCE), navigation avec menus déroulants, bouton d'appel à l'action, (téléphone visible dans l'en-tête sur Assistance), burger + menu mobile.
- **Pied de page** : description, coordonnées, colonnes de liens, mention « [SIRET, forme juridique : À COMPLÉTER PAR LE PROPRIÉTAIRE] », liens vers les 2 autres sites, **« Gérer mes cookies »**.
- **Barre d'actions mobile** (≤ 720 px) : « Appeler » + bouton principal.
- **Bandeau cookies** : carte discrète, Refuser aussi simple qu'Accepter, clé `localStorage` `dhb-cookie-consent` (`accepted`/`refused`).
- **Bandeau d'annonce** `data-setting="annonce"` (texte éditable depuis le back-office).
- Accessibilité : lien « Aller au contenu », contrastes, focus visibles, `aria-*`.

### 4.2 Design system public
- Tokens CSS (couleurs, rayons, ombres légères, espacements) + alias historiques. Polices : Inter (corps) ; **Newsreader** (serif) pour Groupe ; **Nunito** (titres arrondis) pour Assistance.
- Composants : boutons (`btn--primary/outline/ghost/dark/lg/block`), cartes, `icon-box`, piliers, grilles, étapes (`steps`, `steps--3`), listes à coches, FAQ (`details.faq-item`), formulaires, `cta-band`, `breadcrumb`, `page-hero`, articles (`article-body`, `toc`, `related`), zone (`zone`, `chips`, `zone-box`), offres (`offer`, `offer--main`, `price-tag`, `price-chip`), `avis-vide`, `a-completer` (surligne les champs à compléter).
- **Personnalités** :
  - `groupe` : institutionnel, marine `#1B2E4F`, accent doré `#B08D57`, titres serif, hero sombre.
  - `pro` : B2B, expertise, bleu `#2450D3`, hero clair avec **formulaire de devis visible dès l'écran d'accueil**.
  - `assistance` : grand public, teal `#0F766E`, texte plus grand (18 px), formes plus rondes, prix en avant.
- Responsive : points de rupture 1040 px et 720 px, aucun débordement horizontal.

### 4.3 DHB Groupe (5 pages)
Accueil (hero institutionnel, 2 cartes d'activités DHB Pro / DHB Assistance, « Notre approche » = 4 valeurs : proximité, clarté, transparence, prévention, zone d'intervention, FAQ courte, CTA), Le groupe, Contact, Mentions légales, Politique de confidentialité. JSON-LD `Organization` + sous-organisations. Page `devis.html` = **page publique de signature de devis** (autonome, style propre, ne pas casser).

### 4.4 DHB Pro (≈134 pages)
- Accueil : hero + formulaire de devis, 3 piliers, services (infogérance mise en avant), « Pourquoi DHB » (engagements + témoignages **vides à compléter**, jamais inventés), méthode en étapes, problèmes fréquents, zone (chips, Nord 93 prioritaire), 3 articles de blog, FAQ (5 questions + JSON-LD), CTA, JSON-LD LocalBusiness.
- **7 pages services** : infogérance globale, maintenance du parc, dépannage/assistance, cybersécurité, sauvegarde & restauration, supervision/monitoring, messagerie cloud.
- **84 pages « pannes fréquentes »** (problèmes → causes → solution → quand appeler).
- **13 pages zones** (Saint-Denis, Saint-Ouen, Aubervilliers, Épinay, Pantin, Paris, Nanterre, Boulogne-Billancourt, Argenteuil, Montreuil, Créteil, Versailles + « support à distance France »).
- **~20 articles de blog** (sécurité, sauvegarde, RGPD, phishing, ransomware, Microsoft 365 vs Google Workspace, etc.) + index.
- Pages : À propos, Contact, Plan du site, 404, Mentions légales, Confidentialité ; guide PDF « checklist sécurité PME » (lead magnet).
- SEO : balises title/description/canonical/OG par page, JSON-LD (LocalBusiness, FAQPage, Article…), `sitemap.xml`, `robots.txt`.

### 4.5 DHB Assistance (31 pages)
- Accueil : hero (promesse + prix en pastilles + carte « Pourquoi on nous appelle »), 6 services (icônes SVG), formules (abonnement « Le plus serein » / intervention), « Comment ça marche » en 3 étapes, aperçu du centre d'aide + guide gratuit anti-arnaques (PDF), zone d'intervention, avis (vide, à compléter), FAQ (JSON-LD), formulaire de contact.
- **Centre d'aide** : 22 fiches (recherche, filtres par catégorie : ordinateur, internet/box/Wi-Fi, sécurité, données/photos, email, mobile, impression, conseil), chacune avec symptôme, causes, ce que vous pouvez essayer, « on peut s'en occuper », FAQPage JSON-LD.
- Pages : Abonnement & tarifs (+ FAQ), Contact, À propos, Mentions légales, Confidentialité, **paiement réussi / paiement annulé** (retours Stripe).
- Prix lus en direct depuis Supabase : `<span data-setting="abonnement_prix">` / `intervention_prix` (la valeur HTML statique sert de repli).
- Paiement en ligne Stripe (Checkout) via Edge Function `create-checkout`, activé par `window.DHB_STRIPE.enabled` ; sinon le bouton mène au formulaire.

### 4.6 Comportement JavaScript commun (main.js)
- Menu burger / menu mobile, menus déroulants.
- **Formulaires `form[data-demo-form]`** : envoi par `insert` dans la table `leads` (publishable key, autorisé par RLS en insertion seulement) avec `entity`, `type` (`devis` / `question`), nom, entreprise, email, téléphone, message, service, `source_url` (chemin + UTM/gclid de la session). Message de confirmation, erreurs en français, mode démo si Supabase non configuré.
- Paramètres éditables `[data-setting]` (prix, annonce) lus depuis la table `settings` par entité.
- Bandeau cookies et « Gérer mes cookies ».
- Un déclencheur d'événement `dhb:consent` alimente le suivi.

---

## 5. MESURE D'AUDIENCE (GA4, conforme RGPD)

Fichier `assets/js/suivi.js` (copié dans les 3 sites). **Rien n'est chargé ni envoyé avant le clic « Accepter »** ; retrait possible via « Gérer mes cookies ». IP anonymisées, aucune donnée publicitaire. Identifiant à renseigner : `GA_ID = 'G-XXXXXXXXXX'` (+ liste `DOMAINES` pour le suivi inter-sites).
Événements : `click_phone` (emplacement), `click_email`, `click_cta`, `begin_checkout` (offre), `click_autre_site_dhb`, `form_start`, **`generate_lead`** (conversion), `faq_ouverte`, `scroll_profondeur` (25/50/75/90 %). À marquer comme conversions dans GA4 : `generate_lead`, `click_phone`. Les politiques de confidentialité mentionnent GA4. Search Console à lier à la propriété.

---

## 6. BACK-OFFICE (admin-react)

### 6.1 Technique
Vite 5 + React 18 + TypeScript, **Refine 4** (`@refinedev/core`, `@refinedev/supabase`, router react-router-v6), **Ant Design 5**, **Recharts**, dayjs. Mise en page **personnalisée** (pas de layout Refine). Listes paginées côté serveur, **filtres dans l'URL** (`useUrlState`), `keepPreviousData`, cache 30 s (`staleTime`), `liveMode` désactivé globalement (activé seulement sur les listes demandes/tickets). `base` configurable par `VITE_BASE`. Variables : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (clé publique), `VITE_SIGN_BASE` (URL de `devis.html`).
Code : `src/lib/` (format, statuts, metrics, hooks, document, functions), `src/providers/` (auth, accès), `src/components/{layout,ui,forms,documents,activity}`, `src/pages/...`, `src/theme.ts`, `src/styles.css`.

### 6.2 Design system du back-office
Clair et professionnel : fond `#F5F7FA`, bleu primaire `#2450D3`, police Inter, couleurs sémantiques (succès vert, attention orange, danger rouge, info bleu clair, violet), **étiquettes de statut à ton cohérent partout** (`StatusTag`, référentiel unique `statuts.ts`), pas de lueur/néon/ombres lourdes, états vides explicatifs avec action suivante, squelettes de chargement, micro-interactions discrètes, ARIA, responsive complet (menu en tiroir, listes en cartes sur mobile).

### 6.3 Navigation (barre latérale repliable, mémorisée)
- **Tableau de bord**
- **Commercial** : Demandes (leads, badge), Clients, Devis, Prestations
- **Facturation** : Factures, Paiements, Abonnements
- **Support** : Tickets (badge), Questions reçues (badge)
- **Pilotage** : Statistiques, Chiffre d'affaires, Récurrent (MRR/ARR), Performance
- **Contenu** : Prix & bandeau
- **Système** : Utilisateurs, Paramètres, Sécurité, Journal d'activité
En-tête : fil d'Ariane, **recherche globale Ctrl+K** (clients, demandes, devis, factures, tickets), menu « Créer » (nouvelle demande/client/devis/facture/ticket…), menu utilisateur (rôle, déconnexion).

### 6.4 Écrans
- **Tableau de bord** : KPIs sur données réelles (encaissé du mois avec variation *seulement si le mois précédent > 0*, encaissé de l'année, MRR, à encaisser + nombre en retard…), **« À faire aujourd'hui » cliquable** (tickets urgents, factures en retard, relances de prospects dues, devis à relancer, abonnements à facturer/à renouveler), activité récente. Chaque carte mène à la page concernée.
- **Demandes (leads)** : onglets (À traiter / par statut / Toutes), filtres (recherche, priorité, entité, type de client, relance due), tri, statut modifiable en ligne (mise à jour instantanée), priorité, relance, conversion **demande → client** (lien `lead_id`), création de devis depuis la demande. Fiche : informations, notes, devis liés, historique d'activité. Statuts : **Nouveau, À contacter, Contacté, Devis à préparer, Devis envoyé, Gagné, Perdu, Archivé**. Un onglet « Questions reçues » pour les demandes de type `question`.
- **Clients (CRM)** : onglets Clients / Prospects / Inactifs / Archivés, fiche complète (coordonnées, SIRET, adresse, CA encaissé/facturé, devis, factures, tickets ouverts, abonnements, notes, historique), actions rapides (créer devis/facture/ticket, appeler, écrire), archivage.
- **Devis** : éditeur partagé (lignes depuis le **catalogue de prestations** ou libres, remises, total auto, conditions, validité), statuts (Brouillon, Envoyé, Accepté, Refusé, Expiré), **duplication, aperçu, impression/PDF, envoi par email, lien de signature en ligne, conversion en facture**, préremplissage depuis `?client`, `?lead`, `?dupliquer`.
- **Prestations** : catalogue (libellé, description, unité, prix, actif).
- **Factures** : brouillon / envoyée / payée / annulée, échéance, **en retard** (envoyée + échéance dépassée), paiements partiels, reste à payer, conversion depuis devis, facture récurrente d'abonnement, aperçu/impression, envoi email, mentions issues de la fiche entreprise, **jamais de donnée fiscale inventée**.
- **Paiements** : liste, enregistrement (virement, carte, prélèvement, chèque, espèces, Stripe, autre) ; une facture passe **automatiquement à « payée »** quand la somme des paiements ≥ total (date = dernier paiement) et se **rouvre** si on supprime un paiement.
- **Abonnements** : statuts Actif/Suspendu/Résilié, périodicité, prochaine facturation, alertes (facture à générer, renouvellement proche, impayé), génération des factures récurrentes.
- **Tickets** : statuts Ouvert/En cours/Résolu/Fermé, priorité, **responsable**, client lié, fil de **commentaires**, dates de résolution/fermeture automatiques.
- **Pilotage** : Statistiques (vue d'ensemble), Chiffre d'affaires (mensuel, par période : année / 12 mois / depuis le début), Récurrent (MRR/ARR, actifs, résiliés), Performance commerciale (entonnoir, taux de conversion demandes → clients, délais).
- **Contenu → Prix & bandeau** : modifie les prix affichés sur le site Assistance et le bandeau d'annonce (table `settings`, **admin seulement**).
- **Système** : Utilisateurs (liste, invitation par email, rôles, tableau des permissions), Paramètres (**fiche entreprise** : raison sociale, forme juridique, SIRET, TVA intracom, adresse, email, téléphone, site, IBAN/BIC, délai de paiement, validité des devis, conditions de devis, mentions de facture, pénalités de retard — **admin seulement**), Sécurité (état des protections), Journal d'activité (lecture seule).
- Page de connexion (erreurs en français, mot de passe oublié), page 404.

### 6.5 Règles de calcul (source unique : `lib/metrics.ts`)
- **CA encaissé** = factures *payées* datées de `paid_at` (sinon `date_facture`). **CA facturé** = factures envoyées/payées.
- **Variation** affichée uniquement si la période précédente est > 0.
- **En retard** = statut *envoyée* et échéance < aujourd'hui.
- **MRR** = somme des abonnements actifs ramenée au mois ; **ARR** = MRR × 12.
- Aucun chiffre inventé : un indicateur non calculable est masqué ou affiche « — ».

---

## 7. BASE DE DONNÉES (Supabase / PostgreSQL)

Script unique idempotent : `supabase/full-setup.sql` (relançable sans risque ; bloc « REFONTE v2 » = évolutions additives).

**Tables** : `leads`, `clients`, `devis` (+ `devis_compteurs`), `factures` (+ `facture_compteurs`), `paiements`, `abonnements`, `tickets`, `prestations`, `notes`, `activites`, `entreprise` (ligne unique id=1), `settings` (prix/annonce par entité), `profiles` (rôle admin/collaborateur).
**Vues** (`security_invoker`) : `clients_vue` (CA encaissé/facturé, nb devis/factures, tickets ouverts, dernière activité), `factures_vue` (échéance effective, montant payé, reste à payer, en retard).
**Déclencheurs** : type de client auto sur les demandes, `paid_at` des factures, solde automatique des factures par paiements (insertion/suppression), dates de résolution/fermeture des tickets, **journal d'activité** (`log_activite`, security definer) sur leads/clients/devis/factures/paiements/abonnements/tickets/notes, numérotation sécurisée `next_devis_numero` / `next_facture_numero` (format `DEV-2026-0001`, `2026-0001`).
**Realtime** activé sur `activites` (et utilisé sur demandes/tickets).
**RLS** : lecture/insertion/modification pour tout utilisateur authentifié ; **suppression réservée à l'admin** (`is_admin()`) ; `settings` et `entreprise` modifiables **par l'admin uniquement** ; `leads` : **insertion anonyme autorisée** (formulaires publics), lecture/gestion authentifiée ; `activites` en lecture seule ; `profiles` : un utilisateur ne peut pas changer son propre rôle (`my_role()`). Les compteurs de numérotation ne sont plus modifiables par les anonymes. Clés étrangères en `NOT VALID` pour ne pas casser l'existant.
**Rôles** (lot 1) : inscription libre désactivée ; tout nouveau compte est `en_attente` (aucun accès) ; seul un admin invite ou valide (`invite-user`, page Utilisateurs) ; premier admin désigné par `select public.definir_admin('email')` dans le SQL Editor ; toutes les règles internes utilisent `is_staff()` ; il reste toujours au moins un admin. `collaborateur` (créent/modifient, **ne suppriment rien**, ne changent ni les prix, ni la fiche entreprise, ni les rôles).

---

## 8. EDGE FUNCTIONS (Deno, `supabase/functions/`)

Socle partagé `_shared/securite.ts` : CORS, `requireUser` (vérifie le jeton, lit le rôle), `requireCronOrUser` (en-tête `x-cron-secret` = `CRON_SECRET`), échappement HTML, envoi d'email via **Resend**, marque par entité, erreurs propres. Déployer avec `--no-verify-jwt` (elles vérifient elles-mêmes).

| Fonction | Rôle | Accès |
|---|---|---|
| `get-devis-public` | renvoie un devis par **jeton** (+ conditions + émetteur public) | public (jeton) |
| `sign-devis` | signature en ligne (refusée si refusé/expiré/validité dépassée) | public (jeton) |
| `send-devis` | envoie le devis par email, génère le lien de signature, statut « envoyé » | utilisateur connecté |
| `send-invoice` | relit la facture en base, l'envoie **uniquement** à l'email du client, statut « envoyée » | utilisateur connecté |
| `generate-recurring-invoices` | crée les factures d'abonnement dues (échéance depuis la fiche entreprise) | cron ou utilisateur |
| `send-reminders` | relances de factures en retard et de devis > 7 jours (anti-doublon) | cron ou utilisateur |
| `invite-user` | invite un collaborateur par email + profil | **admin** |
| `notify-new-lead` | notifie une nouvelle demande (HTML échappé, `WEBHOOK_SECRET` optionnel) | webhook |
| `create-checkout` | session Stripe Checkout pour l'abonnement/l'intervention | public |

**Secrets** : `CRON_SECRET`, `SIGN_BASE`, `ADMIN_URL`, `RESEND_API_KEY`, `NOTIFY_FROM`, `NOTIFY_TO`, `WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ABO`, `STRIPE_PRICE_INT`, `SITE_URL` (+ `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` fournis par Supabase). **Jamais dans le front.** Planification quotidienne via `pg_cron` + `net.http_post` avec l'en-tête `x-cron-secret` (exemples dans `admin-react/README.md`).

---

## 9. SÉCURITÉ (À NE JAMAIS RÉGRESSER)

- Clé *publishable* seule côté navigateur ; clé secrète/service role uniquement en secrets serveur.
- RLS activée sur toutes les tables ; suppression = admin ; collaborateur plafonné (vérifié par tests SQL par rôle).
- Devis publics protégés par **jeton aléatoire non devinable** ; pas d'énumération.
- Edge Functions : authentification explicite, pas d'appel anonyme sauf pages publiques à jeton.
- Échappement HTML dans les emails, envoi uniquement à l'adresse du client enregistrée.
- Consentement cookies avant tout traceur ; politique de confidentialité à jour.
- Contrôle d'accès **aussi** côté interface (menus et boutons masqués selon le rôle) — mais la vraie protection est la RLS.

---

## 10. TESTS DÉJÀ RÉALISÉS (à refaire après toute modification)

- Back-office (Playwright + faux Supabase en mémoire) : 61 vues desktop + mobile sans erreur ni débordement ; jeu de données vide : 27 vues ; 16 parcours (recherche Ctrl+K, création de devis avec catalogue et validation, paiement du solde, conversion demande→client, menu Créer, tiroir mobile, aucune erreur JS) ; audit de clics sur 18 pages (aucun rechargement ou navigation imprévus).
- SQL (PostgreSQL 16 local avec shim Supabase) : script rejoué 3 fois sans erreur ; tests par rôle (collaborateur ne supprime pas, ne s'élève pas, ne modifie pas l'entreprise) ; paiements → facture payée/rouverte.
- Edge Functions : type-check `deno check` des 9 fonctions.
- Sites : génération des 3 sites, **0 lien cassé**, captures desktop/mobile sans débordement ni erreur JS ; suivi GA4 testé (aucune requête avant consentement ni après refus ; événements après acceptation).
- **Non testé en réel** : emails (Resend), Stripe, planifications cron, GA4 avec un vrai identifiant, envoi réel de formulaire vers la vraie base.

---

## 11. CE QUI RESTE À COMPLÉTER PAR LE PROPRIÉTAIRE

Tous les `[À COMPLÉTER PAR LE PROPRIÉTAIRE]` / `[EXEMPLE]` : téléphone, emails, domaines, SIRET, forme juridique, hébergeur, histoire du groupe, avis clients **vérifiés**, frais de déplacement, grille tarifaire détaillée, moyens de paiement, durées de conservation (RGPD/GA4), fiche entreprise (IBAN, mentions de facture, pénalités), identifiant GA4, secrets Edge Functions, création de la propriété GA4 et de la Search Console.

---

## 12. PROCÉDURE DE MISE EN SERVICE

1. Supabase → SQL Editor → exécuter `supabase/full-setup.sql`.
2. Supabase → Authentication : désactiver l'inscription libre, créer son compte, puis `select public.definir_admin('email')` dans le SQL Editor.
3. Déployer les Edge Functions (`--no-verify-jwt`) et définir les secrets.
4. `python3 build/build_all.py` (`DHB_LIENS=prod` pour la production), publier `sites/*` sur trois domaines, builder `admin-react` (`npm run build`) et le déployer (réécriture de toutes les URL vers `index.html`).
5. Renseigner `GA_ID`, les domaines réels, la fiche entreprise, les prix.
6. Planifier les crons (factures récurrentes, relances).

---

## 13. MÉTHODE DE TRAVAIL ATTENDUE

> **Depuis le 23/10/2026, la méthodologie permanente est `docs/METHODOLOGIE.md`** (chercher
> une solution existante avant de développer, build vs buy, source de vérité, rapport avant
> développement, amélioration continue, limites de l'autonomie, sécurité défensive sur la base
> de test, anti-duplication, méthode en 10 étapes avec **arrêt après chaque lot**). Elle prime
> sur les points ci-dessous en cas de différence.

- Branche de travail : `claude/dhb-website-design-ju4n5r` (seule branche du dépôt, pas de PR). Commits clairs ; ne jamais mettre d'identifiant de modèle dans les commits.
- Après chaque modification : build (`npm run build`, `python3 build/build_all.py`), contrôle des liens, test navigateur (desktop **et** mobile), test SQL si la base change, vérification des permissions.
- Toute nouvelle fonctionnalité doit : respecter les règles du §2, réutiliser le design system (§4.2, §6.2) et le référentiel de statuts, rester **additive** pour la base (jamais de suppression destructrice), et être documentée dans `docs/REFONTE.md` / README.
- En cas de doute sur une donnée métier ou fiscale : **ne pas inventer, demander**.
