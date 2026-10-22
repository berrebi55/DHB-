# DHB — Mise en route de la base de données (Supabase)

## Sécurité des clés
- Seule la **clé publique** (`sb_publishable_…`) est dans le code
  (`sites/*/assets/js/supabase-config.js`, `admin-react/.env`). C'est normal : la
  sécurité réelle vient des règles **RLS** en base.
- La **clé secrète** (`sb_secret_…`) n'est **jamais** dans le dépôt : uniquement
  dans Supabase → Edge Functions → Secrets.

## 1. Créer / mettre à jour la base
Supabase → **SQL Editor** → **New query** → coller tout
[`full-setup.sql`](./full-setup.sql) → **Run**.
Le script est **idempotent** : à relancer après chaque mise à jour du projet,
sans risque pour les données. C'est le **seul** script à utiliser
(les anciens `schema.sql` / `settings.sql` ont été supprimés).

## 2. Compte administrateur
Supabase → **Authentication** → **Users** → **Add user** (cocher « Auto confirm »).
Le **premier** compte créé devient `admin` ; les suivants sont `collaborateur`.
Recommandé : Authentication → Providers → Email → désactiver « Allow new users
to sign up » (les collaborateurs sont invités depuis le back-office).

## 3. Back-office
Voir [`../admin-react/README.md`](../admin-react/README.md) (lancement,
Edge Functions, secrets, planifications).

## 4. Tester
- Envoyer une demande depuis un formulaire d'un site → elle apparaît dans
  Back-office → Demandes.
- Modifier un prix dans Contenu → Prix & bandeau → il s'affiche sur DHB Assistance.

## 5. Sauvegardes
Le plan gratuit de Supabase ne fournit pas de sauvegarde téléchargeable : voir
la stratégie prévue dans [`../docs/PLAN-REFERENCE.md`](../docs/PLAN-REFERENCE.md) (problème C3, lot 2).
