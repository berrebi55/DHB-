# Journal du travail autonome — DHB

Chaque passage (tâche planifiée horaire « DHB — avancement autonome », ou session de
travail) ajoute un bloc à la fin de ce fichier : ce qui a été fait, les fichiers, les
résultats des tests, le commit et la suite prévue. Période autonome : jusqu'au
**samedi 24 octobre 2026, 23 h (Paris)**.

Garde-fous permanents : jamais la vraie Supabase ni la production, pas de vrai paiement,
aucun email à de vraies personnes, aucun service payant, aucun secret dans le dépôt,
pas de réécriture de l'historique git.

---

## 2026-10-23 — Mise en place du mode autonome

- Fait :
  - outils de test déplacés du dossier temporaire de session vers `outils-test/` (commit `fd639d2`), avec la procédure pour recréer la base de test ;
  - tâche planifiée horaire créée (mode Auto, arrêt samedi 24/10 23 h Paris) ;
  - décisions du ticketing retenues : tickets dans DHB + réception des emails par Resend Inbound ; une adresse de support par site, à compléter ; expéditeur inconnu → ticket « à qualifier » ; portail client au lot 19 ; pas de contacts multiples pour l'instant.
- Fichiers : `outils-test/`, `journal-autonome/JOURNAL.md`.
- Tests : outils vérifiés depuis le nouvel emplacement (11/11, 7/7, 12/12).
- Commit : ce bloc.
- Suite prévue : lot 18 (email → ticket), en commençant par l'analyse et la conception.
- Points pour le propriétaire : laisser l'application Claude ouverte, Docker démarré et l'ordinateur sans mise en veille jusqu'à samedi 23 h.

## 2026-10-23 — Lot 18 (base) : conversation, pièces jointes, adresses de support

- Fait : tables `ticket_messages` et `ticket_pieces` (écriture réservée au serveur), numéro de ticket `#n` pour la référence `[DHB #n]` dans l'objet, canal (manuel / email), « à qualifier », dédoublonnage des emails reçus (Resend et file d'événements), réglage des adresses de support par site (contrôlé), journal « Email reçu de … / Réponse envoyée à … ». Correction au passage : la contrainte des intégrations du lot 11 aurait fait échouer le second passage de `full-setup.sql`.
- Fichiers : `supabase/full-setup.sql` (section 27), `supabase/tests/lot18-tickets-email.sql`, `outils-test/tout-tester.sh`.
- Tests : full-setup rejoué 2 fois (0 erreur) ; SQL lot 18 **18/18** ; non-régression lots 1 (73), 9 (23), 10 (20), 11 (14), 12 (11), 17 (5).
- Commit : voir ci-dessous.
- Suite prévue : `_shared/tickets.ts` (traitement d'un email reçu : récupération Resend, anti-boucle, fil, client, pièces jointes), fonction `email-entrant` (signature Svix), branche `email_recu` dans le robot, tests de bout en bout avec un faux Resend.
- Points pour le propriétaire : aucun.
