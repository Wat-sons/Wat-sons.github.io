#!/usr/bin/env node
// 刷新 data/cf.json —— 比赛记忆里的「自动数字」全部来自这里。
//
//   数据源 1：Codeforces 公开 API（无需登录）
//             user.info  -> 当前 rating / 最高 rating / 段位
//             user.rating-> 每场 rated 比赛的 rating 变化（画曲线用）
//   数据源 2：本机的 XCPC-VP-Tracker 产物（可选，不存在就跳过）
//             cf-progress.json -> 提交数、场次数、VP / 正式赛 / 补题分布
//             vp-data.json     -> XCPC 赛站数、题目数、已过题数
//
// 用法： node tools/sync.mjs [--tracker <XCPC-VP-Tracker 目录>]
// 退出码非 0 表示没写文件（网络挂了不会把旧数据冲掉）。

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const contestsPath = path.join(root, 'data', 'contests.json');
const outPath = path.join(root, 'data', 'cf.json');

const argv = process.argv.slice(2);
const trackerFlag = argv.indexOf('--tracker');
const trackerDir = trackerFlag >= 0
  ? path.resolve(argv[trackerFlag + 1])
  : path.resolve(root, '..', 'XCPC-VP-Tracker');

const CONTESTS_API = 'https://codeforces.com/api';
const TIMEOUT_MS = 30000;

async function getJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': 'dsh-homepage-sync' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    if (body.status !== 'OK') throw new Error(body.comment || 'API status != OK');
    return body.result;
  } finally {
    clearTimeout(timer);
  }
}

async function readIfExists(file) {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (err) {
    console.warn(`  ! 读不动 ${path.basename(file)}：${err.message}`);
    return null;
  }
}

const contests = JSON.parse(await readFile(contestsPath, 'utf8'));
const handles = contests.handles?.codeforces ?? [];
if (!handles.length) {
  console.error('data/contests.json 里没有 handles.codeforces，没得同步。');
  process.exit(1);
}

console.log(`Codeforces handles: ${handles.join(', ')}`);

let infos;
try {
  infos = await getJson(`${CONTESTS_API}/user.info?handles=${handles.join(';')}`);
} catch (err) {
  console.error(`拉 user.info 失败：${err.message}`);
  console.error('保留原有 data/cf.json，未做任何写入。');
  process.exit(1);
}

const cfHandles = infos.map((u) => ({
  handle: u.handle,
  rating: u.rating ?? null,
  maxRating: u.maxRating ?? null,
  rank: u.rank ?? null,
  maxRank: u.maxRank ?? null,
  titlePhoto: u.titlePhoto ?? null,
}));

// 每个号的 rating 曲线（全部抓，页面可以叠着画）
const primary = handles[0];
for (const h of cfHandles) {
  try {
    const rows = await getJson(`${CONTESTS_API}/user.rating?handle=${encodeURIComponent(h.handle)}`);
    h.ratingHistory = rows.map((r) => ({
      contestId: r.contestId,
      name: r.contestName,
      rating: r.newRating,
      delta: r.newRating - r.oldRating,
      at: new Date(r.ratingUpdateTimeSeconds * 1000).toISOString(),
    }));
    console.log(`  ${h.handle} rated 场次: ${h.ratingHistory.length}`);
  } catch (err) {
    h.ratingHistory = [];
    console.warn(`  ! 拉 ${h.handle} 的 rating 曲线失败：${err.message}（该号曲线留空，其余照写）`);
  }
}

// XCPC-VP-Tracker 的产物
let vpProgress = await readIfExists(path.join(trackerDir, 'cf-progress.json'));
let vpData = await readIfExists(path.join(trackerDir, 'vp-data.json'));
const trackerUsed = [];
if (vpProgress) trackerUsed.push('cf-progress.json');
if (vpData) trackerUsed.push('vp-data.json');
console.log(trackerUsed.length
  ? `XCPC-VP-Tracker: ${trackerUsed.join(' + ')}`
  : `XCPC-VP-Tracker: 没找到（找的是 ${trackerDir}），跳过`);

const cfStats = vpProgress?.summary
  ? {
      submissions: vpProgress.summary.submissions ?? null,
      contestsSeen: vpProgress.summary.contests ?? null,
      byStatus: vpProgress.summary.byStatus ?? null,
      generatedAt: vpProgress.generatedAt ?? null,
    }
  : null;

const xcpc = vpData?.meta
  ? {
      contests: vpData.meta.contestCount ?? null,
      regional: vpData.meta.regionalCount ?? null,
      online: vpData.meta.onlineCount ?? null,
      problems: vpData.meta.totalProblems ?? null,
      solved: vpData.meta.totalSolved ?? null,
      withSolutions: vpData.meta.withSolutions ?? null,
      generatedAt: vpData.meta.generatedAt ?? null,
    }
  : null;

const payload = {
  _comment: '自动生成，别手改。改数据源或改 tools/sync.mjs，然后 npm run sync。',
  syncedAt: new Date().toISOString(),
  sources: [
    `${CONTESTS_API}/user.info`,
    `${CONTESTS_API}/user.rating`,
    ...trackerUsed.map((f) => `${path.basename(trackerDir)}/${f}`),
  ],
  codeforces: {
    primary,
    handles: cfHandles,
    // 全号加起来打过多少场 rated
    ratedContests: cfHandles.reduce((n, h) => n + (h.ratingHistory?.length ?? 0), 0) || null,
    // 历史最高，用于首屏「最高 rating」统计卡
    peak: cfHandles.reduce(
      (best, h) => (h.maxRating && (!best || h.maxRating > best.maxRating) ? { handle: h.handle, maxRating: h.maxRating, maxRank: h.maxRank } : best),
      null,
    ),
    stats: cfStats,
  },
  xcpc,
};

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');

const p = cfHandles.find((h) => h.handle === primary) ?? cfHandles[0];
console.log(`写入 data/cf.json`);
for (const h of cfHandles) {
  console.log(`  ${h.handle}: ${h.rating} (max ${h.maxRating}, ${h.rank}) · rated ${h.ratingHistory?.length ?? 0} 场`);
}
if (payload.codeforces.peak) {
  const k = payload.codeforces.peak;
  console.log(`  历史最高: ${k.maxRating} (${k.maxRank}) by ${k.handle}`);
}
if (cfStats) console.log(`  CF 提交 ${Object.values(cfStats.submissions ?? {}).reduce((a, b) => a + b, 0)} 条 / ${cfStats.contestsSeen} 场`);
if (xcpc) console.log(`  XCPC ${xcpc.contests} 赛站 / ${xcpc.problems} 题 / 已过 ${xcpc.solved}`);
