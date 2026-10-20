# DHB — Groupe multi-sites + admin centralisé

Monorepo du **groupe DHB** : plusieurs sites (filiales) qui partagent **un seul
back-office d'administration** et **une seule base de données Supabase**
(demandes de devis / messages centralisés, filtrables par filiale).

## 🗂️ Structure

```
DHB-/
├─ index.html                 ← Portail de DEV local (liens vers tous les sites)
├─ start.sh                   ← Lance le serveur de dev local
├─ sites/
│   ├─ groupe/                ← Site DHB GROUPE (vitrine chapeau)
│   └─ infogerance/           ← Filiale « DHB Infogérance » (entreprises) — site complet
│       (ensuite : particuliers/ …)
├─ admin/                     ← ESPACE ADMIN CENTRALISÉ (toutes filiales)
├─ supabase/                  ← Base de données partagée (schéma, fonction email, guide)
└─ build/                     ← Générateurs de sites (Python, sans dépendance)
    ├─ *.py                   ← générateur du site Infogérance → sites/infogerance/
    └─ groupe/build_groupe.py ← générateur du site Groupe → sites/groupe/
```

Chaque site est **autonome** (ses propres `assets/`), donc déployable seul sur son
(sous-)domaine. Tous pointent vers le **même Supabase** → admin centralisé.

## ▶️ Lancer en local

```bash
./start.sh            # (ou : python3 -m http.server 8000)
```
Puis ouvrez **http://localhost:8000/** (portail), ou directement :

| | URL locale |
|---|---|
| Portail de dev | http://localhost:8000/ |
| DHB Groupe | http://localhost:8000/sites/groupe/ |
| DHB Infogérance | http://localhost:8000/sites/infogerance/ |
| **Admin centralisé** | http://localhost:8000/admin/ |

> Windows : `py -m http.server 8000`. Il faut Python 3 installé.

## 🔧 Régénérer les sites après modification du contenu

```bash
python3 build/build.py              # régénère le site Infogérance
python3 build/groupe/build_groupe.py # régénère le site Groupe
```

## 🗄️ Base de données & admin (Supabase)

Voir **`supabase/README-SETUP.md`**. En résumé :
1. Exécuter `supabase/schema.sql` dans le SQL Editor (crée `leads` + colonne `entity` + RLS + temps réel).
2. Créer votre compte admin (Authentication → Users).
3. Chaque demande est étiquetée par **filiale** (`entity` : `groupe` / `infogerance` / `particuliers`),
   et l'admin les filtre par filiale, statut, type, recherche — **en direct**.

Chaque site fixe sa filiale dans `sites/<site>/assets/js/supabase-config.js` (`entity`).

## 🔐 Sécurité des clés
- Seule la **clé publique** Supabase est dans le code (normal, protégé par RLS).
- La **clé secrète** n'est jamais dans le dépôt (uniquement variables d'env Supabase).
- Pensez à **régénérer** la clé secrète (elle a transité en clair lors de l'échange).

## 🌐 Mise en ligne (plus tard)
En local pour l'instant. En production, chaque dossier `sites/<nom>/` + `admin/`
se publie sur son propre (sous-)domaine (Netlify, Cloudflare Pages, OVH…), tous
reliés au même projet Supabase. Le portail `index.html` racine n'est qu'un outil de dev.

## 🚧 Feuille de route
- **Fait** : site Groupe, filiale Infogérance (complète), admin centralisé, base devis/messages, notif email.
- **Phase 2** : site Particuliers complet + **paiement en ligne** (abonnement + intervention, Stripe),
  gestion de contenu depuis l'admin, notifications WhatsApp/SMS.
