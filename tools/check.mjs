#!/usr/bin/env node
/* ============================================================
   tools/check.mjs — 发布前自检 + 隐私闸门
   三件事：
     1. 数据完整性（字段、枚举、日期格式、id 唯一）
     2. 构建结果（index.html 是否真的含所有内容与资源）
     3. 隐私闸门 —— 扫**所有会进公开仓库的文件**，不只看页面
   不过闸门就别推。

   背景：这个项目曾经把 29 张证书图片推上过公开仓库。删文件不够 ——
   force push 之后旧 commit 里的图仍能用 SHA 从 GitHub API 下载。
   所以现在从源头堵：敏感内容根本不进这个仓库。
   ============================================================ */

import { readFile, stat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const notes = [];

const readJson = async (p) => JSON.parse(await readFile(path.join(root, p), 'utf8'));
const exists = async (p) => { try { await stat(path.join(root, p)); return true; } catch { return false; } };

/* ─────────────────────────── 1. 数据 ─────────────────────────── */
const profile = await readJson('src/data/profile.json');
const metrics = await readJson('src/data/metrics.json');
const projects = await readJson('src/data/projects.json');
const research = await readJson('src/data/research.json');
const competitions = await readJson('src/data/competitions.json');
const contests = await readJson('src/data/contests.json');

for (const [file, obj, fields] of [
  ['src/data/profile.json', profile, ['handle', 'github', 'email', 'nav', 'hero', 'about', 'skills', 'education']],
  ['src/data/metrics.json', metrics, ['hero', 'competition', 'timeline']],
  ['src/data/projects.json', projects, ['items']],
  ['src/data/research.json', research, ['items']],
  ['src/data/competitions.json', competitions, ['awards', 'levels']],
  ['src/data/contests.json', contests, ['handles', 'highlights']],
]) {
  for (const f of fields) {
    if (obj[f] === undefined || obj[f] === null) problems.push(`${file} 缺字段 ${f}`);
  }
}

// 奖项：字段齐、id 唯一、level 有定义、date 是 YYYY-MM
const ids = new Set();
for (const a of competitions.awards) {
  for (const f of ['id', 'date', 'title', 'level', 'result']) {
    if (!a[f]) problems.push(`奖项 ${a.id ?? a.title ?? '?'} 缺 ${f}`);
  }
  if (ids.has(a.id)) problems.push(`奖项 id 重复：${a.id}`);
  ids.add(a.id);
  if (!competitions.levels[a.level]) problems.push(`奖项 ${a.id} 用了未定义的 level：${a.level}`);
  if (!/^\d{4}-\d{2}(-\d{2})?$/.test(a.date)) {
    problems.push(`奖项 ${a.id} 的 date 既不是 YYYY-MM 也不是 YYYY-MM-DD：${a.date}`);
  }
}

// 项目 visual 必须是已知的生成器
const KNOWN_VISUALS = ['rating', 'none'];
for (const p of projects.items) {
  if (p.visual && !KNOWN_VISUALS.includes(p.visual)) {
    problems.push(`项目 ${p.id} 的 visual「${p.visual}」没有对应生成器（可用：${KNOWN_VISUALS.join(' / ')}）`);
  }
}

// 导航 id 必须都有对应 section
for (const n of profile.nav) {
  if (!(await exists('src/sections'))) break;
  const files = await readdir(path.join(root, 'src/sections'));
  const hasFile = files.some((f) => f === `${n.id}.mjs`);
  if (!hasFile) problems.push(`导航项「${n.label}」指向 #${n.id}，但 src/sections/${n.id}.mjs 不存在`);
}

notes.push(`奖项 ${competitions.awards.length} 条（关联证书原件 ${competitions.awards.filter((a) => a.vault).length} 条）`);
notes.push(`项目 ${projects.items.length} 个 · 研究方向 ${research.items.length} 个 · 路径节点 ${(metrics.timeline?.stops ?? []).length} 个`);

/* ──────────────────── 2. index.html 与资源 ──────────────────── */
let html = '';
try {
  html = await readFile(path.join(root, 'index.html'), 'utf8');
} catch {
  problems.push('index.html 不存在，先跑 npm run build');
}

if (html) {
  const must = [
    ['<html lang="zh-CN"', 'HTML 语言标记'],
    ['assets/style.css', '样式表引用'],
    ['assets/app.js', '脚本引用'],
    ['assets/fonts/space-grotesk-latin-var.woff2', '字体预加载'],
    ['class="display"', 'Hero 显示字'],
    ['class="ghost"', '幽灵区块标题'],
    ['class="chart"', 'rating 曲线'],
    ['class="work-item', '项目大卡'],
  ];
  for (const [needle, label] of must) {
    if (!html.includes(needle)) problems.push(`index.html 缺 ${label}（${needle}）`);
  }
  if (/undefined|NaN|\[object Object\]/.test(html)) {
    problems.push('index.html 里出现 undefined / NaN / [object Object]，模板有字段没取到');
  }
  for (const a of competitions.awards) {
    if (!html.includes(a.title)) problems.push(`index.html 里没有奖项「${a.title}」，是不是没重新 build`);
  }
  // 锚点必须都存在，否则导航是坏的
  for (const n of profile.nav) {
    if (!html.includes(`id="${n.id}"`)) problems.push(`index.html 里没有 id="${n.id}"，导航会跳空`);
  }
  notes.push(`index.html ${(Buffer.byteLength(html, 'utf8') / 1024).toFixed(1)} KB`);
}

for (const f of ['assets/style.css', 'assets/app.js', 'assets/favicon/favicon.svg',
                 'assets/fonts/space-grotesk-latin-var.woff2']) {
  try {
    const s = await stat(path.join(root, f));
    if (s.size === 0) problems.push(`${f} 是空文件`);
  } catch {
    problems.push(`缺文件 ${f}`);
  }
}
try { await stat(path.join(root, '.nojekyll')); } catch { problems.push('缺 .nojekyll'); }

/* ───────────────────────── 3. 隐私闸门 ───────────────────────── */
// 敏感词拆成两段拼起来，免得本文件自己命中自己
const FORBIDDEN = [
  ['林' + '挺', '真名'],
  ['Lin' + ' Ting', '真名（拼音）'],
  ['2024' + '002391', '学号'],
  ['1815' + '0032643', '手机号'],
  ['智能' + '2403', '班级'],
];
// 明确不公开的内容（本人要求下线，别让 sync/build 再带回来）
const GONE = ['XCP' + 'C', 'VP' + '-Tracker', 'vp' + '-data', 'ccpc' + '-neo-vp'];
// 成绩 / 排名 / 课程 —— 这些词本身要留（用于提示），只查字段与具体值
const GRADES = ['86' + '.43', '24 / 1' + '40', '加权' + '成绩', '专业' + '排名', '相关' + '课程'];

const TEXT_EXT = new Set(['.html', '.css', '.js', '.mjs', '.json', '.md', '.svg', '.txt', '.gitignore', '.ps1']);
const SCAN_ROOT_FILES = ['index.html', 'README.md', 'package.json', 'build.mjs',
                         '.gitignore', 'publish.ps1', 'assets/style.css', 'assets/app.js', 'assets/favicon/favicon.svg'];

/**
 * 分级判定：
 *   HARD —— 会渲染进页面、或作为数据/元信息发布出去的文件。命中就**阻断推送**。
 *           包括 publish.ps1，因为它写的仓库描述会直接显示在 GitHub 上。
 *   SOFT —— 工具脚本与文档。它们合法地需要提到「哪些内容不公开」这件事，
 *           命中只提示，不阻断。但会打印出来供人工确认。
 */
const SOFT_PREFIX = ['tools/'];
const SOFT_FILES = new Set(['README.md', 'package.json']);
const tierOf = (f) => (SOFT_FILES.has(f) || SOFT_PREFIX.some((p) => f.startsWith(p)) ? 'soft' : 'hard');

const pubFiles = [];
for (const f of SCAN_ROOT_FILES) if (await exists(f)) pubFiles.push(f);

async function walk(dir) {
  let entries = [];
  try { entries = await readdir(path.join(root, dir), { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const rel = path.posix.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', 'dist', '_archive', 'awards-repo', '_rendered'].includes(e.name)) continue;
      await walk(rel);
    } else if (TEXT_EXT.has(path.extname(e.name)) || e.name === '.gitignore') {
      pubFiles.push(rel);
    }
  }
}
for (const d of ['src', 'tools']) await walk(d);

const softHits = [];
const flag = (f, msg) => {
  if (tierOf(f) === 'hard') problems.push(msg);
  else softHits.push(msg);
};

for (const f of pubFiles) {
  let text;
  try { text = await readFile(path.join(root, f), 'utf8'); } catch { continue; }

  for (const [needle, label] of FORBIDDEN) {
    if (text.includes(needle)) flag(f, `${f} 里出现${label} —— 公开仓库不能有`);
  }
  for (const w of GONE) {
    if (text.includes(w)) flag(f, `${f} 里出现 ${w} —— 本人要求不公开`);
  }
  for (const w of GRADES) {
    if (text.includes(w)) flag(f, `${f} 里出现「${w}」 —— 成绩 / 排名 / 课程不公开`);
  }
  const phone = text.match(/(?<!\d)1[3-9]\d{9}(?!\d)/);
  if (phone) flag(f, `${f} 里出现疑似手机号 ${phone[0]}`);

  // 证书图片：只查**本地**位图引用（外链头像、data URI 不算）
  // vault 只是指向私有仓库的记账路径，从不参与渲染，先抹掉
  const stripped = text.replace(/"vault"\s*:\s*"[^"]*"/g, '"vault":""');
  const CERT_DIR = 'assets/' + 'certs';
  if (stripped.includes(CERT_DIR)) flag(f, `${f} 引用了 ${CERT_DIR} —— 证书图片不允许进公开仓库`);
  // 唯一获准进仓库的位图：首屏夜景插画（装饰用、无人信息、四边淡出已烘进 alpha）。
  // 白名单是**精确路径**，不是"允许 webp" —— 换个名字或换个目录一样会被拦。
  // 获准进公开仓库的位图。**精确路径**，不是"允许 webp/png" ——
  // 换个名字或换个目录一样会被拦。三类、各有明确用途：
  //   装饰插画（无人信息） · 二次元头像（本人形象，非真人照片） · favicon 位图回退
  const IMG_ALLOW = new Set([
    'assets/scenery/orbit.webp',
    'assets/avatar/avatar-navbar.webp',
    'assets/favicon/favicon-16.png',
    'assets/favicon/favicon-32.png',
    'assets/favicon/apple-touch-icon.png',
  ]);
  const localImgs = [...stripped.matchAll(/(?:src|href)\s*=\s*["']([^"']+\.(?:jpe?g|png|webp))["']/gi)]
    .map((m) => m[1])
    .filter((u) => !/^(?:https?:|data:|\/\/)/i.test(u))
    .filter((u) => !IMG_ALLOW.has(u.replace(/^\.?\//, '')));
  if (localImgs.length) flag(f, `${f} 引用了未获准的本地位图（${localImgs.slice(0, 3).join(', ')}）—— 证书只能以文字名称出现`);
}

// 结构约束：education 不该再有成绩/排名/课程字段
const edu = profile.education ?? {};
for (const f of ['gpa', 'rank', 'courses']) {
  if (edu[f] !== undefined && edu[f] !== null) problems.push(`profile.education.${f} 不为空 —— 不公开`);
}
// cf.json 不该再有 xcpc
try {
  const cf = await readJson('src/data/cf.json');
  if ('xcpc' in cf) problems.push('src/data/cf.json 里又冒出 xcpc 字段 —— 训练量统计不公开');
} catch { /* 没有就跳过 */ }

/* 全站语言规则：**英文管结构，中文管内容。**
   英文：区块英文副标题、START/COMPETE 这类 mono 标签、技术名词、[2026]、BACK TO TOP、首屏宣言
   中文：正文、描述、叙事
   这条是踩过坑加的 —— Timeline 的正文曾经整段写成英文，
   理由还被我当成"设计决定"写进了 README，其实只是照抄了需求里的英文原文。 */
const CJK = /[\u4e00-\u9fff]/;
{
  const tl = metrics.timeline ?? {};
  const content = [['timeline.intro', tl.intro]];
  (tl.stops ?? []).forEach((s, i) => {
    (s.lines ?? []).forEach((t, j) => content.push([`timeline.stops[${i}].lines[${j}]`, t]));
  });
  if (tl.next?.line) content.push(['timeline.next.line', tl.next.line]);
  for (const [key, val] of content) {
    if (val && !CJK.test(val)) {
      problems.push(`src/data/metrics.json 的 ${key} 没有中文：${val}\n      正文该是中文（英文管结构，中文管内容）`);
    }
  }
  // 结构类字段反过来不该有中文 —— 标签是 mono 大写字，混进中文会很难看
  const labels = [['timeline.next.cta', tl.next?.cta], ...(tl.stops ?? []).map((s, i) => [`timeline.stops[${i}].tag`, s.tag])];
  for (const [key, val] of labels) {
    if (val && CJK.test(val)) problems.push(`src/data/metrics.json 的 ${key} 含中文：${val} —— 结构标签该是英文`);
  }
}

// 仓库里不该出现二进制/位图 —— 除了图标与字体。
// 用 git ls-files 查（那才是真正会被发布的集合），git 不可用时退回扫描根目录。
// 背景：曾经因为一条命令里路径分隔符丢了，两张截图被拼成「预览N-xxx.png」落在仓库根目录
// 并被提交进公开仓库。光靠 .gitignore 挡不住这种意外落盘，必须有一道断言。
const ALLOWED_BIN = [
  'assets/favicon/favicon.svg',                 // 矢量图标
  'assets/fonts/space-grotesk-latin-var.woff2', // 自托管字体
  'assets/scenery/orbit.webp',                  // 首尾呼应插画
  'assets/avatar/avatar-navbar.webp',           // 导航头像（32px @2x，2KB）
  'assets/favicon/favicon-16.png',              // favicon 位图回退
  'assets/favicon/favicon-32.png',
  'assets/favicon/apple-touch-icon.png',
  // 注意：assets/avatar/avatar-square.webp 与 avatar-navbar@2x-60.webp 没在用，
  // 故意不列 —— 没被引用的资源不该进公开仓库。
];
const BIN_RE = /\.(png|jpe?g|webp|gif|pdf|docx?|xlsx?|zip)$/i;
let tracked = null;
try {
  const { execFileSync } = await import('node:child_process');
  // --others --exclude-standard：把「未跟踪但不被 .gitignore 忽略」的文件也算进来。
  // 只用 ls-files 会漏掉刚生成、还没 commit 的文件 —— 自检跑在 commit 之前，
  // 所以第一次提交必然绕过检查。这个坑实际踩到过：两个没被引用的图混进了公开仓库。
  tracked = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', '--cached', '--others', '--exclude-standard'],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    .split('\n').map((s) => s.trim()).filter(Boolean);
} catch {
  notes.push('git 不可用，跳过「仓库内二进制」检查');
}
if (tracked) {
  const strays = tracked.filter((f) => BIN_RE.test(f) && !ALLOWED_BIN.includes(f));
  for (const f of strays) problems.push(`公开仓库里跟踪了二进制文件：${f} —— 加进 .gitignore 并 git rm --cached`);
  if (!strays.length) notes.push(`仓库内二进制检查：${tracked.length} 个文件（含待提交），除白名单 ${ALLOWED_BIN.length} 项外无二进制`);
}

// 不被 .gitignore 挡住的敏感目录 = 会被推上公开仓库
for (const bad of ['awards-repo', 'awards-vault', '_rendered', '_archive']) {
  if (await exists(bad)) {
    const gi = await readFile(path.join(root, '.gitignore'), 'utf8').catch(() => '');
    if (!gi.includes(bad)) problems.push(`${bad}/ 存在但没写进 .gitignore，会被推上公开仓库`);
  }
}

notes.push(`隐私扫描覆盖 ${pubFiles.length} 个公开文件 · ${FORBIDDEN.length} 个敏感词 + ${GONE.length} 个下线项 + ${GRADES.length} 个成绩项`);

/* ─────────────────────────── 输出 ─────────────────────────── */
for (const n of notes) console.log(`· ${n}`);

if (softHits.length) {
  console.log(`\n提示（工具 / 文档里提到，不阻断推送，共 ${softHits.length} 条）：`);
  for (const h of softHits) console.log(`  · ${h}`);
}

if (problems.length) {
  console.error('\n发现阻断性问题：');
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}
console.log('\n✓ 全部检查通过');
