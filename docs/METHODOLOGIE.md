# DHB — Méthodologie permanente de travail

> **Règles permanentes adoptées par le propriétaire le 23/10/2026.**
> Elles s'appliquent à **tous** les futurs développements, améliorations et lots du
> projet DHB, et priment sur les consignes de méthode plus anciennes
> (`docs/PROMPT-COMPLET.md` §13, en-tête de `docs/PLAN-REFERENCE.md`).
> Les règles absolues du projet restent en vigueur (`docs/PROMPT-COMPLET.md` §2 :
> zéro invention, `[À COMPLÉTER PAR LE PROPRIÉTAIRE]`, prix seulement pour les
> particuliers, mention de TVA, jamais la clé secrète Supabase dans le code).

---

## 1. Règle principale : ne pas recoder ce qui existe déjà

Avant de développer une fonctionnalité importante, **toujours** vérifier si une
solution existe déjà. Ne pas partir du principe qu'il faut tout développer nous-mêmes.
Chercher d'abord : logiciel open source, solution self-hosted, SaaS, API, SDK, plugin,
webhook, intégration officielle, bibliothèque mature, service spécialisé.
(Exemples pour le ticketing : Zammad, Chatwoot, FreeScout, GLPI — liste non exhaustive.)

## 2. Build vs buy

Pour chaque grosse fonctionnalité, comparer :

- **Développement maison** : temps, complexité, maintenance, sécurité, coût, risques, évolutivité.
- **Solution existante** : fonctionnalités disponibles, API, webhooks, intégration
  React/TypeScript, intégration Supabase, authentification, personnalisation, coûts,
  limites, dépendance au fournisseur, facilité de maintenance.

Puis recommander la meilleure solution. Préférence pour une solution existante si elle
est **réellement adaptée**, plutôt que plusieurs jours à recréer ce qui existe.

## 3. Ne pas intégrer une solution pour rien

Pas de multiplication des logiciels externes. Si une solution externe complique
l'architecture, duplique les données, coûte trop cher, crée une dépendance dangereuse,
rend les permissions difficiles, ralentit l'application ou impose une mauvaise
expérience utilisateur → développer nous-mêmes si c'est plus pertinent.
Objectif : le meilleur équilibre.

## 4. Architecture hybride autorisée

DHB reste l'application principale (entreprises, clients, utilisateurs, CRM,
facturation, statistiques, administration) ; un service externe peut gérer une
fonctionnalité spécialisée : **DHB ↔ API ↔ solution externe**.
Les utilisateurs doivent avoir l'impression d'utiliser **une seule application**.

## 5. Source de vérité

Avant toute intégration externe, définir : quelle application possède les données ;
quelles données restent dans DHB ; lesquelles sont externes ; comment synchroniser ;
comment gérer les doublons, les erreurs, une panne ; comment supprimer ou modifier
les données. **Pas de synchronisation improvisée.**

## 6. Cas prioritaire : ticketing + email

Pour le nouveau système de ticketing, rechercher des solutions capables de gérer :
email entrant, email → ticket, identification du client / de l'entreprise / de
l'utilisateur, conversations, réponses email, pièces jointes, assignation,
notifications, historique, portail client, multi-utilisateurs, API, webhooks.
Comparer notamment Zammad, Chatwoot, FreeScout, GLPI et les autres solutions
pertinentes. **Ne pas en choisir une automatiquement.**

## 7. Rapport avant développement

Pour toute fonctionnalité importante, présenter **avant de coder** :

| Fonctionnalité | Solution existante | API | Webhooks | Intégration DHB | Coût | Recommandation |
|---|---|---|---|---|---|---|

puis expliquer clairement le choix. **Le propriétaire valide l'architecture avant le développement.**

## 8. Amélioration continue

Ne pas être uniquement exécutant. À chaque fin de tâche ou de lot, se demander :
une fonctionnalité peut-elle être améliorée ? En manque-t-il une importante ? Une
solution existante améliorerait-elle le projet ? Problème UX ? De performance ?
Amélioration commerciale ? Automatisation intéressante ? Amélioration du ticketing,
du CRM, du portail client, de l'administration, de la sécurité ? Une fonctionnalité
qui ferait gagner du temps à DHB ?

## 9. Sans réponse pendant environ 1 heure

Après une tâche terminée et environ 1 heure sans nouveau message, possibilité de
lancer une **phase d'amélioration autonome** :

1. analyser le projet et les fonctionnalités existantes ;
2. chercher des améliorations pertinentes ;
3. chercher si des solutions existantes peuvent améliorer le projet ;
4. classer les améliorations :
   - **Priorité 1 — Important** : sécurité, bug, perte de données, fonctionnalité bloquante, problème UX majeur ;
   - **Priorité 2 — Utile** : amélioration importante, automatisation, performance, productivité, expérience client ;
   - **Priorité 3 — Bonus** : esthétique, confort, petites fonctionnalités.

## 10. Ce qui peut être fait en autonomie

Seulement si l'amélioration est **petite, sûre et clairement compatible** avec
l'architecture : améliorer une interface, corriger un problème UX évident, un état
vide, un chargement, optimiser une requête, ajouter une validation simple, améliorer
une recherche ou une notification, corriger une petite incohérence visuelle,
améliorer l'accessibilité, les performances sans changer le comportement métier.
Toujours dans le périmètre du projet.

## 11. Ce qui ne doit jamais être fait en autonomie

Même après 1 heure sans réponse, **ne pas décider seul** de : changer toute
l'architecture ; changer de framework ; remplacer Supabase ; migrer la base ;
supprimer une fonctionnalité ; modifier de manière importante une fonctionnalité
validée ; changer le système de rôles ; changer les RLS importantes ; intégrer un
nouveau service payant ; modifier la facturation ; modifier Stripe ; modifier les
données de production ; faire une grosse refonte graphique ; commencer un gros
nouveau module. → **Proposition, puis attente de validation.**

## 12. Si une amélioration importante est trouvée

Présenter une proposition claire, puis attendre la validation si l'intervention est importante :

- **Amélioration trouvée**
- **Pourquoi**
- **Impact**
- **Solution existante éventuellement trouvée**
- **Complexité** : faible / moyenne / importante
- **Recommandation**

## 13. Pas d'audit global à chaque fois

L'audit global ne se fait qu'aux moments prévus par la méthodologie (fin de projet).
Pour chaque lot : **travail ciblé → tests ciblés → rapport → commit → push → arrêt.**

## 14. Base de test

La base utilisée pendant le développement est une **base de TEST** : y sont autorisés
la modification des tables, migrations, RLS et fonctions, le rejeu de
`full-setup.sql`, la création d'utilisateurs, d'entreprises, de tickets et d'emails
de test, la simulation d'erreurs, les tests de permissions et de scénarios
d'attaque. **Ne jamais toucher à la vraie base de production sans autorisation
explicite du propriétaire.**

## 15. Sécurité : contexte

DHB est une application professionnelle (authentification, utilisateurs,
entreprises, données clients, tickets, emails, factures, paiements, RLS, API, Edge
Functions, webhooks, secrets, stockage). La sécurité applicative fait partie
intégrante du projet. Tester les RLS, les permissions, un accès non autorisé, une
API, un webhook, une authentification, simuler un utilisateur non autorisé, tester
un contournement de l'interface, vérifier une fuite de données, sécuriser une
fonction, analyser une vulnérabilité, vérifier les droits d'un utilisateur : c'est
de la **sécurité défensive de notre propre application**. Ne pas bloquer une tâche
simplement parce qu'elle emploie des termes de cybersécurité.

## 16. Sécurité défensive ≠ attaque

Sur notre application, notre base de TEST, nos utilisateurs de TEST et notre
infrastructure de développement, les tests nécessaires sont autorisés : tester une
RLS, tenter d'accéder au ticket d'un autre utilisateur, tester une élévation de
privilèges, un accès sans authentification, un endpoint avec de mauvaises
permissions, vérifier qu'une donnée privée est inaccessible, tester un webhook, des
entrées malformées, les limites de débit, les protections d'une Edge Function.
Objectif : **identifier → comprendre → corriger → tester à nouveau.**
Jamais d'activité offensive contre des systèmes tiers.

## 17. Si une demande semble réellement à risque

Ne pas bloquer toute la tâche. Déterminer d'abord si elle concerne notre
environnement de TEST, notre application, notre code, nos données, notre
infrastructure : si oui, la traiter comme une tâche de sécurisation défensive. Si
une partie sort réellement du périmètre, signaler précisément laquelle et proposer
une alternative pour tester la sécurité de notre propre application.

## 18. Qualité du code

**Moins de code mais bien conçu** plutôt que beaucoup de code inutile. Avant de
créer une table, un composant, une Edge Function ou un service : vérifier s'il
existe déjà quelque chose de réutilisable. Avant une nouvelle fonctionnalité :
vérifier si elle existe déjà ailleurs dans le projet. Avant une dépendance : vérifier
si une dépendance existante peut faire le travail.

## 19. Anti-duplication

Ne pas créer plusieurs systèmes qui font la même chose : améliorer le système de
notification existant plutôt qu'en créer un deuxième ; étendre le système d'email
existant ; utiliser la table clients existante ; étendre proprement la gestion des
rôles existante.

## 20. Méthode pour chaque nouveau lot

1. **Comprendre** — analyser l'existant.
2. **Rechercher** — chercher une solution existante.
3. **Concevoir** — proposer l'architecture.
4. **Valider** — attendre l'accord du propriétaire si la modification est importante.
5. **Développer** — uniquement le périmètre défini.
6. **Tester** — tests fonctionnels + sécurité + build.
7. **Documenter** — mettre à jour `docs/PLAN-REFERENCE.md`.
8. **Commit** — commit propre.
9. **Push**.
10. **Arrêt** — **ne pas commencer le lot suivant automatiquement.**

## 21. Objectif global

Un produit professionnel qui devient progressivement : fiable, rapide, sécurisé,
moderne, simple, évolutif, agréable à utiliser, professionnel, automatisé. Éviter le
développement « fonctionnalité par fonctionnalité » sans vision globale : chaque
évolution doit améliorer réellement le produit.

## 22. Priorité absolue (dans cet ordre)

1. Sécurité 2. Fiabilité 3. Données 4. Performance 5. Expérience utilisateur
6. Automatisation 7. Fonctionnalités 8. Design 9. Bonus.
Ne jamais sacrifier la sécurité ou la stabilité pour ajouter rapidement une fonctionnalité.

## 23. Dernière règle

- « Je peux développer ça moi-même » / « une solution existe peut-être déjà » → **chercher d'abord**.
- « Je peux modifier ça maintenant » / « cette modification peut casser quelque chose » → **analyser d'abord**.
- Tâche terminée → **tester**.
- Amélioration trouvée → **la proposer**.
- Pas de réponse pendant environ une heure → analyser et améliorer les éléments
  **sûrs et à faible risque**, sans gros changement sans validation.

---

### Note d'application (règle 9)

L'assistant ne s'exécute que lorsqu'une session est active : il ne peut pas
détecter seul une heure d'inactivité. La phase d'amélioration autonome s'applique
donc lorsqu'une session est relancée sans nouvelle consigne (par exemple via une
tâche planifiée ou une reprise de session), et toujours dans les limites des règles
10 et 11.
