# DHB — Back-office React (Refine + Supabase)

Nouvelle administration centralisée de DHB : interface pro façon SaaS,
graphiques de ventes, et automatisations (facturation récurrente, relances,
signature de devis en ligne, rôles multi-utilisateur).

> L'ancienne admin « un seul fichier » (`../admin/index.html`) reste
> fonctionnelle. On bascule sur celle-ci quand tu es prêt.

## 1. Prérequis

- **Node.js 18+** installé (https://nodejs.org — prends la version LTS).
  Vérifie dans un terminal : `node -v`.

## 2. Lancer en local (développement)

```bash
cd admin-react
npm install        # la 1re fois seulement
npm run dev        # démarre sur http://localhost:5173
```

Les clés Supabase **publiques** sont déjà dans `.env` (jamais la clé secrète).
Pour un autre projet Supabase, copie `.env.example` en `.env` et adapte.

## 3. Base de données

Dans Supabase → SQL Editor, exécute **`../supabase/full-setup.sql`**
(idempotent : relançable sans risque). Il crée/complète toutes les tables
(clients, devis, factures, abonnements…) + les rôles, la signature de devis
et la facturation récurrente.

## 4. Créer ton compte admin

Supabase → Authentication → Users → **Add user** (email + mot de passe).
Le **premier** compte créé devient automatiquement `admin`. Les suivants
sont `collaborateur` (lecture, pas de suppression, pas d'accès aux prix).
Pour changer un rôle : table `profiles`, colonne `role`
(`admin` ou `collaborateur`).

## 5. Automatisations (Edge Functions)

Déploie les fonctions (nécessite la CLI Supabase) :

```bash
supabase functions deploy get-devis-public --no-verify-jwt
supabase functions deploy sign-devis        --no-verify-jwt
supabase functions deploy generate-recurring-invoices
supabase functions deploy send-reminders
supabase functions deploy send-invoice       # (déjà présente)
```

- **Signature de devis** : `get-devis-public` + `sign-devis` alimentent la
  page publique `../sites/groupe/devis.html`. Dans l'admin, bouton 🔗 sur un
  devis → copie le lien `devis.html?token=…` à envoyer au client.
  Règle `VITE_SIGN_BASE` dans `.env` sur l'URL réelle de cette page.
- **Relances / facturation récurrente** : boutons sur le tableau de bord
  (« Générer les factures du mois », « Lancer les relances »).
  Pour l'**automatique**, planifie un appel quotidien (Supabase →
  Database → Cron, ou pg_cron) :

```sql
-- Exemple : tous les jours à 8h, générer les factures récurrentes.
select cron.schedule('dhb-factures', '0 8 * * *', $$
  select net.http_post(
    url := 'https://<PROJECT>.supabase.co/functions/v1/generate-recurring-invoices',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <ANON_KEY>"}'::jsonb,
    body := '{}'::jsonb);
$$);
```

Les emails (relances, factures) nécessitent les secrets `RESEND_API_KEY`
et `NOTIFY_FROM` sur les fonctions concernées. Sans clé, les actions
fonctionnent mais n'envoient pas d'email (simulation).

## 6. Mettre en ligne (plus tard)

```bash
npm run build      # génère le dossier dist/
```

Déploie `dist/` sur **Vercel** ou **Netlify** (gratuit, glisser-déposer ou
connexion GitHub). Pense à y définir les variables `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, `VITE_SIGN_BASE`.

## Structure

```
src/
  App.tsx              # config Refine (ressources, routes, rôles)
  providers/           # auth + contrôle d'accès (rôles)
  pages/
    dashboard/         # KPI + graphiques + boutons automatisations
    leads/ clients/ devis/ factures/ abonnements/ tickets/ settings
  utils/               # format € / dates, impression PDF
```
