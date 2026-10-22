# -*- coding: utf-8 -*-
from base import (page, breadcrumb, breadcrumb_jsonld, cta_band, contact_form,
                  faq_block, faq_jsonld, localbusiness_jsonld, IC, DOMAIN,
                  PHONE_DISPLAY, PHONE_LINK, root, VILLES)

# Contenu local unique par ville (pas de duplication)
VILLE_CONTENT = {
    "depannage-informatique-paris": {
        "ville": "Paris",
        "dep": "Paris (75)",
        "title": "Dépannage & maintenance informatique à Paris (75) — entreprises | DHB",
        "desc": "Dépannage et maintenance informatique pour entreprises à Paris (75) : intervention rapide sur site dans tous les arrondissements et support à distance. Audit gratuit.",
        "h1": "Maintenance & dépannage informatique à Paris",
        "contexte": ("Paris concentre une densité exceptionnelle de TPE, PME, cabinets, commerces et sièges d'entreprises, "
                     "répartis sur vingt arrondissements. Entre les immeubles haussmanniens aux réseaux parfois vieillissants, "
                     "les espaces de coworking et les boutiques connectées, les besoins informatiques y sont aussi variés que nombreux. "
                     "La circulation et le stationnement compliquent souvent les interventions : c'est pourquoi nous combinons une forte "
                     "capacité de résolution à distance avec des déplacements sur site ciblés dans la capitale."),
        "specifique": ("Nous intervenons dans l'ensemble des arrondissements parisiens, du quartier d'affaires de l'Opéra aux zones plus "
                       "résidentielles. Pour les cabinets d'avocats, d'experts-comptables et les professions de santé parisiennes, nous apportons "
                       "une attention particulière à la confidentialité des données et à la conformité RGPD."),
        "delai": "À distance, nous intervenons dans la journée pour les problèmes logiciels et réseau. Sur site à Paris, nous privilégions des créneaux planifiés pour éviter les contraintes de circulation, avec traitement prioritaire des urgences bloquantes.",
    },
    "depannage-informatique-boulogne-billancourt": {
        "ville": "Boulogne-Billancourt",
        "dep": "Hauts-de-Seine (92)",
        "title": "Dépannage & maintenance informatique à Boulogne-Billancourt (92) | DHB",
        "desc": "Maintenance et dépannage informatique pour entreprises à Boulogne-Billancourt (92) : intervention sur site et support à distance. Audit gratuit, sans engagement.",
        "h1": "Maintenance & dépannage informatique à Boulogne-Billancourt",
        "contexte": ("Première ville des Hauts-de-Seine par sa population, Boulogne-Billancourt est un pôle économique majeur de l'ouest parisien, "
                     "avec une concentration forte d'entreprises des médias, du numérique, du conseil et de nombreuses PME de services. "
                     "Le tissu local, dynamique et exigeant, attend une informatique rapide et fiable à la hauteur de son activité."),
        "specifique": ("Proche de Paris et bien desservie, Boulogne-Billancourt nous permet des interventions sur site réactives. "
                       "Nous accompagnons aussi bien les jeunes entreprises du secteur numérique que les cabinets et commerces installés de longue date."),
        "delai": "Grâce à la proximité de la zone, nous proposons des interventions sur site dans des délais courts, en complément du support à distance immédiat pour les pannes logicielles.",
    },
    "depannage-informatique-saint-denis": {
        "ville": "Saint-Denis",
        "dep": "Seine-Saint-Denis (93)",
        "title": "Dépannage & maintenance informatique à Saint-Denis (93) — entreprises | DHB",
        "desc": "Maintenance et dépannage informatique pour entreprises à Saint-Denis (93) : intervention sur site et support à distance partout en France. Audit gratuit.",
        "h1": "Maintenance & dépannage informatique à Saint-Denis",
        "contexte": ("Saint-Denis, au cœur de la Seine-Saint-Denis, connaît un fort développement économique avec de nombreuses zones d'activité, "
                     "des sièges d'entreprises, des PME industrielles et logistiques, ainsi qu'un tissu commercial et associatif dense. "
                     "Ces activités variées impliquent des parcs informatiques souvent mixtes (postes bureautiques, réseau, équipements métier) "
                     "qui demandent un entretien rigoureux."),
        "specifique": ("Nous accompagnons les entreprises dionysiennes, des zones d'activité aux commerces de centre-ville, avec une approche "
                       "pragmatique : sécuriser les données, fiabiliser le réseau et limiter les interruptions d'activité."),
        "delai": "Support à distance immédiat pour les urgences logicielles et réseau, et déplacements sur site planifiés dans toute la commune et ses zones d'activité.",
    },
    "depannage-informatique-saint-ouen": {
        "ville": "Saint-Ouen",
        "dep": "Seine-Saint-Denis (93)",
        "title": "Dépannage & maintenance informatique à Saint-Ouen (93) — entreprises | DHB",
        "desc": "Maintenance et dépannage informatique pour entreprises et commerces à Saint-Ouen (93) : intervention sur site rapide et support à distance. Audit gratuit, prix clairs.",
        "h1": "Maintenance & dépannage informatique à Saint-Ouen",
        "contexte": ("Au cœur de Plaine Commune et aux portes de Paris, Saint-Ouen conjugue un tissu dense de commerces, de "
                     "jeunes entreprises, d'agences et de professions libérales, avec une forte dynamique immobilière et tertiaire. "
                     "Ces structures, souvent de petite taille, ont besoin d'une informatique fiable et d'un interlocuteur de proximité "
                     "qui comprend leurs contraintes sans jargon."),
        "specifique": ("Nous accompagnons les TPE, commerces et cabinets audoniens avec une vraie réactivité locale : fiabiliser les "
                       "postes et le réseau, sécuriser les données, et mettre en place des sauvegardes sérieuses — avec des prix annoncés "
                       "à l'avance, pas de mauvaise surprise."),
        "delai": "Proximité immédiate de Paris et de Saint-Denis : interventions sur site rapides à Saint-Ouen, en complément d'un support à distance disponible dès réception de votre demande.",
    },
    "depannage-informatique-aubervilliers": {
        "ville": "Aubervilliers",
        "dep": "Seine-Saint-Denis (93)",
        "title": "Dépannage & maintenance informatique à Aubervilliers (93) — entreprises | DHB",
        "desc": "Maintenance et dépannage informatique pour entreprises, commerces et grossistes à Aubervilliers (93) : intervention sur site et support à distance. Audit gratuit.",
        "h1": "Maintenance & dépannage informatique à Aubervilliers",
        "contexte": ("Aubervilliers, grande ville de Plaine Commune, abrite un tissu économique très varié : commerces et grossistes, "
                     "ateliers, PME, associations et de nombreuses structures en plein développement. Cette diversité se traduit par des "
                     "parcs informatiques mixtes (caisses, postes bureautiques, réseau) qui demandent un entretien rigoureux et un dépannage réactif."),
        "specifique": ("Nous aidons les entreprises et commerces albertivillariens à garder une informatique opérationnelle : réseau et "
                       "Wi-Fi fiables, caisses et postes qui tiennent, données sauvegardées et sécurisées — avec un interlocuteur unique et des tarifs clairs."),
        "delai": "Support à distance immédiat pour les urgences, et déplacements sur site rapides à Aubervilliers et dans tout le nord du 93.",
    },
    "depannage-informatique-epinay-sur-seine": {
        "ville": "Épinay-sur-Seine",
        "dep": "Seine-Saint-Denis (93)",
        "title": "Dépannage & maintenance informatique à Épinay-sur-Seine (93) | DHB",
        "desc": "Maintenance et dépannage informatique pour entreprises, commerces et indépendants à Épinay-sur-Seine (93) : intervention sur site et à distance. Audit gratuit.",
        "h1": "Maintenance & dépannage informatique à Épinay-sur-Seine",
        "contexte": ("Épinay-sur-Seine, au nord de la Seine-Saint-Denis, mêle commerces de proximité, petites entreprises de services, "
                     "cabinets et un tissu associatif actif. Ces acteurs ont besoin d'une informatique simple, fiable et peu coûteuse à "
                     "entretenir, avec quelqu'un de joignable en cas de souci."),
        "specifique": ("Nous accompagnons les professionnels spinassiens avec des solutions adaptées à leur taille : remise à niveau des "
                       "postes, sécurité et sauvegarde, messagerie professionnelle — le tout expliqué simplement et à prix annoncé."),
        "delai": "Support à distance dans la journée pour les incidents courants, et interventions sur site à Épinay-sur-Seine et dans le nord 93.",
    },
    "depannage-informatique-pantin": {
        "ville": "Pantin",
        "dep": "Seine-Saint-Denis (93)",
        "title": "Dépannage & maintenance informatique à Pantin (93) — entreprises | DHB",
        "desc": "Maintenance et dépannage informatique pour entreprises, agences et startups à Pantin (93) : intervention sur site rapide et support à distance. Audit gratuit.",
        "h1": "Maintenance & dépannage informatique à Pantin",
        "contexte": ("Aux portes de Paris, Pantin est devenue un pôle dynamique pour les agences, les studios créatifs, les startups et "
                     "les entreprises de services, aux côtés d'un tissu de commerces et d'artisans. Ces structures, exigeantes et connectées, "
                     "attendent une informatique rapide, sécurisée et un prestataire qui parle leur langage."),
        "specifique": ("Nous accompagnons les entreprises pantinoises avec une approche moderne : réseau et Wi-Fi performants, cybersécurité "
                       "adaptée, sauvegarde fiable et support réactif — sur site comme à distance, avec des tarifs transparents."),
        "delai": "Interventions sur site réactives grâce à la proximité de Paris, en complément d'un support à distance immédiat pour tout ce qui peut se régler sans déplacement.",
    },
    "depannage-informatique-nanterre": {
        "ville": "Nanterre",
        "dep": "Hauts-de-Seine (92)",
        "title": "Dépannage & maintenance informatique à Nanterre (92) — entreprises | DHB",
        "desc": "Maintenance et dépannage informatique pour entreprises à Nanterre (92), à deux pas de La Défense : intervention sur site et à distance. Audit gratuit.",
        "h1": "Maintenance & dépannage informatique à Nanterre",
        "contexte": ("Préfecture des Hauts-de-Seine et voisine immédiate du quartier d'affaires de La Défense, Nanterre accueille de nombreuses "
                     "entreprises, administrations et PME de services. La proximité du premier quartier d'affaires d'Europe tire vers le haut "
                     "les exigences en matière de fiabilité réseau, de sécurité des données et de continuité d'activité."),
        "specifique": ("Nous aidons les entreprises nanterriennes à professionnaliser leur informatique : réseau d'entreprise fiable, "
                       "cybersécurité adaptée et sauvegardes robustes, qu'il s'agisse de petites structures ou d'équipes plus étoffées."),
        "delai": "Interventions sur site facilitées par la bonne desserte de la zone, en complément d'un support à distance réactif pour tout ce qui peut se traiter sans déplacement.",
    },
    "depannage-informatique-creteil": {
        "ville": "Créteil",
        "dep": "Val-de-Marne (94)",
        "title": "Dépannage & maintenance informatique à Créteil (94) — entreprises | DHB",
        "desc": "Maintenance et dépannage informatique pour entreprises à Créteil (94) : intervention sur site dans le Val-de-Marne et support à distance. Audit gratuit.",
        "h1": "Maintenance & dépannage informatique à Créteil",
        "contexte": ("Préfecture du Val-de-Marne, Créteil est un centre administratif, hospitalier et commercial important du sud-est francilien. "
                     "On y trouve de nombreux cabinets, commerces, professions libérales et PME de services, pour qui la disponibilité des outils "
                     "informatiques et la protection des données sont essentielles au quotidien."),
        "specifique": ("Nous accompagnons les professionnels cristoliens avec une attention particulière aux secteurs sensibles (santé, juridique, "
                       "services), où confidentialité et conformité RGPD sont prioritaires."),
        "delai": "Support à distance dans la journée pour les incidents courants, et déplacements sur site dans Créteil et le Val-de-Marne pour les interventions nécessitant une présence.",
    },
    "depannage-informatique-versailles": {
        "ville": "Versailles",
        "dep": "Yvelines (78)",
        "title": "Dépannage & maintenance informatique à Versailles (78) — entreprises | DHB",
        "desc": "Maintenance et dépannage informatique pour entreprises à Versailles (78) : intervention sur site dans les Yvelines et support à distance. Audit gratuit.",
        "h1": "Maintenance & dépannage informatique à Versailles",
        "contexte": ("Préfecture des Yvelines, Versailles mêle un important tissu de professions libérales, de cabinets, de commerces de qualité "
                     "et de PME, dans un environnement où l'image et le sérieux comptent. Les entreprises versaillaises recherchent un prestataire "
                     "informatique fiable, discret et à l'écoute, capable de les accompagner dans la durée."),
        "specifique": ("Nous apportons aux professionnels de Versailles et de ses environs une informatique soignée : postes fiables, messagerie "
                       "professionnelle crédible, sauvegardes sérieuses et sécurité adaptée, le tout expliqué sans jargon."),
        "delai": "Support à distance immédiat pour les problèmes logiciels, et interventions sur site planifiées à Versailles et dans les communes voisines des Yvelines.",
    },
    "depannage-informatique-montreuil": {
        "ville": "Montreuil",
        "dep": "Seine-Saint-Denis (93)",
        "title": "Dépannage & maintenance informatique à Montreuil (93) — entreprises | DHB",
        "desc": "Maintenance et dépannage informatique pour entreprises à Montreuil (93) : intervention sur site et support à distance partout en France. Audit gratuit.",
        "h1": "Maintenance & dépannage informatique à Montreuil",
        "contexte": ("Aux portes de Paris, Montreuil est une ville à l'identité forte, qui accueille un écosystème dense d'entreprises créatives, "
                     "d'artisans, de commerces, d'associations et de PME de services. Cette diversité se traduit par des besoins informatiques "
                     "très variés, du poste unique d'indépendant au petit réseau d'entreprise."),
        "specifique": ("Nous accompagnons le tissu montreuillois avec souplesse : solutions adaptées aux petites structures comme aux équipes "
                       "en croissance, toujours avec le même souci de clarté et de proximité."),
        "delai": "Proximité immédiate de Paris oblige, les interventions sur site à Montreuil sont réactives, en complément d'un support à distance disponible dès réception de votre demande.",
    },
    "depannage-informatique-argenteuil": {
        "ville": "Argenteuil",
        "dep": "Val-d'Oise (95)",
        "title": "Dépannage & maintenance informatique à Argenteuil (95) — entreprises | DHB",
        "desc": "Maintenance et dépannage informatique pour entreprises à Argenteuil (95) : intervention sur site dans le Val-d'Oise et support à distance. Audit gratuit.",
        "h1": "Maintenance & dépannage informatique à Argenteuil",
        "contexte": ("Grande ville du Val-d'Oise au nord-ouest de Paris, Argenteuil dispose d'un tissu économique varié, avec des zones d'activité, "
                     "des commerces, de l'artisanat et de nombreuses PME. Ces entreprises ont besoin d'un informatique fiable et d'un interlocuteur "
                     "de proximité qui les comprenne, sans discours compliqué."),
        "specifique": ("Nous aidons les entreprises argenteuillaises à mettre de l'ordre dans leur informatique : fiabiliser le matériel et le réseau, "
                       "sécuriser les données et mettre en place des sauvegardes dignes de ce nom."),
        "delai": "Support à distance dans la journée pour les incidents courants, et déplacements sur site à Argenteuil et dans le Val-d'Oise selon les besoins.",
    },
    "support-informatique-a-distance-france": {
        "ville": "toute la France",
        "dep": "France entière",
        "title": "Support informatique à distance partout en France — entreprises | DHB",
        "desc": "Support et assistance informatique à distance pour entreprises partout en France : dépannage rapide, sécurisé et sans déplacement. Réponse sous 24h ouvrées.",
        "h1": "Support informatique à distance, partout en France",
        "contexte": ("Vous n'êtes pas en Île-de-France ? Ce n'est pas un problème. Une grande partie des incidents informatiques se résolvent "
                     "sans déplacement : lenteurs, plantages, configuration, messagerie, sécurité, sauvegardes, installation de logiciels. "
                     "Grâce au support à distance, nous accompagnons les entreprises dans toute la France avec la même réactivité et le même "
                     "interlocuteur unique qu'en intervention sur site."),
        "specifique": ("Le support à distance repose sur des outils de prise en main sécurisés, utilisés uniquement avec votre accord explicite. "
                       "Vous voyez tout ce qui se passe à l'écran et gardez le contrôle. C'est souvent plus rapide qu'un déplacement, et tout "
                       "aussi efficace pour l'immense majorité des problèmes. Pour la maintenance et la supervision, la distance ne change rien : "
                       "nos agents surveillent vos équipements où qu'ils soient."),
        "delai": "Réponse à toute demande sous 24h ouvrées, avec prise en main souvent le jour même pour les urgences. Aucun frais de déplacement puisqu'il n'y a pas de déplacement.",
        "distance": True,
    },
}


def _faq(ville, distance=False):
    if distance:
        return [
            ("Le support à distance est-il vraiment aussi efficace ?", "Pour la grande majorité des problèmes (lenteurs, logiciels, messagerie, sécurité, configuration), oui. Seules les pannes strictement matérielles nécessitent une présence physique. Le support à distance a aussi l'avantage d'être immédiat, sans attendre un déplacement."),
            ("Est-ce sécurisé de vous laisser accéder à nos machines ?", "Oui. Nous utilisons des outils de prise en main sécurisés, activés uniquement avec votre accord à chaque session. Vous voyez l'écran en permanence et pouvez interrompre à tout moment. Rien ne se fait à votre insu."),
            ("Faut-il installer quelque chose ?", "Un petit outil de prise en main, léger et sécurisé, suffit. Pour la supervision et la maintenance, un agent discret est installé sur vos équipements, avec votre accord, pour nous permettre de veiller sur leur bon fonctionnement."),
            ("Peut-on vous confier toute notre informatique à distance ?", "Oui. Maintenance, supervision, sécurité, sauvegardes et support peuvent être gérés intégralement à distance, partout en France, dans le cadre de notre infogérance globale."),
        ]
    return [
        (f"Intervenez-vous sur site à {ville} ?", f"Oui. Nous nous déplaçons sur site à {ville} pour tout ce qui nécessite une présence physique (matériel, réseau, installation). Pour le reste, le support à distance nous permet d'intervenir immédiatement, sans attendre un déplacement."),
        ("Quels sont vos délais d'intervention ?", "Notre engagement : une réponse à toute demande sous 24h ouvrées. Les problèmes logiciels et réseau sont souvent traités à distance dans la journée, et les urgences bloquantes sont priorisées."),
        ("Travaillez-vous avec les petites structures ?", f"Absolument. Indépendants, TPE, PME, cabinets, commerces et associations de {ville} : nous nous adaptons à toutes les tailles, sans minimum ni engagement."),
        ("Comment se passe le premier contact ?", "Par un audit gratuit et sans engagement de votre installation. Vous obtenez un état des lieux clair et des recommandations priorisées, que vous décidiez ou non de travailler avec nous ensuite."),
    ]


def build():
    out = {}

    # Index des zones
    cards = ""
    for slug, name in VILLES:
        v = VILLE_CONTENT[slug]
        cards += f"""
        <div class="card reveal">
          <div class="icon-box">{IC['map']}</div>
          <h2 class="h3">{v['ville'] if not v.get('distance') else 'À distance'}</h2>
          <p>{v['dep']}</p>
          <a class="card-link" href="{slug}/">Voir la page</a>
        </div>"""
    body = f"""
<section class="page-hero">
  {breadcrumb(1, [(None, "Zones d'intervention")])}
  <div class="wrap">
    <span class="eyebrow">Zones d'intervention</span>
    <h1>Sur site en Île-de-France, à distance partout en France</h1>
    <p>Nous nous déplaçons dans toute l'Île-de-France pour les interventions sur site, et nous assurons le support, la maintenance et la supervision à distance pour les entreprises de toute la France.</p>
  </div>
</section>
<section class="section"><div class="wrap">
  <p class="lead center" style="max-width:760px;margin:0 auto 40px">Ces pages constituent un modèle à dupliquer proprement, ville par ville, avec un contenu local réel et non dupliqué. <span class="a-completer">[À COMPLÉTER : ajouter d'autres communes selon votre développement commercial.]</span></p>
  <div class="grid grid-3">{cards}</div>
</div></section>
{cta_band(1)}
{breadcrumb_jsonld([(DOMAIN + "/", "Accueil"), (DOMAIN + "/zones/", "Zones d'intervention")])}
"""
    out["zones/index.html"] = page(1, "zones/",
        "Zones d'intervention — maintenance informatique en Île-de-France & France | DHB",
        "DHB intervient sur site partout en Île-de-France (Paris, 92, 93, 94, 78, 95) et assure le support informatique à distance dans toute la France.",
        body)

    def autres_zones(slug, v, r):
        """Liens vers les autres villes : d'abord le même département, puis les autres (ordre de la liste)."""
        villes = [(s_, VILLE_CONTENT[s_]) for s_, _ in VILLES if s_ != slug and not VILLE_CONTENT[s_].get("distance")]
        villes.sort(key=lambda x: x[1]["dep"] != v["dep"])
        num = lambda dep: dep[dep.rfind("("):] if "(" in dep else ""   # « Seine-Saint-Denis (93) » → « (93) »
        liens = [f'<a href="{r}zones/{s_}/">{w["ville"]} {num(w["dep"])}</a>' for s_, w in villes[:6]]
        if not v.get("distance"):
            liens.append(f'<a href="{r}zones/support-informatique-a-distance-france/">Support à distance (toute la France)</a>')
        return "".join(liens)

    # Pages ville
    for slug, name in VILLES:
        v = VILLE_CONTENT[slug]
        depth = 2
        r = root(depth)
        distance = v.get("distance", False)
        faq = _faq(v["ville"], distance)

        services_locaux = f"""
        <div class="grid grid-2">
          <div class="card reveal"><h3>Dépannage & assistance</h3><p>Résolution rapide de vos pannes, {'à distance' if distance else 'sur site et à distance'}.</p><a class="card-link" href="{r}services/depannage-assistance-informatique/">Voir le service</a></div>
          <div class="card reveal"><h3>Maintenance du parc</h3><p>Entretien continu de vos postes, serveurs et réseau.</p><a class="card-link" href="{r}services/maintenance-parc-informatique/">Voir le service</a></div>
          <div class="card reveal"><h3>Cybersécurité</h3><p>Antivirus, pare-feu, protection des données et sensibilisation.</p><a class="card-link" href="{r}services/cybersecurite/">Voir le service</a></div>
          <div class="card reveal"><h3>Sauvegarde & restauration</h3><p>Sauvegarde automatique, hors site et testée.</p><a class="card-link" href="{r}services/sauvegarde-restauration/">Voir le service</a></div>
        </div>"""

        body = f"""
<section class="page-hero">
  {breadcrumb(depth, [("zones/", "Zones"), (None, v['ville'] if not distance else 'À distance (France)')])}
  <div class="wrap">
    <span class="eyebrow">{v['dep']}</span>
    <h1>{v['h1']}</h1>
    <p>Maintenance, dépannage, sécurité et sauvegarde informatique pour les entreprises {('de ' + v['ville']) if not distance else 'partout en France'}. Un interlocuteur unique, un langage clair, aucun engagement.</p>
    <div class="hero-cta">
      <a class="btn btn--primary btn--lg" href="{r}contact/">Demander un audit gratuit</a>
      <a class="btn btn--ghost btn--lg" href="tel:{PHONE_LINK}">{IC['phone']} {PHONE_DISPLAY}</a>
    </div>
  </div>
</section>

<section class="section"><div class="wrap">
  <div class="article-body" style="max-width:820px">
    <h2>{'Une informatique fiable' if not distance else 'La proximité, même à distance'} pour les entreprises {('de ' + v['ville']) if not distance else 'de toute la France'}</h2>
    <p>{v['contexte']}</p>
    <p>{v['specifique']}</p>
    <h2>Nos délais d'intervention</h2>
    <p>{v['delai']}</p>
  </div>
</div></section>

<section class="section section--gris"><div class="wrap">
  <div class="center" style="max-width:700px;margin:0 auto 40px">
    <span class="eyebrow">Nos services {('à ' + v['ville']) if not distance else 'à distance'}</span>
    <h2>Ce que nous faisons pour vous</h2>
  </div>
  {services_locaux}
</div></section>

{faq_block(faq, "Questions fréquentes — " + (v['ville'] if not distance else 'support à distance'))}

<section class="section section--tight"><div class="wrap">
  <h2 class="center" style="margin-bottom:24px">Autres zones d'intervention</h2>
  <div class="related">{autres_zones(slug, v, r)}</div>
</div></section>

{cta_band(depth, title=("Besoin d'aide informatique à " + v['ville'] + " ?") if not distance else "Besoin d'un support informatique à distance ?")}

{faq_jsonld(faq)}
{localbusiness_jsonld()}
{breadcrumb_jsonld([(DOMAIN + "/", "Accueil"), (DOMAIN + "/zones/", "Zones"), (DOMAIN + "/zones/" + slug + "/", v['h1'])])}
"""
        out[f"zones/{slug}/index.html"] = page(depth, f"zones/{slug}/", v["title"], v["desc"], body)

    return out
