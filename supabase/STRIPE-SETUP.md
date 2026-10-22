# 💳 Activer le paiement en ligne (Stripe) — site Particuliers

Le code est **déjà prêt** (scaffolding). Tant que ce n'est pas configuré, les
boutons « Je m'abonne » / « Être aidé(e) » renvoient simplement vers le formulaire
de contact. Voici comment l'activer.

## 1. Côté Stripe (votre compte)
1. Créez un compte sur **stripe.com**.
2. Créez vos **produits + prix** :
   - un **prix récurrent** pour l'abonnement (ex. 19,90 €/mois) → notez son identifiant `price_...`
   - un **prix ponctuel** pour l'intervention (optionnel) → `price_...`
3. Récupérez votre **clé secrète** : Dashboard Stripe → Developers → API keys → `sk_...`
   (utilisez d'abord les clés **test** `sk_test_...`).

## 2. Déployer la fonction
```bash
supabase functions deploy create-checkout
```
Puis dans Supabase → **Edge Functions → create-checkout → Secrets**, ajoutez :
- `STRIPE_SECRET_KEY` = `sk_test_...` (puis `sk_live_...` en production)
- `STRIPE_PRICE_ABO`  = `price_...` (abonnement)
- `STRIPE_PRICE_INT`  = `price_...` (intervention, optionnel)
- `SITE_URL`          = l'URL publique du site Particuliers (pour les pages de retour)

## 3. Activer côté site
Dans `sites/particuliers/assets/js/supabase-config.js`, passez :
```js
window.DHB_STRIPE = { enabled: true };
```
Régénérez si besoin et republiez.

## 4. Tester
- Cliquez sur « Je m'abonne » → vous êtes redirigé vers la page de paiement Stripe.
- Carte de test Stripe : `4242 4242 4242 4242`, date future, CVC au hasard.
- Après paiement → redirection vers `/paiement-reussi/` ; annulation → `/paiement-annule/`.

## 5. Enregistrer automatiquement les paiements dans DHB (webhook)
Sans cette étape, Stripe encaisse mais **rien n'apparaît dans le back-office**.
Avec elle, chaque paiement crée (ou retrouve, par son email) la fiche client,
une **facture numérotée déjà payée** et le **paiement « Stripe »** ; un
abonnement est créé, renouvelé chaque mois (nouvelle facture payée) et passe
« suspendu » / « résilié » selon Stripe. Un même paiement n'est jamais
enregistré deux fois.

1. Mettre à jour la base : SQL Editor → exécuter `supabase/full-setup.sql`.
2. Déployer la fonction :
   ```bash
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```
3. Stripe → **Developers → Webhooks → Add endpoint** :
   - URL : `https://<votre-projet>.supabase.co/functions/v1/stripe-webhook`
   - événements : `checkout.session.completed`,
     `checkout.session.async_payment_succeeded`, `invoice.paid`,
     `customer.subscription.updated`, `customer.subscription.deleted`.
4. Copier le **Signing secret** (`whsec_…`) affiché par Stripe, puis Supabase →
   Edge Functions → Secrets : `STRIPE_WEBHOOK_SECRET = whsec_…`
   (`STRIPE_SECRET_KEY`, déjà défini à l'étape 2, permet en plus de reprendre le
   libellé exact du produit sur la facture).
5. Tester avec une carte de test : la facture payée apparaît dans Factures,
   le paiement dans Paiements, l'abonnement dans Abonnements (mention
   « Paiement en ligne (Stripe) »). En cas de souci : Stripe → Webhooks →
   l'endpoint → onglet des événements (réponse de DHB, renvoi possible).

> Les abonnements payés par Stripe ne sont **jamais** facturés une seconde fois
> par la génération mensuelle de DHB : c'est Stripe qui prélève, DHB crée la
> facture à chaque paiement reçu.

> ⚠️ Les pages de retour `/paiement-reussi/` et `/paiement-annule/` existent déjà
> sur le site Particuliers. En production, `SITE_URL` doit pointer vers le vrai domaine.
