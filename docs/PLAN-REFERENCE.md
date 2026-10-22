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
| **1** ✅ | **Sécurité des accès et des données** : rôle `en_attente` + `is_staff()` dans toutes les règles ; rattrapage sans élévation ; `invite-user` attribue le rôle ; écran « accès en attente » ; demandes publiques : colonnes imposées par un trigger + champ piège anti-robot ; factures émises non supprimables ; `notify-new-lead` : secret obligatoire | C1, C2, I1, I2, I3, I4 | connexion admin/collab, invitation, formulaires publics des 3 sites, création/suppression devis-factures-paiements, journal, statistiques | Désactiver l'inscription libre ; relancer `full-setup.sql` |
| **2** ✅ | **Sauvegarde indépendante** : GitHub Actions nocturne (`pg_dump` chiffré, 30 jours), table `sauvegardes`, page Système → Sauvegardes, procédure de restauration testée | C3 | aucune donnée modifiée | Secret GitHub `SUPABASE_DB_URL` + clé de chiffrement |
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

### Lot 1 — Sécurité des accès et des données ✅ VALIDÉ (base de test)

**Modifié**
- Rôles : nouveau rôle `en_attente` (valeur par défaut) ; fonction `is_staff()` (admin ou collaborateur) ; suppression de la règle historique « premier compte = admin ».
- RLS : toutes les règles internes (clients, demandes, devis, factures, paiements, abonnements, tickets, prestations, notes, journal, fiche entreprise) exigent `is_staff()` au lieu de « tout compte connecté » ; profils : chacun lit le sien, l'équipe lit tout.
- Rattrapage de profil : crée `en_attente`, jamais `admin` ; profils existants inchangés.
- `definir_admin(email)` : désignation d'un admin **uniquement depuis le SQL Editor** (non appelable par l'API) ; garde-fou « il reste toujours au moins un admin ».
- Formulaires publics : trigger `trg_leads_00_proteger` (hors équipe) qui impose statut, priorité, client, lecture, notes, relance, dates, identifiant ; contrôle site d'origine, email/téléphone, longueurs ; limites de débit (3 / 10 min par email, 30 / 10 min au total).
- Anti-robot côté sites (`main.js`) : champ piège invisible (hors écran, `aria-hidden`, hors tabulation) + délai minimal de 3 s ; messages de refus du serveur affichés tels quels (« Trop de demandes… »).
- Factures : trigger `trg_factures_proteger` — facture émise (envoyée, payée, annulée) non supprimable, contenu non modifiable (numéro, date, client, lignes, montants, conditions), pas de retour en brouillon, annulée = définitive. Brouillons inchangés.
- Numérotation : `next_facture_numero` / `next_devis_numero` refusent un compte non validé (équipe et fonctions serveur uniquement).
- Edge Functions : `requireUser` refuse tout compte non validé ou sans profil (403 `acces_en_attente`) ; comparaison des secrets à durée constante ; `invite-user` valide aussi un compte `en_attente` existant ; `notify-new-lead` : secret **obligatoire** (503 si non configuré, 401 si absent/faux), méthode POST, données contrôlées (400).
- Back-office : profil absent ou illisible = `en_attente` (avant : **admin**) ; écran « Accès en attente de validation » (ni menu ni données) ; contrôle d'accès « rien » pour un compte non validé ; rôle « En attente » dans Système → Utilisateurs ; message `acces_en_attente`.

**Corrigé** : C1, C2, I1, I2 (partiel, voir risques), I3, I4.

**Fichiers**
`supabase/full-setup.sql` · `supabase/tests/lot1-securite.sql` (nouveau) · `supabase/functions/_shared/securite.ts` · `supabase/functions/invite-user/index.ts` · `supabase/functions/notify-new-lead/index.ts` · `admin-react/src/providers/authProvider.ts` · `admin-react/src/providers/accessControlProvider.ts` · `admin-react/src/components/layout/ExigerEquipe.tsx` (nouveau) · `admin-react/src/App.tsx` · `admin-react/src/pages/systeme/utilisateurs.tsx` · `admin-react/src/lib/functions.ts` · `sites/infogerance/assets/js/main.js` (+ copies dans les 2 autres sites) · `supabase/README-SETUP.md` · `admin-react/README.md` · `docs/PROMPT-COMPLET.md`.

**Tests (base PostgreSQL 16 de test)**
- `full-setup.sql` rejoué **6 fois** (3 avant, 3 après données de test) : 0 erreur ; aucun compte promu ; rôles existants conservés.
- **73 / 73 scénarios SQL** exécutés directement en base avec chaque rôle (contournement total de l'interface) : inscription (2 comptes → `en_attente`), rattrapage d'un compte orphelin (→ `en_attente`), compte en attente (13 tentatives : lecture clients/vue/demandes/factures/journal/entreprise, modification, création, auto-promotion, numéro, note, `definir_admin` → tout refusé ou 0 ligne), anonyme (11 : lecture, modification, suppression, numéro, `definir_admin`, demandes invalides), collaborateur (13 : son rôle, rôle d'autrui, validation d'un compte, fiche entreprise, prix, suppressions → refusés ; travail normal → OK), admin (5 dont « dernier admin »), factures (12 : brouillon / envoyée / payée / annulée, suppression, montant, numéro, retour brouillon, réactivation, annulation, échéance, service role), formulaire falsifié (statut « Gagné », priorité « Urgente », client, id, date → tous imposés par la base), anti-robot (4e demande refusée, autre visiteur accepté), paiements (partiel, solde, suppression → réouverture, paiements conservés, facture annulée non payable), numérotation continue (+1, collaborateur et service role).
- **Edge Functions** (exécutées avec Deno) : `notify-new-lead` 11/11 (sans secret configuré, sans secret, mauvais secret, secret presque juste, GET, JSON invalide, autre table, id invalide, sans contact, demande valide) ; `requireUser` 10/10 (admin, collaborateur, en attente, sans profil, rôle inconnu, sans jeton, jeton invalide, cron) ; `invite-user` 6/6 sur un Supabase simulé (collaborateur, compte en attente, jeton invalide, email invalide, validation d'un compte en attente, invitation) ; `deno check` des fonctions modifiées : OK.
- **Navigateur** : formulaires publics 8/8 (envoi normal, piège invisible et non transmis, robot, envoi < 3 s, refus serveur explicite, panne, 0 erreur JS) ; écran « en attente » 7/7 (en attente, sans profil, collaborateur, admin, déconnexion, 0 donnée chargée, 0 erreur JS) ; non-régression : 16 parcours, 8 scénarios de panne, 61 vues.
- TypeScript : 0 erreur ; `npm run build` : OK.

**Résultat** : ✅ **VALIDÉ** sur la base de test.

**Risques / points à surveiller**
- **Comptes déjà créés sur la vraie base** : un compte inconnu qui se serait inscrit **avant** ce lot a déjà le rôle `collaborateur` et le garde. → Après mise à jour, ouvrir Système → Utilisateurs et passer tout compte inconnu en « En attente ».
- **Inscription libre** : à désactiver dans Supabase (réglage non modifiable par le code) ; le code protège même si elle reste ouverte.
- **Anti-robot** : pas de CAPTCHA ; un robot qui écrit directement dans l'API contourne le piège et le délai, mais reste bloqué par les limites de débit en base (30 demandes / 10 min au total → un afflux massif peut temporairement bloquer aussi les vrais visiteurs). Un CAPTCHA respectueux de la vie privée (Turnstile) est envisageable au lot 16 si du spam apparaît.
- **Vraie base non testée** (inaccessible depuis l'environnement de développement) : à confirmer chez le propriétaire (voir « À faire »).

**À faire (propriétaire)**
1. Supabase → Authentication → désactiver « Allow new users to sign up ».
2. SQL Editor → exécuter `supabase/full-setup.sql`.
3. Vérifier Système → Utilisateurs (rôles corrects, aucun compte inconnu).
4. Redéployer `notify-new-lead`, `invite-user`, `send-devis`, `send-invoice`, `generate-recurring-invoices`, `send-reminders` (code partagé modifié) et définir `WEBHOOK_SECRET` + l'en-tête `x-webhook-secret` dans le webhook.
5. Test rapide : envoyer une demande depuis un site, la voir dans Demandes.

### Lot 2 — Sauvegarde indépendante ✅ VALIDÉ (base de test)

**Modifié / ajouté**
- Table `public.sauvegardes` (historique : date, type, statut, taille, empreinte SHA-256, nombre de lignes par table, lien d'exécution, erreur) : lecture équipe uniquement, **aucune écriture possible via l'API** (ni admin, ni collaborateur, ni anonyme) ; seul le script, connecté directement à PostgreSQL, y écrit.
- `scripts/sauvegarde.sh` : export du schéma `public` (structure + données, format pg_dump « custom ») et des comptes (`auth.users`, `auth.identities`), manifeste (lignes par table), contrôle de l'archive, chiffrement **AES-256** (GnuPG, phrase ≥ 20 caractères passée hors ligne de commande), contrôle du fichier chiffré, enregistrement du résultat ; en cas d'échec, enregistrement de l'étape en cause ; aucun fichier en clair laissé sur disque.
- `scripts/restaurer.sh` : mode `--verifier` (déchiffre et contrôle sans restaurer) ; restauration en 7 étapes dans l'ordre imposé par les dépendances ; **refus** si la base cible contient déjà des tables DHB ; contrôle final ligne par ligne contre le manifeste (arrêt en erreur au moindre écart) ; message clair si phrase incorrecte ou fichier endommagé.
- `supabase/restauration-complements.sql` : recrée uniquement ce qui vit hors du schéma `public` (déclencheur de création de profil, publication temps réel), **sans modifier aucune donnée**.
- `.github/workflows/sauvegarde.yml` : chaque nuit (02h17 UTC) + lancement manuel ; client PostgreSQL 17 ; fichier chiffré conservé 30 jours en artefact GitHub ; secrets absents → avertissement et aucune action (pas d'échec nocturne tant que ce n'est pas configuré).
- Back-office : **Système → Sauvegardes** (dernière sauvegarde réussie, statut, taille, réussites sur 30 jours, historique, alertes « aucune sauvegarde », « échec », « plus de 36 h », procédure de restauration ; aucun bouton factice : les sauvegardes se lancent depuis GitHub).
- Documentation : `docs/SAUVEGARDE.md` (mise en service, surveillance, restauration pas à pas, limites) ; renvoi dans `supabase/README-SETUP.md`.
- Pas de fonction serveur `backup-status` (prévue au plan) : inutile, le script écrit directement en base.

**Corrigé** : C3 (absence de sauvegarde) — côté code ; actif seulement après configuration des secrets.

**Fichiers**
`supabase/full-setup.sql` (section 16) · `supabase/restauration-complements.sql` (nouveau) · `supabase/tests/lot2-sauvegardes.sql` (nouveau) · `scripts/sauvegarde.sh` (nouveau) · `scripts/restaurer.sh` (nouveau) · `.github/workflows/sauvegarde.yml` (nouveau) · `admin-react/src/pages/systeme/sauvegardes.tsx` (nouveau) · `admin-react/src/App.tsx` · `admin-react/src/components/layout/nav.tsx` · `docs/SAUVEGARDE.md` (nouveau) · `supabase/README-SETUP.md`.

**Tests (base PostgreSQL 16 de test)**
- `full-setup.sql` rejoué 6 fois : 0 erreur.
- **Sauvegarde réelle** de la base de test (données variées : accents, apostrophes, guillemets, retours à la ligne, JSON, montants) : fichier de 24 Ko, ligne `reussie` enregistrée (taille, empreinte, lignes, lien, durée 2 s) ; **aucune donnée lisible en clair** dans le fichier.
- **Restauration complète** dans une base neuve imitant un projet Supabase (schéma `auth` vide, publication temps réel) : 17 tables identiques en nombre de lignes, puis **25 contrôles d'identité stricts** entre base d'origine et base restaurée : empreinte du **contenu** de chacune des 16 tables + comptes, 44 règles RLS, 16 tables protégées, 24 déclencheurs, 17 fonctions, 2 vues, 15 clés étrangères, rôles des profils, droits anon/authenticated, tables temps réel → **identiques**.
  - Un premier essai a révélé un vrai défaut, corrigé : la restauration relançait `full-setup.sql`, dont les mises à jour de rattrapage modifiaient 2 tables restaurées (`leads`, `abonnements`) ; remplacé par `restauration-complements.sql`.
- **Base restaurée fonctionnelle** : les 73 scénarios de sécurité du lot 1 rejoués sur la base restaurée → 73/73.
- Cas d'erreur : mauvaise phrase et fichier tronqué → « Déchiffrement impossible… » ; restauration sur une base non vide → refus ; panne de `pg_dump` simulée → échec enregistré avec l'étape (« export des données métier ») et aucun fichier produit ; base injoignable → code d'erreur ; phrase trop courte → refus.
- Droits sur `sauvegardes` : **9/9** (`supabase/tests/lot2-sauvegardes.sql`).
- Navigateur, page Système → Sauvegardes : **10/10** (4 états × ordinateur et mobile, sans débordement ni erreur JS ; accès par le menu ; erreur de chargement → « Impossible de charger » + Réessayer).
- Non-régression ciblée : 73/73 scénarios du lot 1 sur la base de test, 16/16 parcours du back-office ; TypeScript 0 erreur ; `npm run build` OK ; YAML du workflow valide.

**Résultat** : ✅ **VALIDÉ** sur la base de test.

**Risques / limites**
- **Le workflow GitHub n'a pas encore tourné sur GitHub** (impossible avant le push ; secrets non créés) : la première exécution réelle, dont l'installation du client PostgreSQL 17 et la connexion à la vraie base par le « Session pooler », reste à confirmer à la mise en service.
- Testé avec PostgreSQL 16 en local ; la vraie base Supabase (15 ou 17) sera sauvegardée avec le client 17 (compatible avec les versions inférieures).
- **La phrase de chiffrement est le point unique de défaillance** : perdue = sauvegardes illisibles. À conserver hors de GitHub.
- Fichiers Storage non couverts (il n'y en a pas aujourd'hui) : à ajouter au lot 6 « Documents ».
- Réglages du tableau de bord Supabase (Auth, secrets des fonctions, webhooks, cron) non sauvegardés : documentés dans les README.
- Base injoignable : l'échec n'est visible que dans GitHub (et par l'alerte « 36 h » du back-office).
- Dépôt public : artefacts visibles par d'autres comptes GitHub (illisibles sans la phrase) ; dépôt privé recommandé.

**À faire plus tard sur la vraie Supabase (mise en production)**
1. SQL Editor → exécuter `supabase/full-setup.sql` (crée `sauvegardes`).
2. Créer les secrets GitHub `SUPABASE_DB_URL` (« Session pooler ») et `BACKUP_PASSPHRASE` (et la conserver hors de GitHub).
3. GitHub → Actions → « Sauvegarde de la base » → Run workflow, puis vérifier Système → Sauvegardes.
4. Faire une restauration d'essai dans un projet Supabase neuf (`docs/SAUVEGARDE.md` §3).

### Problèmes connus restants
Voir §3 : I5–I12, A1–A7 (C1, C2, I1, I2, I3, I4 traités au lot 1 ; C3 au lot 2, actif après configuration).
