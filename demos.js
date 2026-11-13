/* Interactive simulators, part A: Weeks 1 to 7. Each demo is OSDEMOS[name](container). */
(function (root) {
  'use strict';
  var D = root.OSDEMOS = root.OSDEMOS || {};
  var L = D._lib = D._lib || {};

  /* ---------- helpers ---------- */
  function h(tag, attrs) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'value') e.value = v;
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), v);
      else if (v === true) e.setAttribute(k, '');
      else if (v !== false && v != null) e.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null) continue;
      if (Array.isArray(c)) c.forEach(function (x) { if (x != null) e.appendChild(typeof x === 'string' ? document.createTextNode(x) : x); });
      else e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return e;
  }
  function btn(label, fn, cls) { return h('button', { type: 'button', onclick: fn, class: cls || '' }, label); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function clear(e) { while (e.firstChild) e.removeChild(e.firstChild); return e; }
  function num(input, dflt) { var v = parseFloat(input.value); return isNaN(v) ? dflt : v; }
  var COLORS = ['#2f6fb5', '#c0562b', '#2c8a5a', '#8a4fb3', '#a37a00', '#0e8a96', '#b0386b', '#5b6b7a'];
  D._h = h; D._btn = btn; D._esc = esc; D._clear = clear; D._num = num; D._COLORS = COLORS;

  /* ================= Week 1: syscall-flow ================= */
  D['syscall-flow'] = function (c) {
    var steps = [
      { k: 'user', t: 'Your code calls write()', d: 'The program runs write(1, "hi\\n", 3). In user mode it can touch only its own memory.', r: 'rax=?  rdi=?  rsi=?  rdx=?' },
      { k: 'user', t: 'libc wrapper loads registers', d: 'The C library puts the system call number (1 for write on x86-64 Linux) in rax and the arguments in rdi, rsi and rdx.', r: 'rax=1  rdi=1  rsi=&"hi\\n"  rdx=3' },
      { k: 'user', t: 'The syscall instruction executes', d: 'The CPU raises its privilege level, saves the user instruction pointer, and jumps to the kernel entry point registered at boot. Your program cannot choose where it lands.', r: 'mode bit: user to kernel' },
      { k: 'kern', t: 'Kernel entry', d: 'The kernel switches to its own stack and saves the remaining user registers in a trap frame so it can restore them later.', r: 'registers saved on kernel stack' },
      { k: 'kern', t: 'Dispatch through the syscall table', d: 'The kernel checks that rax is a valid number, then calls sys_call_table[1], which is the write handler.', r: 'handler = ksys_write' },
      { k: 'kern', t: 'Validate and do the work', d: 'The kernel checks that fd 1 is open for writing, checks that the buffer address really belongs to the caller, finds the file object through the VFS, and hands the bytes to the terminal driver.', r: 'checks: fd ok, buffer ok, permission ok' },
      { k: 'kern', t: 'Prepare the return value', d: 'The handler returns 3 (bytes written). The kernel places it in rax and restores the saved registers.', r: 'rax=3' },
      { k: 'user', t: 'sysret drops back to user mode', d: 'The CPU lowers the privilege level and resumes your program right after the call. write() returns 3.', r: 'mode bit: kernel to user, rax=3' }
    ];
    var i = 0, flow = h('div', { class: 'flow' }), info = h('div', { class: 'note' }), mode = h('span', { class: 'pill' }), regs = h('span', { class: 'pill' });
    var rows = steps.map(function (s, n) {
      return h('div', { class: 'st ' + s.k }, h('b', { text: (n + 1) + '. ' + s.t }));
    });
    rows.forEach(function (r) { flow.appendChild(r); });
    function draw() {
      rows.forEach(function (r, n) { r.className = 'st ' + steps[n].k + (n === i ? ' on' : ''); });
      info.textContent = steps[i].d;
      mode.textContent = steps[i].k === 'user' ? 'USER MODE' : 'KERNEL MODE';
      mode.className = 'pill ' + (steps[i].k === 'user' ? 'run' : 'bad');
      regs.textContent = steps[i].r;
      prev.disabled = i === 0; next.disabled = i === steps.length - 1;
    }
    var prev = btn('Back', function () { i = Math.max(0, i - 1); draw(); });
    var next = btn('Next step', function () { i = Math.min(steps.length - 1, i + 1); draw(); }, 'primary');
    var rst = btn('Restart', function () { i = 0; draw(); });
    c.appendChild(h('div', { class: 'row' }, prev, next, rst, mode, regs));
    c.appendChild(flow); c.appendChild(info);
    c.appendChild(h('p', { class: 'note', text: 'Blue edge: runs in user mode. Orange edge: runs in kernel mode. Only the syscall and sysret instructions cross the boundary.' }));
    draw();
  };

  /* ================= Week 2: process-states ================= */
  D['process-states'] = function (c) {
    var procs, log;
    var cpuEl = h('span', { class: 'pill' }), readyEl = h('span', { class: 'pill' }), waitEl = h('span', { class: 'pill' });
    var table = h('div'), logEl = h('div', { class: 'log' });
    var NS = 'http://www.w3.org/2000/svg', POS = { new: [70, 100], ready: [250, 48], running: [430, 48], waiting: [340, 160], terminated: [570, 100] }, tokens = {}, diag;
    function mk(t, at, txt, par) { var e = document.createElementNS(NS, t); Object.keys(at).forEach(function (k) { e.setAttribute(k, at[k]); }); if (txt != null) e.textContent = txt; (par || diag).appendChild(e); return e; }
    function buildDiagram() {
      diag = document.createElementNS(NS, 'svg'); diag.setAttribute('viewBox', '0 0 640 205'); diag.style.maxWidth = '680px';
      var defs = mk('defs', {}); var mkr = mk('marker', { id: 'psarrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, null, defs); mk('path', { d: 'M0 0L10 5L0 10z', fill: '#8aa39d' }, null, mkr);
      function edge(d, lx, ly, label) { mk('path', { d: d, fill: 'none', stroke: '#8aa39d', 'stroke-width': 1.8, 'marker-end': 'url(#psarrow)' }); mk('text', { x: lx, y: ly, 'text-anchor': 'middle', class: 'mut' }, label); }
      edge('M122 92 L198 62', 160, 66, 'admit');
      edge('M300 40 C335 14 345 14 380 40', 340, 18, 'dispatch');
      edge('M380 62 C345 88 335 88 300 62', 340, 94, 'timer interrupt');
      edge('M410 80 L375 138', 418, 118, 'I/O wait');
      edge('M300 138 L262 80', 262, 125, 'I/O done');
      edge('M482 62 L520 88', 520, 66, 'exit');
      Object.keys(POS).forEach(function (k) { var p = POS[k]; mk('rect', { x: p[0] - 52, y: p[1] - 22, width: 104, height: 44, rx: 12, fill: 'var(--panel-2)', stroke: 'var(--line)' }); mk('text', { x: p[0], y: p[1] + 36, 'text-anchor': 'middle', class: 'mut' }, ''); mk('text', { x: p[0], y: p[1] - 28, 'text-anchor': 'middle' }, k.toUpperCase()); });
      procs.forEach(function (p, i) { var g = document.createElementNS(NS, 'g'); g.style.transition = 'transform .6s cubic-bezier(.4,.1,.2,1)'; mk('circle', { r: 13, fill: COLORS[i] }, null, g); var t = mk('text', { 'text-anchor': 'middle', y: 4, fill: '#fff' }, p.id, g); t.style.fill = '#fff'; diag.appendChild(g); tokens[p.id] = g; });
      diagBox.appendChild(diag);
    }
    var diagBox = h('div');
    function moveTokens() { procs.forEach(function (p, i) { var pos = POS[p.s]; tokens[p.id].style.transform = 'translate(' + (pos[0] + (i - 1) * 30) + 'px,' + (pos[1] + 0) + 'px)'; }); }
    var T = [
      { ev: 'admit', from: 'new', to: 'ready', label: 'Admit' },
      { ev: 'dispatch', from: 'ready', to: 'running', label: 'Dispatch' },
      { ev: 'timeout', from: 'running', to: 'ready', label: 'Timer interrupt' },
      { ev: 'wait', from: 'running', to: 'waiting', label: 'Wait for I/O' },
      { ev: 'done', from: 'waiting', to: 'ready', label: 'I/O complete' },
      { ev: 'exit', from: 'running', to: 'terminated', label: 'Exit' }
    ];
    function reset() {
      procs = [1, 2, 3].map(function (n) { return { id: 'P' + n, s: 'new', q: 0 }; });
      if (!diag) buildDiagram();
      log = ['Three processes were just created. One CPU, so at most one can be running.']; draw();
    }
    var tick = 0;
    function fire(p, t) {
      p.s = t.to; p.q = ++tick;
      log.push(p.id + ': ' + t.from + ' to ' + t.to + '  (' + t.label + ')'); draw();
    }
    function draw() {
      clear(table);
      var cpuBusy = procs.some(function (p) { return p.s === 'running'; });
      procs.forEach(function (p) {
        var row = h('div', { class: 'row' }, h('b', { text: p.id, class: 'big' }), h('span', { class: 'pill ' + (p.s === 'running' ? 'run' : p.s === 'terminated' ? 'good' : p.s === 'waiting' ? 'bad' : ''), text: p.s.toUpperCase() }));
        T.filter(function (t) { return t.from === p.s; }).forEach(function (t) {
          var b = btn(t.label, function () { fire(p, t); });
          if (t.ev === 'dispatch' && cpuBusy) { b.disabled = true; b.title = 'The CPU is busy: only one process can be running'; }
          row.appendChild(b);
        });
        table.appendChild(row);
      });
      var run = procs.filter(function (p) { return p.s === 'running'; })[0];
      var rd = procs.filter(function (p) { return p.s === 'ready'; }).sort(function (a, b) { return a.q - b.q; });
      var wt = procs.filter(function (p) { return p.s === 'waiting'; });
      cpuEl.textContent = 'CPU: ' + (run ? run.id : 'idle');
      readyEl.textContent = 'Ready queue: ' + (rd.map(function (p) { return p.id; }).join(' , ') || 'empty');
      waitEl.textContent = 'Waiting: ' + (wt.map(function (p) { return p.id; }).join(' , ') || 'none');
      logEl.textContent = log.slice(-8).join('\n'); logEl.scrollTop = logEl.scrollHeight;
      if (diag) moveTokens();
    }
    c.appendChild(diagBox);
    c.appendChild(table);
    c.appendChild(h('div', { class: 'row' }, cpuEl, readyEl, waitEl, btn('Reset', reset)));
    c.appendChild(logEl);
    c.appendChild(h('p', { class: 'note', text: 'Only legal transitions are offered. Try to reach a state where nobody is running but a process is ready: the dispatcher must pick one.' }));
    reset();
  };

  /* ================= Week 3: fork-tree ================= */
  function parseProg(src) {
    var lines = [], errs = [];
    src.split('\n').forEach(function (raw, n) {
      var s = raw.replace(/\/\/.*$/, '').trim();
      if (!s) return;
      var rep = 1, only = null, m;
      for (var guard = 0; guard < 3; guard++) {
        if ((m = s.match(/^repeat\s+(\d+)\s*:\s*(.*)$/i))) { rep *= Math.min(+m[1], 6); s = m[2]; }
        else if ((m = s.match(/^(child|parent)\s*:\s*(.*)$/i))) { only = m[1].toLowerCase(); s = m[2]; }
        else break;
      }
      var op = null;
      if ((m = s.match(/^fork\s*\(\s*\)\s*;?$/i))) op = { o: 'fork' };
      else if ((m = s.match(/^print\s+(.+?)\s*;?$/i))) op = { o: 'print', v: m[1].replace(/^["']|["']$/g, '') };
      else if ((m = s.match(/^wait\s*\(\s*\)\s*;?$/i))) op = { o: 'wait' };
      else if ((m = s.match(/^exit\s*\(\s*\)\s*;?$/i))) op = { o: 'exit' };
      else { errs.push('Line ' + (n + 1) + ': cannot read "' + raw.trim() + '"'); return; }
      op.only = only;
      for (var r = 0; r < rep; r++) lines.push(op);
    });
    return { lines: lines, errs: errs };
  }
  L.simFork = function (src, childFirst) {
    var pr = parseProg(src), lines = pr.lines, MAX = 64;
    var procs = [{ id: 0, parent: -1, pc: 0, done: false, rv: null, out: [], waiting: false, kids: [] }], trace = [], cap = false, steps = 0;
    function alive() { return procs.filter(function (p) { return !p.done; }); }
    function kidsDone(p) { return p.kids.every(function (k) { return procs[k].done; }); }
    while (steps++ < 5000) {
      var run = alive().filter(function (p) { return !p.waiting || kidsDone(p); });
      if (!run.length) break;
      var p = childFirst ? run[run.length - 1] : run[0];
      p.waiting = false;
      if (p.pc >= lines.length) { p.done = true; continue; }
      var op = lines[p.pc];
      if (op.only === 'child' && p.rv !== 0) { p.pc++; continue; }
      if (op.only === 'parent' && p.rv === 0) { p.pc++; continue; }
      p.pc++;
      if (op.o === 'print') { p.out.push(op.v); trace.push(op.v); }
      else if (op.o === 'exit') p.done = true;
      else if (op.o === 'wait') { if (!kidsDone(p)) p.waiting = true; }
      else if (op.o === 'fork') {
        if (procs.length >= MAX) { cap = true; continue; }
        var ch = { id: procs.length, parent: p.id, pc: p.pc, done: false, rv: 0, out: [], waiting: false, kids: [] };
        procs.push(ch); p.kids.push(ch.id); p.rv = ch.id;
      }
    }
    return { procs: procs, trace: trace, errs: pr.errs, capped: cap };
  };
  D['fork-tree'] = function (c) {
    var presets = {
      'Two forks in a row': 'fork()\nfork()\nprint X',
      'Parent waits for child': 'fork()\nchild: print C\nparent: wait()\nparent: print P',
      'Three forks in a loop': 'repeat 3: fork()\nprint *',
      'Fork then branch': 'fork()\nchild: fork()\nprint A\nparent: wait()\nprint B'
    };
    var ta = h('textarea', { id: 'fork-src', spellcheck: 'false' }), sel = h('select', { id: 'fork-preset' });
    Object.keys(presets).forEach(function (k) { sel.appendChild(h('option', { value: k, text: k })); });
    var order = h('select', { id: 'fork-order' }, h('option', { value: 'p', text: 'parent runs first' }), h('option', { value: 'c', text: 'child runs first' }));
    var out = h('div');
    function run() {
      var r = L.simFork(ta.value, order.value === 'c');
      clear(out);
      if (r.errs.length) out.appendChild(h('p', { class: 'note', text: r.errs.join('  ') }));
      var tree = '';
      (function walk(id, depth) {
        var p = r.procs[id];
        tree += new Array(depth + 1).join('    ') + (depth ? '|-- ' : '') + 'P' + id + (p.out.length ? '   prints: ' + p.out.join(' ') : '') + '\n';
        p.kids.forEach(function (k) { walk(k, depth + 1); });
      })(0, 0);
      out.appendChild(h('div', { class: 'row' }, h('span', { class: 'pill run', text: r.procs.length + ' process' + (r.procs.length === 1 ? '' : 'es') + (r.capped ? ' (capped at 64)' : '') }),
        h('span', { class: 'pill', text: 'printed ' + r.trace.length + ' time' + (r.trace.length === 1 ? '' : 's') })));
      out.appendChild(h('div', { class: 'log', text: tree }));
      out.appendChild(h('p', { class: 'note', text: 'One possible output: ' + (r.trace.join(' ') || '(nothing)') + '   (the order of unsynchronised prints can differ on a real machine)' }));
    }
    sel.addEventListener('change', function () { ta.value = presets[sel.value]; run(); });
    c.appendChild(h('p', { class: 'note', html: 'Statements: <code>fork()</code>, <code>print X</code>, <code>wait()</code>, <code>exit()</code>. Prefix a line with <code>child:</code>, <code>parent:</code> or <code>repeat N:</code>.' }));
    c.appendChild(h('div', { class: 'row' }, h('label', null, 'Preset ', sel), h('label', null, 'Scheduler ', order), btn('Run', run, 'primary')));
    c.appendChild(ta); c.appendChild(out);
    ta.value = presets['Two forks in a row']; run();
  };

  /* ================= Week 4: scheduler ================= */
  L.schedule = function (procs, algo, q, preempt) {
    var n = procs.length, rem = {}, segs = [], ct = {}, first = {};
    procs.forEach(function (p) { rem[p.id] = p.burst; });
    function push(id, s, e) {
      var last = segs[segs.length - 1];
      if (last && last.id === id && last.end === s) last.end = e; else segs.push({ id: id, start: s, end: e });
      if (id != null && first[id] == null) first[id] = s;
    }
    var t = 0, done = 0, guard = 0;
    if (algo === 'RR') {
      var order = procs.slice().sort(function (a, b) { return a.arr - b.arr || a.id - b.id; }), queue = [], ai = 0;
      function admit() { while (ai < order.length && order[ai].arr <= t) queue.push(order[ai++]); }
      admit();
      while (done < n && guard++ < 10000) {
        if (!queue.length) { var nx = order[ai].arr; push(null, t, nx); t = nx; admit(); continue; }
        var p = queue.shift(), run = Math.min(q, rem[p.id]);
        push(p.id, t, t + run); t += run; rem[p.id] -= run; admit();
        if (rem[p.id] > 0) queue.push(p); else { ct[p.id] = t; done++; }
      }
    } else {
      var cur = null;
      while (done < n && guard++ < 10000) {
        var ready = procs.filter(function (p) { return p.arr <= t && rem[p.id] > 0; });
        if (!ready.length) { push(null, t, t + 1); t++; cur = null; continue; }
        function best(cmp) { return ready.slice().sort(cmp)[0]; }
        var pick;
        var keep = cur && rem[cur.id] > 0 ? cur : null;
        if (algo === 'FCFS') pick = keep || best(function (a, b) { return a.arr - b.arr || a.id - b.id; });
        else if (algo === 'SJF') pick = keep || best(function (a, b) { return a.burst - b.burst || a.arr - b.arr || a.id - b.id; });
        else if (algo === 'SRTF') pick = best(function (a, b) { return rem[a.id] - rem[b.id] || (keep && a.id === keep.id ? -1 : keep && b.id === keep.id ? 1 : 0) || a.arr - b.arr || a.id - b.id; });
        else pick = (preempt ? null : keep) || best(function (a, b) { return a.pri - b.pri || (keep && a.id === keep.id ? -1 : keep && b.id === keep.id ? 1 : 0) || a.arr - b.arr || a.id - b.id; });
        cur = pick; push(pick.id, t, t + 1); t++; rem[pick.id]--;
        if (rem[pick.id] === 0) { ct[pick.id] = t; done++; }
      }
    }
    var rows = procs.map(function (p) {
      var tat = ct[p.id] - p.arr;
      return { id: p.id, arr: p.arr, burst: p.burst, ct: ct[p.id], tat: tat, wt: tat - p.burst, rt: first[p.id] - p.arr };
    });
    var avg = function (k) { return rows.reduce(function (s, r) { return s + r[k]; }, 0) / rows.length; };
    var sw = 0, prevId;
    segs.forEach(function (s) { if (s.id != null) { if (prevId != null && prevId !== s.id) sw++; prevId = s.id; } });
    return { segs: segs, rows: rows, avgWT: avg('wt'), avgTAT: avg('tat'), avgRT: avg('rt'), switches: sw, end: t };
  };
  D.scheduler = function (c) {
    var data = [[0, 8, 3], [1, 4, 1], [2, 9, 4], [3, 5, 2]];
    var tbody = h('tbody'), out = h('div'), anim = { raf: 0, cover: null, head: null, label: null, total: 1 };
    var algo = h('select', { id: 'sched-algo' }), q = h('input', { type: 'number', min: '1', max: '20', value: '4', id: 'sched-q' }), pre = h('input', { type: 'checkbox', id: 'sched-pre' });
    [['FCFS', 'FCFS'], ['SJF', 'SJF (non-preemptive)'], ['SRTF', 'SRTF (preemptive SJF)'], ['RR', 'Round Robin'], ['PRI', 'Priority (low number wins)']].forEach(function (a) { algo.appendChild(h('option', { value: a[0], text: a[1] })); });
    function rowEls() {
      clear(tbody);
      data.forEach(function (r, i) {
        var tr = h('tr', null, h('td', { text: 'P' + (i + 1) }));
        [0, 1, 2].forEach(function (k) {
          var inp = h('input', { type: 'number', min: k === 1 ? '1' : '0', max: '99', value: String(r[k]), 'aria-label': ['arrival', 'burst', 'priority'][k] + ' of P' + (i + 1) });
          inp.addEventListener('input', function () { var v = parseInt(inp.value, 10); r[k] = isNaN(v) ? 0 : v; if (k === 1 && r[k] < 1) r[k] = 1; run(); });
          tr.appendChild(h('td', null, inp));
        });
        tr.appendChild(h('td', null, btn('x', function () { if (data.length > 1) { data.splice(i, 1); rowEls(); run(); } }, '')));
        tbody.appendChild(tr);
      });
    }
    function run() {
      var procs = data.map(function (r, i) { return { id: i + 1, arr: r[0], burst: Math.max(1, r[1]), pri: r[2] }; });
      var a = algo.value, res = L.schedule(procs, a === 'PRI' ? 'PRI' : a, Math.max(1, num(q, 4)), pre.checked);
      q.disabled = a !== 'RR'; pre.disabled = a !== 'PRI';
      clear(out);
      var total = res.end, g = h('div', { class: 'gantt' });
      res.segs.forEach(function (s) {
        var d = h('div', { text: s.id == null ? '' : 'P' + s.id, title: (s.id == null ? 'idle' : 'P' + s.id) + ' ' + s.start + ' to ' + s.end });
        d.style.width = ((s.end - s.start) / total * 100) + '%';
        d.style.background = s.id == null ? 'transparent' : COLORS[(s.id - 1) % COLORS.length];
        if (s.id == null) d.style.color = 'inherit';
        g.appendChild(d);
      });
      var ticks = h('div', { class: 'ticks' }), seen = {};
      res.segs.forEach(function (s) { [s.start, s.end].forEach(function (t) { if (!seen[t]) { seen[t] = 1; var sp = h('span', { text: String(t) }); sp.style.left = (t / total * 100) + '%'; ticks.appendChild(sp); } }); });
      var cover = h('div'), head = h('div'); cover.style.cssText = 'position:absolute;top:0;bottom:0;right:0;left:100%;background:var(--panel);opacity:.78;border:0;animation:none;transform:none;padding:0'; head.style.cssText = 'position:absolute;top:0;bottom:0;left:0;width:3px;background:var(--ink);border:0;padding:0;animation:none;transform:none;display:none';
      g.appendChild(cover); g.appendChild(head); anim.cover = cover; anim.head = head; anim.total = total;
      out.appendChild(g); out.appendChild(ticks);
      var tb = h('table', null, h('thead', null, h('tr', null, ['Process', 'Arrival', 'Burst', 'Finish', 'Turnaround', 'Waiting', 'Response'].map(function (x) { return h('th', { text: x }); }))));
      var bd = h('tbody');
      res.rows.forEach(function (r) { bd.appendChild(h('tr', null, ['P' + r.id, r.arr, r.burst, r.ct, r.tat, r.wt, r.rt].map(function (x) { return h('td', { text: String(x) }); }))); });
      var f = function (x) { return (Math.round(x * 100) / 100).toString(); };
      bd.appendChild(h('tr', null, h('th', { text: 'Average' }), h('td'), h('td'), h('td'), h('th', { text: f(res.avgTAT) }), h('th', { text: f(res.avgWT) }), h('th', { text: f(res.avgRT) })));
      tb.appendChild(bd); out.appendChild(h('div', { class: 'scroll' }, tb));
      out.appendChild(h('p', { class: 'note', text: 'Context switches between processes: ' + res.switches + '. Turnaround = finish - arrival. Waiting = turnaround - burst. Response = first run - arrival.' }));
    }
    var table = h('table', null, h('thead', null, h('tr', null, ['', 'Arrival', 'Burst', 'Priority', ''].map(function (x) { return h('th', { text: x }); }))), tbody);
    c.appendChild(h('div', { class: 'scroll' }, table));
    function play() {
      cancelAnimationFrame(anim.raf); if (!anim.cover) return;
      var dur = Math.min(9000, Math.max(2500, anim.total * 380)), t0 = performance.now(), cv = anim.cover, hd = anim.head;
      hd.style.display = 'block';
      (function tick(now) { var p = Math.min(1, (now - t0) / dur); cv.style.left = (p * 100) + '%'; hd.style.left = 'calc(' + (p * 100) + '% - 1px)'; if (p < 1) anim.raf = requestAnimationFrame(tick); else { hd.style.display = 'none'; cv.style.left = '100%'; } })(t0);
    }
    c.appendChild(h('div', { class: 'row' }, btn('Animate', play, 'primary'), btn('Add process', function () { if (data.length < 8) { data.push([data.length, 3, 3]); rowEls(); run(); } }),
      h('label', null, 'Algorithm ', algo), h('label', null, 'Quantum ', q), h('label', null, pre, 'Preemptive priority')));
    c.appendChild(out);
    [algo, q, pre].forEach(function (e) { e.addEventListener('input', run); e.addEventListener('change', run); });
    rowEls(); run();
  };

  /* ================= Week 5: race-condition ================= */
  D['race-condition'] = function (c) {
    var lock = h('input', { type: 'checkbox', id: 'race-lock' });
    var state, out = h('div'), msg = h('div', { class: 'note' }), stat = h('div', { class: 'note' });
    function prog() { return lock.checked ? ['lock()', 'r = counter', 'r = r + 1', 'counter = r', 'unlock()'] : ['r = counter', 'r = r + 1', 'counter = r']; }
    function reset() { state = { counter: 0, held: null, pc: [0, 0], r: [null, null], log: [] }; draw(); }
    function blocked(t) { return lock.checked && prog()[state.pc[t]] === 'lock()' && state.held !== null && state.held !== t; }
    function can(t) { return state.pc[t] < prog().length && !blocked(t); }
    function step(t) {
      if (!can(t)) return;
      var ins = prog()[state.pc[t]], T = 'T' + (t + 1);
      if (ins === 'lock()') state.held = t;
      else if (ins === 'unlock()') state.held = null;
      else if (ins === 'r = counter') state.r[t] = state.counter;
      else if (ins === 'r = r + 1') state.r[t]++;
      else if (ins === 'counter = r') state.counter = state.r[t];
      state.pc[t]++; state.log.push(T + ': ' + ins + '   (counter=' + state.counter + ')'); draw();
    }
    function finished() { return state.pc[0] >= prog().length && state.pc[1] >= prog().length; }
    function draw() {
      clear(out);
      var cols = h('div', { class: 'grid2' });
      [0, 1].forEach(function (t) {
        var ps = prog(), box = h('div', { class: 'box' }, h('h5', { text: 'Thread T' + (t + 1) + '   r = ' + (state.r[t] == null ? '?' : state.r[t]) }));
        ps.forEach(function (ins, i) {
          var d = h('div', { class: 'cell', text: ins }); d.style.display = 'block'; d.style.textAlign = 'left'; d.style.marginBottom = '2px';
          if (i < state.pc[t]) d.className = 'cell hit'; else if (i === state.pc[t]) d.className = 'cell cur';
          box.appendChild(d);
        });
        box.appendChild(h('div', { class: 'row' }, btn('Step T' + (t + 1), function () { step(t); }, 'primary'), blocked(t) ? h('span', { class: 'pill bad', text: 'blocked on lock' }) : null));
        box.querySelector('button').disabled = !can(t);
        cols.appendChild(box);
      });
      out.appendChild(cols);
      out.appendChild(h('div', { class: 'row' }, h('span', { class: 'big', text: 'counter = ' + state.counter }), h('span', { class: 'pill', text: 'lock: ' + (state.held == null ? 'free' : 'held by T' + (state.held + 1)) })));
      out.appendChild(h('div', { class: 'log', text: state.log.join('\n') || 'Each thread must add 1 to counter once. Expected final value: 2.' }));
      if (finished()) { msg.textContent = state.counter === 2 ? 'Final value 2: correct.' : 'Final value ' + state.counter + ': an update was lost.'; msg.style.color = state.counter === 2 ? 'var(--ok)' : 'var(--warn)'; }
      else msg.textContent = '';
    }
    function randomRun() {
      var s = { counter: 0, held: null, pc: [0, 0], r: [null, null] }, ps = prog(), guard = 0;
      while ((s.pc[0] < ps.length || s.pc[1] < ps.length) && guard++ < 100) {
        var opts = [0, 1].filter(function (t) { return s.pc[t] < ps.length && !(ps[s.pc[t]] === 'lock()' && s.held !== null && s.held !== t); });
        var t = opts[Math.floor(Math.random() * opts.length)], ins = ps[s.pc[t]];
        if (ins === 'lock()') s.held = t; else if (ins === 'unlock()') s.held = null; else if (ins === 'r = counter') s.r[t] = s.counter; else if (ins === 'r = r + 1') s.r[t]++; else s.counter = s.r[t];
        s.pc[t]++;
      }
      return s.counter;
    }
    function many() {
      var ok = 0, N = 2000;
      for (var i = 0; i < N; i++) if (randomRun() === 2) ok++;
      stat.textContent = N + ' random schedules ' + (lock.checked ? 'with' : 'without') + ' the lock: ' + ok + ' ended with 2 (correct), ' + (N - ok) + ' ended with 1 (lost update).';
    }
    lock.addEventListener('change', function () { stat.textContent = ''; reset(); });
    c.appendChild(h('div', { class: 'row' }, h('label', null, lock, 'Protect the update with a lock'), btn('Reset', reset), btn('Run 2000 random schedules', many)));
    c.appendChild(out); c.appendChild(msg); c.appendChild(stat);
    reset();
  };

  /* ================= Week 6: bounded-buffer ================= */
  D['bounded-buffer'] = function (c) {
    var N = 4, swap = h('input', { type: 'checkbox', id: 'bb-swap' }), out = h('div'), logEl = h('div', { class: 'log' }), st;
    function progs() {
      return swap.checked ? {
        P: ['wait(mutex)', 'wait(empty)', 'put item', 'signal(mutex)', 'signal(full)'],
        C: ['wait(full)', 'wait(mutex)', 'take item', 'signal(mutex)', 'signal(empty)']
      } : {
        P: ['wait(empty)', 'wait(mutex)', 'put item', 'signal(mutex)', 'signal(full)'],
        C: ['wait(full)', 'wait(mutex)', 'take item', 'signal(mutex)', 'signal(empty)']
      };
    }
    function reset() { st = { empty: N, full: 0, mutex: 1, buf: [], pc: { P: 0, C: 0 }, next: 1, log: [] }; draw(); }
    function blockedOn(a) {
      var ins = progs()[a][st.pc[a]], m = ins.match(/^wait\((\w+)\)/);
      return m && st[m[1]] <= 0 ? m[1] : null;
    }
    function step(a) {
      if (blockedOn(a)) return;
      var ins = progs()[a][st.pc[a]], m = ins.match(/^(wait|signal)\((\w+)\)/);
      if (m) st[m[2]] += m[1] === 'wait' ? -1 : 1;
      else if (ins === 'put item') st.buf.push(st.next++);
      else if (ins === 'take item') st.log.push('   consumer took item ' + st.buf.shift());
      st.log.push((a === 'P' ? 'producer: ' : 'consumer: ') + ins);
      st.pc[a] = (st.pc[a] + 1) % 5; draw();
    }
    function draw() {
      clear(out);
      var slots = h('div', { class: 'row' });
      for (var i = 0; i < N; i++) slots.appendChild(h('span', { class: 'cell' + (i < st.buf.length ? ' hit' : ''), text: i < st.buf.length ? String(st.buf[i]) : '-' }));
      out.appendChild(h('div', { class: 'row' }, h('b', { text: 'buffer' }), slots));
      out.appendChild(h('div', { class: 'row' }, ['empty', 'full', 'mutex'].map(function (k) { return h('span', { class: 'pill' + (st[k] < 0 ? ' bad' : ''), text: k + ' = ' + st[k] }); })));
      var grid = h('div', { class: 'grid2' });
      ['P', 'C'].forEach(function (a) {
        var box = h('div', { class: 'box' }, h('h5', { text: a === 'P' ? 'Producer' : 'Consumer' })), bl = blockedOn(a);
        progs()[a].forEach(function (ins, i) {
          var d = h('div', { class: 'cell', text: ins }); d.style.display = 'block'; d.style.textAlign = 'left'; d.style.marginBottom = '2px';
          d.className = 'cell' + (i === st.pc[a] ? (bl ? ' fault' : ' cur') : ''); box.appendChild(d);
        });
        var b = btn('Step', function () { step(a); }, 'primary'); b.disabled = !!bl;
        box.appendChild(h('div', { class: 'row' }, b, bl ? h('span', { class: 'pill bad', text: 'blocked on ' + bl }) : null));
        grid.appendChild(box);
      });
      out.appendChild(grid);
      if (blockedOn('P') && blockedOn('C')) out.appendChild(h('p', { class: 'note', style: 'color:var(--warn)', text: 'Deadlock: both sides are blocked and neither can ever signal the other.' }));
      logEl.textContent = st.log.slice(-10).join('\n'); logEl.scrollTop = logEl.scrollHeight; out.appendChild(logEl);
    }
    function rnd() {
      for (var i = 0; i < 12; i++) {
        var opts = ['P', 'C'].filter(function (a) { return !blockedOn(a); });
        if (!opts.length) break; step(opts[Math.floor(Math.random() * opts.length)]);
      }
    }
    c.appendChild(h('div', { class: 'row' }, h('label', null, swap, 'Swap the producer\'s two waits (wait(mutex) first)'), btn('Reset', reset), btn('Run 12 random steps', rnd)));
    c.appendChild(h('p', { class: 'note', text: 'Producer fills the buffer when it is not full, consumer empties it. With the waits swapped, fill the buffer and watch what happens.' }));
    c.appendChild(out); swap.addEventListener('change', reset); reset();
  };

  /* ================= Week 6: dining-philosophers ================= */
  D['dining-philosophers'] = function (c) {
    var mode = h('select', { id: 'dp-mode' }, h('option', { value: 'naive', text: 'Naive: left fork then right fork' }), h('option', { value: 'ordered', text: 'Ordered: lower-numbered fork first' }), h('option', { value: 'limited', text: 'Limited: at most 4 may sit down' }));
    var greedy = h('input', { type: 'checkbox', id: 'dp-greedy', checked: true });
    var st, svgBox = h('div'), info = h('div', { class: 'note' }), N = 5;
    function reset() { st = { s: [0, 0, 0, 0, 0], fork: [-1, -1, -1, -1, -1], meals: [0, 0, 0, 0, 0], seated: 0, steps: 0 }; draw(); }
    // state: 0 thinking, 1 hungry, 2 has first fork, 3 eating
    function forks(i) {
      var l = i, r = (i + 1) % N;
      if (mode.value === 'ordered') return [Math.min(l, r), Math.max(l, r)];
      return [l, r];
    }
    function possible(i) {
      var s = st.s[i], f = forks(i);
      if (s === 0) return { kind: 'hungry', acquire: false };
      if (s === 1) { if (mode.value === 'limited' && st.seated >= 4) return null; return st.fork[f[0]] < 0 ? { kind: 'first', acquire: true } : null; }
      if (s === 2) return st.fork[f[1]] < 0 ? { kind: 'second', acquire: true } : null;
      return { kind: 'release', acquire: false };
    }
    function act(i, p) {
      var f = forks(i);
      if (p.kind === 'hungry') st.s[i] = 1;
      else if (p.kind === 'first') { if (mode.value === 'limited') st.seated++; st.fork[f[0]] = i; st.s[i] = 2; }
      else if (p.kind === 'second') { st.fork[f[1]] = i; st.s[i] = 3; st.meals[i]++; }
      else { st.fork[f[0]] = -1; st.fork[f[1]] = -1; if (mode.value === 'limited') st.seated--; st.s[i] = 0; }
      st.steps++;
    }
    function deadlocked() {
      var any = false;
      for (var i = 0; i < N; i++) { if (possible(i)) return false; if (st.s[i] > 0) any = true; }
      return any;
    }
    function one() {
      var opts = [];
      for (var i = 0; i < N; i++) { var p = possible(i); if (p) opts.push([i, p]); }
      if (!opts.length) return false;
      if (greedy.checked) { var g = opts.filter(function (o) { return o[1].acquire || o[1].kind === 'hungry'; }); if (g.length) opts = g; }
      var o = opts[Math.floor(Math.random() * opts.length)]; act(o[0], o[1]); return true;
    }
    function run(n) { for (var i = 0; i < n; i++) { if (!one()) break; } draw(); }
    function draw() {
      clear(svgBox);
      var NS = 'http://www.w3.org/2000/svg', s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 300 250'); s.style.maxWidth = '340px';
      function mk(t, a) { var e = document.createElementNS(NS, t); Object.keys(a).forEach(function (k) { e.setAttribute(k, a[k]); }); return e; }
      s.appendChild(mk('circle', { cx: 150, cy: 125, r: 62, fill: 'none', stroke: 'currentColor', 'stroke-opacity': .25 }));
      var fills = ['#8aa39d', '#d9a400', '#c0562b', '#2c8a5a'], names = ['thinking', 'hungry', 'holds 1 fork', 'eating'];
      for (var i = 0; i < N; i++) {
        var a = -Math.PI / 2 + i * 2 * Math.PI / N, px = 150 + 90 * Math.cos(a), py = 125 + 90 * Math.sin(a);
        var fa = a + Math.PI / N, fx = 150 + 62 * Math.cos(fa), fy = 125 + 62 * Math.sin(fa), fx2 = 150 + 36 * Math.cos(fa), fy2 = 125 + 36 * Math.sin(fa);
        var o = st.fork[i];
        s.appendChild(mk('line', { x1: fx, y1: fy, x2: fx2, y2: fy2, stroke: o < 0 ? '#8aa39d' : COLORS[o % 8], 'stroke-width': o < 0 ? 2 : 5, 'stroke-linecap': 'round' }));
        s.appendChild(mk('circle', { cx: px, cy: py, r: 22, fill: fills[st.s[i]] }));
        var t = mk('text', { x: px, y: py + 4, 'text-anchor': 'middle', fill: '#fff' }); t.textContent = 'P' + i; t.style.fill = '#fff'; s.appendChild(t);
      }
      var cap = mk('text', { x: 150, y: 129, 'text-anchor': 'middle' }); cap.textContent = 'table'; cap.setAttribute('class', 'mut'); s.appendChild(cap);
      svgBox.appendChild(s);
      var dl = deadlocked();
      info.innerHTML = '<span class="pill ' + (dl ? 'bad' : 'good') + '">' + (dl ? 'DEADLOCK: every philosopher is waiting' : 'running') + '</span> steps ' + st.steps + ' &nbsp; meals per philosopher: ' + st.meals.join(', ') +
        '<br>' + st.s.map(function (x, i) { return 'P' + i + ' ' + names[x]; }).join(' &middot; ');
    }
    c.appendChild(h('div', { class: 'row' }, h('label', null, 'Strategy ', mode), h('label', null, greedy, 'Greedy scheduler (everyone grabs forks first)')));
    c.appendChild(h('div', { class: 'row' }, btn('Step', function () { run(1); }), btn('Run 100 steps', function () { run(100); }, 'primary'), btn('Reset', reset)));
    c.appendChild(svgBox); c.appendChild(info);
    c.appendChild(h('p', { class: 'note', text: 'Each fork sits between two philosophers. Fork i is the left fork of Pi and the right fork of P(i-1). Colored forks are held by that philosopher.' }));
    mode.addEventListener('change', reset); reset();
  };

  /* ================= Week 7: banker ================= */
  L.safety = function (alloc, max, avail) {
    var n = alloc.length, m = avail.length, need = alloc.map(function (a, i) { return a.map(function (x, j) { return max[i][j] - x; }); });
    var work = avail.slice(), fin = alloc.map(function () { return false; }), seq = [], trace = [], prog = true;
    while (prog) {
      prog = false;
      for (var i = 0; i < n; i++) {
        if (!fin[i] && need[i].every(function (x, j) { return x <= work[j]; })) {
          var before = work.slice();
          work = work.map(function (w, j) { return w + alloc[i][j]; });
          fin[i] = true; seq.push(i); trace.push({ p: i, before: before, after: work.slice() }); prog = true;
        }
      }
    }
    return { safe: fin.every(Boolean), seq: seq, trace: trace, need: need, stuck: fin.map(function (f, i) { return f ? -1 : i; }).filter(function (x) { return x >= 0; }) };
  };
  D.banker = function (c) {
    var A = [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]], M = [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]], V = [3, 3, 2];
    var out = h('div'), reqP = h('select', { id: 'bk-p' }), reqV = h('input', { type: 'text', value: '1 0 2', id: 'bk-req', style: 'max-width:120px' }), reqOut = h('div', { class: 'note' }), host = h('div');
    A.forEach(function (_, i) { reqP.appendChild(h('option', { value: String(i), text: 'P' + i, selected: i === 1 })); });
    function matrix(name, data) {
      var t = h('table', null, h('thead', null, h('tr', null, [name, 'A', 'B', 'C'].map(function (x) { return h('th', { text: x }); }))));
      var b = h('tbody');
      data.forEach(function (r, i) {
        var tr = h('tr', null, h('td', { text: 'P' + i }));
        r.forEach(function (v, j) { var inp = h('input', { type: 'number', min: '0', max: '99', value: String(v), 'aria-label': name + ' P' + i + ' ' + 'ABC'[j] }); inp.addEventListener('input', function () { r[j] = Math.max(0, parseInt(inp.value, 10) || 0); run(); }); tr.appendChild(h('td', null, inp)); });
        b.appendChild(tr);
      });
      t.appendChild(b); return t;
    }
    function availRow() {
      var tr = h('tr', null, h('td', { text: 'free' }));
      V.forEach(function (v, j) { var inp = h('input', { type: 'number', min: '0', max: '99', value: String(v), 'aria-label': 'Available ' + 'ABC'[j] }); inp.addEventListener('input', function () { V[j] = Math.max(0, parseInt(inp.value, 10) || 0); run(); }); tr.appendChild(h('td', null, inp)); });
      return h('table', null, h('thead', null, h('tr', null, ['Available', 'A', 'B', 'C'].map(function (x) { return h('th', { text: x }); }))), h('tbody', null, tr));
    }
    function run() {
      var r = L.safety(A, M, V); clear(out);
      var needT = h('table', null, h('thead', null, h('tr', null, ['Need', 'A', 'B', 'C'].map(function (x) { return h('th', { text: x }); }))), h('tbody', null, r.need.map(function (row, i) { return h('tr', null, [h('td', { text: 'P' + i })].concat(row.map(function (x) { return h('td', { text: String(x) }); }))); })));
      out.appendChild(h('div', { class: 'row' }, h('div', { class: 'scroll' }, needT)));
      out.appendChild(h('div', { class: 'row' }, h('span', { class: 'pill ' + (r.safe ? 'good' : 'bad'), text: r.safe ? 'SAFE STATE' : 'UNSAFE STATE' }),
        h('span', { class: 'big', text: r.safe ? '<' + r.seq.map(function (i) { return 'P' + i; }).join(', ') + '>' : 'stuck: ' + r.stuck.map(function (i) { return 'P' + i; }).join(', ') })));
      var tt = h('table', null, h('thead', null, h('tr', null, ['Step', 'Run', 'Work before', 'Work after'].map(function (x) { return h('th', { text: x }); }))), h('tbody', null, r.trace.map(function (s, k) { return h('tr', null, [k + 1, 'P' + s.p, s.before.join(' '), s.after.join(' ')].map(function (x) { return h('td', { text: String(x) }); })); })));
      out.appendChild(h('div', { class: 'scroll' }, tt));
      var a = h('p', { class: 'note', text: 'Work starts as Available. A process can finish when its Need fits in Work, and then it returns its Allocation to Work.' });
      out.appendChild(a);
    }
    function request() {
      var i = +reqP.value, rq = reqV.value.trim().split(/[\s,]+/).map(Number);
      if (rq.length !== 3 || rq.some(isNaN)) { reqOut.textContent = 'Enter three numbers, for example 1 0 2.'; return; }
      var need = A[i].map(function (a, j) { return M[i][j] - a; });
      if (rq.some(function (x, j) { return x > need[j]; })) { reqOut.textContent = 'Denied: the request exceeds P' + i + "'s declared maximum claim (Need = " + need.join(' ') + ').'; return; }
      if (rq.some(function (x, j) { return x > V[j]; })) { reqOut.textContent = 'P' + i + ' must wait: not enough free resources right now (Available = ' + V.join(' ') + ').'; return; }
      var A2 = A.map(function (r, k) { return k === i ? r.map(function (x, j) { return x + rq[j]; }) : r.slice(); }), V2 = V.map(function (x, j) { return x - rq[j]; }), r = L.safety(A2, M, V2);
      reqOut.textContent = r.safe ? 'Granted: the state after the request is safe, for example <' + r.seq.map(function (k) { return 'P' + k; }).join(', ') + '>.' : 'Denied: granting it would leave an unsafe state. P' + i + ' waits.';
    }
    clear(host);
    host.appendChild(h('div', { class: 'row' }, h('div', { class: 'scroll' }, matrix('Allocation', A)), h('div', { class: 'scroll' }, matrix('Max', M)), h('div', { class: 'scroll' }, availRow())));
    c.appendChild(host); c.appendChild(out);
    c.appendChild(h('div', { class: 'row' }, h('b', { text: 'Resource request:' }), reqP, reqV, btn('Test request', request, 'primary')));
    c.appendChild(reqOut); run();
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* Interactive simulators, part B: Weeks 8 to 14. */
(function (root) {
  'use strict';
  var D = root.OSDEMOS, L = D._lib, h = D._h, btn = D._btn, clear = D._clear, num = D._num;

  function table(head, rows, cls) {
    return h('div', { class: 'scroll' }, h('table', cls ? { class: cls } : null,
      h('thead', null, h('tr', null, head.map(function (x) { return h('th', { text: x }); }))),
      h('tbody', null, rows.map(function (r) { return h('tr', null, r.map(function (x) { return x instanceof Node ? h('td', null, x) : h('td', { text: String(x) }); })); }))));
  }
  function hex(n, w) { var s = n.toString(16).toUpperCase(); while (s.length < (w || 1)) s = '0' + s; return '0x' + s; }
  function bin(n, w) { var s = n.toString(2); while (s.length < w) s = '0' + s; return s; }
  function human(n) {
    var u = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB'], i = 0, x = n;
    while (x >= 1024 && i < u.length - 1) { x /= 1024; i++; }
    return (Math.round(x * 100) / 100) + ' ' + u[i];
  }
  function ints(s) { return s.split(/[\s,]+/).filter(Boolean).map(function (x) { return parseInt(x, 10); }).filter(function (x) { return !isNaN(x); }); }

  /* ================= Week 8: address-translation ================= */
  D['address-translation'] = function (c) {
    var LOGBITS = 12, ADDR = 1 << LOGBITS, pt = [], tlb = [], tick = 0, hist = [];
    var ps = h('select', { id: 'at-ps' }, [64, 128, 256, 512].map(function (v) { return h('option', { value: String(v), text: v + ' bytes', selected: v === 256 }); }));
    var inp = h('input', { type: 'text', value: '0x5C7', id: 'at-addr', style: 'max-width:140px' });
    var out = h('div'), ptEl = h('div'), hEl = h('div');
    function build(shuffle) {
      var pages = ADDR / +ps.value, fr = [], i;
      for (i = 0; i < pages; i++) fr.push(i);
      if (shuffle) for (i = fr.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = fr[i]; fr[i] = fr[j]; fr[j] = t; }
      else fr = fr.map(function (_, p) { return (p * 11 + 5) % pages; });
      pt = fr.map(function (f, p) { return { f: f, v: shuffle ? Math.random() > 0.2 : p % 6 !== 5 }; });
      tlb = []; hist = []; draw(-1); translate(true);
    }
    function translate(quiet) {
      var s = inp.value.trim(), a = /^0x/i.test(s) ? parseInt(s, 16) : parseInt(s, 10), size = +ps.value, ob = Math.log2(size);
      clear(out);
      if (isNaN(a) || a < 0 || a >= ADDR) { out.appendChild(h('p', { class: 'note', text: 'Enter an address from 0 to ' + (ADDR - 1) + ' (decimal or 0x hex). The logical space is ' + ADDR + ' bytes (12 bits).' })); return; }
      var p = Math.floor(a / size), o = a % size, pbits = LOGBITS - ob, hit = null, i;
      for (i = 0; i < tlb.length; i++) if (tlb[i].p === p) { hit = tlb[i]; break; }
      var steps = [];
      steps.push('Logical address ' + a + ' = ' + hex(a, 3) + ' = ' + bin(a, LOGBITS));
      steps.push('Split: page number = top ' + pbits + ' bits = ' + bin(p, pbits) + ' = ' + p + ',  offset = low ' + ob + ' bits = ' + bin(o, ob) + ' = ' + o);
      var result;
      if (hit) { hit.t = ++tick; steps.push('TLB: HIT for page ' + p + ' (frame ' + hit.f + '). No page table access.'); result = 'hit'; }
      else {
        steps.push('TLB: MISS. Read page table entry ' + p + ' from memory.');
        if (!pt[p].v) { steps.push('Page table entry ' + p + ' is INVALID: PAGE FAULT. The OS must load the page or kill the process.'); result = 'fault'; }
        else {
          steps.push('Entry ' + p + ': valid, frame ' + pt[p].f + '. Insert into the TLB' + (tlb.length >= 4 ? ' (evict least recently used).' : '.'));
          if (tlb.length >= 4) { tlb.sort(function (x, y) { return x.t - y.t; }); tlb.shift(); }
          tlb.push({ p: p, f: pt[p].f, t: ++tick }); result = 'miss';
        }
      }
      if (result !== 'fault') {
        var f = hit ? hit.f : pt[p].f, pa = f * size + o;
        steps.push('Physical address = frame ' + f + ' x ' + size + ' + offset ' + o + ' = ' + pa + ' = ' + hex(pa, 4));
        if (!quiet) hist.unshift([hex(a, 3), p, o, result.toUpperCase(), f, hex(pa, 4)]);
      } else if (!quiet) hist.unshift([hex(a, 3), p, o, 'FAULT', '-', '-']);
      out.appendChild(h('div', { class: 'log', text: steps.join('\n') }));
      out.appendChild(h('div', { class: 'row' }, h('b', { text: 'TLB (4 entries, LRU):' }), tlb.length ? tlb.map(function (e) { return h('span', { class: 'pill', text: 'page ' + e.p + ' to frame ' + e.f }); }) : h('span', { class: 'note', text: 'empty' })));
      draw(p);
      hist = hist.slice(0, 8);
      clear(hEl); if (hist.length) hEl.appendChild(table(['Address', 'Page', 'Offset', 'Result', 'Frame', 'Physical'], hist));
    }
    function draw(cur) {
      clear(ptEl);
      var rows = pt.map(function (e, p) { var r = [p, e.v ? e.f : '-', e.v ? 'valid' : 'invalid']; return r; });
      var t = table(['Page', 'Frame', 'Valid'], rows);
      var trs = t.querySelectorAll('tbody tr'); if (trs[cur]) trs[cur].style.background = 'var(--accent-soft)';
      t.style.maxHeight = '200px'; t.style.overflowY = 'auto';
      ptEl.appendChild(h('h5', { text: 'Page table (' + pt.length + ' entries)', class: 'note' })); ptEl.appendChild(t);
    }
    c.appendChild(h('div', { class: 'row' }, h('label', null, 'Page size ', ps), h('label', null, 'Logical address ', inp),
      btn('Translate', function () { translate(); }, 'primary'), btn('Random address', function () { inp.value = hex(Math.floor(Math.random() * ADDR), 3); translate(); }),
      btn('New page table', function () { build(true); })));
    c.appendChild(out); c.appendChild(h('div', { class: 'grid2' }, ptEl, hEl));
    ps.addEventListener('change', function () { build(false); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') translate(); });
    build(false);
  };

  /* ================= Week 8: mem-allocation ================= */
  L.alloc = function (holes, reqs, algo) {
    var hs = holes.slice(), log = [], failed = [];
    reqs.forEach(function (r, k) {
      var idx = -1, i;
      for (i = 0; i < hs.length; i++) {
        if (hs[i] < r) continue;
        if (idx < 0) idx = i;
        else if (algo === 'best' && hs[i] < hs[idx]) idx = i;
        else if (algo === 'worst' && hs[i] > hs[idx]) idx = i;
        if (algo === 'first') break;
      }
      if (idx < 0) { failed.push(r); log.push({ r: r, ok: false, holes: hs.slice() }); return; }
      var from = hs[idx]; hs[idx] -= r;
      log.push({ r: r, ok: true, from: from, idx: idx, left: hs[idx], holes: hs.slice() });
    });
    var freeTotal = hs.reduce(function (a, b) { return a + b; }, 0);
    return { holes: hs, log: log, failed: failed, free: freeTotal, largest: Math.max.apply(null, hs.concat([0])) };
  };
  D['mem-allocation'] = function (c) {
    var hi = h('input', { type: 'text', value: '100 500 200 300 600', id: 'ma-holes' }), ri = h('input', { type: 'text', value: '212 417 112 426', id: 'ma-reqs' });
    var algo = h('select', { id: 'ma-algo' }, [['first', 'First fit'], ['best', 'Best fit'], ['worst', 'Worst fit']].map(function (a) { return h('option', { value: a[0], text: a[1] }); }));
    var out = h('div');
    function run() {
      var holes = ints(hi.value).filter(function (x) { return x > 0; }), reqs = ints(ri.value).filter(function (x) { return x > 0; });
      clear(out);
      if (!holes.length || !reqs.length) { out.appendChild(h('p', { class: 'note', text: 'Enter hole sizes and request sizes (in KB), separated by spaces.' })); return; }
      var r = L.alloc(holes, reqs, algo.value);
      out.appendChild(table(['Request', 'Result', 'Holes afterwards (address order)'], r.log.map(function (s) {
        return ['P' + (r.log.indexOf(s) + 1) + ': ' + s.r + 'K', s.ok ? 'placed in hole ' + (s.idx + 1) + ' (' + s.from + 'K), ' + s.left + 'K left' : 'NO HOLE LARGE ENOUGH', s.holes.join('K, ') + 'K'];
      })));
      var mx = Math.max.apply(null, holes.concat(r.holes, [1])), bars = h('div');
      r.holes.forEach(function (x, i) {
        var b = h('div', { class: 'cell', text: x + 'K' }); b.style.display = 'block'; b.style.textAlign = 'left'; b.style.marginBottom = '2px'; b.style.width = Math.max(8, x / mx * 100) + '%'; b.style.background = 'var(--accent-soft)';
        bars.appendChild(b);
      });
      out.appendChild(h('p', { class: 'note', text: 'Remaining holes (width proportional to size):' })); out.appendChild(bars);
      var frag = r.failed.length && r.failed.some(function (f) { return f <= r.free; });
      out.appendChild(h('div', { class: 'row' },
        h('span', { class: 'pill ' + (r.failed.length ? 'bad' : 'good'), text: r.failed.length ? 'failed: ' + r.failed.map(function (x) { return x + 'K'; }).join(', ') : 'all placed' }),
        h('span', { class: 'pill', text: 'total free ' + r.free + 'K' }), h('span', { class: 'pill', text: 'largest hole ' + r.largest + 'K' })));
      if (frag) out.appendChild(h('p', { class: 'note', text: 'External fragmentation: a request failed even though the total free space (' + r.free + 'K) is larger than it, because no single hole is big enough.' }));
    }
    [hi, ri, algo].forEach(function (e) { e.addEventListener('input', run); e.addEventListener('change', run); });
    c.appendChild(h('div', { class: 'row' }, h('label', null, 'Free holes (KB) ', hi), h('label', null, 'Requests (KB, in order) ', ri), h('label', null, 'Policy ', algo)));
    c.appendChild(out); run();
  };

  /* ================= Week 9: eat-calculator ================= */
  L.eat = function (m, tlb, hit, p, svcNs) {
    var emat = hit * (tlb + m) + (1 - hit) * (tlb + 2 * m), eat = (1 - p) * emat + p * svcNs;
    var pmax = svcNs > emat ? 0.1 * emat / (svcNs - emat) : NaN;
    return { emat: emat, eat: eat, slow: (eat / emat - 1) * 100, pmax: pmax };
  };
  D['eat-calculator'] = function (c) {
    function slider(id, min, max, step, val) { return h('input', { type: 'range', id: id, min: String(min), max: String(max), step: String(step), value: String(val) }); }
    var m = slider('eat-m', 10, 400, 5, 100), tl = slider('eat-t', 0, 50, 1, 5), hr = slider('eat-h', 0, 100, 1, 98), pe = slider('eat-p', -9, -1, 0.1, -6), sv = slider('eat-s', 1, 20, 0.5, 8);
    var lbl = {}, out = h('div');
    function row(name, el, key) { lbl[key] = h('span', { class: 'big' }); return h('div', { class: 'row' }, h('label', { style: 'min-width:220px' }, name), el, lbl[key]); }
    function run() {
      var mv = +m.value, tv = +tl.value, hv = +hr.value / 100, pv = Math.pow(10, +pe.value), sm = +sv.value, r = L.eat(mv, tv, hv, pv, sm * 1e6);
      lbl.m.textContent = mv + ' ns'; lbl.t.textContent = tv + ' ns'; lbl.h.textContent = (hv * 100).toFixed(0) + ' %'; lbl.p.textContent = pv.toExponential(1); lbl.s.textContent = sm + ' ms';
      clear(out);
      out.appendChild(h('div', { class: 'log', text:
        'EMAT  = h x (t + m) + (1 - h) x (t + 2m)\n      = ' + hv.toFixed(2) + ' x (' + tv + ' + ' + mv + ') + ' + (1 - hv).toFixed(2) + ' x (' + tv + ' + ' + 2 * mv + ')\n      = ' + r.emat.toFixed(2) + ' ns\n\n' +
        'EAT   = (1 - p) x EMAT + p x fault service time\n      = (1 - ' + pv.toExponential(1) + ') x ' + r.emat.toFixed(2) + ' + ' + pv.toExponential(1) + ' x ' + (sm * 1e6).toExponential(1) + ' ns\n      = ' + r.eat.toFixed(2) + ' ns' }));
      out.appendChild(h('div', { class: 'row' }, h('span', { class: 'pill ' + (r.slow > 10 ? 'bad' : 'good'), text: 'slowdown from page faults: ' + r.slow.toFixed(2) + ' %' }),
        h('span', { class: 'pill', text: isNaN(r.pmax) ? '' : 'for under 10 % slowdown keep p below ' + r.pmax.toExponential(2) + ' (one fault per ' + Math.round(1 / r.pmax).toLocaleString() + ' accesses)' })));
      var share = Math.min(100, Math.max(0, (r.eat - r.emat) / r.eat * 100)), bar = h('div', { class: 'gantt' }, h('div', { text: share > 8 ? 'faults ' + share.toFixed(0) + '%' : '' }), h('div', { text: share < 92 ? 'translation + access' : '' }));
      bar.firstChild.style.width = share + '%'; bar.firstChild.style.background = '#c0562b'; bar.lastChild.style.width = (100 - share) + '%'; bar.lastChild.style.background = '#2f6fb5';
      out.appendChild(bar);
    }
    c.appendChild(row('Memory access time m', m, 'm')); c.appendChild(row('TLB lookup time t', tl, 't')); c.appendChild(row('TLB hit ratio h', hr, 'h'));
    c.appendChild(row('Page fault rate p (log scale)', pe, 'p')); c.appendChild(row('Page fault service time', sv, 's'));
    c.appendChild(out);
    [m, tl, hr, pe, sv].forEach(function (e) { e.addEventListener('input', run); }); run();
  };

  /* ================= Week 10: page-replacement ================= */
  L.replace = function (refs, nf, algo) {
    var frames = [], steps = [], faults = 0, hand = 0, refbit = [], fifoQ = [];
    refs.forEach(function (pg, t) {
      var idx = frames.indexOf(pg), fault = idx < 0, victim = null;
      if (fault) {
        faults++;
        if (frames.length < nf) {
          frames.push(pg); if (algo === 'Clock') refbit.push(1);
        } else {
          var v;
          if (algo === 'FIFO') { v = 0; }
          else if (algo === 'LRU') {
            var best = 1e9; v = 0;
            frames.forEach(function (f, i) { var last = refs.slice(0, t).lastIndexOf(f); if (last < best) { best = last; v = i; } });
          } else if (algo === 'OPT') {
            var far = -1; v = 0;
            frames.forEach(function (f, i) { var nx = refs.indexOf(f, t + 1); if (nx < 0) nx = 1e9 + i; if (nx > far) { far = nx; v = i; } });
          } else {
            while (refbit[hand]) { refbit[hand] = 0; hand = (hand + 1) % nf; }
            v = hand; hand = (hand + 1) % nf;
          }
          victim = frames[v];
          if (algo === 'FIFO') { frames.shift(); frames.push(pg); }
          else if (algo === 'LRU') { frames.splice(v, 1); frames.push(pg); }
          else { frames[v] = pg; if (algo === 'Clock') refbit[v] = 1; }
        }
      } else if (algo === 'Clock') refbit[idx] = 1;
      else if (algo === 'LRU') { frames.splice(idx, 1); frames.push(pg); }
      steps.push({ pg: pg, fault: fault, victim: victim, frames: frames.slice(), bits: refbit.slice() });
    });
    return { steps: steps, faults: faults };
  };
  D['page-replacement'] = function (c) {
    var PRE = { 'Textbook string': ['7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1', 3], "Belady's anomaly": ['1 2 3 4 1 2 5 1 2 3 4 5', 3], 'Locality': ['1 2 3 1 2 3 1 2 3 4 5 6 4 5 6 4 5 6', 3] };
    var ri = h('input', { type: 'text', id: 'pr-refs', value: PRE['Textbook string'][0] }), nf = h('input', { type: 'number', id: 'pr-n', min: '1', max: '7', value: '3' });
    var algo = h('select', { id: 'pr-algo' }, ['FIFO', 'LRU', 'OPT', 'Clock'].map(function (a) { return h('option', { value: a, text: a }); })), out = h('div');
    function run() {
      var refs = ints(ri.value).filter(function (x) { return x >= 0 && x <= 99; }).slice(0, 40), n = Math.min(7, Math.max(1, Math.round(num(nf, 3))));
      clear(out); if (!refs.length) { out.appendChild(h('p', { class: 'note', text: 'Enter a reference string such as 7 0 1 2 0 3.' })); return; }
      var r = L.replace(refs, n, algo.value), t = h('table'), head = h('tr', null, h('th', { text: 'ref' })), i, j;
      r.steps.forEach(function (s) { head.appendChild(h('th', { text: String(s.pg) })); });
      t.appendChild(h('thead', null, head));
      var tb = h('tbody');
      for (j = 0; j < n; j++) {
        var tr = h('tr', null, h('th', { text: 'frame ' + (j + 1) }));
        r.steps.forEach(function (s, ci) {
          var v = s.frames[j], td = h('td', { class: 'pr' + (v != null && s.pg === v ? (s.fault ? ' fault' : ' hit') : ''), text: v == null ? '' : v + (algo.value === 'Clock' && s.bits[j] ? '*' : '') });
          td.style.animationDelay = (ci * 55) + 'ms'; tr.appendChild(td);
        });
        tb.appendChild(tr);
      }
      var fr = h('tr', null, h('th', { text: 'fault?' }));
      r.steps.forEach(function (s) { fr.appendChild(h('td', { text: s.fault ? 'F' : '', style: 'color:var(--warn);font-weight:600' })); });
      tb.appendChild(fr); t.appendChild(tb);
      out.appendChild(h('div', { class: 'scroll' }, t));
      var cmp = ['FIFO', 'LRU', 'OPT', 'Clock'].map(function (a) { return h('span', { class: 'pill' + (a === algo.value ? ' run' : ''), text: a + ': ' + L.replace(refs, n, a).faults }); });
      out.appendChild(h('div', { class: 'row' }, h('span', { class: 'big', text: r.faults + ' faults in ' + refs.length + ' references (' + Math.round(r.faults / refs.length * 100) + '%)' }), cmp));
      var bars = [], mx = 1, k, curve = [];
      for (k = 1; k <= 7; k++) { var f = L.replace(refs, k, algo.value).faults; curve.push(f); mx = Math.max(mx, f); }
      var anomaly = curve.some(function (v, q) { return q > 0 && v > curve[q - 1]; });
      out.appendChild(h('p', { class: 'note', text: algo.value + ' faults as frames go from 1 to 7: ' + curve.join(', ') + (anomaly ? '   Faults went UP when frames were added: Belady\'s anomaly.' : '') }));
      if (algo.value === 'Clock') out.appendChild(h('p', { class: 'note', text: '* marks a frame whose reference bit is set.' }));
    }
    var pres = h('div', { class: 'row' }, h('b', { text: 'Presets:' }));
    Object.keys(PRE).forEach(function (k) { pres.appendChild(btn(k, function () { ri.value = PRE[k][0]; nf.value = String(PRE[k][1]); run(); })); });
    c.appendChild(pres);
    c.appendChild(h('div', { class: 'row' }, h('label', null, 'Reference string ', ri), h('label', null, 'Frames ', nf), h('label', null, 'Algorithm ', algo)));
    c.appendChild(out); [ri, nf, algo].forEach(function (e) { e.addEventListener('input', run); e.addEventListener('change', run); }); run();
  };

  /* ================= Week 11: disk-scheduling ================= */
  L.disk = function (reqs, head, algo, dirUp, maxCyl, countJump) {
    var path = [head], jumps = [], cur = head, i;
    function go(x, jump) { path.push(x); jumps.push(!!jump); }
    var up = reqs.filter(function (x) { return x >= head; }).sort(function (a, b) { return a - b; });
    var dn = reqs.filter(function (x) { return x < head; }).sort(function (a, b) { return b - a; });
    function plain(x) { go(x, false); }
    if (algo === 'FCFS') reqs.forEach(plain);
    else if (algo === 'SSTF') {
      var left = reqs.slice();
      while (left.length) { var bi = 0; left.forEach(function (x, k) { if (Math.abs(x - cur) < Math.abs(left[bi] - cur)) bi = k; }); cur = left.splice(bi, 1)[0]; plain(cur); }
    } else if (algo === 'SCAN') {
      if (dirUp) { up.forEach(plain); if (path[path.length - 1] !== maxCyl) plain(maxCyl); dn.forEach(plain); }
      else { dn.forEach(plain); if (path[path.length - 1] !== 0) plain(0); up.forEach(plain); }
    } else if (algo === 'LOOK') {
      if (dirUp) { up.forEach(plain); dn.forEach(plain); } else { dn.forEach(plain); up.forEach(plain); }
    } else if (algo === 'C-SCAN') {
      if (dirUp) { up.forEach(plain); if (path[path.length - 1] !== maxCyl) plain(maxCyl); go(0, true); dn.slice().reverse().forEach(plain); }
      else { dn.forEach(plain); if (path[path.length - 1] !== 0) plain(0); go(maxCyl, true); up.slice().reverse().forEach(plain); }
    } else if (algo === 'C-LOOK') {
      if (dirUp) { up.forEach(plain); var lo = dn.slice().reverse(); if (lo.length) { go(lo[0], true); lo.slice(1).forEach(plain); } }
      else { dn.forEach(plain); var hi = up.slice().reverse(); if (hi.length) { go(hi[0], true); hi.slice(1).forEach(plain); } }
    }
    var total = 0;
    for (i = 1; i < path.length; i++) { if (jumps[i - 1] && !countJump) continue; total += Math.abs(path[i] - path[i - 1]); }
    return { path: path, total: total, jumps: jumps };
  };
  D['disk-scheduling'] = function (c) {
    var ri = h('input', { type: 'text', id: 'ds-req', value: '98 183 37 122 14 124 65 67' }), hd = h('input', { type: 'number', id: 'ds-head', min: '0', max: '199', value: '53' });
    var algo = h('select', { id: 'ds-algo' }, ['FCFS', 'SSTF', 'SCAN', 'C-SCAN', 'LOOK', 'C-LOOK'].map(function (a) { return h('option', { value: a, text: a }); }));
    var dir = h('select', { id: 'ds-dir' }, h('option', { value: 'down', text: 'toward cylinder 0' }), h('option', { value: 'up', text: 'toward cylinder 199' }));
    var cj = h('input', { type: 'checkbox', id: 'ds-jump', checked: true }), out = h('div'), cur = { pts: [], dot: null, raf: 0 };
    function run() {
      var reqs = ints(ri.value).filter(function (x) { return x >= 0 && x <= 199; }), head = Math.min(199, Math.max(0, Math.round(num(hd, 53))));
      clear(out); if (!reqs.length) return;
      var r = L.disk(reqs, head, algo.value, dir.value === 'up', 199, cj.checked), W = 640, H = 40 + r.path.length * 26, NS = 'http://www.w3.org/2000/svg';
      var s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 ' + (W + 20) + ' ' + H);
      function mk(t, a, txt) { var e = document.createElementNS(NS, t); Object.keys(a).forEach(function (k) { e.setAttribute(k, a[k]); }); if (txt != null) e.textContent = txt; s.appendChild(e); return e; }
      var X = function (v) { return 10 + v / 199 * W; }, Y = function (i) { return 24 + i * 26; };
      [0, 50, 100, 150, 199].forEach(function (t) { mk('line', { x1: X(t), y1: 14, x2: X(t), y2: H - 6, stroke: 'currentColor', 'stroke-opacity': .12 }); mk('text', { x: X(t), y: 10, 'text-anchor': 'middle', class: 'mut' }, String(t)); });
      for (var i = 1; i < r.path.length; i++) mk('line', { x1: X(r.path[i - 1]), y1: Y(i - 1), x2: X(r.path[i]), y2: Y(i), stroke: r.jumps[i - 1] ? '#8aa39d' : '#2f6fb5', 'stroke-width': 2, 'stroke-dasharray': r.jumps[i - 1] ? '4 4' : '' });
      r.path.forEach(function (v, i) { mk('circle', { cx: X(v), cy: Y(i), r: 4, fill: i === 0 ? '#c0562b' : '#2f6fb5' }); mk('text', { x: Math.min(W + 10, X(v) + 7), y: Y(i) + 4 }, String(v)); });
      cur.pts = r.path.map(function (v, i) { return [X(v), Y(i)]; }); cur.dot = mk('circle', { cx: cur.pts[0][0], cy: cur.pts[0][1], r: 7, fill: '#e5583a', stroke: '#fff', 'stroke-width': 2 });
      out.appendChild(s);
      out.appendChild(h('div', { class: 'row' }, h('span', { class: 'big', text: 'Total head movement: ' + r.total + ' cylinders' }), h('span', { class: 'pill', text: 'service order: ' + r.path.slice(1).join(' ') })));
      var all = ['FCFS', 'SSTF', 'SCAN', 'C-SCAN', 'LOOK', 'C-LOOK'].map(function (a) { return a + ' ' + L.disk(reqs, head, a, dir.value === 'up', 199, cj.checked).total; });
      out.appendChild(h('p', { class: 'note', text: 'All policies on this queue: ' + all.join('  |  ') + '.  Dashed lines are return jumps in C-SCAN and C-LOOK.' }));
    }
    [ri, hd, algo, dir, cj].forEach(function (e) { e.addEventListener('input', run); e.addEventListener('change', run); });
    c.appendChild(h('div', { class: 'row' }, h('label', null, 'Request queue ', ri), h('label', null, 'Head at ', hd)));
    function play() {
      cancelAnimationFrame(cur.raf); if (!cur.dot || cur.pts.length < 2) return;
      var pts = cur.pts, lens = [], tot = 0, i; for (i = 1; i < pts.length; i++) { var d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); lens.push(d); tot += d; }
      var dur = Math.min(9000, Math.max(2500, tot * 7)), t0 = performance.now(), dot = cur.dot;
      (function tick(now) {
        var p = Math.min(1, (now - t0) / dur), want = p * tot, k = 0; while (k < lens.length - 1 && want > lens[k]) { want -= lens[k]; k++; }
        var f = lens[k] ? Math.min(1, want / lens[k]) : 1; dot.setAttribute('cx', pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f); dot.setAttribute('cy', pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f);
        if (p < 1) cur.raf = requestAnimationFrame(tick);
      })(t0);
    }
    c.appendChild(h('div', { class: 'row' }, h('label', null, 'Policy ', algo), h('label', null, 'Initial direction ', dir), h('label', null, cj, 'Count the C-SCAN / C-LOOK return jump'), btn('Animate head', play, 'primary')));
    c.appendChild(out); run();
  };

  /* ================= Week 11: raid-calc ================= */
  L.raid = function (level, n, sizeTB) {
    var o = { ok: true, msg: '' };
    if (level === '0') o = { usable: n * sizeTB, tol: '0 (any failure loses data)', write: 1, read: n };
    else if (level === '1') o = { usable: sizeTB, tol: (n - 1) + ' (every disk holds a full copy)', write: n, read: n };
    else if (level === '5') { if (n < 3) return { ok: false, msg: 'RAID 5 needs at least 3 disks.' }; o = { usable: (n - 1) * sizeTB, tol: '1', write: 4, read: n - 1 }; }
    else if (level === '6') { if (n < 4) return { ok: false, msg: 'RAID 6 needs at least 4 disks.' }; o = { usable: (n - 2) * sizeTB, tol: '2', write: 6, read: n - 2 }; }
    else if (level === '10') { if (n < 4 || n % 2) return { ok: false, msg: 'RAID 10 needs an even number of disks, at least 4.' }; o = { usable: n / 2 * sizeTB, tol: '1 guaranteed, up to ' + n / 2 + ' if each failure hits a different mirror pair', write: 2, read: n }; }
    o.ok = true; o.eff = o.usable / (n * sizeTB) * 100; return o;
  };
  D['raid-calc'] = function (c) {
    var nI = h('input', { type: 'number', id: 'rd-n', min: '2', max: '16', value: '6' }), sI = h('input', { type: 'number', id: 'rd-s', min: '1', max: '100', value: '4' }), out = h('div');
    var levels = [['0', 'RAID 0 (striping)'], ['1', 'RAID 1 (n-way mirror)'], ['5', 'RAID 5 (single parity)'], ['6', 'RAID 6 (double parity)'], ['10', 'RAID 10 (striped mirrors)']];
    function run() {
      var n = Math.max(2, Math.min(16, Math.round(num(nI, 6)))), s = Math.max(1, num(sI, 4)); clear(out);
      var rows = levels.map(function (l) {
        var r = L.raid(l[0], n, s);
        return r.ok ? [l[1], r.usable + ' TB', Math.round(r.eff) + ' %', r.tol, r.write, r.read + 'x'] : [l[1], 'n/a', '', r.msg, '', ''];
      });
      out.appendChild(table(['Level', 'Usable', 'Efficiency', 'Failures survived', 'Disk I/Os per small write', 'Sequential read (vs 1 disk)'], rows));
      out.appendChild(h('p', { class: 'note', text: 'Parity levels pay the small-write penalty: RAID 5 reads old data and old parity, then writes new data and new parity (4 I/Os). RAID 6 does the same with two parity blocks (6 I/Os).' }));
    }
    [nI, sI].forEach(function (e) { e.addEventListener('input', run); });
    c.appendChild(h('div', { class: 'row' }, h('label', null, 'Number of disks ', nI), h('label', null, 'Size of each disk (TB) ', sI))); c.appendChild(out); run();
  };

  /* ================= Week 12: inode-calc ================= */
  L.inode = function (bs, ptr, nd, fileSize, offset) {
    var P = Math.floor(bs / ptr), maxBlocks = nd + P + P * P + P * P * P, maxBytes = maxBlocks * bs;
    var data = Math.ceil(fileSize / bs), meta = 0, rem = data;
    if (rem > nd) { rem -= nd; meta += 1; var s1 = Math.min(rem, P); rem -= s1;
      if (rem > 0) { meta += 1 + Math.ceil(Math.min(rem, P * P) / P); rem -= Math.min(rem, P * P);
        if (rem > 0) { meta += 1 + Math.ceil(rem / (P * P)) + Math.ceil(rem / P); } } }
    var b = Math.floor(offset / bs), where;
    if (b < nd) where = { lvl: 'direct', path: 'inode.direct[' + b + ']', reads: 0 };
    else if (b < nd + P) where = { lvl: 'single indirect', path: 'inode.indirect to block[' + (b - nd) + ']', reads: 1 };
    else if (b < nd + P + P * P) { var x = b - nd - P; where = { lvl: 'double indirect', path: 'inode.double to block[' + Math.floor(x / P) + '] to block[' + (x % P) + ']', reads: 2 }; }
    else if (b < maxBlocks) { var y = b - nd - P - P * P; where = { lvl: 'triple indirect', path: 'inode.triple to block[' + Math.floor(y / (P * P)) + '] to block[' + Math.floor(y / P) % P + '] to block[' + (y % P) + ']', reads: 3 }; }
    else where = { lvl: 'beyond maximum file size', path: 'not addressable', reads: null };
    return { P: P, maxBlocks: maxBlocks, maxBytes: maxBytes, data: data, meta: meta, b: b, where: where };
  };
  D['inode-calc'] = function (c) {
    var bs = h('select', { id: 'in-bs' }, [1024, 2048, 4096, 8192].map(function (v) { return h('option', { value: String(v), text: v / 1024 + ' KiB', selected: v === 4096 }); }));
    var pt = h('select', { id: 'in-ptr' }, [4, 8].map(function (v) { return h('option', { value: String(v), text: v + ' bytes' }); }));
    var nd = h('input', { type: 'number', id: 'in-nd', min: '0', max: '15', value: '12' }), fs = h('input', { type: 'number', id: 'in-fs', min: '0', value: '1000000' }), off = h('input', { type: 'number', id: 'in-off', min: '0', value: '5000000' }), out = h('div');
    function run() {
      var r = L.inode(+bs.value, +pt.value, Math.max(0, Math.round(num(nd, 12))), Math.max(0, num(fs, 0)), Math.max(0, num(off, 0))); clear(out);
      out.appendChild(table(['Quantity', 'Value'], [
        ['Pointers per block', r.P + '  (' + bs.value + ' / ' + pt.value + ')'],
        ['Blocks reachable', 'direct ' + nd.value + ' + single ' + r.P + ' + double ' + (r.P * r.P).toLocaleString() + ' + triple ' + (r.P * r.P * r.P).toLocaleString()],
        ['Maximum file size', human(r.maxBytes) + '  (' + r.maxBytes.toLocaleString() + ' bytes)'],
        ['File of ' + Number(fs.value).toLocaleString() + ' bytes', r.data + ' data blocks + ' + r.meta + ' pointer blocks = ' + (r.data + r.meta) + ' blocks on disk'],
        ['Byte offset ' + Number(off.value).toLocaleString(), 'logical block ' + r.b + ', ' + r.where.lvl],
        ['Pointer path', r.where.path], ['Extra disk reads (inode cached)', r.where.reads == null ? '-' : r.where.reads]
      ]));
      out.appendChild(h('p', { class: 'note', text: 'Each extra level multiplies reach by pointers-per-block, but costs one more block read before the data block can be read.' }));
    }
    [bs, pt, nd, fs, off].forEach(function (e) { e.addEventListener('input', run); e.addEventListener('change', run); });
    c.appendChild(h('div', { class: 'row' }, h('label', null, 'Block size ', bs), h('label', null, 'Pointer size ', pt), h('label', null, 'Direct pointers ', nd)));
    c.appendChild(h('div', { class: 'row' }, h('label', null, 'File size (bytes) ', fs), h('label', null, 'Byte offset to locate ', off)));
    c.appendChild(out); run();
  };

  /* ================= Week 14: chmod-calc ================= */
  D['chmod-calc'] = function (c) {
    var bits = [[1, 1, 1], [1, 0, 1], [1, 0, 0]], sp = [0, 0, 0];
    var oct = h('input', { type: 'text', id: 'cm-oct', value: '754', style: 'max-width:90px' }), sym = h('input', { type: 'text', id: 'cm-sym', style: 'max-width:150px' }), umask = h('input', { type: 'text', id: 'cm-um', value: '022', style: 'max-width:90px' });
    var grid = h('div'), out = h('div'), um = h('div', { class: 'note' }), checks = [];
    function toOct() { var d = [0, 1, 2].map(function (i) { return bits[i][0] * 4 + bits[i][1] * 2 + bits[i][2]; }); var s = sp[0] * 4 + sp[1] * 2 + sp[2]; return (s ? String(s) : '') + d.join(''); }
    function toSym() {
      var s = '';
      [0, 1, 2].forEach(function (i) {
        var x = bits[i], ch = [x[0] ? 'r' : '-', x[1] ? 'w' : '-', x[2] ? 'x' : '-'];
        if (i === 0 && sp[0]) ch[2] = x[2] ? 's' : 'S'; if (i === 1 && sp[1]) ch[2] = x[2] ? 's' : 'S'; if (i === 2 && sp[2]) ch[2] = x[2] ? 't' : 'T';
        s += ch.join('');
      }); return s;
    }
    function draw(src) {
      if (src !== 'oct') oct.value = toOct(); if (src !== 'sym') sym.value = toSym();
      checks.forEach(function (ck) { ck.el.checked = ck.get(); });
      var names = ['owner (user)', 'group', 'others'], words = ['read', 'write', 'execute'];
      clear(out);
      out.appendChild(h('div', { class: 'row' }, h('span', { class: 'big', text: '-' + toSym() }), h('span', { class: 'pill', text: 'chmod ' + toOct() })));
      out.appendChild(table(['Class', 'Can'], [0, 1, 2].map(function (i) { var w = words.filter(function (_, k) { return bits[i][k]; }); return [names[i], w.length ? w.join(', ') : 'nothing']; })));
      var notes = []; if (sp[0]) notes.push('setuid: runs with the file owner\'s privileges'); if (sp[1]) notes.push('setgid: runs with the file group\'s privileges (on a directory, new files inherit the group)'); if (sp[2]) notes.push('sticky: in a directory, only a file\'s owner may delete or rename it');
      if (notes.length) out.appendChild(h('p', { class: 'note', text: notes.join('. ') + '.' }));
      var u = parseInt(umask.value, 8);
      um.textContent = isNaN(u) ? 'Enter a umask in octal, for example 022.' : 'umask ' + umask.value + ': new files get ' + (0o666 & ~u).toString(8).padStart(3, '0') + ', new directories get ' + (0o777 & ~u).toString(8).padStart(3, '0') + '.';
    }
    var tb = h('table', null, h('thead', null, h('tr', null, ['', 'read (4)', 'write (2)', 'execute (1)', ''].map(function (x) { return h('th', { text: x }); }))));
    var body = h('tbody');
    ['Owner', 'Group', 'Others'].forEach(function (nm, i) {
      var tr = h('tr', null, h('td', { text: nm }));
      [0, 1, 2].forEach(function (k) {
        var el = h('input', { type: 'checkbox', 'aria-label': nm + ' ' + ['read', 'write', 'execute'][k] });
        el.addEventListener('change', function () { bits[i][k] = el.checked ? 1 : 0; draw(); });
        checks.push({ el: el, get: function () { return !!bits[i][k]; } }); tr.appendChild(h('td', null, el));
      });
      tr.appendChild(h('td', { class: 'note', text: ['setuid', 'setgid', 'sticky'][i] }));
      var sc = h('input', { type: 'checkbox', 'aria-label': ['setuid', 'setgid', 'sticky'][i] }); sc.addEventListener('change', function () { sp[i] = sc.checked ? 1 : 0; draw(); });
      checks.push({ el: sc, get: function () { return !!sp[i]; } }); tr.lastChild.insertBefore(sc, tr.lastChild.firstChild); tr.lastChild.firstChild.style.marginRight = '6px';
      body.appendChild(tr);
    });
    tb.appendChild(body);
    oct.addEventListener('input', function () {
      var m = oct.value.trim().match(/^([0-7])?([0-7]{3})$/); if (!m) return;
      var s = m[1] ? +m[1] : 0; sp = [(s >> 2) & 1, (s >> 1) & 1, s & 1];
      m[2].split('').forEach(function (d, i) { var v = +d; bits[i] = [(v >> 2) & 1, (v >> 1) & 1, v & 1]; }); draw('oct');
    });
    sym.addEventListener('input', function () {
      var s = sym.value.trim(); if (!/^[r-][w-][xsS-][r-][w-][xsS-][r-][w-][xtT-]$/.test(s)) return;
      sp = [0, 0, 0];
      for (var i = 0; i < 3; i++) { var a = s.substr(i * 3, 3); bits[i] = [a[0] === 'r' ? 1 : 0, a[1] === 'w' ? 1 : 0, /[xst]/.test(a[2]) ? 1 : 0]; if (/[sStT]/.test(a[2])) sp[i] = 1; }
      draw('sym');
    });
    umask.addEventListener('input', function () { draw(); });
    c.appendChild(h('div', { class: 'scroll' }, tb));
    c.appendChild(h('div', { class: 'row' }, h('label', null, 'Octal ', oct), h('label', null, 'Symbolic ', sym), h('label', null, 'umask ', umask)));
    c.appendChild(out); c.appendChild(um); draw();
  };
})(typeof window !== 'undefined' ? window : globalThis);

