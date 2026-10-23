# -*- coding: utf-8 -*-
"""Outils interactifs de DHB Pro (lot 16).

Auto-diagnostic sécurité : les 7 points de la checklist « Sécurité informatique
en PME » (assets/guides/checklist-securite-pme.pdf), repris tels quels — aucune
statistique ni promesse ajoutée. Les réponses restent dans le navigateur.
"""
import json
from base import (page, breadcrumb, breadcrumb_jsonld, cta_band, lead_magnet, DOMAIN)

# (question, à faire — texte de la checklist, page du site pour aller plus loin)
POINTS = [
    ("Des mots de passe solides et uniques",
     "Chaque personne utilise-t-elle un mot de passe différent pour chaque service (phrases longues de 12 à 16 caractères) ?",
     "déployer un gestionnaire de mots de passe pour l'équipe.",
     ("blog/mots-de-passe-entreprise-bonnes-pratiques/", "Mots de passe en entreprise : les bonnes pratiques")),
    ("La double authentification (MFA)",
     "La double authentification est-elle activée sur la messagerie, la banque et les outils cloud ?",
     "activer la MFA sur tous les comptes critiques.",
     ("services/cybersecurite/", "Notre service cybersécurité")),
    ("Des sauvegardes isolées et testées",
     "Vos sauvegardes suivent-elles la règle 3-2-1 (3 copies, 2 supports, 1 hors site), et une restauration a-t-elle déjà été testée ?",
     "vérifier qu'une sauvegarde se restaure réellement.",
     ("pannes-frequentes/quelle-sauvegarde-pour-une-pme/", "Quelle sauvegarde pour une PME ?")),
    ("Des mises à jour à jour",
     "Les mises à jour système et logicielles sont-elles appliquées régulièrement (et plus aucun poste sous Windows 10) ?",
     "planifier les mises à jour système et logicielles.",
     ("pannes-frequentes/windows-10-fin-de-support-que-faire/", "Windows 10 : fin de support, que faire ?")),
    ("Des équipes sensibilisées au phishing",
     "Votre équipe sait-elle repérer un email piégé, et toute demande de virement ou de changement de RIB est-elle vérifiée par un autre canal ?",
     "un rappel régulier des bons réflexes.",
     ("blog/reconnaitre-email-phishing-former-equipes/", "Reconnaître un email de phishing")),
    ("Des accès maîtrisés (moindre privilège)",
     "Chacun n'accède-t-il qu'à ce dont il a besoin, et les accès sont-ils coupés immédiatement au départ d'un collaborateur ?",
     "une check-list arrivée / départ de collaborateur.",
     ("pannes-frequentes/gerer-arrivee-depart-salarie-informatique/", "Gérer l'arrivée et le départ d'un salarié")),
    ("Un réseau et un Wi-Fi sécurisés",
     "Le Wi-Fi des visiteurs est-il séparé de celui des postes de travail, et les accès à distance passent-ils par un VPN avec MFA ?",
     "créer un réseau invité isolé.",
     ("pannes-frequentes/wifi-invite-donne-acces-reseau-interne/", "Le Wi-Fi des visiteurs donne accès au réseau interne")),
]


def diagnostic():
    depth = 2
    r = "../../"
    questions = ""
    for i, (titre, q, _, _) in enumerate(POINTS, start=1):
        choix = "".join(
            f'<label class="outil-choix"><input type="radio" name="p{i}" value="{v}" required> {l}</label>'
            for v, l in (("oui", "Oui"), ("non", "Non"), ("nsp", "Je ne sais pas")))
        questions += f"""
    <fieldset class="outil-question card">
      <legend><span class="outil-num">{i}</span> {titre}</legend>
      <p>{q}</p>
      <div class="outil-choix-liste">{choix}</div>
    </fieldset>"""
    donnees = [{"titre": t, "faire": f, "lien": r + l[0], "lienTitre": l[1]} for t, _, f, l in POINTS]
    js = """<script>(function(){
  var P = %s, f = document.getElementById('diag'), out = document.getElementById('diag-resultat');
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var manque = [], ok = 0, aVerifier = 0;
    P.forEach(function (p, i) {
      var v = (f.querySelector('input[name="p' + (i + 1) + '"]:checked') || {}).value;
      if (v === 'oui') ok++; else { manque.push({ p: p, nsp: v === 'nsp' }); if (v === 'nsp') aVerifier++; }
    });
    var el = function (tag, texte) { var n = document.createElement(tag); if (texte) n.textContent = texte; return n; };
    out.textContent = '';
    var titre = el('h2', ok + ' point' + (ok > 1 ? 's' : '') + ' sur 7 en place'); titre.tabIndex = -1; out.appendChild(titre);
    if (!manque.length) out.appendChild(el('p', 'Les 7 vérifications prioritaires de la checklist sont en place. Pensez à les revoir régulièrement.'));
    else {
      out.appendChild(el('p', (manque.length > 1 ? 'Les points suivants sont à renforcer' : 'Ce point est à renforcer') +
        (aVerifier ? ' (« Je ne sais pas » compte comme un point à vérifier)' : '') + ' :'));
      var ol = el('ol'); ol.className = 'outil-liste';
      manque.forEach(function (m) {
        var li = el('li'); li.appendChild(el('strong', m.p.titre));
        if (m.nsp) li.appendChild(el('em', ' (à vérifier)'));
        li.appendChild(el('br')); li.appendChild(document.createTextNode('À faire : ' + m.p.faire + ' '));
        var a = el('a', m.p.lienTitre); a.href = m.p.lien; li.appendChild(a);
        ol.appendChild(li);
      });
      out.appendChild(ol);
    }
    out.hidden = false;
    titre.focus();
    if (window.DHBSuivi && window.DHBSuivi.outil) window.DHBSuivi.outil('diagnostic_securite', ok);
  });
})();</script>""" % json.dumps(donnees, ensure_ascii=False)
    body = f"""
<section class="page-hero">
  {breadcrumb(depth, [("services/cybersecurite/", "Cybersécurité"), (None, "Auto-diagnostic")])}
  <div class="wrap">
    <span class="eyebrow">Outil gratuit</span>
    <h1>Auto-diagnostic sécurité informatique : 7 questions</h1>
    <p>Les 7 vérifications prioritaires de notre checklist « Sécurité informatique en PME », à passer en revue en quelques minutes. Vos réponses restent dans votre navigateur : rien n'est envoyé.</p>
  </div>
</section>
<section class="section"><div class="wrap" style="max-width:820px">
  <form id="diag" class="outil" novalidate>
    {questions}
    <div class="center" style="margin-top:24px"><button class="btn btn--primary btn--lg" type="submit">Voir mon résultat</button></div>
  </form>
  <div id="diag-resultat" class="outil-resultat card" role="status" aria-live="polite" hidden></div>
  <h2 style="margin-top:48px">Pour aller plus loin</h2>
  {lead_magnet("auto-diagnostic sécurité")}
</div></section>
{cta_band(depth, title="Besoin d'un regard sur votre sécurité ?")}
{breadcrumb_jsonld([(DOMAIN + "/", "Accueil"), (DOMAIN + "/services/cybersecurite/", "Cybersécurité"), (DOMAIN + "/outils/auto-diagnostic-securite/", "Auto-diagnostic sécurité")])}
{js}
"""
    return page(depth, "outils/auto-diagnostic-securite/", "Auto-diagnostic sécurité informatique en 7 questions | DHB",
                "7 questions pour vérifier les points essentiels de la sécurité informatique de votre entreprise : mots de passe, MFA, sauvegardes, mises à jour, phishing, accès, Wi-Fi.",
                body)


def build():
    return {"outils/auto-diagnostic-securite/index.html": diagnostic()}
