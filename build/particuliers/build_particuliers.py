# -*- coding: utf-8 -*-
"""Générateur du site DHB ASSISTANCE (particuliers, grand public). Sortie : sites/particuliers/.
Prix affichés (B2C), identité teal rassurante, base d'aide (Q&A grand public), SEO propre.
Exécuter : python3 build/particuliers/build_particuliers.py
"""
import os, sys, json

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(REPO, "sites", "particuliers")
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(HERE))
import aide_data as ad
import marque  # noqa: E402

# --- Constantes (valeurs d'EXEMPLE) ---
NAME = "DHB Assistance"
SIGN = "Assistance & dépannage informatique pour les particuliers"
DOMAIN = "https://www.dhb-assistance.fr"   # [EXEMPLE]
PHONE_D = "01 23 45 67 89"                  # [EXEMPLE]
PHONE_L = "+33123456789"                    # [EXEMPLE]
WHATSAPP = "33123456789"                    # [EXEMPLE]
EMAIL = "bonjour@dhb-assistance.fr"         # [EXEMPLE]
YEAR = 2026
PRIX_ABO = "14,90"   # recommandé d'après l'étude de marché (modifiable dans l'admin)
PRIX_INT = "59"      # recommandé d'après l'étude de marché (modifiable dans l'admin)

STRIPE_SCRIPT = """<script>
(function(){
  if(!(window.DHB_STRIPE&&window.DHB_STRIPE.enabled))return;
  var cfg=window.DHB_SUPABASE||{}, url=cfg.url||'', key=cfg.anonKey||'';
  document.querySelectorAll('[data-checkout]').forEach(function(b){
    b.addEventListener('click',function(e){
      e.preventDefault(); var plan=b.getAttribute('data-checkout'), back=b.getAttribute('href'), lbl=b.textContent; b.textContent='Redirection…';
      fetch(url+'/functions/v1/create-checkout',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key,'apikey':key},body:JSON.stringify({plan:plan})})
      .then(function(r){return r.json();}).then(function(d){ if(d&&d.url){location.href=d.url;} else {b.textContent=lbl;location.href=back;} })
      .catch(function(){b.textContent=lbl;location.href=back;});
    });
  });
})();
</script>"""

IC_PHONE = marque.ICONES["phone"]
CHECK = marque.ICONES["check"]


def org_jsonld():
    data = {"@context": "https://schema.org", "@type": "LocalBusiness", "name": NAME,
            "description": SIGN, "url": DOMAIN + "/", "telephone": PHONE_L, "email": EMAIL,
            "areaServed": [{"@type": "AdministrativeArea", "name": "Île-de-France"}, {"@type": "Country", "name": "France"}],
            "priceRange": "€€"}
    return '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False) + '</script>'


def page(depth, slug_path, title, desc, body, extra="", indexable=True):
    R = "../" * depth
    home = R if R else "./"
    canonical = DOMAIN + "/" + slug_path
    nav = f"""
    <nav class="nav" aria-label="Navigation principale">
      <a class="nav-link" href="{home}#services">Nos services</a>
      <a class="nav-link" href="{R}abonnement/">Tarifs</a>
      <a class="nav-link" href="{R}aide/">Centre d'aide</a>
      <a class="nav-link" href="{R}a-propos/">Qui sommes-nous</a>
      <a class="nav-link" href="{R}contact/">Contact</a>
    </nav>"""
    mobile = (f'<a href="{home}#services">Nos services</a><a href="{R}abonnement/">Tarifs</a>'
              f'<a href="{R}aide/">Centre d\'aide</a><a href="{R}a-propos/">Qui sommes-nous</a><a href="{R}contact/">Contact</a>'
              f'<a class="btn btn--primary btn--block" href="{R}contact/">Être aidé(e)</a>')
    colonnes = [
        ("Vous aider", [(f"{home}#services", "Nos services"), (f"{R}abonnement/", "Abonnement et tarifs"), (f"{R}aide/", "Centre d'aide"), (f"{R}outils/arnaque-ou-pas/", "Arnaque ou pas ? (test)")]),
        ("DHB Assistance", [(f"{R}a-propos/", "Qui sommes-nous"), (f"{R}contact/", "Contact")]),
        ("Informations", [(f"{R}mentions-legales/", "Mentions légales"), (f"{R}politique-confidentialite/", "Confidentialité (RGPD)")]),
    ]
    contact = {"phone_display": PHONE_D, "phone_link": PHONE_L, "email": EMAIL}
    return f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
{marque.balises_partage("assistance", DOMAIN, title, desc, canonical, indexable=indexable)}
{marque.head_assets("assistance", depth)}
{extra}
</head>
<body data-site="assistance">
{marque.header("assistance", depth, nav, mobile, "Être aidé(e)", f"{R}contact/", PHONE_D, PHONE_L)}
<main id="contenu">
{body}
</main>
{marque.footer("assistance", depth, "Dépannage et accompagnement informatique pour les particuliers : à domicile en Île-de-France, à distance partout en France. Sans jargon, avec patience.", colonnes, contact)}
{marque.barre_mobile(PHONE_D, PHONE_L, "Être aidé(e)", f"{R}contact/")}
{marque.cookies()}
{marque.scripts(depth, STRIPE_SCRIPT)}
</body>
</html>"""


SV_IC = {
    "ordi": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
    "securite": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>',
    "internet": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1"/></svg>',
    "donnees": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-8 8"/></svg>',
    "mobile": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>',
    "proches": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.3"/><path d="M15.5 14.2A5 5 0 0 1 21 19"/></svg>',
    "guide": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="26" height="26" aria-hidden="true"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="M12 8v5M12 16h.01"/></svg>',
}


def contact_form(depth, title="Être aidé(e) rapidement"):
    R = "../" * depth
    return f"""
    <div class="form-card">
      <h3 class="mt-0">{title}</h3>
      <p style="font-size:.95rem">Réponse rapide · à domicile (Île-de-France) ou à distance · sans engagement</p>
      <form data-demo-form data-type="devis" novalidate>
        <div class="form-ok">Merci, votre demande est bien reçue. Nous vous rappelons très vite. Pour une urgence, appelez le <a href="tel:{PHONE_L}">{PHONE_D}</a>.</div>
        <div class="form-row"><label for="n">Nom et prénom</label><input id="n" name="nom" autocomplete="name" required></div>
        <div class="form-grid">
          <div class="form-row"><label for="e">Email</label><input id="e" name="email" type="email" autocomplete="email" required></div>
          <div class="form-row"><label for="t">Téléphone</label><input id="t" name="telephone" type="tel" autocomplete="tel"></div>
        </div>
        <div class="form-row"><label for="m">Votre problème</label><textarea id="m" name="message" placeholder="Décrivez ce qui ne va pas, avec vos mots…"></textarea></div>
        <div class="form-row consent"><input id="c" type="checkbox" required><label for="c" style="font-weight:400;margin:0">J'accepte d'être recontacté(e). Voir la <a href="{R}politique-confidentialite/">politique de confidentialité</a>.</label></div>
        <button class="btn btn--primary btn--lg btn--block" type="submit">Demander de l'aide</button>
      </form>
    </div>"""


def lead_magnet(depth):
    pdf = "../" * depth + "assets/guides/guide-anti-arnaques.pdf"
    return f"""
    <div class="lead-magnet"><div class="lm-ic icon-box" style="margin:0">{SV_IC['guide']}</div><div class="lm-body">
      <h3>Guide gratuit : éviter les arnaques informatiques</h3>
      <p><strong>Les 5 pièges les plus courants</strong> (faux SMS, faux support, hameçonnage…) et comment réagir. Laissez votre email pour le télécharger, ou téléchargez-le directement.</p>
      <form data-demo-form data-type="guide" novalidate>
        <div class="form-ok">Merci ! <a href="{pdf}" target="_blank" rel="noopener"><strong>Télécharger le guide (PDF)</strong></a>.</div>
        <input type="hidden" name="message" value="Demande du guide anti-arnaques">
        <input name="email" type="email" placeholder="Votre email" required aria-label="Votre email">
        <button class="btn btn--primary" type="submit">Télécharger le guide</button>
      </form>
      <p class="lm-rgpd">Votre email sert uniquement à vous recontacter ; il n'est jamais revendu. <a href="{"../" * depth}politique-confidentialite/">Confidentialité</a></p>
      <p style="margin:10px 0 0;font-size:.88rem"><a href="{pdf}" target="_blank" rel="noopener">Télécharger directement (PDF)</a></p>
    </div></div>"""


def offres_cards(depth, niveau=3):
    """niveau : 3 sous un titre de section (accueil), 2 directement sous le h1 (page tarifs)."""
    R = "../" * depth
    o, f = ("h3", "h3") if niveau == 3 else ('h2 class="h3"', "h2")
    return f"""
    <div class="offers">
      <div class="offer offer--main">
        <span class="offer-badge">Le plus serein</span>
        <{o}>Abonnement sérénité</{f}>
        <p>Une assistance toute l'année pour ne plus rester bloqué(e). Idéal pour être tranquille, et pour aider un proche.</p>
        <span class="price-from">À partir de</span>
        <div class="price-tag"><span data-setting="abonnement_prix">{PRIX_ABO}</span> €<small> / mois</small></div>
        <ul class="check-list">
          <li>Assistance à distance <strong>illimitée</strong></li>
          <li>Interventions à domicile incluses ou à tarif réduit</li>
          <li>Conseils, mises à jour et sécurité</li>
          <li>Sans engagement de durée</li>
        </ul>
        <a class="btn btn--primary btn--lg btn--block" href="{R}contact/" data-checkout="abonnement">Je m'abonne</a>
      </div>
      <div class="offer">
        <{o}>Intervention ponctuelle</{f}>
        <p>Un souci précis à régler, sans abonnement. À domicile (Île-de-France) ou à distance (partout en France).</p>
        <span class="price-from">À partir de</span>
        <div class="price-tag"><span data-setting="intervention_prix">{PRIX_INT}</span> €</div>
        <ul class="check-list">
          <li>Dépannage à l'unité</li>
          <li>Tarif exact annoncé avant d'intervenir</li>
          <li>Explications claires sur ce qui a été fait</li>
          <li>Paiement simple</li>
        </ul>
        <a class="btn btn--outline btn--lg btn--block" href="{R}contact/" data-checkout="intervention">Être aidé(e) maintenant</a>
      </div>
    </div>"""


def home():
    aides = ad.A[:6]
    cards = "".join(
        f'<a class="pb-card" href="aide/{a["slug"]}/"><span class="pb-cat">{ad.CATEGORIES[a["cat"]]}</span>'
        f'<h3>{a["q"]}</h3><span class="pb-link">Voir l\'aide {marque.ICONES["arrow"]}</span></a>' for a in aides)
    services = [
        ("ordi", "Ordinateur lent ou en panne", "On répare, on nettoie et on redonne de la vitesse à votre ordinateur."),
        ("securite", "Virus et arnaques", "Nettoyage, protection, et des conseils simples pour éviter les pièges."),
        ("internet", "Internet, box et Wi-Fi", "Connexion rétablie et un Wi-Fi qui couvre bien toute la maison."),
        ("donnees", "Photos et sauvegarde", "On récupère, on range et on protège vos souvenirs."),
        ("mobile", "Smartphone et tablette", "Transfert, réglages et prise en main, à votre rythme."),
        ("proches", "Aide aux proches", "Avec patience et pédagogie, pour vos parents ou grands-parents."),
    ]
    sv = "".join(f'<div class="card"><div class="icon-box">{SV_IC[k]}</div><h3>{t}</h3><p>{d}</p></div>' for k, t, d in services)
    steps = [
        ("Vous nous expliquez", "Par téléphone ou via le formulaire, avec vos mots. Pas besoin de connaître les termes techniques."),
        ("On vous annonce le prix", "Avant toute intervention, vous savez ce que ça coûte. Vous décidez ensuite, sans pression."),
        ("On règle le problème", "À distance ou chez vous, et on vous explique ce qui a été fait pour que ça ne se reproduise pas."),
    ]
    steps_html = "".join(f'<div class="step"><div class="num">{i}</div><h3>{t}</h3><p>{d}</p></div>' for i, (t, d) in enumerate(steps, 1))
    faq = [
        ("Combien coûte une intervention ?", f"L'intervention ponctuelle démarre à {PRIX_INT} € et l'abonnement à {PRIX_ABO} € par mois. Le tarif exact vous est toujours annoncé avant d'intervenir."),
        ("Intervenez-vous à domicile ?", "Oui, en Île-de-France. Partout ailleurs en France, nous intervenons à distance : la plupart des soucis se règlent ainsi, sans déplacement."),
        ("Comment fonctionne l'aide à distance ?", "Avec votre accord, nous voyons votre écran grâce à un petit logiciel sécurisé. Vous voyez tout ce que nous faisons et pouvez arrêter à tout moment."),
        ("Puis-je prendre l'abonnement pour un proche ?", "Oui, c'est l'un des usages les plus fréquents. Nous accompagnons votre proche avec patience, chez lui ou à distance."),
        ("Y a-t-il un engagement ?", "Non. L'abonnement est sans engagement de durée et l'intervention ponctuelle se fait à l'unité."),
    ]
    faq_html = "".join(f'<details class="faq-item"><summary>{q}</summary><div class="faq-body"><p>{r}</p></div></details>' for q, r in faq)
    faq_ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": r}} for q, r in faq]}
    body = f"""
<section class="hero">
  <div class="wrap hero-inner">
    <div>
      <span class="eyebrow">Assistance informatique pour les particuliers</span>
      <h1>Un souci avec l'informatique ? On s'en occupe, simplement.</h1>
      <p class="lead">Ordinateur lent, virus, box Internet, photos à récupérer, smartphone à configurer… Nous vous aidons chez vous ou à distance, sans jargon et avec patience.</p>
      <div class="price-chips">
        <span class="price-chip"><small>Intervention</small><b>dès <span data-setting="intervention_prix">{PRIX_INT}</span> €</b></span>
        <span class="price-chip"><small>Abonnement</small><b>dès <span data-setting="abonnement_prix">{PRIX_ABO}</span> € / mois</b></span>
      </div>
      <div class="hero-cta">
        <a class="btn btn--primary btn--lg" href="contact/">Être aidé(e)</a>
        <a class="btn btn--outline btn--lg" href="tel:{PHONE_L}">{IC_PHONE} {PHONE_D}</a>
      </div>
      <p class="hero-note">Tarif annoncé avant toute intervention · Sans engagement</p>
    </div>
    <div class="hero-card">
      <h2>Pourquoi on nous appelle</h2>
      <p class="sub">Ce que nous vous garantissons, à chaque intervention.</p>
      <ul class="check-list">
        <li><strong>On parle votre langage</strong> : aucune question n'est bête.</li>
        <li><strong>Le prix avant</strong> : vous savez ce que vous payez.</li>
        <li><strong>À domicile ou à distance</strong> : vous choisissez.</li>
        <li><strong>Vos données restent à vous</strong> : rien n'est fait sans votre accord.</li>
      </ul>
    </div>
  </div>
</section>

<section class="section" id="services"><div class="wrap">
  <div class="section-head center"><span class="eyebrow">Nos services</span><h2>Tout ce qui vous embête, on s'en occupe</h2></div>
  <div class="grid grid-3">{sv}</div>
</div></section>

<section class="section section--tint"><div class="wrap">
  <div class="section-head center"><span class="eyebrow">Nos formules</span><h2>Abonnement ou intervention, à vous de choisir</h2>
    <p>Des prix clairs, annoncés à l'avance. Aucun engagement caché.</p></div>
  {offres_cards(0)}
  <p class="center" style="margin-top:24px"><a class="text-link" href="abonnement/">Voir le détail des formules {marque.ICONES['arrow']}</a></p>
</div></section>

<section class="section"><div class="wrap">
  <div class="section-head center"><span class="eyebrow">Comment ça marche</span><h2>Trois étapes, sans surprise</h2></div>
  <div class="steps steps--3">{steps_html}</div>
</div></section>

<section class="section section--soft"><div class="wrap">
  <div class="section-head"><span class="eyebrow">Centre d'aide</span><h2>Un souci ? Trouvez la réponse</h2>
    <p>Des explications simples pour les problèmes les plus courants. <a class="text-link" href="aide/">Tout le centre d'aide</a></p></div>
  <div class="pb-grid">{cards}</div>
  <div style="max-width:820px;margin:34px auto 0">{lead_magnet(0)}</div>
</div></section>

<section class="section"><div class="wrap zone">
  <div>
    <span class="eyebrow">Où intervenons-nous ?</span>
    <h2>Chez vous en Île-de-France, à distance partout en France</h2>
    <p class="lead">Nous nous déplaçons en Île-de-France, en priorité au nord de Paris. Partout ailleurs, l'assistance à distance règle la plupart des problèmes.</p>
    <div class="chips"><span class="chip chip--prio">Saint-Denis</span><span class="chip chip--prio">Saint-Ouen</span><span class="chip chip--prio">Aubervilliers</span><span class="chip">Épinay-sur-Seine</span><span class="chip">Pantin</span><span class="chip">Paris</span><span class="chip">Toute l'Île-de-France</span></div>
  </div>
  <div>
    <div class="zone-box"><h3>{marque.ICONES['pin']} À domicile</h3><p>Île-de-France. Frais de déplacement éventuels annoncés avant. <span class="a-completer">[À COMPLÉTER PAR LE PROPRIÉTAIRE]</span></p></div>
    <div class="zone-box"><h3>{IC_PHONE} À distance</h3><p>Partout en France, avec un logiciel sécurisé et votre accord.</p></div>
    <div class="avis-vide" style="margin-top:16px"><strong>Avis clients</strong><br><span class="a-completer">[À COMPLÉTER PAR LE PROPRIÉTAIRE : avis vérifiés uniquement]</span></div>
  </div>
</div></section>

<section class="section section--tint"><div class="wrap">
  <div class="section-head center"><span class="eyebrow">Questions fréquentes</span><h2>Vos questions, nos réponses</h2></div>
  <div class="faq-list">{faq_html}</div>
</div></section>

<section class="section"><div class="wrap">
  <div class="grid grid-2" style="align-items:center;gap:48px">
    <div><span class="eyebrow">On est là</span><h2>Dites-nous ce qui ne va pas</h2><p class="lead">Expliquez votre problème avec vos mots. Nous vous rappelons vite pour trouver la solution, chez vous ou à distance.</p>
      <ul class="check-list" style="margin-top:16px"><li>Sans jargon</li><li>Tarif annoncé avant</li><li>Sans engagement</li></ul>
    </div>
    <div>{contact_form(0)}</div>
  </div>
</div></section>
<script type="application/ld+json">{json.dumps(faq_ld, ensure_ascii=False)}</script>
{org_jsonld()}
"""
    return page(0, "", f"Dépannage informatique à domicile et à distance | {NAME}",
                "DHB Assistance : dépannage et assistance informatique pour les particuliers, à domicile (Île-de-France) et à distance (France). Ordinateur, virus, box, photos. Prix clairs.", body)


def abonnement():
    body = f"""
<section class="page-hero"><div class="wrap">
  {marque.fil_ariane(DOMAIN, 1, [(None, "Abonnement & tarifs")])}
  <span class="eyebrow">Nos formules</span>
  <h1>Abonnement & tarifs : des prix clairs, sans surprise</h1>
  <p>Choisissez la formule qui vous convient. Le tarif exact vous est toujours annoncé avant toute intervention.</p>
</div></section>
<section class="section"><div class="wrap">{offres_cards(1, niveau=2)}
  <p class="center muted" style="max-width:720px;margin:24px auto 0;color:var(--gris-600)">Les montants affichés sont des exemples de départ. <span class="a-completer">[À COMPLÉTER : grille détaillée + mise en place du paiement en ligne (abonnement + intervention).]</span></p>
</div></section>
<section class="section section--tint"><div class="wrap" style="max-width:800px">
  <h2 class="center" style="margin-bottom:30px">Questions fréquentes</h2>
  <details class="faq-item"><summary>Y a-t-il un engagement ?</summary><div class="faq-body"><p>Non. L'abonnement est sans engagement de durée, et l'intervention ponctuelle se fait à l'unité. Vous restez libre.</p></div></details>
  <details class="faq-item"><summary>Intervenez-vous à domicile ?</summary><div class="faq-body"><p>Oui, à domicile en Île-de-France, et à distance partout en France (la plupart des soucis se règlent à distance, sans déplacement).</p></div></details>
  <details class="faq-item"><summary>Comment se passe le paiement ?</summary><div class="faq-body"><p>Simplement, et le tarif vous est toujours annoncé avant. <span class="a-completer">[À COMPLÉTER : moyens de paiement / paiement en ligne.]</span></p></div></details>
  <details class="faq-item"><summary>L'abonnement convient-il pour aider un proche âgé ?</summary><div class="faq-body"><p>Tout à fait : c'est même l'un de ses usages les plus appréciés. On accompagne vos proches avec patience, à distance ou chez eux.</p></div></details>
</div></section>
<section class="section section--tight"><div class="wrap"><div class="cta-band">
  <div><h2>Prêt(e) à être tranquille ?</h2><p>Dites-nous votre besoin, on vous conseille la bonne formule — sans vous pousser à la plus chère.</p></div>
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
            filters += f'<button class="pb-filter" data-cat="{k}">{label}</button>'
    items = ""
    for k, label in ad.CATEGORIES.items():
        for a in cats[k]:
            kw = (a["q"] + " " + a["sym"]).lower().replace('"', "")
            items += f"""<a class="pb-card" href="{a['slug']}/" data-cat="{k}" data-kw="{kw}"><span class="pb-cat">{label}</span><h2 class="h3">{a['q']}</h2><p>{a['sym'][:110]}…</p><span class="pb-link">Voir l'aide</span></a>"""
    js = """<script>(function(){var s=document.getElementById('pb-search'),c=[].slice.call(document.querySelectorAll('.pb-card')),f=[].slice.call(document.querySelectorAll('.pb-filter')),e=document.getElementById('pb-empty'),cat='all';function n(x){return(x||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'')}function a(){var q=n(s.value.trim()),k=0;c.forEach(function(x){var okc=(cat==='all'||x.getAttribute('data-cat')===cat),okq=(!q||n(x.getAttribute('data-kw')).indexOf(q)>-1),sh=okc&&okq;x.style.display=sh?'':'none';if(sh)k++});if(e)e.classList.toggle('show',k===0)}s.addEventListener('input',a);f.forEach(function(b){b.addEventListener('click',function(){f.forEach(function(y){y.classList.remove('active')});b.classList.add('active');cat=b.getAttribute('data-cat');a()})})})();</script>"""
    body = f"""
<section class="page-hero"><div class="wrap">
  {marque.fil_ariane(DOMAIN, 1, [(None, "Centre d'aide")])}
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
<section class="section section--tight"><div class="wrap"><div class="cta-band">
  <div><h2>Vous préférez qu'on s'en occupe ?</h2><p>À domicile en Île-de-France ou à distance partout en France. Sans jargon, sans engagement.</p></div>
  <div class="hero-cta"><a class="btn btn--primary btn--lg" href="../contact/">Être aidé(e)</a><a class="btn btn--ghost btn--lg" href="../abonnement/">Voir l'abonnement</a></div>
</div></div></section>
{js}
"""
    return page(1, "aide/", f"Centre d'aide informatique pour particuliers | {NAME}",
                "Centre d'aide DHB Assistance : réponses simples aux problèmes informatiques du quotidien (ordinateur lent, virus, box, photos, smartphone). Et une aide à domicile ou à distance.", body, extra="")


def aide_page(a):
    r = "../../"
    cats = ad.by_category()
    label = ad.CATEGORIES[a["cat"]]
    causes = "".join(f"<li>{c}</li>" for c in a["causes"])
    checks = "".join(f"<li>{c}</li>" for c in a["check"])
    others, meme_cat = marque.fiches_liees(cats[a["cat"]], ad.A, a)
    others_html = "".join(f'<a href="{r}aide/{o["slug"]}/">{o["q"]}</a>' for o in others)
    faq = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{
        "@type": "Question", "name": a["q"], "acceptedAnswer": {"@type": "Answer",
        "text": a["sym"] + " À essayer : " + " ; ".join(a["check"]) + ". " + a["call"]}}]}
    body = f"""
<section class="page-hero"><div class="wrap">
  {marque.fil_ariane(DOMAIN, 2, [("aide/", "Centre d'aide"), (None, label)], page_courante=a['q'])}
  <span class="pb-cat">{label}</span>
  <h1 style="margin-top:12px">{a['q']}</h1>
  <p>{a['sym']}</p>
  <div class="hero-cta"><a class="btn btn--primary btn--lg" href="{r}contact/">Être aidé(e)</a><a class="btn btn--outline btn--lg" href="tel:{PHONE_L}">{IC_PHONE} {PHONE_D}</a></div>
</div></section>
<section class="section"><div class="wrap">
  <div class="grid grid-2" style="gap:30px;align-items:start">
    <div class="card reveal"><h2 class="h3">Pourquoi ça arrive</h2><ul class="check-list">{causes}</ul></div>
    <div class="card reveal"><h2 class="h3">Ce que vous pouvez essayer</h2><ul class="check-list">{checks}</ul></div>
  </div>
  <div class="article-body" style="max-width:820px;margin-top:40px">
    <div class="callout"><strong>On peut s'en occuper pour vous</strong><br>{a['call']}</div>
    {lead_magnet(2)}
  </div>
</div></section>
<section class="section section--tint"><div class="wrap">
  <h2 class="center" style="margin-bottom:30px">{f"Autres aides « {label} »" if meme_cat else "Autres aides"}</h2>
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
                a["sym"], body)


def contact():
    body = f"""
<section class="page-hero"><div class="wrap">
  {marque.fil_ariane(DOMAIN, 1, [(None, "Contact")])}
  <span class="eyebrow">Contact</span><h1>Besoin d'aide ? Écrivez-nous</h1>
  <p>Un problème à régler ou une question : on vous recontacte vite et on vous aide, chez vous ou à distance.</p>
</div></section>
<section class="section"><div class="wrap"><div class="grid grid-2" style="gap:48px;align-items:start">
  <div class="reveal"><h2>Nos coordonnées</h2>
    <div class="zone-box"><h3>{IC_PHONE} Téléphone</h3><p><a href="tel:{PHONE_L}"><strong>{PHONE_D}</strong></a> <span class="a-completer">[EXEMPLE]</span></p></div>
    <div class="zone-box"><h3>{marque.ICONES['mail']} Email</h3><p><a href="mailto:{EMAIL}">{EMAIL}</a> <span class="a-completer">[EXEMPLE]</span></p></div>
    <div class="zone-box"><h3>{marque.ICONES['pin']} Zone</h3><p>À domicile en Île-de-France · à distance partout en France.</p></div>
    <div class="callout" style="margin-top:16px"><h3>Une urgence ?</h3><p class="mb-0">Appelez directement le <a href="tel:{PHONE_L}"><strong>{PHONE_D}</strong></a>.</p></div>
  </div>
  <div class="reveal">{contact_form(1)}</div>
</div></div></section>
{org_jsonld()}
"""
    return page(1, "contact/", f"Contact — {NAME}",
                "Contactez DHB Assistance pour un dépannage informatique à domicile (IdF) ou à distance (France). Réponse rapide, sans jargon.", body)


def a_propos():
    body = f"""
<section class="page-hero"><div class="wrap">{marque.fil_ariane(DOMAIN, 1, [(None, "À propos")])}
  <span class="eyebrow">À propos</span><h1>Votre informatique, en toute confiance</h1>
  <p>DHB Assistance, c'est l'activité grand public du groupe DHB : une aide informatique proche, patiente et sans jargon.</p></div></section>
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
                "DHB Assistance : aide informatique proche, patiente et sans jargon, à domicile en Île-de-France et à distance partout en France.", body)


def legal(slug, title, h1, blocks):
    body = f"""
<section class="page-hero"><div class="wrap">{marque.fil_ariane(DOMAIN, 1, [(None, h1)])}<h1>{h1}</h1></div></section>
<section class="section"><div class="wrap"><div class="article-body">{blocks}</div></div></section>"""
    return page(1, slug, f"{title} | {NAME}", f"{h1} du site DHB Assistance.", body)


# --- Outil « Arnaque ou pas ? » (lot 16) ---------------------------------------
# 4 situations tirées du guide anti-arnaques (assets/guides/guide-anti-arnaques.pdf),
# avec le bon réflexe et le signal d'alerte du guide. Rien n'est envoyé.
SITUATIONS = [
    ("Le SMS « colis bloqué »",
     "Un SMS vous annonce un colis en attente, avec un lien à cliquer et une petite somme à régler pour le débloquer.",
     ("Je clique sur le lien et je règle la petite somme, ça ira plus vite.",
      "Je ne clique pas : je vais directement sur le site officiel du transporteur."), 1,
     "C'est faux. Ne cliquez pas : allez directement sur le site officiel du transporteur.",
     "un lien bizarre et une petite somme à régler « en urgence »."),
    ("Le faux support « Microsoft »",
     "Un message plein écran affiche une alerte et un numéro à appeler pour « réparer » l'ordinateur.",
     ("Je n'appelle pas, je ne donne aucun accès à distance et je ferme le navigateur.",
      "J'appelle le numéro pour qu'on répare mon ordinateur."), 0,
     "Microsoft ne fait jamais ça. N'appelez pas, ne donnez aucun accès à distance. Fermez le navigateur.",
     "une page qui vous bloque et vous presse d'appeler."),
    ("Le mail de « votre banque »",
     "Un email aux couleurs de votre banque vous demande de « confirmer » vos identifiants en cliquant sur un lien.",
     ("Je clique sur le lien et je confirme mes identifiants.",
      "Je ne saisis jamais mes codes depuis un lien reçu : je tape moi-même l'adresse de ma banque."), 1,
     "Ne saisissez jamais vos codes depuis un lien reçu : connectez-vous en tapant vous-même l'adresse.",
     "on vous demande vos identifiants ou vos codes bancaires."),
    ("L'arnaque sentimentale ou « au bon plan »",
     "Une personne très gentille, rencontrée en ligne mais jamais vue en vrai, vous demande de l'argent, des cartes cadeaux ou un virement.",
     ("Je refuse : je me méfie des demandes d'argent de personnes jamais rencontrées.",
      "J'envoie l'argent, elle a l'air sincère et en a vraiment besoin."), 0,
     "On vous met en confiance avant de demander de l'argent. Méfiez-vous des demandes d'argent de personnes jamais rencontrées.",
     "une demande d'argent, de cartes cadeaux ou de virement."),
]
REFLEXES = ["Ne cliquez pas dans la panique : prenez le temps de vérifier.",
            "Ne communiquez jamais vos mots de passe ou codes bancaires.",
            "Activez la double authentification sur vos comptes importants.",
            "Dans le doute, demandez à un proche ou à un professionnel."]


def outil_arnaques():
    depth, r = 2, "../../"
    blocs = ""
    for i, (titre, situation, choix, bon, reflexe, alerte) in enumerate(SITUATIONS, start=1):
        options = "".join(
            f'<label class="outil-choix"><input type="radio" name="s{i}" value="{k}" data-bon="{1 if k == bon else 0}"> {c}</label>'
            for k, c in enumerate(choix))
        blocs += f"""
    <fieldset class="outil-question card" data-reflexe="{reflexe}" data-alerte="{alerte}">
      <legend><span class="outil-num">{i}</span> {titre}</legend>
      <p>{situation} <strong>Que faites-vous ?</strong></p>
      <div class="outil-choix-liste">{options}</div>
      <div class="outil-retour" role="status" aria-live="polite"></div>
    </fieldset>"""
    reflexes = "".join(f"<li>{x}</li>" for x in REFLEXES)
    js = """<script>(function(){
  var qs = [].slice.call(document.querySelectorAll('#arnaques fieldset')), bons = 0, faits = 0;
  qs.forEach(function (q) {
    q.addEventListener('change', function (e) {
      if (q.dataset.repondu) return;
      q.dataset.repondu = '1'; faits++;
      var ok = e.target.getAttribute('data-bon') === '1'; if (ok) bons++;
      q.querySelectorAll('input').forEach(function (i) { i.disabled = true; });
      q.querySelector('.outil-retour').innerHTML = '<p class="' + (ok ? 'outil-ok' : 'outil-piege') + '"><strong>' +
        (ok ? 'Bon réflexe.' : 'Attention : c\u2019est le piège.') + '</strong> ' + q.dataset.reflexe + '</p><p>Signal d\u2019alerte : ' + q.dataset.alerte + '</p>';
      if (faits === qs.length) {
        var res = document.getElementById('arnaques-resultat');
        res.querySelector('h2').textContent = bons + ' bon' + (bons > 1 ? 's' : '') + ' réflexe' + (bons > 1 ? 's' : '') + ' sur ' + qs.length;
        res.hidden = false; res.querySelector('h2').focus();
        if (window.DHBSuivi && window.DHBSuivi.outil) window.DHBSuivi.outil('arnaque_ou_pas', bons);
      }
    });
  });
})();</script>"""
    body = f"""
<section class="page-hero"><div class="wrap">
  {marque.fil_ariane(DOMAIN, depth, [("aide/", "Centre d'aide"), (None, "Arnaque ou pas ?")])}
  <span class="eyebrow">Testez vos réflexes</span>
  <h1>Arnaque ou pas ? 4 situations pour tester vos réflexes</h1>
  <p>Les pièges les plus courants, tirés de notre guide anti-arnaques. Choisissez ce que vous feriez : la bonne attitude s'affiche aussitôt. Rien n'est envoyé.</p>
</div></section>
<section class="section"><div class="wrap" style="max-width:820px">
  <form id="arnaques" class="outil" onsubmit="return false">{blocs}</form>
  <div id="arnaques-resultat" class="outil-resultat card" hidden>
    <h2 tabindex="-1"></h2>
    <p>Les bons réflexes qui protègent :</p>
    <ul class="check-list">{reflexes}</ul>
    <p>Pour aller plus loin : <a href="{r}aide/reconnaitre-arnaque-sms-colis/">reconnaître une arnaque par SMS ou email</a>,
      <a href="{r}aide/faux-virus-arnaque-microsoft/">le faux message « PC infecté »</a>,
      <a href="{r}aide/compte-facebook-email-pirate/">compte piraté : que faire</a>.</p>
  </div>
  <h2 style="margin-top:48px">Pour aller plus loin</h2>
  {lead_magnet(depth)}
</div></section>
<section class="section section--tight"><div class="wrap"><div class="cta-band">
  <div><h2>Un doute ? On est là pour vous</h2><p>Victime d'une arnaque ou besoin de sécuriser vos appareils : on vous aide à domicile (Île-de-France) ou à distance.</p></div>
  <div class="hero-cta"><a class="btn btn--primary btn--lg" href="{r}contact/">Être aidé(e)</a><a class="btn btn--ghost btn--lg" href="tel:{PHONE_L}">{IC_PHONE} {PHONE_D}</a></div>
</div></div></section>
{js}
"""
    return page(depth, "outils/arnaque-ou-pas/", f"Arnaque ou pas ? Testez vos réflexes | {NAME}",
                "4 situations courantes (faux SMS colis, faux support Microsoft, faux mail de banque, arnaque sentimentale) pour tester vos réflexes et savoir comment réagir.",
                body)


def build():
    pages = {
        "outils/arnaque-ou-pas/index.html": outil_arnaques(),
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
            '<p>DHB Assistance collecte via le formulaire uniquement les informations nécessaires pour vous recontacter et vous aider (nom, email, téléphone, message). Elles ne sont jamais revendues. Avec votre demande, nous enregistrons aussi la page par laquelle vous êtes arrivé(e) sur le site et, le cas échéant, le site ou la campagne qui vous y a conduit(e) (par exemple une recherche Google ou un lien sur un site partenaire), pour savoir comment nos clients nous trouvent. Ces informations restent chez DHB.</p>'
            f'<h2>Vos droits</h2><p>Conformément au RGPD : accès, rectification, suppression. Contact : <a href="mailto:{EMAIL}">{EMAIL}</a>.</p><p class="a-completer">[À COMPLÉTER : durées de conservation des demandes.]</p><h2>Mesure d\'audience (Google Analytics)</h2><p>Avec votre accord uniquement, nous utilisons Google Analytics 4 pour comprendre comment le site est utilisé (pages vues, clics, envoi de formulaires) et l\'améliorer. Les adresses IP sont anonymisées, aucune donnée publicitaire n\'est activée. Sans accord, rien n\'est chargé ni envoyé. Vous pouvez changer d\'avis à tout moment via « Gérer mes cookies » en bas de page. <span class="a-completer">[À COMPLÉTER : durée de conservation GA4 choisie, ex. 14 mois]</span></p>'),
    }
    # Pages de retour paiement (Stripe)
    pages["paiement-reussi/index.html"] = page(1, "paiement-reussi/", f"Merci — {NAME}",
        "Votre paiement a bien été pris en compte. Merci !", indexable=False, body=
        f"""<section class="page-hero"><div class="wrap"><h1>Merci !</h1><p>Votre paiement a bien été pris en compte. On revient vers vous très vite.</p>
        <div class="hero-cta"><a class="btn btn--primary btn--lg" href="../">Retour à l'accueil</a></div></div></section>""")
    pages["paiement-annule/index.html"] = page(1, "paiement-annule/", f"Paiement annulé — {NAME}",
        "Le paiement a été annulé.", indexable=False, body=
        f"""<section class="page-hero"><div class="wrap"><h1>Paiement annulé</h1><p>Aucun montant n'a été débité. Vous pouvez réessayer, ou nous contacter si vous avez une question.</p>
        <div class="hero-cta"><a class="btn btn--primary btn--lg" href="../abonnement/">Voir les formules</a><a class="btn btn--outline btn--lg" href="../contact/">Nous contacter</a></div></div></section>""")

    for a in ad.A:
        pages[f"aide/{a['slug']}/index.html"] = aide_page(a)

    pages["404.html"] = page(0, "404.html", f"Page introuvable | {NAME}", "Page introuvable sur le site DHB Assistance.", f"""
<section class="page-hero"><div class="wrap center">
  <h1>Page introuvable (404)</h1>
  <p style="margin:0 auto">La page que vous cherchez n'existe pas ou a été déplacée.</p>
  <div class="hero-cta" style="justify-content:center;margin-top:24px">
    <a class="btn btn--primary btn--lg" href="./">Retour à l'accueil</a>
    <a class="btn btn--outline btn--lg" href="contact/">Nous contacter</a>
  </div>
</div></section>
<section class="section"><div class="wrap center">
  <p>Vous cherchiez peut-être : <a href="aide/">le centre d'aide</a>, <a href="abonnement/">l'abonnement et les tarifs</a> ou <a href="a-propos/">qui nous sommes</a>.</p>
</div></section>
""", indexable=False)

    def priorite(up):
        if up == "":
            return "1.0"
        if up in ("abonnement/", "aide/", "contact/"):
            return "0.9"
        return "0.7" if up.startswith(("aide/", "outils/")) else "0.3"

    marque.ecrire_site(OUT, DOMAIN, pages, priorite,
                       exclus=("404.html", "paiement-reussi/index.html", "paiement-annule/index.html"))
    open(os.path.join(OUT, "robots.txt"), "w", encoding="utf-8", newline="\n").write(f"User-agent: *\nAllow: /\n\nSitemap: {DOMAIN}/sitemap.xml\n")
    open(os.path.join(OUT, ".nojekyll"), "w").write("")
    print(f"Site PARTICULIERS : {len(pages)} pages + sitemap + robots ({len(ad.A)} fiches d'aide)")


if __name__ == "__main__":
    build()
