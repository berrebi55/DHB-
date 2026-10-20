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

## 5. (Recommandé) Suivi des abonnements
Pour enregistrer l'état des paiements/abonnements et gérer les renouvellements,
ajoutez un **webhook Stripe** vers une fonction `stripe-webhook` (à créer sur le
même modèle) qui écrit dans une table `abonnements`. À faire lors de la mise en
production.

> ⚠️ Les pages de retour `/paiement-reussi/` et `/paiement-annule/` existent déjà
> sur le site Particuliers. En production, `SITE_URL` doit pointer vers le vrai domaine.
