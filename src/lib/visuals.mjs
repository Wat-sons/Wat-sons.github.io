/* ============================================================
   lib/visuals.mjs — 构建期生成的内联 SVG 视觉
   全部来自真实数据：不画任何编造的曲线、结果或指标。
     pipeline()  → 本站的构建与隐私闸门架构图（描述真实流程）
     activity()  → 506 场 Codeforces 参与记录的点阵（真实分布）
     rating()    → 两个账号的真实 rating 曲线（来自 cf.json）
   ============================================================ */

import { esc, num } from "./html.mjs";

const ACCENT = "var(--accent)";
const DIM = "var(--fg-dim)";
const MUTE = "var(--fg-mute)";
const LINE = "var(--line)";

const wrap = (w, h, body, label) =>
  `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}" preserveAspectRatio="xMidYMid meet">${body}</svg>`;

/* ---------------------------------------------------------------- 架构图 */
/**
 * 本站的真实构建链路，画成四列数据流：
 *   src/{data,sections,styles}  →  build.mjs  →  {index.html, assets/, dist/}  →  PRIVACY GATE → GitHub Pages
 * 闸门是「不通过就中止推送」的关卡，所以画成菱形判定而不是普通方框。
 * viewBox 取 880×605（= 16:11），和 .work-media 的容器比例一致，不会被 letterbox 压扁。
 */
export function pipeline(w = 880, h = 605) {
  const BW = 184, BH = 70;
  const X = [0, 232, 464, 696];
  const Y = [70, 185, 300];
  const midY = Y[1] + BH / 2;

  const box = (x, y, label, sub, accent) => `
    <rect x="${x}" y="${y}" width="${BW}" height="${BH}" rx="8"
          fill="var(--bg)" stroke="${accent ? ACCENT : LINE}"/>
    <text x="${x + 14}" y="${y + 27}" fill="${accent ? ACCENT : "var(--fg)"}"
          font-family="var(--font-mono)" font-size="12.5">${esc(label)}</text>
    <text x="${x + 14}" y="${y + 47}" fill="${MUTE}"
          font-family="var(--font-mono)" font-size="10.5">${esc(sub)}</text>`;

  const arrowR = (x1, x2, y) => `
    <line x1="${x1}" y1="${y}" x2="${x2 - 6}" y2="${y}" stroke="${LINE}"/>
    <path d="M ${x2} ${y} l -6 -3.5 l 0 7 z" fill="${MUTE}"/>`;

  const arrowD = (x, y1, y2) => `
    <line x1="${x}" y1="${y1}" x2="${x}" y2="${y2 - 6}" stroke="${LINE}"/>
    <path d="M ${x} ${y2} l -3.5 -6 l 7 0 z" fill="${MUTE}"/>`;

  // 输入 → build
  const fanIn = Y.map((y) => arrowR(X[0] + BW, X[1], y + BH / 2)).join("");
  // build → 输出（先竖一条总线，再分出去）
  const busTop = Y[0] + BH / 2, busBot = Y[2] + BH / 2;
  const busX = X[1] + BW + 24;
  const fanOut = `
    <line x1="${X[1] + BW}" y1="${midY}" x2="${busX}" y2="${midY}" stroke="${LINE}"/>
    <line x1="${busX}" y1="${busTop}" x2="${busX}" y2="${busBot}" stroke="${LINE}"/>
    ${Y.map((y) => arrowR(busX, X[2], y + BH / 2)).join("")}`;

  return wrap(w, h, `
    <text x="0" y="20" fill="${MUTE}" font-family="var(--font-mono)" font-size="11" letter-spacing="1.8">BUILD PIPELINE · ZERO DEPENDENCIES</text>

    ${box(X[0], Y[0], "src/data/*.json", "单一事实来源")}
    ${box(X[0], Y[1], "src/sections/", "区块渲染器")}
    ${box(X[0], Y[2], "src/styles/", "令牌 + 分层 CSS")}

    ${fanIn}
    ${box(X[1], Y[1], "build.mjs", "纯 Node · 无打包器", true)}

    ${fanOut}
    ${box(X[2], Y[0], "index.html", "纯静态 HTML")}
    ${box(X[2], Y[1], "assets/", "CSS · JS · 字体")}
    ${box(X[2], Y[2], "dist/*.html", "单文件离线版")}

    ${arrowR(X[2] + BW, X[3] + 34, midY)}
    <path d="M ${X[3] + 78} ${midY} l -34 -40 l 34 -40 l 34 40 z"
          fill="var(--bg)" stroke="${ACCENT}"/>
    <text x="${X[3] + 78}" y="${midY - 6}" fill="${ACCENT}" font-family="var(--font-mono)"
          font-size="11" text-anchor="middle">PRIVACY</text>
    <text x="${X[3] + 78}" y="${midY + 9}" fill="${ACCENT}" font-family="var(--font-mono)"
          font-size="11" text-anchor="middle">GATE</text>
    <text x="${X[3] + 78}" y="${midY + 58}" fill="${MUTE}" font-family="var(--font-mono)"
          font-size="10" text-anchor="middle">fail → abort push</text>

    ${arrowD(X[3] + 78, midY + 72, 300)}
    ${box(X[3] - 53, 300, "GitHub Pages", "wat-sons.github.io", true)}

    <line x1="0" y1="440" x2="${w}" y2="440" stroke="${LINE}"/>
    <text x="0" y="470" fill="${MUTE}" font-family="var(--font-mono)" font-size="11" letter-spacing="1.8">CONSTRAINTS</text>
    ${["0 runtime dependencies", "0 CDN requests", "0 bitmap images", "0 build cache"]
      .map((t, i) => `<text x="${(i % 2) * 450}" y="${508 + Math.floor(i / 2) * 30}"
        fill="${DIM}" font-family="var(--font-mono)" font-size="12.5">${esc(t)}</text>`).join("")}
  `, "本站构建流程图：src 的数据、区块与样式经 build.mjs 产出静态站与单文件版，推送前经过隐私闸门校验，不通过则中止");
}

/* ------------------------------------------------------------ 参与记录点阵 */
const STATUS_META = [
  { key: "contest", label: "Official contest", color: ACCENT },
  { key: "vp", label: "Virtual participation", color: DIM },
  { key: "other", label: "Other", color: MUTE },
  { key: "practice", label: "Practice / upsolving", color: "#2E2E34" },
];

/**
 * 每 1 个点 = 1 场 CF 参与记录（真实总数来自 cf.json 的 stats.byStatus）。
 * 用点阵把「68 场正式赛 / 506 场总参与」这个对比变成可以一眼看出的图形。
 */
export function activity(cf, w = 800, h = 550) {
  const byStatus = cf?.codeforces?.stats?.byStatus ?? {};
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  if (!total) return "";

  // 按状态铺开，正式赛排在最前 —— 读起来就是「左上角那一小块是正式赛」
  const dots = [];
  for (const s of STATUS_META) {
    for (let i = 0; i < (byStatus[s.key] ?? 0); i++) dots.push(s.color);
  }

  const padX = 2, padTop = 34, padBottom = 78;
  const availW = w - padX * 2, availH = h - padTop - padBottom;
  const cols = Math.max(1, Math.round(Math.sqrt(dots.length * (availW / availH))));
  const rows = Math.ceil(dots.length / cols);
  const cell = Math.min(availW / cols, availH / rows);
  const r = Math.max(1.6, cell * 0.30);
  const offsetX = padX + (availW - cell * cols) / 2;
  const offsetY = padTop + (availH - cell * rows) / 2;

  const marks = dots.map((color, i) => {
    const cx = offsetX + (i % cols) * cell + cell / 2;
    const cy = offsetY + Math.floor(i / cols) * cell + cell / 2;
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(2)}" fill="${color}"/>`;
  }).join("");

  const legend = STATUS_META.map((s, i) => {
    const y = h - 52 + (i > 1 ? 22 : 0);
    const x = (i % 2) * 400;
    return `<g transform="translate(${x} ${y})">
      <circle cx="4" cy="-4" r="4" fill="${s.color}"/>
      <text x="16" y="0" fill="${DIM}" font-family="var(--font-mono)" font-size="11">${esc(s.label)}</text>
      <text x="230" y="0" fill="var(--fg)" font-family="var(--font-mono)" font-size="11">${esc(num(byStatus[s.key] ?? 0))}</text>
    </g>`;
  }).join("");

  const g = `
    <text x="${padX}" y="16" fill="${MUTE}" font-family="var(--font-mono)" font-size="11" letter-spacing="1.6">506 CONTESTS · 1 DOT = 1 CONTEST</text>
    ${marks}
    <line x1="${padX}" y1="${h - 66}" x2="${w - padX}" y2="${h - 66}" stroke="${LINE}"/>
    ${legend}
  `;
  return wrap(w, h, g, `Codeforces 参与记录点阵：共 ${total} 场，正式赛 ${byStatus.contest ?? 0} 场，虚拟赛 ${byStatus.vp ?? 0} 场，赛后补题 ${byStatus.practice ?? 0} 场`);
}

/* -------------------------------------------------------------- rating 曲线 */
export function rating(cf, w = 1000, h = 380) {
  const handles = (cf?.codeforces?.handles ?? []).filter((x) => (x.ratingHistory ?? []).length > 1);
  if (!handles.length) return "";

  const pad = { t: 24, r: 104, b: 42, l: 52 };
  const all = handles.flatMap((x) => x.ratingHistory);
  const t0 = Math.min(...all.map((p) => Date.parse(p.at)));
  const t1 = Math.max(...all.map((p) => Date.parse(p.at)));
  const rMin = Math.min(...all.map((p) => p.rating));
  const rMax = Math.max(...all.map((p) => p.rating));

  // 对齐到 200 的整数带，并留出上下边距
  const yMin = Math.max(0, Math.floor((rMin - 120) / 200) * 200);
  const yMax = Math.ceil((rMax + 120) / 200) * 200;

  const X = (t) => pad.l + ((t - t0) / (t1 - t0 || 1)) * (w - pad.l - pad.r);
  const Y = (r) => pad.t + (1 - (r - yMin) / (yMax - yMin || 1)) * (h - pad.t - pad.b);

  const RANKS = [
    [1200, "newbie"], [1400, "pupil"], [1600, "specialist"],
    [1800, "expert"], [2000, "candidate master"], [2200, "master"],
  ];

  const grid = RANKS
    .filter(([r]) => r >= yMin && r <= yMax)
    .map(([r, name]) => {
      const y = Y(r);
      return `
      <line class="grid-line" x1="${pad.l}" y1="${y.toFixed(1)}" x2="${w - pad.r}" y2="${y.toFixed(1)}"/>
      <text class="axis" x="${pad.l - 10}" y="${(y + 4).toFixed(1)}" text-anchor="end">${r}</text>
      <text class="axis" x="${w - pad.r + 10}" y="${(y + 4).toFixed(1)}" text-anchor="start"
            style="fill:var(--fg-mute);font-size:9.5px;letter-spacing:.04em">${esc(name)}</text>`;
    }).join("");

  const series = handles.map((hd, i) => {
    const pts = hd.ratingHistory.map((p) => [X(Date.parse(p.at)), Y(p.rating)]);
    const d = pts.map((p, k) => `${k ? "L" : "M"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
    const last = pts[pts.length - 1];
    const lastPt = hd.ratingHistory[hd.ratingHistory.length - 1];
    return `
      <path class="series series-${i}" d="${d}"/>
      <circle class="series-dot" cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="3.4"
              style="fill:${i === 0 ? ACCENT : DIM}"/>
      <text x="${(last[0] + 8).toFixed(1)}" y="${(last[1] + 4).toFixed(1)}" text-anchor="start"
            fill="${i === 0 ? ACCENT : DIM}" font-family="var(--font-mono)" font-size="11.5">
        ${esc(hd.handle)} ${lastPt.rating}</text>`;
  }).join("");

  const fmt = (t) => {
    const d = new Date(t);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const xLabels = [t0, (t0 + t1) / 2, t1].map((t, i) => `
    <text class="axis" x="${X(t).toFixed(1)}" y="${h - 12}" text-anchor="${i === 0 ? "start" : i === 2 ? "end" : "middle"}">${fmt(t)}</text>`).join("");

  const g = `
    <text x="0" y="12" fill="var(--fg-mute)" font-family="var(--font-mono)" font-size="11" letter-spacing="1.6">CODEFORCES RATING · ${all.length} RATED CONTESTS</text>
    ${grid}
    ${series}
    <line x1="${pad.l}" y1="${h - pad.b}" x2="${w - pad.r}" y2="${h - pad.b}" stroke="${LINE}"/>
    ${xLabels}
  `;
  return wrap(w, h, g, `Codeforces rating 曲线：${handles.map((x) => `${x.handle} 当前 ${x.rating}，历史最高 ${x.maxRating}`).join("；")}`);
}

export const VISUALS = { pipeline, activity, rating };
