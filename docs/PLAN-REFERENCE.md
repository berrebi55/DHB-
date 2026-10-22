# DHB — PLAN DE RÉFÉRENCE DU PROJET

> Document unique de pilotage. Il contient l'**audit initial complet** (réalisé une seule
> fois, le 22/10/2026), la **cartographie des problèmes**, l'**architecture cible**, le
> **plan par lots** et le **journal d'avancement**. Il remplace `PLAN-PLATEFORME.md`.
>
> Méthode : AUDIT INITIAL → PLAN → UN LOT À LA FOIS (tests ciblés, rapport) → AUDIT FINAL.
> Aucun nouvel audit global avant la fin : chaque lot n'analyse que ses fichiers et
> dépendances directes, puis met à jour la section 6 de ce document.

---

## 1. Audit initial — méthode et périmètre

Tout ce qui suit a été **mesuré** (scripts, base de test, navigateur), pas supposé.

| Domaine | Comment |
|---|---|
| Base, RLS, Auth | `full-setup.sql` rejoué sur PostgreSQL 16 local (shim Supabase) ; lecture de `pg_policies`, droits, fonctions ; **scénarios réels** simulés (inconnu inscrit, visiteur anonyme) |
| Edge Functions | lecture des 9 fonctions + `deno check` (9/9 OK) |
| Back-office | build Vite, TypeScript strict (0 erreur), 61 vues desktop/mobile, 16 parcours, 8 scénarios de panne, audit de clics (18 pages) |
| Sites | 170 pages : liens (0 cassé), SEO automatique (titres, descriptions, H1, canonical, OG, JSON-LD, sitemap), poids réel |
| Accessibilité | **axe-core 4.10** (WCAG 2 A/AA + bonnes pratiques) sur 11 pages publiques et 10 écrans du back-office |
| Dépendances | `npm audit` |
| Limite | la **vraie** base Supabase n'est pas joignable depuis l'environnement de développement : tout ce qui touche à elle est vérifié sur la base de test, à confirmer chez le propriétaire |

---

## 2. Diagnostic

### 2.1 Ce qui fonctionne (stable — à ne pas toucher sans raison)

- **Sites publics** : 3 identités, 170 pages, formulaires → `leads`, prix éditables, consentement cookies + GA4 conditionnel, poids très faible (~8 Ko HTML + 8 Ko CSS + 13 Ko JS compressés).
- **Back-office** : CRM (demandes, clients, devis, factures, paiements, abonnements, tickets), pilotage, journal ; responsive ; erreurs visibles, délais maximaux, chargement à la demande (lot 0).
- **Logique métier en base** : numérotation sécurisée des devis/factures, solde automatique des factures par les paiements, journal d'activité, vues de calcul.
- **Edge Functions** : authentification explicite, jetons de devis aléatoires (122 bits), emails échappés, envoi uniquement à l'adresse du client.
- **Ne surtout pas modifier sans nécessité** : `sites/groupe/devis.html` (signature publique), fonctions `next_*_numero`, triggers `paiements_solder_facture` / `log_activite`, `_shared/securite.ts`, référentiel `lib/statuts.ts`, règles de calcul `lib/metrics.ts`.

### 2.2 Ce qui est fragile ou faux (détails en §3)

- **Contrôle d'accès** : toutes les règles RLS autorisent **tout utilisateur connecté**, sans vérifier qu'il fait partie de l'équipe.
- **Demandes publiques** : un anonyme peut fixer le statut, la priorité, le client lié ; aucune protection anti-robot.
- **Pas de sauvegarde** (plan Supabase gratuit) ni de sauvegarde indépendante.
- **Factures émises supprimables en base** par un admin (l'interface ne le propose pas).
- **Accessibilité** : contrastes insuffisants (3 couleurs), filtres sans libellé.

### 2.3 Incomplet / manquant

PDF générés côté serveur, stockage de documents, webhook Stripe (paiements en ligne non enregistrés), attribution des demandes, modèles et historique d'emails, automatisations configurables, intégrations Google, page Intégrations, sauvegardes.

### 2.4 Dupliqué / inutile

- ✅ supprimé au lot 0 : ancienne admin `admin/`, `schema.sql`, `settings.sql`.
- Restant : code d'envoi d'email réparti dans 4 fonctions (à centraliser au lot Communication) ; règles de relance codées en dur dans `send-reminders` (à migrer au lot Automatisations) ; UTM concaténés dans `source_url` (lot CRM).

---

## 3. Cartographie des problèmes

### 🔴 CRITIQUE

| ID | Problème | Preuve | Conséquence |
|---|---|---|---|
| **C1** | Toute personne qui **s'inscrit elle-même** (API publique d'inscription, ouverte par défaut dans Supabase) obtient le rôle `collaborateur` et **lit et modifie tout le CRM** | test SQL : compte inconnu → rôle `collaborateur`, lit 2 clients, modification acceptée | fuite de données clients, falsification |
| **C2** | Rejouer `full-setup.sql` donne le rôle **admin** à tout compte existant sans profil (bloc « rattrapage ») | lecture du script | élévation de privilèges si un compte inconnu existe |
| **C3** | **Aucune sauvegarde** des données (plan gratuit) | réponse du propriétaire + doc Supabase | perte définitive possible |

> **Action immédiate sans code (C1)** : Supabase → Authentication → Sign In / Providers → **désactiver « Allow new users to sign up »**. Le lot 1 corrige ensuite la cause dans le code (défense en profondeur).

### 🟠 IMPORTANT

| ID | Problème |
|---|---|
| I1 | Un anonyme peut créer une demande avec statut « Gagné », priorité « Urgente », client lié → statistiques faussées (test SQL) |
| I2 | Aucune protection anti-robot sur les formulaires publics (spam → base + emails) |
| I3 | `notify-new-lead` accepte des appels sans secret si `WEBHOOK_SECRET` n'est pas défini |
| I4 | Une facture **émise** peut être supprimée en base par un admin (obligation de numérotation continue) ; suppression → paiements supprimés en cascade |
| I5 | Supprimer un client efface définitivement ses **notes** (cascade) |
| I6 | Contrastes insuffisants : 202 éléments (back-office) + 45 (sites) ; 3 couleurs en cause (`#8a93a3`, `#98a2b3`, barre supérieure `#6f7e96`, doré `#b08d57`) |
| I7 | 16 champs de filtre sans libellé accessible (back-office) |
| I8 | Paiements Stripe **jamais enregistrés** dans DHB (pas de webhook) |
| I9 | Pas de PDF serveur ni de stockage de documents |
| I10 | Attribution des demandes absente (source, UTM, gclid en colonnes) |
| I11 | SEO : 105 titres trop longs (Pro), pas d'`og:image` exploitable (3 sites), pas de 404 (Groupe, Assistance), 22 fiches d'aide sans fil d'Ariane structuré, pages de paiement indexables |
| I12 | Google Fonts chargées depuis Google : seule ressource bloquante des sites + transfert d'IP (RGPD) |

### 🟡 AMÉLIORATION

| ID | Problème |
|---|---|
| A1 | Vite 5 (dev) : avis de sécurité « high » limité au serveur de développement ; react-router : avis « moderate » (non exploitable ici) |
| A2 | Pas d'ESLint configuré |
| A3 | Panneaux secondaires (journal, notes, catalogue, badges) : une erreur s'affiche comme « vide » |
| A4 | Ordre des titres (h1→h3) : 13 occurrences |
| A5 | Liens dans le texte distingués seulement par la couleur (7) ; contenu hors repères (11) |
| A6 | Tableau de bord : agrégats calculés dans le navigateur (OK au volume actuel) |
| A7 | Descriptions trop longues (68 pages Pro) |

### 🟢 FUTUR

Campagnes email, Google Business Profile (accès Google requis), outils interactifs / lead magnets supplémentaires, ROI par source avancé, notifications SMS/WhatsApp.

---

## 4. Architecture cible

### 4.1 Principe

Une action dans DHB s'enregistre immédiatement en base. Tout effet externe (email, Google, Drive, GA4 serveur, automatisations) passe par une **file d'événements** traitée par une Edge Function planifiée, avec statut, tentatives, prochaine tentative et erreur lisible. **Une intégration en panne n'empêche jamais d'utiliser le CRM** (« Synchronisation en attente » + Réessayer).

### 4.2 Données — réutiliser avant de créer

| Besoin | Réutilise | Ajout nécessaire (uniquement si besoin réel) |
|---|---|---|
| Rôle « en attente » | `profiles.role` | valeur `en_attente` + fonction `is_staff()` |
| Timeline client | `activites` + `notes` | types d'activité supplémentaires (email, appel, document, synchro) |
| Attribution | `leads` | colonnes `source`, `utm_source/medium/campaign`, `gclid`, `referrer`, `landing_page`, `ga_client_id` |
| Configuration non secrète | `settings` (par entité) | — (clés `ga_measurement_id`…) |
| Documents | — | table `documents` + bucket Storage privé |
| Emails | — | `email_modeles`, `emails` |
| Automatisations / file | — | `evenements`, `automatisations`, `automatisation_runs` |
| Intégrations | — | `integrations` (statut, dernière synchro, erreur), `integration_logs`, `integration_credentials` (sans politique RLS : serveur uniquement) |
| Chiffres Google | — | `analytics_quotidien`, `seo_quotidien` (+ requêtes/pages) |
| Sauvegardes | — | `sauvegardes` |
| Drive par client | `clients` | colonnes `drive_folder_id`, `drive_folder_url`, `drive_sync_statut`, `drive_cree_le` |

### 4.3 Edge Functions

Existantes conservées : `get-devis-public`, `sign-devis`, `send-devis`, `send-invoice`, `invite-user`, `generate-recurring-invoices`, `send-reminders`, `notify-new-lead`, `create-checkout`.
À créer, chacune dans son lot : `stripe-webhook`, `render-pdf`, `email-send`, `worker`, `google-oauth`, `google-sync`, `integration-test`, `backup-status`.

### 4.4 Frontend

- Back-office : nouvelles entrées de menu **uniquement quand la fonctionnalité existe** (pas de menu vers une page vide) : Communication ; Pilotage → Acquisition, SEO ; Système → Intégrations, Sauvegardes.
- Sites : attribution (captation UTM/gclid/referrer), dictionnaire d'événements GA4, SEO technique.

### 4.5 Contraintes externes connues

Drive via OAuth (compatible Gmail et Workspace ; application Google « en production » sinon expiration à 7 jours) ; Search Console : données à J-2/J-3 ; Business Profile : accès à demander à Google ; Resend : domaine à vérifier (domaines pas encore achetés) ; Supabase gratuit : pas de sauvegarde téléchargeable.

---

## 5. Plan par lots

Ordre adapté à l'audit : la **sécurité critique** (C1, C2) et la **sauvegarde** (C3) passent avant l'interface. Chaque lot : fichiers ciblés, tests ciblés, rapport, mise à jour du §6. On ne passe au lot suivant que si le lot courant est stable.

| Lot | Contenu | Problèmes | Dépendances / impacts à tester | Configuration propriétaire |
|---|---|---|---|---|
| **0** ✅ | Stabilité du chargement | — | — | — |
| **1** | **Sécurité des accès et des données** : rôle `en_attente` + `is_staff()` dans toutes les règles ; rattrapage sans élévation ; `invite-user` attribue le rôle ; écran « accès en attente » ; demandes publiques : colonnes imposées par un trigger + champ piège anti-robot ; factures émises non supprimables ; `notify-new-lead` : secret obligatoire | C1, C2, I1, I2, I3, I4 | connexion admin/collab, invitation, formulaires publics des 3 sites, création/suppression devis-factures-paiements, journal, statistiques | Désactiver l'inscription libre ; relancer `full-setup.sql` |
| **2** | **Sauvegarde indépendante** : GitHub Actions nocturne (`pg_dump` chiffré, 30 jours), table `sauvegardes`, page Système → Sauvegardes, procédure de restauration testée | C3 | aucune donnée modifiée | Secret GitHub `SUPABASE_DB_URL` + clé de chiffrement |
| **3** | **Accessibilité et cohérence UI** : couleurs de texte secondaire conformes, libellés des filtres, ordre des titres, liens soulignés | I6, I7, A4, A5 | rendu de toutes les pages (captures avant/après), axe-core | — |
| **4** | **CRM : attribution + timeline** : colonnes d'attribution, captation sur les sites, source modifiable, vue entonnoir ; timeline client complète (journal + notes + appels) ; suppression client → archivage par défaut | I10, I5 | formulaires publics, fiches client/demande, statistiques | — |
| **5** | **Tableau de bord commercial** : blocs Commercial, Clients, Finance (données existantes) ; bloc Acquisition = sources des demandes (lot 4), visiteurs ajoutés au lot 10 | — | pilotage, cache | — |
| **6** | **Documents** : `render-pdf` (devis/facture), bucket Storage privé, table `documents`, téléchargement depuis les fiches | I9 | devis, factures, envoi email | — |
| **7** | **Paiements Stripe** : `stripe-webhook` → paiement + facture payée + abonnement démarré | I8 | paiements, factures, abonnements | Webhook + secret `whsec_…` |
| **8** | **Communication** : `email-send` unique et journalisé, historique, modèles à variables, envoi manuel depuis client/demande/devis/facture/ticket | — | envois existants (devis, facture, relances) | Resend (domaine à vérifier ; en attendant : envoi vers sa propre adresse) |
| **9** | **Automatisations** : `evenements` + `worker`, règles SI → ALORS (bienvenue, relance devis J+5, rappel facture J+7, ticket résolu), migration de `send-reminders` | — | lots 6 à 8 | Planification (cron) |
| **10** | **Intégrations + Google Analytics** : page Système → Intégrations, connexion Google OAuth, dictionnaire d'événements, conversions serveur, copie quotidienne des chiffres, Pilotage → Acquisition | — | consentement, formulaires, sites | Projet Google Cloud, GA4, secret Measurement Protocol |
| **11** | **Google Drive** : dossier client + 8 sous-dossiers, copie des PDF, statut et reprise | — | clients, documents | même connexion Google |
| **12** | **Search Console** : synchronisation, Pilotage → SEO | — | — | domaines achetés + propriétés vérifiées |
| **13** | **SEO technique** : titres/descriptions, `og:image`, 404, fils d'Ariane, `noindex` paiement, polices auto-hébergées | I11, I12, A7 | 170 pages, sitemap, liens, GA | — |
| **14** | **SEO local + contenu** : pages utiles et distinctes (intention, mot-clé, FAQ, maillage) | — | sitemap, maillage | validation du contenu par le propriétaire |
| **15** | **Performance + dépendances** : mesure, Vite à jour, ESLint, agrégats SQL si nécessaire | A1, A2, A6 | build, tous les écrans | — |
| **16** | **Conversion** : lead magnets, outils interactifs | — | formulaires, GA | — |
| **17** | **Audit global final** | — | tout | — |

---

## 6. Journal d'avancement

### Lot 0 — Stabilité du chargement ✅ (commits `e0a3999`, `1c94b6a`)
- **Modifié** : Error Boundary page + panneau ; délai 25 s sur toutes les requêtes ; une seule politique de nouvelles tentatives (relances internes de la librairie désactivées) ; états d'erreur + Réessayer (listes, fiches, tableau de bord) ; cache partagé React Query ; pages chargées à la demande ; suppression de `@refinedev/antd` ; sites : `fetch` REST au lieu de `supabase-js` ; suppression des doublons.
- **Tests** : TypeScript 0 erreur ; build OK ; 61 vues ; 16 parcours ; 8 scénarios de panne (erreur 500, serveur muet → message en 25 s au lieu de 70 s+, fiche inexistante, fichier manquant, source en panne) ; formulaire public et prix (simulés).
- **Mesures** : JS initial back-office ~2,8 Mo → ~1,8 Mo.
- **À confirmer chez le propriétaire** : envoi d'un formulaire réel et affichage des prix sur la vraie base.

### Problèmes connus restants
Voir §3 (C1–C3, I1–I12, A1–A7).
