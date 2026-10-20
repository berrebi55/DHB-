# -*- coding: utf-8 -*-
"""DHB — moteur de gabarit partagé (head, header, footer, composants)."""

# --- Valeurs d'EXEMPLE à remplacer par le propriétaire -----------------------
SITE_NAME = "DHB"
SIGNATURE = "Maintenance & sécurité informatique pour les entreprises"
DOMAIN = "https://pro.dhb-groupe.fr"                 # [EXEMPLE À REMPLACER] — filiale Infogérance (entreprises)
PHONE_DISPLAY = "01 23 45 67 89"                      # [EXEMPLE À REMPLACER]
PHONE_LINK = "+33123456789"                           # [EXEMPLE À REMPLACER]
WHATSAPP = "33123456789"                              # [EXEMPLE À REMPLACER]
EMAIL = "contact@dhb-informatique.fr"                 # [EXEMPLE À REMPLACER]
ADDRESS_CITY = "Paris"                                # [EXEMPLE À REMPLACER]
ADDRESS_REGION = "Île-de-France"
YEAR = 2026

# Profondeur -> préfixe racine relatif (le site est 100 % relatif, portable)
def root(depth):
    return "../" * depth if depth else ""

# --- Navigation --------------------------------------------------------------
SERVICES = [
    ("depannage-assistance-informatique", "Dépannage & assistance", "Une panne ? On intervient vite, sur site ou à distance."),
    ("maintenance-parc-informatique", "Maintenance du parc", "Postes, serveurs et réseau entretenus en continu."),
    ("supervision-monitoring", "Supervision & monitoring", "Vos équipements surveillés 24/7, les pannes évitées."),
    ("cybersecurite", "Cybersécurité", "Antivirus, pare-feu, protection et sensibilisation."),
    ("sauvegarde-restauration", "Sauvegarde & restauration", "Vos données protégées et récupérables à tout moment."),
    ("messagerie-cloud", "Messagerie & cloud pro", "Microsoft 365 et Google Workspace sans prise de tête."),
    ("infogerance-globale", "Infogérance globale", "Tout votre informatique géré, un interlocuteur unique."),
]

VILLES = [
    ("depannage-informatique-paris", "Paris"),
    ("depannage-informatique-boulogne-billancourt", "Boulogne-Billancourt"),
    ("depannage-informatique-saint-denis", "Saint-Denis"),
    ("depannage-informatique-nanterre", "Nanterre"),
    ("depannage-informatique-creteil", "Créteil"),
    ("depannage-informatique-versailles", "Versailles"),
    ("depannage-informatique-montreuil", "Montreuil"),
    ("depannage-informatique-argenteuil", "Argenteuil"),
    ("support-informatique-a-distance-france", "Support à distance (France)"),
]


def nav_html(depth):
    r = root(depth)
    serv_items = "\n".join(
        f'<a href="{r}services/{slug}/">{name}<span>{desc}</span></a>'
        for slug, name, desc in SERVICES
    )
    ville_items = "\n".join(
        f'<a href="{r}zones/{slug}/">{name}</a>' for slug, name in VILLES
    )
    return f"""
    <nav class="nav" aria-label="Navigation principale">
      <div class="nav-item">
        <a class="nav-link" href="{r}services/">Services ▾</a>
        <div class="dropdown">{serv_items}</div>
      </div>
      <div class="nav-item">
        <a class="nav-link" href="{r}zones/">Zones ▾</a>
        <div class="dropdown">{ville_items}</div>
      </div>
      <a class="nav-link" href="{r}pannes-frequentes/">Pannes fréquentes</a>
      <a class="nav-link" href="{r}blog/">Blog</a>
      <a class="nav-link" href="{r}a-propos/">À propos</a>
      <a class="nav-link" href="{r}contact/">Contact</a>
    </nav>"""


def mobile_nav_html(depth):
    r = root(depth)
    serv_items = "\n".join(
        f'<a href="{r}services/{slug}/">{name}</a>' for slug, name, _ in SERVICES
    )
    ville_items = "\n".join(
        f'<a href="{r}zones/{slug}/">{name}</a>' for slug, name in VILLES
    )
    return f"""
    <div class="mobile-nav" id="mobile-nav">
      <details><summary>Services</summary>{serv_items}</details>
      <details><summary>Zones d'intervention</summary>{ville_items}</details>
      <a href="{r}pannes-frequentes/">Pannes fréquentes</a>
      <a href="{r}blog/">Blog</a>
      <a href="{r}a-propos/">À propos</a>
      <a href="{r}contact/">Contact</a>
      <a class="btn btn--primary btn--block" href="{r}contact/">Demander un audit gratuit</a>
      <a class="btn btn--outline btn--block" href="tel:{PHONE_LINK}">Appeler le {PHONE_DISPLAY}</a>
    </div>"""


# --- Icônes SVG inline (légères, cohérentes) ---------------------------------
IC = {
    "shield": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="26" height="26"><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z"/><path d="m9 12 2 2 4-4"/></svg>',
    "wrench": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="26" height="26"><path d="M14 7a4 4 0 0 1-5 5L5 16l3 3 4-4a4 4 0 0 0 5-5z"/></svg>',
    "server": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="26" height="26"><rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/></svg>',
    "eye": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="26" height="26"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',
    "save": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="26" height="26"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v4h-4"/></svg>',
    "mail": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="26" height="26"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    "layers": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="26" height="26"><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/></svg>',
    "user": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
    "clock": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    "chat": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    "eyeopen": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',
    "map": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    "check": '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
    "star": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="40" height="40"><path d="m12 3 2.9 5.9 6.1.9-4.5 4.3 1 6.1L12 17.8 6.5 20.1l1-6.1L3 8.8l6.1-.9z"/></svg>',
    "phone": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.5-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z"/></svg>',
    "wa": '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M.5 23.5 2.1 18A11.3 11.3 0 0 1 .6 12.3C.6 6 5.8.9 12.1.9c3 0 5.9 1.2 8 3.3a11.2 11.2 0 0 1-7.9 19.2c-1.9 0-3.8-.5-5.4-1.4zM6.7 20l.3.2c1.5.9 3.2 1.4 5 1.4a9.3 9.3 0 0 0 0-18.6 9.3 9.3 0 0 0-7.9 14.2l.2.4-1 3.5zM17.5 14.3c-.1-.2-.4-.3-.8-.5s-2-1-2.3-1.1c-.3-.1-.5-.2-.8.1s-.9 1.1-1.1 1.3c-.2.2-.4.3-.7.1a7.6 7.6 0 0 1-3.8-3.3c-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5l-1-2.5c-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4a3.6 3.6 0 0 0-1.1 2.7c0 1.6 1.2 3.1 1.3 3.3.2.2 2.3 3.6 5.6 5 2.1.9 2.9 1 3.9.8.6-.1 2-.8 2.2-1.6.3-.8.3-1.5.2-1.6z"/></svg>',
    "bolt": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>',
    "lock": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
}

SERVICE_ICON = {
    "depannage-assistance-informatique": "wrench",
    "maintenance-parc-informatique": "server",
    "supervision-monitoring": "eye",
    "cybersecurite": "shield",
    "sauvegarde-restauration": "save",
    "messagerie-cloud": "mail",
    "infogerance-globale": "layers",
}


# --- Composants réutilisables ------------------------------------------------
def breadcrumb(depth, trail):
    """trail: liste de (href_relatif_ou_None, label)."""
    r = root(depth)
    parts = [f'<a href="{r}">Accueil</a>']
    for href, label in trail:
        parts.append('<span>/</span>')
        if href:
            parts.append(f'<a href="{r}{href}">{label}</a>')
        else:
            parts.append(label)
    return f'<div class="breadcrumb wrap">{"".join(parts)}</div>'


def contact_form(depth, compact=False, title="Demander un audit gratuit", with_type=False, service=None):
    r = root(depth)
    msg = "Décrivez votre besoin ou votre problème…"
    svc_attr = f' data-service="{service}"' if service else ""
    type_field = ""
    if with_type:
        type_field = """
        <div class="form-row">
          <label for="f-type">Objet de votre demande</label>
          <select id="f-type" name="type">
            <option value="devis">Demande de devis / audit gratuit</option>
            <option value="question">Question / renseignement</option>
          </select>
        </div>"""
    return f"""
    <div class="form-card">
      <h3 class="mt-0">{title}</h3>
      <p style="font-size:.95rem">Réponse sous 24h ouvrées · Sans engagement · Interlocuteur unique</p>
      <form data-demo-form data-type="devis"{svc_attr} novalidate>
        <div class="form-ok">✅ Merci ! Votre demande a bien été prise en compte. Nous vous recontactons sous 24h ouvrées. Pour une urgence, appelez le <a href="tel:{PHONE_LINK}">{PHONE_DISPLAY}</a>.</div>
        {type_field}
        <div class="form-grid">
          <div class="form-row"><label for="f-nom">Nom et prénom</label><input id="f-nom" name="nom" type="text" required></div>
          <div class="form-row"><label for="f-ent">Entreprise</label><input id="f-ent" name="entreprise" type="text"></div>
        </div>
        <div class="form-grid">
          <div class="form-row"><label for="f-mail">Email professionnel</label><input id="f-mail" name="email" type="email" required></div>
          <div class="form-row"><label for="f-tel">Téléphone</label><input id="f-tel" name="telephone" type="tel"></div>
        </div>
        <div class="form-row"><label for="f-msg">Votre message</label><textarea id="f-msg" name="message" placeholder="{msg}"></textarea></div>
        <div class="form-row consent">
          <input id="f-rgpd" type="checkbox" required>
          <label for="f-rgpd" style="font-weight:500;margin:0">J'accepte que mes informations soient utilisées pour être recontacté(e). Elles ne seront jamais revendues. Voir la <a href="{r}politique-confidentialite/">politique de confidentialité</a>.</label>
        </div>
        <button class="btn btn--primary btn--lg btn--block" type="submit">Envoyer ma demande</button>
      </form>
    </div>"""


def cta_band(depth, title="Un problème informatique dans votre entreprise ?",
             text="Confiez-nous un premier regard. L'audit est gratuit, sans engagement, et vous repartez avec un plan clair — même si vous ne travaillez pas avec nous."):
    r = root(depth)
    return f"""
    <section class="section"><div class="wrap"><div class="cta-band reveal">
      <h2>{title}</h2>
      <p>{text}</p>
      <div class="hero-cta">
        <a class="btn btn--primary btn--lg" href="{r}contact/">Demander un audit gratuit</a>
        <a class="btn btn--ghost btn--lg" href="tel:{PHONE_LINK}">{IC['phone']} {PHONE_DISPLAY}</a>
      </div>
    </div></div></section>"""


def faq_block(items, heading="Questions fréquentes"):
    rows = ""
    for q, a in items:
        rows += f'<details class="faq-item"><summary>{q}</summary><div class="faq-body"><p>{a}</p></div></details>\n'
    return f'<section class="section section--gris"><div class="wrap" style="max-width:800px"><h2 class="center">{heading}</h2>{rows}</div></section>'


def faq_jsonld(items):
    import json
    data = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": strip_tags(q),
             "acceptedAnswer": {"@type": "Answer", "text": strip_tags(a)}}
            for q, a in items
        ],
    }
    return '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False) + '</script>'


def strip_tags(s):
    import re
    return re.sub(r"<[^>]+>", "", s).replace("  ", " ").strip()


def localbusiness_jsonld():
    import json
    data = {
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        "name": SITE_NAME,
        "description": SIGNATURE,
        "url": DOMAIN + "/",
        "telephone": PHONE_LINK,
        "email": EMAIL,
        "image": DOMAIN + "/assets/img/og.svg",
        "areaServed": [
            {"@type": "AdministrativeArea", "name": "Île-de-France"},
            {"@type": "Country", "name": "France"},
        ],
        "address": {"@type": "PostalAddress", "addressLocality": ADDRESS_CITY,
                    "addressRegion": "IDF", "addressCountry": "FR"},
        "priceRange": "Sur devis",
        "openingHours": "Mo-Fr 09:00-18:00",
        "knowsAbout": ["infogérance", "maintenance informatique", "dépannage informatique",
                       "cybersécurité", "sauvegarde de données", "support informatique PME"],
    }
    return '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False) + '</script>'


def breadcrumb_jsonld(trail_full):
    """trail_full: liste de (url_absolue, label), incluant l'accueil."""
    import json
    items = []
    for i, (url, label) in enumerate(trail_full, start=1):
        items.append({"@type": "ListItem", "position": i, "name": label, "item": url})
    data = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": items}
    return '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False) + '</script>'


# --- Gabarit de page ---------------------------------------------------------
def page(depth, slug_path, title, description, body, extra_head="", og_type="website"):
    """slug_path: chemin relatif sans slash initial, ex. 'services/cybersecurite/' ou '' pour l'accueil."""
    r = root(depth)
    canonical = DOMAIN + "/" + slug_path
    return f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{description}">
<link rel="canonical" href="{canonical}">
<meta name="robots" content="index, follow">
<meta property="og:type" content="{og_type}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{DOMAIN}/assets/img/og.svg">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="{SITE_NAME} — {SIGNATURE}">
<meta name="theme-color" content="#0B2A4A">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap">
<link rel="stylesheet" href="{r}assets/css/style.css">
<link rel="icon" href="{r}assets/img/favicon.svg" type="image/svg+xml">
{extra_head}
</head>
<body>
<a class="skip-link" href="#contenu">Aller au contenu</a>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="logo" href="{r}" aria-label="{SITE_NAME} — accueil">
      <span class="logo__mark">D<b>H</b>B</span>
      <span class="logo__tag">{SIGNATURE}</span>
    </a>
    {nav_html(depth)}
    <div class="header-cta">
      <a class="btn btn--primary" href="{r}contact/">Audit gratuit</a>
    </div>
    <button class="burger" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="mobile-nav"><span></span><span></span><span></span></button>
  </div>
</header>
{mobile_nav_html(depth)}
<main id="contenu">
{body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-contact">
        <a class="logo" href="{r}" style="margin-bottom:14px"><span class="logo__mark">D<b>H</b>B</span><span class="logo__tag">{SIGNATURE}</span></a>
        <p>Maintenance, dépannage et sécurité informatique pour les entreprises, indépendants, cabinets, commerces et associations.</p>
        <p>📍 Sur site en <strong style="color:#cfe0f0">Île-de-France</strong> · 💻 à distance partout en <strong style="color:#cfe0f0">France</strong></p>
        <p>☎ <a href="tel:{PHONE_LINK}">{PHONE_DISPLAY}</a><br>✉ <a href="mailto:{EMAIL}">{EMAIL}</a></p>
      </div>
      <div>
        <h4>Nos services</h4>
        <a href="{r}services/depannage-assistance-informatique/">Dépannage & assistance</a>
        <a href="{r}services/maintenance-parc-informatique/">Maintenance du parc</a>
        <a href="{r}services/cybersecurite/">Cybersécurité</a>
        <a href="{r}services/sauvegarde-restauration/">Sauvegarde & restauration</a>
        <a href="{r}services/infogerance-globale/">Infogérance globale</a>
      </div>
      <div>
        <h4>Zones</h4>
        <a href="{r}zones/depannage-informatique-paris/">Paris</a>
        <a href="{r}zones/depannage-informatique-boulogne-billancourt/">Boulogne-Billancourt</a>
        <a href="{r}zones/depannage-informatique-nanterre/">Nanterre</a>
        <a href="{r}zones/support-informatique-a-distance-france/">À distance (France)</a>
        <a href="{r}zones/">Toutes les zones</a>
      </div>
      <div>
        <h4>Entreprise</h4>
        <a href="{r}a-propos/">À propos</a>
        <a href="{r}pannes-frequentes/">Pannes fréquentes</a>
        <a href="{r}blog/">Blog</a>
        <a href="{r}contact/">Contact</a>
        <a href="{r}mentions-legales/">Mentions légales</a>
        <a href="{r}politique-confidentialite/">Confidentialité (RGPD)</a>
        <a href="{r}plan-du-site/">Plan du site</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© {YEAR} {SITE_NAME}. Tous droits réservés. <span class="a-completer">[SIRET, forme juridique : À COMPLÉTER]</span></span>
      <nav aria-label="Liens légaux">
        <a href="{r}mentions-legales/">Mentions légales</a>
        <a href="{r}politique-confidentialite/">Confidentialité</a>
        <a href="{r}plan-du-site/">Plan du site</a>
      </nav>
    </div>
  </div>
</footer>

<div class="float-cta">
  <a class="float-btn wa" href="https://wa.me/{WHATSAPP}" target="_blank" rel="noopener" aria-label="Nous écrire sur WhatsApp">{IC['wa']}<span>WhatsApp</span></a>
  <a class="float-btn" href="tel:{PHONE_LINK}" aria-label="Être rappelé(e)">{IC['phone']}<span>Être rappelé(e)</span></a>
</div>

<div class="cookie-banner" role="dialog" aria-live="polite" aria-label="Gestion des cookies">
  <div class="cookie-inner">
    <p><strong>🍪 Respect de votre vie privée.</strong> Nous utilisons uniquement des cookies nécessaires au fonctionnement du site et, avec votre accord, des cookies de mesure d'audience. Vous pouvez refuser aussi simplement qu'accepter.</p>
    <div class="cookie-actions">
      <button class="btn btn--outline" data-cookie="refuse">Refuser</button>
      <button class="btn btn--primary" data-cookie="accept">Tout accepter</button>
    </div>
  </div>
</div>

<script src="{r}assets/js/supabase-config.js"></script>
<script src="{r}assets/js/main.js" defer></script>
</body>
</html>"""
