// Front-end behaviour: hero background, CF rating chart, scroll reveal, counters.
// No dependencies, no build step — served straight from assets/.

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const NS = 'http://www.w3.org/2000/svg';

/* ------------------------------------------------------------ hero canvas */

function heroBackground() {
  const canvas = document.getElementById('bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w = 0;
  let h = 0;
  let dpr = 1;
  let nodes = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const target = Math.round(Math.min(78, Math.max(28, (w * h) / 26000)));
    nodes = Array.from({ length: target }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      r: Math.random() * 1.6 + 0.7,
    }));
  }

  function frame(step) {
    ctx.clearRect(0, 0, w, h);
    const link = 128;
    for (const n of nodes) {
      if (step) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }
    }
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const d2 = dx * dx + dy * dy;
        if (d2 > link * link) continue;
        const a = (1 - Math.sqrt(d2) / link) * 0.28;
        ctx.strokeStyle = `rgba(90, 200, 255, ${a.toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        ctx.stroke();
      }
    }
    for (const n of nodes) {
      ctx.fillStyle = 'rgba(150, 220, 255, 0.55)';
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  resize();
  window.addEventListener('resize', resize);

  if (reduceMotion) {
    frame(false);
    return;
  }
  let visible = true;
  let onScreen = true;
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; });
  // 滚出视口就停掉 rAF —— 后台一直空转纯属白烧电
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      for (const e of entries) onScreen = e.isIntersecting;
    }, { threshold: 0 }).observe(canvas);
  }
  (function loop() {
    if (visible && onScreen) frame(true);
    requestAnimationFrame(loop);
  })();
}

/* --------------------------------------------------------- rating chart */

function fmtDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function ratingChart() {
  const host = document.getElementById('rating-chart');
  const raw = document.getElementById('cf-data');
  if (!host || !raw) return;

  let cf;
  try { cf = JSON.parse(raw.textContent); } catch { return; }
  const series = (cf?.codeforces?.handles ?? [])
    .filter((x) => (x.ratingHistory ?? []).length > 1)
    .map((x, i) => ({
      handle: x.handle,
      color: i === 0 ? '#22d3ee' : '#8b5cf6',
      points: x.ratingHistory,
    }));
  if (!series.length) return;

  const W = 1000;
  const H = 330;
  const pad = { t: 18, r: 16, b: 30, l: 44 };

  const all = series.flatMap((s) => s.points);
  const times = all.map((p) => Date.parse(p.at));
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const ratings = all.map((p) => p.rating);
  const yMin = Math.max(0, Math.floor((Math.min(...ratings) - 150) / 100) * 100);
  const yMax = Math.ceil((Math.max(...ratings) + 150) / 100) * 100;

  const X = (t) => pad.l + ((t - t0) / (t1 - t0 || 1)) * (W - pad.l - pad.r);
  const Y = (r) => pad.t + (1 - (r - yMin) / (yMax - yMin || 1)) * (H - pad.t - pad.b);

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Codeforces rating 变化曲线');

  const defs = document.createElementNS(NS, 'defs');
  defs.innerHTML = series.map((s, i) => `<linearGradient id="areaFill${i}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${s.color}" stop-opacity="${i === 0 ? 0.28 : 0.16}"/>
      <stop offset="100%" stop-color="${s.color}" stop-opacity="0"/>
    </linearGradient>`).join('');
  svg.appendChild(defs);

  // horizontal grid + rating labels
  const step = yMax - yMin > 1400 ? 400 : 200;
  for (let r = Math.ceil(yMin / step) * step; r <= yMax; r += step) {
    const y = Y(r);
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', pad.l);
    line.setAttribute('x2', W - pad.r);
    line.setAttribute('y1', y);
    line.setAttribute('y2', y);
    line.setAttribute('class', 'grid-line');
    svg.appendChild(line);
    const label = document.createElementNS(NS, 'text');
    label.setAttribute('x', pad.l - 8);
    label.setAttribute('y', y + 4);
    label.setAttribute('text-anchor', 'end');
    label.setAttribute('class', 'axis');
    label.textContent = String(r);
    svg.appendChild(label);
  }

  // x labels: first, middle, last month
  [t0, (t0 + t1) / 2, t1].forEach((t, i) => {
    const label = document.createElementNS(NS, 'text');
    label.setAttribute('x', X(t));
    label.setAttribute('y', H - 8);
    label.setAttribute('text-anchor', i === 0 ? 'start' : i === 2 ? 'end' : 'middle');
    label.setAttribute('class', 'axis');
    label.textContent = fmtDate(new Date(t).toISOString());
    svg.appendChild(label);
  });

  series.forEach((s, si) => {
    const pts = s.points.map((p) => [X(Date.parse(p.at)), Y(p.rating)]);
    // 每个号各自填充自己的面积，避免只画主号时右边留一道断崖
    const area = document.createElementNS(NS, 'path');
    area.setAttribute('d', `M ${pts[0][0]} ${H - pad.b} ` + pts.map((p) => `L ${p[0]} ${p[1]}`).join(' ') + ` L ${pts[pts.length - 1][0]} ${H - pad.b} Z`);
    area.setAttribute('fill', `url(#areaFill${si})`);
    svg.appendChild(area);

    const line = document.createElementNS(NS, 'polyline');
    line.setAttribute('points', pts.map((p) => p.join(',')).join(' '));
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', s.color);
    line.setAttribute('stroke-width', si === 0 ? '2.2' : '1.8');
    line.setAttribute('stroke-linejoin', 'round');
    line.setAttribute('stroke-linecap', 'round');
    if (si > 0) line.setAttribute('stroke-dasharray', '5 4');
    svg.appendChild(line);

    const last = s.points[s.points.length - 1];
    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('cx', X(Date.parse(last.at)));
    dot.setAttribute('cy', Y(last.rating));
    dot.setAttribute('r', '3.4');
    dot.setAttribute('fill', s.color);
    svg.appendChild(dot);
  });

  host.appendChild(svg);

  const tip = document.createElement('div');
  tip.id = 'tip';
  host.appendChild(tip);

  const hover = document.createElementNS(NS, 'line');
  hover.setAttribute('class', 'grid-line');
  hover.setAttribute('y1', pad.t);
  hover.setAttribute('y2', H - pad.b);
  hover.setAttribute('opacity', '0');
  svg.appendChild(hover);

  const flat = series.flatMap((s) => s.points.map((p) => ({ ...p, handle: s.handle, color: s.color })));
  svg.addEventListener('mousemove', (ev) => {
    const box = svg.getBoundingClientRect();
    const vx = ((ev.clientX - box.left) / box.width) * W;
    let best = null;
    let bestD = Infinity;
    for (const p of flat) {
      const d = Math.abs(X(Date.parse(p.at)) - vx);
      if (d < bestD) { bestD = d; best = p; }
    }
    if (!best) return;
    const px = (X(Date.parse(best.at)) / W) * box.width;
    tip.style.left = `${px}px`;
    tip.style.top = `${(Y(best.rating) / H) * box.height - 6}px`;
    tip.innerHTML = `<b style="color:${best.color}">${best.handle}</b> <b>${best.rating}</b>`
      + ` <span style="color:${best.delta >= 0 ? '#3ddc84' : '#ff7a7a'}">${best.delta >= 0 ? '+' : ''}${best.delta}</span><br>`
      + `<span style="color:#9aa6bf">${fmtDate(best.at)} · ${best.name}</span>`;
    tip.classList.add('on');
    hover.setAttribute('x1', X(Date.parse(best.at)));
    hover.setAttribute('x2', X(Date.parse(best.at)));
    hover.setAttribute('opacity', '1');
  });
  svg.addEventListener('mouseleave', () => {
    tip.classList.remove('on');
    hover.setAttribute('opacity', '0');
  });
}

/* ------------------------------------------------------------- counters */

function counters() {
  const nodes = [...document.querySelectorAll('[data-to]')];
  if (!nodes.length) return;
  const run = (el) => {
    const to = Number(el.dataset.to);
    if (!Number.isFinite(to)) return;
    if (reduceMotion) { el.textContent = String(to); return; }
    const dur = 900;
    const t0 = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      el.textContent = String(Math.round(to * eased));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  // 没有 IntersectionObserver 就直接落到终值，别把数字留在 0
  if (!('IntersectionObserver' in window)) { nodes.forEach(run); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
    }
  }, { threshold: 0.4 });
  nodes.forEach((n) => { n.textContent = '0'; io.observe(n); });
}

/* --------------------------------------------------------------- reveal */

function reveal() {
  const nodes = [...document.querySelectorAll('.reveal')];
  if (!nodes.length || reduceMotion || !('IntersectionObserver' in window)) {
    nodes.forEach((n) => n.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  nodes.forEach((n) => io.observe(n));
}

heroBackground();
ratingChart();
counters();
reveal();

// 告诉 <head> 里的守卫脚本：JS 一切正常，可以保持入场动画
window.__SITE_READY = true;
