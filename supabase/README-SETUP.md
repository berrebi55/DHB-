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
**Inscription libre désactivée** : Supabase → Authentication → Sign In / Providers →
décocher « Allow new users to sign up ». Tout compte créé autrement qu'en étant
invité reste **`en_attente`** (aucun accès au CRM).

- **Votre compte administrateur** (une seule fois) : Authentication → Users →
  **Add user** (email + mot de passe, « Auto confirm »), puis dans le SQL Editor :
  `select public.definir_admin('votre@email.fr');`
  *(Si vous étiez déjà admin avant cette mise à jour, rien à faire : les rôles
  existants sont conservés.)*
- **Collaborateurs** : Back-office → Système → Utilisateurs → « Inviter un
  utilisateur » (fonction `invite-user`). Un compte « En attente » se valide
  au même endroit (changer son rôle).
- Rôles : `admin` (tout), `collaborateur` (crée et modifie, ne supprime rien,
  ne change ni les prix, ni la fiche entreprise, ni les rôles), `en_attente`
  (aucun accès). Il reste toujours au moins un administrateur.

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
