# -*- coding: utf-8 -*-
import json
import problems_data as pd
import blog_data
from base import (page, breadcrumb, breadcrumb_jsonld, cta_band, contact_form,
                  faq_jsonld, IC, DOMAIN, SERVICES, PHONE_DISPLAY, PHONE_LINK, root)

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
              <h3>{p['q']}</h3>
              <p>{p['sym']}</p>
              <span class="pb-link">Voir les causes et solutions →</span>
            </a>"""

    extra_css = """
<style>
.pb-toolbar{position:sticky;top:76px;z-index:20;background:var(--blanc);padding:18px 0;border-bottom:1px solid var(--gris-100)}
.pb-search{max-width:560px;margin:0 auto 14px;position:relative}
.pb-search input{padding-left:44px}
.pb-search svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--gris-400)}
.pb-filters{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.pb-filter{border:1.5px solid var(--gris-200);background:#fff;color:var(--nuit);padding:8px 15px;border-radius:999px;font-weight:600;font-size:.88rem;cursor:pointer;transition:all .2s;font-family:inherit}
.pb-filter:hover{border-color:var(--cyan)}
.pb-filter.active{background:var(--nuit);color:#fff;border-color:var(--nuit)}
.pb-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:34px}
.pb-card{display:flex;flex-direction:column;background:#fff;border:1px solid var(--gris-100);border-radius:var(--rayon);padding:22px;box-shadow:var(--ombre-douce);transition:transform .2s,box-shadow .2s;color:inherit}
.pb-card:hover{transform:translateY(-4px);box-shadow:var(--ombre);color:inherit}
.pb-cat{display:inline-block;align-self:flex-start;font-size:.72rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--cyan-700);background:var(--gris-50);border:1px solid var(--gris-100);padding:3px 10px;border-radius:999px;margin-bottom:12px}
.pb-card h3{font-size:1.08rem;margin-bottom:8px}
.pb-card p{font-size:.93rem;margin-bottom:14px;flex:1}
.pb-link{font-weight:700;color:var(--cyan-700);font-size:.92rem}
.pb-empty{display:none;text-align:center;color:var(--gris-600);padding:40px}
.pb-empty.show{display:block}
@media(max-width:960px){.pb-grid{grid-template-columns:repeat(2,1fr)}.pb-toolbar{top:0}}
@media(max-width:680px){.pb-grid{grid-template-columns:1fr}}
</style>"""

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
    <p>Un problème précis ? Cherchez-le dans notre base de <strong id="pb-count">{len(pd.P)}</strong> pannes courantes en entreprise, formulées comme vous les tapez dans Google. Pour chacune : les causes, ce que vous pouvez vérifier vous-même, et quand faire appel à nous.</p>
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
    desc = ("Base de pannes informatiques fréquentes en entreprise : ordinateur lent, écran bleu, plus d'internet, "
            "imprimante hors ligne, messagerie en panne… Causes, vérifications et solutions. DHB, IdF & à distance.")
    out["pannes-frequentes/index.html"] = page(1, "pannes-frequentes/", title, desc, body, extra_head=extra_css)

    # ---------- PAGES par problème ----------
    for p in pd.P:
        depth = 2
        r = root(depth)
        cat_label = pd.CATEGORIES[p["cat"]]
        causes = "".join(f"<li>{c}</li>" for c in p["causes"])
        checks = "".join(f"<li>{c}</li>" for c in p["check"])
        svc = p["service"]
        svc_name = SERVICE_NAME[svc]

        art_block = ""
        if p.get("article") and p["article"] in ART:
            a = ART[p["article"]]
            art_block = f'<li><a href="{r}blog/{a["slug"]}/">{a["title"]}</a></li>'

        # autres pannes de la même catégorie
        others = [x for x in pd.by_category()[p["cat"]] if x["slug"] != p["slug"]][:4]
        others_html = "".join(
            f'<a href="{r}pannes-frequentes/{o["slug"]}/">{o["q"]}</a>' for o in others
        )

        body = f"""
<section class="page-hero">
  {breadcrumb(depth, [("pannes-frequentes/", "Pannes fréquentes"), (None, cat_label)])}
  <div class="wrap">
    <span class="article-tag" style="background:rgba(255,255,255,.12);color:#fff;border-color:rgba(255,255,255,.25)">{cat_label}</span>
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
      <h3>Causes les plus fréquentes</h3>
      <ul class="check-list">{causes}</ul>
    </div>
    <div class="card reveal">
      <div class="icon-box">{IC['check']}</div>
      <h3>Ce que vous pouvez vérifier vous-même</h3>
      <ul class="check-list">{checks}</ul>
    </div>
  </div>

  <div class="article-body" style="max-width:820px;margin-top:40px">
    <div class="callout"><strong>Quand faire appel à un professionnel ?</strong><br>{p['call']}</div>
    <h2>Comment DHB vous aide</h2>
    <p>Ce problème relève de notre service <a href="{r}services/{svc}/"><strong>{svc_name}</strong></a>. Nous intervenons sur site en Île-de-France et à distance partout en France, avec un interlocuteur unique, un langage clair et un devis gratuit sans engagement.</p>
    <ul class="check-list" style="margin-top:0">
      <li><a href="{r}services/{svc}/">Découvrir le service : {svc_name}</a></li>
      {art_block}
      <li><a href="{r}pannes-frequentes/">Voir toutes les pannes fréquentes</a></li>
    </ul>
  </div>
</div></section>

<section class="section section--gris"><div class="wrap">
  <h2 class="center" style="margin-bottom:30px">Autres pannes de la catégorie « {cat_label} »</h2>
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
    <div class="reveal">{contact_form(depth, title="Décrire mon problème")}</div>
  </div>
</div></section>

{_problem_faq_jsonld(p)}
{breadcrumb_jsonld([(DOMAIN + "/", "Accueil"), (DOMAIN + "/pannes-frequentes/", "Pannes fréquentes"), (DOMAIN + "/pannes-frequentes/" + p['slug'] + "/", p['q'])])}
"""
        title = f"{p['q']} — causes et solutions | DHB"
        desc = (p["sym"][:150] + " Causes, vérifications et solutions. Dépannage DHB sur site en IdF et à distance.")
        out[f"pannes-frequentes/{p['slug']}/index.html"] = page(depth, f"pannes-frequentes/{p['slug']}/", title, desc, body)

    return out
