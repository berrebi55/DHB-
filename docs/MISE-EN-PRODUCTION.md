# DHB — Mise en production : la check-list unique

Tout ce qui a été construit et validé **sur l'environnement de test** (lots 1 à 16,
voir `docs/PLAN-REFERENCE.md`) n'est actif sur la vraie Supabase qu'après ces
étapes. Elles reprennent, dans l'ordre où les faire, les « À faire en production »
de chaque lot. **Rien n'a encore été appliqué sur la vraie base.**

> Cocher au fur et à mesure. En cas de doute sur une étape, le rapport du lot
> indiqué entre parenthèses donne le détail.

---

## 0. Avant de commencer

- [ ] Faire une **sauvegarde** de la base actuelle (Supabase → Database → Backups,
      ou export SQL) avant la première exécution de `full-setup.sql`.
- [ ] Poste et hébergeur du back-office en **Node.js 20.19+** (22 LTS conseillé) (lot 15).
- [ ] Relire `docs/CONTENU-A-VALIDER.md` : titres proposés, engagements publiés
      (horaires, « sous 24 h », « 24/7 », délais par ville), pages de villes,
      `[À COMPLÉTER]`, guides PDF (lots 14 et 16).

## 1. Base de données (Supabase)

- [ ] Authentication → désactiver **« Allow new users to sign up »** (lot 1).
- [ ] SQL Editor → exécuter **`supabase/full-setup.sql`** (une seule fois suffit,
      il est rejouable sans risque ; il contient les lots 1 à 16).
- [ ] Storage : vérifier que l'espace **`documents` est privé** (lot 6).
- [ ] Système → Utilisateurs : rôles corrects, aucun compte inconnu (lot 1).

## 2. Secrets des fonctions (Supabase → Edge Functions → Secrets)

- [ ] `WEBHOOK_SECRET` (+ en-tête `x-webhook-secret` dans le webhook des demandes) (lot 1).
- [ ] `CRON_SECRET` (planifications).
- [ ] Emails : `RESEND_API_KEY`, `NOTIFY_FROM`, `NOTIFY_TO`, et **`EMAIL_REDIRECTION` = votre adresse**
      tant que le domaine n'est pas vérifié chez Resend (lot 8).
- [ ] Stripe : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (lot 7, `supabase/STRIPE-SETUP.md`).
- [ ] Google : `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `ADMIN_URL`,
      `GA_API_SECRET` (lot 10, `docs/GOOGLE.md` §1-2).

## 3. Déploiement des fonctions

- [ ] Toutes en une fois : boucle de déploiement de `admin-react/README.md`
      (elle inclut `render-pdf`, `stripe-webhook`, `email-send`, `worker`, `google-oauth`,
      `google-sync`, `integration-test`, `drive-sync`, `seo-sync`, `notify-new-lead`…).

## 4. Planifications (SQL Editor, `pg_cron`)

- [ ] `dhb-robot` toutes les 15 min (automatisations, Drive, conversions GA4) ;
      l'ancienne `dhb-relances` peut être supprimée (lot 9, `admin-react/README.md`).
- [ ] `dhb-google` (copie GA4, quotidienne) (lot 10, `docs/GOOGLE.md` §2).
- [ ] `dhb-seo` (copie Search Console, quotidienne) (lot 12, `docs/GOOGLE.md` §4).

## 5. Services extérieurs

- [ ] **Sauvegardes** : secrets GitHub `SUPABASE_DB_URL` (« Session pooler ») et
      `BACKUP_PASSPHRASE` (gardée aussi hors de GitHub) ; facultatif `SUPABASE_URL` +
      `SUPABASE_SERVICE_ROLE_KEY` pour inclure les PDF ; lancer « Sauvegarde de la base »
      puis **une restauration d'essai** dans un projet neuf (lots 2 et 6, `docs/SAUVEGARDE.md`).
- [ ] **Stripe** : endpoint de webhook + 5 événements (`supabase/STRIPE-SETUP.md` §5) (lot 7).
- [ ] **Google** : projet Cloud, écran de consentement **publié**, connexion depuis
      Système → Intégrations ; GA4 (identifiant + événements clés `generate_lead`,
      `click_phone`, `close_convert_lead` — **pas** `telechargement_guide` ni `outil_termine`) ;
      Drive (sous-dossiers, activer, « Créer les dossiers des clients existants ») ;
      Search Console (propriétés vérifiées, « Copier maintenant ») (lots 10 à 12, 16).
- [ ] **Resend** : vérifier le domaine, mettre `NOTIFY_FROM` sur ce domaine et
      **supprimer `EMAIL_REDIRECTION`** (lot 8).

## 6. Publication

- [ ] Remplacer les valeurs `[EXEMPLE]` (domaines, téléphone, emails) dans `build/`,
      l'identifiant GA4 dans `sites/infogerance/assets/js/suivi.js`, puis
      `DHB_LIENS=prod python3 build/build_all.py`.
- [ ] Publier les 3 sites (chacun **à la racine de son domaine** : la page 404 en dépend, lot 13)
      et le back-office (`npm run build`).
- [ ] Soumettre les 3 sitemaps dans Search Console (lot 13).

## 7. Vérifications après mise en ligne

- [ ] Envoyer une demande depuis un site (avec `?utm_source=test&utm_medium=email`) :
      elle arrive dans Demandes avec son origine, l'alerte email arrive (lots 1, 4, 8).
- [ ] Télécharger un guide : la demande « Guide téléchargé » apparaît (lot 16).
- [ ] PDF d'un devis et d'une facture, puis onglet Documents du client (lot 6).
- [ ] Stripe **mode test** (carte 4242…) : une intervention, un abonnement ; « Resend »
      d'un événement → aucun doublon (lot 7).
- [ ] Écrire un email depuis une fiche (aperçu, envoi, historique) (lot 8).
- [ ] Système → Automatisations : relire « Bienvenue » et « Ticket résolu » avant de les activer (lot 9).
- [ ] Système → Intégrations : « Tester l'accès » (Google), puis vérifier la date de dernière copie GA4 / Search Console le lendemain (lots 10 à 12).
- [ ] Partager une page sur un réseau social : l'image de partage s'affiche (lot 13).
