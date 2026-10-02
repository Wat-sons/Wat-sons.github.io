/* ============================================================
   main.js — 运行时行为（零依赖）
   只做 CSS 做不到的事：观察滚动、写 CSS 变量、抽屉开关。
   所有位移最终都由 CSS transform 承担，JS 不碰 layout 属性。
   ============================================================ */

(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var doc = document.documentElement;

  /* ---------------------------------------------------------- L1 reveal */
  function setupReveal() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
    if (!nodes.length) return;

    // 环境不支持就全部直接显示，功能不受影响
    if (reduce || !("IntersectionObserver" in window)) {
      nodes.forEach(function (n) { n.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.06 });
    nodes.forEach(function (n) { io.observe(n); });
  }

  /* --------------------------------------------------------- 数字滚动 */
  function setupCounters() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll("[data-to]"));
    if (!nodes.length) return;

    function finish(el, raw) {
      el.textContent = raw;
      // 单位 <small> 不参与计数，重新挂回去
      if (el.dataset.unit) {
        var s = document.createElement("small");
        s.textContent = el.dataset.unit;
        el.appendChild(s);
      }
    }

    function run(el) {
      var raw = el.dataset.to;
      var to = Number(raw);
      if (!isFinite(to)) { finish(el, raw); return; }
      if (reduce) { finish(el, to.toLocaleString("en-US")); return; }

      var dur = 1100, t0 = null, done = false;
      function step(ts) {
        if (done) return;
        if (t0 === null) t0 = ts;
        var k = Math.min(1, (ts - t0) / dur);
        var eased = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(to * eased).toLocaleString("en-US");
        if (el.dataset.unit) {
          var s = document.createElement("small");
          s.textContent = el.dataset.unit;
          el.appendChild(s);
        }
        if (k < 1) requestAnimationFrame(step);
        else { done = true; finish(el, to.toLocaleString("en-US")); }
      }
      requestAnimationFrame(step);
      // 兜底：标签页被挂起 / rAF 被节流时，也必须落到终值
      setTimeout(function () { if (!done) { done = true; finish(el, to.toLocaleString("en-US")); } }, 1600);
    }

    if (!("IntersectionObserver" in window)) { nodes.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    nodes.forEach(function (n) { io.observe(n); });
  }

  /* --------------------------------------------- L2 滚动：进度条 + 视差 */
  /* 挂在同一个 rAF 帧里的滚动回调。setupPath 会把自己的绘制函数推进来，
     这样整站只有一个滚动循环，不会各写各的 listener。 */
  var scrollFns = [];

  function setupScroll() {
    var bar = document.querySelector(".scroll-progress");
    var ghosts = Array.prototype.slice.call(document.querySelectorAll(".section-ghost .ghost"));
    var scenery = document.querySelector(".hero-scenery");
    var ticking = false;

    function frame() {
      ticking = false;
      var y = window.scrollY || doc.scrollTop;
      var max = doc.scrollHeight - window.innerHeight;

      if (bar) bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";

      // 首屏插画随滚动缓慢下移（幅度刻意做小，只够让人察觉"它在那儿"）
      if (scenery && !reduce && y < window.innerHeight * 1.2) {
        scenery.style.setProperty("--sc-sy", (y * 0.10).toFixed(1) + "px");
      }

      for (var k = 0; k < scrollFns.length; k++) scrollFns[k]();

      if (!reduce) {
        for (var i = 0; i < ghosts.length; i++) {
          var g = ghosts[i];
          var host = g.closest(".section");
          if (!host) continue;
          var r = host.getBoundingClientRect();
          // 区块进入视口时把这个幽灵字往上推最多 46px
          if (r.bottom < -200 || r.top > window.innerHeight + 200) continue;
          var p = (window.innerHeight - r.top) / (window.innerHeight + r.height);
          var shift = (Math.min(Math.max(p, 0), 1) - 0.5) * -46;
          g.style.setProperty("--shift-y", shift.toFixed(1) + "px");
        }
      }
    }
    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    frame();
  }

  /* ------------------------------------------------- L2 滚动：导航状态 */
  function setupTopbar() {
    var bar = document.querySelector(".topbar");
    var links = Array.prototype.slice.call(document.querySelectorAll(".nav a[href^='#']"));
    var sections = links
      .map(function (a) { return document.querySelector(a.getAttribute("href")); })
      .filter(Boolean);
    var ticking = false;

    function frame() {
      ticking = false;
      if (bar) bar.classList.toggle("is-stuck", (window.scrollY || 0) > 24);

      // 当前区块：取视口中线所在的那一段
      var mid = window.innerHeight * 0.42;
      var active = -1;
      for (var i = 0; i < sections.length; i++) {
        var r = sections[i].getBoundingClientRect();
        if (r.top <= mid) active = i;
      }
      links.forEach(function (a, i) { a.classList.toggle("is-active", i === active); });
    }
    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    frame();
  }

  /* ------------------------------------------------------- 移动端抽屉 */
  function setupDrawer() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.querySelector(".nav");
    if (!toggle || !nav) return;

    function setOpen(open) {
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }
    toggle.addEventListener("click", function () {
      setOpen(!document.body.classList.contains("nav-open"));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
  }

  /* --------------------------------------------------- L4 鼠标微视差 */
  function setupPointer() {
    if (reduce) return;
    var hero = document.querySelector(".hero");
    if (!hero || !window.matchMedia("(pointer: fine)").matches) return;
    var raf = 0, tx = 0, ty = 0;

    window.addEventListener("pointermove", function (e) {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        hero.style.setProperty("--mx", tx.toFixed(3));
        hero.style.setProperty("--my", ty.toFixed(3));
        // 夜景插画反向微移：鼠标往右，插画往左，营造景深。幅度只有 ±7px，
        // 目标是"说不上来哪里动了，但感觉画面是活的"。
        hero.style.setProperty("--sc-x", (-tx * 7).toFixed(1) + "px");
        hero.style.setProperty("--sc-y", (-ty * 5).toFixed(1) + "px");
      });
    }, { passive: true });
  }

  /* ═══════════════ Preloader：「An Algorithm Finding Its Way.」 ═══════════════
     视觉模拟 PSO 的行为（exploration → evaluation → convergence），
     但不跑真的 PSO，也不出现任何算法名或公式 ——
     普通访客看到的是一个好看的加载动画，懂算法的人自己会认出来。

     时间线合计约 2.4s（要求 1.8–2.5s）。分五段：
       INIT → EXPLORE → CONVERGE → PATH FOUND → ENTER PORTFOLIO
     最后一段把那条路径送到首页标题下划线的**精确位置**，
     随后 Hero 的下划线在同一位置瞬间就位 —— 视觉上是同一条线，不是切页。 */
  function setupPreloader() {
    var pl = document.getElementById("preloader");
    // 注意：本文件顶部的 doc 是 documentElement 的别名（var doc = document.documentElement），
    // 不是 document。这里要用真正的 document，别再写 doc.documentElement。
    var root = document.documentElement;
    if (!pl || !root.classList.contains("is-booting")) return;

    var stage = pl.querySelector(".pl-stage");
    var swarm = pl.querySelector(".pl-swarm");
    var pathEl = pl.querySelector(".pl-path");
    var statusEl = pl.querySelector("[data-pl-status]");
    var NS = "http://www.w3.org/2000/svg";
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var START = [10, 88], TARGET = [88, 12];
    // 一个"看起来像解、其实不是"的假吸引子：让一部分粒子先往错的方向走
    var DECOY = [64, 76];

    /* 障碍物直接从 DOM 读 —— 标记里怎么写这里就怎么用，避免两处维护。
       （preloader.mjs 里的形状就是唯一事实来源） */
    var OBST = [];
    Array.prototype.forEach.call(pl.querySelectorAll(".pl-obstacles > *"), function (n) {
      var b;
      try { b = n.getBBox(); } catch (e) { return; }
      if (b && b.width > 0) OBST.push({ x: b.x, y: b.y, w: b.width, h: b.height });
    });

    /* ---------- 粒子数量：按视口宽度 + CPU 核数降级，保证 60fps ---------- */
    var base = window.innerWidth <= 720 ? 10 : window.innerWidth <= 1080 ? 14 : 24;
    var cores = navigator.hardwareConcurrency || 4;
    var N = reduce ? 0 : (cores <= 4 ? Math.round(base * 0.6) : base);

    /* ---------- 时钟补偿 ----------
       动画的时钟应该从**首次绘制**起算，而不是从 app.js 执行到这里起算。
       慢网下 app.js 可能 2 秒后才到，用户已经等过了；如果那时再放满 2.4s，
       总时长就成了「加载 + 动画」的叠加（实测线上到过 4.9s）。
       所以在这里把已经流逝的时间从时间线里扣掉：
         · 加载很快        → 完整播放
         · 加载慢了一点    → 压缩播放，总墙钟时间仍然控制在 ~2.5s 左右
         · 加载本来就很久  → 只留最后的交接，不再让用户额外等
       （关键 CSS 已经内联，所以首帧就是 Preloader，量到的 lag 是真实的等待） */
    var lag = 0;
    try { lag = performance.now(); } catch (e) {}
    /* grace：这段不算「等待」。
       关键 CSS 已经内联，所以从首帧起就有东西在动（QUCHEN / 网格 / 障碍物
       依次浮现，约 900ms）。这段时间用户是在看动画，不是在干等，
       扣掉它反而会把 EXPLORE 整段吃掉。只有超出的部分才压缩。 */
    var GRACE = 700;

    /* 两套时间线。正常合计约 2.4s（要求 1.8–2.5s，上限 3s）。
       收敛段给足 800ms —— 粒子要真的"游"过去，不能瞬移到位。
       极简版仍保留全部五个阶段，每段 250–350ms，够看清但不拖时间。 */
    var NORMAL = { explore: 150, converge: 650, found: 1450, draw: 1520, enter: 1900, exit: 2200, end: 2420 };
    var TINY   = { explore: 0, converge: 120, found: 380, draw: 420, enter: 720, exit: 1000, end: 1250 };
    var SHORT  = { explore: 0, converge: 120, found: 240, draw: 250, enter: 480, exit: 660, end: 860 };

    var shift = Math.max(0, Math.min(lag - GRACE, 1500));
    /* 压缩后如果比极简版还短，就直接用极简版 ——
       否则会出现"网络越慢、动画越快"这种荒谬结果（真的出现过：920 < 1250）。
       阈值 3200 也是踩出来的：定在 2600 时，国内访问 GitHub Pages 的 lag
       稳定在 2700 上下，永远看不到完整动画，那这个动画就白做了。 */
    var FAST = !reduce && (lag > 3200 || (NORMAL.end - shift) < TINY.end);
    if (FAST) shift = 0;
    var T = reduce ? SHORT : (FAST ? TINY : NORMAL);

    // 暴露给 tools/plshot.mjs 与排障用；不含任何用户信息。
    // startedAt 让截图工具能按**页面自己的时钟**定位，而不是靠 CDP 往返估算。
    try {
      window.__PL = { lag: Math.round(lag), shift: Math.round(shift), FAST: FAST,
                      reduce: reduce, N: N, startedAt: Math.round(performance.now()) };
    } catch (e) {}

    var parts = [];
    var raf = 0, t0 = 0, timers = [];
    var phase = 0;              // 0 = 探索，1 = 收敛（决定拉力与限速）
    var at = function (ms, fn) { timers.push(setTimeout(fn, Math.max(0, ms - shift))); };
    var setStatus = function (s) { if (statusEl) statusEl.textContent = s; };

    /* ---------- 建粒子 ---------- */
    function build() {
      for (var i = 0; i < N; i++) {
        var el = document.createElementNS(NS, "circle");
        el.setAttribute("class", "pl-particle");
        el.setAttribute("r", "0.85");
        var tr = document.createElementNS(NS, "polyline");
        tr.setAttribute("class", "pl-trail");
        swarm.appendChild(tr);
        swarm.appendChild(el);
        parts.push({
          x: START[0] + (Math.random() - 0.5) * 14,
          y: START[1] + (Math.random() - 0.5) * 14,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          goal: Math.random() < 0.32 ? DECOY : TARGET,   // 三成走错方向
          trail: [],
          len: 2,
          el: el, tr: tr
        });
      }
    }

    /* ---------- 一帧 ---------- */
    function step() {
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        /* 简化的 PSO 更新式：惯性 + 朝吸引子的拉力 + 一点噪声。
           只在视觉上成立，不追求数值正确 —— 这一整个动画是"视觉模拟算法行为"，
           不是科研演示，页面上也不会出现任何算法名字或公式。

           参数是调出来的，不是抄来的：k 太大粒子会瞬移到位（1 帧跨半张图），
           所以取到终端速度约 1.9 单位/帧 —— 横穿 100 单位的空间要 ~50 帧。 */
        var k = phase ? 0.0034 : 0.0010;
        p.vx = p.vx * 0.94 + (p.goal[0] - p.x) * k + (Math.random() - 0.5) * 0.12;
        p.vy = p.vy * 0.94 + (p.goal[1] - p.y) * k + (Math.random() - 0.5) * 0.12;

        // 限速：没有这个的话粒子会拖着一条直线冲过去，很廉价。
        // 收敛段放到 2.8，让它们在 PATH FOUND 之前**真的能走到目标**。
        var VMAX = phase ? 2.8 : 1.4;
        var sp = Math.hypot(p.vx, p.vy);
        if (sp > VMAX) { p.vx = p.vx / sp * VMAX; p.vy = p.vy / sp * VMAX; }

        // 贴近目标时加一点斥力 —— 让它们**环绕**目标，而不是塌缩成一个点
        var ddx = p.x - TARGET[0], ddy = p.y - TARGET[1];
        var dd = Math.hypot(ddx, ddy);
        if (dd < 5 && dd > 0.01) { p.vx += ddx / dd * 0.05; p.vy += ddy / dd * 0.05; }

        p.x += p.vx;
        p.y += p.vy;

        // 越界回弹
        if (p.x < 3 || p.x > 97) { p.vx *= -0.6; p.x = Math.min(97, Math.max(3, p.x)); }
        if (p.y < 3 || p.y > 97) { p.vy *= -0.6; p.y = Math.min(97, Math.max(3, p.y)); }

        // 障碍物：推出去并损失速度 —— 视觉上就是"被挡住、绕开"
        for (var j = 0; j < OBST.length; j++) {
          var o = OBST[j];
          if (p.x > o.x - 1.6 && p.x < o.x + o.w + 1.6 && p.y > o.y - 1.6 && p.y < o.y + o.h + 1.6) {
            var dx = p.x - (o.x + o.w / 2), dy = p.y - (o.y + o.h / 2);
            if (Math.abs(dx) / o.w > Math.abs(dy) / o.h) { p.vx = Math.abs(p.vx) * Math.sign(dx || 1); p.x += Math.sign(dx || 1) * 0.9; }
            else { p.vy = Math.abs(p.vy) * Math.sign(dy || 1); p.y += Math.sign(dy || 1) * 0.9; }
          }
        }

        // 拖尾：收敛阶段变长，"路径"就是这么显出来的
        p.trail.push(p.x, p.y);
        while (p.trail.length > p.len * 2) p.trail.splice(0, 2);

        var pts = "";
        for (var q = 0; q < p.trail.length; q += 2) pts += p.trail[q].toFixed(1) + "," + p.trail[q + 1].toFixed(1) + " ";
        p.tr.setAttribute("points", pts);
        p.el.setAttribute("cx", p.x.toFixed(1));
        p.el.setAttribute("cy", p.y.toFixed(1));
      }
    }

    function loop(now) {
      if (!t0) t0 = now;
      step();
      // 同样要扣掉补偿：粒子的探索时间不能超出压缩后的收敛点
      if (now - t0 < Math.max(160, T.found - shift)) raf = requestAnimationFrame(loop);
    }

    /* ---------- 量出首页下划线的位置 ---------- */
    // is-booting 期间 Hero 是 visibility:hidden（保留布局），
    // 所以这里量到的是文字的**最终**位置，不是被 transform 推开的位置。
    function measure() {
      var mark = document.querySelector(".hero .display .reveal-line:last-child .mark");
      if (!mark) return false;
      var r = mark.getBoundingClientRect();
      if (!r.width) return false;
      var fs = parseFloat(getComputedStyle(mark).fontSize) || 100;
      var hgt = Math.max(2, fs * 0.055);
      pl.style.setProperty("--pl-x", r.left + "px");
      pl.style.setProperty("--pl-y", (r.bottom - fs * 0.015 - hgt) + "px");
      pl.style.setProperty("--pl-w", r.width + "px");
      pl.style.setProperty("--pl-h", hgt + "px");
      return true;
    }

    function cleanup() {
      for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
      timers.length = 0;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    /* ---------- 收尾：摘掉 is-booting ----------
       这一步同时做三件事：preloader 隐藏（CSS 只在 is-booting 下显示）、
       Hero 从 visibility:hidden 恢复、下划线在同一位置就位。
       不需要手动删 DOM，也不需要清 CSS 动画。 */
    function finish() {
      cleanup();
      measure();                       // 再量一次，防止中途改过窗口尺寸
      root.classList.remove("is-booting");
      root.classList.add("is-ready");
    }

    /* ---------- 各阶段 ---------- */
    at(T.explore, function () { setStatus("SEARCHING"); });

    at(T.converge, function () {
      setStatus("CONVERGING");
      phase = 1;
      swarm.classList.add("is-converging");
      // 群体最优切换到真目标：粒子开始排成一条路线
      for (var i = 0; i < parts.length; i++) { parts[i].goal = TARGET; parts[i].len = 13; }
      // 把最靠前的几个点亮成强调色 → "最优个体正在领路"
      parts.slice().sort(function (a, b) {
        return (Math.hypot(a.x - TARGET[0], a.y - TARGET[1])) - (Math.hypot(b.x - TARGET[0], b.y - TARGET[1]));
      }).slice(0, Math.max(2, Math.round(N * 0.25))).forEach(function (p) {
        p.el.classList.add("is-best");
      });
    });

    at(T.found, function () {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      swarm.classList.add("is-done");     // 粒子淡出
      setStatus("PATH FOUND");
      stage.classList.add("is-found");
    });

    // 路径从起点画到终点
    at(T.draw, function () {
      if (!pathEl) return;
      var L;
      try { L = pathEl.getTotalLength(); } catch (e) { L = 0; }
      if (!L) return;
      pathEl.style.strokeDasharray = L;
      pathEl.style.strokeDashoffset = L;
      pathEl.style.transition = "stroke-dashoffset " + (reduce ? 200 : 560) + "ms var(--ease)";
      // 下一帧再改，确保浏览器先认下 dashoffset 的起始值
      requestAnimationFrame(function () { pathEl.style.strokeDashoffset = 0; });
    });

    at(T.enter, function () {
      measure();
      pl.classList.add("is-enter");       // 空间化开 + 那条线拉到下划线该在的位置
    });

    at(T.exit, function () { pl.classList.add("is-exit"); });
    at(T.end, finish);

    /* ---------- 起跑 ---------- */
    if (reduce) pl.classList.add("is-reduced");
    if (N) {
      build();
      requestAnimationFrame(loop);
    }
  }

  /* ═══════════════ Timeline — PATH SO FAR ═══════════════
     与 Preloader 同一种语言：那边是算法正在找路，这边是我走过的路。
     路径的 d 是**运行时量出来的** —— 每个节点的实际坐标连成一条平滑曲线，
     所以四档断点、任何文案长度都不会让路径穿到文字上。
     滚动联动：路径的绘制进度绑定在轨道穿过视口的进度上，
     画到哪个节点，那个节点的内容才淡入。 */
  function setupPath() {
    var track = document.querySelector("[data-tl-track]");
    if (!track) return;
    var svg = track.querySelector(".tl-svg");
    var path = track.querySelector(".tl-path");
    var stops = Array.prototype.slice.call(track.querySelectorAll("[data-tl-stop]"));
    var cta = document.querySelector("[data-tl-cta]");
    if (!svg || !path || !stops.length) return;

    var L = 0;
    var tipY = 0;

    function build() {
      var box = track.getBoundingClientRect();
      if (!box.width || !box.height) return;
      // viewBox 用实测像素，1:1 映射，stroke-width 就是 px，不会被缩放
      svg.setAttribute("viewBox", "0 0 " + box.width.toFixed(0) + " " + box.height.toFixed(0));

      var pts = stops.map(function (s) {
        var n = s.querySelector("[data-tl-node]");
        var r = n.getBoundingClientRect();
        var cy = r.top - box.top + r.height / 2;
        s._tlY = cy;                                    // 供绘制时判断"画到哪了"
        return { x: r.left - box.left + r.width / 2, y: cy };
      });

      var d = "M " + pts[0].x.toFixed(1) + " " + pts[0].y.toFixed(1);
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i], dy = b.y - a.y;
        // 两段控制点各占一半竖直距离 —— 得到平滑的 S 形，不是折线
        d += " C " + a.x.toFixed(1) + " " + (a.y + dy * 0.45).toFixed(1)
           + ", " + b.x.toFixed(1) + " " + (b.y - dy * 0.45).toFixed(1)
           + ", " + b.x.toFixed(1) + " " + b.y.toFixed(1);
      }
      // 尾巴：从最后一个节点继续往外走，配合渐变淡出 —— 「路还在生成」
      var t = pts[pts.length - 1];
      d += " C " + t.x.toFixed(1) + " " + (t.y + 60).toFixed(1)
         + ", " + (t.x + 26).toFixed(1) + " " + (t.y + 96).toFixed(1)
         + ", " + (t.x + 62).toFixed(1) + " " + (t.y + 116).toFixed(1);
      path.setAttribute("d", d);

      try { L = path.getTotalLength(); } catch (e) { L = 0; }
      path.style.setProperty("--tl-len", L.toFixed(1));
      draw();
    }

    function draw() {
      if (!L) return;
      if (reduce) {
        path.style.strokeDashoffset = 0;
        for (var j = 0; j < stops.length; j++) stops[j].classList.add("is-reached");
        if (cta) cta.classList.add("is-in");
        return;
      }
      var box = track.getBoundingClientRect();
      var vh = window.innerHeight;
      // 轨道顶部到达视口 88% 处为 0，轨道底部到达 42% 处为 1
      var p = (vh * 0.88 - box.top) / (box.height + vh * 0.46);
      p = p < 0 ? 0 : (p > 1 ? 1 : p);

      var drawn = L * p;
      path.style.strokeDashoffset = (L - drawn).toFixed(1);

      // 画笔尖端到哪，哪个节点才亮 —— 用真实曲线长度定位，不是按 y 估算
      try { tipY = path.getPointAtLength(drawn).y; } catch (e) { tipY = 0; }
      for (var i = 0; i < stops.length; i++) {
        if (!stops[i]._tlY && stops[i]._tlY !== 0) continue;
        stops[i].classList.toggle("is-reached", tipY >= stops[i]._tlY - 3);
      }
      if (cta) cta.classList.toggle("is-in", p > 0.9);
    }

    scrollFns.push(draw);
    // resize 会改变所有节点的坐标，必须重算几何
    var rt = 0;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(build, 180);
    }, { passive: true });
    build();
  }

  /* ═══════════════ 主题切换 ═══════════════
     首次应用在 <head> 的内联脚本里就完成了（避免闪屏），这里只负责：
       · 补齐按钮的 aria 状态与 meta theme-color
       · 点击切换 + 持久化
       · 用户没手动选过时跟随系统变化
     与语言切换互不干涉：语言状态存在自己的键上，主题从不读它。 */
  function setupTheme() {
    var root = document.documentElement;
    var btn = document.querySelector("[data-theme-toggle]");
    var meta = document.querySelector("#meta-theme-color");
    var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;
    var SWATCH = { dark: "#17191E", light: "#F5F5F2" };
    var animTimer = 0;

    function savedTheme() {
      try { return localStorage.getItem("theme"); } catch (e) { return null; }
    }

    function apply(theme, animate) {
      root.setAttribute("data-theme", theme);
      if (meta) meta.setAttribute("content", SWATCH[theme] || SWATCH.dark);
      if (btn) {
        btn.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
        btn.setAttribute("aria-label", theme === "light" ? "切换到暗色主题" : "切换到亮色主题");
      }
      // 只在切换的那一刻挂过渡类。常驻的话，页面里其它属性的变化也会被拖慢。
      if (animate && !reduce) {
        root.classList.add("is-theming");
        clearTimeout(animTimer);
        animTimer = setTimeout(function () { root.classList.remove("is-theming"); }, 260);
      }
    }

    // <head> 已经设过一次，这里只是把 aria / meta 补齐
    apply(root.getAttribute("data-theme") === "light" ? "light" : "dark", false);

    if (btn) {
      btn.addEventListener("click", function () {
        var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
        try { localStorage.setItem("theme", next); } catch (e) {}
        apply(next, true);
      });
    }

    // 用户没主动选过 → 跟随系统
    if (mq) {
      var onSys = function () { if (!savedTheme()) apply(mq.matches ? "light" : "dark", true); };
      if (mq.addEventListener) mq.addEventListener("change", onSys);
      else if (mq.addListener) mq.addListener(onSys);
    }
  }

  /* 当前语言。由 <head> 的内联脚本在首屏前写好，切换时改同一个属性。
     所有会随语言变的东西统一读它 —— 主题、计时器、将来新加的组件都走这里。 */
  function langIsEn() {
    return document.documentElement.getAttribute("data-lang") === "en";
  }

  /* ═══════════════ 中英文切换 ═══════════════
     只切「内容层」。品牌层（导航、区块标题、阶段标签、品牌名、
     Loading 文案、平台名 / 官方赛事名）**根本没有 data-en 属性**，
     所以切不到它们 —— 这是结构上的保证，不是靠自觉。

     页面上永远只有一份内容：中文渲染进 HTML（首屏 / SEO / 无 JS 都靠它），
     英文只挂在 data-en 属性上。切换 = 换 textContent，不复制 DOM。

     刷新不丢、不动滚动位置、不重播 Loading、与主题互不干涉
     （两者各存各的 localStorage 键）。 */
  function setupLang() {
    var root = document.documentElement;
    var btns = document.querySelectorAll("[data-lang-btn]");
    var nodes = document.querySelectorAll("[data-en]");
    var titles = document.querySelectorAll("[data-en-title]");
    var fadeTimer = 0;

    function paint(lang) {
      var isEn = lang === "en";
      Array.prototype.forEach.call(nodes, function (n) {
        var next = isEn ? n.getAttribute("data-en") : n.getAttribute("data-zh");
        if (next === null) return;
        // 只替换直接文本节点，别把子元素（比如 <small> 里的单位）冲掉
        var textNodes = [];
        for (var i = 0; i < n.childNodes.length; i++) {
          if (n.childNodes[i].nodeType === 3 && n.childNodes[i].nodeValue.trim()) textNodes.push(n.childNodes[i]);
        }
        if (textNodes.length) textNodes[0].nodeValue = next;
        else n.textContent = next;
      });
      Array.prototype.forEach.call(titles, function (n) {
        n.setAttribute("title", isEn ? n.getAttribute("data-en-title") : n.getAttribute("data-zh-title"));
      });
      Array.prototype.forEach.call(btns, function (b) {
        var on = b.getAttribute("data-lang-btn") === lang;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      root.setAttribute("lang", isEn ? "en" : "zh-CN");
    }

    function apply(lang, animate) {
      var done = function () {
        paint(lang);
        root.classList.remove("is-switching");
        // 通知依赖语言的组件（页脚计时器的单位要跟着换）
        document.dispatchEvent(new CustomEvent("langchange", { detail: { lang: lang } }));
      };
      if (animate && !reduce) {
        // 140ms 淡出 → 换字 → CSS 过渡淡入。纯 opacity，不做位移，不会引起布局抖动。
        root.classList.add("is-switching");
        clearTimeout(fadeTimer);
        fadeTimer = setTimeout(done, 140);
      } else {
        done();
      }
    }

    // 首屏：<head> 已经定好属性，这里按它把内容刷成对应语言（不带动画）
    apply(langIsEn() ? "en" : "zh", false);

    Array.prototype.forEach.call(btns, function (b) {
      b.addEventListener("click", function () {
        var next = b.getAttribute("data-lang-btn");
        if (next === root.getAttribute("data-lang")) return;
        root.setAttribute("data-lang", next);
        try { localStorage.setItem("lang", next); } catch (e) {}
        apply(next, true);
      });
    });
  }

  /* ═══════════════ 上线计时 ═══════════════
     页脚那行 SITE AGE。

     全程用 **绝对时间差**（Date.now() − 起始时刻）现算，不是每秒 +1 ——
     所以标签页被挂起、系统休眠、定时器被浏览器节流之后再回来，
     显示的值依然是对的，不会累积漂移。

     起始日期来自 HTML 上的 data-since（构建期从 profile.json 注入），
     页面上不写死任何数字；元素不存在或日期非法时直接返回，
     其它内容完全不受影响。

     **算的是「网站上线至今」，不是「服务器在线时长」** —— 静态站没有常驻进程，
     这个数字不能当成可用性指标。 */
  function setupSiteAge() {
    var el = document.querySelector("[data-site-age]");
    if (!el) return;

    var since = Date.parse(el.getAttribute("data-since") || "");
    if (isNaN(since)) { el.remove(); return; }   // 日期缺失/非法：整块撤掉，不留占位符

    var nDay = el.querySelector("[data-age-d]");
    var nHms = el.querySelector("[data-age-hms]");
    var nUnit = el.querySelector("[data-age-ud]");
    if (!nDay || !nHms) return;

    var timer = 0;
    var pad = function (n) { return n < 10 ? "0" + n : "" + n; };

    function render() {
      var ms = Date.now() - since;
      if (ms < 0) ms = 0;                       // 起始日期在未来 → 按 0，不显示负数
      var total = Math.floor(ms / 1000);
      var d = Math.floor(total / 86400);
      var h = Math.floor((total % 86400) / 3600);
      var m = Math.floor((total % 3600) / 60);
      var s = total % 60;
      nDay.textContent = d.toLocaleString("en-US");   // 千分位，「1,280 天」更好读
      nHms.textContent = pad(h) + ":" + pad(m) + ":" + pad(s);
      if (nUnit) nUnit.textContent = langIsEn() ? (d === 1 ? "day" : "days") : "天";
    }

    function start() { if (!timer) timer = setInterval(render, 1000); }
    function stop() { if (timer) { clearInterval(timer); timer = 0; } }

    render();
    start();

    // 切到后台就停表（省电）；回前台先补算一次再继续 ——
    // 挂起期间浏览器会把 setInterval 节流到分钟级，靠这个事件纠正
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { stop(); } else { render(); start(); }
    });
    // 组件卸载 / 页面离开：清掉定时器
    // 语言切换后单位要跟着换（天 / days）
    document.addEventListener("langchange", render);
    window.addEventListener("pagehide", stop);
    window.addEventListener("beforeunload", stop);
  }

  /* ------------------------------------------------------------------ */
  setupReveal();
  setupCounters();
  setupScroll();
  setupPath();
  setupTheme();
  setupLang();
  setupTopbar();
  setupDrawer();
  setupSiteAge();
  setupPointer();

  // 告诉 <head> 里的守卫脚本：JS 一切正常，可以保持入场动画
  window.__SITE_READY = true;

  // Preloader 放在最后起：前面都装好了再开始放动画，
  // 而且它内部出错也不会影响上面任何一个系统。
  try {
    setupPreloader();
  } catch (e) {
    document.documentElement.classList.remove("is-booting");
    if (window.console) console.warn("preloader skipped:", e);
  }
})();
