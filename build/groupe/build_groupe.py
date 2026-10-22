# -*- coding: utf-8 -*-
"""Générateur du site DHB GROUPE (vitrine institutionnelle). Sortie : sites/groupe/.
SEO propre à son domaine (balises, JSON-LD Organization + filiales, sitemap/robots).
Exécuter : python3 build/groupe/build_groupe.py
"""
import os, sys, json, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(REPO, "sites", "groupe")
sys.path.insert(0, os.path.dirname(HERE))
import marque  # noqa: E402

# --- Constantes (valeurs d'EXEMPLE à remplacer) ---
NAME = "DHB Groupe"
SIGN = "Le groupe DHB — services informatiques pour les entreprises et les particuliers"
DOMAIN = "https://www.dhb-groupe.fr"      # [EXEMPLE]
PHONE_D = "01 23 45 67 89"                 # [EXEMPLE]
PHONE_L = "+33123456789"                   # [EXEMPLE]
EMAIL = "contact@dhb-groupe.fr"            # [EXEMPLE]
YEAR = 2026
CHECK = marque.ICONES["check"]
ARROW = marque.ICONES["arrow"]

ACTIVITES = [
    {"cle": "pro", "nom": "DHB Pro", "pour": "Pour les entreprises",
     "desc": "Infogérance, maintenance, cybersécurité et sauvegarde pour les TPE, PME, cabinets, commerces et associations. Devis sur mesure.",
     "points": ["Maintenance et supervision du parc", "Cybersécurité et sauvegarde", "Support sur site (Île-de-France) et à distance"],
     "cta": "Découvrir DHB Pro", "url_prod": "https://pro.dhb-groupe.fr"},
    {"cle": "assistance", "nom": "DHB Assistance", "pour": "Pour les particuliers",
     "desc": "Dépannage et accompagnement informatique à domicile et à distance, avec des tarifs clairs annoncés à l'avance.",
     "points": ["Ordinateur, Internet, smartphone, imprimante", "Abonnement sérénité ou intervention ponctuelle", "Patience et pédagogie, aussi pour vos proches"],
     "cta": "Découvrir DHB Assistance", "url_prod": "https://www.dhb-assistance.fr"},
]

IC = {
    "building": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="24" height="24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h6"/></svg>',
    "home": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="24" height="24" aria-hidden="true"><path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>',
}


def org_jsonld():
    data = {"@context": "https://schema.org", "@type": "Organization",
            "name": NAME, "url": DOMAIN + "/", "description": SIGN, "email": EMAIL, "telephone": PHONE_L,
            "subOrganization": [{"@type": "Organization", "name": a["nom"], "url": a["url_prod"], "description": a["desc"]} for a in ACTIVITES]}
    return '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False) + '</script>'


def page(depth, slug_path, title, desc, body, extra=""):
    R = "../" * depth
    canonical = DOMAIN + "/" + slug_path
    nav = f"""
    <nav class="nav" aria-label="Navigation principale">
      <div class="nav-item"><a class="nav-link" href="{R or './'}#activites">Nos activités</a>
        <div class="dropdown">{''.join(f'<a href="{marque.lien_site(a["cle"], depth)}">{a["nom"]}<span>{a["pour"]}</span></a>' for a in ACTIVITES)}</div>
      </div>
      <a class="nav-link" href="{R}le-groupe/">Le groupe</a>
      <a class="nav-link" href="{R}contact/">Contact</a>
    </nav>"""
    mobile = (f'<a href="{R or "./"}#activites">Nos activités</a>'
              + "".join(f'<a href="{marque.lien_site(a["cle"], depth)}">{a["nom"]} — {a["pour"].lower()}</a>' for a in ACTIVITES)
              + f'<a href="{R}le-groupe/">Le groupe</a><a href="{R}contact/">Contact</a>'
              + f'<a class="btn btn--primary btn--block" href="{R}contact/">Nous contacter</a>')
    colonnes = [
        ("Nos activités", [(marque.lien_site(a["cle"], depth), a["nom"]) for a in ACTIVITES]),
        ("Le groupe", [(f"{R}le-groupe/", "Qui sommes-nous"), (f"{R}contact/", "Contact")]),
        ("Informations", [(f"{R}mentions-legales/", "Mentions légales"), (f"{R}politique-confidentialite/", "Confidentialité (RGPD)")]),
    ]
    contact = {"phone_display": PHONE_D, "phone_link": PHONE_L, "email": EMAIL}
    return f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
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
{marque.head_assets("groupe", depth)}
{extra}
</head>
<body data-site="groupe">
{marque.header("groupe", depth, nav, mobile, "Nous contacter", f"{R}contact/", PHONE_D, PHONE_L)}
<main id="contenu">
{body}
</main>
{marque.footer("groupe", depth, "Le groupe DHB réunit deux activités de services informatiques, l'une dédiée aux entreprises, l'autre aux particuliers, avec la même exigence de proximité et de clarté.", colonnes, contact)}
{marque.barre_mobile(PHONE_D, PHONE_L, "Nous contacter", f"{R}contact/")}
{marque.cookies()}
{marque.scripts(depth)}
</body>
</html>"""


def home():
    cartes = ""
    for a in ACTIVITES:
        ic = IC["building"] if a["cle"] == "pro" else IC["home"]
        pts = "".join(f"<li>{p}</li>" for p in a["points"])
        cartes += f"""
        <div class="card" style="padding:34px">
          <div class="icon-box">{ic}</div>
          <span class="eyebrow" style="margin-bottom:6px">{a['pour']}</span>
          <h3 style="font-family:var(--font-display);font-size:1.7rem;font-weight:500">{a['nom']}</h3>
          <p>{a['desc']}</p>
          <ul class="check-list" style="margin-bottom:22px">{pts}</ul>
          <a class="btn btn--dark" href="{marque.lien_site(a['cle'], 0)}">{a['cta']} {ARROW}</a>
        </div>"""
    valeurs = [
        ("Proximité", "Un interlocuteur qui vous connaît, joignable, et présent sur le terrain en Île-de-France."),
        ("Clarté", "Des explications simples et des propositions écrites, sans jargon pour impressionner."),
        ("Transparence", "Des tarifs annoncés avant d'intervenir, aucun engagement caché, vos accès restent les vôtres."),
        ("Prévention", "Mieux vaut éviter la panne que la réparer : entretien, sauvegarde et conseils dans la durée."),
    ]
    val = "".join(f'<div class="pillar"><span class="num-label">0{i}</span><h3>{t}</h3><p>{d}</p></div>' for i, (t, d) in enumerate(valeurs, 1))
    faq = [
        ("Je suis une entreprise : qui dois-je contacter ?", "DHB Pro accompagne les entreprises, indépendants, cabinets, commerces et associations, sur devis. Vous pouvez aussi nous écrire ici : nous transmettons votre demande."),
        ("Je suis un particulier : comment être aidé ?", "DHB Assistance intervient à domicile en Île-de-France et à distance partout en France, en abonnement ou à l'unité, avec des tarifs affichés."),
        ("Où intervenez-vous ?", "Sur site en Île-de-France, en priorité au nord de Paris, et à distance partout en France."),
    ]
    faq_html = "".join(f'<details class="faq-item"><summary>{q}</summary><div class="faq-body"><p>{r}</p></div></details>' for q, r in faq)
    body = f"""
<section class="hero hero--ink">
  <div class="wrap" style="padding-top:96px;padding-bottom:104px">
    <div style="max-width:780px">
      <span class="eyebrow" style="color:#C9A86A">Le groupe DHB</span>
      <h1 style="font-size:clamp(2.4rem,5.4vw,4rem)">Des services informatiques proches, clairs et fiables.</h1>
      <p class="lead" style="max-width:640px">Deux activités, une même exigence : accompagner les entreprises comme les particuliers avec un interlocuteur qui prend le temps d'expliquer.</p>
      <div class="hero-cta" style="margin-top:30px">
        <a class="btn btn--primary btn--lg" href="#activites">Découvrir nos activités</a>
        <a class="btn btn--ghost btn--lg" href="contact/">Nous contacter</a>
      </div>
    </div>
  </div>
</section>

<section class="section" id="activites">
  <div class="wrap">
    <div class="section-head"><span class="eyebrow">Nos activités</span><h2>Une expertise adaptée à chaque besoin</h2>
      <p>Chaque activité a son site, ses services et ses conditions. Choisissez celle qui vous correspond.</p></div>
    <div class="grid grid-2">{cartes}</div>
  </div>
</section>

<section class="section section--tint">
  <div class="wrap">
    <div class="section-head"><span class="eyebrow">Notre approche</span><h2>Ce qui nous guide</h2></div>
    <div class="pillars" style="grid-template-columns:repeat(4,minmax(0,1fr))">{val}</div>
  </div>
</section>

<section class="section">
  <div class="wrap zone">
    <div>
      <span class="eyebrow">Zone d'intervention</span>
      <h2>Ancrés au nord de Paris, disponibles partout en France</h2>
      <p class="lead">Nos interventions sur site couvrent l'Île-de-France, en priorité Saint-Denis, Saint-Ouen, Aubervilliers, Épinay-sur-Seine et Pantin. La plupart des demandes se règlent aussi à distance, partout en France.</p>
    </div>
    <div>
      <div class="zone-box"><h3>{marque.ICONES['pin']} Sur site</h3><p>Île-de-France, avec une priorité pour la Plaine Commune.</p></div>
      <div class="zone-box"><h3>{marque.ICONES['phone']} À distance</h3><p>Partout en France, par prise en main sécurisée et avec votre accord.</p></div>
      <p class="muted" style="margin-top:16px;font-size:.92rem">Histoire du groupe et équipe : <span class="a-completer">[À COMPLÉTER PAR LE PROPRIÉTAIRE]</span></p>
    </div>
  </div>
</section>

<section class="section section--soft">
  <div class="wrap">
    <div class="section-head center"><span class="eyebrow">Questions fréquentes</span><h2>Bien nous orienter</h2></div>
    <div class="faq-list">{faq_html}</div>
  </div>
</section>

<section class="section section--tight"><div class="wrap"><div class="cta-band">
  <div><h2>Une question, un projet ?</h2><p>Écrivez-nous : nous vous orientons vers la bonne activité et le bon interlocuteur, sous 24 h ouvrées.</p></div>
  <div class="hero-cta"><a class="btn btn--primary btn--lg" href="contact/">Nous contacter</a><a class="btn btn--ghost btn--lg" href="tel:{PHONE_L}">{marque.ICONES['phone']} {PHONE_D}</a></div>
</div></div></section>
{org_jsonld()}
"""
    return page(0, "", f"{NAME} — services informatiques pour les entreprises et les particuliers",
                "Le groupe DHB réunit DHB Pro (infogérance et cybersécurité pour les entreprises) et DHB Assistance (dépannage pour les particuliers). Île-de-France et à distance.", body)


def entete_page(depth, ariane, eyebrow, titre, intro):
    R = "../" * depth
    return f"""
<section class="page-hero"><div class="wrap">
  <div class="breadcrumb"><a href="{R}">Accueil</a> <span>/</span> {ariane}</div>
  {f'<span class="eyebrow">{eyebrow}</span>' if eyebrow else ''}
  <h1>{titre}</h1>
  {f'<p>{intro}</p>' if intro else ''}
</div></section>"""


def le_groupe():
    body = entete_page(1, "Le groupe", "Qui sommes-nous", "Le groupe DHB",
                       "Un groupe récent construit autour d'une conviction simple : l'informatique doit être un service clair, humain et fiable, pour tous.") + f"""
<section class="section"><div class="wrap"><div class="article-body" style="max-width:820px">
  <h2>Notre raison d'être</h2>
  <p>Le groupe DHB rassemble deux activités de services informatiques. Notre mission : rendre l'informatique simple et sereine, que vous soyez une entreprise qui veut un parc fiable et sécurisé, ou un particulier qui a besoin d'aide à la maison.</p>
  <h2>Nos activités</h2>
  <p><strong><a href="{marque.lien_site('pro', 1)}">DHB Pro</a></strong> accompagne les entreprises : maintenance, dépannage, cybersécurité, sauvegarde et infogérance, sur site en Île-de-France et à distance partout en France.</p>
  <p><strong><a href="{marque.lien_site('assistance', 1)}">DHB Assistance</a></strong> aide les particuliers au quotidien : dépannage, assistance et conseils, en abonnement ou à l'intervention.</p>
  <h2>Nos valeurs</h2>
  <ul><li><strong>Proximité</strong> : un interlocuteur qui vous connaît.</li><li><strong>Clarté</strong> : des explications simples, jamais de jargon.</li><li><strong>Transparence</strong> : des engagements écrits, pas de prix cachés.</li><li><strong>Prévention</strong> : éviter la panne plutôt que la subir.</li></ul>
  <p class="a-completer">[À COMPLÉTER PAR LE PROPRIÉTAIRE : histoire du groupe, fondateur(s), forme juridique, date de création.]</p>
</div></div></section>
{org_jsonld()}
"""
    return page(1, "le-groupe/", f"Le groupe DHB — qui sommes-nous | {NAME}",
                "Découvrez le groupe DHB : des services informatiques à taille humaine réunissant DHB Pro (entreprises) et DHB Assistance (particuliers).", body)


def contact():
    R = "../"
    body = entete_page(1, "Contact", "Contact", "Contacter le groupe DHB",
                       "Une question, un projet ? Écrivez-nous : nous vous orientons vers la bonne activité, sous 24 h ouvrées.") + f"""
<section class="section"><div class="wrap"><div class="grid grid-2" style="gap:48px;align-items:start">
  <div>
    <h2>Nos coordonnées</h2>
    <div class="zone-box"><h3>{marque.ICONES['phone']} Téléphone</h3><p><a href="tel:{PHONE_L}"><strong>{PHONE_D}</strong></a> <span class="a-completer">[EXEMPLE]</span></p></div>
    <div class="zone-box"><h3>{marque.ICONES['mail']} Email</h3><p><a href="mailto:{EMAIL}">{EMAIL}</a> <span class="a-completer">[EXEMPLE]</span></p></div>
    <div class="zone-box"><h3>{marque.ICONES['pin']} Zone</h3><p>Sur site en Île-de-France · à distance partout en France.</p></div>
    <div class="callout" style="margin-top:20px"><strong>Vous cherchez un service précis ?</strong><br>
      Entreprises : <a href="{marque.lien_site('pro', 1)}">DHB Pro</a> · Particuliers : <a href="{marque.lien_site('assistance', 1)}">DHB Assistance</a></div>
  </div>
  <div><div class="form-card">
    <h3 class="mt-0">Nous écrire</h3>
    <p style="font-size:.95rem">Réponse sous 24 h ouvrées · Sans engagement</p>
    <form data-demo-form data-type="question" novalidate>
      <div class="form-ok">Merci, votre message est bien reçu. Nous vous recontactons sous 24 h ouvrées.</div>
      <div class="form-row"><label for="n">Nom et prénom</label><input id="n" name="nom" autocomplete="name" required></div>
      <div class="form-grid">
        <div class="form-row"><label for="e">Email</label><input id="e" name="email" type="email" autocomplete="email" required></div>
        <div class="form-row"><label for="t">Téléphone</label><input id="t" name="telephone" type="tel" autocomplete="tel"></div>
      </div>
      <div class="form-row"><label for="o">Vous êtes</label><select id="o" name="entreprise"><option>Une entreprise</option><option>Un particulier</option><option>Autre</option></select></div>
      <div class="form-row"><label for="m">Votre message</label><textarea id="m" name="message"></textarea></div>
      <div class="form-row consent"><input id="c" type="checkbox" required><label for="c" style="font-weight:400;margin:0">J'accepte d'être recontacté(e). Voir la <a href="{R}politique-confidentialite/">politique de confidentialité</a>.</label></div>
      <button class="btn btn--primary btn--lg btn--block" type="submit">Envoyer</button>
    </form>
  </div></div>
</div></div></section>
{org_jsonld()}
"""
    return page(1, "contact/", f"Contact — {NAME}",
                "Contactez le groupe DHB. Nous vous orientons vers DHB Pro (entreprises) ou DHB Assistance (particuliers), réponse sous 24 h ouvrées.", body)


def legal(slug, title, h1, blocks):
    body = entete_page(1, h1, None, h1, None) + f"""
<section class="section"><div class="wrap"><div class="article-body">{blocks}</div></div></section>
"""
    return page(1, slug, f"{title} | {NAME}", f"{h1} du site du groupe DHB.", body)


def build():
    pages = {
        "index.html": home(),
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
        prio = "1.0" if up == "" else ("0.8" if up in ("le-groupe/", "contact/") else "0.3")
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
