# -*- coding: utf-8 -*-
import json
import problems_data as pd
import blog_data
import marque
from base import (page, breadcrumb, breadcrumb_jsonld, cta_band, contact_form,
                  lead_magnet, faq_jsonld, IC, DOMAIN, SERVICES, PHONE_DISPLAY, PHONE_LINK, root)

SERVICE_NAME = {s: n for s, n, _ in SERVICES}
ART = {a["slug"]: a for a in blog_data.ARTICLES}


def _problem_faq_jsonld(p):
    """Une FAQPage par page de problème (symptôme/solution)."""
    answer = p["sym"] + " Causes fréquentes : " + " ; ".join(p["causes"]) + ". À vérifier : " + " ; ".join(p["check"]) + ". " + p["call"]
    data = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [{
            "@type": "Question",
            "name": p["q"],
            "acceptedAnswer": {"@type": "Answer", "text": answer},
        }],
    }
    return '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False) + '</script>'


def build():
    out = {}
    cats = pd.by_category()

    # ---------- INDEX : base de pannes avec recherche/filtre ----------
    # Barre de filtres par catégorie
    filters = '<button class="pb-filter active" data-cat="all">Toutes</button>'
    for key, label in pd.CATEGORIES.items():
        if cats[key]:
            filters += f'<button class="pb-filter" data-cat="{key}">{label}</button>'

    items = ""
    for key, label in pd.CATEGORIES.items():
        for p in cats[key]:
            kws = (p["q"] + " " + p["sym"]).lower().replace('"', "")
            items += f"""
            <a class="pb-card" href="{p['slug']}/" data-cat="{key}" data-kw="{kws}">
              <span class="pb-cat">{label}</span>
              <h2 class="h3">{p['q']}</h2>
              <p>{p['sym']}</p>
              <span class="pb-link">Voir les causes et solutions →</span>
            </a>"""

    extra_css = ""  # styles des filtres : feuille commune (.pb-*)

    filter_js = """
<script>
(function(){
  var search=document.getElementById('pb-search');
  var cards=[].slice.call(document.querySelectorAll('.pb-card'));
  var filters=[].slice.call(document.querySelectorAll('.pb-filter'));
  var empty=document.getElementById('pb-empty');
  var count=document.getElementById('pb-count');
  var cat='all';
  function norm(s){return (s||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');}
  function apply(){
    var q=norm(search.value.trim());var n=0;
    cards.forEach(function(c){
      var okc=(cat==='all'||c.getAttribute('data-cat')===cat);
      var okq=(!q||norm(c.getAttribute('data-kw')).indexOf(q)>-1);
      var show=okc&&okq;c.style.display=show?'':'none';if(show)n++;
    });
    if(empty)empty.classList.toggle('show',n===0);
    if(count)count.textContent=n;
  }
  search.addEventListener('input',apply);
  filters.forEach(function(f){f.addEventListener('click',function(){
    filters.forEach(function(x){x.classList.remove('active')});f.classList.add('active');
    cat=f.getAttribute('data-cat');apply();
  });});
})();
</script>"""

    body = f"""
<section class="page-hero">
  {breadcrumb(1, [(None, "Pannes fréquentes")])}
  <div class="wrap">
    <span class="eyebrow">Base de pannes informatiques</span>
    <h1>Pannes informatiques fréquentes : causes et solutions</h1>
    <p>Un problème précis ? Cherchez-le dans notre base de <strong id="pb-count">{len(pd.P)}</strong> pannes et questions courantes en entreprise, formulées comme vous les tapez dans Google. Pour chacune : les causes ou repères, ce que vous pouvez faire vous-même, et comment on vous aide.</p>
  </div>
</section>

<div class="pb-toolbar">
  <div class="wrap">
    <div class="pb-search">
      {IC['eye']}
      <input id="pb-search" type="search" placeholder="Rechercher une panne (ex : imprimante, écran bleu, plus d'internet…)" aria-label="Rechercher une panne">
    </div>
    <div class="pb-filters">{filters}</div>
  </div>
</div>

<section class="section section--tight">
  <div class="wrap">
    <div class="pb-grid">{items}</div>
    <div class="pb-empty" id="pb-empty"><p>Aucune panne ne correspond à votre recherche. <a href="{root(1)}contact/">Décrivez-nous votre problème</a>, on vous répond sous 24h.</p></div>
  </div>
</section>

{cta_band(1)}
{breadcrumb_jsonld([(DOMAIN + "/", "Accueil"), (DOMAIN + "/pannes-frequentes/", "Pannes fréquentes")])}
{filter_js}
"""
    title = "Pannes informatiques fréquentes : causes et solutions | DHB"
    desc = ("Pannes informatiques fréquentes en entreprise : ordinateur lent, écran bleu, plus d'internet, "
            "imprimante hors ligne… Causes, vérifications et solutions.")
    out["pannes-frequentes/index.html"] = page(1, "pannes-frequentes/", title, desc, body, extra_head=extra_css)

    # ---------- PAGES par problème ----------
    for p in pd.P:
        depth = 2
        r = root(depth)
        cat_label = pd.CATEGORIES[p["cat"]]
        is_dec = p["cat"] in getattr(pd, "DECISION_CATS", set())
        lbl_causes = "Ce qui entre en jeu" if is_dec else "Causes les plus fréquentes"
        lbl_check = "Nos repères & conseils" if is_dec else "Ce que vous pouvez vérifier vous-même"
        lbl_callout = "En résumé" if is_dec else "Quand faire appel à un professionnel ?"
        word = "questions" if is_dec else "pannes"
        causes = "".join(f"<li>{c}</li>" for c in p["causes"])
        checks = "".join(f"<li>{c}</li>" for c in p["check"])
        svc = p["service"]
        svc_name = SERVICE_NAME[svc]

        art_block = ""
        if p.get("article") and p["article"] in ART:
            a = ART[p["article"]]
            art_block = f'<li><a href="{r}blog/{a["slug"]}/">{a["title"]}</a></li>'

        # autres pannes de la même catégorie
        others, meme_cat = marque.fiches_liees(pd.by_category()[p["cat"]], pd.P, p)
        others_html = "".join(
            f'<a href="{r}pannes-frequentes/{o["slug"]}/">{o["q"]}</a>' for o in others
        )

        body = f"""
<section class="page-hero">
  {breadcrumb(depth, [("pannes-frequentes/", "Pannes fréquentes"), (None, cat_label)])}
  <div class="wrap">
    <span class="article-tag">{cat_label}</span>
    <h1 style="margin-top:14px">{p['q']}</h1>
    <p>{p['sym']}</p>
    <div class="hero-cta">
      <a class="btn btn--primary btn--lg" href="{r}contact/">Demander de l'aide</a>
      <a class="btn btn--ghost btn--lg" href="tel:{PHONE_LINK}">{IC['phone']} {PHONE_DISPLAY}</a>
    </div>
  </div>
</section>

<section class="section"><div class="wrap">
  <div class="grid grid-2" style="gap:30px;align-items:start">
    <div class="card reveal">
      <div class="icon-box" style="background:linear-gradient(145deg,#f59e0b,#f97316)">{IC['wrench']}</div>
      <h2 class="h3">{lbl_causes}</h2>
      <ul class="check-list">{causes}</ul>
    </div>
    <div class="card reveal">
      <div class="icon-box">{IC['check']}</div>
      <h2 class="h3">{lbl_check}</h2>
      <ul class="check-list">{checks}</ul>
    </div>
  </div>

  <div class="article-body" style="max-width:820px;margin-top:40px">
    <div class="callout"><strong>{lbl_callout}</strong><br>{p['call']}</div>
    <h2>Comment DHB vous aide</h2>
    <p>Ce problème relève de notre service <a href="{r}services/{svc}/"><strong>{svc_name}</strong></a>. Nous intervenons sur site en Île-de-France et à distance partout en France, avec un interlocuteur unique, un langage clair et un devis gratuit sans engagement.</p>
    <ul class="check-list" style="margin-top:0">
      <li><a href="{r}services/{svc}/">Découvrir le service : {svc_name}</a></li>
      {art_block}
      <li><a href="{r}pannes-frequentes/">Voir toutes les pannes fréquentes</a></li>
    </ul>
    {lead_magnet(cat_label.lower())}
  </div>
</div></section>

<section class="section section--gris"><div class="wrap">
  <h2 class="center" style="margin-bottom:30px">{f"Autres {word} de la catégorie « {cat_label} »" if meme_cat else "À voir aussi"}</h2>
  <div class="related">{others_html}</div>
</div></section>

<section class="section"><div class="wrap">
  <div class="grid grid-2" style="align-items:center;gap:48px">
    <div class="reveal">
      <span class="eyebrow">On s'en occupe</span>
      <h2>Ce problème vous bloque ?</h2>
      <p class="lead">Décrivez-nous la situation. On vous répond sous 24h ouvrées — souvent, on résout à distance dans la foulée.</p>
      <ul class="check-list" style="margin-top:16px"><li>Réponse sous 24h ouvrées</li><li>Dépannage à distance ou sur site</li><li>Sans engagement</li></ul>
    </div>
    <div class="reveal">{contact_form(depth, title="Décrire mon problème", service=svc)}</div>
  </div>
</div></section>

{_problem_faq_jsonld(p)}
{breadcrumb_jsonld([(DOMAIN + "/", "Accueil"), (DOMAIN + "/pannes-frequentes/", "Pannes fréquentes"), (DOMAIN + "/pannes-frequentes/" + p['slug'] + "/", p['q'])])}
"""
        if is_dec:
            title = f"{p['q']} | DHB"
            desc = p["sym"]
        else:
            title = f"{p['q']} — causes et solutions | DHB"
            # Symptôme entier (jamais coupé au milieu d'un mot), complété si la place le permet.
            desc = next((d for d in (p["sym"] + " Causes, vérifications et solutions. Dépannage DHB sur site en IdF et à distance.",
                                     p["sym"] + " Causes, vérifications et solutions.") if len(d) <= 160), p["sym"])
        out[f"pannes-frequentes/{p['slug']}/index.html"] = page(depth, f"pannes-frequentes/{p['slug']}/", title, desc, body)

    return out
