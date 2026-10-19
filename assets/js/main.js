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

  // Formulaires : confirmation après envoi (aucune donnée envoyée côté démo)
  document.querySelectorAll('form[data-demo-form]').forEach(function (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var ok = form.querySelector('.form-ok');
      if (ok) {
        ok.classList.add('show');
        ok.setAttribute('role', 'status');
        ok.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      form.querySelectorAll('input, textarea, select').forEach(function (f) {
        if (f.type !== 'checkbox') f.value = '';
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
