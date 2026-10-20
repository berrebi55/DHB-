# 🔍 DHB — Audit complet de l'application + guide de démarrage

> Pour auditer, faire des demandes, et savoir quoi faire de ton côté. 4 parties :
> 1) Audit détaillé · 2) Idées à ajouter · 3) NinjaOne pas-à-pas · 4) Préparer ta 1ʳᵉ acquisition.

---

# PARTIE 1 — Audit détaillé (ce que fait chaque chose)

## A. Site DHB Groupe (vitrine) — 5 pages
| Page | Ce qu'elle fait |
|---|---|
| Accueil | Présente le groupe + dirige vers les filiales (Infogérance, Particuliers) |
| Le groupe | Qui sommes-nous, valeurs |
| Contact | Formulaire → enregistre un lead (filiale « groupe ») |
| Mentions légales / Confidentialité | Conformité |

## B. Site DHB Infogérance (entreprises) — 130 pages
| Bloc | Ce qu'il fait |
|---|---|
| Accueil | Problème/solution, services, engagements, process, aperçu blog, formulaire devis |
| 7 pages Services | 1 page par service (dépannage, maintenance, supervision, cybersécurité, sauvegarde, messagerie/cloud, infogérance globale) — chacune : bénéfice, inclus, pour qui, FAQ, CTA devis |
| 9 pages Zones | SEO local (Paris, 92, 93, 94, 78, 95 + « à distance France ») — contenu unique par ville |
| 20 Articles de blog | Trafic SEO (pannes, sauvegarde, sécurité, messagerie, métier) + lead magnet PDF |
| 83 Pannes & questions | Base recherchable (14 catégories) : capte les recherches « problème » + questions coût/décision + par secteur |
| Lead magnet | Guide PDF « Sécurité PME » → capture email (lead) |
| À propos / Contact / Légal | Confiance + conformité |

## C. Site DHB Particuliers (grand public) — 31 pages
| Bloc | Ce qu'il fait |
|---|---|
| Accueil | Ton rassurant, services, offres avec PRIX, centre d'aide, lead magnet |
| Abonnement & tarifs | Formules + **prix affichés** (14,90 €/mois · 59 €) + FAQ + bouton paiement (Stripe pré-câblé) |
| Centre d'aide (22 fiches) | Réponses simples (ordi lent, virus, box, photos, smartphone, arnaques, seniors…) + CTA |
| Pages paiement | /paiement-reussi/ et /paiement-annule/ (retours Stripe) |
| Lead magnet | Guide PDF « Anti-arnaques » → capture email |
| Contact / À propos / Légal | Conversion + conformité |

## D. Espace admin (`/admin/`, privé) — ce que TU fais dedans
| Section | Ce que tu peux faire |
|---|---|
| **📥 Demandes** | Voir toutes les demandes EN DIRECT, filtrer par filiale/type/statut, rechercher, changer le statut (Nouveau→Contacté→Devis envoyé→Gagné/Perdu), ajouter des notes, marquer lu, **fixer une date de relance**, supprimer |
| **🔔 À relancer** | Voir les demandes à relancer aujourd'hui, bouton « Relancé ✓ » |
| **🎫 Tickets** | Créer/suivre des tickets de support (priorité, statut), supprimer |
| **🧾 Factures** | Créer une facture (mode franchise de TVA par défaut), numéro auto, **Imprimer** (PDF), **Envoyer par email**, changer le statut |
| **⚙️ Prix & paramètres** | Modifier les **prix** en direct + un **bandeau d'annonce** par filiale |

## E. Base de données (Supabase)
`leads` (demandes), `settings` (prix/annonces), `tickets`, `factures` — sécurisées (le public ne peut que créer une demande / lire les prix).

## F. Automatisations déjà prêtes (à activer avec tes clés)
- `notify-new-lead` : email à toi à chaque nouveau lead (Resend).
- `create-checkout` : paiement Stripe (abonnement/intervention).
- `send-invoice` : email « voici votre facture » (Resend).
- CI GitHub : régénère les sites + vérifie les liens à chaque modif.

---

# PARTIE 2 — Idées à ajouter (pour auditer et choisir)

**Conversion**
- Bouton « rappel en 5 min » (créneau), mini-diagnostic interactif, offre « intervention urgente ».
- Barre de progression / réassurance paiement.

**Acquisition**
- Séquences email automatiques (bienvenue, nurturing, relances) via Resend.
- Programme de parrainage, demande d'avis Google automatique.
- Paliers d'abonnement Particuliers (Essentiel / Confort / Famille) + page comparatif.

**Fidélisation**
- Espace client (voir ses interventions, sauvegardes OK, supervision).
- Rapport mensuel automatique aux abonnés (anti-résiliation).

**Admin / pilotage**
- Tableau de bord dirigeant (leads/semaine, taux de transfo, CA).
- Mini-CRM (historique par client), relances email automatiques.
- Gestion de contenu graphique (CMS complet) — couplé à la mise en ligne.

**Contenu / SEO**
- Plus de fiches (entreprises & particuliers), articles réguliers, mises à jour.
- Pages villes supplémentaires.

---

# PARTIE 3 — NinjaOne (RMM) : c'est quoi + comment faire

**C'est quoi ?** NinjaOne est un outil de **supervision et gestion à distance** (RMM). Tu installes un petit « agent » sur les ordinateurs/serveurs de tes clients → tu vois leur état en temps réel, tu reçois des alertes (disque plein, antivirus désactivé, sauvegarde échouée…), tu peux prendre la main à distance, déployer des mises à jour. C'est ce qui te permet d'**anticiper les pannes** = ton argument « on voit le problème avant vous ».

**Comment démarrer (tu ne l'as jamais utilisé) :**
1. **Crée un compte / un essai** sur ninjaone.com (c'est un outil **payant**, souvent facturé **par appareil/mois** — demande un devis ; prévois ce coût dans tes prix).
2. **Crée une « Organisation »** par client (ex. « Cabinet Dupont »).
3. **Installe l'agent** sur chaque poste/serveur du client (un petit programme à exécuter). Les appareils remontent alors automatiquement.
4. **Configure les alertes / politiques** (ce qui déclenche une notification).
5. **Prends en main à distance** depuis la console quand un client a un souci.
6. **Tableaux de bord** : surveille l'état de tous tes clients d'un coup.
7. Sur le site, le bloc « accès à votre supervision » doit pointer vers **ton espace NinjaOne** → récupère ce **lien** et donne-le-moi pour le mettre à la place du `[À COMPLÉTER]`.

> ⚠️ Coût : NinjaOne est payant. Vérifie le prix/appareil et **répercute-le dans tes forfaits** (c'est normal, c'est un service à valeur).
> 💡 Entraîne-toi d'abord **sur tes propres machines** avant un vrai client.

---

# PARTIE 4 — Préparer ta 1ʳᵉ acquisition (concret, à faire maintenant)

## Ce que tu dois avoir prêt AVANT de démarcher
- [ ] **RC Pro** souscrite (assurance ~quelques centaines d'€/an — indispensable).
- [ ] **Offre claire** : ce que tu vends, à qui, à quel prix (fait pour les particuliers ; cadre tes forfaits pro).
- [ ] **Process d'audit gratuit** : comment tu fais le 1er rendez-vous (questions, ce que tu regardes, ce que tu proposes).
- [ ] **Un pitch de 30 secondes** : « J'aide les [PME / particuliers] à ne plus subir leur informatique : dépannage, sécurité, sauvegarde. Premier audit gratuit. »
- [ ] **Tes outils** : NinjaOne (entraîné), antivirus, solution de sauvegarde, accès à distance sécurisé.
- [ ] **Carte de visite** + **fiche Google Business Profile**.

## Où trouver ton 1er client (du plus facile au plus large)
1. **Ton réseau** : amis, famille, commerçants/pros que tu connais → « tu connais quelqu'un qui galère avec son informatique ? ». C'est presque toujours le 1er client.
2. **Commerces & cabinets de ton quartier** : passe les voir, propose un **audit gratuit**.
3. **LinkedIn** : poste que tu lances ton activité + ce que tu proposes.
4. **Partenaires prescripteurs** : experts-comptables, agences web, vendeurs de matériel → ils ont des clients qui ont besoin de toi.
5. **Google Business + SEO** (le site) : le plus long à démarrer mais le plus durable.

## Ton tout premier rendez-vous (déroulé type)
1. Écoute le besoin (laisse parler).
2. Fais un **audit gratuit** rapide (état des postes, sauvegarde ? sécurité ? sauvegardes testées ?).
3. Remets un **plan clair** avec 2-3 priorités + un **devis** (ou propose l'abonnement).
4. Après l'intervention : **demande un avis** + propose le **suivi (abonnement/forfait)**.

## Pense au COÛT (pour ne pas travailler à perte)
- Additionne tes **coûts** : NinjaOne (par appareil), antivirus, sauvegarde, assurance, temps passé, déplacement.
- Ton **prix** doit couvrir ces coûts **+ ta marge**. Les prix du marché (étude faite) sont un repère, pas une obligation.
- En micro : pas de TVA récupérable → intègre ça dans tes marges.

---

## 👥 Qui fait quoi (rappel)
- **Moi** : sites, admin, emails auto, SEO, contenus, automatisations, intégrations.
- **Toi** : statut (fait : micro), RC Pro, outils (NinjaOne…), comptes (Stripe/Resend), relation client, démarchage.
- **Comptable** : fiscalité, TVA, seuils, conformité factures.

*Document de travail DHB — à auditer et annoter.*
