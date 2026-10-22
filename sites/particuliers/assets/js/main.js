/* DHB — Interactions globales */
(function () {
  'use strict';

  // En-tête collant : ombre au scroll
  var header = document.querySelector('.site-header');
  function onScroll() {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 10);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Menu burger mobile
  var burger = document.querySelector('.burger');
  var mobileNav = document.querySelector('.mobile-nav');
  if (burger && mobileNav) {
    burger.addEventListener('click', function () {
      var open = burger.classList.toggle('open');
      mobileNav.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mobileNav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        burger.classList.remove('open');
        mobileNav.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // Révélation au scroll
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('visible'); });
  }

  // Accès Supabase par l'API REST (quelques lignes, au lieu de télécharger la
  // librairie supabase-js sur chaque page). Clé publique uniquement : la
  // sécurité réelle est assurée par les règles RLS en base.
  function supabaseRest(chemin, options) {
    var cfg = window.DHB_SUPABASE;
    if (!cfg || !cfg.url || !cfg.anonKey || !window.fetch) return null;
    options = options || {};
    var ctrl = window.AbortController ? new AbortController() : null;
    var minuteur = ctrl ? setTimeout(function () { ctrl.abort(); }, 15000) : null;
    var headers = { apikey: cfg.anonKey, Authorization: 'Bearer ' + cfg.anonKey };
    if (options.body) { headers['Content-Type'] = 'application/json'; headers.Prefer = 'return=minimal'; }
    return fetch(cfg.url + '/rest/v1/' + chemin, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      if (minuteur) clearTimeout(minuteur);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.status === 204 || res.status === 201 ? null : res.json();
    }, function (err) {
      if (minuteur) clearTimeout(minuteur);
      throw err;
    });
  }
  var configure = !!(window.DHB_SUPABASE && window.DHB_SUPABASE.url && window.DHB_SUPABASE.anonKey);

  function showConfirmation(form) {
    var ok = form.querySelector('.form-ok');
    if (ok) {
      ok.classList.add('show');
      ok.setAttribute('role', 'status');
      ok.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    form.querySelectorAll('input, textarea, select').forEach(function (f) {
      if (f.type !== 'checkbox') f.value = '';
    });
  }

  function showError(form, msg) {
    var box = form.querySelector('.form-err');
    if (!box) {
      box = document.createElement('div');
      box.className = 'form-err';
      box.setAttribute('role', 'alert');
      form.insertBefore(box, form.firstChild);
    }
    box.textContent = msg;
    box.style.display = 'block';
  }

  document.querySelectorAll('form[data-demo-form]').forEach(function (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      var get = function (name) {
        var el = form.querySelector('[name="' + name + '"]');
        return el ? el.value.trim() : '';
      };
      var payload = {
        entity: (window.DHB_SUPABASE && window.DHB_SUPABASE.entity) || 'infogerance',
        type: get('type') || form.getAttribute('data-type') || 'devis',
        nom: get('nom'),
        entreprise: get('entreprise'),
        email: get('email'),
        telephone: get('telephone'),
        message: get('message'),
        service: form.getAttribute('data-service') || null,
        source_url: location.pathname + (window.DHBSuivi ? window.DHBSuivi.utm() : '')
      };

      if (!configure) { showConfirmation(form); return; }  // pas de config → démo

      if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Envoi…'; }
      supabaseRest('leads', { method: 'POST', body: payload }).then(function () {
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || 'Envoyer'; }
        if (window.DHBSuivi) window.DHBSuivi.lead(payload.type, payload.service);
        showConfirmation(form);
      }).catch(function () {
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || 'Envoyer'; }
        showError(form, "Impossible d'envoyer pour le moment. Merci de nous appeler directement.");
      });
    });
  });

  // Bandeau cookies (RGPD : refus aussi simple que l'acceptation)
  var KEY = 'dhb-cookie-consent';
  var banner = document.querySelector('.cookie-banner');
  if (banner) {
    var stored;
    try { stored = localStorage.getItem(KEY); } catch (e) { stored = null; }
    if (!stored) {
      setTimeout(function () { banner.classList.add('show'); }, 700);
    }
    function decide(value) {
      try { localStorage.setItem(KEY, value); } catch (e) {}
      banner.classList.remove('show');
      document.dispatchEvent(new CustomEvent('dhb:consent', { detail: value }));
    }
    var acc = banner.querySelector('[data-cookie="accept"]');
    var ref = banner.querySelector('[data-cookie="refuse"]');
    if (acc) acc.addEventListener('click', function () { decide('accepted'); });
    if (ref) ref.addEventListener('click', function () { decide('refused'); });
    // « Gérer mes cookies » : réaffiche le choix, et retire tout suivi tant qu'il n'est pas refait
    document.querySelectorAll('[data-cookie-reset]').forEach(function (l) {
      l.addEventListener('click', function (e) {
        e.preventDefault();
        try { localStorage.removeItem(KEY); } catch (err) {}
        document.dispatchEvent(new CustomEvent('dhb:consent', { detail: 'refused' }));
        banner.classList.add('show');
      });
    });
  }

  // Paramètres éditables (prix…) : lus depuis Supabase, injectés dans [data-setting].
  // La valeur statique dans le HTML reste le repli (robuste + SEO).
  var setEls = document.querySelectorAll('[data-setting]');
  if (setEls.length) {
    var ent = (window.DHB_SUPABASE && window.DHB_SUPABASE.entity) || '';
    if (configure && ent) {
      supabaseRest('settings?select=skey,value&entity=eq.' + encodeURIComponent(ent)).then(function (rows) {
        if (!rows || !rows.length) return;
        var map = {};
        rows.forEach(function (r) { map[r.skey] = r.value; });
        setEls.forEach(function (el) {
          var k = el.getAttribute('data-setting');
          if (map[k] != null && map[k] !== '') { el.textContent = map[k]; el.hidden = false; }
        });
      }).catch(function () {});
    }
  }
})();
