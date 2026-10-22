# DHB — Google : mise en service et dictionnaire des événements GA4

Ce document décrit la connexion du **compte Google** à DHB (Google Analytics 4,
Google Drive et Search Console) et la **liste des
événements** mesurés sur les sites et envoyés depuis le serveur.

> Rien ne fonctionne avant cette mise en service : le back-office l'indique dans
> **Système → Intégrations** (« Non configuré ») et n'affiche aucun chiffre inventé.

---

## 1. Projet Google Cloud (une fois)

1. <https://console.cloud.google.com> → créer un projet (ex. « DHB »).
2. **API et services → Bibliothèque** → activer :
   - *Google Analytics Data API* (chiffres de visite) ;
   - *Google Search Console API* (lot 12) ;
   - *Google Drive API* (lot 11).
3. **Écran de consentement OAuth** : type **Externe**, nom « DHB », votre email ;
   autorisations : `analytics.readonly`, `webmasters.readonly`, `drive.file`.
   ⚠️ Passez l'application **« En production »** (bouton *Publier l'application*).
   En mode « Test », Google retire l'accès au bout de **7 jours** et la copie des
   chiffres s'arrête (DHB affiche alors « Accès Google expiré : reconnectez »).
4. **Identifiants → Créer → ID client OAuth** → *Application Web* :
   - URI de redirection autorisé :
     `https://<votre-projet>.supabase.co/functions/v1/google-oauth`
5. Supabase → **Edge Functions → Secrets** :
   - `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` (affichés par Google) ;
   - `GOOGLE_REDIRECT_URI` = l'URI de l'étape 4 ;
   - `ADMIN_URL` = l'adresse du back-office (retour après la connexion).
6. Déployer : `supabase functions deploy google-oauth google-sync integration-test --no-verify-jwt`.
7. Back-office → **Système → Intégrations → Connecter Google** (administrateur),
   choisir le compte qui a accès à Google Analytics, accepter.

Le jeton d'accès est rangé dans la base dans une table **illisible depuis l'API**
(serveur uniquement). « Déconnecter » le retire aussi chez Google.

## 2. Google Analytics 4

1. GA4 → **Administration → Paramètres de la propriété** : noter l'**ID de
   propriété** (chiffres) ; **Flux de données** → le flux du site : noter
   l'**ID de mesure** (`G-XXXXXXXXXX`).
2. Système → Intégrations → carte *Google Analytics 4* : saisir ces deux
   identifiants, **Enregistrer**, puis **Copier les chiffres maintenant**.
3. Mettre le **même ID de mesure** dans les sites : `sites/infogerance/assets/js/suivi.js`
   (`GA_ID`), puis `python build/build_all.py` et republier.
4. **Conversions côté serveur** : GA4 → Flux de données → *Secrets de l'API
   Measurement Protocol* → créer → Supabase → secret `GA_API_SECRET`.
5. Planifier la copie quotidienne (Supabase → Database → Cron) :
   ```sql
   select cron.schedule('dhb-google', '30 6 * * *', $$
     select net.http_post(
       url := 'https://<PROJECT>.supabase.co/functions/v1/google-sync',
       headers := '{"Content-Type":"application/json","x-cron-secret":"<CRON_SECRET>"}'::jsonb,
       body := '{}'::jsonb);
   $$);
   ```
6. GA4 → **Administration → Événements** : marquer comme **événements clés**
   `generate_lead`, `click_phone` et `close_convert_lead`.

Les chiffres copiés (sessions, utilisateurs, événements clés, par jour et par
canal, 30 derniers jours) s'affichent dans **Pilotage → Acquisition** et dans le
bloc *Acquisition* du tableau de bord. Ils ne concernent que les visiteurs qui
ont **accepté** la mesure d'audience.

## 3. Google Drive (lot 11)

1. Le compte Google doit être connecté (étape 1) ; déployer `drive-sync` :
   `supabase functions deploy drive-sync --no-verify-jwt` (et redéployer `worker`).
2. Système → Intégrations → carte *Google Drive* : relire les **sous-dossiers**
   proposés (le 1er reçoit les devis, le 2e les factures ; 2 à 8 dossiers),
   les modifier si besoin, **activer**, Enregistrer.
3. Cliquer **« Créer les dossiers des clients existants »** (par lots de 25 :
   relancer tant qu'il en reste).
4. Ensuite, tout est automatique : nouveau client → son dossier ; nouveau PDF
   de devis ou de facture → copié dans son sous-dossier (nouvelle version d'un
   devis : le fichier Drive est remplacé ; facture : copie unique).

DHB n'a accès qu'aux dossiers et fichiers **qu'il a créés** (autorisation
`drive.file`) : le reste de votre Drive n'est jamais lu. Si un dossier client
est supprimé dans Drive, il est recréé au prochain envoi (ou par « Mettre à
jour » sur la fiche client). Une panne de Google n'empêche pas d'utiliser DHB :
la copie est réessayée automatiquement et l'erreur s'affiche sur la fiche.

## 4. Google Search Console (lot 12)

Prérequis : les domaines sont **achetés et vérifiés** dans
<https://search.google.com/search-console> avec le **même compte Google** que
celui connecté à DHB (ou ce compte y est ajouté comme utilisateur).

1. Déployer : `supabase functions deploy seo-sync --no-verify-jwt`.
2. Système → Intégrations → carte *Google Search Console* : saisir les
   propriétés **exactement comme dans Search Console**, une par ligne
   (ex. `sc-domain:exemple.fr` pour une propriété « Domaine »,
   `https://www.exemple.fr/` pour une propriété « Préfixe d'URL »), Enregistrer.
3. Cliquer **« Copier maintenant »** pour un premier essai, puis planifier la
   copie quotidienne (SQL Editor) :
   ```sql
   select cron.schedule('dhb-seo', '45 6 * * *', $$
     select net.http_post(
       url := 'https://<PROJECT>.supabase.co/functions/v1/seo-sync',
       headers := '{"Content-Type":"application/json","x-cron-secret":"<CRON_SECRET>"}'::jsonb,
       body := '{}'::jsonb);
   $$);
   ```

Ce qui est copié, par propriété : clics, impressions et position **par jour sur
30 jours**, les **100 premières requêtes** et les **100 premières pages** des
28 derniers jours. Google publie ces chiffres avec **2 à 3 jours de retard**.
Ils s'affichent dans **Pilotage → SEO** (position moyenne pondérée par les
impressions, comme dans Search Console).

## 5. Dictionnaire des événements

### Envoyés par les sites (navigateur, seulement après « Accepter »)

| Événement | Quand | Paramètres |
|---|---|---|
| `page_view` | chaque page (automatique GA4) | — |
| `click_phone` | clic sur un numéro de téléphone | `emplacement` : entete, pied, barre_mobile, page |
| `click_email` | clic sur une adresse email | — |
| `click_cta` | clic sur un bouton d'appel à l'action | `libelle`, `page` |
| `begin_checkout` | clic sur un bouton de paiement en ligne | `offre` : abonnement, intervention |
| `click_autre_site_dhb` | lien vers un autre site du groupe | `destination` |
| `form_start` | première saisie dans un formulaire | `type` : devis, question ; `page` |
| **`generate_lead`** | **demande envoyée** (conversion) | `type`, `service`, `page` |
| `faq_ouverte` | question de FAQ dépliée | `question` |
| `scroll_profondeur` | 25, 50, 75, 90 % de la page | `pourcentage`, `page` |

Tous portent aussi `site` (groupe, pro, assistance). Aucune donnée personnelle
(nom, email, téléphone, message) n'est envoyée à Google.

### Envoyé par le serveur (robot des automatisations, Measurement Protocol)

| Événement | Quand | Paramètres |
|---|---|---|
| **`close_convert_lead`** | une demande passe à **« Gagné »** dans DHB | `lead_source` (origine de la demande, lot 4) |

Il n'est envoyé **que** si le visiteur avait accepté la mesure d'audience
(identifiant GA4 enregistré avec sa demande) : sans consentement, rien ne part.
`generate_lead` n'est **pas** renvoyé par le serveur (il est déjà mesuré par le
site : pas de double comptage).

## 6. En cas de problème

| Message dans DHB | Que faire |
|---|---|
| « Identifiants Google absents dans Supabase » | créer les secrets de l'étape 1.5 |
| « Accès Google expiré : reconnectez » | application Google restée en mode Test, ou accès retiré : publier l'application, puis Reconnecter |
| « Google n'a pas donné d'accès durable » | compte Google → Sécurité → Applications tierces → retirer « DHB », puis Reconnecter |
| « Google Analytics refuse la demande (permission_denied) » | le compte connecté n'a pas accès à la propriété GA4, ou mauvais ID de propriété |
| « Le compte Google connecté n'a pas accès à cette propriété » | ajouter ce compte dans Search Console (Paramètres → Utilisateurs), ou Reconnecter Google en acceptant l'autorisation Search Console |
| « Propriété inconnue de Search Console » | recopier l'adresse exacte de la propriété (`sc-domain:` ou `https://…/` avec la barre finale) |
