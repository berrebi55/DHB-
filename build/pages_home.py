# -*- coding: utf-8 -*-
from base import (page, SERVICES, SERVICE_ICON, IC, contact_form, cta_band,
                  localbusiness_jsonld, PHONE_DISPLAY, PHONE_LINK, root)
import blog_data
import problems_data as pd


def build():
    r = ""  # depth 0

    service_cards = ""
    for slug, name, desc in SERVICES:
        ic = IC[SERVICE_ICON[slug]]
        service_cards += f"""
        <div class="card reveal">
          <div class="icon-box">{ic}</div>
          <h3>{name}</h3>
          <p>{desc}</p>
          <a class="card-link" href="services/{slug}/">En savoir plus</a>
        </div>"""

    problems = [
        ("« Nos ordinateurs rament, on perd un temps fou »",
         "On diagnostique la vraie cause (disque saturé, mémoire, logiciels, virus) et on remet vos postes à niveau — sans discours technique."),
        ("« On a peur de perdre nos fichiers »",
         "On met en place une sauvegarde automatique et vérifiée, avec un test de restauration régulier. Vous dormez tranquille."),
        ("« Plus d'accès à Internet / au serveur, tout est bloqué »",
         "Intervention prioritaire, sur site en Île-de-France ou à distance partout en France, pour rétablir l'activité au plus vite."),
        ("« On reçoit des mails douteux, on craint le piratage »",
         "Antivirus, pare-feu, filtrage des mails et sensibilisation de vos équipes : on réduit concrètement le risque."),
        ("« Notre messagerie pro tombe en panne au mauvais moment »",
         "On fiabilise votre Microsoft 365 ou Google Workspace, vos adresses et vos boîtes, avec un interlocuteur qui répond vraiment."),
        ("« On n'a personne pour s'occuper de l'informatique »",
         "On devient votre service informatique externalisé : un interlocuteur unique qui connaît votre entreprise et anticipe les problèmes."),
    ]
    ps = ""
    for prob, sol in problems:
        ps += f"""
        <div class="ps-row reveal">
          <div class="ps-prob"><span class="tag">Votre problème</span><p><strong>{prob}</strong></p></div>
          <div class="ps-sol"><span class="tag">Notre solution</span><p>{sol}</p></div>
        </div>"""

    engagements = [
        ("user", "Un interlocuteur unique qui vous connaît", "Pas de standard anonyme ni de numéro de ticket qui tourne en rond. Vous parlez à quelqu'un qui connaît votre installation."),
        ("clock", "Entreprise à taille humaine et réactive", "Nous sommes une structure récente et disponible. Votre demande ne se perd pas dans une file : réponse sous 24h ouvrées."),
        ("chat", "Un langage clair, sans jargon", "On vous explique ce qui se passe et ce qu'on propose avec des mots simples. Vous décidez en connaissance de cause."),
        ("eyeopen", "Transparence totale", "Pas de prix caché, pas d'engagement piège. Vous savez ce qui est fait, pourquoi, et ce que ça vous apporte."),
        ("map", "Sur site en Île-de-France, à distance partout en France", "On se déplace dans vos locaux en IdF et on intervient à distance dans toute la France, selon ce qui est le plus rapide pour vous."),
        ("bolt", "Une approche moderne et préventive", "On ne se contente pas de réparer : on supervise et on anticipe pour que les pannes n'arrivent pas au pire moment."),
    ]
    eng = ""
    for ic, t, d in engagements:
        eng += f'<div class="engagement reveal"><div class="ic">{IC[ic]}</div><div><h3>{t}</h3><p>{d}</p></div></div>'

    steps = [
        ("Audit gratuit", "On fait le point sur votre installation, vos usages et vos risques. Gratuit et sans engagement."),
        ("Plan clair", "Vous recevez un plan de recommandations priorisées, en langage simple, avec les bénéfices concrets."),
        ("Mise en place", "On déploie les solutions retenues proprement, en limitant au maximum l'interruption de votre activité."),
        ("Suivi", "On supervise, on maintient et on reste joignable. Vous avez enfin un informatique qui tient dans la durée."),
    ]
    steps_html = ""
    for i, (t, d) in enumerate(steps, 1):
        steps_html += f'<div class="step reveal"><div class="num">{i}</div><h3>{t}</h3><p>{d}</p></div>'

    popular_slugs = ["ordinateur-de-bureau-trop-lent", "plus-dinternet-au-bureau",
                     "imprimante-hors-ligne", "ecran-bleu-windows",
                     "fichiers-chiffres-rancon-ransomware", "messagerie-pro-nenvoie-plus"]
    pb_popular = ""
    for s in popular_slugs:
        pr = pd.get(s)
        if pr:
            pb_popular += f"""
        <a class="card reveal" href="pannes-frequentes/{pr['slug']}/" style="color:inherit">
          <span class="article-tag" style="margin-bottom:10px">{pd.CATEGORIES[pr['cat']]}</span>
          <h3 style="font-size:1.08rem">{pr['q']}</h3>
          <span class="card-link">Causes et solutions</span>
        </a>"""

    posts = blog_data.ARTICLES[:3]
    post_cards = ""
    colors = ["#0B2A4A", "#134377", "#0b8fc6"]
    for i, a in enumerate(posts):
        post_cards += f"""
        <div class="card post-card reveal">
          <div class="thumb" style="background:linear-gradient(135deg,{colors[i%3]},#2EC4FF)">{a['theme']}</div>
          <h3>{a['title']}</h3>
          <p class="excerpt">{a['excerpt']}</p>
          <a class="card-link" href="blog/{a['slug']}/">Lire l'article</a>
        </div>"""

    body = f"""
<section class="hero">
  <div class="wrap hero-inner">
    <div class="reveal">
      <h1>Votre informatique qui marche, sans y penser.</h1>
      <p class="lead">Dépannage, maintenance et sécurité informatique pour les entreprises. Sur site en Île-de-France, à distance partout en France.</p>
      <ul class="reassurance">
        <li>{IC['check']} Réponse sous 24h ouvrées</li>
        <li>{IC['check']} Sans engagement</li>
        <li>{IC['check']} Interlocuteur unique</li>
      </ul>
      <div class="hero-cta">
        <a class="btn btn--primary btn--lg" href="contact/">Demander un audit gratuit</a>
        <a class="btn btn--ghost btn--lg" href="tel:{PHONE_LINK}">{IC['phone']} Être rappelé(e)</a>
      </div>
    </div>
    <div class="hero-visual reveal" aria-hidden="true">
      <h3>{IC['shield']} Supervision DHB</h3>
      <div class="status-row"><span>Postes de travail</span><span class="badge-ok"><span class="dot"></span>Opérationnels</span></div>
      <div class="status-row"><span>Serveur de fichiers</span><span class="badge-ok"><span class="dot"></span>En ligne</span></div>
      <div class="status-row"><span>Sauvegarde (cette nuit)</span><span class="badge-ok"><span class="dot"></span>Réussie</span></div>
      <div class="status-row"><span>Antivirus & pare-feu</span><span class="badge-ok"><span class="dot"></span>À jour</span></div>
      <div class="status-row"><span>Espace disque serveur</span><span class="badge-watch"><span class="dot"></span>À surveiller</span></div>
      <p style="color:#9fb6cd;font-size:.8rem;margin:16px 0 0">Illustration de notre tableau de supervision. Les pannes sont détectées avant qu'elles ne vous bloquent.</p>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="center" style="max-width:720px;margin:0 auto 46px">
      <span class="eyebrow">Vous reconnaissez votre quotidien ?</span>
      <h2>Votre problème, notre solution</h2>
      <p class="lead">Vous n'avez pas besoin de connaître le mot « infogérance ». Vous avez besoin que ça marche. On parle le même langage que vous.</p>
    </div>
    {ps}
  </div>
</section>

<section class="section section--gris">
  <div class="wrap">
    <div class="center" style="max-width:720px;margin:0 auto 46px">
      <span class="eyebrow">Nos services</span>
      <h2>Tout votre informatique, pris en main</h2>
      <p class="lead">Du dépannage ponctuel à la gestion complète de votre parc : choisissez ce dont vous avez besoin aujourd'hui, ajoutez le reste quand vous voulez.</p>
    </div>
    <div class="grid grid-3">{service_cards}</div>
  </div>
</section>

<section class="section section--nuit">
  <div class="wrap">
    <div class="center" style="max-width:720px;margin:0 auto 46px">
      <span class="eyebrow">Pourquoi DHB</span>
      <h2>Une nouvelle génération de prestataire informatique</h2>
      <p class="lead" style="color:#c3d4e6">Nous sommes une entreprise récente, et c'est une force : disponibles, impliqués, modernes, et nous prenons le temps qu'il faut pour vous.</p>
    </div>
    <div class="grid grid-2">{eng}</div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="center" style="max-width:720px;margin:0 auto 46px">
      <span class="eyebrow">Comment ça se passe</span>
      <h2>Confier son informatique, sans stress</h2>
      <p class="lead">Un parcours simple et rassurant, en quatre étapes. Vous gardez la main à chaque moment.</p>
    </div>
    <div class="steps">{steps_html}</div>
  </div>
</section>

<section class="section section--gris">
  <div class="wrap">
    <div class="center" style="max-width:720px;margin:0 auto 46px">
      <span class="eyebrow">Confiance</span>
      <h2>Des engagements, pas des promesses en l'air</h2>
      <p class="lead">Nous sommes une entreprise nouvelle : nous ne vous raconterons pas de faux témoignages ni de chiffres inventés. Voici ce sur quoi nous nous engageons.</p>
    </div>
    <div class="grid grid-2" style="align-items:start">
      <div class="card reveal">
        <h3>Nos engagements</h3>
        <ul class="check-list">
          <li>Réponse à toute demande sous 24h ouvrées.</li>
          <li>Un interlocuteur unique qui suit votre dossier.</li>
          <li>Un devis gratuit, détaillé et sans engagement avant toute intervention facturée.</li>
          <li>Des explications en langage clair, jamais de jargon pour impressionner.</li>
          <li>Une sauvegarde testée : on vérifie qu'elle se restaure vraiment.</li>
          <li>Vos données et vos accès restent les vôtres, documentés et réversibles.</li>
        </ul>
      </div>
      <div class="reveal">
        <div class="avis-vide" style="margin-bottom:20px">
          {IC['star']}
          <h3 style="margin-bottom:6px">Vos premiers retours clients apparaîtront ici</h3>
          <p style="margin:0">Nous préférons une page honnête à de faux avis. Les témoignages de nos premiers clients seront publiés ici, tels qu'ils les auront écrits.</p>
        </div>
        <div class="card">
          <h3>Certifications & partenaires</h3>
          <p style="margin-bottom:10px">Nos qualifications officielles et partenaires technologiques seront affichés ici.</p>
          <p class="a-completer">[À COMPLÉTER PAR LE PROPRIÉTAIRE : certifications réelles, agréments, partenaires Microsoft/Google, etc.]</p>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="center" style="max-width:720px;margin:0 auto 40px">
      <span class="eyebrow">Base de pannes</span>
      <h2>Un problème précis ? Trouvez-le ici</h2>
      <p class="lead">Plus de {len(pd.P)} pannes informatiques courantes, avec leurs causes et des solutions concrètes. Cherchez la vôtre.</p>
    </div>
    <div class="grid grid-3">{pb_popular}</div>
    <div class="center" style="margin-top:30px"><a class="btn btn--dark btn--lg" href="pannes-frequentes/">Voir toutes les pannes fréquentes</a></div>
  </div>
</section>

<section class="section section--gris">
  <div class="wrap">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px;margin-bottom:40px">
      <div><span class="eyebrow">Le blog</span><h2 class="mb-0">Comprendre et résoudre vos soucis informatiques</h2></div>
      <a class="btn btn--dark" href="blog/">Voir tous les articles</a>
    </div>
    <div class="grid grid-3">{post_cards}</div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="grid grid-2" style="align-items:center;gap:48px">
      <div class="reveal">
        <span class="eyebrow">Parlons-en</span>
        <h2>Prêt à ne plus subir votre informatique ?</h2>
        <p class="lead">Expliquez-nous votre situation en quelques lignes. On vous rappelle sous 24h ouvrées avec un premier regard — gratuit et sans engagement.</p>
        <p>Vous préférez le téléphone ? Appelez directement le <a href="tel:{PHONE_LINK}"><strong>{PHONE_DISPLAY}</strong></a>.</p>
        <ul class="check-list" style="margin-top:20px">
          <li>Audit de votre installation offert</li>
          <li>Plan d'action clair et priorisé</li>
          <li>Aucun engagement, aucune pression</li>
        </ul>
      </div>
      <div class="reveal">{contact_form(0)}</div>
    </div>
  </div>
</section>

{localbusiness_jsonld()}
"""
    title = "Maintenance & dépannage informatique pour entreprises — Île-de-France & France | DHB"
    desc = ("DHB : maintenance, dépannage, support et sécurité informatique pour les entreprises. "
            "Sur site en Île-de-France, à distance partout en France. Audit gratuit, sans engagement, réponse sous 24h.")
    return {"index.html": page(0, "", title, desc, body)}
