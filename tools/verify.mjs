/**
 * 浏览器级回归验证（CDP）。检查那些静态自检查不出来的东西：
 *   1. 页面无横向溢出、零位图、入场动画能收尾
 *   2. 公开页面里搜不到真名 / 学号 / 手机号
 *   3. 禁用 JS 时正文仍然可见（渐进增强是否真的生效）
 *   4. @media print 下导航/按钮隐藏、背景转白、长表格能铺开
 *   5. dist/ 里的单文件版能离线（file://）正常打开
 *
 * 前置：先 `node tools/serve.mjs`（默认 5174）与 `npm run build`、`npm run single`。
 * 用法：node tools/verify.mjs [--port 5174]
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const argv = process.argv.slice(2);
const pFlag = argv.indexOf('--port');
const PORT = pFlag >= 0 ? Number(argv[pFlag + 1]) : 5174;
const CDP_PORT = 9366;
const BASE = `http://127.0.0.1:${PORT}`;
const SINGLE = join(ROOT, 'dist', 'quchen-homepage.html');

const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find(existsSync);
if (!CHROME) { console.error('找不到 Chrome / Edge'); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run',
  `--remote-debugging-port=${CDP_PORT}`, 'about:blank'], { stdio: 'ignore' });

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(250);
  try {
    target = (await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()).find((t) => t.type === 'page');
  } catch { /* 等 Chrome 起来 */ }
}
if (!target) { chrome.kill(); console.error('连不上调试端口'); process.exit(1); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pending = new Map(); const events = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method && events.has(m.method)) { events.get(m.method)(); events.delete(m.method); }
};
const send = (method, params = {}) => new Promise((r) => {
  const i = ++id; pending.set(i, (m) => r(m.result ?? m.error)); ws.send(JSON.stringify({ id: i, method, params }));
});
const once = (m) => new Promise((r) => events.set(m, r));
const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;

async function load(url, { scroll = true } = {}) {
  const p = once('Page.loadEventFired');
  await send('Page.navigate', { url });
  await p;
  await sleep(1200);
  if (scroll) {
    await send('Runtime.evaluate', {
      expression: `(async () => {
        const prev = document.documentElement.style.scrollBehavior;
        document.documentElement.style.scrollBehavior = "auto";
        const step = Math.round(innerHeight * 0.8);
        for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
          scrollTo(0, y); await new Promise(r => setTimeout(r, 80));
        }
        scrollTo(0, document.documentElement.scrollHeight);
        await new Promise(r => setTimeout(r, 300));
        scrollTo(0, 0);
        document.documentElement.style.scrollBehavior = prev;
        await new Promise(r => setTimeout(r, 300));
      })()`,
      awaitPromise: true,
    });
  }
  await sleep(600);
}

const results = [];
const check = (name, pass, detail = '') => results.push({ name, pass, detail });

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

/* ---------- 1. 桌面端 ---------- */
await load(`${BASE}/index.html`);
let r = JSON.parse(await evalJs(`JSON.stringify({
  sw: document.documentElement.scrollWidth,
  cw: document.documentElement.clientWidth,
  imgs: document.querySelectorAll('img').length,
  reveals: document.querySelectorAll('.reveal').length,
  notIn: document.querySelectorAll('.reveal:not(.in)').length,
  ready: !!window.__SITE_READY,
  skip: !!document.querySelector('.skip-link'),
  sections: document.querySelectorAll('main section').length,
  certs: document.querySelectorAll('.cert-item').length,
  awards: document.querySelectorAll('.award').length,
  idx: [...document.querySelectorAll('.sec-head h2')].map(h => h.dataset.idx)
})`));
check('无横向溢出', r.sw === r.cw, `scrollWidth=${r.sw} / clientWidth=${r.cw}`);
check('零位图', r.imgs === 0, `img=${r.imgs}`);
check('入场动画全部完成', r.notIn === 0, `${r.reveals} 个 reveal，未进场 ${r.notIn}`);
check('app.js 正常收尾', r.ready === true);
check('有无障碍跳转链接', r.skip === true);
check('章节编号连续且与章节数一致',
  Array.isArray(r.idx) && r.idx.length === r.sections &&
  r.idx.every((v, i) => v === '/' + String(i + 1).padStart(2, '0')),
  r.idx.join(','));
check('证书清单有内容', r.certs >= 20, `${r.certs} 条`);
check('奖项列表有内容', r.awards >= 20, `${r.awards} 条`);

/* ---------- 2. 页面文本隐私扫描 ---------- */
const bodyText = await evalJs('document.documentElement.outerHTML');
for (const [needle, label] of [['林' + '挺', '真名'], ['Lin' + ' Ting', '真名拼音'],
                               ['2024' + '002391', '学号'], ['1815' + '0032643', '手机号']]) {
  check(`页面不含${label}`, !bodyText.includes(needle));
}
check('页面无本地位图引用', !/src="[^"]*\.(png|jpe?g|webp)"/i.test(bodyText));

/* ---------- 3. 移动端 ---------- */
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await load(`${BASE}/index.html`);
r = JSON.parse(await evalJs(`JSON.stringify({
  sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth
})`));
check('移动端无横向溢出', r.sw === r.cw, `${r.sw} / ${r.cw}`);
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

/* ---------- 4. 禁用 JS ---------- */
await send('Emulation.setScriptExecutionDisabled', { value: true });
await load(`${BASE}/index.html`, { scroll: false });
r = JSON.parse(await evalJs(`JSON.stringify({
  cls: document.documentElement.className,
  revealOpacity: getComputedStyle(document.querySelector('.reveal')).opacity,
  awardVisible: getComputedStyle(document.querySelector('.award')).opacity
})`));
await send('Emulation.setScriptExecutionDisabled', { value: false });
check('禁用 JS 时正文可见', r.awardVisible === '1', `award opacity=${r.awardVisible}`);

/* ---------- 5. 打印模式 ---------- */
await send('Emulation.setEmulatedMedia', { media: 'print' });
await load(`${BASE}/index.html`, { scroll: false });
r = JSON.parse(await evalJs(`JSON.stringify({
  bodyBg: getComputedStyle(document.body).backgroundColor,
  jump: getComputedStyle(document.querySelector('.jump')).display,
  links: getComputedStyle(document.querySelector('.links')).display,
  skip: getComputedStyle(document.querySelector('.skip-link')).display,
  reveal: getComputedStyle(document.querySelector('.reveal')).opacity,
  h1Color: getComputedStyle(document.querySelector('h1')).color
})`));
await send('Emulation.setEmulatedMedia', { media: '' });
check('打印时背景转白', /255,\s*255,\s*255/.test(r.bodyBg), r.bodyBg);
check('打印时隐藏章节导航', r.jump === 'none', r.jump);
check('打印时隐藏按钮区', r.links === 'none', r.links);
check('打印时隐藏跳转链接', r.skip === 'none', r.skip);
check('打印时内容不再隐藏', r.reveal === '1', `opacity=${r.reveal}`);

/* ---------- 6. 单文件离线版 ---------- */
if (existsSync(SINGLE)) {
  await load(pathToFileURL(SINGLE).href);
  r = JSON.parse(await evalJs(`JSON.stringify({
    title: document.title,
    styled: getComputedStyle(document.querySelector('.brand, .eyebrow')).borderTopWidth,
    certs: document.querySelectorAll('.cert-item').length,
    notIn: document.querySelectorAll('.reveal:not(.in)').length,
    cfData: !!document.getElementById('cf-data')
  })`));
  check('单文件版可离线打开', /quchen/.test(r.title), r.title);
  check('单文件版样式已内联', r.styled !== '0px', `border=${r.styled}`);
  check('单文件版内容完整', r.certs >= 20, `${r.certs} 条证书`);
  check('单文件版动画正常', r.notIn === 0, `未进场 ${r.notIn}`);
} else {
  check('单文件版存在', false, '先跑 npm run single');
}

/* ---------- 输出 ---------- */
console.log('');
let fail = 0;
for (const x of results) {
  console.log(`  ${x.pass ? '✅' : '❌'}  ${x.name}${x.detail ? '   (' + x.detail + ')' : ''}`);
  if (!x.pass) fail++;
}
console.log(`\n${results.length - fail}/${results.length} 通过`);

ws.close(); chrome.kill();
process.exit(fail ? 1 : 0);
