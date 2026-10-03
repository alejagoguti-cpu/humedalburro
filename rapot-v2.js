/* RAPOT v2: activa el diseño renovado en los módulos existentes.
   - Se activa con ?v2=1 en la URL o si la sesión viene de v2.html.
   - En index.html (versión anterior) se desactiva.
   - Sin la marca, este script no cambia nada: la versión actual sigue igual. */
(function () {
  'use strict';
  var KEY = 'rapot-v2';
  var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var params = new URLSearchParams(location.search);

  function store(v) { try { v ? sessionStorage.setItem(KEY, '1') : sessionStorage.removeItem(KEY); } catch (e) {} }
  function stored() { try { return sessionStorage.getItem(KEY) === '1'; } catch (e) { return false; } }

  if (file === 'index.html' || params.get('v2') === '0') { store(false); return; }
  var on = params.get('v2') === '1' || stored();
  if (!on) return;
  store(true);

  var root = document.documentElement;
  root.classList.add('rapot-v2');

  var fonts = document.createElement('link');
  fonts.rel = 'stylesheet';
  fonts.href = 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap';
  document.head.appendChild(fonts);

  /* la hoja v2 se agrega al final para ganar la cascada frente a los estilos del módulo */
  function addTheme() {
    if (document.getElementById('rapot-v2-css')) return;
    var css = document.createElement('link');
    css.id = 'rapot-v2-css';
    css.rel = 'stylesheet';
    css.href = 'rapot-v2.css?v=1';
    (document.body || document.head).appendChild(css);
  }

  /* los enlaces internos mantienen la versión nueva; "inicio" lleva a v2.html */
  function isInternal(href) {
    return href && !/^(https?:|mailto:|tel:|#|javascript:|data:)/i.test(href) && /\.html(\?|#|$)/i.test(href);
  }
  function rewrite(a) {
    var href = a.getAttribute('href');
    if (!isInternal(href) || a.dataset.v2) return;
    var base = href.split(/[?#]/)[0].replace(/^\.\//, '');
    if (base === 'index.html' || base === '') { a.setAttribute('href', 'v2.html'); }
    else if (!/[?&]v2=/.test(href)) {
      var hash = href.indexOf('#') >= 0 ? href.slice(href.indexOf('#')) : '';
      var path = hash ? href.slice(0, href.indexOf('#')) : href;
      a.setAttribute('href', path + (path.indexOf('?') >= 0 ? '&' : '?') + 'v2=1' + hash);
    }
    a.dataset.v2 = '1';
  }
  function rewriteAll(scope) {
    var list = (scope || document).querySelectorAll('a[href]');
    for (var i = 0; i < list.length; i++) rewrite(list[i]);
  }

  function ready() {
    addTheme();
    rewriteAll();
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (n) {
          if (n.nodeType !== 1) return;
          if (n.matches && n.matches('a[href]')) rewrite(n);
          if (n.querySelectorAll) rewriteAll(n);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
