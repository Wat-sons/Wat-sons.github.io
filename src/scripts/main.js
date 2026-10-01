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
  function setupScroll() {
    var bar = document.querySelector(".scroll-progress");
    var ghosts = Array.prototype.slice.call(document.querySelectorAll(".section-ghost .ghost"));
    var ticking = false;

    function frame() {
      ticking = false;
      var y = window.scrollY || doc.scrollTop;
      var max = doc.scrollHeight - window.innerHeight;

      if (bar) bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";

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
      });
    }, { passive: true });
  }

  /* ------------------------------------------------------------------ */
  setupReveal();
  setupCounters();
  setupScroll();
  setupTopbar();
  setupDrawer();
  setupPointer();

  // 告诉 <head> 里的守卫脚本：JS 一切正常，可以保持入场动画
  window.__SITE_READY = true;
})();
