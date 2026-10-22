# DHB — Sauvegarde indépendante et restauration

Le plan gratuit de Supabase ne fournit **aucune sauvegarde téléchargeable**.
DHB sauvegarde donc lui-même sa base, **hors de Supabase** :

| Quoi | Où | Quand | Conservation |
|---|---|---|---|
| Données métier + structure (schéma `public`) et comptes (`auth.users`) | Artefacts GitHub, fichier **chiffré AES-256** | Chaque nuit (02h17 UTC) + à la demande | 30 jours |
| PDF archivés (devis, factures émises — stockage `documents`) | Dans le même fichier chiffré (dossier `fichiers/`) | Idem, si les 2 secrets facultatifs sont créés | 30 jours |
| Historique (date, statut, taille, nombre de lignes, erreur) | Table `public.sauvegardes` → Back-office › Système › Sauvegardes | À chaque exécution | Illimitée |

Fichiers : `.github/workflows/sauvegarde.yml`, `scripts/sauvegarde.sh`,
`scripts/restaurer.sh`, `supabase/restauration-complements.sql`.

> ⚠️ Ce dispositif n'est **pas actif** tant que les deux secrets ci-dessous
> ne sont pas créés. Le back-office l'indique (« Aucune sauvegarde enregistrée »).

---

## 1. Mise en service (une fois)

1. **Mettre à jour la base** : exécuter `supabase/full-setup.sql` dans le SQL
   Editor (crée la table `sauvegardes`).
2. **Chaîne de connexion** : Supabase → bouton **Connect** → onglet
   **Connection string** → **Session pooler** (compatible IPv4, nécessaire pour
   GitHub). Remplacer `[YOUR-PASSWORD]` par le mot de passe de la base
   (Project Settings → Database ; le réinitialiser si besoin).
   ⚠️ Ne pas prendre le « Transaction pooler » (port 6543) : `pg_dump` ne
   fonctionne pas avec.
3. **Phrase de chiffrement** : choisir une phrase longue (20 caractères
   minimum, idéalement 5–6 mots). **La noter dans un gestionnaire de mots de
   passe, hors de GitHub** : sans elle, les sauvegardes sont illisibles,
   y compris pour vous.
4. **Créer les secrets** : GitHub → dépôt → Settings → Secrets and variables →
   Actions → New repository secret :
   - `SUPABASE_DB_URL` = la chaîne de l'étape 2 ;
   - `BACKUP_PASSPHRASE` = la phrase de l'étape 3 ;
   - **facultatifs, pour sauvegarder aussi les PDF** (lot 6) : `SUPABASE_URL`
     (adresse du projet, `https://….supabase.co`) et `SUPABASE_SERVICE_ROLE_KEY`
     (Supabase → Project Settings → API → clé `service_role` / « secret »).
     Cette clé donne tous les droits : elle ne va **que** dans les secrets
     GitHub, jamais dans le code. Sans ces deux secrets, la base est sauvegardée
     et le nombre de PDF non copiés est signalé dans Système → Sauvegardes.
5. **Premier test** : GitHub → Actions → « Sauvegarde de la base » →
   **Run workflow**. Au bout de 1 à 2 minutes :
   - l'exécution est verte et contient un artefact `dhb-sauvegarde-…` ;
   - Back-office → Système → Sauvegardes affiche « À jour ».
6. **Tester une restauration** (section 3) au moins une fois, puis tous les
   trimestres : une sauvegarde jamais restaurée n'est pas une garantie.

## 2. Surveillance

- La page **Système → Sauvegardes** affiche une alerte si la dernière
  sauvegarde a échoué ou si aucune n'a réussi depuis **36 h**.
- Si la base est injoignable, l'échec ne peut pas être écrit en base : il est
  visible dans GitHub (exécution rouge, email de GitHub au propriétaire du
  dépôt) et l'alerte « 36 h » apparaît le lendemain dans le back-office.

## 3. Restaurer

Pré-requis : un poste avec `psql`, `pg_restore` (version ≥ celle de Supabase),
`gpg`, `python3`, et ce dépôt.

1. **Télécharger** le fichier : GitHub → Actions → « Sauvegarde de la base » →
   l'exécution voulue → Artifacts → `dhb-sauvegarde-…` (dézipper : on obtient
   `dhb-sauvegarde-AAAAMMJJ-HHMMSS.tar.gpg`).
2. **Vérifier** sans rien restaurer :
   ```bash
   BACKUP_PASSPHRASE='…' scripts/restaurer.sh --verifier dhb-sauvegarde-….tar.gpg
   ```
3. **Créer un projet Supabase NEUF** (ne jamais restaurer par-dessus la base
   en service : le script refuse si des tables DHB existent déjà).
4. **Restaurer** avec la chaîne « Session pooler » du nouveau projet :
   ```bash
   BACKUP_PASSPHRASE='…' CIBLE_DB_URL='postgresql://…' scripts/restaurer.sh dhb-sauvegarde-….tar.gpg
   ```
   Le script restaure la structure, les comptes, les données, puis les index,
   clés, déclencheurs et règles de sécurité, recrée ce qui vit hors du schéma
   `public` (déclencheur de profil, temps réel) et **compare le nombre de
   lignes de chaque table avec la sauvegarde** : il s'arrête en erreur au
   moindre écart.
   **PDF** : ajouter `SUPABASE_URL='https://<nouveau>.supabase.co'
   SUPABASE_SERVICE_ROLE_KEY='…'` devant la commande pour remettre les PDF dans
   le stockage `documents` du nouveau projet. Sans ces variables, les PDF sont
   copiés dans un dossier `pdf-restaures-…` à déposer à la main (Supabase →
   Storage → documents, mêmes sous-dossiers `factures/` et `devis/`). Le
   script vérifie que le nombre de PDF correspond à la sauvegarde.
5. **Rebrancher** : remplacer l'URL et la clé publique du nouveau projet dans
   `sites/*/assets/js/supabase-config.js` et `admin-react/.env`, redéployer les
   Edge Functions et leurs secrets, et vérifier dans Authentication que
   « Allow new users to sign up » est **désactivé**.

## 4. Limites connues

- Les **PDF** ne sont copiés que si `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`
  sont définis ; un PDF de devis manquant se régénère depuis le back-office,
  mais le PDF **archivé** d'une facture émise n'existe que dans le stockage et
  dans les sauvegardes.
- Les comptes sont restaurés avec leurs mots de passe chiffrés ; si la
  version d'Auth du nouveau projet diffère fortement, certains utilisateurs
  peuvent devoir réinitialiser leur mot de passe.
- Les réglages du tableau de bord Supabase (Auth, secrets des Edge Functions,
  webhooks, cron) ne sont pas dans la sauvegarde : ils sont décrits dans
  `admin-react/README.md` et `supabase/README-SETUP.md`.
- Un dépôt GitHub **public** expose ses artefacts aux autres comptes GitHub :
  le fichier reste illisible sans la phrase de chiffrement, mais un dépôt
  **privé** est recommandé.
