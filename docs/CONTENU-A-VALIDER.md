# DHB — Contenus des sites à valider par le propriétaire

Les sites ne doivent rien promettre qui ne soit vrai. Ce document liste ce qui
est **déjà publié dans les pages générées** mais n'a jamais été confirmé, et ce
qui manque pour que les pages de villes soient vraiment utiles. Tout se modifie
dans `build/` puis `python3 build/build_all.py`.

> Rien ici n'a été inventé pendant le lot 14 : on a seulement **raccourci** des
> titres, **relié** les pages entre elles et **recensé** les points à confirmer.

---

## 1. Titres courts proposés (lot 14) — `build/titres_courts.py`

29 pages avaient un titre trop long pour Google (plus de 60 caractères, coupé
dans les résultats). Un titre court leur est proposé : c'est la question de la
page, reformulée, **sans information nouvelle**. Le titre complet reste affiché
sur la page. ➜ Relire la liste, corriger ou supprimer une ligne (la page
reprend alors son titre automatique).

## 2. Engagements publiés à confirmer

| Engagement | Où | Nombre d'occurrences | Fichiers |
|---|---|---|---|
| **Horaires « du lundi au vendredi, 9 h – 18 h »** (aussi dans les données lues par Google : `openingHours`) | Pro : contact, données structurées | 2 | `build/pages_misc.py`, `build/base.py` |
| **Réponse « sous 24 h »** (ouvrées) | les 3 sites | 27 | `pages_home.py`, `pages_misc.py`, `pages_services.py`, `pages_zones.py`, `groupe/build_groupe.py`… |
| **Surveillance « 24/7 »** | Pro : supervision | 6 | `build/pages_services.py`, `build/base.py` |
| **Délais par ville** (« dans la journée », « délais courts ») | Pro : 13 pages de villes, § « Nos délais d'intervention » | 13 textes | `build/pages_zones.py` (`delai`) |
| **« Audit / diagnostic gratuit »** | Pro surtout | 69 | partout dans `build/` |
| **« Sans engagement »** | les 3 sites | 31 | partout dans `build/` |
| Mots « garanti(e) » | blog, pannes, services | 13 | `blog_data.py`, `problems_data.py`, `pages_services.py` |

➜ Pour chacun : **confirmer**, **corriger** (ex. « sous 48 h ») ou **retirer**.
Un délai annoncé qui n'est pas tenu est plus nuisible que pas de délai.

## 3. Pages de villes (Pro, 13 pages) — `build/pages_zones.py`

Chaque page a un texte propre à la ville (contexte, spécificités, délais),
mais les pages restent **semblables à 70 %** (même trame, mêmes services, même
FAQ). Google peut les considérer comme des pages « satellites » et n'en garder
qu'une partie. Ce qui les rendrait vraiment utiles — **uniquement si c'est vrai** :

- interventions déjà réalisées dans la ville (type de client, problème réglé —
  sans nom sans accord écrit) ;
- délai réel de déplacement depuis votre base, jours de passage habituels ;
- particularités locales réellement rencontrées (zones d'activités, type
  d'entreprises servies) ;
- un avis client local (réel, avec accord).

Si ces informations n'existent pas encore pour une ville, mieux vaut **retirer
la page** (ou la fusionner dans « Zones d'intervention ») que la garder vide.
Fait au lot 14 : chaque page de ville renvoie maintenant vers 6 autres villes
(même département d'abord) et vers le support à distance.

## 4. Informations légales et d'identité (`[À COMPLÉTER]`)

38 emplacements marqués `[À COMPLÉTER]` dans `build/` (mentions légales, SIRET,
forme juridique, hébergeur, présentation, durées de conservation…), plus les
valeurs `[EXEMPLE]` en tête de `build/base.py`, `build/groupe/build_groupe.py`
et `build/particuliers/build_particuliers.py` (domaines, téléphone, emails,
ville de l'adresse). Voir aussi `DOCUMENTATION.md` §10.

## 5. Guides et outils interactifs (lot 16)

- **Guides PDF** (`sites/*/assets/guides/`) : celui d'Assistance porte encore
  l'ancien nom « DHB Particuliers », et les deux affichent les coordonnées
  d'exemple (01 23 45 67 89, contact@… / bonjour@…). ➜ À régénérer avec le
  bon nom et les vraies coordonnées.
- **Formulaire des guides** : il ne promet plus d'envoi par email (aucun email
  n'était envoyé) ; le guide se télécharge aussitôt et la demande arrive dans
  « Demandes » avec l'étiquette « Guide téléchargé ». Un envoi automatique du
  guide par email est possible (moteur du lot 9) une fois les domaines connus.
- **Auto-diagnostic sécurité** (Pro, `build/pages_outils.py`) et **« Arnaque ou
  pas ? »** (Assistance, `build/particuliers/build_particuliers.py`) : textes
  repris des guides, sans statistique ajoutée. ➜ Relire les formulations.
