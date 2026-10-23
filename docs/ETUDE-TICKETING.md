# DHB — Étude ticketing + email : build vs buy

> Étude préalable exigée par `docs/METHODOLOGIE.md` (règles 1, 2, 5, 6, 7).
> **Aucun développement n'est engagé : l'architecture doit être validée par le propriétaire.**
> Recherche du 23/10/2026 ; les prix viennent en partie de sites tiers : à confirmer sur
> les pages officielles avant tout engagement (sources en fin de document).

---

## 1. Ce que DHB a déjà (à réutiliser, règle 19)

| Brique | État actuel | Réutilisable pour le ticketing |
|---|---|---|
| **Tickets** (`tickets`) | Sujet, description, priorité, statut, client rattaché, responsable, dates de résolution / clôture ; liste et fiche dans le back-office | Oui : la table reste la base |
| **Clients** (`clients`) | Entreprises et particuliers, email | Oui : identification de l'expéditeur |
| **Notes / historique** (`notes`, `activites`) | Commentaires internes, fil chronologique du client | Oui : notes internes du ticket, historique |
| **Envoi d'emails** (`_shared/email.ts`, Resend, modèles) | Envoi, historique, mode test (redirection), modèles | Oui : réponses aux clients |
| **Automatisations** (file `evenements`, robot) | Règles « SI … ALORS email », réessais | Oui : accusé de réception, notifications, relances |
| **Stockage privé** (`documents`) | PDF des devis / factures | Oui : pièces jointes |
| **Rôles** | `admin`, `collaborateur`, `en_attente` | À étendre seulement pour un portail client |

**Ce qui manque** : email **entrant**, transformation email → ticket, fil de **conversation**
(messages client / équipe), **pièces jointes** des tickets, **portail client**, comptes clients.
Il n'existe pas non plus de « contacts » multiples par entreprise (un client = un email).

## 2. Comparatif (règle 7)

| Fonctionnalité | Solution existante | API | Webhooks | Intégration DHB | Coût | Recommandation |
|---|---|---|---|---|---|---|
| Ticketing complet + portail | **Zammad** (open source AGPL, auto-hébergé ou hébergé) | REST complète (jeton, OAuth2), création au nom d'un client | Oui (déclencheurs, signature HMAC, 4 réessais) | Hybride : synchroniser clients → utilisateurs / organisations Zammad, tickets → DHB par webhooks ; **portail et connexion séparés** | Hébergé : ~7 €/agent/mois (≤ 5 agents) ; auto-hébergé : gratuit mais serveur 6 à 10 Go de RAM (PostgreSQL, Redis, Elasticsearch) | **Meilleure option « acheter »** si l'on veut tout, tout de suite, et qu'on accepte deux applications |
| Messagerie omnicanale | **Chatwoot** (MIT + partie entreprise sous licence) | Oui | Oui | Pensé pour le **chat** (site, WhatsApp, réseaux) ; l'email est un canal parmi d'autres ; **pas de portail client connecté** pour suivre ses tickets | Auto-hébergé gratuit (4 Go RAM) ; cloud avec email : ~19 $/agent/mois | Non pour le ticketing email ; **à garder en tête** si un jour chat / WhatsApp |
| Boîte partagée façon Help Scout | **FreeScout** (open source, PHP / MySQL) | Module payant « API & Webhooks » (achat unique, ~13 $) | Oui (module, 10 réessais) | Hybride ; **pile technique en plus** (PHP + MySQL) ; portail client = module payant « End-User Portal » | Modules à l'achat unique (quelques dizaines de $) + hébergement PHP | Possible mais ajoute une seconde pile à maintenir ; peu d'intérêt face à Zammad |
| ITSM / parc informatique | **GLPI** (open source GPL) | Nouvelle API (GLPI 11, OpenAPI, OAuth) | Limités / via extensions | Outil de **DSI interne** (inventaire, ITIL) ; collecteur de mails ; portail en libre-service | Gratuit ; offres GLPI Network de ~100 € à 4 500 €/mois | **Non** pour le support client ; à réétudier séparément pour la **gestion du parc des clients Pro** (intéressant pour l'infogérance) |
| Autres open source | osTicket, UVdesk, Peppermint | Variables | Variables | Interfaces datées ou projets moins actifs | Gratuits | Non retenus |
| SaaS | Help Scout (gratuit ≤ 5 utilisateurs, 1 boîte, 100 contacts/mois), Freshdesk (19 $/agent), Zendesk (55 $/agent) | Oui | Oui | Données hors de DHB (doublons clients, hébergement hors UE à vérifier, RGPD) ; abonnement par agent | 0 à 55 $+/agent/mois | Non : double saisie des clients, dépendance, coût récurrent |
| **Email entrant seulement** (brique spécialisée) | **Resend Inbound** (déjà notre fournisseur d'envoi) ; alternatives : Cloudflare Email Routing + Workers (gratuit), Mailgun, Postmark | Oui (récupération du message et des pièces jointes) | Oui (`email.received`, signé) | **Directe** : une Edge Function reçoit l'événement, DHB crée le ticket ou ajoute le message | Inclus / faible (quota Resend à vérifier) | **Oui : c'est la partie à « acheter »** |
| **Développement dans DHB** | — | — | — | Tout dans le back-office, mêmes clients, rôles, journal, automatisations | Temps de développement | **Recommandé, avec Resend Inbound** (voir §3) |

## 3. Recommandation

**Architecture « DHB + brique email spécialisée »** : on n'achète **que** ce qui est difficile
et standard — la réception des emails (serveur de réception, décodage MIME, pièces
jointes) — auprès de **Resend**, déjà utilisé pour l'envoi. Tout le reste (tickets,
conversation, client, assignation, notifications, historique) est construit **dans DHB**
en **étendant l'existant**.

**Pourquoi pas Zammad ?** C'est la meilleure solution toute faite, mais pour une petite
équipe elle crée surtout de la duplication (règles 3 et 19) :

- deux bases clients à synchroniser (DHB ↔ utilisateurs / organisations Zammad) ;
- deux applications, deux connexions : l'équipe et les clients ne voient plus « une seule application » (règle 4) ;
- un serveur de 6 à 10 Go à maintenir (ou un abonnement par agent) ;
- un CRM, un journal et des statistiques DHB alimentés après coup par webhooks.

Le gain (portail, interface agent mûre) ne compense pas ce coût **tant que l'équipe est petite**.

**Quand changer d'avis** : plus de 3 à 5 personnes au support, besoin de SLA, de
base de connaissances publique riche ou de canaux chat / WhatsApp → réévaluer
Zammad (tickets) ou Chatwoot (messagerie), en mode hybride.

| Critère | Développement DHB + Resend Inbound | Zammad hybride |
|---|---|---|
| Temps | V1 email : ~1 lot ; portail : ~1 lot de plus | Mise en place ~1 lot + synchronisation à écrire et maintenir |
| Complexité | Moyenne (fil de discussion, sécurité de l'email entrant) | Moyenne à forte (synchronisation bidirectionnelle, deux systèmes de droits) |
| Maintenance | Dans notre code, nos tests | Mises à jour Zammad + Elasticsearch + synchronisation |
| Sécurité | Nos RLS existantes (testées 73/73) | Deux modèles de droits ; forum : accès par URL à vérifier en mode organisation partagée |
| Coût | Pas d'abonnement nouveau (quota Resend à vérifier) | ~7 €/agent/mois hébergé, ou serveur dédié |
| Évolutivité | Bonne jusqu'à une équipe moyenne | Très bonne |
| Expérience | Une seule application, mêmes écrans | Deux interfaces |

## 4. Source de vérité (règle 5) — pour l'option recommandée

- **DHB possède** les tickets, les messages, les pièces jointes (copie dans le stockage privé), les clients et l'historique.
- **Resend** ne fait que **transporter** : il reçoit l'email et le garde temporairement ; DHB le récupère et devient la référence.
- **Synchronisation** : un événement `email.received` → Edge Function `email-entrant` (signature vérifiée) → mise en file (`evenements`, lot 9) → traitement par le robot avec réessais.
- **Doublons** : identifiant Resend du message unique en base (même principe que le webhook Stripe du lot 7) → un même email ne crée jamais deux messages.
- **Rattachement au bon ticket** : référence `[DHB #123]` dans l'objet + en-têtes `In-Reply-To` / `References` ; sinon nouveau ticket.
- **Identification** : l'expéditeur est cherché dans `clients` (email) ; inconnu → ticket « à qualifier », jamais rattaché au hasard.
- **Erreurs / panne** : Resend réessaie l'envoi de l'événement ; le robot réessaie le traitement (5 essais, erreur lisible) ; rien n'est perdu tant que Resend conserve le message (durée de conservation à vérifier).
- **Modification / suppression** : depuis DHB uniquement (admin), suppression en cascade des messages et pièces jointes ; demande RGPD traitée dans DHB.

## 5. Sécurité à prévoir (règles 15-16, testée sur la base de test)

- Webhook entrant : signature obligatoire, refus sinon (comme `stripe-webhook`).
- **L'adresse de l'expéditeur peut être falsifiée** : elle sert à rattacher, jamais à donner un accès (le portail exigera une vraie connexion).
- Boucles d'emails (réponses automatiques, « absent du bureau ») : en-têtes `Auto-Submitted` / `Precedence`, limite de débit par expéditeur.
- Pièces jointes : taille et types limités, stockage **privé**, liens temporaires, jamais d'exécution ni d'affichage HTML brut.
- Contenu HTML des emails : affiché nettoyé (texte ou HTML assaini), pour éviter tout script.
- RLS : messages et pièces jointes visibles par l'équipe uniquement (puis, au portail, par le client propriétaire seulement).

## 6. Découpage proposé (chaque lot validé avant de commencer)

| Lot | Contenu | Validation nécessaire |
|---|---|---|
| **18 — Email → ticket (V1)** | Réception (Resend Inbound), création de ticket ou ajout au fil, identification du client, conversation dans la fiche ticket (messages client / réponses / notes internes), réponse par email depuis DHB, pièces jointes, accusé de réception et notification à l'équipe via les automatisations existantes | **Oui** : architecture, nouveau service entrant |
| **19 — Portail client** | Connexion des clients (lien magique Supabase), rôle « client », RLS limitées à leurs tickets, liste + réponse + pièces jointes | **Oui** : changement du système de rôles et des RLS (règle 11) |
| 20 — Contacts multiples par entreprise (si besoin) | Plusieurs personnes d'une même entreprise, droits par contact | Oui |

## 7. Décisions attendues du propriétaire

1. **Valider l'architecture** : DHB + Resend Inbound (recommandé) ou Zammad hybride.
2. **Adresse de support** : laquelle recevra les emails (ex. `support@` du domaine Pro / Assistance) — domaines encore à l'état d'exemple.
3. **Portail client** : nécessaire dès la V1 ou en second temps (lot 19) ?
4. **Expéditeur inconnu** : créer un ticket « à qualifier » (recommandé) ou une demande (Demandes) ?
5. **Contacts multiples par entreprise** : besoin réel aujourd'hui ?

## Sources

- Zammad : [prérequis](https://docs.zammad.org/en/latest/prerequisites/software.html), [API](https://docs.zammad.org/en/latest/api/intro.html), [webhooks](https://admin-docs.zammad.org/en/latest/manage/webhook.html), [revue et prix](https://www.getmacha.com/blog/what-is-zammad), [revue MSP](https://www.openmsp.ai/blog/zammad-review-for-msps), [organisations partagées (forum)](https://community.zammad.org/t/allow-selective-organization-wide-ticket-access-for-specific-users/16624)
- Chatwoot : [prix 2026](https://www.eesel.ai/blog/chatwoot-pricing), [auto-hébergement 2026](https://dev.to/pavel-hostim/how-to-self-host-chatwoot-in-2026-after-the-cloud-api-paywall-59ap)
- FreeScout : [modules](https://freescout.net/modules/), [module API & Webhooks](https://freescout.net/module/api-webhooks/), [coût réel](https://www.getmacha.com/blog/what-is-freescout), [GitHub](https://github.com/freescout-help-desk/freescout)
- GLPI : [GLPI 11](https://www.glpi-project.org/en/glpi-11-is-out/), [prix](https://www.glpi-project.org/en/pricing/), [collecteur de mails](https://www.glpi-project.org/en/integration/mail-receiver/)
- Resend Inbound : [réception](https://resend.com/docs/dashboard/receiving/introduction), [événement `email.received`](https://resend.com/docs/webhooks/emails/received), [annonce](https://resend.com/blog/inbound-emails), [limites à vérifier](https://www.getfluxly.com/blog/resend-inbound-email)
- Alternatives entrantes : [Cloudflare Email (prix)](https://developers.cloudflare.com/email-service/platform/pricing/), [Cloudflare vs Mailgun](https://www.sequenzy.com/versus/cloudflare-email-vs-mailgun)
- SaaS : [Help Scout 2026](https://unthread.io/blog/help-scout-pricing/), [Freshdesk 2026](https://www.dragapp.com/blog/freshdesk-pricing/), [Zendesk 2026](https://www.dragapp.com/blog/zendesk-pricing/)
- Autres : [alternatives osTicket](https://www.ringly.io/blog/osticket-alternatives)
