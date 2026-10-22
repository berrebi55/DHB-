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
               "pour": "Le groupe",
               "accroche": "Services informatiques pour les entreprises et les particuliers"},
    "pro": {"nom": "DHB Pro", "label": "Pro", "dossier": "infogerance", "prod": "https://pro.dhb-groupe.fr/",
            "pour": "Entreprises",
            "accroche": "Infogérance, maintenance & cybersécurité pour les entreprises"},
    "assistance": {"nom": "DHB Assistance", "label": "Assistance", "dossier": "particuliers", "prod": "https://www.dhb-assistance.fr/",
                   "pour": "Particuliers",
                   "accroche": "Assistance & dépannage informatique pour les particuliers"},
}

# Polices hébergées sur chaque site (assets/fonts/, licence SIL OFL 1.1, paquets
# Fontsource) : aucune requête vers Google, donc ni blocage ni transfert d'IP.
# (famille CSS, fichier, graisses couvertes par la police variable)
POLICES = {
    "groupe": [("Inter", "inter-latin-wght-normal.woff2", "100 900"),
               ("Newsreader", "newsreader-latin-wght-normal.woff2", "200 800")],
    "pro": [("Inter", "inter-latin-wght-normal.woff2", "100 900")],
    "assistance": [("Inter", "inter-latin-wght-normal.woff2", "100 900"),
                   ("Nunito", "nunito-latin-wght-normal.woff2", "200 1000")],
}
# Jeu « latin » de Fontsource (français complet : accents, œ, « », €, …).
PLAGE_LATIN = ("U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,"
               "U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD")

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
    faces = "".join(
        f"@font-face{{font-family:'{fam}';font-style:normal;font-display:swap;font-weight:{poids};"
        f"src:url({r}assets/fonts/{fichier}) format('woff2');unicode-range:{PLAGE_LATIN}}}"
        for fam, fichier, poids in POLICES[site])
    return f"""<meta name="theme-color" content="{theme_color}">
<link rel="preload" href="{r}assets/fonts/{POLICES[site][0][1]}" as="font" type="font/woff2" crossorigin>
<style>{faces}</style>
<link rel="stylesheet" href="{r}assets/css/style.css">
<link rel="icon" href="{r}assets/img/favicon.svg" type="image/svg+xml">"""


# --- Référencement (communs aux 3 sites) --------------------------------------
TITRE_MAX = 60        # au-delà, Google coupe le titre dans ses résultats
DESCRIPTION_MAX = 160


def _couper_mots(texte, limite):
    """Coupe à la dernière fin de mot ≤ limite (sans « … »)."""
    if len(texte) <= limite:
        return texte
    t = texte[:limite + 1]
    return t[:t.rfind(" ")].rstrip(" ,;:—-") if " " in t else texte[:limite]


def titre_seo(titre):
    """Raccourcit un titre trop long sans rien inventer ni couper une phrase :
    du plus complet au plus court, on essaie le titre sans la marque
    (« | DHB… »), sans les précisions entre parenthèses, sans le complément
    après « — », puis sans la fin après « : » ou « , ». Si rien ne tient en
    60 caractères, on garde la phrase entière (à réécrire par le propriétaire).
    Le titre complet reste dans la page (h1, og:title)."""
    if len(titre) <= TITRE_MAX:
        return titre
    principal, marque_ = titre, ""
    marques = {s["nom"] for s in SITES.values()} | {"DHB"}
    for sep in (" | ", " — "):
        avant, _, apres = titre.rpartition(sep)
        if avant and apres in marques:
            principal, marque_ = avant, " | " + apres
            break
    import re
    sans_paren = re.sub(r"\s*\([^)]*\)", "", principal).strip()
    candidats = [principal, sans_paren]
    for c in (principal, sans_paren):
        if " — " in c:
            candidats.append(c.split(" — ")[0])
    for c in list(candidats):
        for sep in (" : ", ", "):
            if sep in c:
                candidats.append(c.split(sep)[0])
    for c in candidats:
        c = c.strip()
        if len(c) < 20:          # trop court pour décrire la page
            continue
        if len(c + marque_) <= TITRE_MAX:
            return c + marque_
        if len(c) <= TITRE_MAX:
            return c
    # Rien ne tient : la question seule, sans complément générique (« — causes et solutions »).
    question = sans_paren.split(" — ")[0].strip()
    return question if len(question) >= 20 else sans_paren


def description_seo(texte):
    """≤ 160 caractères : phrase(s) entière(s) si possible, sinon fin de mot + « … »."""
    texte = " ".join(texte.split())
    if len(texte) <= DESCRIPTION_MAX:
        return texte
    debut = texte[:DESCRIPTION_MAX]
    fin = max(debut.rfind(". "), debut.rfind(" ! "), debut.rfind(" ? "))
    if fin >= 70:
        return debut[:fin + 1].rstrip()
    return _couper_mots(texte, DESCRIPTION_MAX - 1) + "…"


def balises_partage(site, domaine, titre, description, canonical, og_type="website", indexable=True):
    """<title>, description, canonical, robots, Open Graph et carte Twitter/X.
    Page non indexable (404, retour de paiement) : noindex et pas de canonical.
    L'image og.png est produite par build/og/generer_og.mjs (mêmes accroches)."""
    import html as _h
    from titres_courts import TITRES_COURTS  # titres courts proposés au propriétaire (lot 14)
    t, d = TITRES_COURTS.get(canonical) or titre_seo(titre), description_seo(description)
    e = lambda s: _h.escape(s, quote=True).replace("&#x27;", "'")
    lignes = [f"<title>{e(t)}</title>", f'<meta name="description" content="{e(d)}">']
    if indexable:
        lignes += [f'<link rel="canonical" href="{canonical}">', '<meta name="robots" content="index, follow">']
    else:
        lignes += ['<meta name="robots" content="noindex, follow">']
        if canonical.endswith("/404.html"):
            # Servie à n'importe quelle adresse : ses liens relatifs partent de la racine.
            lignes.append('<base href="/">')
    image = f"{domaine}/assets/img/og.png"
    lignes += [
        f'<meta property="og:type" content="{og_type}">',
        f'<meta property="og:title" content="{e(titre)}">',
        f'<meta property="og:description" content="{e(d)}">',
        f'<meta property="og:url" content="{canonical}">',
        f'<meta property="og:image" content="{image}">',
        '<meta property="og:image:type" content="image/png">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        f'<meta property="og:image:alt" content="{e(SITES[site]["nom"])} — {e(SITES[site]["accroche"])}">',
        '<meta property="og:locale" content="fr_FR">',
        f'<meta property="og:site_name" content="{e(SITES[site]["nom"])}">',
        '<meta name="twitter:card" content="summary_large_image">',
    ]
    return "\n".join(lignes)


def voisins(liste, element, n=4):
    """Les n éléments qui suivent `element` dans `liste`, en boucle : chaque fiche
    d'une catégorie reçoit ainsi des liens de ses voisines (et pas seulement les
    premières de la liste)."""
    i = liste.index(element)
    return [liste[(i + k) % len(liste)] for k in range(1, min(n, len(liste) - 1) + 1)]


def fiches_liees(categorie, toutes, element, n=4):
    """Fiches à proposer en bas de page : les voisines de la même catégorie,
    complétées si besoin par les voisines toutes catégories confondues.
    Renvoie (fiches, toutes_de_la_meme_categorie)."""
    liees = voisins(categorie, element, n)
    if len(liees) < n:
        liees += [x for x in voisins(toutes, element, len(toutes)) if x not in liees][:n - len(liees)]
    return liees, all(x in categorie for x in liees)


def fil_ariane(domaine, depth, etapes, page_courante=None):
    """Fil d'Ariane visible + données structurées BreadcrumbList.
    etapes : [(chemin_relatif_ou_None, libellé), …] après « Accueil ».
    page_courante : titre de la page quand le dernier libellé visible n'est pas
    la page elle-même (ex. une catégorie sans page propre) ; pour Google, le
    dernier élément du fil est toujours la page affichée."""
    import json
    r = root(depth)
    parts = [f'<a href="{r or "./"}">Accueil</a>']
    elements = [{"name": "Accueil", "item": domaine + "/"}]
    for chemin, libelle in etapes:
        parts.append("<span>/</span>")
        parts.append(f'<a href="{r}{chemin}">{libelle}</a>' if chemin else libelle)
        if chemin:
            elements.append({"name": libelle, "item": f"{domaine}/{chemin}"})
        elif not page_courante:
            elements.append({"name": libelle})
    if page_courante:
        elements.append({"name": page_courante})
    donnees = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i, **el} for i, el in enumerate(elements, start=1)]}
    return (f'<div class="breadcrumb">{" ".join(parts)}</div>'
            f'<script type="application/ld+json">{json.dumps(donnees, ensure_ascii=False)}</script>')


def ecrire_site(dossier, domaine, pages, priorite, exclus=()):
    """Écrit les pages puis sitemap.xml. La date « lastmod » d'une page ne change
    que si son contenu change (sinon Google finit par ignorer ces dates).
    priorite(chemin_url) -> "0.3".."1.0" ; exclus : pages hors sitemap (404, paiement)."""
    import datetime, re
    aujourd_hui = datetime.date.today().isoformat()
    ancien = {}
    chemin_sm = os.path.join(dossier, "sitemap.xml")
    if os.path.exists(chemin_sm):
        for loc, date in re.findall(r"<loc>(.*?)</loc><lastmod>(.*?)</lastmod>", open(chemin_sm, encoding="utf-8").read()):
            ancien[loc] = date
    urls = []
    for rel, contenu in pages.items():
        p = os.path.join(dossier, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        inchange = os.path.exists(p) and open(p, encoding="utf-8").read() == contenu
        if not inchange:
            with open(p, "w", encoding="utf-8", newline="\n") as f:
                f.write(contenu)
        if rel in exclus:
            continue
        chemin = "" if rel == "index.html" else (rel[:-len("index.html")] if rel.endswith("index.html") else rel)
        loc = f"{domaine}/{chemin}"
        urls.append((loc, priorite(chemin), ancien.get(loc, aujourd_hui) if inchange else aujourd_hui))
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, prio, date in sorted(urls, key=lambda x: (-float(x[1]), x[0])):
        sm.append(f"  <url><loc>{loc}</loc><lastmod>{date}</lastmod><changefreq>monthly</changefreq><priority>{prio}</priority></url>")
    sm.append("</urlset>")
    with open(chemin_sm, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(sm) + "\n")
    return len(urls)


def brandbar(site, depth, phone_display=None, phone_link=None):
    liens = []
    for cle in ("groupe", "pro", "assistance"):
        s = SITES[cle]
        cur = ' aria-current="page"' if cle == site else ""
        href = f"{root(depth)}" if cle == site else lien_site(cle, depth)
        liens.append(f'<a href="{href}"{cur}>{s["nom"]}<span>{s["pour"]}</span></a>')
    # aria-label : sur mobile le numéro est masqué, le lien garde un nom lisible.
    tel = (f'<a class="brandbar-tel" href="tel:{phone_link}" aria-label="Appeler le {phone_display}">{ICONES["phone"]}<span>{phone_display}</span></a>'
           if phone_display else "")
    return f"""<div class="brandbar" role="region" aria-label="Groupe DHB"><div class="wrap brandbar-inner">
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
        cols += f'<div class="footer-col"><h2>{titre}</h2>{items}</div>'
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
