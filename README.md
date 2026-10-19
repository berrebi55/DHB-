# Site web DHB — Maintenance & sécurité informatique pour les entreprises

Site vitrine statique, responsive et optimisé SEO pour **DHB**, prestataire de
maintenance, dépannage et sécurité informatique (infogérance) pour les entreprises.
Interventions sur site en Île-de-France, support à distance partout en France.

## Contenu du site (46 pages)

- **Accueil** orienté conversion (hero, problème/solution, services, engagements, process, confiance, blog, formulaire).
- **7 pages services** : dépannage & assistance, maintenance du parc, supervision & monitoring (via NinjaOne), cybersécurité, sauvegarde & restauration, messagerie & cloud pro, infogérance globale.
- **9 pages locales (SEO local)** : Paris, Boulogne-Billancourt, Saint-Denis, Nanterre, Créteil, Versailles, Montreuil, Argenteuil + support à distance (France). Contenu unique par ville, modèle à dupliquer.
- **20 articles de blog** réellement rédigés (800–1300 mots), organisés en cocon sémantique (5 thèmes → pages services piliers).
- **À propos, Contact, Mentions légales, Politique de confidentialité (RGPD), Plan du site, 404.**
- `sitemap.xml`, `robots.txt`, données structurées JSON-LD (entreprise locale, FAQ, articles, fil d'Ariane).

## Principes respectés

- **Zéro invention** : aucun faux avis, aucun chiffre ni ancienneté inventés. Les preuves chiffrées sont remplacées par des engagements. La structure d'avis reste vide (« Vos premiers retours clients apparaîtront ici »).
- **Aucun prix** nulle part — uniquement des boutons « devis / audit gratuit ».
- Tout élément non vérifiable est marqué **`[À COMPLÉTER PAR LE PROPRIÉTAIRE]`**.
- RGPD : bandeau cookies (refus aussi simple que l'acceptation), consentement sur le formulaire, pages légales.
- Accessibilité (contrastes, navigation clavier, lien d'évitement, textes alternatifs), responsive mobile-first, chargement rapide.

## ⚠️ Valeurs d'EXEMPLE à remplacer avant mise en ligne

Elles sont centralisées en haut de **`build/base.py`** (puis régénérer, voir ci-dessous) :

| Variable | Valeur d'exemple actuelle |
|---|---|
| `DOMAIN` | `https://www.dhb-informatique.fr` |
| `PHONE_DISPLAY` / `PHONE_LINK` | `01 23 45 67 89` / `+33123456789` |
| `WHATSAPP` | `33123456789` |
| `EMAIL` | `contact@dhb-informatique.fr` |
| `ADDRESS_CITY` | `Paris` |

À compléter aussi dans le contenu (balises `[À COMPLÉTER PAR LE PROPRIÉTAIRE]`) :
certifications/partenaires réels, SIRET et forme juridique, hébergeur (mentions légales),
présentation du/des fondateur(s), lien vers la plateforme de supervision NinjaOne, horaires exacts.

> Le formulaire de contact est fonctionnel côté affichage (confirmation après envoi) mais
> **n'envoie aucune donnée** : il faut le brancher à un service d'envoi d'emails / backend
> avant la mise en production.

## Régénérer le site

Le HTML est généré par un script Python (sans dépendance) à partir de gabarits partagés,
pour garantir la cohérence de toutes les pages.

```bash
python3 build/build.py
```

Les fichiers HTML, `sitemap.xml` et `robots.txt` sont (re)créés à la racine.

### Organisation

```
assets/css/style.css      # design system complet
assets/js/main.js         # menu mobile, cookies RGPD, animations, formulaire
assets/img/               # favicon + image de partage (OG)
build/base.py             # gabarit, en-tête/pied, composants, SEO, valeurs d'exemple
build/pages_home.py       # accueil
build/pages_services.py   # pages services + index
build/pages_zones.py      # pages locales + index
build/blog_data.py        # contenu éditorial des articles
build/pages_blog.py       # rendu du blog
build/pages_misc.py       # à propos, contact, légal, plan du site, 404
build/build.py            # orchestrateur + sitemap + robots
```

### Ajouter une ville (SEO local)

Ajouter une entrée dans `VILLES` (`build/base.py`) et le contenu local correspondant
dans `VILLE_CONTENT` (`build/pages_zones.py`), puis régénérer. Écrire un contenu local
réel (contexte, tissu économique, délais) pour éviter toute duplication.
