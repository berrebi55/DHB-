# -*- coding: utf-8 -*-
import json
import blog_data
from base import (page, breadcrumb, breadcrumb_jsonld, cta_band, lead_magnet, DOMAIN,
                  SERVICES, IC, root)

SERVICE_NAME = {s: n for s, n, _ in SERVICES}
THEME_COLOR = {"A": "#0B2A4A", "B": "#0b8fc6", "C": "#134377", "D": "#2EC4FF", "E": "#06203b"}


def _article_jsonld(a):
    data = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": a["title"],
        "description": a["desc"],
        "inLanguage": "fr-FR",
        "author": {"@type": "Organization", "name": "DHB"},
        "publisher": {"@type": "Organization", "name": "DHB"},
        "mainEntityOfPage": DOMAIN + "/blog/" + a["slug"] + "/",
    }
    return '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False) + '</script>'


def build():
    out = {}

    # ---- Index du blog ----
    cards = ""
    for a in blog_data.ARTICLES:
        c = THEME_COLOR[a["theme"]]
        cards += f"""
        <div class="card post-card reveal">
          <div class="thumb" style="background:linear-gradient(135deg,{c},#2EC4FF)">{blog_data.THEMES[a['theme']]}</div>
          <span class="article-tag" style="margin-bottom:10px">{blog_data.THEMES[a['theme']]}</span>
          <h3>{a['title']}</h3>
          <p class="excerpt">{a['excerpt']}</p>
          <a class="card-link" href="{a['slug']}/">Lire l'article</a>
        </div>"""

    # sommaire par thème
    themes_nav = ""
    for key, label in blog_data.THEMES.items():
        arts = [x for x in blog_data.ARTICLES if x["theme"] == key]
        links = "".join(f'<li><a href="{x["slug"]}/">{x["title"]}</a></li>' for x in arts)
        themes_nav += f'<div class="card reveal"><h3>{label}</h3><ul class="check-list">{links}</ul></div>'

    body = f"""
<section class="page-hero">
  {breadcrumb(1, [(None, "Blog")])}
  <div class="wrap">
    <span class="eyebrow">Le blog DHB</span>
    <h1>Comprendre, prévenir et résoudre vos soucis informatiques</h1>
    <p>Des articles clairs et utiles, écrits pour les dirigeants et les équipes — pas pour les informaticiens. Pannes, sauvegarde, sécurité, messagerie : on répond aux vraies questions que vous vous posez.</p>
  </div>
</section>
<section class="section">
  <div class="wrap">
    <h2 class="center" style="margin-bottom:40px">Tous nos articles</h2>
    <div class="grid grid-3">{cards}</div>
  </div>
</section>
<section class="section section--gris">
  <div class="wrap">
    <div class="center" style="max-width:720px;margin:0 auto 40px">
      <span class="eyebrow">Par thème</span>
      <h2>Explorer par sujet</h2>
      <p class="lead">Nos articles sont organisés en dossiers pour aller droit à ce qui vous concerne.</p>
    </div>
    <div class="grid grid-2">{themes_nav}</div>
  </div>
</section>
{cta_band(1)}
{breadcrumb_jsonld([(DOMAIN + "/", "Accueil"), (DOMAIN + "/blog/", "Blog")])}
"""
    title = "Blog — Maintenance, dépannage et sécurité informatique | DHB"
    desc = ("Le blog DHB : articles clairs et utiles sur le dépannage, la sauvegarde, la cybersécurité "
            "et les outils informatiques pour les entreprises. Des réponses sans jargon.")
    out["blog/index.html"] = page(1, "blog/", title, desc, body)

    # ---- Articles ----
    for a in blog_data.ARTICLES:
        depth = 2
        r = root(depth)
        theme_label = blog_data.THEMES[a["theme"]]
        svc = a.get("service")
        svc_block = ""
        if svc:
            svc_block = f"""
            <div class="callout" style="background:#f0f7ff">
              <strong>Le service DHB associé :</strong> {SERVICE_NAME[svc]}.
              <a href="{r}services/{svc}/">Découvrir ce service →</a>
            </div>"""

        related = a.get("related", [])[:3]
        rel_html = ""
        for slug in related:
            ra = blog_data.get(slug)
            if ra:
                rel_html += f'<a href="{r}blog/{slug}/">{ra["title"]}</a>'
        related_block = ""
        if rel_html:
            related_block = f"""
            <section class="section section--gris">
              <div class="wrap">
                <h2 class="center" style="margin-bottom:30px">À lire aussi</h2>
                <div class="related">{rel_html}</div>
              </div>
            </section>"""

        c = THEME_COLOR[a["theme"]]
        body = f"""
<section class="page-hero">
  {breadcrumb(depth, [("blog/", "Blog"), (None, theme_label)])}
  <div class="wrap">
    <span class="article-tag" style="background:rgba(255,255,255,.12);color:#fff;border-color:rgba(255,255,255,.25)">{theme_label}</span>
    <h1 style="margin-top:14px">{a['title']}</h1>
    <div class="article-meta" style="color:#c3d4e6;margin-top:10px">
      <span>Par l'équipe DHB</span><span>·</span><span>Lecture ~6 min</span>
    </div>
  </div>
</section>
<article class="section">
  <div class="wrap">
    <div class="article-body">
      {a['body']}
      {svc_block}
      {lead_magnet(theme_label.lower())}
    </div>
  </div>
</article>
{related_block}
{cta_band(depth)}
{_article_jsonld(a)}
{breadcrumb_jsonld([(DOMAIN + "/", "Accueil"), (DOMAIN + "/blog/", "Blog"), (DOMAIN + "/blog/" + a['slug'] + "/", a['title'])])}
"""
        title = f"{a['title']} | DHB"
        out[f"blog/{a['slug']}/index.html"] = page(depth, f"blog/{a['slug']}/", title, a["desc"], body, og_type="article")

    return out
