# DHB — Back-office React (Refine + Supabase)

Administration centralisée de DHB, refondue (voir `../docs/REFONTE.md`) :
interface claire façon SaaS, CRM (demandes → clients → devis → factures →
paiements), abonnements, tickets, pilotage (CA, MRR/ARR, performance),
contenu du site, utilisateurs et journal d'activité.

> L'ancienne admin « un seul fichier » (`admin/`) a été supprimée : cette
> application est le seul back-office.

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
(idempotent : relançable sans risque). **À relancer après cette refonte** :
le bloc « REFONTE v2 » ajoute les paiements, notes, fiche entreprise, journal
d'activité, nouveaux statuts, vues de calcul et règles de sécurité (RLS).

## 4. Créer ton compte admin

Supabase → Authentication → Users → **Add user** (email + mot de passe).
Le **premier** compte créé devient automatiquement `admin`. Les suivants
sont `collaborateur` : ils créent et modifient, mais ne suppriment rien,
ne changent ni les prix du site, ni la fiche entreprise, ni les rôles
(détail : Système → Utilisateurs). L'admin invite les collaborateurs depuis
Système → Utilisateurs (fonction `invite-user`).

## 5. Automatisations (Edge Functions)

Déploie **toutes** les fonctions (CLI Supabase). Elles vérifient elles-mêmes
l'utilisateur connecté ou le secret de cron, d'où `--no-verify-jwt` :

```bash
for f in get-devis-public sign-devis send-devis send-invoice invite-user \
         generate-recurring-invoices send-reminders notify-new-lead create-checkout; do
  supabase functions deploy $f --no-verify-jwt
done
```

Secrets à définir (Supabase → Edge Functions → Secrets). **Aucun n'est à
mettre dans le code ou dans `.env` du front.**

| Secret | Rôle |
|---|---|
| `CRON_SECRET` | mot de passe des appels planifiés (en-tête `x-cron-secret`) |
| `SIGN_BASE` | URL de la page publique de signature (`…/devis.html`) |
| `ADMIN_URL` | URL du back-office (liens dans les emails) |
| `RESEND_API_KEY`, `NOTIFY_FROM`, `NOTIFY_TO` | envoi des emails (sans clé : simulation) |
| `WEBHOOK_SECRET` | optionnel, protège `notify-new-lead` |
| `STRIPE_*`, `SITE_URL` | paiement en ligne du site Assistance |

Les fonctions **refusent** désormais les appels anonymes (sauf la page publique
de devis, protégée par son jeton). Envoi de devis/factures : boutons sur les
fiches ; le serveur relit le document en base et l'envoie à l'email du client.

Planification quotidienne (Supabase → Database → Cron, ou pg_cron) :

```sql
select cron.schedule('dhb-factures', '0 8 * * *', $$
  select net.http_post(
    url := 'https://<PROJECT>.supabase.co/functions/v1/generate-recurring-invoices',
    headers := '{"Content-Type":"application/json","x-cron-secret":"<CRON_SECRET>"}'::jsonb,
    body := '{}'::jsonb);
$$);
select cron.schedule('dhb-relances', '0 9 * * 1-5', $$
  select net.http_post(
    url := 'https://<PROJECT>.supabase.co/functions/v1/send-reminders',
    headers := '{"Content-Type":"application/json","x-cron-secret":"<CRON_SECRET>"}'::jsonb,
    body := '{}'::jsonb);
$$);
```

## 6. Mettre en ligne

```bash
npm run build                    # génère dist/
VITE_BASE=/admin/ npm run build  # si l'admin est servie dans un sous-dossier
```

Déploie `dist/` sur Vercel ou Netlify avec les variables
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (clé **publique**) et
`VITE_SIGN_BASE`. Configure la réécriture de toutes les URL vers
`index.html` (application à une seule page).

## Structure

```
src/
  App.tsx                 # routes
  theme.ts, styles.css    # design system (couleurs, typographie, composants)
  providers/              # authentification + contrôle d'accès par rôle
  lib/                    # formats, statuts, calculs (metrics), hooks, documents
  components/
    layout/               # barre latérale (nav.tsx), en-tête, recherche Ctrl+K
    ui/                   # en-têtes de page, KPI, états vides, listes
    forms/ documents/ activity/
  pages/
    dashboard/ leads/ clients/ devis/ documents/ prestations/
    factures/ paiements/ abonnements/ tickets/
    pilotage/ contenu/ systeme/
```
