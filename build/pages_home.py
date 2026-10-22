# -*- coding: utf-8 -*-
"""Accueil DHB Pro (entreprises) : B2B, sérieux, orienté demande de devis."""
from base import (page, SERVICES, SERVICE_ICON, IC, VILLES, faq_jsonld, localbusiness_jsonld,
                  PHONE_DISPLAY, PHONE_LINK)
import blog_data
import problems_data as pd
import marque

CHECK = marque.ICONES["check"]
ARROW = marque.ICONES["arrow"]
PRIORITAIRES = {"depannage-informatique-saint-denis", "depannage-informatique-saint-ouen",
                "depannage-informatique-aubervilliers", "depannage-informatique-epinay-sur-seine",
                "depannage-informatique-pantin"}

FAQ = [
    ("Travaillez-vous avec les petites entreprises ?",
     "Oui, c'est notre cœur de métier : TPE, PME, indépendants, cabinets, commerces et associations. Pas besoin d'avoir un service informatique : nous jouons ce rôle pour vous."),
    ("Faut-il signer un contrat pour être dépanné ?",
     "Non. Vous pouvez faire appel à nous ponctuellement, sans engagement. Si vous souhaitez ensuite une maintenance régulière, nous vous proposons une formule adaptée, clairement chiffrée."),
    ("Combien coûtent vos services ?",
     "Chaque entreprise est différente : nous établissons un devis gratuit et détaillé avant toute intervention facturée. Pas de frais cachés, pas d'engagement imposé."),
    ("Intervenez-vous à distance ?",
     "Oui, partout en France, avec des outils de prise en main sécurisés et votre accord à chaque session. Nous nous déplaçons sur site en Île-de-France quand une présence physique est nécessaire."),
    ("Que se passe-t-il en cas d'urgence ?",
     "Les incidents bloquants sont traités en priorité. Notre engagement : une réponse à toute demande sous 24 h ouvrées, et une intervention à distance dès que possible pour rétablir votre activité."),
]


def formulaire_hero():
    return f"""
    <div class="hero-card" id="devis">
      <h2>Décrivez votre besoin</h2>
      <p class="sub">Réponse sous 24 h ouvrées · Devis gratuit · Sans engagement</p>
      <form data-demo-form data-type="devis" novalidate>
        <div class="form-ok">Merci, votre demande est bien reçue. Nous vous recontactons sous 24 h ouvrées. Urgence : <a href="tel:{PHONE_LINK}">{PHONE_DISPLAY}</a>.</div>
        <div class="form-grid">
          <div class="form-row"><label for="h-nom">Nom</label><input id="h-nom" name="nom" autocomplete="name" required></div>
          <div class="form-row"><label for="h-ent">Entreprise</label><input id="h-ent" name="entreprise" autocomplete="organization"></div>
        </div>
        <div class="form-grid">
          <div class="form-row"><label for="h-mail">Email professionnel</label><input id="h-mail" name="email" type="email" autocomplete="email" required></div>
          <div class="form-row"><label for="h-tel">Téléphone</label><input id="h-tel" name="telephone" type="tel" autocomplete="tel"></div>
        </div>
        <div class="form-row"><label for="h-msg">Votre besoin</label><textarea id="h-msg" name="message" rows="3" placeholder="Ex. 8 postes, sauvegarde à fiabiliser, Wi-Fi instable…"></textarea></div>
        <div class="form-row consent"><input id="h-rgpd" type="checkbox" required><label for="h-rgpd" style="font-weight:400;margin:0">J'accepte d'être recontacté(e) au sujet de ma demande. <a href="politique-confidentialite/">Confidentialité</a></label></div>
        <button class="btn btn--primary btn--lg btn--block" type="submit">Recevoir mon devis gratuit</button>
      </form>
    </div>"""


def build():
    # Services : l'infogérance globale en carte large, puis les six services.
    ordre = ["infogerance-globale"] + [s for s, _, _ in SERVICES if s != "infogerance-globale"]
    services = {s: (n, d) for s, n, d in SERVICES}
    cartes = ""
    for i, slug in enumerate(ordre):
        nom, desc = services[slug]
        if i == 0:
            cartes += f"""
        <a class="card card--feature span-2" href="services/{slug}/">
          <div class="icon-box">{IC[SERVICE_ICON[slug]]}</div>
          <h3>{nom} : votre service informatique externalisé</h3>
          <p>Maintenance, supervision, sécurité, sauvegarde et support réunis dans une formule mensuelle claire, avec un interlocuteur unique qui connaît votre installation.</p>
          <span class="card-link">Découvrir l'infogérance</span>
        </a>"""
        else:
            cartes += f"""
        <a class="card" href="services/{slug}/">
          <div class="icon-box">{IC[SERVICE_ICON[slug]]}</div>
          <h3>{nom}</h3>
          <p>{desc}</p>
          <span class="card-link">En savoir plus</span>
        </a>"""

    problemes = [
        ("Nos ordinateurs rament, on perd un temps fou.",
         "Diagnostic de la vraie cause (disque, mémoire, logiciels, virus) et remise à niveau des postes, sans jargon."),
        ("On a peur de perdre nos fichiers.",
         "Sauvegarde automatique et vérifiée, avec un test de restauration régulier."),
        ("Plus d'Internet ou de serveur : tout est bloqué.",
         "Intervention prioritaire à distance, ou sur site en Île-de-France, pour rétablir l'activité au plus vite."),
        ("On reçoit des mails douteux, on craint le piratage.",
         "Antivirus, pare-feu, filtrage des mails et sensibilisation des équipes pour réduire concrètement le risque."),
        ("Notre messagerie tombe en panne au mauvais moment.",
         "Microsoft 365 ou Google Workspace fiabilisés : adresses, boîtes, partages et accès."),
        ("Personne ne s'occupe vraiment de l'informatique.",
         "Un prestataire qui connaît votre entreprise, documente votre parc et anticipe les problèmes."),
    ]
    ps = "".join(f'<div class="ps-item"><q>{p}</q><p>{s}</p></div>' for p, s in problemes)

    engagements = [
        ("user", "Un interlocuteur unique", "Pas de standard anonyme : vous parlez à quelqu'un qui connaît votre installation."),
        ("clock", "Réponse sous 24 h ouvrées", "Une structure à taille humaine, disponible : votre demande ne se perd pas dans une file."),
        ("chat", "Un langage clair", "Nous expliquons ce qui se passe et ce que nous proposons. Vous décidez en connaissance de cause."),
        ("eyeopen", "Transparence", "Devis détaillé avant toute intervention facturée. Vos accès et votre documentation restent les vôtres."),
    ]
    eng = "".join(f'<div class="engagement"><div class="ic">{IC[ic]}</div><div><h3>{t}</h3><p>{d}</p></div></div>' for ic, t, d in engagements)

    steps = [
        ("Premier échange", "Vous décrivez votre situation. Nous posons les bonnes questions, gratuitement."),
        ("Audit & devis", "Nous faisons le point sur votre installation et vous remettons un plan priorisé et chiffré."),
        ("Mise en place", "Nous déployons les solutions retenues en limitant l'impact sur votre activité."),
        ("Suivi", "Maintenance, supervision et support : nous restons joignables et anticipons les pannes."),
    ]
    steps_html = "".join(f'<div class="step"><div class="num">{i}</div><h3>{t}</h3><p>{d}</p></div>' for i, (t, d) in enumerate(steps, 1))

    villes = "".join(
        f'<a class="chip{" chip--prio" if slug in PRIORITAIRES else ""}" href="zones/{slug}/">{nom}</a>' for slug, nom in VILLES)

    populaires = ["ordinateur-de-bureau-trop-lent", "plus-dinternet-au-bureau", "imprimante-hors-ligne",
                  "ecran-bleu-windows", "fichiers-chiffres-rancon-ransomware", "messagerie-pro-nenvoie-plus"]
    pannes = ""
    for s in populaires:
        pr = pd.get(s)
        if pr:
            pannes += f'<a class="pb-card" href="pannes-frequentes/{pr["slug"]}/"><span class="pb-cat">{pd.CATEGORIES[pr["cat"]]}</span><h3>{pr["q"]}</h3><span class="pb-link">Causes et solutions →</span></a>'

    articles = "".join(
        f'<a class="card post-card" href="blog/{a["slug"]}/"><span class="article-tag" style="align-self:flex-start;margin-bottom:12px">{blog_data.THEMES[a["theme"]]}</span><h3>{a["title"]}</h3><p class="excerpt">{a["excerpt"]}</p><span class="card-link">Lire l\'article</span></a>'
        for a in blog_data.ARTICLES[:3])

    faq = "".join(f'<details class="faq-item"><summary>{q}</summary><div class="faq-body"><p>{a}</p></div></details>' for q, a in FAQ)

    body = f"""
<section class="hero">
  <div class="wrap hero-inner">
    <div>
      <span class="eyebrow">Infogérance & cybersécurité · TPE et PME</span>
      <h1>L'informatique de votre entreprise, entre de bonnes mains.</h1>
      <p class="lead">Maintenance, dépannage, sécurité et sauvegarde pour les entreprises du nord de Paris et d'Île-de-France. À distance partout en France.</p>
      <ul class="hero-points">
        <li>{CHECK} Réponse sous 24 h ouvrées</li>
        <li>{CHECK} Devis gratuit et détaillé</li>
        <li>{CHECK} Un interlocuteur unique</li>
      </ul>
      <div class="hero-cta">
        <a class="btn btn--primary btn--lg" href="#devis">Demander un devis</a>
        <a class="btn btn--outline btn--lg" href="tel:{PHONE_LINK}">{IC['phone']} {PHONE_DISPLAY}</a>
      </div>
    </div>
    {formulaire_hero()}
  </div>
</section>

<section class="section section--tight">
  <div class="wrap">
    <div class="pillars">
      <div class="pillar"><span class="num-label">Prévenir</span><h3>Moins de pannes, moins d'imprévus</h3><p>Maintenance et supervision régulières : on traite les signaux faibles avant qu'ils ne bloquent vos équipes.</p></div>
      <div class="pillar"><span class="num-label">Protéger</span><h3>Vos données à l'abri</h3><p>Sauvegardes testées, postes à jour, messagerie filtrée : des protections concrètes, adaptées à votre taille.</p></div>
      <div class="pillar"><span class="num-label">Accompagner</span><h3>Un partenaire qui vous connaît</h3><p>Un seul interlocuteur, qui documente votre parc et vous conseille sur la durée.</p></div>
    </div>
  </div>
</section>

<section class="section section--soft">
  <div class="wrap">
    <div class="section-head">
      <span class="eyebrow">Services</span>
      <h2>Tout votre informatique, pris en main</h2>
      <p>Du dépannage ponctuel à l'infogérance complète : commencez par ce dont vous avez besoin aujourd'hui.</p>
    </div>
    <div class="grid grid-4">{cartes}</div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="grid grid-2" style="gap:56px;align-items:start">
      <div>
        <span class="eyebrow">Pourquoi DHB Pro</span>
        <h2>Une structure récente, entièrement disponible pour vous</h2>
        <p class="lead">Nous ne vous montrerons ni faux avis ni chiffres inventés. Voici sur quoi nous nous engageons, concrètement.</p>
        <div class="avis-vide" style="margin-top:24px;text-align:left">
          <strong style="color:var(--ink)">Témoignages clients</strong>
          <p style="margin:6px 0 0">Les retours de nos premiers clients seront publiés ici, tels qu'ils les auront écrits. <span class="a-completer">[À COMPLÉTER PAR LE PROPRIÉTAIRE]</span></p>
        </div>
      </div>
      <div>{eng}</div>
    </div>
  </div>
</section>

<section class="section section--soft">
  <div class="wrap">
    <div class="section-head">
      <span class="eyebrow">Méthode</span>
      <h2>Comment ça se passe</h2>
      <p>Un parcours simple, où vous gardez la main à chaque étape.</p>
    </div>
    <div class="steps">{steps_html}</div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head">
      <span class="eyebrow">Problèmes résolus</span>
      <h2>Vous reconnaissez votre quotidien ?</h2>
      <p>Pas besoin de connaître le mot « infogérance » : il suffit que ça marche.</p>
    </div>
    <div class="ps-grid">{ps}</div>
    <div style="margin-top:44px">
      <h3>Les pannes les plus fréquentes</h3>
      <p>Plus de {len(pd.P)} situations expliquées, avec causes et solutions.</p>
      <div class="pb-grid" style="margin-top:16px">{pannes}</div>
      <p style="margin-top:20px"><a class="text-link" href="pannes-frequentes/">Voir toutes les pannes fréquentes {ARROW}</a></p>
    </div>
  </div>
</section>

<section class="section section--soft">
  <div class="wrap zone">
    <div>
      <span class="eyebrow">Zone d'intervention</span>
      <h2>Au plus près de vous</h2>
      <div class="zone-box"><h3>{marque.ICONES['pin']} Sur site en Île-de-France</h3><p>Priorité au nord de Paris et à la Plaine Commune : Saint-Denis, Saint-Ouen, Aubervilliers, Épinay-sur-Seine, Pantin.</p></div>
      <div class="zone-box"><h3>{IC['chat']} À distance partout en France</h3><p>La plupart des incidents se règlent à distance, de façon sécurisée, sans attendre un déplacement.</p></div>
    </div>
    <div>
      <h3 style="margin-top:6px">Nos pages locales</h3>
      <div class="chips">{villes}</div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head" style="display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap;max-width:none">
      <div><span class="eyebrow">Conseils</span><h2 class="mb-0">Comprendre et décider</h2></div>
      <a class="text-link" href="blog/">Tous les articles {ARROW}</a>
    </div>
    <div class="grid grid-3">{articles}</div>
  </div>
</section>

<section class="section section--soft">
  <div class="wrap">
    <div class="section-head center"><span class="eyebrow">Questions fréquentes</span><h2>Vos questions, nos réponses</h2></div>
    <div class="faq-list">{faq}</div>
  </div>
</section>

<section class="section section--tight"><div class="wrap"><div class="cta-band">
  <div><h2>Parlons de votre informatique</h2><p>Un premier échange gratuit pour faire le point. Vous repartez avec un plan clair, que vous travailliez avec nous ou non.</p></div>
  <div class="hero-cta"><a class="btn btn--primary btn--lg" href="contact/">Demander un devis</a><a class="btn btn--ghost btn--lg" href="tel:{PHONE_LINK}">{IC['phone']} {PHONE_DISPLAY}</a></div>
</div></div></section>

{faq_jsonld(FAQ)}
{localbusiness_jsonld()}
"""
    title = "DHB Pro — infogérance, maintenance et cybersécurité pour entreprises (Île-de-France)"
    desc = ("DHB Pro : maintenance, dépannage, cybersécurité, sauvegarde et infogérance pour TPE et PME. "
            "Sur site en Île-de-France (nord de Paris), à distance partout en France. Devis gratuit, réponse sous 24 h.")
    return {"index.html": page(0, "", title, desc, body)}
