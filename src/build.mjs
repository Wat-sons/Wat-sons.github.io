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
  const note = s.note ? s.note.replace(/\{(\w+)\}/g, (_, k) => (awardStats[k] ?? `{${k}}`)) : s.note;
  return { ...s, value, note };
};
metrics.hero = metrics.hero.map(resolveMetric);
metrics.competition = metrics.competition.map(resolveMetric);

/* ---------- 2. 区块（顺序 = 页面顺序 = 导航顺序 = 编号顺序） ---------- */
const ctx = (num, note) => ({ num, note });

const sections = [
  work({ projects, cf, ctx: ctx("/01", "只放能确认的真实项目，没有把握的一律不写。") }),
  competition({
    competitions, metrics, cf,
    ctx: ctx("/02", `${competitions.awards.length} 条记录 · 按获奖时间先后排列 · 数字均来自真实数据`),
  }),
  timeline({ metrics, ctx: ctx("/03", "每年只写确实发生过的事。") }),
  about({ profile, ctx: ctx("/04", null) }),
  contact({ profile, ctx: ctx("/05", null) }),
].join("\n");

const year = new Date().getFullYear();

/* ---------- 3. 页面 ---------- */
const title = `${profile.handle} — AI / Algorithms / Research`;
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
<meta name="theme-color" content="#0B0B0C">
<meta name="color-scheme" content="dark">
<meta property="og:type" content="profile">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:locale" content="zh_CN">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="assets/fonts/space-grotesk-latin-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/style.css">
<!-- 渐进增强：只有 JS 真跑起来才隐藏待入场元素；app.js 若加载失败，2.5s 后自动解除隐藏 -->
<script>
(function () {
  var d = document.documentElement;
  d.classList.add("js");
  setTimeout(function () { if (!window.__SITE_READY) d.classList.remove("js"); }, 2500);
})();
</script>
</head>
<body>
<a class="skip-link" href="#work">跳到主要内容</a>
${topbar({ profile, year })}

<main>
${hero({ profile, metrics })}
${sections}
</main>

${footer({ profile, year })}

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
                   "sections.css", "motion.css", "print.css"];
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
console.log(`  项目 ${projects.items.length} 个 · 时间线 ${metrics.timeline.length} 年`);
if (cf) {
  console.log(`  CF 数据同步于 ${cf.syncedAt.slice(0, 10)} · ${cf.codeforces.handles.map((h) => h.handle).join(" / ")}`);
}
