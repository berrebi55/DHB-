# -*- coding: utf-8 -*-
"""Générateur du site DHB GROUPE (vitrine chapeau). Sortie : sites/groupe/.
SEO propre à son domaine (balises, JSON-LD Organization + filiales, sitemap/robots).
Exécuter : python3 build/groupe/build_groupe.py
"""
import os, json, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(REPO, "sites", "groupe")

# --- Constantes (valeurs d'EXEMPLE à remplacer) ---
NAME = "DHB Groupe"
SIGN = "Le groupe DHB — infogérance & assistance informatique"
DOMAIN = "https://www.dhb-groupe.fr"      # [EXEMPLE]
PHONE_D = "01 23 45 67 89"                 # [EXEMPLE]
PHONE_L = "+33123456789"                   # [EXEMPLE]
EMAIL = "contact@dhb-groupe.fr"            # [EXEMPLE]
YEAR = 2026

# Filiales. base = chemin relatif à la RACINE du site groupe.
FILIALES = [
    {"slug": "infogerance", "nom": "DHB Infogérance", "baseline": "Pour les entreprises",
     "desc": "Maintenance, dépannage et sécurité informatique pour les entreprises. Sur site en Île-de-France, à distance partout en France.",
     "base": "../infogerance/", "url_prod": "https://pro.dhb-groupe.fr", "actif": True, "accent": "#2EC4FF",
     "points": ["Infogérance & maintenance de parc", "Cybersécurité & sauvegarde", "Support sur site (IdF) et à distance (France)"]},
    {"slug": "particuliers", "nom": "DHB Particuliers", "baseline": "Pour les particuliers",
     "desc": "Assistance informatique à domicile et à distance pour les particuliers : abonnement sérénité ou intervention ponctuelle.",
     "base": "particuliers/", "url_prod": "https://aide.dhb-groupe.fr", "actif": False, "accent": "#16a34a",
     "points": ["Dépannage à domicile et à distance", "Abonnement assistance illimitée", "Intervention ponctuelle sans engagement"]},
]

IC = {
    "shield": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="26" height="26"><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z"/><path d="m9 12 2 2 4-4"/></svg>',
    "building": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="26" height="26"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h6"/></svg>',
    "home": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="26" height="26"><path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>',
    "phone": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.5-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z"/></svg>',
    "check": '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
}


def org_jsonld():
    data = {"@context": "https://schema.org", "@type": "Organization",
            "name": NAME, "url": DOMAIN + "/", "description": SIGN, "email": EMAIL, "telephone": PHONE_L,
            "subOrganization": [{"@type": "Organization", "name": f["nom"], "url": f["url_prod"], "description": f["desc"]} for f in FILIALES]}
    return '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False) + '</script>'


def page(depth, slug_path, title, desc, body, extra=""):
    R = "../" * depth
    home = R if R else "./"
    canonical = DOMAIN + "/" + slug_path
    fil_nav = "".join(f'<a href="{R}{f["base"]}">{f["nom"]}<span>{f["baseline"]}</span></a>' for f in FILIALES)
    fil_mob = "".join(f'<a href="{R}{f["base"]}">{f["nom"]}</a>' for f in FILIALES)
    fil_foot = "".join(f'<a href="{R}{f["base"]}">{f["nom"]}</a>' for f in FILIALES)
    return f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{canonical}">
<meta name="robots" content="index, follow">
<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{canonical}">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="{NAME}">
<meta name="theme-color" content="#0B2A4A">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap">
<link rel="stylesheet" href="{R}assets/css/style.css">
<link rel="icon" href="{R}assets/img/favicon.svg" type="image/svg+xml">
{extra}
</head>
<body>
<a class="skip-link" href="#contenu">Aller au contenu</a>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="logo" href="{home}" aria-label="{NAME}">
      <span class="logo__mark">D<b>H</b>B <span style="font-size:.8rem;font-weight:700;color:var(--gris-600)">Groupe</span></span>
      <span class="logo__tag">{SIGN}</span>
    </a>
    <nav class="nav" aria-label="Navigation principale">
      <a class="nav-link" href="{home}">Accueil</a>
      <div class="nav-item"><a class="nav-link" href="{home}#filiales">Nos filiales ▾</a><div class="dropdown">{fil_nav}</div></div>
      <a class="nav-link" href="{R}le-groupe/">Le groupe</a>
      <a class="nav-link" href="{R}contact/">Contact</a>
    </nav>
    <div class="header-cta"><a class="btn btn--primary" href="{R}contact/">Nous contacter</a></div>
    <button class="burger" aria-label="Menu" aria-expanded="false" aria-controls="mnav"><span></span><span></span><span></span></button>
  </div>
</header>
<div class="mobile-nav" id="mnav">
  <a href="{home}">Accueil</a>
  {fil_mob}
  <a href="{R}le-groupe/">Le groupe</a>
  <a href="{R}contact/">Contact</a>
  <a class="btn btn--primary btn--block" href="{R}contact/">Nous contacter</a>
</div>
<main id="contenu">
{body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-contact">
        <span class="logo__mark" style="color:#fff">D<b>H</b>B Groupe</span>
        <p>{SIGN}.</p>
        <p>☎ <a href="tel:{PHONE_L}">{PHONE_D}</a><br>✉ <a href="mailto:{EMAIL}">{EMAIL}</a></p>
      </div>
      <div><h4>Nos filiales</h4>{fil_foot}</div>
      <div><h4>Le groupe</h4><a href="{R}le-groupe/">Qui sommes-nous</a><a href="{R}contact/">Contact</a></div>
      <div><h4>Légal</h4><a href="{R}mentions-legales/">Mentions légales</a><a href="{R}politique-confidentialite/">Confidentialité</a></div>
    </div>
    <div class="footer-bottom"><span>© {YEAR} {NAME}. <span class="a-completer">[SIRET : À COMPLÉTER]</span></span></div>
  </div>
</footer>
<div class="cookie-banner" role="dialog" aria-label="Cookies">
  <div class="cookie-inner">
    <p><strong>🍪 Respect de votre vie privée.</strong> Cookies nécessaires au site et, avec votre accord, de mesure d'audience. Refus aussi simple qu'acceptation.</p>
    <div class="cookie-actions"><button class="btn btn--outline" data-cookie="refuse">Refuser</button><button class="btn btn--primary" data-cookie="accept">Tout accepter</button></div>
  </div>
</div>
<script src="{R}assets/js/supabase-config.js"></script>
<script src="{R}assets/js/main.js" defer></script>
</body>
</html>"""


def home():
    R = ""
    fcards = ""
    for f in FILIALES:
        href = R + f["base"]
        badge = "" if f["actif"] else '<span class="a-completer" style="margin-left:8px">Bientôt</span>'
        pts = "".join(f"<li>{p}</li>" for p in f["points"])
        ic = IC["building"] if f["slug"] == "infogerance" else IC["home"]
        fcards += f"""
        <div class="card reveal" style="border-top:4px solid {f['accent']}">
          <div class="icon-box" style="background:linear-gradient(145deg,{f['accent']},#0B2A4A)">{ic}</div>
          <h3>{f['nom']} {badge}</h3>
          <p style="font-weight:700;color:{f['accent']};margin-bottom:6px">{f['baseline']}</p>
          <p>{f['desc']}</p>
          <ul class="check-list">{pts}</ul>
          <a class="btn btn--dark" href="{href}" style="margin-top:14px">{'Visiter le site' if f['actif'] else 'Découvrir'}</a>
        </div>"""
    body = f"""
<section class="hero">
  <div class="wrap hero-inner">
    <div class="reveal">
      <h1>Le groupe DHB : votre informatique entre de bonnes mains.</h1>
      <p class="lead">Un groupe à taille humaine qui réunit des services informatiques experts — pour les entreprises comme pour les particuliers. Proximité, clarté et engagement, partout en France.</p>
      <ul class="reassurance">
        <li>{IC['check']} Entreprises & particuliers</li>
        <li>{IC['check']} Sur site en Île-de-France</li>
        <li>{IC['check']} À distance partout en France</li>
      </ul>
      <div class="hero-cta">
        <a class="btn btn--primary btn--lg" href="#filiales">Découvrir nos filiales</a>
        <a class="btn btn--ghost btn--lg" href="contact/">{IC['phone']} Nous contacter</a>
      </div>
    </div>
    <div class="hero-visual reveal" aria-hidden="true">
      <h3>{IC['shield']} Le groupe DHB</h3>
      <div class="status-row"><span>DHB Infogérance</span><span class="badge-ok"><span class="dot"></span>Entreprises</span></div>
      <div class="status-row"><span>DHB Particuliers</span><span class="badge-watch"><span class="dot"></span>Particuliers</span></div>
      <div class="status-row"><span>Un interlocuteur unique</span><span class="badge-ok"><span class="dot"></span>Toujours</span></div>
      <p style="color:#9fb6cd;font-size:.8rem;margin:16px 0 0">Des structures spécialisées, une même exigence de service.</p>
    </div>
  </div>
</section>

<section class="section" id="filiales">
  <div class="wrap">
    <div class="center" style="max-width:720px;margin:0 auto 46px">
      <span class="eyebrow">Nos filiales</span>
      <h2>Une expertise adaptée à chaque besoin</h2>
      <p class="lead">Le groupe DHB regroupe des structures spécialisées pour servir au mieux chaque public, avec la même exigence de proximité et de clarté.</p>
    </div>
    <div class="grid grid-2">{fcards}</div>
  </div>
</section>

<section class="section section--nuit">
  <div class="wrap">
    <div class="center" style="max-width:720px;margin:0 auto 46px">
      <span class="eyebrow">Pourquoi un groupe</span>
      <h2>La force d'un réseau, la proximité d'un artisan</h2>
    </div>
    <div class="grid grid-3">
      <div class="card reveal"><h3>Un interlocuteur unique</h3><p>Quelle que soit votre demande, vous parlez à quelqu'un qui vous connaît et vous oriente vers la bonne expertise.</p></div>
      <div class="card reveal"><h3>Des experts spécialisés</h3><p>Chaque filiale maîtrise son domaine : entreprises, particuliers. Vous bénéficiez du bon savoir-faire, au bon moment.</p></div>
      <div class="card reveal"><h3>Transparence totale</h3><p>Pas de jargon, pas de prix caché. Des engagements clairs, dans toutes nos structures.</p></div>
    </div>
  </div>
</section>

<section class="section"><div class="wrap"><div class="cta-band reveal">
  <h2>Une question, un projet informatique ?</h2>
  <p>Dites-nous ce dont vous avez besoin : nous vous orientons vers la bonne filiale et le bon interlocuteur, sous 24h ouvrées.</p>
  <div class="hero-cta"><a class="btn btn--primary btn--lg" href="contact/">Nous contacter</a><a class="btn btn--ghost btn--lg" href="tel:{PHONE_L}">{IC['phone']} {PHONE_D}</a></div>
</div></div></section>
{org_jsonld()}
"""
    return page(0, "", f"{NAME} — infogérance & assistance informatique (entreprises & particuliers)",
                "Le groupe DHB réunit des services informatiques experts pour les entreprises (infogérance) et les particuliers (assistance). Sur site en Île-de-France, à distance partout en France.", body)


def filiale_particuliers():
    f = FILIALES[1]
    body = f"""
<section class="page-hero"><div class="wrap">
  <div class="breadcrumb"><a href="../">Accueil</a> <span>/</span> {f['nom']}</div>
  <span class="eyebrow">{f['baseline']}</span>
  <h1>DHB Particuliers — l'assistance informatique à domicile et à distance</h1>
  <p>Ordinateur lent, virus, box internet, imprimante, sauvegarde de vos photos, aide pour vos démarches en ligne… DHB Particuliers vous dépanne et vous accompagne, sans jargon, chez vous ou à distance.</p>
  <div class="hero-cta"><a class="btn btn--primary btn--lg" href="../contact/">Être aidé(e)</a><a class="btn btn--ghost btn--lg" href="tel:{PHONE_L}">{IC['phone']} {PHONE_D}</a></div>
</div></section>
<section class="section"><div class="wrap">
  <div class="center" style="max-width:720px;margin:0 auto 40px">
    <span class="eyebrow">Deux façons d'être aidé</span>
    <h2>Abonnement sérénité ou intervention ponctuelle</h2>
    <p class="lead">Choisissez la formule qui vous convient. Sans engagement caché, avec un interlocuteur qui prend le temps de vous expliquer.</p>
  </div>
  <div class="grid grid-2">
    <div class="card reveal" style="border-top:4px solid {f['accent']}">
      <h3>Abonnement sérénité</h3>
      <p>Une assistance informatique disponible toute l'année, pour ne plus jamais rester bloqué(e). Idéal pour être tranquille au quotidien.</p>
      <ul class="check-list"><li>Assistance à distance illimitée</li><li>Interventions à domicile incluses ou à tarif réduit</li><li>Conseils, mises à jour et sécurité</li></ul>
      <div class="price-tag">À partir de <span class="a-completer">[MONTANT]</span> €<small>/mois</small></div>
      <a class="btn btn--primary btn--block" href="../contact/" style="margin-top:6px">Je m'abonne</a>
    </div>
    <div class="card reveal" style="border-top:4px solid {f['accent']}">
      <h3>Intervention ponctuelle</h3>
      <p>Un problème précis à régler, sans engagement. On intervient à domicile (Île-de-France) ou à distance (partout en France).</p>
      <ul class="check-list"><li>Dépannage à l'unité</li><li>Sans abonnement</li><li>Devis clair avant toute intervention</li></ul>
      <div class="price-tag">À partir de <span class="a-completer">[MONTANT]</span> €</div>
      <a class="btn btn--dark btn--block" href="../contact/" style="margin-top:6px">Être aidé(e) maintenant</a>
    </div>
  </div>
  <p class="center muted" style="max-width:720px;margin:20px auto 0;color:var(--gris-600);font-size:.92rem">Tarif exact confirmé avant toute intervention, sans surprise. <span class="a-completer">[À COMPLÉTER : montants des formules + mise en place du paiement en ligne.]</span></p>
</div></section>
{org_jsonld()}
"""
    return page(1, "particuliers/", "DHB Particuliers — assistance & dépannage informatique à domicile et à distance",
                "DHB Particuliers : assistance et dépannage informatique pour les particuliers, à domicile (Île-de-France) et à distance (France). Abonnement sérénité ou intervention ponctuelle.", body)


def le_groupe():
    body = f"""
<section class="page-hero"><div class="wrap">
  <div class="breadcrumb"><a href="../">Accueil</a> <span>/</span> Le groupe</div>
  <span class="eyebrow">Qui sommes-nous</span>
  <h1>Le groupe DHB</h1>
  <p>Un groupe récent et ambitieux, construit autour d'une conviction simple : l'informatique doit être un service clair, humain et fiable — pour tous.</p>
</div></section>
<section class="section"><div class="wrap"><div class="article-body" style="max-width:820px">
  <h2>Notre raison d'être</h2>
  <p>Le groupe DHB rassemble des structures spécialisées dans les services informatiques. Notre mission : rendre l'informatique simple et sereine, que vous soyez une entreprise qui veut un parc fiable et sécurisé, ou un particulier qui a besoin d'aide à la maison.</p>
  <h2>Nos filiales</h2>
  <p><strong><a href="../../infogerance/">DHB Infogérance</a></strong> accompagne les entreprises : maintenance, dépannage, cybersécurité, sauvegarde et infogérance globale, sur site en Île-de-France et à distance partout en France.</p>
  <p><strong><a href="../particuliers/">DHB Particuliers</a></strong> aide les particuliers au quotidien : dépannage, assistance et conseils, en abonnement ou à l'intervention.</p>
  <h2>Nos valeurs</h2>
  <ul><li><strong>Proximité</strong> : un interlocuteur qui vous connaît.</li><li><strong>Clarté</strong> : des explications simples, jamais de jargon.</li><li><strong>Transparence</strong> : des engagements, pas de prix cachés.</li></ul>
  <p class="a-completer">[À COMPLÉTER PAR LE PROPRIÉTAIRE : histoire du groupe, fondateur(s), forme juridique, date de création.]</p>
</div></div></section>
{org_jsonld()}
"""
    return page(1, "le-groupe/", f"Le groupe DHB — qui sommes-nous | {NAME}",
                "Découvrez le groupe DHB : un groupe de services informatiques à taille humaine réunissant DHB Infogérance (entreprises) et DHB Particuliers.", body)


def contact():
    body = f"""
<section class="page-hero"><div class="wrap">
  <div class="breadcrumb"><a href="../">Accueil</a> <span>/</span> Contact</div>
  <span class="eyebrow">Contact</span>
  <h1>Contacter le groupe DHB</h1>
  <p>Une question, un projet ? Écrivez-nous : nous vous orientons vers la bonne filiale et le bon interlocuteur, sous 24h ouvrées.</p>
</div></section>
<section class="section"><div class="wrap"><div class="grid grid-2" style="gap:48px;align-items:start">
  <div class="reveal">
    <h2>Nos coordonnées</h2>
    <p>☎ <a href="tel:{PHONE_L}"><strong>{PHONE_D}</strong></a> <span class="a-completer">[EXEMPLE]</span></p>
    <p>✉ <a href="mailto:{EMAIL}">{EMAIL}</a> <span class="a-completer">[EXEMPLE]</span></p>
    <p>📍 Sur site en Île-de-France · à distance partout en France.</p>
    <div class="card" style="margin-top:16px"><h3>Vous cherchez un service précis ?</h3>
      <p style="margin:0">Entreprises → <a href="../../infogerance/">DHB Infogérance</a><br>Particuliers → <a href="../particuliers/">DHB Particuliers</a></p></div>
  </div>
  <div class="reveal"><div class="form-card">
    <h3 class="mt-0">Nous écrire</h3>
    <p style="font-size:.95rem">Réponse sous 24h ouvrées · Sans engagement</p>
    <form data-demo-form data-type="question" novalidate>
      <div class="form-ok">✅ Merci ! Votre message a bien été reçu. Nous vous recontactons sous 24h ouvrées.</div>
      <div class="form-row"><label for="n">Nom et prénom</label><input id="n" name="nom" required></div>
      <div class="form-grid">
        <div class="form-row"><label for="e">Email</label><input id="e" name="email" type="email" required></div>
        <div class="form-row"><label for="t">Téléphone</label><input id="t" name="telephone" type="tel"></div>
      </div>
      <div class="form-row"><label for="o">Vous êtes</label><select id="o" name="entreprise"><option>Une entreprise</option><option>Un particulier</option><option>Autre</option></select></div>
      <div class="form-row"><label for="m">Votre message</label><textarea id="m" name="message"></textarea></div>
      <div class="form-row consent"><input id="c" type="checkbox" required><label for="c" style="font-weight:500;margin:0">J'accepte d'être recontacté(e). Voir la <a href="../politique-confidentialite/">politique de confidentialité</a>.</label></div>
      <button class="btn btn--primary btn--lg btn--block" type="submit">Envoyer</button>
    </form>
  </div></div>
</div></div></section>
{org_jsonld()}
"""
    return page(1, "contact/", f"Contact — {NAME}",
                "Contactez le groupe DHB. Nous vous orientons vers la bonne filiale (entreprises ou particuliers), réponse sous 24h ouvrées.", body)


def legal(slug, title, h1, blocks):
    body = f"""
<section class="page-hero"><div class="wrap"><div class="breadcrumb"><a href="../">Accueil</a> <span>/</span> {h1}</div><h1>{h1}</h1></div></section>
<section class="section"><div class="wrap"><div class="article-body">{blocks}</div></div></section>
"""
    return page(1, slug, f"{title} | {NAME}", f"{h1} du site du groupe DHB.", body)


def build():
    pages = {
        "index.html": home(),
        "particuliers/index.html": filiale_particuliers(),
        "le-groupe/index.html": le_groupe(),
        "contact/index.html": contact(),
        "mentions-legales/index.html": legal("mentions-legales/", "Mentions légales", "Mentions légales",
            '<div class="callout">Modèle à compléter avant mise en ligne.</div>'
            f'<h2>Éditeur</h2><p>{NAME} — {SIGN}<br>Forme juridique, SIRET, siège : <span class="a-completer">[À COMPLÉTER]</span><br>Téléphone : {PHONE_D} — Email : {EMAIL}</p>'
            '<h2>Hébergement</h2><p class="a-completer">[À COMPLÉTER : hébergeur]</p>'
            '<h2>Données personnelles</h2><p>Voir la <a href="../politique-confidentialite/">politique de confidentialité</a>.</p>'),
        "politique-confidentialite/index.html": legal("politique-confidentialite/", "Politique de confidentialité", "Politique de confidentialité (RGPD)",
            '<p>Le groupe DHB collecte via le formulaire uniquement les informations nécessaires pour vous recontacter (nom, email, téléphone, message). Elles ne sont jamais revendues.</p>'
            '<h2>Vos droits</h2><p>Conformément au RGPD, vous disposez d\'un droit d\'accès, de rectification et de suppression. Contact : '
            f'<a href="mailto:{EMAIL}">{EMAIL}</a>.</p><p class="a-completer">[À COMPLÉTER : durées de conservation, mesure d\'audience.]</p>'),
    }
    for rel, html in pages.items():
        p = os.path.join(OUT, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, "w", encoding="utf-8").write(html)

    today = datetime.date.today().isoformat()
    urls = []
    for rel in pages:
        up = "" if rel == "index.html" else rel[:-len("index.html")]
        prio = "1.0" if up == "" else ("0.8" if up in ("particuliers/", "le-groupe/", "contact/") else "0.3")
        urls.append((DOMAIN + "/" + up, prio))
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, prio in sorted(urls, key=lambda x: -float(x[1])):
        sm.append(f"  <url><loc>{loc}</loc><lastmod>{today}</lastmod><changefreq>monthly</changefreq><priority>{prio}</priority></url>")
    sm.append("</urlset>")
    open(os.path.join(OUT, "sitemap.xml"), "w", encoding="utf-8").write("\n".join(sm) + "\n")
    open(os.path.join(OUT, "robots.txt"), "w", encoding="utf-8").write(f"User-agent: *\nAllow: /\n\nSitemap: {DOMAIN}/sitemap.xml\n")
    open(os.path.join(OUT, ".nojekyll"), "w").write("")
    print(f"Site GROUPE : {len(pages)} pages + sitemap + robots")


if __name__ == "__main__":
    build()
