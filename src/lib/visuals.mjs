/* ============================================================
   lib/visuals.mjs — 构建期生成的内联 SVG 视觉

   目前只剩一个：rating()。
   另外两种曾经做过、已被删除，记在这里避免以后再走一遍：
     · activity() —— 「506 场参与记录点阵」（1 点 = 1 场）。78% 的点是灰的，
       不读小字图例看不懂，信息量撑不起那么大面积。
     · pipeline() —— 「本站构建流程图」。讲的是这个站自己的内部结构，
       对访客没有价值，属于自说自话。
   留下来的标准：**要么一眼读懂，要么讲的是人而不是站**。
   ============================================================ */

import { esc, num } from "./html.mjs";

const ACCENT = "var(--accent)";
const DIM = "var(--fg-dim)";
const MUTE = "var(--fg-mute)";
const LINE = "var(--line)";

const wrap = (w, h, body, label, cls = "") =>
  `<svg${cls ? ` class="${cls}"` : ""} viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}" preserveAspectRatio="xMidYMid meet">${body}</svg>`;

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

  // 右侧留够放段位名（最长 "international master"），否则会被 .work-media 的 overflow:hidden 裁掉
  const pad = { t: 168, r: 142, b: 54, l: 58 };
  const all = handles.flatMap((x) => x.ratingHistory);
  const t0 = Math.min(...all.map((p) => Date.parse(p.at)));
  const t1 = Math.max(...all.map((p) => Date.parse(p.at)));

  /* ---- y 轴固定量程，不随数据收缩 ----
     之前是按数据 min/max 自动算上下界，结果：两个账号第 1 场是 CF 的 provisional
     评分（405 / 531），把轴一路拉到 300；而 87% 的点其实挤在 1200–2200，只占图高
     53% —— 下半截空着，真正有内容的区间被压扁。同一份数据换个范围就是另一个斜率，
     读者根本判断不出「陡」是真实的还是缩放造出来的。
     现在固定 0 → 2400（Codeforces 段位带的上界）。只有数据真的超过 2400 才向上扩容，
     那是必要的，不属于「神秘的缩放」。 */
  const Y_MIN = 0;
  const Y_MAX = Math.max(2400, Math.ceil((Math.max(...all.map((p) => p.rating)) + 100) / 200) * 200);

  const X = (t) => pad.l + ((t - t0) / (t1 - t0 || 1)) * (w - pad.l - pad.r);
  const Y = (r) => pad.t + (1 - (r - Y_MIN) / (Y_MAX - Y_MIN || 1)) * (h - pad.t - pad.b);

  // Codeforces 官方段位分界
  const RANKS = new Map([
    [1200, "newbie"], [1400, "pupil"], [1600, "specialist"],
    [1800, "expert"], [2000, "candidate master"], [2200, "master"],
    [2400, "international master"],
  ]);

  // 每 200 一条线，**每条都标数值** —— 轴上不留没有刻度的区域，任何位置都能读出来
  let grid = "";
  for (let r = Y_MIN; r <= Y_MAX; r += 200) {
    const y = Y(r);
    grid += `
      <line class="grid-line" x1="${pad.l}" y1="${y.toFixed(1)}" x2="${w - pad.r}" y2="${y.toFixed(1)}"/>
      <text class="axis" x="${pad.l - 10}" y="${(y + 4).toFixed(1)}" text-anchor="end">${r}</text>`;
    if (RANKS.has(r)) {
      grid += `
      <text class="axis" x="${w - pad.r + 10}" y="${(y + 4).toFixed(1)}" text-anchor="start"
            style="font-size:10px;letter-spacing:.04em">${RANKS.get(r)}</text>`;
    }
  }

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

  // 汇总提交数（两个账号相加），写在标题行里 —— 数字本身就是视觉元素
  const subs = Object.values(cf?.codeforces?.stats?.submissions ?? {}).reduce((a, b) => a + b, 0);

  return wrap(w, h, `
    <text x="0" y="20" fill="${MUTE}" font-family="var(--font-mono)" font-size="11" letter-spacing="1.8">CODEFORCES RATING · ${all.length} RATED CONTESTS · ${esc(num(subs))} SUBMISSIONS</text>
    ${summary}
    <line x1="0" y1="120" x2="${w}" y2="120" stroke="${LINE}"/>
    ${grid}
    ${series}
    <line x1="${pad.l}" y1="${h - pad.b}" x2="${w - pad.r}" y2="${h - pad.b}" stroke="${LINE}"/>
    ${xLabels}
  `, `Codeforces rating 曲线：${handles.map((x) => `${x.handle} 当前 ${x.rating}，历史最高 ${x.maxRating}`).join("；")}`, "chart");
}

export const VISUALS = { rating };
