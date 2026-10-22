# DHB — Plateforme : audit, architecture cible et plan d'implémentation

> Document de décision rédigé **avant tout code**, comme demandé. Rien de ce qui est
> décrit ici n'est encore implémenté, sauf mention « existe ». Les constats viennent
> de mesures sur le dépôt (scripts d'audit), pas d'hypothèses.

---

## 1. Audit de l'existant

### 1.1 Ce qui existe et fonctionne (à réutiliser)

| Brique | État | Réutilisation prévue |
|---|---|---|
| 3 sites statiques générés (Python, `build/`) | 170 pages, design commun, 0 lien cassé | Base de tout le SEO |
| Formulaires → table `leads` (insertion anonyme RLS) | existe | Point d'entrée de l'attribution |
| `suivi.js` GA4 côté navigateur, conditionné au consentement | existe (ID à renseigner) | Garder, renommer les événements |
| Back-office React/Refine (CRM, devis, factures, paiements, abonnements, tickets, pilotage) | existe, testé | Socle de toutes les nouvelles pages |
| `activites` + trigger `log_activite` (journal) | existe | Devient la **timeline client** |
| `notes` | existe | Timeline (appels, notes) |
| Edge Functions sécurisées (`_shared/securite.ts`, `requireUser`, `requireCronOrUser`) | existe | Socle de toutes les intégrations |
| Envoi d'emails via Resend (`envoyerEmail`) | existe, **sans historique** | Centre de communication |
| `send-reminders` (règles codées en dur : devis > 7 j, factures en retard) | existe | Migré dans le moteur d'automatisations |
| Stripe Checkout (`create-checkout`) | existe, **aller simple** | Compléter par un webhook |
| RLS, rôles admin/collaborateur, compteurs sécurisés | existe, testé | Étendu à chaque nouvelle table |

### 1.2 Ce qui manque (par rapport à la demande)

- **Aucune intégration Google réelle** côté serveur (ni Analytics Data API, ni Search Console, ni Drive).
- **Aucun fichier PDF réel** : devis/factures sont seulement imprimés depuis le navigateur. Sans PDF généré côté serveur, impossible de les archiver ou de les envoyer dans Drive.
- **Pas de stockage de documents** (aucun bucket Supabase Storage).
- **Pas d'attribution des leads** : la source est concaténée dans `source_url` (`/page?utm_source=…`), pas de colonne `source`.
- **Pas de webhook Stripe** : un paiement en ligne n'est **jamais enregistré** dans DHB → impossible de mesurer `invoice_paid` / `subscription_started` venant de Stripe.
- **Pas de modèles d'email, pas d'historique des emails, pas de moteur d'automatisation configurable.**
- **Pas de table d'intégrations** (statut, logs, dernière synchro), pas de page Système → Intégrations / Sauvegardes.
- **Pas de stratégie de sauvegarde** indépendante de Supabase.

### 1.3 Doublons et incohérences

| Constat | Proposition |
|---|---|
| `supabase/schema.sql` et `supabase/settings.sql` : anciens schémas partiels à côté de `full-setup.sql` | Marquer obsolètes puis supprimer (une seule source : `full-setup.sql`) |
| Ancienne admin `admin/index.html` encore dans le dépôt | Supprimer après validation (déjà dépréciée) |
| Code d'envoi d'email dupliqué (`send-invoice`, `send-devis`, `send-reminders`, `notify-new-lead`) | Un seul service d'envoi qui **journalise** chaque email |
| Règles de relance codées en dur dans `send-reminders` | Deviennent 2 règles par défaut du moteur d'automatisations |
| Noms d'événements GA (`form_start`, `generate_lead`) ≠ noms demandés | Renommer selon le dictionnaire unique (§3.2) |
| UTM collés dans `source_url` | Colonnes dédiées + source normalisée |

### 1.4 Performance

- **Back-office** : aucun chargement différé des pages → **~2,7 Mo de JavaScript** téléchargés à l'ouverture (antd 1,2 Mo, refine 0,75 Mo, graphiques 0,4 Mo). Les graphiques sont chargés même sur la page de connexion.
- **Tableau de bord / Pilotage** : `useDonnees()` télécharge **jusqu'à 5 000 lignes × 6 tables** à chaque affichage, sans cache (hors React Query). Ça marche aujourd'hui (peu de données) mais ralentira avec le volume et refait les mêmes requêtes à chaque visite.
- **Sites publics** : le bandeau d'annonce (`data-setting="annonce"`) est présent sur les **170 pages** → chaque page télécharge la librairie `supabase-js` depuis un CDN (≈ 100 Ko) juste pour lire un texte. Remplaçable par un simple `fetch` REST (quelques centaines d'octets).
- Polices Google chargées depuis Google (requêtes tierces) : à auto-héberger (performance + RGPD).
- Pas d'images lourdes (aucune photo) : bon point pour la vitesse.

### 1.5 Chargement et erreurs

- `useDonnees()` : pas de `try/catch` ni de délai maximal → une coupure réseau peut laisser un **chargement infini**.
- **42 requêtes `useList` pour seulement 14 gestions d'erreur** : dans beaucoup d'écrans, une erreur s'affiche comme une liste vide (**erreur silencieuse**).
- **Aucune Error Boundary** : une erreur JavaScript dans un composant donne un **écran blanc** complet.
- Problème de rechargement au clic : **corrigé** (commit `482d9a8`), audit de 18 pages sans autre cas.

### 1.6 SEO (audit automatique des 170 pages)

| Site | Constat |
|---|---|
| Tous | 0 titre ni description dupliqués ✅, canonicals cohérents par domaine ✅, JSON-LD valide ✅ |
| DHB Pro | **105 titres > 65 caractères** (coupés dans Google), **68 descriptions > 160**. `og:image` en SVG (non supporté par Facebook/LinkedIn) |
| DHB Assistance | **aucune `og:image`**, 23 titres trop longs, **22 fiches d'aide sans fil d'Ariane structuré** (BreadcrumbList), **pages de paiement dans le sitemap et indexables** |
| DHB Groupe | aucune `og:image`, **pas de page 404** |
| Assistance | pas de page 404 |
| Architecture d'URL | Pro : `/services/…`, `/pannes-frequentes/…`, `/zones/…`, `/blog/…` (cohérent). Pas de page dédiée « administration réseau » ni « maintenance informatique » au sens recherche locale |

Non mesurable ici : Core Web Vitals réels (il faut le site en ligne + PageSpeed / Search Console).

### 1.7 UX

- Le menu va grossir : il faut l'organiser **avant** d'ajouter 10 écrans (risque « usine à gaz »).
- Pas de bouton « Envoyer un email » contextuel (fiches client, demande, devis, facture, ticket).
- La timeline existe (journal d'activité) mais ne couvre ni emails, ni appels, ni documents, ni synchronisations.

---

## 2. Contraintes techniques à connaître (honnêtement)

1. **Google Drive avec un compte Gmail personnel** : un « compte de service » Google **ne peut pas** stocker de fichiers dans votre Drive personnel. Il faut une **connexion OAuth** (« Se connecter avec Google ») dont le jeton est gardé côté serveur. L'application OAuth doit être passée **« En production »** dans Google Cloud, sinon la connexion expire **tous les 7 jours**. Comme vous serez le seul utilisateur, Google affichera un écran « application non validée » que vous pourrez passer.
   Avec **Google Workspace** (payant), une alternative plus robuste existe (Drive partagé + compte de service).
2. **Une seule connexion Google** suffit pour Drive + Analytics (lecture) + Search Console. Autorisations minimales : `drive.file` (uniquement les fichiers créés par DHB, pas le reste de votre Drive), `analytics.readonly`, `webmasters.readonly`.
3. **Search Console** : données disponibles avec **2 à 3 jours de retard** ; l'indexation page par page passe par l'API d'inspection (quota limité) → affichée « lorsque disponible ».
4. **Google Business Profile** : l'API exige une **demande d'accès validée par Google**. Prévu dans l'architecture, activable seulement après accord.
5. **GA4 côté serveur** (devis créé, facture payée…) : via le *Measurement Protocol*, avec un **secret d'API** stocké dans Supabase (jamais dans le front). Le Measurement ID `G-…` n'est pas un secret.
6. **Emails** : Resend n'envoie à n'importe quel destinataire qu'après **vérification de votre nom de domaine** (enregistrements DNS).
7. **Sauvegardes** : le plan **gratuit** de Supabase ne fournit pas de sauvegardes téléchargeables ; le plan Pro fournit 7 jours. Une sauvegarde **indépendante** est donc nécessaire dans tous les cas.
8. **Campagnes email** (RGPD) : vers des particuliers, consentement préalable obligatoire ; vers des professionnels, autorisé si en lien avec leur activité, avec lien de désinscription. Chaque campagne exigera un lien de désinscription.

---

## 3. Architecture cible

### 3.1 Principe central : le CRM ne dépend jamais d'une intégration

```
Action dans DHB (ex. client créé, devis envoyé, facture payée)
   │  écrit en base, réponse immédiate à l'utilisateur
   ▼
Table `evenements` (file d'attente, alimentée par des triggers SQL)
   │
   ▼  Edge Function `worker` (planifiée toutes les 5 min + déclenchable à la main)
   ├─► Automatisations (règles SI → ALORS, délais, conditions)
   ├─► Emails (modèles, envoi, historique)
   ├─► Google Drive (dossier client, copie des PDF)
   ├─► GA4 Measurement Protocol (conversions hors site)
   └─► Journal + timeline client
Chaque tâche : statut (en attente / fait / erreur), nb de tentatives, prochaine tentative
(1 min, 5 min, 30 min, 2 h, 12 h), message d'erreur lisible.
```

Si Google ou Resend tombe : la tâche reste « en attente », l'interface affiche **« Synchronisation en attente »** avec un bouton **Réessayer**, et rien d'autre n'est bloqué.

### 3.2 Dictionnaire unique des événements

Un seul fichier de référence (front + serveur) : nom, déclencheur, paramètres, destination.

| Événement | Où | Déclencheur |
|---|---|---|
| `page_view` | site | automatique GA4 |
| `view_service` | site | ouverture d'une page `/services/…` |
| `click_phone`, `click_email` | site | clic `tel:` / `mailto:` |
| `contact_form_start` | site | 1er champ touché |
| `contact_form_submit` | site | demande de type question envoyée |
| `quote_request` | site | demande de devis envoyée (conversion principale) |
| `quote_created`, `quote_sent`, `quote_accepted` | serveur | statut du devis |
| `invoice_created`, `invoice_paid` | serveur | facture créée / payée |
| `subscription_started` | serveur | abonnement actif (manuel ou Stripe) |

Ajouter un événement = une ligne dans ce dictionnaire. Les événements serveur sont rattachés à la visite d'origine grâce à l'identifiant GA (`client_id`) capté **seulement si le visiteur a consenti**, et stocké sur la demande.

### 3.3 Nouvelles tables (toutes additives, RLS activée)

| Table | Rôle |
|---|---|
| `evenements` | file d'événements métier + statut de traitement |
| `integrations` | une ligne par intégration : statut, configuration **non secrète**, dernière synchro, dernière erreur |
| `integration_logs` | journal des appels (succès/erreur, durée, message) |
| `integration_credentials` | jetons OAuth chiffrés — **aucune politique RLS** : lisible uniquement par les Edge Functions (service role) |
| `documents` | PDF/fichiers : client, type, entité liée (devis/facture/…), version, chemin Storage, ID Drive, statut de synchro |
| bucket Storage `documents` | privé ; **source de vérité** des fichiers (Drive = copie de confort) |
| `email_modeles` | modèles avec variables `{{client.prenom}}`… |
| `emails` | historique : destinataire, objet, corps, statut, lien client/devis/facture/ticket, erreur |
| `automatisations`, `automatisation_runs` | règles (déclencheur, délai, conditions, actions, actif) + exécutions |
| `campagnes` (plus tard) | envois groupés avec consentement + désinscription |
| `analytics_quotidien`, `seo_quotidien`, `seo_requetes`, `seo_pages` | chiffres Google **copiés une fois par jour** : le back-office lit Supabase, jamais Google en direct (rapide, et ne casse pas si Google répond mal) |
| `sauvegardes` | historique : date, type, taille, statut, erreur |
| colonnes sur `leads` | `source` (google_seo, google_ads, instagram, facebook, recommandation, telephone, email, direct, autre), `utm_*`, `gclid`, `landing_page`, `referrer`, `ga_client_id` |
| colonnes sur `clients` | `drive_folder_id`, `drive_folder_url`, `drive_sync_statut`, `drive_cree_le`, `consentement_marketing` |

Vue `parcours_vue` : source → leads → devis → devis acceptés → clients → facturé → encaissé (le « quelle source me rapporte vraiment des clients »).

### 3.4 Nouvelles Edge Functions

| Fonction | Rôle |
|---|---|
| `worker` | traite la file `evenements` (automatisations, emails, Drive, GA4) avec reprise |
| `google-oauth` | démarrer/terminer la connexion Google, stocker le jeton côté serveur |
| `google-sync` | copie quotidienne GA4 + Search Console dans les tables `*_quotidien` |
| `render-pdf` | génère le PDF d'un devis/facture côté serveur (même mise en page que l'aperçu), l'enregistre dans Storage |
| `email-send` | envoi unique et journalisé (remplace les envois dispersés) |
| `stripe-webhook` | enregistre les paiements Stripe (paiement + facture payée + abonnement démarré), signature vérifiée |
| `integration-test` | bouton « Tester » de chaque intégration |
| `backup-status` | reçoit le compte rendu de la sauvegarde nocturne |

### 3.5 Sauvegardes (3 couches distinctes)

1. **Données** (PostgreSQL) : sauvegarde nocturne **indépendante** via GitHub Actions (`pg_dump` chiffré, conservation 30 jours), compte rendu dans `sauvegardes`. + sauvegardes Supabase si plan Pro.
2. **Fichiers** (Storage) : copie nocturne dans la même sauvegarde.
3. **Drive** : copie de confort pour vous et vos clients, **pas** une sauvegarde.
Restauration testée et documentée (une sauvegarde jamais restaurée n'en est pas une).

### 3.6 Navigation proposée (sans usine à gaz)

- Tableau de bord *(enrichi : Acquisition · Commercial · Clients · Finance)*
- **Commercial** : Demandes · Clients · Devis · Prestations
- **Facturation** : Factures · Paiements · Abonnements
- **Support** : Tickets · Questions reçues
- **Communication** *(nouveau)* : Emails (historique + brouillons + planifiés) · Modèles · Automatisations · Campagnes *(plus tard)*
- **Pilotage** : Statistiques · Chiffre d'affaires · Récurrent · Performance · **Acquisition & conversion** · **SEO**
- **Contenu** : Prix & bandeau
- **Système** : Utilisateurs · Paramètres · **Intégrations** (cartes Google Analytics, Search Console, Google Drive, Business Profile, Email, Stripe) · **Sauvegardes** · Sécurité · Journal

« Administration → Intégrations → Google » et « Intégrations → Google » de la demande = **Système → Intégrations**, groupe Google (un seul endroit).

---

## 4. Plan d'implémentation par priorité

Chaque lot se termine par : build, tests navigateur desktop + mobile, tests SQL par rôle, commit.

### Priorité 1 — Stabilité ✅ réalisée (commits `e0a3999` et suivant)
1. ✅ Error Boundary par page et par panneau (plus d'écran blanc ; fichier manquant après mise à jour → « Recharger la page »).
2. ✅ Erreurs visibles partout : listes et fiches affichent « Impossible de charger » + **Réessayer** (fini les listes vides trompeuses et les faux « introuvable »).
3. ✅ Délai maximal de 25 s sur toutes les requêtes ; **une seule** politique de nouvelles tentatives (aucune après délai dépassé ou erreur 4xx) — les relances internes de la librairie Supabase, qui portaient l'attente à plus de 70 s, sont désactivées.
4. ✅ Tableau de bord / pilotage : cache partagé (React Query), rafraîchi après chaque modification. *(Les agrégats SQL viendront quand le volume le justifiera.)*
5. ✅ Pages chargées à la demande + suppression de `@refinedev/antd` : JavaScript initial ~2,8 Mo → ~1,8 Mo (~830 → ~550 Ko compressés), graphiques chargés seulement sur les pages qui en ont.
6. ✅ Sites : formulaires et prix via `fetch` REST (plus de librairie de 100 Ko sur 170 pages).
7. ✅ Doublons supprimés (`admin/`, `schema.sql`, `settings.sql`), README et lanceurs à jour.

Tests : 61 vues desktop/mobile, 16 parcours, 8 scénarios de panne (erreur 500, serveur muet, fiche inexistante, fichier d'application manquant, source du tableau de bord en panne) — tous OK sur Supabase simulé. **Non testé sur la vraie base** (inaccessible depuis l'environnement de développement) : à vérifier en local (envoi d'un formulaire, affichage des prix).

### Priorité 2 — UX/UI
Nouvelle navigation (§3.6), tableau de bord en 4 blocs (Acquisition, Commercial, Clients, Finance) avec uniquement des chiffres calculables (les blocs Acquisition affichent un état vide explicatif tant que Google n'est pas connecté), bouton « Envoyer un email » préparé.

### Priorité 3 — CRM
1. **Attribution des leads** (colonnes, captation UTM/gclid/referrer sur les sites, source modifiable à la main, vue `parcours_vue`).
2. **Timeline client complète** (journal + emails + appels + documents + synchronisations).
3. **PDF serveur** (`render-pdf`) + table `documents` + bucket Storage.
4. **Webhook Stripe** (paiements en ligne enfin enregistrés).

### Priorité 4 — Communication
1. Service d'envoi unique journalisé + historique `emails`.
2. Modèles avec variables, aperçu, envoi manuel depuis client/lead/devis/facture/ticket.
3. Moteur d'automatisations (file `evenements` + `worker`) ; migration des relances actuelles en 2 règles par défaut ; règles proposées : bienvenue client, relance devis J+5, rappel facture J+7, ticket résolu.
4. Campagnes (avec consentement + désinscription) en dernier.

### Priorité 5 — Google
1. Système → Intégrations (cartes, statut, tester, reconnecter, logs).
2. Connexion Google OAuth unique (jeton côté serveur).
3. GA4 : événements renommés côté site + conversions serveur (Measurement Protocol).
4. Google Drive : dossier client + 8 sous-dossiers à la création du client, copie des PDF, statut « en attente / synchronisé / erreur », reprise automatique.
5. Search Console + GA4 Data API : synchronisation quotidienne.
6. Business Profile : uniquement après accès accordé par Google.

### Priorité 6 — SEO
1. Technique : titres ≤ 60–65 caractères et descriptions ≤ 155 (105 + 68 pages Pro), `og:image` PNG pour les 3 sites, 404 Groupe/Assistance, fils d'Ariane structurés sur l'aide, `noindex` + retrait du sitemap des pages de paiement, polices auto-hébergées.
2. Contenu local : nouvelles pages réellement distinctes (maintenance informatique, administration réseau, cybersécurité PME, dépannage particulier par ville prioritaire), sans bourrage de mots-clés, avec FAQ et maillage interne.
3. Mesure : Core Web Vitals via Search Console une fois en ligne.

### Priorité 7 — Pilotage
Pilotage → Acquisition & conversion (visiteurs, sessions, sources, appareils, pages, taux de conversion, entonnoir de bout en bout, filtres aujourd'hui / 7 / 30 / 90 j / année / personnalisé) et Pilotage → SEO (vue globale, pages, requêtes). Système → Sauvegardes. ROI par source (CA encaissé ÷ leads par source).

---

## 5. Ce que vous devrez configurer (récapitulatif)

| Intégration | À créer | Où | À récupérer | Où le renseigner | Test |
|---|---|---|---|---|---|
| GA4 (site) | Propriété + flux Web | analytics.google.com → Admin | Measurement ID `G-…` | Système → Intégrations → Google Analytics | Bouton « Tester » + rapport Temps réel GA4 |
| GA4 (serveur) | Secret Measurement Protocol | GA4 → Flux de données → Secrets API | `api_secret` | Supabase → Edge Functions → Secrets (`GA4_API_SECRET`) | Bouton « Tester » (événement de test visible dans DebugView) |
| Google (Drive, Analytics, Search Console) | Projet Google Cloud + écran de consentement OAuth « En production » + identifiants OAuth « Application Web » | console.cloud.google.com | Client ID + Client secret | Secrets Supabase (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) puis bouton « Connecter Google » | Création d'un dossier test + lecture d'1 jour de données |
| Search Console | Propriété de domaine (DNS) pour chaque site | search.google.com/search-console | — (même connexion Google) | Système → Intégrations → Search Console (choix des propriétés) | Bouton « Tester » |
| Emails | Compte Resend + domaine vérifié (DNS) | resend.com | Clé API | Secret `RESEND_API_KEY` | Envoi d'un email test à vous-même |
| Stripe | Webhook vers `stripe-webhook` | Stripe → Developers → Webhooks | Signing secret `whsec_…` | Secret `STRIPE_WEBHOOK_SECRET` | « Send test event » depuis Stripe |
| Sauvegardes | Secret GitHub `DATABASE_URL` + clé de chiffrement | GitHub → Settings → Secrets | Chaîne de connexion Supabase (Database → Connect) | GitHub Actions | Lancement manuel + restauration test |

**Rien ne sera présenté comme « connecté » tant qu'un test réel n'aura pas réussi** : chaque carte d'intégration affiche son vrai statut.
