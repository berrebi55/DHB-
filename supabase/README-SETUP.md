# DHB — Mise en route de la base de données & de l'espace admin (Phase 1)

Objectif : brancher les formulaires du site à une base **Supabase**, et activer
l'**espace admin** (`/admin/`) pour gérer en direct les demandes de devis et les
questions.

## 🔐 Avant tout : sécurité des clés

- La **clé publique** (`sb_publishable_…`) est dans `assets/js/supabase-config.js`.
  C'est normal et sans danger : la sécurité vient des règles **RLS** en base.
- La **clé secrète** (`sb_secret_…`) n'est **jamais** dans le code. Elle ne sert
  qu'à la fonction d'email, via les secrets Supabase.
- ⚠️ **Régénérez la clé secrète** (Supabase → Project Settings → API) : elle a
  transité en clair lors de l'échange. Mettez à jour le secret de la fonction ensuite.

## 1. Créer les tables (2 min)

1. Ouvrez votre projet Supabase → **SQL Editor** → **New query**.
2. Copiez-collez tout le contenu de [`schema.sql`](./schema.sql) → **Run**.
   Cela crée la table `leads`, les règles de sécurité (RLS) et le temps réel.

## 2. Créer votre compte administrateur (1 min)

1. Supabase → **Authentication** → **Users** → **Add user**.
2. Saisissez **votre email** + un **mot de passe**. (C'est ce compte qui ouvrira `/admin/`.)
3. **Authentication → Providers → Email** : laissez *Email* activé, mais
   **désactivez** « Allow new users to sign up » pour rester seul administrateur.

## 3. Tester

- **Formulaire** : ouvrez le site, envoyez une demande de test depuis `/contact/`.
- **Admin** : ouvrez `/admin/`, connectez-vous → la demande doit apparaître
  (et en direct pour les suivantes). Testez le changement de statut, les notes,
  le marquage lu/non lu, la suppression.

> En local : `python3 -m http.server 8000` puis http://localhost:8000/admin/

## 4. (Optionnel) Email à chaque nouvelle demande

Supabase n'envoie pas d'email applicatif tout seul : on utilise **Resend** (offre gratuite).

1. Créez un compte sur **resend.com**, obtenez une **API key**, et (recommandé)
   vérifiez votre domaine d'envoi.
2. Déployez la fonction : `supabase functions deploy notify-new-lead`
   (nécessite la CLI Supabase et `supabase link` sur votre projet).
3. Dans Supabase → **Edge Functions → notify-new-lead → Secrets**, ajoutez :
   - `RESEND_API_KEY` = votre clé Resend
   - `NOTIFY_TO` = l'adresse qui reçoit les alertes
   - `NOTIFY_FROM` = un expéditeur vérifié chez Resend
4. Créez un **Database Webhook** : Supabase → **Database → Webhooks → Create** :
   - Table : `public.leads` · Events : **Insert**
   - Type : **Supabase Edge Functions** · Function : `notify-new-lead`

À chaque nouvelle demande, vous recevez alors un email récapitulatif.

## Ce qui reste pour la Phase 2 (quand vous voudrez)

- Gestion du **contenu** (articles de blog & pannes) depuis l'admin (nécessite de
  rendre ces pages dynamiques).
- Notifications **WhatsApp / SMS** (via un service tiers payant type Twilio).
