# -*- coding: utf-8 -*-
"""Identité commune DHB : barre inter-sites, en-tête, pied de page, barre
d'actions mobile et bandeau cookies, partagés par les trois générateurs
(Groupe, Pro, Assistance). Chaque site garde sa personnalité via
<body data-site="…"> dans la feuille de style commune.

Liens entre sites :
  - par défaut (développement local) : chemins relatifs entre dossiers
    sites/groupe, sites/infogerance, sites/particuliers ;
  - pour la mise en ligne : DHB_LIENS=prod python3 build/build_all.py
    produit les adresses des vrais domaines.
"""
import os

SITES = {
    "groupe": {"nom": "DHB Groupe", "label": "Groupe", "dossier": "groupe", "prod": "https://www.dhb-groupe.fr/",
               "pour": "Le groupe"},
    "pro": {"nom": "DHB Pro", "label": "Pro", "dossier": "infogerance", "prod": "https://pro.dhb-groupe.fr/",
            "pour": "Entreprises"},
    "assistance": {"nom": "DHB Assistance", "label": "Assistance", "dossier": "particuliers", "prod": "https://www.dhb-assistance.fr/",
                   "pour": "Particuliers"},
}

FONTS = {
    "groupe": "family=Inter:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,500;6..72,600",
    "pro": "family=Inter:wght@400;500;600;700;800",
    "assistance": "family=Inter:wght@400;500;600;700&family=Nunito:wght@700;800",
}

ICONES = {
    "phone": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.5-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z"/></svg>',
    "mail": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    "pin": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" aria-hidden="true"><path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    "arrow": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    "check": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="18" height="18" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
}


def root(depth):
    return "../" * depth if depth else ""


def lien_site(cle, depth):
    """Adresse d'accueil d'un autre site DHB."""
    if os.environ.get("DHB_LIENS") == "prod":
        return SITES[cle]["prod"]
    return f"{root(depth)}../{SITES[cle]['dossier']}/"


def head_assets(site, depth, theme_color="#FFFFFF"):
    r = root(depth)
    return f"""<meta name="theme-color" content="{theme_color}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?{FONTS[site]}&display=swap">
<link rel="stylesheet" href="{r}assets/css/style.css">
<link rel="icon" href="{r}assets/img/favicon.svg" type="image/svg+xml">"""


def brandbar(site, depth, phone_display=None, phone_link=None):
    liens = []
    for cle in ("groupe", "pro", "assistance"):
        s = SITES[cle]
        cur = ' aria-current="page"' if cle == site else ""
        href = f"{root(depth)}" if cle == site else lien_site(cle, depth)
        liens.append(f'<a href="{href}"{cur}>{s["nom"]}<span>{s["pour"]}</span></a>')
    tel = (f'<a class="brandbar-tel" href="tel:{phone_link}">{ICONES["phone"]}<span>{phone_display}</span></a>'
           if phone_display else "")
    return f"""<div class="brandbar"><div class="wrap brandbar-inner">
  <nav aria-label="Sites du groupe DHB">{''.join(liens)}</nav>
  {tel}
</div></div>"""


def logo(site, depth):
    href = root(depth) or "./"
    return (f'<a class="logo" href="{href}" aria-label="{SITES[site]["nom"]} — accueil">'
            f'<span class="logo-mark">DHB</span><span class="logo-label">{SITES[site]["label"]}</span></a>')


def header(site, depth, nav_html, mobile_html, cta_label, cta_href, phone_display=None, phone_link=None):
    tel = (f'<a class="header-tel" href="tel:{phone_link}">{ICONES["phone"]}<span>{phone_display}</span></a>'
           if (phone_display and site == "assistance") else "")
    return f"""<a class="skip-link" href="#contenu">Aller au contenu</a>
{brandbar(site, depth, phone_display, phone_link)}
<header class="site-header">
  <div class="wrap header-inner">
    {logo(site, depth)}
    {nav_html}
    <div class="header-cta">{tel}<a class="btn btn--primary" href="{cta_href}">{cta_label}</a></div>
    <button class="burger" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="mobile-nav"><span></span><span></span><span></span></button>
  </div>
</header>
<div class="mobile-nav" id="mobile-nav">{mobile_html}</div>
<div class="dhb-annonce" data-setting="annonce" hidden></div>"""


def footer(site, depth, description, colonnes, contact, legal_extra=""):
    """colonnes : liste de (titre, [(href, libellé), …]). contact : dict phone_display, phone_link, email."""
    cols = ""
    for titre, liens in colonnes:
        items = "".join(f'<a href="{h}">{l}</a>' for h, l in liens)
        cols += f'<div class="footer-col"><h4>{titre}</h4>{items}</div>'
    autres = " · ".join(
        f'<a href="{lien_site(c, depth)}">{SITES[c]["nom"]}</a>' for c in ("groupe", "pro", "assistance") if c != site)
    return f"""<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-brand">
        <span class="logo logo--footer"><span class="logo-mark">DHB</span><span class="logo-label">{SITES[site]['label']}</span></span>
        <p>{description}</p>
        <p class="footer-contact">
          <a href="tel:{contact['phone_link']}">{ICONES['phone']} {contact['phone_display']}</a>
          <a href="mailto:{contact['email']}">{ICONES['mail']} {contact['email']}</a>
          <span>{ICONES['pin']} Sur site en Île-de-France · à distance partout en France</span>
        </p>
      </div>
      {cols}
    </div>
    <div class="footer-bottom">
      <span>© 2026 {SITES[site]['nom']} <span class="a-completer">[SIRET, forme juridique : À COMPLÉTER PAR LE PROPRIÉTAIRE]</span>{legal_extra}</span>
      <span><a href="#" data-cookie-reset>Gérer mes cookies</a> · Le groupe DHB : {autres}</span>
    </div>
  </div>
</footer>"""


def barre_mobile(phone_display, phone_link, cta_label, cta_href):
    return f"""<div class="mobile-actions" role="navigation" aria-label="Actions rapides">
  <a class="btn btn--outline" href="tel:{phone_link}">{ICONES['phone']} Appeler</a>
  <a class="btn btn--primary" href="{cta_href}">{cta_label}</a>
</div>"""


def cookies():
    return """<div class="cookie-banner" role="dialog" aria-live="polite" aria-label="Gestion des cookies">
  <p><strong>Vos données, votre choix.</strong> Ce site utilise les cookies nécessaires à son fonctionnement et, avec votre accord, une mesure d'audience. Refuser est aussi simple qu'accepter.</p>
  <div class="cookie-actions">
    <button class="btn btn--outline btn--sm" data-cookie="refuse">Refuser</button>
    <button class="btn btn--primary btn--sm" data-cookie="accept">Accepter</button>
  </div>
</div>"""


def scripts(depth, extra=""):
    r = root(depth)
    return f"""<script src="{r}assets/js/supabase-config.js"></script>
<script src="{r}assets/js/suivi.js" defer></script>
<script src="{r}assets/js/main.js" defer></script>
{extra}"""
