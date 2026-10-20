# 📋 DHB — Cahier des charges complet

> Document maître du projet. Il décrit **ce qui existe**, **ce qui reste à faire**,
> **ce que tu dois faire de ton côté**, et surtout la **PARTIE 10 : les informations
> à me fournir** (remplis-la, c'est ce qui me débloque le plus).
>
> Autres documents complémentaires : `DOCUMENTATION.md` (détail technique),
> `AUDIT-ET-DEMARRAGE.md` (audit + NinjaOne + acquisition), `FEUILLE-DE-ROUTE-LANCEMENT.md`.

---

## 1. Vision & objectifs
Groupe de services informatiques **DHB**, présenté via **plusieurs sites distincts** (une filiale = un site), pilotés par **un seul espace d'administration centralisé**.
- **Objectif** : être trouvé sur Google, rassurer, convertir en demandes (devis pro / abonnement particulier).
- **Zone** : sur site en Île-de-France, à distance partout en France.
- **Principes** : zéro invention, SEO poussé, RGPD, design premium, prix affichés **côté particuliers** seulement.

## 2. Positionnement & cible
- **Entreprises (DHB Infogérance)** : TPE/PME, cabinets, commerces, associations. Vente sur **devis**. Récurrent (forfaits).
- **Particuliers (DHB Particuliers)** : grand public, seniors, familles. **Prix affichés**. Abonnement + intervention. Levier : **crédit d'impôt 50 %** (déclaration SAP).
- **Différenciation** : double casquette + contenu SEO + back-office + crédit d'impôt.

## 3. Architecture technique
- **Front** : sites **statiques** (HTML/CSS/JS) générés par des **scripts Python** (3 générateurs). Rapides, sûrs, bien référencés.
- **Backend** : **Supabase** (PostgreSQL + authentification + temps réel), **partagé** = admin centralisé.
- **Automatisations** : fonctions Edge Supabase (emails, Stripe) + CI GitHub.
- **Hébergement cible** : statique gratuit (Cloudflare Pages / Netlify) ; VPS Hetzner optionnel pour automatisations.
```
sites/{groupe,infogerance,particuliers}/   ← 3 sites autonomes
admin/                                      ← back-office centralisé
supabase/full-setup.sql + functions/        ← base + automatisations
build/                                      ← générateurs Python
```

## 4. Spécifications fonctionnelles

### 4.1 Site Groupe (5 pages)
Vitrine : accueil (filiales), le groupe, contact (→ lead), légal.

### 4.2 Site Infogérance — entreprises (130 pages)
7 services · 9 zones locales · 20 articles de blog · 83 pannes/questions (recherche+filtres) · lead magnet (guide PDF) · à propos/contact/légal. **Tout sur devis.**

### 4.3 Site Particuliers — grand public (31 pages)
Accueil · abonnement & tarifs (**prix affichés** + paiement Stripe pré-câblé) · centre d'aide (22 fiches) · lead magnet · pages paiement · contact/à propos/légal. Accent vert.

### 4.4 Admin centralisé (`/admin/`, privé)
5 sections : **Demandes** (temps réel, par filiale, statuts/notes/relance) · **À relancer** · **Tickets** · **Factures** (franchise TVA par défaut, numéro auto, imprimer, **envoyer par email**) · **Prix & paramètres** (prix + bandeau d'annonce éditables en direct).

### 4.5 Base de données (Supabase)
`leads`, `settings`, `tickets`, `factures` (+ `facture_compteurs`). Sécurité RLS (public : créer une demande / lire les prix ; le reste = admin). Script : `supabase/full-setup.sql`.

### 4.6 Automatisations / intégrations
- `notify-new-lead` : email à toi à chaque lead (Resend).
- `create-checkout` : paiement Stripe.
- `send-invoice` : email « voici votre facture » (Resend).
- CI GitHub : régénère + vérifie les liens.

## 5. SEO
Titres/descriptions uniques, 1 H1/page, JSON-LD (Organization, LocalBusiness, Article, FAQ, fil d'Ariane), sitemaps/robots par site, URLs claires, cocon sémantique, SEO local + national, stratégie longue traîne (bases Q&A).

## 6. Design & charte
Bleu nuit `#0B2A4A` + cyan `#2EC4FF` (Groupe/Infogérance) ; vert `#16a34a` (Particuliers). Police **Inter**. Responsive mobile-first, accessibilité, RGPD (bandeau cookies).

## 7. Sécurité & RGPD
RLS sur toutes les tables ; clé publique seule dans le code, clé secrète hors dépôt ; bandeau cookies + consentement ; pages légales ; **à prévoir** : contrat de sous-traitance (DPA) pour les clients, médiateur de la consommation (obligatoire en B2C).

## 8. Ce qui est fait vs à faire
| État | Élément |
|---|---|
| ✅ Fait | 3 sites, admin (demandes/relances/tickets/factures/prix), base de données, SEO, lead magnets (2 guides PDF), scaffolding Stripe + emails (notif, facture), CI |
| ⏳ Toi | Statut (fait : micro), RC Pro, SAP, outils (NinjaOne…), comptes (Stripe/Resend), contenus réels |
| 🔜 À construire | Séquences email auto, CMS complet (couplé mise en ligne), paiement activé, tableau de bord dirigeant, espace client, parrainage/avis auto, mise en ligne + déploiement auto |

## 9. Tes responsabilités (démarches)
Voir `FEUILLE-DE-ROUTE-LANCEMENT.md`. En bref : RC Pro, SAP (crédit d'impôt), domaines + email pro, outils (NinjaOne/antivirus/sauvegarde), offres/prix/contrats, Google Business, démarchage, relation client. Fiscalité/TVA/factures → **expert-comptable**.

---

# 9bis. 🛠️ OPÉRER L'INFOGÉRANCE : ta méthode & tes stratégies (ton métier au quotidien)

> Ce que **tu fais, toi**, en tant qu'infogérant. C'est ce qui fait la différence entre « un gars avec un joli site » et un vrai prestataire fiable.

## A. Standardiser ton offre (pour tenir en solo)
- **3 forfaits max** (ex. *Essentiel / Pro / Pro+*), facturés **par poste/mois**, « tout inclus ». Standardiser = exécuter vite, chiffrer vite, scaler.
- **Inclus dans un forfait** : supervision 24/7, maintenance, antivirus managé, sauvegarde, support à distance illimité, X interventions sur site/mois, **reporting mensuel**.
- **Hors forfait (facturé en plus)** : nouveau matériel, projets, déménagement, interventions hors heures.
- Côté **particuliers** : abonnement sérénité + intervention ponctuelle (déjà cadré).

## B. Le parcours client (de la signature au run)
1. **Audit initial (gratuit)** : état des postes, réseau, sauvegarde (testée ?), sécurité, risques. → tu repars avec une photo claire.
2. **Plan + devis** : 2-3 priorités, en langage simple.
3. **Onboarding** (le moment critique) : installer **NinjaOne** (agents), **antivirus**, mettre en place/vérifier la **sauvegarde**, **sécuriser** (MFA, mots de passe), **documenter** le parc (inventaire + accès).
4. **Run** : supervision continue, maintenance, support, **rapport mensuel**.
5. **Revue trimestrielle** : point sécurité, évolutions, upsell.

## C. Ta routine (discipline = qualité = avis positifs)
- **Chaque jour** : traiter les **alertes NinjaOne**, vérifier que les **sauvegardes** sont OK, répondre aux tickets/demandes **dans ton délai annoncé**.
- **Chaque semaine** : postes à risque, mises à jour planifiées, **10-15 actions commerciales** (prospection/relances).
- **Chaque mois** : **rapport client** (sauvegardes OK, incidents évités, mises à jour faites), **facturation**, point **KPI** (leads, taux de transfo, CA récurrent).
- **Chaque trimestre** : revue sécurité, mise à jour du contenu/SEO.

## D. Tes engagements de service (SLA) — réalistes en solo
- Promets des délais **TENABLES** : réponse sous X h ouvrées, intervention selon la criticité. **Ne promets jamais du 24/7** si tu es seul.
- **Priorisation** : bloquant (activité arrêtée) → gênant → confort.
- Mieux vaut **sous-promettre et sur-livrer** que l'inverse.

## E. Récurrence & marge (le nerf de la guerre)
- Vise le **RÉCURRENT** (forfaits) : revenu prévisible, moins de re-vente permanente.
- **Remote-first** : résous à distance au maximum → plus de clients à l'heure.
- **Supervision-first** : préviens les pannes → moins d'urgences subies (= moins d'heures perdues).
- **Calcule ta marge réelle** par offre : coûts outils (NinjaOne/poste, antivirus, sauvegarde, assurance) + **~22 % de cotisations micro**, AVANT marge.
- **Upsell** : sauvegarde renforcée, cybersécurité, Microsoft 365, nouveaux postes, formation.

## F. Sécurité & protection (toi ET tes clients)
- MFA partout, **sauvegardes isolées et testées**, accès distant sécurisé (VPN/MFA), principe du moindre privilège.
- **Documente tout** (parc, accès) et garde-le **réversible** : le client doit pouvoir partir avec ses accès → c'est un argument de confiance.
- **Contrats** : périmètre clair, SLA, réversibilité, **DPA** (RGPD sous-traitant). Fais-les valider.

## G. Acquisition & fidélisation (ton moteur les 6 premiers mois)
- **Acquisition** : réseau direct → terrain (commerces/cabinets) → LinkedIn → Google Business → prescripteurs. *(Le SEO, c'est le long terme.)*
- **Avis Google dès le client n°1** — ton accélérateur n°1.
- **Fidélisation** : **rapport mensuel** (preuve de valeur = anti-résiliation), réactivité, proximité, **parrainage**.
- **Niche** : choisis-en **une** à dominer (ex. cabinets compta/avocats, commerces, seniors).

## H. Scaler sans se cramer
- **Standardiser** (forfaits, procédures, modèles de mails/devis).
- **Automatiser** (supervision, emails, relances, facturation — déjà en place pour partie).
- **Sous-traiter / embaucher** quand tu satures (au-delà de ~15-20 clients en solo).

## I. Ton stack d'outils (type infogérant solo)
Supervision **NinjaOne** · **antivirus/EDR** managé · **sauvegarde** cloud EU · **Microsoft 365 / Google Workspace** · **accès distant** sécurisé · **CRM/factures** (ton admin + app de facturation) · **documentation** (inventaire + coffre à mots de passe).

---

# 10. 📝 INFORMATIONS À ME FOURNIR (remplis ce qui est possible)

> Plus tu remplis, plus je peux avancer et remplacer les `[À COMPLÉTER]`. Laisse vide ce que tu n'as pas encore.

### 10.1 Coordonnées & entreprise
- Raison sociale / nom commercial exact : `________`
- Statut : micro-entreprise ✅ — SIRET : `________`
- Adresse du siège : `________`
- Téléphone pro : `________`
- Email pro : `________`
- WhatsApp (si oui) : `________`
- Horaires : `________`
- Assurance RC Pro (compagnie) : `________`
- Médiateur de la consommation (B2C, obligatoire) : `________`

### 10.2 Marque & domaines
- Nom de domaine Groupe : `________`
- Nom de domaine Infogérance (pro) : `________`
- Nom de domaine Particuliers : `________`
- Logo (as-tu un fichier ? sinon je garde le logo texte « DHB ») : `________`
- Baseline / slogan souhaité : `________`
- Couleurs à changer ? (sinon on garde) : `________`

### 10.3 Offres & prix — ENTREPRISES (restent sur devis par défaut)
- Forfaits (noms + ce qu'ils incluent) : `________`
- Veux-tu afficher un « à partir de X €/poste/mois » ? (oui/non + montant) : `________`
- Délais que tu peux VRAIMENT tenir (réponse, intervention) : `________`

### 10.4 Offres & prix — PARTICULIERS
- Abonnement : un seul prix, ou des paliers ? (noms + prix + contenu) : `________`
- Prix d'intervention (à domicile / à distance) : `________`
- Crédit d'impôt SAP : déclaré ? (oui/non/en cours) : `________`
- Garanties affichables et tenables : `________`

### 10.5 À propos & confiance
- Présentation du/des fondateur(s) (parcours, pourquoi DHB) : `________`
- Photo(s) à utiliser : `________`
- Certifications réelles : `________`
- Partenaires officiels (Microsoft, antivirus…) : `________`

### 10.6 Outils & clés (pour activer les automatisations)
- **NinjaOne** : lien de ton espace supervision : `________`
- **Stripe** : clé secrète (sk_...) + identifiants de prix (price_...) : `________`
- **Resend** : clé API + expéditeur vérifié : `________`
- Antivirus / solution de sauvegarde utilisés : `________`
- Email qui doit recevoir les alertes « nouveau lead » : `________`

### 10.7 Zones & contenu
- Villes à ajouter / prioriser (SEO local) : `________`
- Niche à viser en priorité (cabinets, commerces, seniors…) : `________`
- Titres de guides PDF souhaités (lead magnets) : `________`
- Sujets de blog prioritaires : `________`

### 10.8 Mise en ligne
- Hébergement préféré (Cloudflare Pages / Netlify / VPS Hetzner) : `________`
- Quand veux-tu mettre en ligne ? : `________`

---

# 11. Qui fait quoi
- **Moi (IA)** : sites, admin, automatisations, SEO, contenus, intégrations, docs.
- **Toi** : démarches admin, statut, outils/comptes, offres/prix, relation client, démarchage.
- **Comptable / juriste** : fiscalité, TVA, seuils, conformité factures, contrats.

# 12. Annexes
- **Lancer en local** : `python -m http.server 8000` → http://localhost:8000/
- **Régénérer** : `python3 build/build.py` · `python3 build/groupe/build_groupe.py` · `python3 build/particuliers/build_particuliers.py`
- **Base** : exécuter `supabase/full-setup.sql` (fait). Guides : `supabase/README-SETUP.md`, `STRIPE-SETUP.md`.

---

*Cahier des charges DHB — document vivant, à compléter et annoter.*
