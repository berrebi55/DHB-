# DHB — Sites publics + back-office

Projet **DHB** : trois sites publics (DHB Groupe, DHB Pro pour les entreprises,
DHB Assistance pour les particuliers) et **un back-office** (CRM, devis,
factures, paiements, abonnements, tickets, pilotage) reliés à **une seule base
Supabase**.

## 🗂️ Structure

```
DHB-/
├─ index.html          ← portail de développement local (non référencé)
├─ start.bat / start.sh← lanceurs locaux (Windows / macOS-Linux)
├─ sites/
│   ├─ groupe/         ← DHB Groupe (institutionnel)
│   ├─ infogerance/    ← DHB Pro (entreprises) — source des CSS/JS communs
│   └─ particuliers/   ← DHB Assistance (particuliers)
├─ build/              ← générateurs Python des 3 sites (build_all.py)
├─ admin-react/        ← back-office (React + Refine + Ant Design)
├─ supabase/           ← full-setup.sql (base) + Edge Functions
└─ docs/               ← REFONTE.md, PLAN-PLATEFORME.md, PROMPT-COMPLET.md
```

## ▶️ Lancer en local

- **Windows** : double-cliquer sur `start.bat`.
- **macOS / Linux** : `./start.sh`.

Puis : portail http://localhost:8000/ · back-office http://localhost:5173/.
Après une modification des générateurs : `python3 build/build_all.py`
(`DHB_LIENS=prod` pour des liens vers les vrais domaines).

## 🗄️ Base de données
Voir **`supabase/README-SETUP.md`** : un seul script, `supabase/full-setup.sql`,
à exécuter (et ré-exécuter après mise à jour) dans le SQL Editor.

## 🔐 Sécurité des clés
- Seule la **clé publique** Supabase est dans le code (protégée par RLS).
- La **clé secrète** n'est jamais dans le dépôt (secrets Supabase uniquement).

## 📚 Documentation
- `docs/PROMPT-COMPLET.md` : description complète du projet.
- `docs/PLAN-PLATEFORME.md` : audit, architecture cible et plan par priorité.
- `docs/REFONTE.md` : refonte, design system, mesure d'audience.
- `admin-react/README.md` : back-office, Edge Functions, secrets, déploiement.
