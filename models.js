/* 3D models (three.js r128). Each model registers as OSDEMOS[name](container, opts). */
(function (root) {
  'use strict';
  var D = root.OSDEMOS = root.OSDEMOS || {};
  var C = { hw: 0x6b7c8c, kern: 0x0f9f89, lib: 0x5d6af0, app: 0xe8912f, hot: 0xe5583a, ok: 0x38b56d, page: 0x2f7bd0, free: 0x9fb4ae, dark: 0x22302c };
  var PROC = [0x2f7bd0, 0xe5583a, 0x38b56d, 0x9a5fd0, 0xd6a21a, 0x1fa6b3];
  var reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }
  function button(label, fn, cls) { var b = el('button', cls || '', label); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function css(name, fb) { var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fb; }

  /* ---------- shared framework ---------- */
  function stage(container, opts, build, ui) {
    opts = opts || {};
    var T = root.THREE, box = opts.hero ? container : el('div', 'stage' + (opts.tall ? ' tall' : ''));
    if (!opts.hero) container.appendChild(box);
    var cap = null;
    if (!T) { box.appendChild(el('div', 'nogl', 'The 3D library could not be loaded. The explanation in the text still applies.')); return null; }
    var renderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { box.appendChild(el('div', 'nogl', 'Your browser could not start WebGL, so the 3D model is unavailable.')); return null; }
    renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    box.appendChild(renderer.domElement);
    box.appendChild(el('div', 'hint', 'Drag to rotate'));
    var scene = new T.Scene(), camera = new T.PerspectiveCamera(38, 1, 0.1, 100), group = new T.Group();
    scene.add(group);
    scene.add(new T.AmbientLight(0xffffff, 0.75));
    var sun = new T.DirectionalLight(0xffffff, 0.75); sun.position.set(4, 8, 6); scene.add(sun);
    var ctx = { T: T, scene: scene, camera: camera, root: group, hooks: [], tweens: [], t: 0, visible: true, idle: 0, box: box, opts: opts };
    ctx.camera.position.set(0, 3.4, 11); ctx.camera.lookAt(0, 0, 0);

    ctx.caption = function (txt) { if (cap) cap.textContent = txt; };
    ctx.tween = function (dur, fn, done) { ctx.tweens.push({ t0: ctx.t, dur: Math.max(0.001, dur), fn: fn, done: done }); };
    ctx.label = function (text, w, h, o) {
      o = o || {};
      var cv = document.createElement('canvas'); cv.width = 512; cv.height = Math.round(512 * h / w);
      var g = cv.getContext('2d'), r = cv.height / 2;
      g.fillStyle = o.bg || css('--panel', '#fff'); g.globalAlpha = 0.92;
      g.beginPath(); g.moveTo(r, 0); g.arcTo(cv.width, 0, cv.width, cv.height, r); g.arcTo(cv.width, cv.height, 0, cv.height, r); g.arcTo(0, cv.height, 0, 0, r); g.arcTo(0, 0, cv.width, 0, r); g.fill();
      g.globalAlpha = 1; g.fillStyle = o.color || css('--ink', '#12201c'); g.font = '600 ' + Math.round(cv.height * 0.46) + 'px Inter, system-ui, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, cv.width / 2, cv.height / 2 + 2);
      var tex = new T.CanvasTexture(cv); tex.anisotropy = 4;
      var sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
      sp.scale.set(w, h, 1); sp.renderOrder = 10; return sp;
    };
    ctx.mat = function (color, o) { o = o || {}; return new T.MeshLambertMaterial({ color: color, transparent: o.opacity != null, opacity: o.opacity != null ? o.opacity : 1, emissive: o.emissive || 0x000000 }); };
    ctx.box = function (w, h, d, color, o) { var m = new T.Mesh(new T.BoxGeometry(w, h, d), ctx.mat(color, o)); return m; };
    ctx.edges = function (mesh, color, op) { var l = new T.LineSegments(new T.EdgesGeometry(mesh.geometry), new T.LineBasicMaterial({ color: color || 0xffffff, transparent: true, opacity: op == null ? 0.55 : op })); mesh.add(l); return l; };
    ctx.clear = function () {
      ctx.hooks.length = 0; ctx.tweens.length = 0;
      while (group.children.length) { var c = group.children.pop(); c.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }); }
    };
    ctx.onFrame = function (fn) { ctx.hooks.push(fn); };
    ctx.rebuild = function () { ctx.clear(); build(ctx); };

    /* controls and caption (inside lesson pages only) */
    if (!opts.hero) {
      var row = el('div', 'row'); container.insertBefore(row, box);
      cap = el('p', 'caption3d'); container.appendChild(cap);
      ctx.row = row;
    }
    build(ctx);
    if (ui && !opts.hero) ui(ctx, ctx.row);

    /* sizing */
    function size() { var w = box.clientWidth || 600, h = box.clientHeight || 380; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    size();
    if (root.ResizeObserver) new ResizeObserver(size).observe(box); else root.addEventListener('resize', size);

    /* drag to rotate */
    var drag = null, vx = 0, vy = 0, moved = 0;
    var cv = renderer.domElement;
    cv.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY }; moved = 0; vx = vy = 0; ctx.idle = 0; try { cv.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } });
    cv.addEventListener('pointermove', function (e) {
      if (!drag) return; var dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag = { x: e.clientX, y: e.clientY }; moved += Math.abs(dx) + Math.abs(dy);
      group.rotation.y += dx * 0.009; group.rotation.x = Math.max(-0.7, Math.min(0.9, group.rotation.x + dy * 0.006)); vx = dx * 0.009; vy = dy * 0.006; ctx.idle = 0; kick();
    });
    function up(e) { if (drag && moved < 6 && ctx.onClick) ctx.onClick(e, cv); drag = null; }
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', function () { drag = null; });

    /* render loop, paused when off-screen */
    var running = false, last = 0;
    function frame(now) {
      if (!ctx.visible || document.hidden) { running = false; return; }
      var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; ctx.t += dt; ctx.idle += dt;
      if (!drag) {
        if (Math.abs(vx) > 0.0004) { group.rotation.y += vx; vx *= 0.93; }
        else if (!reduce && ctx.idle > 2 && !opts.noSpin) group.rotation.y += (opts.hero ? 0.0035 : 0.0018);
      }
      for (var i = ctx.tweens.length - 1; i >= 0; i--) {
        var tw = ctx.tweens[i], p = Math.min(1, (ctx.t - tw.t0) / tw.dur), e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        tw.fn(e, p); if (p >= 1) { ctx.tweens.splice(i, 1); if (tw.done) tw.done(); }
      }
      for (var k = 0; k < ctx.hooks.length; k++) ctx.hooks[k](dt, ctx.t);
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }
    function kick() { if (!running && ctx.visible) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
    ctx.kick = kick;
    if ('IntersectionObserver' in root) new IntersectionObserver(function (es) { ctx.visible = es[0].isIntersecting; if (ctx.visible) kick(); }, { threshold: 0.05 }).observe(box);
    kick();

    /* rebuild when the theme changes so labels match */
    var mo = new MutationObserver(function () { setTimeout(function () { ctx.rebuild(); kick(); }, 30); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (root.matchMedia) { var mq = root.matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', function () { setTimeout(function () { ctx.rebuild(); kick(); }, 30); }); }
    return ctx;
  }

  D._k = { stage: stage, button: button, el: el, C: C, PROC: PROC, css: css };

  function ray(ctx, e, cv, meshes) {
    var T = ctx.T, r = cv.getBoundingClientRect(), v = new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    var rc = new T.Raycaster(); rc.setFromCamera(v, ctx.camera); var h = rc.intersectObjects(meshes, false); return h.length ? h[0].object : null;
  }

  /* ================= os-layers: the OS as a stack, with a system call travelling through it ================= */
  D['os-layers'] = function (container, opts) {
    var S;
    var names = ['Hardware (CPU, RAM, disk)', 'Kernel (scheduler, memory, files)', 'Libraries (libc, services)', 'Applications (your programs)'];
    var cols = [C.hw, C.kern, C.lib, C.app], ys = [], exploded = 1.0, packet, slabs = [], busy = false, flash = [0, 0, 0, 0];
    function build(ctx) {
      var T = ctx.T; slabs = [];
      for (var i = 0; i < 4; i++) {
        var slab = ctx.box(4.6, 0.3, 2.8, cols[i], { opacity: 0.88 }); ctx.edges(slab, 0xffffff, 0.6); ctx.root.add(slab); slabs.push(slab);
        var lab = ctx.label(names[i], 3.7, 0.44); lab.position.set(0, 0.3, 1.62); lab.userData.off = 0.34; slab.add(lab);
        for (var j = 0; j < 3; j++) { var c = ctx.box(0.7, 0.22, 0.7, 0xffffff, { opacity: 0.55 }); c.position.set(-1.4 + j * 1.4, 0.26, -0.15); slab.add(c); }
      }
      var line = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0, -2, 0), new T.Vector3(0, 3, 0)]), new T.LineBasicMaterial({ color: 0x8aa39d, transparent: true, opacity: 0.5 }));
      ctx.root.add(line);
      packet = new T.Mesh(new T.SphereGeometry(0.2, 20, 20), ctx.mat(0xffffff, { emissive: 0xffd24a })); ctx.root.add(packet); packet.visible = false;
      ctx.root.rotation.set(0.28, -0.5, 0); ctx.camera.position.set(0, 2.6, opts && opts.hero ? 9.2 : 11.5); ctx.camera.lookAt(0, 0, 0);
      function layout() { for (var i = 0; i < 4; i++) { ys[i] = (i - 1.5) * 1.25 * exploded; slabs[i].position.y = ys[i]; } }
      layout();
      ctx.onFrame(function (dt) {
        layout();
        for (var i = 0; i < 4; i++) { flash[i] = Math.max(0, flash[i] - dt * 1.6); slabs[i].material.emissive.setRGB(flash[i] * 0.5, flash[i] * 0.45, flash[i] * 0.1); }
        if (!packet.visible && opts && opts.hero) { if (!busy && ctx.t > 1.2 && Math.floor(ctx.t) % 6 === 0) send(ctx); }
      });
    }
    function send(ctx) {
      if (busy) return; busy = true; packet.visible = true;
      var path = [3, 2, 1, 0, 1, 2, 3], msgs = ['Your program calls write()', 'The C library loads the system call number', 'The kernel validates arguments and finds the file', 'The driver talks to the hardware', 'The result returns up through the kernel', 'The library hands the result back', 'write() returns to your program'], idx = 0;
      (function hop() {
        if (idx >= path.length) { packet.visible = false; busy = false; ctx.caption && ctx.caption('Done. A system call crosses the boundary twice: in, then out.'); return; }
        var li = path[idx], from = idx === 0 ? ys[li] + 1 : packet.position.y, to = ys[li] + 0.35, msg = msgs[idx]; ctx.caption && ctx.caption(msg);
        ctx.tween(0.7, function (e) { packet.position.y = from + (to - from) * e; packet.position.x = Math.sin(e * 3.14) * 0.15; }, function () { flash[li] = 1; idx++; hop(); });
      })();
    }
    S = stage(container, opts, build, function (ctx, row) {
      row.appendChild(button('Send a system call', function () { send(ctx); ctx.kick(); }, 'primary'));
      var b = button('Collapse layers', function () { var to = exploded > 0.7 ? 0.55 : 1, from = exploded; b.textContent = to < 0.7 ? 'Explode layers' : 'Collapse layers'; ctx.tween(0.6, function (e) { exploded = from + (to - from) * e; }); ctx.kick(); });
      row.appendChild(b); ctx.caption('Each layer only talks to the one directly below it. Drag to look from other angles, then send a call through the stack.');
    });
  };

  /* ================= addrspace-3d: a process address space ================= */
  D['addrspace-3d'] = function (container, opts) {
    var heap = 1.0, stackH = 1.0, MAXH = 4.2, parts = {}, flashT = 0;
    function build(ctx) {
      var T = ctx.T, W = 2.2, Dp = 2.2, base = -3.2;
      var frame = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(W + 0.2, 7.0, Dp + 0.2)), new T.LineBasicMaterial({ color: 0x8aa39d })); frame.position.y = 0.3; ctx.root.add(frame);
      function seg(name, color, h, y, label) { var m = ctx.box(W, h, Dp, color, { opacity: 0.92 }); m.position.y = y; ctx.edges(m, 0xffffff, 0.5); ctx.root.add(m); var l = ctx.label(label, 2.3, 0.42); l.position.set(0, 0, Dp / 2 + 0.05); l.position.x = 0; l.scale.set(2.0, 0.38, 1); m.add(l); parts[name] = { m: m, l: l }; return m; }
      seg('text', C.page, 0.7, base + 0.35, 'Text (code, read only)');
      seg('data', C.ok, 0.6, base + 1.0, 'Data and BSS (globals)');
      seg('heap', C.app, 1, 0, 'Heap (malloc)'); seg('stack', C.lib, 1, 0, 'Stack (calls)');
      var free = ctx.box(W, 1, Dp, C.free, { opacity: 0.18 }); ctx.root.add(free); parts.free = { m: free };
      var lo = ctx.label('low addresses 0x0000...', 2.6, 0.38); lo.position.set(-3.1, base + 0.2, 0); ctx.root.add(lo);
      var hi = ctx.label('high addresses 0x7fff...', 2.6, 0.38); hi.position.set(-3.1, 3.5, 0); ctx.root.add(hi);
      var a1 = ctx.label('heap grows up', 1.7, 0.36, { color: '#e8912f' }); a1.position.set(2.9, -1.2, 0); ctx.root.add(a1);
      var a2 = ctx.label('stack grows down', 1.9, 0.36, { color: '#5d6af0' }); a2.position.set(2.9, 2.6, 0); ctx.root.add(a2);
      ctx.root.rotation.set(0.25, -0.65, 0); ctx.camera.position.set(0, 1.2, 13.4); ctx.camera.lookAt(0, 0.2, 0);
      var bottom = base + 1.3, top = 3.8;
      ctx.onFrame(function (dt) {
        var hh = Math.max(0.35, heap), sh = Math.max(0.35, stackH);
        parts.heap.m.scale.y = hh; parts.heap.m.position.y = bottom + hh / 2;
        parts.stack.m.scale.y = sh; parts.stack.m.position.y = top - sh / 2;
        var gapBottom = bottom + hh, gapTop = top - sh, gh = Math.max(0.001, gapTop - gapBottom);
        parts.free.m.scale.y = gh; parts.free.m.position.y = gapBottom + gh / 2;
        flashT = Math.max(0, flashT - dt * 1.5); parts.free.m.material.color.setHex(flashT > 0 ? C.hot : C.free); parts.free.m.material.opacity = 0.18 + flashT * 0.5;
        // keep text labels readable when scaled
        parts.heap.l.scale.set(2.0, 0.38 / hh, 1); parts.stack.l.scale.set(2.0, 0.38 / sh, 1);
        parts.heap.l.position.y = 0; parts.stack.l.position.y = 0;
        parts.heap.l.visible = hh > 0.5; parts.stack.l.visible = sh > 0.5;
      });
    }
    function room() { return 4.4 - heap - stackH; }
    stage(container, opts, build, function (ctx, row) {
      function grow(which, amt) { var from = which === 'h' ? heap : stackH; var to = Math.max(0.35, from + amt); if (amt > 0 && to - from > room() - 0.05) { flashT = 1; ctx.caption('The heap and stack collided: the process is out of address space (a real kernel would refuse the request).'); ctx.kick(); return; } ctx.tween(0.45, function (e) { var v = from + (to - from) * e; if (which === 'h') heap = v; else stackH = v; }); ctx.kick(); }
      row.appendChild(button('malloc a big block', function () { grow('h', 0.6); ctx.caption('malloc asks the kernel for more memory (brk or mmap) and the heap grows toward higher addresses.'); }, 'primary'));
      row.appendChild(button('free it', function () { grow('h', -0.6); ctx.caption('free returns memory to the allocator, and sometimes to the kernel.'); }));
      row.appendChild(button('call a function', function () { grow('s', 0.5); ctx.caption('Each call pushes a stack frame: return address, arguments and locals. The stack grows toward lower addresses.'); }));
      row.appendChild(button('return', function () { grow('s', -0.5); ctx.caption('Returning pops the frame. That is why local variables vanish when a function ends.'); }));
      row.appendChild(button('Reset', function () { heap = 1; stackH = 1; ctx.caption('Fresh process: small heap, small stack, a large unused gap between them.'); ctx.kick(); }));
      ctx.caption('Text and globals sit at the bottom. The heap grows up and the stack grows down into the same free gap.');
    });
  };

  /* ================= cpu-3d: Round Robin on a ring ================= */
  D['cpu-3d'] = function (container, opts) {
    var burst0 = [5, 3, 6, 2, 4], quantum = 2, playing = false, speed = 1, st;
    function reset() { st = { queue: [], run: null, q: 0, tick: 0, order: [], done: 0, acc: 0 }; for (var i = 0; i < burst0.length; i++) st.queue.push({ id: i + 1, rem: burst0[i], mesh: null, x: 0, z: 0, y: 0 }); }
    reset();
    function build(ctx) {
      var T = ctx.T, pad = new T.Mesh(new T.CylinderGeometry(1.15, 1.15, 0.22, 40), ctx.mat(C.kern)); pad.position.y = -0.11; ctx.root.add(pad);
      var ring = new T.Mesh(new T.RingGeometry(3.05, 3.12, 64), new T.MeshBasicMaterial({ color: 0x8aa39d, side: T.DoubleSide, transparent: true, opacity: 0.7 })); ring.rotation.x = -Math.PI / 2; ring.position.y = -0.2; ctx.root.add(ring);
      var cpu = ctx.label('CPU', 1.1, 0.4); cpu.position.set(0, -0.05, 1.5); ctx.root.add(cpu);
      var rq = ctx.label('ready queue (head to tail, clockwise)', 3.6, 0.4); rq.position.set(0, -0.2, 3.8); ctx.root.add(rq);
      st.queue.concat(st.run ? [st.run] : []).forEach(function (p) { mk(ctx, p); });
      ctx.root.rotation.set(0.5, 0.3, 0); ctx.camera.position.set(0, 3.0, 12.6); ctx.camera.lookAt(0, 0.5, 0);
      ctx.onFrame(function (dt, t) {
        if (playing) { st.acc += dt * speed; if (st.acc >= 0.85) { st.acc = 0; step(ctx); } }
        var all = st.queue.concat(st.run ? [st.run] : st.finishing || []);
        st.queue.forEach(function (p, i) { var a = -i * (2 * Math.PI / 5) + Math.PI / 2, tx = Math.cos(a) * 3.1, tz = Math.sin(a) * 3.1; ease(p, tx, 0, tz, dt); });
        if (st.run) ease(st.run, 0, 0.35, 0, dt);
        all.forEach(function (p) { if (p.mesh) { var h = Math.max(0.12, p.rem * 0.36); p.mesh.scale.y += (h - p.mesh.scale.y) * Math.min(1, dt * 8); p.mesh.position.set(p.x, p.y + p.mesh.scale.y / 2, p.z); p.lab.position.set(p.x, p.y + p.mesh.scale.y + 0.4, p.z); } });
        if (st.run && st.run.mesh) st.run.mesh.rotation.y += dt * 1.5;
      });
    }
    function ease(p, x, y, z, dt) { var k = Math.min(1, dt * 5); p.x += (x - p.x) * k; p.y += (y - p.y) * k; p.z += (z - p.z) * k; }
    function mk(ctx, p) { var m = ctx.box(0.95, 1, 0.95, PROC[(p.id - 1) % PROC.length]); ctx.edges(m, 0xffffff, 0.4); m.scale.y = Math.max(0.12, p.rem * 0.36); ctx.root.add(m); p.mesh = m; var l = ctx.label('P' + p.id + ' (' + p.rem + ')', 0.95, 0.36); ctx.root.add(l); p.lab = l; setLab(ctx, p); }
    function setLab(ctx, p) { if (!p.lab) return; var pos = p.lab.position.clone(); ctx.root.remove(p.lab); p.lab.material.map.dispose(); p.lab = ctx.label('P' + p.id + ' (' + p.rem + ')', 0.95, 0.36); p.lab.position.copy(pos); ctx.root.add(p.lab); }
    function step(ctx) {
      var msg;
      if (!st.run) {
        if (!st.queue.length) { playing = false; ctx.caption('All processes finished. Order of CPU slices: ' + st.order.join(' '));return; }
        st.run = st.queue.shift(); st.q = 0;
      }
      var p = st.run; p.rem--; st.q++; st.tick++; st.order.push('P' + p.id); setLab(ctx, p);
      if (p.rem === 0) { msg = 'P' + p.id + ' finished at t = ' + st.tick + '.'; ctx.root.remove(p.mesh); ctx.root.remove(p.lab); p.mesh = null; p.lab = null; st.run = null; st.done++; }
      else if (st.q >= quantum) { msg = 'Quantum expired: P' + p.id + ' goes to the back of the queue with ' + p.rem + ' left.'; st.queue.push(p); st.run = null; }
      else msg = 'P' + p.id + ' runs, ' + p.rem + ' unit' + (p.rem === 1 ? '' : 's') + ' remaining.';
      ctx.caption('t = ' + st.tick + ': ' + msg + '   Slices so far: ' + st.order.join(' '));
    }
    stage(container, opts, build, function (ctx, row) {
      var play = button('Play', function () { playing = !playing; play.textContent = playing ? 'Pause' : 'Play'; ctx.kick(); }, 'primary');
      var stp = button('Step', function () { playing = false; play.textContent = 'Play'; step(ctx); ctx.kick(); });
      var rst = button('Reset', function () { playing = false; play.textContent = 'Play'; reset(); ctx.rebuild(); ctx.caption('Five processes with bursts 5, 3, 6, 2, 4 are waiting. Tall bars have more work left.'); ctx.kick(); });
      var qs = document.createElement('select'); qs.setAttribute('aria-label', 'Time quantum'); [1, 2, 3, 4].forEach(function (q) { var o = document.createElement('option'); o.value = q; o.textContent = 'quantum ' + q; if (q === quantum) o.selected = true; qs.appendChild(o); });
      qs.addEventListener('change', function () { quantum = +qs.value; });
      var sp = document.createElement('select'); sp.setAttribute('aria-label', 'Speed'); [['1', 'normal'], ['2', 'fast'], ['0.5', 'slow']].forEach(function (a) { var o = document.createElement('option'); o.value = a[0]; o.textContent = a[1]; sp.appendChild(o); });
      sp.addEventListener('change', function () { speed = +sp.value; });
      row.appendChild(play); row.appendChild(stp); row.appendChild(rst); row.appendChild(qs); row.appendChild(sp);
      ctx.caption('Five processes with bursts 5, 3, 6, 2, 4 are waiting. Tall bars have more work left. Press Play.');
    });
  };

  /* ================= paging-3d: virtual page -> page table -> physical frame ================= */
  D['paging-3d'] = function (container, opts) {
    var NP = 8, NF = 12, table, frameOwner, pages = [], frames = [], rows = [], busy = false, packet, sel = -1;
    function init() { table = []; frameOwner = []; for (var f = 0; f < NF; f++) frameOwner.push(-1); var fr = [7, 2, 10, 4, 0, 9, 5, 1]; for (var p = 0; p < NP; p++) { var valid = p !== 3 && p !== 6; table.push({ valid: valid, frame: valid ? fr[p] : -1 }); if (valid) frameOwner[fr[p]] = p; } }
    init();
    function fpos(f) { return { x: 4.2 + (f % 3) * 1.15, y: 2.4 - Math.floor(f / 3) * 1.15, z: 0 }; }
    function build(ctx) {
      var T = ctx.T; pages = []; frames = []; rows = [];
      for (var p = 0; p < NP; p++) {
        var m = ctx.box(1.3, 0.62, 1.0, table[p].valid ? C.page : C.hw); m.position.set(-4.2, 3.1 - p * 0.9, 0); m.userData.page = p; ctx.edges(m, 0xffffff, 0.5); ctx.root.add(m); pages.push(m);
        var l = ctx.label('page ' + p, 1.1, 0.34); l.position.set(0, 0, 0.55); m.add(l);
        var r = ctx.box(2.0, 0.62, 0.35, table[p].valid ? C.kern : C.hot, { opacity: 0.9 }); r.position.set(0, 3.1 - p * 0.9, 0); ctx.edges(r, 0xffffff, 0.5); ctx.root.add(r); rows.push(r);
        rows[p].userData.lab = ctx.label(table[p].valid ? 'frame ' + table[p].frame : 'on disk', 1.6, 0.34); rows[p].userData.lab.position.set(0, 0, 0.2); r.add(rows[p].userData.lab);
      }
      for (var f = 0; f < NF; f++) { var fm = ctx.box(1.0, 0.85, 1.0, C.free, { opacity: 0.85 }); var q = fpos(f); fm.position.set(q.x, q.y, 0); ctx.edges(fm, 0x88a39b, 0.7); ctx.root.add(fm); frames.push(fm); var fl = ctx.label('' + f, 0.5, 0.3); fl.position.set(0, 0, 0.52); fm.add(fl); if (frameOwner[f] >= 0) tint(f); }
      var t1 = ctx.label('Virtual pages', 2.0, 0.42); t1.position.set(-4.2, 4.3, 0); ctx.root.add(t1);
      var t2 = ctx.label('Page table', 1.6, 0.42); t2.position.set(0, 4.3, 0); ctx.root.add(t2);
      var t3 = ctx.label('Physical frames', 2.2, 0.42); t3.position.set(5.0, 4.3, 0); ctx.root.add(t3);
      packet = new T.Mesh(new T.SphereGeometry(0.2, 18, 18), ctx.mat(0xffffff, { emissive: 0xffd24a })); packet.visible = false; ctx.root.add(packet);
      ctx.root.rotation.set(0.12, -0.25, 0); ctx.root.position.y = -0.1;
      ctx.camera.position.set(0, 0.2, 15.4); ctx.camera.lookAt(0, 0.1, 0);
      ctx.onClick = function (e, cv) { var h = ray(ctx, e, cv, pages); if (h) translate(ctx, h.userData.page); };
      ctx.onFrame(function (dt, t) { if (sel >= 0 && pages[sel]) pages[sel].scale.setScalar(1 + 0.04 * Math.sin(t * 6)); });
    }
    function tint(f) { var o = frameOwner[f]; frames[f].material.color.setHex(o >= 0 ? C.page : C.free); frames[f].material.opacity = o >= 0 ? 0.95 : 0.85; }
    function translate(ctx, p) {
      if (busy) return; busy = true; sel = p; pages.forEach(function (m) { m.scale.setScalar(1); });
      var a = pages[p].position, b = rows[p].position, T = ctx.T;
      packet.visible = true; packet.position.copy(a);
      ctx.caption('CPU issues an address in virtual page ' + p + '. The MMU looks up entry ' + p + ' of the page table.');
      ctx.tween(0.8, function (e) { packet.position.lerpVectors(a, b, e); }, function () {
        if (table[p].valid) {
          var f = table[p].frame, q = fpos(f), to = new T.Vector3(q.x, q.y, 0), from = b.clone();
          ctx.caption('Valid entry: page ' + p + ' lives in frame ' + f + '. The frame number replaces the page number; the offset is unchanged.');
          ctx.tween(0.9, function (e) { packet.position.lerpVectors(from, to, e); }, function () { frames[f].material.emissive.setHex(0x5a4a10); setTimeout(function () { frames[f].material.emissive.setHex(0); }, 700); packet.visible = false; busy = false; ctx.kick(); });
        } else {
          rows[p].material.emissive.setHex(0x661a0a); ctx.caption('Invalid entry: PAGE FAULT. The kernel finds a free frame, loads the page from disk, updates the table and restarts the instruction.');
          var free = frameOwner.indexOf(-1); if (free < 0) free = (p * 5) % NF;
          setTimeout(function () {
            var old = frameOwner[free]; if (old >= 0) { table[old].valid = false; table[old].frame = -1; rows[old].material.color.setHex(C.hot); }
            frameOwner[free] = p; table[p].valid = true; table[p].frame = free; rows[p].material.color.setHex(C.kern); rows[p].material.emissive.setHex(0); pages[p].material.color.setHex(C.page);
            var oldLab = rows[p].userData.lab; rows[p].remove(oldLab); var nl = ctx.label('frame ' + free, 1.6, 0.34); nl.position.set(0, 0, 0.2); rows[p].add(nl); rows[p].userData.lab = nl;
            if (old >= 0) { var ol = rows[old].userData.lab; rows[old].remove(ol); var ol2 = ctx.label('on disk', 1.6, 0.34); ol2.position.set(0, 0, 0.2); rows[old].add(ol2); rows[old].userData.lab = ol2; pages[old].material.color.setHex(C.hw); }
            for (var f = 0; f < NF; f++) tint(f);
            packet.visible = false; busy = false; ctx.kick();
          }, 1100);
        }
      });
      ctx.kick();
    }
    stage(container, opts, build, function (ctx, row) {
      for (var i = 0; i < 4; i++) (function (p) { row.appendChild(button('Access page ' + p, function () { translate(ctx, p); })); })([0, 3, 5, 6][i]);
      row.appendChild(button('Random page', function () { translate(ctx, Math.floor(Math.random() * NP)); }, 'primary'));
      row.appendChild(button('Reset', function () { busy = false; sel = -1; init(); ctx.rebuild(); ctx.caption('Pages 3 and 6 are not in memory. Access them to trigger a page fault.'); ctx.kick(); }));
      ctx.caption('Blue pages are resident, grey ones are on disk. Click a page block or use the buttons. Pages 3 and 6 start out of memory.');
    });
  };

  /* ================= disk-3d: platters, tracks and the moving arm ================= */
  D['disk-3d'] = function (container, opts) {
    var NT = 8, track = 6, armPhi = 0, targetTrack = 6, spin = true, angle = 0, seeking = false, armMesh, marker, rings = [], platters = [];
    var L = 3.1, Dd = 3.5;
    function trackR(t) { return 0.7 + t * 0.2; }
    function phiFor(r) { var c = (Dd * Dd + L * L - r * r) / (2 * Dd * L); return Math.acos(Math.max(-1, Math.min(1, c))); }
    function build(ctx) {
      var T = ctx.T; rings = []; platters = [];
      var spindle = new T.Mesh(new T.CylinderGeometry(0.22, 0.22, 1.9, 24), ctx.mat(0x9fb0aa)); ctx.root.add(spindle);
      for (var i = 0; i < 3; i++) {
        var pl = new T.Group(); pl.position.y = -0.55 + i * 0.55;
        var disk = new T.Mesh(new T.CylinderGeometry(2.25, 2.25, 0.07, 64), ctx.mat(0x8ea3b8)); pl.add(disk);
        for (var t = 0; t < NT; t++) { var rg = new T.Mesh(new T.RingGeometry(trackR(t) - 0.012, trackR(t) + 0.012, 64), new T.MeshBasicMaterial({ color: 0xffffff, side: T.DoubleSide, transparent: true, opacity: 0.45 })); rg.rotation.x = -Math.PI / 2; rg.position.y = 0.04; pl.add(rg); if (i === 2) rings.push(rg); }
        ctx.root.add(pl); platters.push(pl);
      }
      marker = ctx.box(0.34, 0.06, 0.2, C.hot); marker.position.set(trackR(6), 0.07, 0); platters[2].add(marker);
      var arm = new T.Group(); arm.position.set(Dd, 0, 0);
      var beam = ctx.box(L, 0.1, 0.18, 0xcfd8d6); beam.position.set(-L / 2, 0.95, 0); arm.add(beam);
      for (var k = 0; k < 3; k++) { var f = ctx.box(0.12, 0.5, 0.12, 0xcfd8d6); f.position.set(-L, 0.65 - 0.55 * 0 + (k - 1) * 0.55 - 0.3, 0); arm.add(f); var head = ctx.box(0.2, 0.06, 0.2, C.ok); head.position.set(-L, -0.55 + k * 0.55 + 0.1, 0); arm.add(head); }
      var hub = new T.Mesh(new T.CylinderGeometry(0.28, 0.28, 0.35, 20), ctx.mat(0x9fb0aa)); hub.position.set(0, 0.85, 0); arm.add(hub);
      armMesh = arm; ctx.root.add(arm);
      var title = ctx.label('Actuator arm', 1.6, 0.36); title.position.set(Dd + 0.3, 1.5, 0); ctx.root.add(title);
      var pt = ctx.label('Platters spin', 1.6, 0.36); pt.position.set(-2.8, 1.4, 0); ctx.root.add(pt);
      ctx.root.rotation.set(0.5, -0.5, 0); ctx.root.position.y = -0.1;
      armPhi = phiFor(trackR(track));
      ctx.onFrame(function (dt) {
        if (spin) angle += dt * 4.2; platters.forEach(function (p) { p.rotation.y = angle; });
        armMesh.rotation.y = armPhi; // arm points from the pivot toward the platters
        rings.forEach(function (r, i) { r.material.opacity = i === track ? 1 : 0.45; r.material.color.setHex(i === track ? 0xffd24a : 0xffffff); });
      });
    }
    function seek(ctx, to) {
      if (seeking || to === track) return; seeking = true; var from = armPhi, tgt = phiFor(trackR(to)), dist = Math.abs(to - track), ms = (1 + dist * 0.6).toFixed(1);
      ctx.caption('Seeking ' + dist + ' track' + (dist === 1 ? '' : 's') + ' (about ' + ms + ' ms for this model). The head must also wait for the sector to rotate underneath it: on average half a turn, 4.17 ms at 7200 RPM.');
      ctx.tween(0.35 + dist * 0.08, function (e) { armPhi = from + (tgt - from) * e; }, function () { track = to; seeking = false; ctx.kick(); });
      ctx.kick();
    }
    stage(container, opts, build, function (ctx, row) {
      row.appendChild(button('Seek outer track', function () { seek(ctx, NT - 1); }));
      row.appendChild(button('Seek middle', function () { seek(ctx, 3); }));
      row.appendChild(button('Seek inner track', function () { seek(ctx, 0); }));
      row.appendChild(button('Random seek', function () { seek(ctx, Math.floor(Math.random() * NT)); }, 'primary'));
      var sp = button('Stop spinning', function () { spin = !spin; sp.textContent = spin ? 'Stop spinning' : 'Spin'; ctx.kick(); }); row.appendChild(sp);
      ctx.caption('All heads move together, so the arm reads the same track number on every platter (a cylinder). Seek time depends on how far the arm travels.');
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* More 3D models (three.js r128). Needs models.js first (shared stage framework in OSDEMOS._k). */
(function (root) {
  'use strict';
  var D = root.OSDEMOS = root.OSDEMOS || {};
  if (!D._k) return;
  var K = D._k, C = K.C, PROC = K.PROC, button = K.button, stage = K.stage, el = K.el;

  function pick(ctx, e, cv, meshes) {
    var T = ctx.T, r = cv.getBoundingClientRect(), v = new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    var rc = new T.Raycaster(); rc.setFromCamera(v, ctx.camera); var h = rc.intersectObjects(meshes, false); return h.length ? h[0].object : null;
  }
  function lerp(a, b, e) { return a + (b - a) * e; }
  function line(ctx, pts, color, op) {
    var T = ctx.T, g = new T.BufferGeometry().setFromPoints(pts.map(function (p) { return new T.Vector3(p[0], p[1], p[2] || 0); }));
    var l = new T.Line(g, new T.LineBasicMaterial({ color: color || 0x8aa39d, transparent: true, opacity: op == null ? 0.7 : op })); ctx.root.add(l); return l;
  }
  function ball(ctx, r, color, glow) { return new ctx.T.Mesh(new ctx.T.SphereGeometry(r, 24, 24), ctx.mat(color, { emissive: glow || 0x000000 })); }

  /* ================= threads-3d ================= */
  D['threads-3d'] = function (container, opts) {
    var n = 3, running = true, pcs = [], heap, pulse = 0;
    function build(ctx) {
      var T = ctx.T; pcs = [];
      var W = n * 1.7 + 0.8;
      var frame = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(W + 0.6, 5.6, 3.0)), new T.LineBasicMaterial({ color: 0x8aa39d })); frame.position.y = 0.45; ctx.root.add(frame);
      var code = ctx.box(W, 0.5, 2.4, C.page, { opacity: 0.92 }); code.position.set(0, 2.5, 0); ctx.edges(code, 0xffffff, 0.5); ctx.root.add(code);
      heap = ctx.box(W, 0.5, 2.4, C.app, { opacity: 0.92 }); heap.position.set(0, 1.6, 0); ctx.edges(heap, 0xffffff, 0.5); ctx.root.add(heap);
      var l1 = ctx.label('Code (shared by all threads)', 3.4, 0.42); l1.position.set(0, 2.5, 1.6); ctx.root.add(l1);
      var l2 = ctx.label('Heap and globals (shared)', 3.2, 0.42); l2.position.set(0, 1.6, 1.6); ctx.root.add(l2);
      for (var i = 0; i < n; i++) {
        var x = (i - (n - 1) / 2) * 1.7;
        var st = ctx.box(1.2, 2.0, 1.4, PROC[i], { opacity: 0.85 }); st.position.set(x, -1.2, 0); ctx.edges(st, 0xffffff, 0.5); ctx.root.add(st);
        line(ctx, [[x, -0.2, 0], [x, 1.35, 0]], PROC[i], 0.8);
        var pc = ball(ctx, 0.17, 0xffffff, 0xffd24a); pc.position.set(x, -1.2, 0.8); ctx.root.add(pc); pcs.push(pc);
        var lb = ctx.label('Thread ' + (i + 1), 1.5, 0.38); lb.position.set(x, -2.6, 0.9); ctx.root.add(lb);
      }
      var lb2 = ctx.label('Private: stack, registers, program counter', 4.8, 0.42); lb2.position.set(0, -3.15, 0.9); ctx.root.add(lb2);
      ctx.root.rotation.set(0.22, -0.5, 0); ctx.camera.position.set(0, 0.8, 11.2); ctx.camera.lookAt(0, 0.1, 0);
      ctx.onFrame(function (dt, t) {
        for (var k = 0; k < pcs.length; k++) if (running) pcs[k].position.y = -1.2 + Math.sin(t * 1.7 + k * 2.1) * 0.8;
        pulse = Math.max(0, pulse - dt * 1.8); heap.material.emissive.setRGB(pulse * 0.6, pulse * 0.45, 0);
      });
    }
    stage(container, opts, build, function (ctx, row) {
      row.appendChild(button('Add a thread', function () { if (n < 5) { n++; ctx.rebuild(); ctx.caption('Adding a thread costs one more stack and one more set of registers. Code and heap are not copied.'); ctx.kick(); } }, 'primary'));
      row.appendChild(button('Remove a thread', function () { if (n > 1) { n--; ctx.rebuild(); ctx.kick(); } }));
      row.appendChild(button('Every thread writes a global', function () {
        var T = ctx.T;
        for (var i = 0; i < n; i++) (function (i) {
          var x = (i - (n - 1) / 2) * 1.7, p = ball(ctx, 0.14, PROC[i], PROC[i]); p.position.set(x, -0.2, 0.2); ctx.root.add(p);
          ctx.tween(0.8, function (e) { p.position.y = lerp(-0.2, 1.3, e); }, function () { ctx.root.remove(p); pulse = 1; });
        })(i);
        ctx.caption('All threads reach the same heap, so a write by one is seen by all. That is why shared data needs locks.'); ctx.kick();
      }));
      var r = button('Pause', function () { running = !running; r.textContent = running ? 'Pause' : 'Run'; ctx.kick(); }); row.appendChild(r);
      ctx.caption('One process, several threads. Code, heap and open files are shared. Each thread has only its own stack, registers and program counter.');
    });
  };

  /* ================= lock-3d ================= */
  D['lock-3d'] = function (container, opts) {
    var useLock = true, busy = false, counter = 0, bad = false, cLab, threads = [], room, ctxRef;
    function qpos(i) { return [-5, 0, -1.5 + i]; }
    function xpos(i) { return [5, 0, -1.5 + i]; }
    function setCounter(v, isBad) {
      counter = v; bad = !!isBad; var c = ctxRef; if (!c) return;
      if (cLab) { c.root.remove(cLab); if (cLab.material.map) cLab.material.map.dispose(); cLab.material.dispose(); }
      cLab = c.label('counter = ' + v, 3.2, 0.6, { color: isBad ? '#e5583a' : undefined }); cLab.position.set(0, 3.0, 0); c.root.add(cLab);
    }
    function mv(ctx, s, to, dur, done) {
      var f = [s.position.x, s.position.y, s.position.z];
      ctx.tween(dur, function (e) { s.position.set(lerp(f[0], to[0], e), lerp(f[1], to[1], e) + Math.sin(e * Math.PI) * 0.35, lerp(f[2], to[2], e)); }, done);
    }
    function build(ctx) {
      var T = ctx.T; ctxRef = ctx; threads = []; cLab = null;
      room = ctx.box(3.2, 1.7, 3.4, C.ok, { opacity: 0.26 }); room.position.set(0, 0.35, 0); ctx.edges(room, 0x8aa39d, 0.9); ctx.root.add(room);
      var rl = ctx.label('Critical section: counter++', 3.6, 0.46); rl.position.set(0, 2.15, 0); ctx.root.add(rl);
      var q = ctx.box(2.4, 0.12, 3.6, C.free, { opacity: 0.35 }); q.position.set(-5, -0.45, 0); ctx.root.add(q);
      var ql = ctx.label('Waiting', 1.6, 0.4); ql.position.set(-5, 0.9, 1.8); ctx.root.add(ql);
      var xp = ctx.box(2.4, 0.12, 3.6, C.free, { opacity: 0.35 }); xp.position.set(5, -0.45, 0); ctx.root.add(xp);
      var xl = ctx.label('Finished', 1.6, 0.4); xl.position.set(5, 0.9, 1.8); ctx.root.add(xl);
      for (var i = 0; i < 4; i++) {
        var s = ball(ctx, 0.38, PROC[i]); var p = qpos(i); s.position.set(p[0], p[1], p[2]); ctx.root.add(s);
        var lb = ctx.label('T' + (i + 1), 0.7, 0.36); lb.position.set(0, 0.72, 0); s.add(lb); threads.push(s);
      }
      setCounter(counter, bad);
      ctx.root.rotation.set(0.32, -0.28, 0); ctx.camera.position.set(0, 2.8, 11.4); ctx.camera.lookAt(0, 0.4, 0);
    }
    function run(ctx) {
      if (busy) return; busy = true; var i;
      for (i = 0; i < 4; i++) { var p = qpos(i); threads[i].position.set(p[0], p[1], p[2]); }
      setCounter(0, false); room.material.color.setHex(C.ok); room.material.opacity = 0.26;
      if (useLock) {
        (function go(k) {
          if (k >= 4) { busy = false; ctx.caption('Counter = 4, correct. The lock let one thread at a time into the critical section.'); return; }
          ctx.caption('T' + (k + 1) + ' takes the lock and enters. The others wait.'); room.material.opacity = 0.5;
          mv(ctx, threads[k], [0, 0, 0], 0.8, function () {
            ctx.tween(0.55, function () {}, function () {
              setCounter(counter + 1, false); room.material.opacity = 0.26;
              var x = xpos(k); mv(ctx, threads[k], x, 0.7, function () { go(k + 1); });
            });
          });
        })(0);
      } else {
        ctx.caption('No lock: all four threads read the counter at once.');
        var spots = [[-0.9, 0, -0.9], [0.9, 0, -0.9], [-0.9, 0, 0.9], [0.9, 0, 0.9]], done = 0;
        for (i = 0; i < 4; i++) mv(ctx, threads[i], spots[i], 0.9, function () {
          if (++done < 4) return;
          room.material.color.setHex(C.hot); room.material.opacity = 0.5;
          ctx.tween(0.9, function () {}, function () {
            setCounter(1, true); ctx.caption('Counter = 1, expected 4. Every thread read 0, added 1 and wrote 1 back: three updates were lost.');
            var d2 = 0; for (var k = 0; k < 4; k++) mv(ctx, threads[k], xpos(k), 0.8, function () { if (++d2 === 4) { busy = false; room.material.color.setHex(C.ok); room.material.opacity = 0.26; } });
          });
        });
      }
      ctx.kick();
    }
    stage(container, opts, build, function (ctx, row) {
      row.appendChild(button('Run 4 threads', function () { run(ctx); }, 'primary'));
      var lk = button('Lock: ON', function () { if (busy) return; useLock = !useLock; lk.textContent = 'Lock: ' + (useLock ? 'ON' : 'OFF'); ctx.caption(useLock ? 'With the lock ON the critical section admits one thread at a time.' : 'With the lock OFF, nothing stops threads from overlapping inside the critical section.'); });
      row.appendChild(lk);
      ctx.caption('Four threads each want to do counter++ once. Run them with the lock on, then off, and compare the final value.');
    });
  };

  /* ================= deadlock-3d ================= */
  D['deadlock-3d'] = function (container, opts) {
    var shown = 0, dead = false, nodes = [], arrows = [], ctxRef, playing = false;
    var MSG = ['R1 is assigned to P1.', 'P1 requests R2 and has to wait.', 'R2 is assigned to P2.', 'P2 requests R3 and has to wait.', 'R3 is assigned to P3.', 'P3 requests R4 and has to wait.', 'R4 is assigned to P4.',
      'P4 requests R1, which P1 holds. The chain closes into a cycle: every process waits for the next one. Deadlock.'];
    function npos(k) { var a = k * Math.PI / 4; return [Math.cos(a) * 3.5, Math.sin(a) * 2.5, 0]; }
    function addArrow(ctx, k, animate) {
      var T = ctx.T, a = npos(k), b = npos((k + 1) % 8), dir = new T.Vector3(b[0] - a[0], b[1] - a[1], 0), len = dir.length(); dir.normalize();
      var m = 0.62, col = k % 2 === 0 ? 0x2fa862 : 0xe8912f;
      var ar = new T.ArrowHelper(dir, new T.Vector3(a[0] + dir.x * m, a[1] + dir.y * m, 0), len - 2 * m, col, 0.5, 0.32);
      ctx.root.add(ar); arrows[k] = ar;
      if (animate) { ar.scale.set(0.01, 0.01, 0.01); ar.position.set(a[0] + dir.x * m, a[1] + dir.y * m, 0); ctx.tween(0.5, function (e) { var s = Math.max(0.01, e); ar.scale.set(s, s, s); }); }
    }
    function build(ctx) {
      var T = ctx.T; ctxRef = ctx; nodes = []; arrows = [];
      for (var k = 0; k < 8; k++) {
        var p = npos(k), isR = k % 2 === 0, idx = Math.floor(k / 2) + 1, m;
        if (isR) m = ctx.box(0.85, 0.85, 0.85, 0xd6a21a); else m = ball(ctx, 0.5, PROC[(idx - 1) % 6]);
        m.position.set(p[0], p[1], p[2]); ctx.root.add(m); nodes.push(m);
        var lb = ctx.label((isR ? 'R' : 'P') + idx, 0.9, 0.42); lb.position.set(p[0] * 1.22, p[1] * 1.28, 0.3); ctx.root.add(lb);
      }
      for (var e = 0; e < shown; e++) addArrow(ctx, e, false);
      if (dead && shown === 8) { /* keep red state */ }
      ctx.root.rotation.set(0.05, -0.32, 0); ctx.camera.position.set(0, 0, 12.4); ctx.camera.lookAt(0, 0, 0);
      var lg = ctx.label('square = resource, ball = process', 3.8, 0.4); lg.position.set(0, -4.1, 0); ctx.root.add(lg);
      ctx.onFrame(function (dt, t) {
        var glow = dead ? (0.45 + Math.sin(t * 5) * 0.25) : 0;
        for (var i = 0; i < nodes.length; i++) nodes[i].material.emissive.setRGB(glow, glow * 0.1, glow * 0.05);
      });
    }
    function step(ctx) {
      if (shown >= 8) return;
      addArrow(ctx, shown, true); ctx.caption(MSG[shown]); shown++;
      if (shown === 8) dead = true; ctx.kick();
    }
    stage(container, opts, build, function (ctx, row) {
      row.appendChild(button('Next step', function () { step(ctx); }, 'primary'));
      row.appendChild(button('Play all', function () {
        if (playing) return; playing = true;
        (function go() { if (shown >= 8) { playing = false; return; } step(ctx); ctx.tween(0.95, function () {}, go); })();
      }));
      row.appendChild(button('Break the cycle', function () {
        if (!dead) { ctx.caption('There is no deadlock yet. Press Play all first.'); return; }
        dead = false; if (arrows[0]) arrows[0].setColor(0x9aa3a0); if (arrows[7]) arrows[7].setColor(0x2fa862);
        ctx.caption('The OS preempts R1 from P1 (or kills P1). P4 now gets R1 and finishes, releases R4, and the chain unwinds. Recovery needs one edge of the cycle removed.'); ctx.kick();
      }));
      row.appendChild(button('Reset', function () { shown = 0; dead = false; playing = false; ctx.rebuild(); ctx.caption('Press Next step to add one edge at a time.'); ctx.kick(); }));
      ctx.caption('Four processes and four resources in a ring. Press Next step to add one edge at a time: green = assigned, orange = waiting for.');
    });
  };

  /* ================= hierarchy-3d ================= */
  D['hierarchy-3d'] = function (container, opts) {
    var L = [
      { n: 'Registers', t: '0.3 ns', h: '1 second', c: 0xe5583a, w: 1.8 },
      { n: 'CPU cache', t: '2 ns', h: '7 seconds', c: 0xe8912f, w: 2.7 },
      { n: 'RAM', t: '100 ns', h: '6 minutes', c: 0x38b56d, w: 3.8 },
      { n: 'SSD', t: '100 µs', h: '4 days', c: 0x2f7bd0, w: 5.0 },
      { n: 'Hard disk', t: '10 ms', h: '1 year', c: 0x6b7c8c, w: 6.4 }
    ], slabs = [], ball1, flash = [0, 0, 0, 0, 0], busy = false;
    function Y(i) { return 2.9 - i * 1.3; }
    function build(ctx) {
      slabs = [];
      for (var i = 0; i < 5; i++) {
        var s = ctx.box(L[i].w, 0.7, 2.4, L[i].c, { opacity: 0.8 }); s.position.set(0, Y(i), 0); ctx.edges(s, 0xffffff, 0.55); ctx.root.add(s); slabs.push(s);
        var lb = ctx.label(L[i].n + ' · ' + L[i].t, 3.3, 0.44); lb.position.set(L[i].w / 2 + 2.0, Y(i), 0.6); ctx.root.add(lb);
        line(ctx, [[L[i].w / 2, Y(i), 0.6], [L[i].w / 2 + 0.3, Y(i), 0.6]], 0x8aa39d, 0.6);
      }
      var fast = ctx.label('small, fast, costly', 2.2, 0.38); fast.position.set(-4.7, Y(0), 0.6); ctx.root.add(fast);
      var big = ctx.label('big, slow, cheap', 2.2, 0.38); big.position.set(-5.4, Y(4), 0.6); ctx.root.add(big);
      ball1 = ball(ctx, 0.26, 0xffffff, 0xffd24a); ball1.position.set(0, 4.0, 1.5); ctx.root.add(ball1);
      ctx.root.rotation.set(0.2, -0.38, 0); ctx.camera.position.set(0, 0.8, 12.2); ctx.camera.lookAt(0.8, 0.3, 0);
      ctx.onFrame(function (dt) {
        for (var i = 0; i < 5; i++) { flash[i] = Math.max(0, flash[i] - dt * 1.5); var f = flash[i], neg = slabs[i].userData.miss; slabs[i].material.emissive.setRGB(neg ? f * 0.7 : f * 0.1, neg ? f * 0.1 : f * 0.6, neg ? f * 0.05 : f * 0.2); }
      });
    }
    function send(ctx, hit) {
      if (busy) return; busy = true; var i = 0;
      ctx.caption('The CPU asks for a value. It checks the fastest level first.');
      (function down() {
        var from = ball1.position.y, to = Y(i) + 0.55;
        ctx.tween(0.45, function (e) { ball1.position.y = lerp(from, to, e); }, function () {
          slabs[i].userData.miss = i !== hit; flash[i] = 1;
          if (i === hit) {
            ctx.caption('Found in ' + L[hit].n + ' after ' + (hit === 0 ? 'no misses' : hit + ' miss' + (hit > 1 ? 'es' : '')) + '. Access time about ' + L[hit].t + '. If a register access took 1 second, this would feel like ' + L[hit].h + '.');
            ctx.tween(0.9, function (e) { ball1.position.y = lerp(to, 4.0, e); }, function () { busy = false; });
          } else { i++; down(); }
        });
      })();
      ctx.kick();
    }
    stage(container, opts, build, function (ctx, row) {
      L.forEach(function (lv, i) { row.appendChild(button('Data is in ' + (i === 0 ? 'a register' : i === 1 ? 'cache' : i === 2 ? 'RAM' : i === 3 ? 'the SSD' : 'the disk'), function () { send(ctx, i); }, i === 2 ? 'primary' : '')); });
      ctx.caption('Each level is bigger and slower than the one above it. Pick where the data lives and watch a request fall through the levels until it hits.');
    });
  };

  /* ================= raid-3d ================= */
  D['raid-3d'] = function (container, opts) {
    var mode = 5, failed = -1, disks = [];
    function X(i) { return (i - 1.5) * 2.3; }
    function plan(r, i) {
      if (mode === 0) return { t: 'D' + (r * 4 + i + 1), c: PROC[r % 4], par: false };
      if (mode === 1) { var p = Math.floor(i / 2); return { t: 'D' + (r * 2 + p + 1), c: PROC[(r * 2 + p) % 6], par: false }; }
      var pd = 3 - (r % 4); if (i === pd) return { t: 'P' + (r + 1), c: C.app, par: true };
      var pos = i < pd ? i : i - 1; return { t: 'D' + (r * 3 + pos + 1), c: PROC[r % 4], par: false };
    }
    function build(ctx) {
      var T = ctx.T; disks = [];
      for (var i = 0; i < 4; i++) {
        var dead = i === failed;
        var d = new T.Mesh(new T.CylinderGeometry(0.95, 0.95, 0.24, 36), ctx.mat(dead ? 0x6b2a22 : 0x6b7c8c, { emissive: dead ? 0x551510 : 0x000000 }));
        d.position.set(X(i), 0, 0); d.userData.disk = i; ctx.root.add(d); disks.push(d);
        var lb = ctx.label('Disk ' + (i + 1) + (dead ? ' (failed)' : ''), 1.7, 0.38, { color: dead ? '#e5583a' : undefined }); lb.position.set(X(i), -0.7, 1.2); ctx.root.add(lb);
        for (var r = 0; r < 4; r++) {
          var b = plan(r, i), ghost = dead;
          var m = ctx.box(1.1, 0.52, 1.1, ghost ? (mode === 0 ? C.hot : b.c) : b.c, { opacity: ghost ? 0.2 : 0.95 }); m.position.set(X(i), 0.55 + r * 0.62, 0); ctx.edges(m, 0xffffff, ghost ? 0.25 : 0.5); ctx.root.add(m);
          var tl = ctx.label(ghost && mode === 0 ? 'lost' : b.t, 0.8, 0.34); tl.position.set(X(i), 0.55 + r * 0.62, 0.62); ctx.root.add(tl);
        }
      }
      ctx.root.rotation.set(0.38, -0.2, 0); ctx.camera.position.set(0, 3.0, 10.3); ctx.camera.lookAt(0, 1.0, 0);
      ctx.onClick = function (e, cv) { var h = pick(ctx, e, cv, disks); if (h) { failed = failed === h.userData.disk ? -1 : h.userData.disk; ctx.rebuild(); text(ctx); ctx.kick(); } };
    }
    function text(ctx) {
      var base = mode === 0 ? 'RAID 0 stripes blocks across all four disks: full capacity (4 disks) and speed, but no redundancy.'
        : mode === 1 ? 'RAID 1 mirrors every block on a pair of disks: usable capacity is half (2 disks), and any single failure is survivable.'
        : 'RAID 5 stripes data and spreads parity (P) around: usable capacity is 3 of 4 disks, and one failure is survivable.';
      var f = failed < 0 ? ' Click a disk to fail it.' : mode === 0 ? ' Disk ' + (failed + 1) + ' failed: every file with a block on it is gone. RAID 0 cannot survive this.'
        : mode === 1 ? ' Disk ' + (failed + 1) + ' failed: its mirror still holds every block, so reads continue (ghosted blocks are on the dead disk).'
        : ' Disk ' + (failed + 1) + ' failed: each ghosted block is rebuilt by XOR-ing the other three blocks in its row.';
      ctx.caption(base + f);
    }
    stage(container, opts, build, function (ctx, row) {
      [[0, 'RAID 0'], [1, 'RAID 1'], [5, 'RAID 5']].forEach(function (m) { row.appendChild(button(m[1], function () { mode = m[0]; ctx.rebuild(); text(ctx); ctx.kick(); }, m[0] === 5 ? 'primary' : '')); });
      row.appendChild(button('Fail a disk', function () { failed = failed < 0 ? 1 : (failed + 1) % 4; ctx.rebuild(); text(ctx); ctx.kick(); }));
      row.appendChild(button('Replace disk', function () { failed = -1; ctx.rebuild(); text(ctx); ctx.kick(); }));
      text(ctx);
    });
  };

  /* ================= inode-3d ================= */
  D['inode-3d'] = function (container, opts) {
    var nodes = {}, flash = {}, ball1, busy = false;
    var N = {
      inode: [0, 3.6, 'Inode (in memory)', C.kern], d: [-4.4, 2.2, 'Direct pointers 0-11', C.lib], s: [0, 2.2, 'Single indirect', C.lib], db: [4.4, 2.2, 'Double indirect', C.lib],
      dd: [-4.4, 0.8, 'Data block', C.ok], sp: [0, 0.8, 'Pointer block', C.app], sd: [0, -0.6, 'Data block', C.ok],
      p1: [4.4, 0.8, 'Pointer block L1', C.app], p2: [4.4, -0.6, 'Pointer block L2', C.app], dx: [4.4, -2.0, 'Data block', C.ok]
    };
    var EDGES = [['inode', 'd'], ['inode', 's'], ['inode', 'db'], ['d', 'dd'], ['s', 'sp'], ['sp', 'sd'], ['db', 'p1'], ['p1', 'p2'], ['p2', 'dx']];
    function build(ctx) {
      nodes = {};
      EDGES.forEach(function (e) { var a = N[e[0]], b = N[e[1]]; line(ctx, [[a[0], a[1] - 0.3, 0], [b[0], b[1] + 0.3, 0]], 0x8aa39d, 0.8); });
      Object.keys(N).forEach(function (k) {
        var v = N[k], m = ctx.box(3.2, 0.6, 0.6, v[3], { opacity: 0.9 }); m.position.set(v[0], v[1], 0); ctx.edges(m, 0xffffff, 0.5); ctx.root.add(m); nodes[k] = m; flash[k] = 0;
        var lb = ctx.label(v[2], 3.0, 0.42); lb.position.set(v[0], v[1], 0.4); ctx.root.add(lb);
      });
      ball1 = ball(ctx, 0.2, 0xffffff, 0xffd24a); ball1.position.set(0, 4.5, 0.6); ctx.root.add(ball1);
      ctx.root.rotation.set(0.1, -0.22, 0); ctx.camera.position.set(0, 0.7, 12.6); ctx.camera.lookAt(0, 0.6, 0);
      ctx.onFrame(function (dt) { Object.keys(nodes).forEach(function (k) { flash[k] = Math.max(0, flash[k] - dt * 1.4); nodes[k].material.emissive.setRGB(flash[k] * 0.5, flash[k] * 0.45, flash[k] * 0.1); }); });
    }
    function read(ctx, path, msg) {
      if (busy) return; busy = true; ball1.position.set(0, 4.5, 0.6); ctx.caption('Following the pointers from the inode...');
      var i = 0;
      (function hop() {
        if (i >= path.length) { ctx.caption(msg); busy = false; return; }
        var v = N[path[i]], f = [ball1.position.x, ball1.position.y], to = [v[0], v[1] + 0.05];
        ctx.tween(0.6, function (e) { ball1.position.x = lerp(f[0], to[0], e); ball1.position.y = lerp(f[1], to[1], e); }, function () { flash[path[i]] = 1; i++; hop(); });
      })();
      ctx.kick();
    }
    stage(container, opts, build, function (ctx, row) {
      row.appendChild(button('Read block 5 (direct)', function () { read(ctx, ['inode', 'd', 'dd'], 'Block 5 is one of the 12 direct pointers: 1 disk read after the inode.'); }));
      row.appendChild(button('Read block 500 (single)', function () { read(ctx, ['inode', 's', 'sp', 'sd'], 'Block 500 is past the 12 direct blocks. Entry 488 of the pointer block (500 - 12) gives the data block: 2 disk reads.'); }, 'primary'));
      row.appendChild(button('Read block 5000 (double)', function () { read(ctx, ['inode', 'db', 'p1', 'p2', 'dx'], 'Block 5000 needs the double indirect block (offset 5000 - 1036 = 3964): entry 3 of L1, then entry 892 of L2, then the data: 3 disk reads.'); }));
      ctx.caption('With 4 KiB blocks and 4-byte pointers, one pointer block holds 1024 entries. Pick a block number and follow the pointers down.');
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);

