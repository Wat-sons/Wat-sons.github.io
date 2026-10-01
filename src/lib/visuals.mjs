/* ============================================================
   lib/visuals.mjs — 构建期生成的内联 SVG 视觉
   全部来自真实数据：不画任何编造的曲线、结果或指标。
     pipeline()  → 本站的构建与隐私闸门架构图（描述真实流程）
     rating()    → 两个账号的真实 rating 曲线（来自 cf.json）
   两个都做成 880×605（= 16:11），与 .work-media 的容器比例一致，
   不会出现 letterbox 留白。
   ============================================================ */

import { esc, num } from "./html.mjs";

const ACCENT = "var(--accent)";
const DIM = "var(--fg-dim)";
const MUTE = "var(--fg-mute)";
const LINE = "var(--line)";

const wrap = (w, h, body, label, cls = "") =>
  `<svg${cls ? ` class="${cls}"` : ""} viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}" preserveAspectRatio="xMidYMid meet">${body}</svg>`;

/* ---------------------------------------------------------------- 架构图 */
/**
 * 本站的真实构建链路，画成四列数据流：
 *   src/{data,sections,styles} → build.mjs → {index.html, assets/, dist/} → PRIVACY GATE → GitHub Pages
 * 闸门是「不通过就中止推送」的关卡，所以画成菱形判定而不是普通方框。
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

  const fanIn = Y.map((y) => arrowR(X[0] + BW, X[1], y + BH / 2)).join("");

  // build → 三个输出：先竖一条总线，再分出去
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

/* -------------------------------------------------------------- rating 曲线 */
/**
 * 两个账号的真实 rating 曲线。
 * 顶部先给两行「当前 / 历史最高 / 段位」的数字摘要 —— 让人不用读坐标轴就能拿到结论，
 * 下面才是曲线本身。这是替代原先那团「意义不明」点阵的方案：
 * 上行的折线是所有人都能一眼读懂的语言。
 */
export function rating(cf, w = 880, h = 605) {
  const handles = (cf?.codeforces?.handles ?? []).filter((x) => (x.ratingHistory ?? []).length > 1);
  if (!handles.length) return "";

  // 右侧留够位置放段位名（最长 "candidate master"），否则会被 .work-media 的 overflow:hidden 裁掉
  const pad = { t: 176, r: 128, b: 54, l: 58 };
  const all = handles.flatMap((x) => x.ratingHistory);
  const t0 = Math.min(...all.map((p) => Date.parse(p.at)));
  const t1 = Math.max(...all.map((p) => Date.parse(p.at)));
  const rMin = Math.min(...all.map((p) => p.rating));
  const rMax = Math.max(...all.map((p) => p.rating));

  const yMin = Math.max(0, Math.floor((rMin - 100) / 100) * 100);
  const yMax = Math.ceil((rMax + 100) / 100) * 100;

  const X = (t) => pad.l + ((t - t0) / (t1 - t0 || 1)) * (w - pad.l - pad.r);
  const Y = (r) => pad.t + (1 - (r - yMin) / (yMax - yMin || 1)) * (h - pad.t - pad.b);

  const RANKS = [
    [1200, "newbie"], [1400, "pupil"], [1600, "specialist"],
    [1800, "expert"], [2000, "candidate master"], [2200, "master"], [2400, "international master"],
  ];

  const grid = RANKS
    .filter(([r]) => r >= yMin && r <= yMax)
    .map(([r, name]) => {
      const y = Y(r);
      return `
      <line class="grid-line" x1="${pad.l}" y1="${y.toFixed(1)}" x2="${w - pad.r}" y2="${y.toFixed(1)}"/>
      <text class="axis" x="${pad.l - 10}" y="${(y + 4).toFixed(1)}" text-anchor="end">${r}</text>
      <text class="axis" x="${w - pad.r + 10}" y="${(y + 4).toFixed(1)}" text-anchor="start"
            style="font-size:10px;letter-spacing:.04em">${esc(name)}</text>`;
    }).join("");

  const series = handles.map((hd, i) => {
    const pts = hd.ratingHistory.map((p) => [X(Date.parse(p.at)), Y(p.rating)]);
    const d = pts.map((p, k) => `${k ? "L" : "M"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
    const last = pts[pts.length - 1];
    return `
      <path class="series series-${i}" d="${d}"/>
      <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="3.4"
              style="fill:${i === 0 ? ACCENT : DIM}"/>`;
  }).join("");

  // 顶部数字摘要：先给结论，再看曲线。
  // 一行一个账号 —— 「handle / 当前 rating / max / 段位」，不做多列对齐，避免列宽错位。
  const summary = handles.map((hd, i) => {
    const y = 58 + i * 34;
    const color = i === 0 ? ACCENT : DIM;
    return `
      <circle cx="5" cy="${y - 4}" r="4" fill="${color}"/>
      <text x="22" y="${y}" fill="${color}" font-family="var(--font-mono)" font-size="15">${esc(hd.handle)}</text>
      <text x="190" y="${y}" fill="var(--fg)" font-family="var(--font-mono)" font-size="16" font-weight="600">${esc(num(hd.rating))}</text>
      <text x="268" y="${y}" fill="${MUTE}" font-family="var(--font-mono)" font-size="12.5">· max ${esc(num(hd.maxRating))} · ${esc(hd.maxRank ?? "")}</text>`;
  }).join("");

  const fmt = (t) => {
    const d = new Date(t);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const xLabels = [t0, (t0 + t1) / 2, t1].map((t, i) => `
    <text class="axis" x="${X(t).toFixed(1)}" y="${h - 16}" text-anchor="${i === 0 ? "start" : i === 2 ? "end" : "middle"}">${fmt(t)}</text>`).join("");

  return wrap(w, h, `
    <text x="0" y="20" fill="${MUTE}" font-family="var(--font-mono)" font-size="11" letter-spacing="1.8">CODEFORCES RATING · ${all.length} RATED CONTESTS</text>
    ${summary}
    <line x1="0" y1="120" x2="${w}" y2="120" stroke="${LINE}"/>
    ${grid}
    ${series}
    <line x1="${pad.l}" y1="${h - pad.b}" x2="${w - pad.r}" y2="${h - pad.b}" stroke="${LINE}"/>
    ${xLabels}
  `, `Codeforces rating 曲线：${handles.map((x) => `${x.handle} 当前 ${x.rating}，历史最高 ${x.maxRating}`).join("；")}`, "chart");
}

export const VISUALS = { pipeline, rating };
