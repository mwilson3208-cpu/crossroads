/*
  Crossroads Leadership Academy: site behavior. Plain JavaScript, no libraries.

  1. Mobile menu
  2. English / Spanish toggle for buttons, labels, and confirmations
  3. One gold Give Now button on screen at a time
  4. Fade-in on scroll
  5. Analytics events (Givebutter clicks and form submissions)
  6. Forms: validation, submission to the form handler, confirmations
  7. Share button on the thank-you page
*/
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;

  function $all(sel, scope) { return Array.prototype.slice.call((scope || doc).querySelectorAll(sel)); }
  function store(key, value) {
    try {
      if (value === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, value);
    } catch (e) { return null; }
    return null;
  }

  /* ---------- 5. Analytics ---------- */
  // Events go to dataLayer (Google Tag Manager, GA4) and gtag when present. [CONFIRM GA4 or GoHighLevel pixel]
  function track(name, params) {
    params = params || {};
    params.page_path = window.location.pathname;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: name }, params));
    if (typeof window.gtag === 'function') window.gtag('event', name, params);
  }
  window.crossroadsTrack = track;

  doc.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a[data-track="givebutter"]');
    if (!link) return;
    track('givebutter_click', {
      link_location: link.getAttribute('data-track-location') || 'content',
      tier: link.getAttribute('data-tier') || '',
      link_url: link.href,
      outbound: true
    });
  });

  /* ---------- 1. Mobile menu ---------- */
  var header = doc.querySelector('.site-header');
  var menuBtn = doc.querySelector('.menu-toggle');
  if (header && menuBtn) {
    menuBtn.addEventListener('click', function () {
      var open = header.classList.toggle('is-open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.classList.contains('is-open')) {
        header.classList.remove('is-open');
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.focus();
      }
    });
  }

  /* ---------- 2. Language toggle ---------- */
  // Any element with data-es="..." swaps its text. data-es-placeholder and data-es-aria-label swap those attributes.
  var MSG = {
    en: {
      required: 'This field is required.',
      email: 'Enter a valid email address, like name@example.com.',
      phone: 'Enter a 10-digit phone number, like 956-555-0123.',
      choose: 'Choose one option.',
      sending: 'Sending...',
      failed: 'Something went wrong and your form was not sent. Please try again in a minute.',
      toggle: 'English',
      toggleLabel: 'English: view buttons and forms in English',
      copied: 'Link copied. Paste it anywhere to share.'
    },
    es: {
      required: 'Este campo es obligatorio.',
      email: 'Escriba un correo electrónico válido, por ejemplo nombre@ejemplo.com.',
      phone: 'Escriba un número de teléfono de 10 dígitos, por ejemplo 956-555-0123.',
      choose: 'Elija una opción.',
      sending: 'Enviando...',
      failed: 'Algo salió mal y su formulario no se envió. Intente de nuevo en un minuto.',
      toggle: 'Español',
      toggleLabel: 'Español: ver botones y formularios en español',
      copied: 'Enlace copiado. Péguelo donde quiera compartirlo.'
    }
  };
  var lang = 'en';

  function firstText(el) {
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3 && n.nodeValue.trim()) return n;
    }
    return null;
  }

  function swapText(el, toEs) {
    var node = firstText(el);
    if (!node) return;
    if (!el.hasAttribute('data-en')) el.setAttribute('data-en', node.nodeValue.trim());
    var lead = node.nodeValue.match(/^\s*/)[0];
    var trail = node.nodeValue.match(/\s*$/)[0];
    node.nodeValue = lead + (toEs ? el.getAttribute('data-es') : el.getAttribute('data-en')) + trail;
  }

  function swapAttr(el, attr, toEs) {
    var key = 'data-en-' + attr;
    if (!el.hasAttribute(key)) el.setAttribute(key, el.getAttribute(attr) || '');
    el.setAttribute(attr, toEs ? el.getAttribute('data-es-' + attr) : el.getAttribute(key));
  }

  function setLang(next) {
    lang = next === 'es' ? 'es' : 'en';
    var toEs = lang === 'es';
    root.setAttribute('lang', lang);
    $all('[data-es]').forEach(function (el) { swapText(el, toEs); });
    $all('[data-es-placeholder]').forEach(function (el) { swapAttr(el, 'placeholder', toEs); });
    $all('[data-es-aria-label]').forEach(function (el) { swapAttr(el, 'aria-label', toEs); });
    $all('[data-lang-only]').forEach(function (el) { el.hidden = el.getAttribute('data-lang-only') !== lang; });
    $all('[data-lang-toggle]').forEach(function (btn) {
      var other = toEs ? MSG.en : MSG.es;
      btn.setAttribute('lang', toEs ? 'en' : 'es');
      if (btn.classList.contains('lang-toggle')) btn.setAttribute('aria-label', other.toggleLabel);
      btn.setAttribute('aria-pressed', toEs ? 'true' : 'false');
      var long = btn.querySelector('.lang-toggle__long');
      var short = btn.querySelector('.lang-toggle__short');
      if (long) long.textContent = other.toggle;
      if (short) short.textContent = toEs ? 'EN' : 'ES';
      if (!long && !short) btn.textContent = toEs ? 'View in English' : 'Ver en español';
    });
    // Re-translate any visible error messages.
    $all('.field__error[data-code]').forEach(function (p) { p.textContent = MSG[lang][p.getAttribute('data-code')]; });
    store('cla-lang', lang);
  }

  $all('[data-lang-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () { setLang(lang === 'es' ? 'en' : 'es'); });
  });
  var urlLang = new URLSearchParams(window.location.search).get('lang');
  var startLang = urlLang || store('cla-lang');
  if (startLang === 'es') setLang('es');

  /* ---------- 3. One gold button on screen ---------- */
  // Design rule: one filled gold Give Now per screen. In-page buttons win, then the mobile bar, then the header.
  var gives = $all('.btn--give');
  if ('IntersectionObserver' in window && gives.length > 1) {
    var seen = new Set();
    var rank = function (el) {
      if (el.closest('.site-header')) return 2;
      if (el.closest('.sticky-bar')) return 1;
      return 0;
    };
    var pick = function () {
      var winner = null;
      gives.forEach(function (el) {
        if (!seen.has(el)) return;
        if (!winner || rank(el) < rank(winner)) winner = el;
      });
      gives.forEach(function (el) { el.classList.toggle('is-quiet', el !== winner); });
    };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) seen.add(en.target); else seen.delete(en.target);
      });
      pick();
    }, { rootMargin: '-64px 0px -72px 0px', threshold: 0.5 });
    gives.forEach(function (el) {
      // Fixed and sticky elements sit inside the trimmed margins, so watch them without the trim.
      if (rank(el) > 0) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) seen.add(en.target); else seen.delete(en.target);
          });
          pick();
        }).observe(el);
      } else {
        io.observe(el);
      }
    });
  }

  /* ---------- 4. Fade-in on scroll ---------- */
  var reveals = $all('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); rio.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { rio.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- 6. Forms ---------- */
  function errorFor(field) {
    var id = field.getAttribute('aria-describedby');
    var holder = id && doc.getElementById(id.split(' ')[0]);
    return holder && holder.classList.contains('field__error') ? holder : null;
  }

  function setError(field, code) {
    var p = errorFor(field);
    field.setAttribute('aria-invalid', code ? 'true' : 'false');
    if (!p) return;
    if (code) {
      p.setAttribute('data-code', code);
      p.textContent = MSG[lang][code] || code;
      p.hidden = false;
    } else {
      p.removeAttribute('data-code');
      p.textContent = '';
      p.hidden = true;
    }
  }

  function validate(field) {
    var v = (field.value || '').trim();
    if (field.required && !v) return field.tagName === 'SELECT' ? 'choose' : 'required';
    if (v && field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'email';
    if (v && field.type === 'tel') {
      var digits = v.replace(/\D/g, '');
      if (!(digits.length === 10 || (digits.length === 11 && digits[0] === '1'))) return 'phone';
    }
    return '';
  }

  $all('form[data-form]').forEach(function (form) {
    var fields = $all('input:not([type="hidden"]):not([name="website"]), select, textarea', form);
    var status = form.querySelector('.form__status');
    var submit = form.querySelector('[type="submit"]');

    fields.forEach(function (f) {
      f.addEventListener('blur', function () { if (f.getAttribute('aria-invalid') === 'true') setError(f, validate(f)); });
      f.addEventListener('input', function () { if (f.getAttribute('aria-invalid') === 'true') setError(f, validate(f)); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = null;
      fields.forEach(function (f) {
        var code = validate(f);
        setError(f, code);
        if (code && !firstBad) firstBad = f;
      });
      if (firstBad) { firstBad.focus(); return; }

      var data = {};
      new FormData(form).forEach(function (value, key) { data[key] = typeof value === 'string' ? value.trim() : value; });
      data.language = lang;
      data.page = window.location.pathname;

      var label = submit ? submit.textContent : '';
      if (submit) { submit.disabled = true; submit.textContent = MSG[lang].sending; }
      if (status) { status.textContent = ''; status.classList.remove('is-error'); }

      fetch(form.getAttribute('action'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (res) { return res.json().catch(function () { return {}; }).then(function (body) { return { res: res, body: body }; }); })
        .then(function (r) {
          if (r.res.ok && r.body.ok) {
            var done = doc.createElement('p');
            done.className = 'form__done';
            done.setAttribute('tabindex', '-1');
            done.setAttribute('role', 'status');
            done.textContent = form.getAttribute(lang === 'es' ? 'data-success-es' : 'data-success');
            form.replaceWith(done);
            done.focus();
            track('form_submit', { form_type: data.form_type, language: lang });
            return;
          }
          if (r.body && r.body.errors) {
            var bad = null;
            Object.keys(r.body.errors).forEach(function (name) {
              var f = form.elements[name];
              if (f && f.nodeType === 1) { setError(f, r.body.errors[name]); if (!bad) bad = f; }
            });
            if (bad) { bad.focus(); throw null; }
          }
          throw new Error('failed');
        })
        .catch(function (err) {
          if (err === null) return;
          if (status) { status.textContent = MSG[lang].failed; status.classList.add('is-error'); }
        })
        .then(function () {
          if (submit && submit.isConnected) { submit.disabled = false; submit.textContent = label; }
        });
    });
  });

  // Contact form: /contact/?i_am=Student preselects the dropdown.
  var iam = new URLSearchParams(window.location.search).get('i_am');
  var iamSelect = doc.querySelector('select[name="i_am"]');
  if (iam && iamSelect) {
    $all('option', iamSelect).forEach(function (o) { if (o.value === iam) iamSelect.value = iam; });
  }

  /* ---------- 7. Share ---------- */
  $all('[data-share]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var url = btn.getAttribute('data-share-url') || window.location.origin + '/';
      var text = btn.getAttribute('data-share-text') || '';
      var note = doc.getElementById(btn.getAttribute('aria-describedby') || '');
      track('share_click', { method: navigator.share ? 'native' : 'copy' });
      if (navigator.share) {
        navigator.share({ title: doc.title, text: text, url: url }).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text + ' ' + url).then(function () { if (note) note.textContent = MSG[lang].copied; });
      }
    });
  });
})();
