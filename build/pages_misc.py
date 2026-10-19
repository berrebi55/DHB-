# -*- coding: utf-8 -*-
from base import (page, breadcrumb, breadcrumb_jsonld, cta_band, contact_form,
                  localbusiness_jsonld, IC, DOMAIN, SERVICES, VILLES,
                  PHONE_DISPLAY, PHONE_LINK, EMAIL, SIGNATURE, SITE_NAME, root)
import blog_data
import problems_data as pd


def build():
    out = {}

    # ---------- À PROPOS ----------
    valeurs = [
        ("user", "Proximité", "Un interlocuteur unique qui vous connaît, vous et votre installation. Pas de standard anonyme."),
        ("chat", "Clarté", "On explique tout en langage simple. Vous comprenez ce qu'on fait et pourquoi."),
        ("eyeopen", "Transparence", "Pas de prix caché, pas d'engagement piège. Vos données et vos accès restent les vôtres."),
        ("bolt", "Prévention", "On anticipe plutôt que de subir. La supervision détecte les problèmes avant qu'ils ne vous bloquent."),
    ]
    val_html = "".join(
        f'<div class="engagement reveal"><div class="ic">{IC[i]}</div><div><h3>{t}</h3><p>{d}</p></div></div>'
        for i, t, d in valeurs
    )
    body = f"""
<section class="page-hero">
  {breadcrumb(1, [(None, "À propos")])}
  <div class="wrap">
    <span class="eyebrow">À propos de DHB</span>
    <h1>Une entreprise nouvelle, disponible et impliquée</h1>
    <p>Nous ne vous raconterons pas que nous gérons des milliers de clients depuis vingt ans. Nous sommes une structure récente — et nous en faisons une force.</p>
  </div>
</section>

<section class="section"><div class="wrap">
  <div class="article-body" style="max-width:820px">
    <h2>Notre histoire, honnêtement</h2>
    <p>DHB est né d'un constat simple : trop d'entreprises subissent leur informatique. Elles jonglent avec des pannes à répétition, des sauvegardes incertaines, une sécurité approximative, et des prestataires qui parlent un langage incompréhensible ou ne répondent jamais. Nous avons voulu créer l'inverse : un partenaire informatique à taille humaine, réactif, transparent, qui prend le temps d'expliquer et qui s'implique vraiment.</p>
    <p>Être une entreprise nouvelle, ce n'est pas une faiblesse à cacher : c'est la promesse d'une disponibilité et d'un engagement que les grosses structures ne peuvent plus offrir. Quand vous nous confiez votre informatique, vous comptez pour nous. Chaque client est important, chaque demande est traitée, chaque problème est suivi par quelqu'un qui connaît votre dossier.</p>
    <blockquote>Nous préférons une page honnête, sans faux avis ni chiffres inventés, à des promesses que nous ne pourrions pas tenir. Notre crédibilité, nous la construisons avec chaque client, un engagement tenu à la fois.</blockquote>
    <h2>Ce qui nous distingue</h2>
    <p>Nous sommes modernes dans notre approche : nous ne nous contentons pas de réparer quand ça casse, nous supervisons et nous anticipons. Nous sommes clairs dans notre discours : pas de jargon pour impressionner, mais des explications que vous comprenez. Et nous sommes transparents dans notre relation : des engagements précis, des devis gratuits et détaillés, aucun prix caché.</p>
    <h2>Notre zone d'action</h2>
    <p>Nous intervenons sur site dans toute l'Île-de-France (Paris, Hauts-de-Seine, Seine-Saint-Denis, Val-de-Marne, Yvelines, Val-d'Oise et au-delà) et nous assurons le support, la maintenance et la supervision à distance pour les entreprises de toute la France.</p>
    <p class="a-completer">[À COMPLÉTER PAR LE PROPRIÉTAIRE : présentation du ou des fondateurs, parcours, éventuelles certifications et diplômes réels, forme juridique et date de création de l'entreprise.]</p>
  </div>
</div></section>

<section class="section section--nuit"><div class="wrap">
  <div class="center" style="max-width:700px;margin:0 auto 46px">
    <span class="eyebrow">Nos valeurs</span>
    <h2>Ce qui nous guide au quotidien</h2>
  </div>
  <div class="grid grid-2">{val_html}</div>
</div></section>

<section class="section section--gris"><div class="wrap">
  <div class="center" style="max-width:700px;margin:0 auto 40px">
    <span class="eyebrow">Confiance</span>
    <h2>Nos engagements</h2>
  </div>
  <div class="card reveal" style="max-width:760px;margin:0 auto">
    <ul class="check-list">
      <li>Réponse à toute demande sous 24h ouvrées.</li>
      <li>Un interlocuteur unique qui suit votre dossier.</li>
      <li>Un devis gratuit, détaillé et sans engagement avant toute intervention facturée.</li>
      <li>Des explications en langage clair, jamais de jargon pour impressionner.</li>
      <li>Une sauvegarde testée : on vérifie qu'elle se restaure vraiment.</li>
      <li>Vos données et vos accès restent les vôtres, documentés et réversibles.</li>
    </ul>
  </div>
</div></section>

{cta_band(1)}
{localbusiness_jsonld()}
{breadcrumb_jsonld([(DOMAIN + "/", "Accueil"), (DOMAIN + "/a-propos/", "À propos")])}
"""
    out["a-propos/index.html"] = page(1, "a-propos/",
        "À propos — DHB, maintenance & sécurité informatique pour entreprises",
        "DHB, prestataire informatique à taille humaine : disponible, transparent et impliqué. Sur site en Île-de-France, à distance partout en France. Découvrez notre approche.",
        body)

    # ---------- CONTACT ----------
    body = f"""
<section class="page-hero">
  {breadcrumb(1, [(None, "Contact")])}
  <div class="wrap">
    <span class="eyebrow">Contact</span>
    <h1>Parlons de votre informatique</h1>
    <p>Un problème à régler, un projet, ou simplement l'envie d'y voir plus clair ? Écrivez-nous ou appelez-nous. L'audit est gratuit et sans engagement.</p>
  </div>
</section>

<section class="section"><div class="wrap">
  <div class="grid grid-2" style="gap:48px;align-items:start">
    <div class="reveal">
      <h2>Nos coordonnées</h2>
      <div class="engagement"><div class="ic">{IC['phone']}</div><div><h3>Téléphone</h3><p><a href="tel:{PHONE_LINK}">{PHONE_DISPLAY}</a> <span class="a-completer">[EXEMPLE]</span></p></div></div>
      <div class="engagement"><div class="ic">{IC['mail']}</div><div><h3>Email</h3><p><a href="mailto:{EMAIL}">{EMAIL}</a> <span class="a-completer">[EXEMPLE]</span></p></div></div>
      <div class="engagement"><div class="ic">{IC['wa']}</div><div><h3>WhatsApp</h3><p>Écrivez-nous directement, réponse rapide en journée.</p></div></div>
      <div class="engagement"><div class="ic">{IC['clock']}</div><div><h3>Horaires</h3><p>Du lundi au vendredi, 9h – 18h. Réponse à toute demande sous 24h ouvrées. <span class="a-completer">[À COMPLÉTER]</span></p></div></div>
      <div class="engagement"><div class="ic">{IC['map']}</div><div><h3>Zone d'intervention</h3><p>Sur site en Île-de-France · à distance partout en France.</p></div></div>
      <div class="card" style="margin-top:20px;background:#f0f7ff;border-color:#bae0ff">
        <h3>Une urgence qui vous bloque ?</h3>
        <p class="mb-0">Appelez directement le <a href="tel:{PHONE_LINK}"><strong>{PHONE_DISPLAY}</strong></a>. Les urgences bloquantes sont traitées en priorité.</p>
      </div>
    </div>
    <div class="reveal">{contact_form(1, title="Demander un audit gratuit")}</div>
  </div>
</div></section>

{localbusiness_jsonld()}
{breadcrumb_jsonld([(DOMAIN + "/", "Accueil"), (DOMAIN + "/contact/", "Contact")])}
"""
    out["contact/index.html"] = page(1, "contact/",
        "Contact — DHB, dépannage & maintenance informatique entreprises",
        "Contactez DHB pour votre maintenance, dépannage ou sécurité informatique. Audit gratuit, réponse sous 24h ouvrées. Sur site en Île-de-France, à distance partout en France.",
        body)

    # ---------- MENTIONS LÉGALES ----------
    body = f"""
<section class="page-hero">
  {breadcrumb(1, [(None, "Mentions légales")])}
  <div class="wrap"><h1>Mentions légales</h1><p>Informations légales relatives au site {SITE_NAME}.</p></div>
</section>
<section class="section"><div class="wrap"><div class="article-body">
  <div class="callout"><strong>Modèle à compléter.</strong> Les mentions légales sont obligatoires. Remplacez les champs <span class="a-completer">[À COMPLÉTER]</span> par les informations réelles de l'entreprise avant la mise en ligne.</div>
  <h2>Éditeur du site</h2>
  <p>{SITE_NAME} — {SIGNATURE}<br>
  Forme juridique : <span class="a-completer">[À COMPLÉTER : SARL, SAS, auto-entrepreneur…]</span><br>
  Capital social : <span class="a-completer">[À COMPLÉTER]</span><br>
  Siège social : <span class="a-completer">[À COMPLÉTER : adresse]</span><br>
  SIRET : <span class="a-completer">[À COMPLÉTER]</span> — RCS : <span class="a-completer">[À COMPLÉTER]</span><br>
  TVA intracommunautaire : <span class="a-completer">[À COMPLÉTER]</span><br>
  Téléphone : {PHONE_DISPLAY} — Email : {EMAIL}<br>
  Directeur de la publication : <span class="a-completer">[À COMPLÉTER : nom]</span></p>
  <h2>Hébergement</h2>
  <p>Le site est hébergé par : <span class="a-completer">[À COMPLÉTER : nom de l'hébergeur, adresse et téléphone]</span>.</p>
  <h2>Propriété intellectuelle</h2>
  <p>L'ensemble des contenus de ce site (textes, visuels, logo, structure) est la propriété de {SITE_NAME}, sauf mention contraire. Toute reproduction sans autorisation est interdite.</p>
  <h2>Données personnelles</h2>
  <p>Le traitement des données personnelles est décrit dans notre <a href="{root(1)}politique-confidentialite/">politique de confidentialité</a>. Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données.</p>
  <h2>Cookies</h2>
  <p>Ce site utilise des cookies nécessaires à son fonctionnement et, avec votre consentement, des cookies de mesure d'audience. Vous pouvez gérer votre choix via le bandeau prévu à cet effet.</p>
  <h2>Crédits</h2>
  <p>Conception et rédaction du site : <span class="a-completer">[À COMPLÉTER]</span>.</p>
</div></div></section>
{breadcrumb_jsonld([(DOMAIN + "/", "Accueil"), (DOMAIN + "/mentions-legales/", "Mentions légales")])}
"""
    out["mentions-legales/index.html"] = page(1, "mentions-legales/",
        "Mentions légales | DHB", "Mentions légales du site DHB — maintenance et sécurité informatique pour les entreprises.", body)

    # ---------- POLITIQUE DE CONFIDENTIALITÉ ----------
    body = f"""
<section class="page-hero">
  {breadcrumb(1, [(None, "Politique de confidentialité")])}
  <div class="wrap"><h1>Politique de confidentialité (RGPD)</h1><p>Comment nous collectons, utilisons et protégeons vos données personnelles.</p></div>
</section>
<section class="section"><div class="wrap"><div class="article-body">
  <div class="callout"><strong>Modèle à adapter.</strong> Faites vérifier cette politique au regard de votre activité réelle et des outils que vous utilisez. Les champs <span class="a-completer">[À COMPLÉTER]</span> sont à renseigner.</div>
  <h2>Responsable du traitement</h2>
  <p>Le responsable du traitement des données collectées sur ce site est {SITE_NAME}. Pour toute question, contactez-nous à <a href="mailto:{EMAIL}">{EMAIL}</a> <span class="a-completer">[À COMPLÉTER]</span>.</p>
  <h2>Quelles données collectons-nous ?</h2>
  <p>Via le formulaire de contact, nous collectons uniquement les informations que vous nous transmettez : nom, nom de l'entreprise, adresse email, numéro de téléphone et le contenu de votre message. Nous ne collectons aucune donnée sensible.</p>
  <h2>Pourquoi ?</h2>
  <p>Ces données servent exclusivement à répondre à votre demande et à vous recontacter. Elles ne sont jamais revendues ni cédées à des tiers à des fins commerciales.</p>
  <h2>Combien de temps les conservons-nous ?</h2>
  <p>Vos données sont conservées le temps nécessaire au traitement de votre demande, puis pendant la durée de notre relation commerciale, et au maximum <span class="a-completer">[À COMPLÉTER : ex. 3 ans après le dernier contact]</span>.</p>
  <h2>Cookies et mesure d'audience</h2>
  <p>Ce site dépose des cookies strictement nécessaires à son fonctionnement. Avec votre consentement (via le bandeau), des cookies de mesure d'audience peuvent être utilisés pour améliorer le site. Vous pouvez refuser ces derniers aussi simplement que les accepter, à tout moment.</p>
  <h2>Vos droits</h2>
  <p>Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez d'un droit d'accès, de rectification, d'effacement, d'opposition et de portabilité de vos données. Pour exercer ces droits, écrivez-nous à <a href="mailto:{EMAIL}">{EMAIL}</a>. Vous pouvez également introduire une réclamation auprès de la CNIL (www.cnil.fr).</p>
  <h2>Sécurité</h2>
  <p>Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre la perte, l'accès non autorisé ou la divulgation.</p>
</div></div></section>
{breadcrumb_jsonld([(DOMAIN + "/", "Accueil"), (DOMAIN + "/politique-confidentialite/", "Politique de confidentialité")])}
"""
    out["politique-confidentialite/index.html"] = page(1, "politique-confidentialite/",
        "Politique de confidentialité (RGPD) | DHB", "Politique de confidentialité et gestion des données personnelles du site DHB, conformément au RGPD.", body)

    # ---------- PLAN DU SITE (HTML) ----------
    serv_links = "".join(f'<li><a href="{root(1)}services/{s}/">{n}</a></li>' for s, n, _ in SERVICES)
    ville_links = "".join(f'<li><a href="{root(1)}zones/{s}/">{n}</a></li>' for s, n in VILLES)
    blog_links = "".join(f'<li><a href="{root(1)}blog/{a["slug"]}/">{a["title"]}</a></li>' for a in blog_data.ARTICLES)
    pb_links = "".join(f'<li><a href="{root(1)}pannes-frequentes/{p["slug"]}/">{p["q"]}</a></li>' for p in pd.P)
    body = f"""
<section class="page-hero">
  {breadcrumb(1, [(None, "Plan du site")])}
  <div class="wrap"><h1>Plan du site</h1><p>Toutes les pages du site DHB, en un coup d'œil.</p></div>
</section>
<section class="section"><div class="wrap"><div class="grid grid-2">
  <div class="card"><h3>Pages principales</h3><ul class="check-list">
    <li><a href="{root(1)}">Accueil</a></li>
    <li><a href="{root(1)}services/">Services</a></li>
    <li><a href="{root(1)}zones/">Zones d'intervention</a></li>
    <li><a href="{root(1)}pannes-frequentes/">Pannes fréquentes</a></li>
    <li><a href="{root(1)}blog/">Blog</a></li>
    <li><a href="{root(1)}a-propos/">À propos</a></li>
    <li><a href="{root(1)}contact/">Contact</a></li>
  </ul></div>
  <div class="card"><h3>Services</h3><ul class="check-list">{serv_links}</ul></div>
  <div class="card"><h3>Zones d'intervention</h3><ul class="check-list">{ville_links}</ul></div>
  <div class="card"><h3>Pannes fréquentes</h3><ul class="check-list">{pb_links}</ul></div>
  <div class="card"><h3>Articles du blog</h3><ul class="check-list">{blog_links}</ul></div>
  <div class="card"><h3>Pages légales</h3><ul class="check-list">
    <li><a href="{root(1)}mentions-legales/">Mentions légales</a></li>
    <li><a href="{root(1)}politique-confidentialite/">Politique de confidentialité</a></li>
  </ul></div>
</div></div></section>
{breadcrumb_jsonld([(DOMAIN + "/", "Accueil"), (DOMAIN + "/plan-du-site/", "Plan du site")])}
"""
    out["plan-du-site/index.html"] = page(1, "plan-du-site/",
        "Plan du site | DHB", "Plan du site DHB : toutes nos pages services, zones d'intervention, articles de blog et pages légales.", body)

    # ---------- 404 ----------
    body = f"""
<section class="page-hero"><div class="wrap center">
  <h1>Page introuvable (404)</h1>
  <p style="margin:0 auto">La page que vous cherchez n'existe pas ou a été déplacée.</p>
  <div class="hero-cta" style="justify-content:center;margin-top:24px">
    <a class="btn btn--primary btn--lg" href="{root(0)}">Retour à l'accueil</a>
    <a class="btn btn--ghost btn--lg" href="{root(0)}contact/">Nous contacter</a>
  </div>
</div></section>
<section class="section"><div class="wrap center">
  <p>Vous cherchiez peut-être : <a href="{root(0)}services/">nos services</a>, <a href="{root(0)}blog/">le blog</a> ou <a href="{root(0)}zones/">nos zones d'intervention</a>.</p>
</div></section>
"""
    out["404.html"] = page(0, "404.html", "Page introuvable | DHB", "Page introuvable sur le site DHB.", body)

    return out
