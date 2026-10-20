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

  // Formulaires : enregistrement dans Supabase si configuré, sinon démo.
  var _sbClientPromise = null;
  function getSupabase() {
    if (!window.DHB_SUPABASE || !window.DHB_SUPABASE.url) return null;
    if (!_sbClientPromise) {
      _sbClientPromise = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm')
        .then(function (mod) {
          return mod.createClient(window.DHB_SUPABASE.url, window.DHB_SUPABASE.anonKey);
        });
    }
    return _sbClientPromise;
  }

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
        source_url: location.pathname
      };

      var sb = getSupabase();
      if (!sb) { showConfirmation(form); return; }  // pas de config → démo

      if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Envoi…'; }
      sb.then(function (client) {
        return client.from('leads').insert(payload);
      }).then(function (res) {
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || 'Envoyer'; }
        if (res && res.error) {
          showError(form, "Une erreur est survenue. Appelez-nous ou réessayez dans un instant.");
          return;
        }
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
    }
    var acc = banner.querySelector('[data-cookie="accept"]');
    var ref = banner.querySelector('[data-cookie="refuse"]');
    if (acc) acc.addEventListener('click', function () { decide('accepted'); });
    if (ref) ref.addEventListener('click', function () { decide('refused'); });
  }
})();
