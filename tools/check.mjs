#!/usr/bin/env node
// 发布前自检：数据完整性 + 生成结果是否正常。
//   node tools/check.mjs

import { readFile, stat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const notes = [];

const readJson = async (p) => JSON.parse(await readFile(path.join(root, p), 'utf8'));

const profile = await readJson('data/profile.json');
const awards = await readJson('data/awards.json');
const contests = await readJson('data/contests.json');

// --- 数据检查 ---
for (const [file, obj, fields] of [
  ['data/profile.json', profile, ['name', 'handle', 'github', 'school', 'summary']],
  ['data/awards.json', awards, ['awards', 'levels']],
  ['data/contests.json', contests, ['handles', 'highlights']],
]) {
  for (const f of fields) {
    if (obj[f] === undefined || obj[f] === null) problems.push(`${file} 缺字段 ${f}`);
  }
}

const ids = new Set();
for (const a of awards.awards) {
  for (const f of ['id', 'date', 'title', 'level', 'result']) {
    if (!a[f]) problems.push(`奖项 ${a.id ?? a.title ?? '?'} 缺 ${f}`);
  }
  if (ids.has(a.id)) problems.push(`奖项 id 重复：${a.id}`);
  ids.add(a.id);
  if (!awards.levels[a.level]) problems.push(`奖项 ${a.id} 用了未定义的 level：${a.level}`);
  if (!/^\d{4}-\d{2}$/.test(a.date)) problems.push(`奖项 ${a.id} 的 date 不是 YYYY-MM：${a.date}`);
}

const withCert = awards.awards.filter((a) => a.vault);
notes.push(`奖项 ${awards.awards.length} 项，其中 ${withCert.length} 项已关联证书原件（awards-vault）`);

// --- index.html 检查 ---
let html;
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
    ['id="rating-chart"', 'rating 图表容器'],
    ['id="cf-data"', '内嵌 CF 数据'],
  ];
  for (const [needle, label] of must) {
    if (!html.includes(needle)) problems.push(`index.html 缺 ${label}（${needle}）`);
  }
  if (/undefined|NaN|\[object Object\]/.test(html)) {
    problems.push('index.html 里出现 undefined / NaN / [object Object]，模板里有字段没取到');
  }
  for (const a of awards.awards) {
    if (!html.includes(a.title)) problems.push(`index.html 里没有奖项「${a.title}」，是不是没重新 build`);
  }
  notes.push(`index.html ${(Buffer.byteLength(html, 'utf8') / 1024).toFixed(1)} KB`);
}

// --- 资源检查 ---
for (const f of ['assets/style.css', 'assets/app.js', 'assets/favicon.svg']) {
  try {
    const s = await stat(path.join(root, f));
    if (s.size === 0) problems.push(`${f} 是空文件`);
  } catch {
    problems.push(`缺文件 ${f}`);
  }
}
// .nojekyll 本来就该是空的，只检查存在
try {
  await stat(path.join(root, '.nojekyll'));
} catch {
  problems.push('缺文件 .nojekyll（GitHub Pages 会因此跳过 _ 开头的文件）');
}

for (const n of notes) console.log(`· ${n}`);

// --- 隐私闸门 ---
// 背景：曾经把证书图片推上过公开仓库，force push 之后旧 commit 里的图仍能用 SHA 从 API 下载。
// 所以这里不只查「页面渲染结果」，而是查**所有会被推上公开仓库的文件**。
// 敏感词拆成两段拼起来，免得本文件自己命中自己。
const FORBIDDEN = [
  ['林' + '挺', '真名'],
  ['Lin' + ' Ting', '真名（拼音）'],
  ['2024' + '002391', '学号'],
  ['1815' + '0032643', '手机号'],
  ['智能' + '2403', '班级'],
];
const SCAN_FILES = ['index.html', 'data/profile.json', 'data/awards.json',
                    'data/contests.json', 'data/cf.json',
                    'assets/app.js', 'assets/style.css', 'assets/favicon.svg',
                    'README.md', 'package.json', 'build.mjs', '.gitignore'];
const SCAN_DIRS = ['tools', 'src'];

const pubFiles = [];
for (const f of SCAN_FILES) {
  try { await stat(path.join(root, f)); pubFiles.push(f); } catch { /* 可能不存在 */ }
}
for (const d of SCAN_DIRS) {
  try {
    for (const e of await readdir(path.join(root, d), { withFileTypes: true })) {
      if (e.isFile()) pubFiles.push(path.posix.join(d, e.name));
    }
  } catch { /* 目录不存在 */ }
}

for (const f of pubFiles) {
  let text;
  try { text = await readFile(path.join(root, f), 'utf8'); } catch { continue; }

  for (const [needle, label] of FORBIDDEN) {
    if (text.includes(needle)) problems.push(`${f} 里出现${label}——公开仓库不能有`);
  }
  const phone = text.match(/(?<!\d)1[3-9]\d{9}(?!\d)/);
  if (phone) problems.push(`${f} 里出现疑似手机号 ${phone[0]}`);

  // 证书图片：只看**本地**位图引用（外链头像、data URI 不算），
  // 并且先抹掉 vault 字段——它只是指向私有仓库的记账路径，从不参与渲染。
  const stripped = text.replace(/"vault"\s*:\s*"[^"]*"/g, '"vault":""');
  // 拆开拼，免得本文件自己命中自己
  const CERT_DIR = 'assets/' + 'certs';
  if (stripped.includes(CERT_DIR)) {
    problems.push(`${f} 引用了 ${CERT_DIR} —— 证书图片不允许进公开仓库`);
  }
  const localImgs = [...stripped.matchAll(/(?:src|href)\s*=\s*["']([^"']+\.(?:jpe?g|png|webp))["']/gi)]
    .map((m) => m[1])
    .filter((u) => !/^(?:https?:|data:|\/\/)/i.test(u));
  if (localImgs.length) {
    problems.push(`${f} 引用了本地位图（${localImgs.slice(0, 3).join(', ')}）——证书只能以文字名称出现`);
  }
}

// 仓库根目录不该出现证书原件目录
for (const bad of ['awards-repo', 'awards-vault', '_rendered']) {
  try {
    await stat(path.join(root, bad));
    const gi = await readFile(path.join(root, '.gitignore'), 'utf8').catch(() => '');
    if (!gi.includes(bad)) problems.push(`${bad}/ 存在但没写进 .gitignore，会被推上公开仓库`);
  } catch { /* 不存在，正常 */ }
}

notes.push(`隐私扫描覆盖 ${pubFiles.length} 个公开文件`);

if (problems.length) {
  console.error('\n发现问题：');
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}
console.log('\n✓ 全部检查通过');
