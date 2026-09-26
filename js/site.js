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

  /* ------------------------------------------------- guard prose copying -- */
  (function guardCopy() {
    // CSS already blocks selection, but a select-all or a scripted selection can
    // still reach the clipboard, so refuse the copy unless it is code.
    // Deliberately narrow: only selections inside .prose are considered, so the
    // copy-link button, the nav and anything outside a post body are untouched.
    var CODE = 'pre, code, .highlight, .highlighter-rouge, .code-wrap, kbd, samp';
    var NOT_CODE = 'pre.mermaid';

    var closestMatch = function (node, sel) {
      var el = node && node.nodeType === 1 ? node : (node ? node.parentElement : null);
      return el ? el.closest(sel) : null;
    };

    document.addEventListener('copy', function (e) {
      var sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;

      // outside a post body: leave the browser alone
      if (!closestMatch(sel.anchorNode, '.prose') && !closestMatch(sel.focusNode, '.prose')) return;

      // both ends inside code means the reader is taking an example: allow it
      if (closestMatch(sel.anchorNode, CODE) && closestMatch(sel.focusNode, CODE)
          && !closestMatch(sel.anchorNode, NOT_CODE)) return;

      e.preventDefault();
    });
  }());

  /* --------------------------------------------------- copy code buttons -- */
  (function copyCode() {
    // Rouge emits <div class="highlight"><pre class="highlight">, so a naive
    // selector matches the same block twice and produced two buttons. Keep the
    // outermost container only, and skip mermaid, which renders to a diagram
    // with nothing to copy.
    var blocks = $$('.prose div.highlight, .prose pre.highlight, .prose > pre')
      .filter(function (el) {
        // mermaid arrives as <pre><code class="language-mermaid">, and is only
        // turned into a diagram later, so look inside as well as outside
        if (el.classList.contains('mermaid')) return false;
        if (el.closest('.language-mermaid')) return false;
        if (el.querySelector('code.language-mermaid, .language-mermaid')) return false;
        return !el.parentElement.closest('div.highlight, .code-wrap');
      });
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

    var pending = [];
    blocks.forEach(function (block, i) {
      var code = block.querySelector('code') || block;
      var pre = document.createElement('pre');
      pre.className = 'mermaid';
      // textContent, not innerText. innerText is layout-dependent and returns
      // an empty string for anything inside a collapsed <details>, so every
      // diagram in a closed accordion was handed empty source. mermaid then
      // rejected with "No diagram type detected", which aborted the whole
      // batch and left other diagrams blank or showing the wrong picture.
      var src = code.textContent;
      // Keep the source on the element. render() replaces the content, so it
      // cannot be read back off the DOM afterwards.
      pre.setAttribute('data-src', src);
      pre.setAttribute('data-seq', String(i));
      pre.textContent = src;
      // Rouge emits <pre><code class="language-mermaid">, so replacing the
      // <code> would leave the diagram nested inside the original <pre> and
      // give it two borders. Replace the outer <pre> when that is the shape.
      var target = (block.tagName === 'CODE' && block.parentElement
                    && block.parentElement.tagName === 'PRE')
                 ? block.parentElement : block;
      target.parentNode.replaceChild(pre, target);
      pending.push(pre);
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

    // Render one diagram at a time with render(), not run({nodes}), and inject
    // the returned SVG into that exact element.
    //
    // run() takes a batch and rejects as a whole, so a single diagram that
    // mermaid cannot measure aborted the rest and could leave an SVG attached
    // to the wrong element. That showed up as an unhandled rejection plus a
    // diagram displaying another question's picture. render() returns the SVG
    // as a string, so there is no ambiguity about where it lands, and each
    // failure is contained to its own diagram.
    var draw = function (el) {
      if (el.getAttribute('data-drawn')) return;
      el.setAttribute('data-drawn', '1');          // claim it synchronously
      var src = el.getAttribute('data-src') || el.textContent;
      var id = 'mermaid-' + el.getAttribute('data-seq');
      try {
        var out = window.mermaid.render(id, src);
        // mermaid 10+ returns a promise; older versions return {svg} directly.
        if (out && typeof out.then === 'function') {
          out.then(function (r) { el.innerHTML = r.svg; },
                   function () { el.removeAttribute('data-drawn'); });
        } else if (out && out.svg) {
          el.innerHTML = out.svg;
        }
      } catch (e) {
        el.removeAttribute('data-drawn');           // allow a later retry
      }
    };

    // Only draw what is actually visible. A diagram inside a collapsed
    // <details> cannot be measured, and Chrome keeps that content in the
    // layout tree for find-in-page, so a geometry check is not reliable:
    // ask whether every <details> ancestor is open instead.
    var visible = function (el) {
      for (var n = el.parentElement; n; n = n.parentElement) {
        if (n.tagName === 'DETAILS' && !n.open) return false;
        if (n === document.body) break;
      }
      return true;
    };

    var drawVisible = function () {
      pending.forEach(function (el) { if (visible(el)) draw(el); });
    };

    // mermaid sizes each node box by measuring its label in the font that is
    // active when it runs. Rendering before Inter has loaded measures the
    // fallback font and clips the last character of longer labels, so wait.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(drawVisible, drawVisible);
    } else {
      drawVisible();
    }

    // <details> fires `toggle` on open and close, so draw whatever just
    // became visible. draw() is a no-op for anything already done.
    $$('.prose details').forEach(function (d) {
      d.addEventListener('toggle', function () {
        if (d.open) drawVisible();
      });
    });
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

  /* -------------------------------------------------------------- counts -- */
  (function visitorCounts() {
    var code = window.GOATCOUNTER_CODE;
    if (!code) return;                       // analytics not configured

    var base = 'https://' + code + '.goatcounter.com/counter/';
    var CACHE_KEY = 'gcCounts';

    function fmt(n) { return Number(n).toLocaleString(); }

    // sessionStorage keeps one round of requests per visit, so moving between
    // pages does not re-ask for every post's count.
    function cached() {
      try { return JSON.parse(sessionStorage.getItem(CACHE_KEY)) || {}; }
      catch (e) { return {}; }
    }
    function remember(map) {
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(map)); } catch (e) {}
    }

    // GoatCounter answers /counter/<path>.json with {"count","count_unique"}
    // once "allow adding visitor counts" is on. Anything else resolves to null
    // and the widget stays hidden.
    //
    // Two query parameters, both load-bearing:
    //
    //   start  without it the endpoint answered {"count":"0"} for a site that
    //          demonstrably had data, so an explicit early date is what makes
    //          it report all of history.
    //   _      the responses are sent cache-control: public with a six hour
    //          expiry, so a zero fetched early gets served back for hours. An
    //          hourly bucket keeps the cache useful while letting the number
    //          move. Unknown parameters are ignored by the endpoint.
    function cacheBucket() {
      var d = new Date();
      return '' + d.getUTCFullYear() +
             ('0' + (d.getUTCMonth() + 1)).slice(-2) +
             ('0' + d.getUTCDate()).slice(-2) +
             ('0' + d.getUTCHours()).slice(-2);
    }

    // A path nobody has visited yet answers 404 with a zero body, which is a
    // real answer and not a failure: that post genuinely has no views. Treating
    // it as unknown is what kept the count hidden on every post except the two
    // that had been opened. Anything else, a network error or another status,
    // stays unknown so the widget hides rather than claiming zero.
    function fetchCount(path) {
      var url = base + encodeURIComponent(path) +
                '.json?start=2020-01-01&_=' + cacheBucket();
      return fetch(url, { mode: 'cors' })
        .then(function (r) {
          if (r.ok) return r.json();
          if (r.status === 404) return { count: '0', count_unique: '0' };
          return null;
        })
        .then(function (j) {
          if (!j) return null;
          return { count: parseInt(j.count, 10) || 0,
                   unique: parseInt(j.count_unique, 10) || 0 };
        })
        .catch(function () { return null; });
    }

    /* site totals: footer line and the stats page cards */
    var totalTargets = $('#siteTotals') || $('#statGrid') || $('#heroVisitors');
    if (totalTargets) {
      fetchCount('TOTAL').then(function (d) {
        if (!d) {
          var note = $('#statNote');
          if (note) note.textContent =
            'Counts are unavailable. Either the request was blocked, or public ' +
            'counters are not enabled on the GoatCounter site.';
          return;
        }
        [['#siteVisits', d.count], ['#statVisits', d.count],
         ['#siteVisitors', d.unique], ['#statVisitors', d.unique],
         ['#heroVisitorsN', d.unique]]
          .forEach(function (pair) {
            var el = $(pair[0]);
            if (el) el.textContent = fmt(pair[1]);
          });
        ['#siteTotals', '#statGrid', '#heroVisitors'].forEach(function (sel) {
          var el = $(sel);
          if (el) el.hidden = false;
        });
        var note = $('#statNote');
        if (note) note.hidden = true;
      });
    }

    /* per-page and per-post counts */
    var nodes = $$('[data-views-for]');
    if (!nodes.length) return;

    var store = cached();
    var paths = [];
    nodes.forEach(function (n) {
      var p = n.getAttribute('data-views-for');
      if (p && paths.indexOf(p) === -1) paths.push(p);
    });

    var pending = paths.filter(function (p) { return !(p in store); });

    Promise.all(pending.map(function (p) {
      return fetchCount(p).then(function (d) { store[p] = d ? d.count : null; });
    })).then(function () {
      remember(store);

      nodes.forEach(function (n) {
        var p = n.getAttribute('data-views-for');
        var v = store[p];
        if (v === null || v === undefined) return;      // unknown: stay hidden
        var out = n.querySelector('.meta__views-n, .views-n');
        if (out) out.textContent = fmt(v);
        n.setAttribute('data-views', String(v));
        // Entries inside a ranked list are revealed by the ranking pass below,
        // which keeps only the top few. Unhiding them here showed every post.
        if (!n.closest('#popularList, #statRank')) n.hidden = false;
      });

      // rank the lists that want ordering, keep the top few, drop the rest
      [['#popularList', 5], ['#statRank', 10]].forEach(function (pair) {
        var list = $(pair[0]);
        if (!list) return;
        // Rank only posts with at least one view. Every post now reports a
        // number, so without this the "most read" list would be a page of
        // zeroes on a site that is still new.
        var items = $$('[data-views-for]', list).filter(function (li) {
          return Number(li.getAttribute('data-views')) > 0;
        });
        if (!items.length) return;
        items.sort(function (a, b) {
          return Number(b.getAttribute('data-views')) - Number(a.getAttribute('data-views'));
        });
        items.forEach(function (li, i) {
          list.appendChild(li);
          li.hidden = i >= pair[1];
        });
        var panel = list.closest('.panel');
        if (panel) panel.hidden = false;
      });
    });
  }());
}());
