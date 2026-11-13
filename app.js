/* Page behaviour: theme, drawer, progress, search, code blocks, glossary filter, demo mounting. */
(function () {
  'use strict';
  var d = document;
  function $(s, r) { return (r || d).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); }
  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ }
    return null;
  }

  /* ---- theme ---- */
  var themeBtn = $('#theme');
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var cur = d.documentElement.getAttribute('data-theme');
    var dark = cur ? cur === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    var next = dark ? 'light' : 'dark';
    d.documentElement.setAttribute('data-theme', next);
    store('osd-theme', next);
  });

  /* ---- drawer ---- */
  var menu = $('#menu');
  function setNav(open) {
    d.body.classList.toggle('nav-open', open);
    if (menu) menu.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  if (menu) menu.addEventListener('click', function () { setNav(!d.body.classList.contains('nav-open')); });
  var scrim = $('#scrim');
  if (scrim) scrim.addEventListener('click', function () { setNav(false); });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape') setNav(false); });

  /* ---- progress ---- */
  function getDone() {
    try { return JSON.parse(store('osd-done') || '[]'); } catch (e) { return []; }
  }
  function paintDone() {
    var done = getDone();
    $$('[data-week]').forEach(function (el) {
      if (el.matches('.wk, .card')) el.classList.toggle('done', done.indexOf(+el.getAttribute('data-week')) >= 0);
    });
    var b = $('#mark-done');
    if (b) {
      var w = +b.getAttribute('data-week'), on = done.indexOf(w) >= 0;
      b.classList.toggle('on', on);
      b.textContent = on ? 'Week ' + w + ' complete. Click to undo' : 'Mark Week ' + w + ' as complete';
    }
  }
  var mark = $('#mark-done');
  if (mark) mark.addEventListener('click', function () {
    var w = +mark.getAttribute('data-week'), done = getDone(), i = done.indexOf(w);
    if (i >= 0) done.splice(i, 1); else done.push(w);
    store('osd-done', JSON.stringify(done));
    paintDone();
  });
  var reset = $('#reset-progress');
  if (reset) reset.addEventListener('click', function () {
    if (reset.getAttribute('data-arm') === '1') { store('osd-done', '[]'); reset.removeAttribute('data-arm'); reset.textContent = 'Reset progress'; paintDone(); }
    else { reset.setAttribute('data-arm', '1'); reset.textContent = 'Click again to confirm'; setTimeout(function () { reset.removeAttribute('data-arm'); reset.textContent = 'Reset progress'; }, 3000); }
  });
  paintDone();

  /* ---- search ---- */
  var q = $('#q'), box = $('#results');
  if (q && box && window.SEARCH_INDEX) {
    var sel = -1;
    function run() {
      var terms = q.value.toLowerCase().split(/\s+/).filter(Boolean);
      if (!terms.length) { box.hidden = true; return; }
      var scored = [];
      window.SEARCH_INDEX.forEach(function (e) {
        var t = e.t.toLowerCase(), x = (e.x || '').toLowerCase(), s = 0;
        for (var i = 0; i < terms.length; i++) {
          var inT = t.indexOf(terms[i]) >= 0, inX = x.indexOf(terms[i]) >= 0;
          if (!inT && !inX) { s = -1; break; }
          s += (inT ? 10 : 0) + (t.indexOf(terms[i]) === 0 ? 5 : 0) + (inX ? 2 : 0);
        }
        if (s > 0) scored.push([s, e]);
      });
      scored.sort(function (a, b) { return b[0] - a[0]; });
      box.innerHTML = '';
      scored.slice(0, 9).forEach(function (p) {
        var a = d.createElement('a'); a.href = p[1].u;
        a.appendChild(d.createTextNode(p[1].t));
        var sm = d.createElement('small'); sm.textContent = p[1].c; a.appendChild(sm);
        box.appendChild(a);
      });
      if (!scored.length) { var n = d.createElement('div'); n.className = 'none'; n.textContent = 'No matches.'; box.appendChild(n); }
      box.hidden = false; sel = -1;
    }
    q.addEventListener('input', run);
    q.addEventListener('focus', run);
    q.addEventListener('keydown', function (e) {
      var items = $$('a', box);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!items.length) return;
        sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items.forEach(function (a, i) { a.classList.toggle('sel', i === sel); });
      } else if (e.key === 'Enter' && items.length) { items[sel < 0 ? 0 : sel].click(); }
      else if (e.key === 'Escape') { box.hidden = true; q.blur(); }
    });
    d.addEventListener('click', function (e) { if (!e.target.closest('.search')) box.hidden = true; });
    d.addEventListener('keydown', function (e) {
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test((d.activeElement || {}).tagName || '')) { e.preventDefault(); q.focus(); }
    });
  }

  /* ---- glossary filter ---- */
  var gf = $('#gfilter');
  if (gf) gf.addEventListener('input', function () {
    var v = gf.value.toLowerCase();
    $$('.gl').forEach(function (g) { g.hidden = v && g.textContent.toLowerCase().indexOf(v) < 0; });
  });

  /* ---- code blocks: wrap, label, highlight, copy ---- */
  var KW = {
    c: 'auto break case char const continue default do double else enum extern float for goto if inline int long register restrict return short signed sizeof static struct switch typedef union unsigned void volatile while NULL bool true false size_t pid_t pthread_t uint8_t uint16_t uint32_t uint64_t int8_t int32_t int64_t ssize_t off_t sem_t pthread_mutex_t pthread_cond_t',
    python: 'and as assert break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield',
    bash: 'if then else elif fi for while do done case esac function in echo cd export local return exit'
  };
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function highlight(src, lang) {
    var kws = KW[lang === 'sh' ? 'bash' : lang];
    if (!kws) return esc(src);
    var set = {}; kws.split(' ').forEach(function (k) { set[k] = 1; });
    var com = lang === 'c' ? '\\/\\*[\\s\\S]*?\\*\\/|\\/\\/[^\\n]*' : '#[^\\n]*';
    var re = new RegExp('(' + com + ')|("(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\')|(^[ \\t]*#\\s*\\w+)|(\\b0x[0-9a-fA-F]+\\b|\\b\\d+(?:\\.\\d+)?\\b)|([A-Za-z_]\\w*)', 'gm');
    var out = '', last = 0, m;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index));
      if (m[1]) out += '<span class="hl-c">' + esc(m[1]) + '</span>';
      else if (m[2]) out += '<span class="hl-s">' + esc(m[2]) + '</span>';
      else if (m[3]) out += lang === 'c' ? '<span class="hl-k">' + esc(m[3]) + '</span>' : esc(m[3]);
      else if (m[4]) out += '<span class="hl-n">' + m[4] + '</span>';
      else out += set[m[5]] ? '<span class="hl-k">' + m[5] + '</span>' : m[5];
      last = m.index + m[0].length;
      if (m[0].length === 0) re.lastIndex++;
    }
    return out + esc(src.slice(last));
  }
  $$('.prose pre > code, .doc pre > code').forEach(function (code) {
    var pre = code.parentNode;
    if (pre.classList.contains('diagram')) return;
    var lang = ((code.className.match(/language-(\w+)/) || [])[1]) || 'text';
    var src = code.textContent;
    if (lang !== 'text') code.innerHTML = highlight(src, lang);
    var wrap = d.createElement('div'); wrap.className = 'codeblock';
    var bar = d.createElement('div'); bar.className = 'bar';
    var lab = d.createElement('span'); lab.textContent = lang;
    var btn = d.createElement('button'); btn.type = 'button'; btn.textContent = 'Copy';
    btn.addEventListener('click', function () {
      function ok() { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy'; }, 1400); }
      function fallback() {
        var r = d.createRange(); r.selectNodeContents(code);
        var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = 'Press Ctrl+C';
      }
      try { navigator.clipboard.writeText(src).then(ok, fallback); } catch (e) { fallback(); }
    });
    bar.appendChild(lab); bar.appendChild(btn);
    pre.parentNode.insertBefore(wrap, pre); wrap.appendChild(bar); wrap.appendChild(pre);
  });

  /* ---- demos ---- */
  $$('.demo[data-demo]').forEach(function (el) {
    var name = el.getAttribute('data-demo'), body = $('.demo-body', el);
    var fn = window.OSDEMOS && window.OSDEMOS[name];
    if (!fn) { body.textContent = 'This simulator is not available.'; return; }
    try { fn(body); } catch (e) { body.textContent = 'Simulator error: ' + e.message; if (window.console) console.error(e); }
  });
})();

/* ---- layout behaviour: progress bar, contents spy, reveal, back to top, home progress ---- */
(function () {
  'use strict';
  var d = document;
  function $(s, r) { return (r || d).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); }

  /* mount the home-page 3D stage */
  var hero = $('#hero-stage');
  if (hero && window.OSDEMOS && window.OSDEMOS['os-layers']) {
    try { window.OSDEMOS['os-layers'](hero, { hero: true }); } catch (e) { if (window.console) console.error(e); }
  }

  /* reading progress bar and back-to-top */
  var bar = $('#progress'), up = $('#totop'), ticking = false;
  function onScroll() {
    var h = d.documentElement, max = h.scrollHeight - h.clientHeight, y = h.scrollTop || d.body.scrollTop;
    if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
    if (up) up.classList.toggle('show', y > 700);
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  if (up) up.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  onScroll();

  /* contents list highlights the section being read */
  var links = $$('.toc a');
  if (links.length && 'IntersectionObserver' in window) {
    var map = {}, heads = [];
    links.forEach(function (a) {
      var id = decodeURIComponent(a.getAttribute('href').slice(1)), el = d.getElementById(id);
      if (el) { map[id] = a; heads.push(el); }
    });
    var current = null;
    function setOn(id) {
      if (current === id) return; current = id;
      links.forEach(function (a) { a.classList.remove('on'); });
      if (map[id]) { map[id].classList.add('on'); var box = map[id].closest('.toc'); if (box) { var r = map[id].getBoundingClientRect(), b = box.getBoundingClientRect(); if (r.top < b.top || r.bottom > b.bottom) map[id].scrollIntoView({ block: 'nearest' }); } }
    }
    function spy() {
      var best = heads[0], top = 120;
      heads.forEach(function (h) { if (h.getBoundingClientRect().top - top <= 0) best = h; });
      if (best) setOn(best.id);
    }
    window.addEventListener('scroll', function () { requestAnimationFrame(spy); }, { passive: true });
    spy();
  }

  /* keep the current week visible in the sidebar */
  var cur = $('.side .wk.on');
  if (cur) { var s = cur.closest('.side'); if (s) s.scrollTop = Math.max(0, cur.offsetTop - s.clientHeight / 3); }

  /* reveal on scroll: only elements that start below the fold are hidden, so nothing is ever stuck hidden */
  $$('.demo, .figure').forEach(function (el) { el.classList.add('reveal'); });
  var rev = $$('.reveal');
  if (rev.length && 'IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    rev.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight) el.classList.add('in'); else io.observe(el);
    });
    setTimeout(function () { rev.forEach(function (el) { if (el.getBoundingClientRect().top < window.innerHeight * 1.2) el.classList.add('in'); }); }, 1500);
  } else rev.forEach(function (el) { el.classList.add('in'); });

  /* overall progress on the home page */
  var ob = $('#overall-bar'), ot = $('#overall-text');
  if (ob && ot) {
    var done = [];
    try { done = JSON.parse(localStorage.getItem('osd-done') || '[]'); } catch (e) { done = []; }
    var total = $$('.card[data-week]:not(.soon)').length || 16;
    requestAnimationFrame(function () { ob.style.width = Math.round(done.length / total * 100) + '%'; });
    ot.textContent = done.length + ' of ' + total + ' weeks complete';
  }
})();
