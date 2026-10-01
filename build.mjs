#!/usr/bin/env node
// data/*.json  ->  index.html
//
//   node build.mjs          # 生成 index.html
//
// 生成物是纯静态 HTML，GitHub Pages 直接托管，没有构建步骤。

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from './src/page.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));

async function load(name, { optional = false } = {}) {
  try {
    return JSON.parse(await readFile(path.join(root, 'data', name), 'utf8'));
  } catch (err) {
    if (optional) {
      console.warn(`  ! data/${name} 读不到（${err.code ?? err.message}），相关区块会留空`);
      return null;
    }
    console.error(`读 data/${name} 失败：${err.message}`);
    console.error('先跑 npm run sync 生成 data/cf.json。');
    process.exit(1);
  }
}

const profile = await load('profile.json');
const awards = await load('awards.json');
const contests = await load('contests.json');
const cf = await load('cf.json', { optional: true });

const html = render({ profile, awards, contests, cf });
const out = path.join(root, 'index.html');
await writeFile(out, html, 'utf8');

const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
console.log('生成 index.html');
console.log(`  ${kb} KB · ${awards.awards.length} 个奖项 · ${(profile.projects ?? []).length} 个项目`);
if (cf) {
  console.log(`  CF 数据同步于 ${cf.syncedAt.slice(0, 10)}，账号 ${cf.codeforces.handles.map((h) => h.handle).join(' / ')}`);
}
