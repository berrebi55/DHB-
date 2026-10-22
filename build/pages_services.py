# -*- coding: utf-8 -*-
from base import (page, breadcrumb, breadcrumb_jsonld, cta_band, contact_form,
                  faq_block, faq_jsonld, localbusiness_jsonld, SERVICES, SERVICE_ICON,
                  IC, DOMAIN, PHONE_DISPLAY, PHONE_LINK, root)

# Contenu détaillé par service
SERVICE_CONTENT = {
    "depannage-assistance-informatique": {
        "h1": "Dépannage & assistance informatique pour entreprises",
        "lead": "Une panne bloque votre activité ? Nous intervenons vite, sur site en Île-de-France ou à distance partout en France, et nous vous expliquons tout simplement.",
        "title": "Dépannage informatique entreprise — intervention rapide IdF & à distance | DHB",
        "desc": "Dépannage et assistance informatique pour entreprises : intervention rapide sur site en Île-de-France et à distance partout en France. Audit gratuit, sans engagement.",
        "probleme": "Un ordinateur qui ne démarre plus, une connexion coupée, un logiciel qui plante, un virus, une imprimante en panne : chaque incident informatique vous fait perdre du temps et de l'argent, et personne en interne ne sait vraiment quoi faire. Vous avez besoin d'une réponse rapide et fiable, pas d'un discours technique.",
        "inclus": [
            "Diagnostic de la panne et explication en langage clair",
            "Intervention à distance immédiate pour les problèmes logiciels",
            "Déplacement sur site en Île-de-France quand c'est nécessaire",
            "Résolution des lenteurs, plantages, écrans bleus et blocages",
            "Suppression de virus et de logiciels indésirables",
            "Dépannage réseau, Wi-Fi, imprimantes et périphériques",
            "Récupération de fichiers et de données quand c'est possible",
            "Conseils pour éviter que le problème ne se reproduise",
        ],
        "pour_qui": "PME, TPE, indépendants, cabinets, commerces et associations qui ont besoin d'une aide informatique rapide et sans jargon, qu'ils aient ou non déjà un prestataire.",
        "faq": [
            ("Intervenez-vous en urgence ?", "Oui. Pour les problèmes logiciels et réseau, nous pouvons souvent intervenir à distance très rapidement. Pour les cas nécessitant une présence physique, nous nous déplaçons sur site en Île-de-France. Notre engagement : une réponse à toute demande sous 24h ouvrées, et une priorisation des urgences bloquantes."),
            ("Faut-il un contrat pour être dépanné ?", "Non. Vous pouvez faire appel à nous ponctuellement, sans engagement. Beaucoup de nos clients nous découvrent lors d'un dépannage, puis choisissent ensuite une maintenance régulière pour éviter que les pannes ne reviennent."),
            ("Le dépannage à distance est-il sûr ?", "Oui. Nous utilisons des outils de prise en main sécurisés, avec votre accord explicite à chaque session. Vous voyez tout ce qui se passe à l'écran et vous gardez le contrôle. C'est souvent le moyen le plus rapide de résoudre un problème."),
            ("Combien coûte un dépannage ?", "Nous n'affichons pas de tarif car chaque situation est différente. Nous établissons un devis gratuit et clair avant toute intervention facturée, sans frais caché ni engagement. Vous décidez en connaissance de cause."),
        ],
    },
    "maintenance-parc-informatique": {
        "h1": "Maintenance du parc informatique : postes, serveurs, réseau",
        "lead": "Des équipements entretenus en continu, c'est moins de pannes, des postes qui restent rapides et une activité qui ne s'arrête pas. On s'occupe de tout, vous travaillez sereinement.",
        "title": "Maintenance informatique entreprise — parc, postes, serveurs, réseau | DHB",
        "desc": "Maintenance du parc informatique pour entreprises : entretien des postes, serveurs et réseau, mises à jour et prévention des pannes. Sur site en IdF et à distance.",
        "probleme": "Sans entretien régulier, un parc informatique se dégrade : postes de plus en plus lents, mises à jour oubliées, disques saturés, pannes qui surviennent toujours au pire moment. Vous subissez les incidents au lieu de les anticiper, et vous ne savez jamais vraiment dans quel état est votre matériel.",
        "inclus": [
            "Entretien régulier des postes de travail (nettoyage, optimisation)",
            "Gestion des mises à jour système et logicielles",
            "Maintenance des serveurs et du stockage",
            "Suivi de l'état du réseau et du Wi-Fi",
            "Gestion du cycle de vie du matériel (remplacement anticipé)",
            "Inventaire et documentation de votre parc",
            "Préparation et installation des nouveaux postes",
            "Conseils d'évolution adaptés à votre croissance",
        ],
        "pour_qui": "Entreprises disposant de plusieurs postes, serveurs ou d'un réseau à faire tenir dans la durée, et qui veulent arrêter de subir les pannes pour passer à une approche préventive.",
        "faq": [
            ("Quelle différence avec un simple dépannage ?", "Le dépannage intervient une fois le problème survenu. La maintenance, elle, entretient votre parc en continu pour éviter que les problèmes n'arrivent : c'est une approche préventive, bien plus confortable et économique sur la durée."),
            ("Devez-vous venir sur place régulièrement ?", "Une grande partie de la maintenance se fait à distance, sans vous déranger. Nous nous déplaçons sur site en Île-de-France pour les interventions physiques (nouveau matériel, panne nécessitant une présence)."),
            ("La maintenance interrompt-elle notre travail ?", "Non, c'est tout l'intérêt. Nous planifions les opérations lourdes en dehors de vos heures d'activité quand c'est possible, et nous privilégions les interventions discrètes pour ne pas perturber vos équipes."),
            ("Puis-je savoir ce qui est fait ?", "Oui. Nous documentons votre parc et les interventions réalisées. La transparence fait partie de nos engagements : vous savez toujours ce qui est fait et pourquoi."),
        ],
    },
    "supervision-monitoring": {
        "h1": "Supervision & monitoring : vos équipements surveillés en continu",
        "lead": "Et si on détectait les pannes avant qu'elles ne vous bloquent ? Notre supervision veille sur vos équipements 24h/24 et déclenche une action dès qu'un signal faible apparaît.",
        "title": "Supervision informatique entreprise — monitoring 24/7 du parc | DHB",
        "desc": "Service de supervision et monitoring informatique : surveillance 24/7 de vos postes, serveurs et sauvegardes pour détecter les pannes avant qu'elles ne vous bloquent.",
        "probleme": "La plupart des pannes ne sont pas soudaines : un disque qui se remplit, une sauvegarde qui échoue, une température qui monte, un antivirus qui se désactive… autant de signaux qui passent inaperçus jusqu'à la panne. Sans surveillance, vous ne découvrez le problème que lorsqu'il vous a déjà bloqué.",
        "inclus": [
            "Surveillance continue de vos postes et serveurs (24/7)",
            "Alertes automatiques sur les signaux faibles (disque plein, surchauffe…)",
            "Contrôle quotidien du bon déroulement des sauvegardes",
            "Vérification de l'état des protections (antivirus, mises à jour)",
            "Détection précoce des pannes matérielles à venir",
            "Intervention déclenchée avant que vous ne soyez impacté",
            "Reporting clair sur l'état de santé de votre parc",
            "Accès à votre tableau de supervision",
        ],
        "pour_qui": "Entreprises qui veulent passer d'une informatique subie à une informatique maîtrisée, et pour qui chaque heure d'arrêt coûte cher.",
        "faq": [
            ("Concrètement, comment ça marche ?", "La supervision est un service que nous opérons pour vous à l'aide d'une plateforme de monitoring professionnelle (NinjaOne). De petits agents installés sur vos équipements remontent en permanence des indicateurs de santé. Nous surveillons ces indicateurs et agissons dès qu'un seuil d'alerte est franchi — souvent avant même que vous ne remarquiez quoi que ce soit."),
            ("Dois-je surveiller moi-même un écran ?", "Non. C'est nous qui assurons la surveillance et le traitement des alertes. La supervision est un service clé en main : vous bénéficiez du résultat (moins de pannes) sans avoir à gérer l'outil."),
            ("Puis-je accéder à l'état de mon parc ?", "Oui. Un accès à votre supervision peut vous être donné pour consulter l'état de santé de vos équipements. Nous construisons ce service autour de l'outil NinjaOne, sans développer de plateforme maison : vous bénéficiez d'une solution éprouvée."),
            ("La supervision remplace-t-elle la maintenance ?", "Non, elle la complète. La supervision détecte, la maintenance corrige et entretient. Les deux fonctionnent main dans la main, et sont au cœur de notre offre d'infogérance globale."),
        ],
        "ninja": True,
    },
    "cybersecurite": {
        "h1": "Cybersécurité pour les entreprises : protéger ce qui compte",
        "lead": "Antivirus, pare-feu, protection des données et sensibilisation de vos équipes : nous mettons en place une sécurité adaptée à votre entreprise, sans jargon et sans surcoût inutile.",
        "title": "Cybersécurité PME — antivirus, pare-feu, protection des données | DHB",
        "desc": "Cybersécurité pour PME et TPE : antivirus, pare-feu, protection des données, sensibilisation au phishing. Réduisez concrètement le risque d'attaque. Audit gratuit.",
        "probleme": "Les PME sont devenues des cibles privilégiées : phishing, ransomware, usurpation d'identité, vol de données. Souvent moins protégées que les grands groupes, elles subissent des attaques qui peuvent paralyser l'activité pendant des jours. Vous recevez des mails douteux, vous craignez le piratage, mais vous ne savez pas par où commencer.",
        "inclus": [
            "Audit de votre niveau de sécurité actuel",
            "Antivirus moderne détectant les comportements suspects",
            "Pare-feu et sécurisation du réseau",
            "Protection de la messagerie (anti-spam, anti-phishing)",
            "Double authentification sur les accès critiques",
            "Gestion des mots de passe et des accès",
            "Sensibilisation de vos équipes au phishing et aux bons réflexes",
            "Sécurisation des accès à distance (VPN)",
        ],
        "pour_qui": "Toute entreprise qui détient des données clients, échange des informations sensibles ou dépend de son informatique — c'est-à-dire presque toutes, quels que soient sa taille et son secteur.",
        "faq": [
            ("Ma petite entreprise est-elle vraiment une cible ?", "Oui. Les attaquants automatisent largement leurs attaques et ne choisissent pas leurs victimes : ils frappent là où c'est le moins protégé. Les petites structures, souvent moins sécurisées, sont donc particulièrement exposées."),
            ("La cybersécurité, ce n'est pas trop cher pour nous ?", "Les mesures les plus efficaces (mots de passe solides, double authentification, sauvegardes isolées, sensibilisation) coûtent peu et bloquent la majorité des attaques. Nous adaptons la sécurité à votre budget et à vos risques réels, sans vous vendre l'inutile."),
            ("La sécurité va-t-elle compliquer le travail de mes équipes ?", "Bien configurée, non. Une double authentification ou un gestionnaire de mots de passe simplifie même le quotidien une fois en place. Nous privilégions les solutions à la fois sûres et simples à utiliser."),
            ("Que se passe-t-il si on est quand même attaqué ?", "Aucune protection n'est infaillible, c'est pourquoi la sauvegarde isolée est centrale : elle permet de tout restaurer sans payer de rançon. Nous préparons aussi la bonne conduite à tenir en cas d'incident."),
        ],
    },
    "sauvegarde-restauration": {
        "h1": "Sauvegarde & restauration des données de votre entreprise",
        "lead": "Vos données sont votre entreprise. Nous mettons en place une sauvegarde automatique, hors site et testée — pour que vous puissiez tout récupérer, quoi qu'il arrive.",
        "title": "Sauvegarde de données entreprise — sauvegarde automatique & restauration | DHB",
        "desc": "Sauvegarde et restauration des données d'entreprise : sauvegarde automatique, hors site, chiffrée et testée. Protégez-vous de la perte de données et du ransomware.",
        "probleme": "Une panne de disque, une suppression accidentelle, un vol, un incendie ou un ransomware, et ce sont des années de travail qui disparaissent : comptabilité, dossiers clients, devis, contrats. Beaucoup d'entreprises croient être protégées alors que leur sauvegarde est absente, incomplète, ou n'a jamais été testée.",
        "inclus": [
            "Audit de vos données critiques et de vos risques",
            "Sauvegarde automatique quotidienne, sans intervention de votre part",
            "Copie hors site (cloud chiffré, hébergé en Europe)",
            "Application de la règle 3-2-1 (plusieurs copies, plusieurs supports)",
            "Conservation de plusieurs versions (versioning)",
            "Protection des sauvegardes contre le ransomware",
            "Supervision quotidienne et alerte en cas d'échec",
            "Tests de restauration réguliers pour garantir que ça marche",
        ],
        "pour_qui": "Toute entreprise dont la perte de données serait un coup dur ou fatal : cabinets, commerces, PME, indépendants, associations. Si vos fichiers comptent, cette solution est pour vous.",
        "faq": [
            ("N'ai-je pas déjà une sauvegarde avec mon cloud (OneDrive, Drive) ?", "Attention : la synchronisation cloud n'est pas une sauvegarde. Si vous supprimez un fichier ou qu'un ransomware le chiffre, la version corrompue se synchronise partout. Une vraie sauvegarde conserve des versions antérieures et reste isolée des menaces."),
            ("À quelle fréquence sauvegardez-vous ?", "Au minimum quotidiennement, et davantage pour les données très sensibles. La fréquence dépend de ce que vous pouvez vous permettre de perdre : nous la définissons ensemble lors de l'audit."),
            ("Combien de temps pour tout restaurer après un incident ?", "C'est la vraie question. Nous dimensionnons la solution en fonction du délai de reprise acceptable pour votre activité. Une copie locale permet des restaurations rapides ; la copie cloud protège des sinistres majeurs."),
            ("Testez-vous vraiment les sauvegardes ?", "Oui, et c'est un de nos engagements. Une sauvegarde jamais testée est une fausse sécurité. Nous effectuons des tests de restauration réguliers pour vous garantir qu'en cas de besoin, tout se récupère bien."),
        ],
    },
    "messagerie-cloud": {
        "h1": "Messagerie & cloud pro : Microsoft 365 et Google Workspace",
        "lead": "Une messagerie professionnelle fiable à votre nom de domaine, des fichiers accessibles de partout et bien organisés : nous mettons en place et gérons vos outils cloud sans prise de tête.",
        "title": "Messagerie professionnelle & cloud — Microsoft 365, Google Workspace | DHB",
        "desc": "Messagerie et cloud professionnels : mise en place et gestion de Microsoft 365 et Google Workspace, migration sans perte, sécurité et partage de fichiers. Audit gratuit.",
        "probleme": "Des adresses mail en gmail.com ou orange.fr qui font peu sérieux, une boîte qui sature, des fichiers éparpillés et introuvables, une messagerie qui tombe en panne au mauvais moment : vos outils de communication vous freinent au lieu de vous servir, et personne ne sait vraiment comment les configurer correctement.",
        "inclus": [
            "Conseil sur le choix : Microsoft 365 ou Google Workspace",
            "Création d'adresses à votre nom de domaine (nom@votre-entreprise.fr)",
            "Migration de vos anciens emails et contacts, sans perte",
            "Configuration sécurisée (double authentification, anti-usurpation)",
            "Mise en place du partage de fichiers et du travail collaboratif",
            "Organisation de vos espaces cloud et de vos droits d'accès",
            "Gestion des arrivées et départs de collaborateurs",
            "Formation de vos équipes aux outils",
        ],
        "pour_qui": "Entreprises qui veulent une messagerie professionnelle crédible et fiable, des outils collaboratifs modernes, et la tranquillité d'un cloud bien configuré et sécurisé.",
        "faq": [
            ("Microsoft 365 ou Google Workspace : lequel choisir ?", "Cela dépend de vos usages : Microsoft 365 s'impose si vous dépendez de Word et Excel et d'un environnement Office ; Google Workspace séduit par sa simplicité et sa collaboration en ligne. Nous vous conseillons selon votre contexte réel, sans parti pris."),
            ("Vais-je perdre mes anciens emails lors de la migration ?", "Non. Une migration bien menée préserve l'intégralité de votre historique d'emails et de contacts. C'est justement le point délicat où notre accompagnement évite les mauvaises surprises."),
            ("Pourquoi ne pas rester sur des adresses gratuites ?", "Une adresse à votre nom de domaine inspire davantage confiance, protège votre image et vous laisse le contrôle des comptes. Les solutions pro offrent aussi une bien meilleure fiabilité et sécurité."),
            ("Gérez-vous la messagerie dans la durée ?", "Oui. Au-delà de la mise en place, nous gérons les créations et suppressions de comptes, la sécurité et le support au quotidien, dans le cadre de la maintenance ou de l'infogérance."),
        ],
    },
    "infogerance-globale": {
        "h1": "Infogérance globale : tout votre informatique, un interlocuteur unique",
        "lead": "Confiez-nous l'ensemble de votre informatique. Nous devenons votre service informatique externalisé : un interlocuteur unique qui connaît votre entreprise, anticipe les problèmes et reste joignable.",
        "title": "Infogérance globale entreprise — service informatique externalisé | DHB",
        "desc": "Infogérance globale pour entreprises : votre service informatique externalisé, interlocuteur unique. Maintenance, supervision, sécurité, sauvegarde et support réunis.",
        "probleme": "Vous n'avez personne pour s'occuper de l'informatique, ou vous jonglez entre plusieurs prestataires sans vision d'ensemble. Résultat : des pannes subies, des sauvegardes incertaines, une sécurité approximative, et beaucoup de temps perdu. Vous voudriez simplement que tout fonctionne, sans avoir à y penser.",
        "inclus": [
            "Un interlocuteur unique qui connaît votre installation",
            "Maintenance complète du parc (postes, serveurs, réseau)",
            "Supervision 24/7 et approche préventive des pannes",
            "Cybersécurité adaptée à vos risques",
            "Sauvegarde automatique, hors site et testée",
            "Gestion de la messagerie et du cloud professionnel",
            "Support et dépannage, sur site en IdF et à distance partout en France",
            "Conseil et accompagnement dans vos projets informatiques",
        ],
        "pour_qui": "PME, TPE, cabinets, commerces et associations qui veulent l'équivalent d'un service informatique interne, sans le coût ni les limites d'un recrutement, avec un seul partenaire de confiance.",
        "faq": [
            ("Qu'est-ce que l'infogérance, simplement ?", "C'est confier la gestion de votre informatique à un spécialiste, comme vous confiez votre comptabilité à un expert-comptable. Nous nous occupons de tout — maintenance, sécurité, sauvegarde, support — pour que vous vous concentriez sur votre métier."),
            ("Vais-je perdre le contrôle de mon informatique ?", "Au contraire. Vous reprenez le contrôle en déléguant la technique à quelqu'un dont c'est le métier. Vos données et vos accès restent les vôtres, documentés et réversibles : vous pouvez partir quand vous voulez."),
            ("Faut-il tout confier d'un coup ?", "Non. Beaucoup d'entreprises commencent par un périmètre (la sécurité et les sauvegardes, par exemple) puis élargissent. Nous nous adaptons à votre rythme et à vos priorités."),
            ("Comment commence-t-on ?", "Par un audit gratuit et sans engagement de votre installation. Vous recevez un état des lieux clair et un plan priorisé. Vous décidez ensuite, en toute transparence, de ce que vous souhaitez nous confier."),
        ],
    },
}

SERVICE_NAME = {s: n for s, n, _ in SERVICES}


def _ninja_block(r):
    return f"""
    <section class="section">
      <div class="wrap">
        <div class="card reveal" style="background:#f0f7ff;border-color:#bae0ff">
          <div class="icon-box">{IC['eye']}</div>
          <h3>Accès à votre supervision</h3>
          <p>Notre service de supervision s'appuie sur <strong>NinjaOne</strong>, une plateforme de monitoring professionnelle éprouvée. Nous ne développons pas d'outil maison : nous opérons pour vous une solution fiable et reconnue. Un accès à votre tableau de supervision peut vous être fourni pour consulter l'état de santé de vos équipements.</p>
          <p class="a-completer">[À COMPLÉTER PAR LE PROPRIÉTAIRE : lien vers la plateforme de supervision NinjaOne, une fois l'espace client configuré.]</p>
          <a class="btn btn--dark" href="{r}contact/">Activer ma supervision</a>
        </div>
      </div>
    </section>"""


def build():
    out = {}

    # Index des services
    cards = ""
    for slug, name, desc in SERVICES:
        cards += f"""
        <div class="card reveal">
          <div class="icon-box">{IC[SERVICE_ICON[slug]]}</div>
          <h2 class="h3">{name}</h2>
          <p>{desc}</p>
          <a class="card-link" href="{slug}/">Découvrir</a>
        </div>"""
    body = f"""
<section class="page-hero">
  {breadcrumb(1, [(None, "Services")])}
  <div class="wrap">
    <span class="eyebrow">Nos services</span>
    <h1>Des services informatiques clairs, pour entreprises</h1>
    <p>Du dépannage ponctuel à la gestion complète de votre parc, choisissez ce dont vous avez besoin. Tous nos services sont disponibles sur site en Île-de-France et à distance partout en France.</p>
    <div class="hero-cta"><a class="btn btn--primary btn--lg" href="{root(1)}contact/">Demander un audit gratuit</a></div>
  </div>
</section>
<section class="section"><div class="wrap"><div class="grid grid-3">{cards}</div></div></section>
{cta_band(1)}
{breadcrumb_jsonld([(DOMAIN + "/", "Accueil"), (DOMAIN + "/services/", "Services")])}
"""
    out["services/index.html"] = page(1, "services/",
        "Services informatiques pour entreprises — dépannage, maintenance, sécurité | DHB",
        "Tous les services informatiques DHB pour entreprises : dépannage, maintenance, supervision, cybersécurité, sauvegarde, messagerie cloud et infogérance globale.",
        body)

    # Pages service
    for slug, name, _ in SERVICES:
        c = SERVICE_CONTENT[slug]
        depth = 2
        r = root(depth)
        inclus = "".join(f"<li>{x}</li>" for x in c["inclus"])
        steps = [
            ("Audit gratuit", "On fait le point sur votre situation et vos besoins, sans engagement."),
            ("Plan clair", "Vous recevez des recommandations priorisées, en langage simple."),
            ("Mise en place", "On déploie proprement, en limitant l'impact sur votre activité."),
            ("Suivi", "On supervise, on maintient et on reste joignable dans la durée."),
        ]
        steps_html = "".join(
            f'<div class="step reveal"><div class="num">{i}</div><h3>{t}</h3><p>{d}</p></div>'
            for i, (t, d) in enumerate(steps, 1)
        )

        ninja = _ninja_block(r) if c.get("ninja") else ""

        body = f"""
<section class="page-hero">
  {breadcrumb(depth, [("services/", "Services"), (None, name)])}
  <div class="wrap">
    <div class="icon-box">{IC[SERVICE_ICON[slug]]}</div>
    <h1>{c['h1']}</h1>
    <p>{c['lead']}</p>
    <div class="hero-cta">
      <a class="btn btn--primary btn--lg" href="{r}contact/">Demander un devis gratuit</a>
      <a class="btn btn--ghost btn--lg" href="tel:{PHONE_LINK}">{IC['phone']} {PHONE_DISPLAY}</a>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="grid grid-2" style="gap:48px;align-items:start">
      <div class="reveal">
        <span class="eyebrow">Le problème résolu</span>
        <h2>Ce que ça change pour vous</h2>
        <p class="lead">{c['probleme']}</p>
        <div class="card" style="margin-top:20px">
          <h3>Pour qui ?</h3>
          <p class="mb-0">{c['pour_qui']}</p>
        </div>
      </div>
      <div class="card reveal">
        <h3>Ce qui est inclus</h3>
        <ul class="check-list">{inclus}</ul>
      </div>
    </div>
  </div>
</section>

{ninja}

<section class="section section--nuit">
  <div class="wrap">
    <div class="center" style="max-width:700px;margin:0 auto 46px">
      <span class="eyebrow">Comment ça se passe</span>
      <h2>Simple, clair, sans engagement</h2>
    </div>
    <div class="steps">{steps_html}</div>
  </div>
</section>

{faq_block(c['faq'], "Questions fréquentes — " + name)}

<section class="section">
  <div class="wrap">
    <div class="grid grid-2" style="align-items:center;gap:48px">
      <div class="reveal">
        <span class="eyebrow">Parlons-en</span>
        <h2>Un devis gratuit, sans engagement</h2>
        <p class="lead">Expliquez-nous votre besoin. On vous répond sous 24h ouvrées avec un premier regard et, si vous le souhaitez, un devis clair et détaillé.</p>
        <ul class="check-list" style="margin-top:16px">
          <li>Réponse sous 24h ouvrées</li>
          <li>Interlocuteur unique</li>
          <li>Aucun engagement</li>
        </ul>
      </div>
      <div class="reveal">{contact_form(depth, title="Demander un devis gratuit", service=slug)}</div>
    </div>
  </div>
</section>

{faq_jsonld(c['faq'])}
{localbusiness_jsonld()}
{breadcrumb_jsonld([(DOMAIN + "/", "Accueil"), (DOMAIN + "/services/", "Services"), (DOMAIN + "/services/" + slug + "/", name)])}
"""
        out[f"services/{slug}/index.html"] = page(depth, f"services/{slug}/", c["title"], c["desc"], body)

    return out
