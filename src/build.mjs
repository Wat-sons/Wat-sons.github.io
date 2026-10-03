#!/usr/bin/env node
/* ============================================================
   build.mjs — src/ → 线上产物
     1. 读 src/data/*.json
     2. 按顺序渲染各区块 → index.html
     3. 按固定顺序拼接 src/styles/*.css → assets/style.css
     4. 拷贝 src/scripts/main.js → assets/app.js
   纯 Node，零依赖，无打包器。
   ============================================================ */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { esc, embedJson } from "./lib/html.mjs";
import { topbar } from "./sections/topbar.mjs";
import { hero } from "./sections/hero.mjs";
import { preloader } from "./lib/preloader.mjs";
import { markSvg, logoSvg, faviconSvg } from "./lib/brand.mjs";
import { work } from "./sections/work.mjs";
import { competition } from "./sections/competition.mjs";
import { timeline } from "./sections/timeline.mjs";
import { about } from "./sections/about.mjs";
import { contact } from "./sections/contact.mjs";
import { footer } from "./sections/footer.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");

const readJSON = async (name) =>
  JSON.parse(await readFile(join(SRC, "data", name), "utf8"));

const readText = async (rel) => readFile(join(ROOT, rel), "utf8");

/* ---------- 1. 数据 ---------- */
const profile = await readJSON("profile.json");
const metrics = await readJSON("metrics.json");
const projects = await readJSON("projects.json");
const competitions = await readJSON("competitions.json");
const contests = await readJSON("contests.json");

// research.json 仍保留在 src/data 里，但“科研方向”区块已按本人要求下线。
// 要恢复：把 _archive 里的 research.mjs 取回、在下面注册、并在 profile.json 的 nav 里加回 research。

// cf.json 由 tools/sync.mjs 生成；缺了也不该让构建挂掉，只是图表留空
let cf = null;
try {
  cf = await readJSON("cf.json");
} catch {
  console.warn("  ! src/data/cf.json 读不到（跑 npm run sync 生成），rating 曲线会留空");
}

/* ---------- 1b. 奖项统计：从 competitions.json 算，不手写 ---------- */
// metrics.json 里带 from 的条目会在这里被填上真实数值；
// note 里的 {total} {national} {provincial} {cert} 也会被替换。
// 这样删/加一条奖，首屏和竞赛区的数字自动跟着变，不会脱节。
const NATIONAL_LEVELS = new Set(["gold", "first", "second", "silver", "third", "bronze", "finalist"]);
const AW = competitions.awards;
const awardStats = {
  all: AW.length,
  total: AW.filter((a) => a.level !== "cert").length,
  national: AW.filter((a) => NATIONAL_LEVELS.has(a.level)).length,
  provincial: AW.filter((a) => String(a.level).startsWith("provincial-")).length,
  cert: AW.filter((a) => a.level === "cert").length,
};
const resolveMetric = (s) => {
  if (!s.from) return s;
  const value = awardStats[s.from];
  if (value === undefined) throw new Error(`metrics.json 里出现未知的 from: "${s.from}"（可用：${Object.keys(awardStats).join(" / ")}）`);
  // 中英文的 note 用**同一套** awardStats 替换占位符 ——
  // 两种语言的数字必须来自同一份统计，否则会出现"中文 15 项 / 英文 14 项"这种事故
  const fill = (t) => (t ? t.replace(/\{(\w+)\}/g, (_, k) => (awardStats[k] ?? `{${k}}`)) : t);
  return { ...s, value, note: fill(s.note), noteEn: fill(s.noteEn) };
};
metrics.hero = metrics.hero.map(resolveMetric);
metrics.competition = metrics.competition.map(resolveMetric);

// profile.json 里也可以写 {total} 这类占位（目前用在 About 的 Currently 一行）。
// 只处理文案字段，别的地方不碰。
const fillStats = (s) => (typeof s === "string"
  ? s.replace(/\{(\w+)\}/g, (_, k) => (awardStats[k] ?? `{${k}}`))
  : s);
if (profile.about?.currently) {
  profile.about.currently = profile.about.currently.map((c) => ({ ...c, text: fillStats(c.text) }));
}

/* ---------- 2. 区块（顺序 = 页面顺序 = 导航顺序 = 编号顺序） ---------- */
const ctx = (num, note, noteEn) => ({ num, note, noteEn });

const sections = [
  work({ projects, cf, ctx: ctx("/01", "只放能确认的真实项目，没有把握的一律不写。",
      "Only projects I can stand behind. If I am not sure about it, it does not go here.") }),
  competition({
    competitions, metrics, cf,
    ctx: ctx("/02", `${competitions.awards.length} 条记录 · 按获奖时间先后排列 · 数字均来自真实数据`,
      `${competitions.awards.length} records, oldest first. Every number comes from real data.`),
  }),
  timeline({ metrics, ctx: ctx("/03", null) }),
  about({ profile, ctx: ctx("/04", null) }),
  contact({ profile, ctx: ctx("/05", null) }),
].join("\n");

const year = new Date().getFullYear();

/* 关键 CSS 内联。
   Preloader 必须在**首次绘制**就出现 —— 它的样式如果留在外部 style.css 里，
   慢网下要等 CSS 到达才画得出来，用户先看到一段白屏，然后才开始动画，
   总时长变成「加载 + 动画」的叠加（实测慢网到过 7s）。
   tokens 一起内联是因为 preloader.css 用了 var(--bg) / var(--accent) 等令牌。
   两者在 assets/style.css 里仍然保留一份（同值，重复无副作用）。

   内联的代价是 index.html 变大、直接阻塞首屏，所以这份要压缩。
   压缩规则刻意保守：只去注释和多余空白，不动 : 和 > ——
   免得误伤 media query 或 url() 里的内容。 */
const minifyCss = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/[ \t]+/g, " ")
  .replace(/ ?\n ?/g, "\n")
  .replace(/\n{2,}/g, "\n")
  .replace(/\s*([{};,])\s*/g, "$1")
  .trim();

const rawCritical = [
  await readFile(join(SRC, "styles", "tokens.css"), "utf8"),
  await readFile(join(SRC, "styles", "preloader.css"), "utf8"),
].join("\n");
const criticalCss = minifyCss(rawCritical);

/* ---------- 品牌标识：构建期生成 SVG ----------
   accent 从 tokens.css 里读出来注入 —— 标识和站点用同一份色值来源，
   改令牌时 logo / favicon 会跟着变，不会两处各写一份。 */
const ACCENT = (rawCritical.match(/--accent:\s*(#[0-9a-fA-F]{3,8})/) || [])[1] || "#D8FF4A";
const BRAND = { accent: ACCENT, ink: "#EDEAE3" };

/* 品牌字形是**手写源**（src/brand/），不是这个脚本生成的 —— 只做拷贝分发。
   必须在 brandFiles 之前读：favicon 要复用同一份几何，而不是把路径复制第二遍。 */
const GLYPH = await readFile(join(SRC, "brand", "quchen-glyph.svg"), "utf8");
const glyphInner = (GLYPH.match(/<g[^>]*>([\s\S]*)<\/g>/) || [])[1] ?? "";
if (!glyphInner) throw new Error("从 quchen-glyph.svg 里抽不出路径");

const brandFiles = [
  ["assets/brand/quchen-mark.svg", markSvg({ ...BRAND, size: 120 })],
  ["assets/brand/quchen-logo.svg", logoSvg(BRAND)],
  // 亮底版本（打印、浅色场景、放在米白背景上时用）
  ["assets/brand/quchen-mark-ink.svg", markSvg({ accent: ACCENT, ink: "#111111", size: 120 })],
  // favicon 用品牌字形（2026-10 用户指定），不再是 Q + Path
  ["assets/favicon/favicon.svg", faviconSvg({ accent: ACCENT, glyphInner })],
  ["assets/brand/quchen-glyph.svg", GLYPH],
  ["assets/brand/quchen-glyph-a.svg", await readFile(join(SRC, "brand", "quchen-glyph-a.svg"), "utf8")],
];
for (const [rel, svg] of brandFiles) {
  await mkdir(dirname(join(ROOT, rel)), { recursive: true });
  await writeFile(join(ROOT, rel), svg, "utf8");
}

/* ---------- 3. 页面 ---------- */
const title = `${profile.handle} — AI / Algorithms / Building`;
const description = "Artificial Intelligence student exploring algorithms, optimization and intelligent systems.";

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="author" content="${esc(profile.handle)}">
<meta name="robots" content="index, follow">
<meta name="theme-color" content="#17191E" id="meta-theme-color">
<meta name="color-scheme" content="dark light">
<meta property="og:type" content="profile">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:locale" content="zh_CN">
<link rel="icon" href="assets/favicon/favicon.svg" type="image/svg+xml">
<link rel="icon" href="assets/favicon/favicon-32.png" sizes="32x32" type="image/png">
<link rel="icon" href="assets/favicon/favicon-16.png" sizes="16x16" type="image/png">
<link rel="apple-touch-icon" href="assets/favicon/apple-touch-icon.png">
<link rel="preload" href="assets/fonts/space-grotesk-latin-var.woff2" as="font" type="font/woff2" crossorigin>
<!-- 主题必须在**首次绘制之前**定下来，否则会先闪一下默认配色再跳成用户选的。
     内联在这里（不是外部文件），所以没有网络等待；读 localStorage，
     没存过就跟随系统 prefers-color-scheme。 -->
<script>
(function () {
  var d = document.documentElement, saved = null, lang = null;
  try { saved = localStorage.getItem("theme"); lang = localStorage.getItem("lang"); } catch (e) {}
  var theme = (saved === "light" || saved === "dark") ? saved
    : (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  d.setAttribute("data-theme", theme);
  // 语言同理：首屏就要定下来，否则会先闪中文再跳英文。
  // 默认中文 —— 这是中文优先的个人站，不跟随浏览器语言猜测。
  d.setAttribute("data-lang", lang === "en" ? "en" : "zh");
})();
</script>
<style>${criticalCss}</style>
<link rel="stylesheet" href="assets/style.css">
<!-- 渐进增强：只有 JS 真跑起来才隐藏待入场元素；app.js 若加载失败，2.5s 后自动解除隐藏。
     Preloader 同理 —— is-booting 只在这里加，所以「无 JS」时它根本不会出现。
     两道兜底：2.5s 解除入场隐藏；3.6s 无条件撤掉 Preloader（防止动画卡住盖住整页）。 -->
<script>
(function () {
  var d = document.documentElement;
  d.classList.add("js");
  var reduce = false;
  try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  // 减少动效时仍然走一遍简化版（START → PATH FOUND → 首页），但不跑粒子
  if (d.classList && typeof requestAnimationFrame === "function") d.classList.add("is-booting");
  d.setAttribute("data-reduced", reduce ? "1" : "0");
  setTimeout(function () { if (!window.__SITE_READY) d.classList.remove("js"); }, 2500);
  setTimeout(function () { d.classList.remove("is-booting"); }, 3600);
})();
</script>
</head>
<body>
<a class="skip-link" href="#work">跳到主要内容</a>
${preloader()}
${topbar({ profile, year })}

<main>
${hero({ profile, metrics })}
${sections}
</main>

${footer({ profile, year, accent: "var(--accent)", glyph: GLYPH })}

<noscript>
  <div class="noscript-note">浏览器禁用了 JavaScript：全部文字内容仍可正常阅读，仅导航高亮、滚动进度与数字动画不可用。</div>
</noscript>

<script id="site-data" type="application/json">${embedJson({ cf: cf?.codeforces ?? null })}</script>
<script src="assets/app.js"></script>
</body>
</html>
`;

await writeFile(join(ROOT, "index.html"), html, "utf8");

/* ---------- 4. 样式：按固定顺序拼接 ---------- */
const CSS_ORDER = ["tokens.css", "base.css", "typography.css", "layout.css",
                   "sections.css", "preloader.css", "motion.css", "print.css"];
const cssParts = [];
for (const f of CSS_ORDER) {
  cssParts.push(`/* ==== src/styles/${f} ==== */\n` + await readFile(join(SRC, "styles", f), "utf8"));
}
await mkdir(join(ROOT, "assets"), { recursive: true });
await writeFile(join(ROOT, "assets", "style.css"), cssParts.join("\n"), "utf8");

/* ---------- 5. 运行时脚本：拷贝 ---------- */
await writeFile(join(ROOT, "assets", "app.js"), await readFile(join(SRC, "scripts", "main.js"), "utf8"), "utf8");

/* ---------- 汇总 ---------- */
const kb = (s) => (Buffer.byteLength(s, "utf8") / 1024).toFixed(1);
const nav = (profile.nav ?? []).length;
console.log("构建完成");
console.log(`  index.html        ${kb(html)} KB · ${sections.split("<section").length - 1} 个区块 · ${nav} 项导航`);
console.log(`  assets/style.css  ${kb(cssParts.join(""))} KB · ${CSS_ORDER.length} 个样式层`);
console.log(`  assets/app.js     ${kb(await readText("assets/app.js"))} KB`);
console.log(`  奖项 ${AW.length} 条（竞赛 ${awardStats.total} · 全国性 ${awardStats.national} · 省赛区域 ${awardStats.provincial} · 认证 ${awardStats.cert}）`);
console.log(`  项目 ${projects.items.length} 个 · 路径节点 ${(metrics.timeline.stops ?? []).length} 个 · 时间线 ${metrics.timeline.range ?? ""}`);
if (cf) {
  console.log(`  CF 数据同步于 ${cf.syncedAt.slice(0, 10)} · ${cf.codeforces.handles.map((h) => h.handle).join(" / ")}`);
}
