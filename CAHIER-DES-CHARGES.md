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
