/* ------------------------------------------------------------------------- *
 * site.js - chrome for rangareddy.github.io
 * Vanilla ES5-safe JS, no dependencies. Every block guards on its own nodes
 * so a page that lacks a feature simply skips it.
 * ------------------------------------------------------------------------- */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  };

  /* --------------------------------------------------------------- theme -- */
  (function theme() {
    var toggle = $('#themeToggle');
    if (!toggle) return;

    var sync = function (mode) {
      root.setAttribute('data-theme', mode);
      toggle.setAttribute('aria-pressed', mode === 'dark' ? 'true' : 'false');
      toggle.title = mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
    };

    sync(root.getAttribute('data-theme') || 'light');

    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      sync(next);
      try { localStorage.setItem('theme', next); } catch (e) { /* private mode */ }
    });

    // Follow the OS only while the visitor has not made an explicit choice.
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onChange = function (e) {
      var saved = null;
      try { saved = localStorage.getItem('theme'); } catch (err) { /* ignore */ }
      if (!saved) sync(e.matches ? 'dark' : 'light');
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }());

  /* ----------------------------------------------------------- mobile nav -- */
  (function nav() {
    var btn = $('#navToggle');
    var menu = $('#siteNav');
    if (!btn || !menu) return;

    var setOpen = function (open) {
      menu.classList.toggle('is-open', open);
      btn.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(!menu.classList.contains('is-open'));
    });
    document.addEventListener('click', function (e) {
      if (menu.classList.contains('is-open') && !menu.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
  }());

  /* --------------------------------------------------------- back to top -- */
  (function backToTop() {
    var btn = $('#backToTop');
    if (!btn) return;
    var onScroll = function () {
      btn.classList.toggle('is-visible', window.pageYOffset > 400);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }());

  /* ------------------------------------------------------ read progress -- */
  (function progress() {
    var bar = $('#readProgress span');
    var body = $('#postBody');
    if (!bar || !body) return;
    var update = function () {
      var start = body.getBoundingClientRect().top + window.pageYOffset;
      var span = body.offsetHeight - window.innerHeight * 0.4;
      // A post shorter than the viewport has nothing to scroll through.
      var pct = span <= 0 ? 0 : (window.pageYOffset - start) / span;
      bar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, pct)) + ')';
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }());

  /* ------------------------------------------------------ table of contents */
  (function toc() {
    var panel = $('#tocPanel');
    var host = $('#toc');
    var body = $('#postBody');
    if (!panel || !host || !body) return;

    // Posts written with kramdown's {:toc} already carry a list. Reuse it;
    // otherwise build one from the headings.
    var authored = $('#markdown-toc', body);
    if (authored) {
      host.appendChild(authored);
      authored.removeAttribute('id');
      authored.className = 'toc__list';
    } else {
      var headings = $$('h2[id], h3[id]', body);
      if (!headings.length) return;
      var list = document.createElement('ul');
      list.className = 'toc__list';
      headings.forEach(function (h) {
        var li = document.createElement('li');
        li.className = 'toc__item toc__item--' + h.tagName.toLowerCase();
        var a = document.createElement('a');
        a.href = '#' + h.id;
        a.textContent = h.textContent;
        li.appendChild(a);
        list.appendChild(li);
      });
      host.appendChild(list);
    }

    var links = $$('a[href^="#"]', host);
    if (!links.length) return;
    panel.hidden = false;

    var targets = links.map(function (a) {
      return { link: a, el: document.getElementById(decodeURIComponent(a.hash.slice(1))) };
    }).filter(function (t) { return t.el; });

    var spy = function () {
      var probe = window.pageYOffset + 120;
      var active = null;
      targets.forEach(function (t) {
        if (t.el.offsetTop <= probe) active = t;
      });
      links.forEach(function (a) { a.classList.remove('is-active'); });
      if (active) active.link.classList.add('is-active');
    };
    window.addEventListener('scroll', spy, { passive: true });
    spy();
  }());

  /* --------------------------------------------------- copy code buttons -- */
  (function copyCode() {
    var blocks = $$('.prose div.highlight, .prose pre.highlight, .prose > pre');
    blocks.forEach(function (block) {
      var pre = block.tagName === 'PRE' ? block : block.querySelector('pre');
      if (!pre) return;

      var wrap = document.createElement('div');
      wrap.className = 'code-wrap';
      block.parentNode.insertBefore(wrap, block);
      wrap.appendChild(block);

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-btn';
      btn.setAttribute('aria-label', 'Copy code to clipboard');
      btn.innerHTML = '<span class="copy-btn__label">Copy</span>';
      wrap.appendChild(btn);

      btn.addEventListener('click', function () {
        var text = pre.innerText.replace(/\s+$/, '');
        var done = function (ok) {
          btn.classList.toggle('is-done', ok);
          btn.classList.toggle('is-failed', !ok);
          btn.querySelector('.copy-btn__label').textContent = ok ? 'Copied' : 'Press Ctrl+C';
          window.setTimeout(function () {
            btn.classList.remove('is-done', 'is-failed');
            btn.querySelector('.copy-btn__label').textContent = 'Copy';
          }, 1800);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
        } else {
          done(false);
        }
      });
    });
  }());

  /* ------------------------------------------------------- table wrapper -- */
  (function tableWrap() {
    $$('.prose table').forEach(function (table) {
      if (table.closest('.table-wrap') || table.classList.contains('dataTable')) return;
      var wrap = document.createElement('div');
      wrap.className = 'table-wrap';
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });
  }());

  /* ------------------------------------------------------------ mermaid -- */
  (function mermaidDiagrams() {
    if (typeof window.mermaid === 'undefined') return;
    // kramdown + rouge render ```mermaid as a highlighted code block, so the
    // source has to be lifted back out before mermaid can draw it.
    var blocks = $$('.prose .language-mermaid');
    if (!blocks.length) return;

    blocks.forEach(function (block) {
      var code = block.querySelector('code') || block;
      var pre = document.createElement('pre');
      pre.className = 'mermaid';
      pre.textContent = code.innerText;
      block.parentNode.replaceChild(pre, block);
    });

    var dark = root.getAttribute('data-theme') === 'dark';
    window.mermaid.initialize({
      startOnLoad: false,
      theme: dark ? 'dark' : 'default',
      themeVariables: {
        fontFamily: 'Inter, system-ui, sans-serif',
        // mermaid's default cluster fill is a strong yellow; align it with the
        // site's surfaces so a diagram does not fight the page.
        clusterBkg: dark ? '#172131' : '#f2f5fa',
        clusterBorder: dark ? '#2e3c53' : '#ccd4e2'
      }
    });

    // mermaid sizes each node box by measuring its label in the font that is
    // active when it runs. Rendering before Inter has loaded measures the
    // fallback font and clips the last character of longer labels, so wait.
    var draw = function () { window.mermaid.run({ querySelector: 'pre.mermaid' }); };
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(draw, draw);
    } else {
      draw();
    }
  }());

  /* -------------------------------------------------------- external links */
  (function externalLinks() {
    var host = window.location.host;
    $$('.prose a[href^="http"]').forEach(function (a) {
      if (a.host && a.host !== host) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }());

  /* -------------------------------------------------------------- search -- */
  (function search() {
    var input = $('#searchInput');
    var out = $('#searchResults');
    var status = $('#searchStatus');
    if (!input || !out) return;

    var docs = null;
    var indexUrl = out.getAttribute('data-index') || '/search.json';

    var esc = function (s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    };

    var render = function (results, query) {
      if (!query) {
        out.innerHTML = '';
        status.textContent = docs.length + ' posts indexed. Start typing.';
        return;
      }
      if (!results.length) {
        out.innerHTML = '';
        status.textContent = 'No posts match "' + query + '".';
        return;
      }
      status.textContent = results.length + (results.length === 1 ? ' match' : ' matches') + ' for "' + query + '".';
      out.innerHTML = results.map(function (d) {
        var tags = (d.tags || '').split(' ').filter(Boolean).map(function (t) {
          return '<li><span class="chip">#' + esc(t) + '</span></li>';
        }).join('');
        return '<article class="card post-card">' +
          '<h2 class="post-card__title"><a href="' + esc(d.url) + '">' + esc(d.title) + '</a></h2>' +
          '<div class="meta"><span class="meta__item">' + esc(d.dateLabel) + '</span>' +
          (d.categories ? '<span class="chip chip--cat">' + esc(d.categories) + '</span>' : '') +
          '</div>' +
          '<p class="post-card__excerpt">' + esc(d.summary) + '</p>' +
          (tags ? '<ul class="tag-list">' + tags + '</ul>' : '') +
          '</article>';
      }).join('');
    };

    var score = function (doc, terms) {
      var title = doc.title.toLowerCase();
      var meta = ((doc.tags || '') + ' ' + (doc.categories || '')).toLowerCase();
      var text = ((doc.summary || '') + ' ' + (doc.body || '')).toLowerCase();
      var total = 0;
      for (var i = 0; i < terms.length; i++) {
        var t = terms[i];
        var hit = 0;
        if (title.indexOf(t) !== -1) hit += 10;
        if (meta.indexOf(t) !== -1) hit += 5;
        if (text.indexOf(t) !== -1) hit += 1;
        if (!hit) return 0; // every term must appear somewhere
        total += hit;
      }
      return total;
    };

    var run = function () {
      if (!docs) return;
      var query = input.value.trim();
      var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
      if (!terms.length) return render([], '');
      // Matching decides which posts appear; publication date decides the order,
      // newest first, so the freshest answer is always at the top.
      var hits = docs.map(function (d) { return { doc: d, s: score(d, terms) }; })
        .filter(function (h) { return h.s > 0; })
        .sort(function (a, b) {
          if (a.doc.date !== b.doc.date) { return a.doc.date < b.doc.date ? 1 : -1; }
          return b.s - a.s;
        })
        .map(function (h) { return h.doc; });
      render(hits, query);
    };

    var xhr = new XMLHttpRequest();
    xhr.open('GET', indexUrl, true);
    xhr.onload = function () {
      if (xhr.status < 200 || xhr.status >= 300) {
        status.textContent = 'The search index could not be loaded.';
        return;
      }
      try {
        docs = JSON.parse(xhr.responseText);
      } catch (e) {
        status.textContent = 'The search index could not be read.';
        return;
      }
      var q = new RegExp('[?&]q=([^&]+)').exec(window.location.search);
      if (q) input.value = decodeURIComponent(q[1].replace(/\+/g, ' '));
      run();
      try { input.focus({ preventScroll: true }); } catch (e) { /* older browsers */ }
    };
    xhr.onerror = function () { status.textContent = 'The search index could not be loaded.'; };
    xhr.send();

    input.addEventListener('input', run);
  }());

  /* -------------------------------------------------------- copy post link -- */
  (function copyLink() {
    var btn = $('#copyLink');
    if (!btn) return;
    var label = btn.querySelector('.copyLink__label');
    btn.addEventListener('click', function () {
      var url = btn.getAttribute('data-url');
      var done = function (text) {
        btn.classList.add('is-done');
        label.textContent = text;
        window.setTimeout(function () {
          btn.classList.remove('is-done');
          label.textContent = 'Copy link';
        }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { done('Link copied'); },
                                               function () { done('Copy failed'); });
      } else {
        done('Copy failed');
      }
    });
  }());

  /* ------------------------------------------------------------ footer yr -- */
  (function year() {
    var el = $('#footerYear');
    if (el) el.textContent = new Date().getFullYear();
  }());
}());
