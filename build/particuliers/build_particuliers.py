# -*- coding: utf-8 -*-
"""Générateur du site DHB PARTICULIERS (grand public). Sortie : sites/particuliers/.
Prix affichés (B2C), accent vert, base d'aide (Q&A grand public), SEO propre.
Exécuter : python3 build/particuliers/build_particuliers.py
"""
import os, sys, json, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(REPO, "sites", "particuliers")
sys.path.insert(0, HERE)
import aide_data as ad

# --- Constantes (valeurs d'EXEMPLE) ---
NAME = "DHB Particuliers"
SIGN = "Assistance & dépannage informatique pour les particuliers"
DOMAIN = "https://www.dhb-assistance.fr"   # [EXEMPLE]
PHONE_D = "01 23 45 67 89"                  # [EXEMPLE]
PHONE_L = "+33123456789"                    # [EXEMPLE]
WHATSAPP = "33123456789"                    # [EXEMPLE]
EMAIL = "bonjour@dhb-assistance.fr"         # [EXEMPLE]
YEAR = 2026
PRIX_ABO = "19,90"   # [EXEMPLE — à ajuster]
PRIX_INT = "59"      # [EXEMPLE — à ajuster]

ACCENT_CSS = """<style>
:root{--cyan:#22c55e;--cyan-600:#16a34a;--cyan-700:#15803d;}
.hero{background:linear-gradient(160deg,#064e3b 0%,#053b2e 55%,#04291f 100%);}
.btn--primary{box-shadow:0 10px 24px -8px rgba(34,197,94,.55);}
.pb-toolbar{position:sticky;top:76px;z-index:20;background:var(--blanc);padding:18px 0;border-bottom:1px solid var(--gris-100)}
.pb-search{max-width:560px;margin:0 auto 14px;position:relative}
.pb-search input{padding-left:44px}
.pb-search svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--gris-400)}
.pb-filters{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.pb-filter{border:1.5px solid var(--gris-200);background:#fff;color:var(--nuit);padding:8px 15px;border-radius:999px;font-weight:600;font-size:.88rem;cursor:pointer;transition:all .2s;font-family:inherit}
.pb-filter:hover{border-color:var(--cyan-600)} .pb-filter.active{background:var(--cyan-700);color:#fff;border-color:var(--cyan-700)}
.pb-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:34px}
.pb-card{display:flex;flex-direction:column;background:#fff;border:1px solid var(--gris-100);border-radius:var(--rayon);padding:22px;box-shadow:var(--ombre-douce);transition:transform .2s,box-shadow .2s;color:inherit}
.pb-card:hover{transform:translateY(-4px);box-shadow:var(--ombre);color:inherit}
.pb-cat{display:inline-flex;gap:6px;align-self:flex-start;font-size:.78rem;font-weight:800;color:var(--cyan-700);background:#f0fdf4;border:1px solid #bbf7d0;padding:3px 10px;border-radius:999px;margin-bottom:12px}
.pb-card h3{font-size:1.08rem;margin-bottom:8px} .pb-card p{font-size:.93rem;margin-bottom:14px;flex:1}
.pb-link{font-weight:700;color:var(--cyan-700);font-size:.92rem}
.pb-empty{display:none;text-align:center;color:var(--gris-600);padding:40px}.pb-empty.show{display:block}
@media(max-width:960px){.pb-grid{grid-template-columns:repeat(2,1fr)}.pb-toolbar{top:0}}
@media(max-width:680px){.pb-grid{grid-template-columns:1fr}}
</style>"""

IC_PHONE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.5-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z"/></svg>'
CHECK = '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>'


def org_jsonld():
    data = {"@context": "https://schema.org", "@type": "LocalBusiness", "name": NAME,
            "description": SIGN, "url": DOMAIN + "/", "telephone": PHONE_L, "email": EMAIL,
            "areaServed": [{"@type": "AdministrativeArea", "name": "Île-de-France"}, {"@type": "Country", "name": "France"}],
            "priceRange": "€€"}
    return '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False) + '</script>'


def page(depth, slug_path, title, desc, body, extra=""):
    R = "../" * depth
    home = R if R else "./"
    canonical = DOMAIN + "/" + slug_path
    return f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{canonical}">
<meta name="robots" content="index, follow">
<meta property="og:type" content="website"><meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}"><meta property="og:url" content="{canonical}">
<meta property="og:locale" content="fr_FR"><meta property="og:site_name" content="{NAME}">
<meta name="theme-color" content="#15803d">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap">
<link rel="stylesheet" href="{R}assets/css/style.css">
<link rel="icon" href="{R}assets/img/favicon.svg" type="image/svg+xml">
{ACCENT_CSS}
{extra}
</head>
<body>
<a class="skip-link" href="#contenu">Aller au contenu</a>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="logo" href="{home}" aria-label="{NAME}">
      <span class="logo__mark">D<b>H</b>B <span style="font-size:.8rem;font-weight:700;color:var(--gris-600)">Particuliers</span></span>
      <span class="logo__tag">{SIGN}</span>
    </a>
    <nav class="nav" aria-label="Navigation principale">
      <a class="nav-link" href="{home}">Accueil</a>
      <a class="nav-link" href="{R}aide/">Centre d'aide</a>
      <a class="nav-link" href="{R}abonnement/">Abonnement & tarifs</a>
      <a class="nav-link" href="{R}contact/">Contact</a>
    </nav>
    <div class="header-cta"><a class="btn btn--primary" href="{R}contact/">Être aidé(e)</a></div>
    <button class="burger" aria-label="Menu" aria-expanded="false" aria-controls="mnav"><span></span><span></span><span></span></button>
  </div>
</header>
<div class="mobile-nav" id="mnav">
  <a href="{home}">Accueil</a>
  <a href="{R}aide/">Centre d'aide</a>
  <a href="{R}abonnement/">Abonnement & tarifs</a>
  <a href="{R}contact/">Contact</a>
  <a class="btn btn--primary btn--block" href="{R}contact/">Être aidé(e)</a>
</div>
<main id="contenu">
{body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-contact">
        <span class="logo__mark" style="color:#fff">D<b>H</b>B Particuliers</span>
        <p>{SIGN}. À domicile en Île-de-France, à distance partout en France.</p>
        <p>☎ <a href="tel:{PHONE_L}">{PHONE_D}</a><br>✉ <a href="mailto:{EMAIL}">{EMAIL}</a></p>
      </div>
      <div><h4>Aide</h4><a href="{R}aide/">Centre d'aide</a><a href="{R}abonnement/">Abonnement & tarifs</a></div>
      <div><h4>Infos</h4><a href="{R}a-propos/">À propos</a><a href="{R}contact/">Contact</a></div>
      <div><h4>Légal</h4><a href="{R}mentions-legales/">Mentions légales</a><a href="{R}politique-confidentialite/">Confidentialité</a></div>
    </div>
    <div class="footer-bottom"><span>© {YEAR} {NAME}. <span class="a-completer">[SIRET : À COMPLÉTER]</span></span></div>
  </div>
</footer>
<div class="float-cta">
  <a class="float-btn" href="tel:{PHONE_L}" aria-label="Appeler">{IC_PHONE}<span>Appeler</span></a>
</div>
<div class="cookie-banner" role="dialog" aria-label="Cookies">
  <div class="cookie-inner">
    <p><strong>🍪 Respect de votre vie privée.</strong> Cookies nécessaires et, avec votre accord, de mesure d'audience. Refus aussi simple qu'acceptation.</p>
    <div class="cookie-actions"><button class="btn btn--outline" data-cookie="refuse">Refuser</button><button class="btn btn--primary" data-cookie="accept">Tout accepter</button></div>
  </div>
</div>
<script src="{R}assets/js/supabase-config.js"></script>
<script src="{R}assets/js/main.js" defer></script>
</body>
</html>"""


def contact_form(depth, title="Être aidé(e) rapidement"):
    R = "../" * depth
    return f"""
    <div class="form-card">
      <h3 class="mt-0">{title}</h3>
      <p style="font-size:.95rem">Réponse rapide · à domicile (IdF) ou à distance (France) · sans engagement</p>
      <form data-demo-form data-type="devis" novalidate>
        <div class="form-ok">✅ Merci ! On vous recontacte très vite pour vous aider. Pour une urgence, appelez le <a href="tel:{PHONE_L}">{PHONE_D}</a>.</div>
        <div class="form-row"><label for="n">Nom et prénom</label><input id="n" name="nom" required></div>
        <div class="form-grid">
          <div class="form-row"><label for="e">Email</label><input id="e" name="email" type="email" required></div>
          <div class="form-row"><label for="t">Téléphone</label><input id="t" name="telephone" type="tel"></div>
        </div>
        <div class="form-row"><label for="m">Votre problème</label><textarea id="m" name="message" placeholder="Décrivez ce qui ne va pas, avec vos mots…"></textarea></div>
        <div class="form-row consent"><input id="c" type="checkbox" required><label for="c" style="font-weight:500;margin:0">J'accepte d'être recontacté(e). Voir la <a href="{R}politique-confidentialite/">politique de confidentialité</a>.</label></div>
        <button class="btn btn--primary btn--lg btn--block" type="submit">Demander de l'aide</button>
      </form>
    </div>"""


def offres_cards(depth):
    R = "../" * depth
    return f"""
    <div class="grid grid-2" style="align-items:start">
      <div class="card reveal" style="border-top:4px solid var(--cyan-600)">
        <h3>Abonnement sérénité</h3>
        <p>Une assistance toute l'année pour ne plus jamais rester bloqué(e). Idéal pour être tranquille, et pour aider un proche.</p>
        <ul class="check-list">
          <li>Assistance à distance <strong>illimitée</strong></li>
          <li>Interventions à domicile incluses ou à tarif réduit</li>
          <li>Conseils, mises à jour et sécurité</li>
          <li>Un interlocuteur patient, sans jargon</li>
        </ul>
        <div class="price-tag">À partir de <span data-setting="abonnement_prix">{PRIX_ABO}</span> €<small>/mois</small></div>
        <a class="btn btn--primary btn--block" href="{R}contact/">Je m'abonne</a>
      </div>
      <div class="card reveal" style="border-top:4px solid var(--cyan-600)">
        <h3>Intervention ponctuelle</h3>
        <p>Un souci précis à régler, sans engagement. On intervient chez vous (Île-de-France) ou à distance (partout en France).</p>
        <ul class="check-list">
          <li>Dépannage à l'unité</li>
          <li>Sans abonnement</li>
          <li>Tarif annoncé avant toute intervention</li>
          <li>Paiement simple</li>
        </ul>
        <div class="price-tag">À partir de <span data-setting="intervention_prix">{PRIX_INT}</span> €</div>
        <a class="btn btn--dark btn--block" href="{R}contact/">Être aidé(e) maintenant</a>
      </div>
    </div>"""


def home():
    aides = ad.A[:6]
    cards = ""
    for a in aides:
        cards += f"""<a class="card" href="aide/{a['slug']}/" style="color:inherit"><span class="pb-cat">{ad.CAT_ICON[a['cat']]} {ad.CATEGORIES[a['cat']]}</span><h3 style="font-size:1.05rem">{a['q']}</h3><span class="pb-link">Voir l'aide →</span></a>"""
    services = [
        ("💻", "Ordinateur lent ou en panne", "On répare, on nettoie, on accélère."),
        ("🦠", "Virus & arnaques", "Nettoyage, sécurité, et conseils pour éviter les pièges."),
        ("📶", "Internet, box & Wi-Fi", "Connexion rétablie et Wi-Fi qui couvre toute la maison."),
        ("📷", "Photos & sauvegarde", "On récupère et on protège vos souvenirs."),
        ("📱", "Smartphone & tablette", "Transfert, nettoyage, prise en main."),
        ("👵", "Aide aux proches / seniors", "Avec patience et pédagogie, à domicile ou à distance."),
    ]
    sv = "".join(f'<div class="card reveal"><div style="font-size:2rem;margin-bottom:10px">{i}</div><h3 style="font-size:1.1rem">{t}</h3><p>{d}</p></div>' for i, t, d in services)
    body = f"""
<section class="hero">
  <div class="wrap hero-inner">
    <div class="reveal">
      <h1>Votre dépanneur informatique de confiance, à la maison.</h1>
      <p class="lead">Ordinateur lent, virus, box Internet, photos à récupérer, aide pour vos démarches… On vous dépanne et on vous accompagne, sans jargon, chez vous ou à distance.</p>
      <ul class="reassurance">
        <li>{CHECK} À domicile en Île-de-France</li>
        <li>{CHECK} À distance partout en France</li>
        <li>{CHECK} Sans jargon, avec patience</li>
      </ul>
      <div class="hero-cta">
        <a class="btn btn--primary btn--lg" href="contact/">Être aidé(e)</a>
        <a class="btn btn--ghost btn--lg" href="tel:{PHONE_L}">{IC_PHONE} {PHONE_D}</a>
      </div>
    </div>
    <div class="hero-visual reveal" aria-hidden="true">
      <h3>🙂 Simple et rassurant</h3>
      <div class="status-row"><span>On parle votre langage</span><span class="badge-ok"><span class="dot"></span>Sans jargon</span></div>
      <div class="status-row"><span>À domicile ou à distance</span><span class="badge-ok"><span class="dot"></span>Au choix</span></div>
      <div class="status-row"><span>Tarif annoncé avant</span><span class="badge-ok"><span class="dot"></span>Sans surprise</span></div>
      <div class="status-row"><span>Abonnement ou à l'unité</span><span class="badge-ok"><span class="dot"></span>Sans engagement</span></div>
    </div>
  </div>
</section>

<section class="section"><div class="wrap">
  <div class="center" style="max-width:720px;margin:0 auto 46px"><span class="eyebrow">Comment on vous aide</span><h2>Tout ce qui vous embête, on s'en occupe</h2></div>
  <div class="grid grid-3">{sv}</div>
</div></section>

<section class="section section--gris"><div class="wrap">
  <div class="center" style="max-width:720px;margin:0 auto 46px"><span class="eyebrow">Nos formules</span><h2>Abonnement ou intervention, à vous de choisir</h2><p class="lead">Des prix clairs, annoncés à l'avance. Sans engagement caché.</p></div>
  {offres_cards(0)}
  <p class="center" style="margin-top:24px"><a class="btn btn--dark" href="abonnement/">Voir le détail des formules →</a></p>
</div></section>

<section class="section"><div class="wrap">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px;margin-bottom:34px">
    <div><span class="eyebrow">Centre d'aide</span><h2 class="mb-0">Un souci ? Trouvez la réponse</h2></div>
    <a class="btn btn--dark" href="aide/">Tout le centre d'aide</a>
  </div>
  <div class="pb-grid">{cards}</div>
</div></section>

<section class="section section--gris"><div class="wrap">
  <div class="grid grid-2" style="align-items:center;gap:48px">
    <div class="reveal"><span class="eyebrow">On est là</span><h2>Dites-nous ce qui ne va pas</h2><p class="lead">Expliquez votre problème avec vos mots. On vous recontacte vite, et on vous aide à domicile ou à distance.</p>
      <ul class="check-list" style="margin-top:16px"><li>Sans jargon</li><li>Tarif annoncé avant</li><li>Sans engagement</li></ul>
    </div>
    <div class="reveal">{contact_form(0)}</div>
  </div>
</div></section>
{org_jsonld()}
"""
    return page(0, "", f"{NAME} — dépannage & assistance informatique à domicile et à distance",
                "DHB Particuliers : dépannage et assistance informatique à domicile (Île-de-France) et à distance (France). Ordinateur, virus, box, photos. Abonnement ou intervention, prix clairs.", body)


def abonnement():
    body = f"""
<section class="page-hero"><div class="wrap">
  <div class="breadcrumb"><a href="../">Accueil</a> <span>/</span> Abonnement & tarifs</div>
  <span class="eyebrow">Nos formules</span>
  <h1>Abonnement & tarifs : des prix clairs, sans surprise</h1>
  <p>Choisissez la formule qui vous convient. Le tarif exact vous est toujours annoncé avant toute intervention.</p>
</div></section>
<section class="section"><div class="wrap">{offres_cards(1)}
  <p class="center muted" style="max-width:720px;margin:24px auto 0;color:var(--gris-600)">Les montants affichés sont des exemples de départ. <span class="a-completer">[À COMPLÉTER : grille détaillée + mise en place du paiement en ligne (abonnement + intervention).]</span></p>
</div></section>
<section class="section section--gris"><div class="wrap" style="max-width:800px">
  <h2 class="center" style="margin-bottom:30px">Questions fréquentes</h2>
  <details class="faq-item"><summary>Y a-t-il un engagement ?</summary><div class="faq-body"><p>Non. L'abonnement est sans engagement de durée, et l'intervention ponctuelle se fait à l'unité. Vous restez libre.</p></div></details>
  <details class="faq-item"><summary>Intervenez-vous à domicile ?</summary><div class="faq-body"><p>Oui, à domicile en Île-de-France, et à distance partout en France (la plupart des soucis se règlent à distance, sans déplacement).</p></div></details>
  <details class="faq-item"><summary>Comment se passe le paiement ?</summary><div class="faq-body"><p>Simplement, et le tarif vous est toujours annoncé avant. <span class="a-completer">[À COMPLÉTER : moyens de paiement / paiement en ligne.]</span></p></div></details>
  <details class="faq-item"><summary>L'abonnement convient-il pour aider un proche âgé ?</summary><div class="faq-body"><p>Tout à fait : c'est même l'un de ses usages les plus appréciés. On accompagne vos proches avec patience, à distance ou chez eux.</p></div></details>
</div></section>
<section class="section"><div class="wrap"><div class="cta-band reveal">
  <h2>Prêt(e) à être tranquille ?</h2>
  <p>Dites-nous votre besoin, on vous conseille la bonne formule — sans vous pousser à la plus chère.</p>
  <div class="hero-cta"><a class="btn btn--primary btn--lg" href="../contact/">Être aidé(e)</a><a class="btn btn--ghost btn--lg" href="tel:{PHONE_L}">{IC_PHONE} {PHONE_D}</a></div>
</div></div></section>
{org_jsonld()}
"""
    return page(1, "abonnement/", f"Abonnement & tarifs — {NAME}",
                "Abonnement assistance informatique et intervention ponctuelle pour particuliers : prix clairs, sans engagement, à domicile (IdF) ou à distance (France).", body)


def aide_index():
    cats = ad.by_category()
    filters = '<button class="pb-filter active" data-cat="all">Tout</button>'
    for k, label in ad.CATEGORIES.items():
        if cats[k]:
            filters += f'<button class="pb-filter" data-cat="{k}">{ad.CAT_ICON[k]} {label}</button>'
    items = ""
    for k, label in ad.CATEGORIES.items():
        for a in cats[k]:
            kw = (a["q"] + " " + a["sym"]).lower().replace('"', "")
            items += f"""<a class="pb-card" href="{a['slug']}/" data-cat="{k}" data-kw="{kw}"><span class="pb-cat">{ad.CAT_ICON[k]} {label}</span><h3>{a['q']}</h3><p>{a['sym'][:110]}…</p><span class="pb-link">Voir l'aide →</span></a>"""
    js = """<script>(function(){var s=document.getElementById('pb-search'),c=[].slice.call(document.querySelectorAll('.pb-card')),f=[].slice.call(document.querySelectorAll('.pb-filter')),e=document.getElementById('pb-empty'),cat='all';function n(x){return(x||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'')}function a(){var q=n(s.value.trim()),k=0;c.forEach(function(x){var okc=(cat==='all'||x.getAttribute('data-cat')===cat),okq=(!q||n(x.getAttribute('data-kw')).indexOf(q)>-1),sh=okc&&okq;x.style.display=sh?'':'none';if(sh)k++});if(e)e.classList.toggle('show',k===0)}s.addEventListener('input',a);f.forEach(function(b){b.addEventListener('click',function(){f.forEach(function(y){y.classList.remove('active')});b.classList.add('active');cat=b.getAttribute('data-cat');a()})})})();</script>"""
    body = f"""
<section class="page-hero"><div class="wrap">
  <div class="breadcrumb"><a href="../">Accueil</a> <span>/</span> Centre d'aide</div>
  <span class="eyebrow">Centre d'aide</span>
  <h1>Un souci informatique ? Trouvez la réponse</h1>
  <p>Cherchez votre problème ci-dessous, expliqué simplement. Et si vous préférez qu'on s'en occupe, on est là.</p>
</div></section>
<div class="pb-toolbar"><div class="wrap">
  <div class="pb-search">{'<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" width=\"20\" height=\"20\"><circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m21 21-4.3-4.3\"/></svg>'}<input id="pb-search" type="search" placeholder="Rechercher (ex : ordinateur lent, virus, photos…)" aria-label="Rechercher"></div>
  <div class="pb-filters">{filters}</div>
</div></div>
<section class="section section--tight"><div class="wrap">
  <div class="pb-grid">{items}</div>
  <div class="pb-empty" id="pb-empty"><p>Rien ne correspond. <a href="../contact/">Expliquez-nous votre problème</a>, on vous aide.</p></div>
</div></section>
<section class="section"><div class="wrap"><div class="cta-band reveal">
  <h2>Vous préférez qu'on s'en occupe ?</h2>
  <p>À domicile en Île-de-France ou à distance partout en France. Sans jargon, sans engagement.</p>
  <div class="hero-cta"><a class="btn btn--primary btn--lg" href="../contact/">Être aidé(e)</a><a class="btn btn--ghost btn--lg" href="../abonnement/">Voir l'abonnement</a></div>
</div></div></section>
{js}
"""
    return page(1, "aide/", f"Centre d'aide informatique pour particuliers | {NAME}",
                "Centre d'aide DHB Particuliers : réponses simples aux problèmes informatiques du quotidien (ordinateur lent, virus, box, photos, smartphone). Et une aide à domicile ou à distance.", body, extra="")


def aide_page(a):
    r = "../../"
    cats = ad.by_category()
    label = ad.CATEGORIES[a["cat"]]
    causes = "".join(f"<li>{c}</li>" for c in a["causes"])
    checks = "".join(f"<li>{c}</li>" for c in a["check"])
    others = [x for x in cats[a["cat"]] if x["slug"] != a["slug"]][:4]
    others_html = "".join(f'<a href="{r}aide/{o["slug"]}/">{o["q"]}</a>' for o in others)
    faq = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{
        "@type": "Question", "name": a["q"], "acceptedAnswer": {"@type": "Answer",
        "text": a["sym"] + " À essayer : " + " ; ".join(a["check"]) + ". " + a["call"]}}]}
    body = f"""
<section class="page-hero"><div class="wrap">
  <div class="breadcrumb"><a href="{r}">Accueil</a> <span>/</span> <a href="{r}aide/">Centre d'aide</a> <span>/</span> {label}</div>
  <span class="pb-cat" style="background:rgba(255,255,255,.12);color:#fff;border-color:rgba(255,255,255,.25)">{ad.CAT_ICON[a['cat']]} {label}</span>
  <h1 style="margin-top:12px">{a['q']}</h1>
  <p>{a['sym']}</p>
  <div class="hero-cta"><a class="btn btn--primary btn--lg" href="{r}contact/">Être aidé(e)</a><a class="btn btn--ghost btn--lg" href="tel:{PHONE_L}">{IC_PHONE} {PHONE_D}</a></div>
</div></section>
<section class="section"><div class="wrap">
  <div class="grid grid-2" style="gap:30px;align-items:start">
    <div class="card reveal"><h3>Pourquoi ça arrive</h3><ul class="check-list">{causes}</ul></div>
    <div class="card reveal"><h3>Ce que vous pouvez essayer</h3><ul class="check-list">{checks}</ul></div>
  </div>
  <div class="article-body" style="max-width:820px;margin-top:40px">
    <div class="callout" style="background:#f0fdf4;border-color:#bbf7d0"><strong>On peut s'en occuper pour vous</strong><br>{a['call']}</div>
  </div>
</div></section>
<section class="section section--gris"><div class="wrap">
  <h2 class="center" style="margin-bottom:30px">Autres aides « {label} »</h2>
  <div class="related">{others_html}</div>
</div></section>
<section class="section"><div class="wrap"><div class="grid grid-2" style="align-items:center;gap:48px">
  <div class="reveal"><span class="eyebrow">On est là</span><h2>Dites-nous votre souci</h2><p class="lead">On vous aide à domicile (IdF) ou à distance, sans jargon et sans engagement.</p></div>
  <div class="reveal">{contact_form(2)}</div>
</div></div></section>
<script type="application/ld+json">{json.dumps(faq, ensure_ascii=False)}</script>
{org_jsonld()}
"""
    return page(2, f"aide/{a['slug']}/", f"{a['q']} — aide informatique | {NAME}",
                a["sym"][:155], body)


def contact():
    body = f"""
<section class="page-hero"><div class="wrap">
  <div class="breadcrumb"><a href="../">Accueil</a> <span>/</span> Contact</div>
  <span class="eyebrow">Contact</span><h1>Besoin d'aide ? Écrivez-nous</h1>
  <p>Un problème à régler ou une question : on vous recontacte vite et on vous aide, chez vous ou à distance.</p>
</div></section>
<section class="section"><div class="wrap"><div class="grid grid-2" style="gap:48px;align-items:start">
  <div class="reveal"><h2>Nos coordonnées</h2>
    <p>☎ <a href="tel:{PHONE_L}"><strong>{PHONE_D}</strong></a> <span class="a-completer">[EXEMPLE]</span></p>
    <p>✉ <a href="mailto:{EMAIL}">{EMAIL}</a> <span class="a-completer">[EXEMPLE]</span></p>
    <p>📍 À domicile en Île-de-France · à distance partout en France.</p>
    <div class="card" style="margin-top:16px;background:#f0fdf4;border-color:#bbf7d0"><h3>Une urgence ?</h3><p class="mb-0">Appelez directement le <a href="tel:{PHONE_L}"><strong>{PHONE_D}</strong></a>.</p></div>
  </div>
  <div class="reveal">{contact_form(1)}</div>
</div></div></section>
{org_jsonld()}
"""
    return page(1, "contact/", f"Contact — {NAME}",
                "Contactez DHB Particuliers pour un dépannage informatique à domicile (IdF) ou à distance (France). Réponse rapide, sans jargon.", body)


def a_propos():
    body = f"""
<section class="page-hero"><div class="wrap"><div class="breadcrumb"><a href="../">Accueil</a> <span>/</span> À propos</div>
  <span class="eyebrow">À propos</span><h1>Votre informatique, en toute confiance</h1>
  <p>DHB Particuliers, c'est la branche grand public du groupe DHB : une aide informatique proche, patiente et sans jargon.</p></div></section>
<section class="section"><div class="wrap"><div class="article-body" style="max-width:820px">
  <h2>Notre état d'esprit</h2>
  <p>On sait à quel point un problème informatique peut être stressant quand on n'est pas du métier. Notre promesse : vous écouter, vous expliquer simplement, et régler les choses — sans vous faire sentir dépassé(e).</p>
  <h2>À domicile ou à distance</h2>
  <p>On intervient chez vous en Île-de-France, et à distance partout en France (la plupart des soucis se règlent sans déplacement). Vous choisissez ce qui vous arrange.</p>
  <h2>Pour vous et vos proches</h2>
  <p>Beaucoup nous font confiance pour aider un parent âgé ou moins à l'aise avec le numérique. On le fait avec patience et pédagogie.</p>
  <p class="a-completer">[À COMPLÉTER PAR LE PROPRIÉTAIRE : présentation, zone précise, éventuelles qualifications.]</p>
</div></div></section>
{org_jsonld()}
"""
    return page(1, "a-propos/", f"À propos — {NAME}",
                "DHB Particuliers : aide informatique proche, patiente et sans jargon, à domicile en Île-de-France et à distance partout en France.", body)


def legal(slug, title, h1, blocks):
    body = f"""
<section class="page-hero"><div class="wrap"><div class="breadcrumb"><a href="../">Accueil</a> <span>/</span> {h1}</div><h1>{h1}</h1></div></section>
<section class="section"><div class="wrap"><div class="article-body">{blocks}</div></div></section>"""
    return page(1, slug, f"{title} | {NAME}", f"{h1} du site DHB Particuliers.", body)


def build():
    pages = {
        "index.html": home(),
        "abonnement/index.html": abonnement(),
        "aide/index.html": aide_index(),
        "contact/index.html": contact(),
        "a-propos/index.html": a_propos(),
        "mentions-legales/index.html": legal("mentions-legales/", "Mentions légales", "Mentions légales",
            '<div class="callout">Modèle à compléter avant mise en ligne.</div>'
            f'<h2>Éditeur</h2><p>{NAME} — {SIGN}<br>Forme juridique, SIRET, siège : <span class="a-completer">[À COMPLÉTER]</span><br>Téléphone : {PHONE_D} — Email : {EMAIL}</p>'
            '<h2>Hébergement</h2><p class="a-completer">[À COMPLÉTER : hébergeur]</p>'
            '<h2>Données personnelles</h2><p>Voir la <a href="../politique-confidentialite/">politique de confidentialité</a>.</p>'),
        "politique-confidentialite/index.html": legal("politique-confidentialite/", "Politique de confidentialité", "Politique de confidentialité (RGPD)",
            '<p>DHB Particuliers collecte via le formulaire uniquement les informations nécessaires pour vous recontacter et vous aider (nom, email, téléphone, message). Elles ne sont jamais revendues.</p>'
            f'<h2>Vos droits</h2><p>Conformément au RGPD : accès, rectification, suppression. Contact : <a href="mailto:{EMAIL}">{EMAIL}</a>.</p><p class="a-completer">[À COMPLÉTER : durées de conservation, mesure d\'audience.]</p>'),
    }
    for a in ad.A:
        pages[f"aide/{a['slug']}/index.html"] = aide_page(a)

    for rel, html in pages.items():
        p = os.path.join(OUT, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, "w", encoding="utf-8").write(html)

    today = datetime.date.today().isoformat()
    urls = []
    for rel in pages:
        up = "" if rel == "index.html" else rel[:-len("index.html")]
        if up == "": prio = "1.0"
        elif up in ("abonnement/", "aide/", "contact/"): prio = "0.9"
        elif up.startswith("aide/"): prio = "0.7"
        else: prio = "0.3"
        urls.append((DOMAIN + "/" + up, prio))
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, prio in sorted(urls, key=lambda x: -float(x[1])):
        sm.append(f"  <url><loc>{loc}</loc><lastmod>{today}</lastmod><changefreq>monthly</changefreq><priority>{prio}</priority></url>")
    sm.append("</urlset>")
    open(os.path.join(OUT, "sitemap.xml"), "w", encoding="utf-8").write("\n".join(sm) + "\n")
    open(os.path.join(OUT, "robots.txt"), "w", encoding="utf-8").write(f"User-agent: *\nAllow: /\n\nSitemap: {DOMAIN}/sitemap.xml\n")
    open(os.path.join(OUT, ".nojekyll"), "w").write("")
    print(f"Site PARTICULIERS : {len(pages)} pages + sitemap + robots ({len(ad.A)} fiches d'aide)")


if __name__ == "__main__":
    build()
