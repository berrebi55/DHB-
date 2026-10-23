/* DHB — Mesure d'audience (Google Analytics 4), conforme RGPD :
   rien n'est chargé ni envoyé tant que le visiteur n'a pas cliqué « Accepter »
   dans le bandeau cookies (clé localStorage « dhb-cookie-consent »).
   ⚠️ Renseigner l'identifiant de mesure GA4 ci-dessous (Analytics → Admin →
   Flux de données → « Identifiant de mesure », forme G-XXXXXXXXXX). */
(function () {
  'use strict';
  var GA_ID = 'G-XXXXXXXXXX'; // [À COMPLÉTER PAR LE PROPRIÉTAIRE]
  var DOMAINES = ['dhb-groupe.fr', 'pro.dhb-groupe.fr', 'dhb-assistance.fr']; // [EXEMPLE] suivi d'un visiteur d'un site à l'autre
  var SITE = ((window.DHB_SUPABASE && window.DHB_SUPABASE.entity) || document.body.getAttribute('data-site') || 'site');
  var actif = false;

  function consent() {
    try { return localStorage.getItem('dhb-cookie-consent') === 'accepted'; } catch (e) { return false; }
  }
  function configure() { return GA_ID && GA_ID.indexOf('XXXX') === -1; }

  // Origine de la visite (paramètres de campagne, site d'où vient le visiteur,
  // page d'arrivée) : conservée pour la session (onglet) et jointe uniquement à
  // la demande que le visiteur envoie. Rien n'est transmis à un tiers.
  var CLES = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'];
  function attribution() {
    var a = {};
    try { a = JSON.parse(sessionStorage.getItem('dhb-origine') || '{}') || {}; } catch (e) { a = {}; }
    try {
      var p = new URLSearchParams(location.search), campagne = false, ref = '';
      CLES.forEach(function (k) { if (p.get(k)) campagne = true; });
      try {
        var h = document.referrer ? new URL(document.referrer).hostname : '';
        if (h && h !== location.hostname) ref = h;   // domaine seulement, jamais l'adresse complète
      } catch (e) {}
      // Première page de la visite, ou arrivée par une nouvelle campagne.
      if (!a.landing_page || campagne) {
        a = { landing_page: location.pathname };
        CLES.forEach(function (k) { if (p.get(k)) a[k] = p.get(k).slice(0, 200); });
        if (ref) a.referrer = ref;
        sessionStorage.setItem('dhb-origine', JSON.stringify(a));
      }
    } catch (e) {}
    var out = {};
    for (var k in a) if (Object.prototype.hasOwnProperty.call(a, k)) out[k] = a[k];
    // Identifiant Google Analytics : seulement si la mesure d'audience est acceptée.
    if (consent()) {
      var m = document.cookie.match(/(?:^|;\s*)_ga=GA\d\.\d\.(\d+\.\d+)/);
      if (m) out.ga_client_id = m[1];
    }
    return out;
  }
  attribution();

  function evt(nom, params) {
    if (!actif || !window.gtag) return;
    params = params || {};
    params.site = SITE;
    window.gtag('event', nom, params);
  }

  function demarrer() {
    if (actif || !configure() || !consent()) return;
    actif = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { anonymize_ip: true, linker: { domains: DOMAINES }, site: SITE });
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
  }

  // Retrait du consentement : on arrête et on supprime les cookies GA
  function arreter() {
    actif = false;
    if (GA_ID) window['ga-disable-' + GA_ID] = true;
    document.cookie.split(';').forEach(function (c) {
      var n = c.split('=')[0].trim();
      if (n.indexOf('_ga') === 0) document.cookie = n + '=; Max-Age=0; path=/';
    });
  }

  document.addEventListener('dhb:consent', function (e) {
    if (e.detail === 'accepted') { if (GA_ID) window['ga-disable-' + GA_ID] = false; demarrer(); } else { arreter(); }
  });

  // Clics : téléphone, email, boutons d'action, paiement, passage d'un site DHB à l'autre
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a,button');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var libelle = (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    if (href.indexOf('tel:') === 0) return evt('click_phone', { emplacement: a.closest('footer') ? 'pied' : a.closest('.mobile-actions') ? 'barre_mobile' : a.closest('header,.brandbar') ? 'entete' : 'page' });
    if (href.indexOf('mailto:') === 0) return evt('click_email');
    if (a.hasAttribute('data-checkout')) return evt('begin_checkout', { offre: a.getAttribute('data-checkout') });
    if (a.closest('.brandbar')) return evt('click_autre_site_dhb', { destination: libelle });
    if (a.classList.contains('btn') && !a.closest('.cookie-banner')) evt('click_cta', { libelle: libelle, page: location.pathname });
  });

  // Formulaires : démarrage (1er champ touché) et abandon possible à déduire de l'écart avec generate_lead
  document.querySelectorAll('form[data-demo-form]').forEach(function (f) {
    var commence = false;
    f.addEventListener('focusin', function () {
      if (commence) return; commence = true;
      evt('form_start', { type: f.getAttribute('data-type') || 'devis', page: location.pathname });
    });
  });

  // FAQ ouvertes = questions qui préoccupent les visiteurs
  document.querySelectorAll('details.faq-item').forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.open) evt('faq_ouverte', { question: (d.querySelector('summary').textContent || '').trim().slice(0, 80) });
    });
  });

  // Profondeur de lecture
  var seuils = [25, 50, 75, 90], vus = {};
  window.addEventListener('scroll', function () {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if (h <= 0) return;
    var pct = window.scrollY / h * 100;
    seuils.forEach(function (s) {
      if (pct >= s && !vus[s]) { vus[s] = 1; evt('scroll_profondeur', { pourcentage: s, page: location.pathname }); }
    });
  }, { passive: true });

  // API pour main.js (conversion = demande envoyée)
  window.DHBSuivi = {
    attribution: attribution,
    // Un guide téléchargé n'est pas une demande de contact : événement distinct (lot 16).
    lead: function (type, service) {
      if (type === 'guide') evt('telechargement_guide', { page: location.pathname });
      else evt('generate_lead', { type: type, service: service || '', page: location.pathname });
    },
    // Outil interactif terminé (auto-diagnostic, « arnaque ou pas ? ») : score seulement, rien de personnel.
    outil: function (nom, score) { evt('outil_termine', { outil: nom, score: score, page: location.pathname }); }
  };

  demarrer();
})();
