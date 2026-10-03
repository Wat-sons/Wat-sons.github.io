/**
 * 浏览器级回归验证（CDP）。检查静态自检查不出来的东西：
 *   1. 四档断点无横向溢出、零位图、入场动画能收尾、锚点齐全
 *   2. 公开页面与公开 JSON 里搜不到真名 / 学号 / 手机号 / 已下线内容
 *   3. 禁用 JS 时正文仍然可见（渐进增强是否真的生效）
 *   4. @media print 下导航/幽灵字隐藏、背景转白、内容不再被隐藏
 *   5. dist/ 的单文件版能离线（file://）正常打开
 *
 * 前置：node tools/serve.mjs（默认 5174）、npm run build、npm run single
 * 用法：node tools/verify.mjs
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
const CDP_PORT = 9377;
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
// 页面里抛错时 CDP 不会 reject，只是没有 result —— 静默变成 undefined，
// 后面 JSON.parse 报一句莫名其妙的 "undefined is not valid JSON"。
// 这里把真实异常打出来，省掉一次瞎猜。
const evalJs = async (expr) => {
  const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  const ex = res?.exceptionDetails;
  if (ex) {
    const d = ex.exception?.description || ex.text || JSON.stringify(ex).slice(0, 200);
    console.log('  ! 页面表达式抛错:', String(d).split('\n')[0].slice(0, 220));
  }
  return res?.result?.value;
};

async function load(url, { scroll = true } = {}) {
  const p = once('Page.loadEventFired');
  await send('Page.navigate', { url });
  await p;
  await sleep(1200);
  // 等 Preloader 收尾再往下走 —— 它跑完之前量到的是加载动画期间的布局，
  // 会得到一堆假阳性（首屏被 visibility:hidden 藏起来等）。
  // 正常 ~2.4s 结束；这里最多等 5s，超时也继续，由下面的断言去报错。
  let booted = false;
  for (let i = 0; i < 50; i++) {
    const st = await send('Runtime.evaluate', {
      expression: `!document.documentElement.classList.contains('is-booting')`,
      returnByValue: true,
    });
    if (st?.result?.value) { booted = true; break; }
    await sleep(100);
  }
  if (!booted) console.log('  ! Preloader 未在 5s 内收尾');
  if (scroll) {
    await send('Runtime.evaluate', {
      expression: `(async () => {
        const prev = document.documentElement.style.scrollBehavior;
        document.documentElement.style.scrollBehavior = "auto";
        const step = Math.round(innerHeight * 0.8);
        for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
          scrollTo(0, y); await new Promise(r => setTimeout(r, 70));
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
  await sleep(700);
}

const results = [];
/** "HH:MM:SS" → 秒，用于把上线计时换算成单一数值再比 */
const hms2s = (s) => { const [a, b, c] = s.split(':').map(Number); return a * 3600 + b * 60 + c; };
const check = (name, pass, detail = '') => results.push({ name, pass, detail });

await send('Page.enable');

/* ---------- 1. 四档断点 ---------- */
const VIEWPORTS = [
  { w: 1440, h: 900, label: 'Desktop 1440', dpr: 1, mobile: false },
  { w: 1280, h: 800, label: 'Laptop 1280', dpr: 1, mobile: false },
  { w: 768, h: 1024, label: 'Tablet 768', dpr: 1, mobile: false },
  { w: 390, h: 844, label: 'Mobile 390', dpr: 2, mobile: true },
];
for (const vp of VIEWPORTS) {
  await send('Emulation.setDeviceMetricsOverride',
    { width: vp.w, height: vp.h, deviceScaleFactor: vp.dpr, mobile: vp.mobile });
  await load(`${BASE}/index.html`, { scroll: false });
  const r = JSON.parse(await evalJs(`JSON.stringify({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
    overflow: [...document.querySelectorAll('body *')]
      .filter(n => { const cs = getComputedStyle(n);
        if (cs.position === 'fixed' || cs.visibility === 'hidden' || cs.display === 'none') return false;
        if (n.closest('.section-ghost')) return false;   // 幽灵字故意出血
        // 被 overflow:hidden/clip 的祖先裁掉的元素不可能造成文档横向滚动
        // （首屏那个出血的插画就属于这种），不该算溢出
        for (let p = n.parentElement; p && p !== document.body; p = p.parentElement) {
          const ox = getComputedStyle(p).overflowX;
          if (ox === 'hidden' || ox === 'clip') return false;
        }
        const b = n.getBoundingClientRect();
        return b.width > 0 && b.right > document.documentElement.clientWidth + 2; })
      .slice(0, 4).map(n => n.tagName + '.' + String(n.className).slice(0, 30))
  })`));
  check(`${vp.label} 无横向溢出`, r.sw === r.cw && r.overflow.length === 0,
    r.sw === r.cw ? 'ok' : `${r.sw}/${r.cw} ${r.overflow.join(', ')}`);

  // 幽灵标题必须在视口内**完整**显示。
  // 基准值在手机上被 clamp 下限顶住，字宽不随视口缩小，
  // 某个词一旦比视口宽就会两侧各被裁掉一截 —— 看起来像"只显示了一半"。
  const g = JSON.parse(await evalJs(`JSON.stringify(
    [...document.querySelectorAll('.section-ghost .ghost')].map(el => {
      const r = document.createRange(); r.selectNodeContents(el);
      const b = r.getBoundingClientRect();
      return { t: el.textContent.trim().slice(0, 14), left: Math.round(b.left), right: Math.round(b.right) };
    }))`));
  const vw = await evalJs('document.documentElement.clientWidth');
  const cut = g.filter((x) => x.left < -1 || x.right > vw + 1);
  check(`${vp.label} 幽灵标题完整显示`, cut.length === 0,
    cut.length ? cut.map((x) => `${x.t}(${x.left}..${x.right}/${vw})`).join(' ') : `${g.length} 个都在视口内`);

  // 移动端抽屉必须在**滚到中部之后**依然铺满视口。
  // 曾经的 bug：.topbar.is-stuck 上的 backdrop-filter 会成为 position:fixed
  // 后代的包含块，抽屉的 inset:0 于是相对那条 75px 高的导航条解析，整个塌掉。
  // 在页面顶部测是好的，所以只有"滚下去再打开"才暴露。
  if (vp.w <= 900) {
    const d = JSON.parse(await evalJs(`(async () => {
      document.documentElement.style.scrollBehavior = 'auto';
      scrollTo(0, document.documentElement.scrollHeight * 0.45);
      await new Promise(r => setTimeout(r, 300));
      document.querySelector('.nav-toggle').click();
      await new Promise(r => setTimeout(r, 900));
      const nav = document.querySelector('.nav');
      const b = nav.getBoundingClientRect();
      const stuck = document.querySelector('.topbar').classList.contains('is-stuck');
      document.querySelector('.nav-toggle').click();
      await new Promise(r => setTimeout(r, 500));
      return JSON.stringify({ h: Math.round(b.height), w: Math.round(b.width), stuck,
                              vh: innerHeight, vw: innerWidth });
    })()`));
    check(`${vp.label} 滚到中部后抽屉仍铺满视口`,
      d.stuck && d.h >= d.vh - 1 && d.w >= d.vw - 1,
      `抽屉 ${d.w}×${d.h} / 视口 ${d.vw}×${d.vh} · is-stuck=${d.stuck}`);
  }
}

/* ---------- 2. 桌面端结构 ---------- */
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await load(`${BASE}/index.html`);

// Timeline 的路径是**滚动联动**的，必须在真的滚到那里之后再量 ——
// load() 里那轮滚动遍历最后回到了页面顶部，在顶部量只会得到"刚起笔"的状态。
await send('Runtime.evaluate', {
  expression: `(async () => {
    const tr = document.querySelector('[data-tl-track]');
    if (!tr) return;
    // 站点开了 scroll-behavior:smooth，会把这跳变成动画，量到的就是中间态
    document.documentElement.style.scrollBehavior = 'auto';
    const r = tr.getBoundingClientRect();
    // 滚到轨道底部 —— 路径要在这里刚好画满，最后一个节点（NEXT）才会亮
    scrollTo(0, scrollY + r.top + r.height);
    await new Promise((done) => setTimeout(done, 700));
    document.documentElement.style.scrollBehavior = '';
  })()`,
  awaitPromise: true,
});

let r = JSON.parse(await evalJs(`JSON.stringify({
  imgs: document.querySelectorAll('img').length,
  sceneBg: (() => { const el = document.querySelector('.hero-scenery');
    return el ? getComputedStyle(el).backgroundImage.slice(0, 200) : ''; })(),
  brandImgs: document.querySelectorAll('.brand-avatar').length,
  // data: URI 是内联的，不构成外部资源请求，也不算"公开仓库里的位图"
  abroadImgs: Array.prototype.filter.call(document.querySelectorAll('img'), function (i) { return !i.classList.contains('brand-avatar') && !/^data:/.test(i.getAttribute('src') || ''); }).length,
  inlineIcons: document.querySelectorAll('img[src^="data:image/png"]').length,
  themeBtn: document.querySelectorAll('[data-theme-toggle]').length,
themeAttr: document.documentElement.getAttribute('data-theme'),
  age: (() => { const el = document.querySelector('[data-site-age]');
    if (!el) return null;
    const v = el.querySelector('.age-value');
    return { since: el.getAttribute('data-since'),
             d: el.querySelector('[data-age-d]').textContent,
             u: el.querySelector('[data-age-ud]').textContent,
             hms: el.querySelector('[data-age-hms]').textContent,
             title: el.getAttribute('title'),
             tnum: /tabular-nums/.test(getComputedStyle(el.querySelector('[data-age-d]')).fontVariantNumeric) };
  })(),
  brandAlt: (document.querySelector('.brand-avatar') || {}).alt || '',
  brandName: !!document.querySelector('.brand-name'),
  langBtns: document.querySelectorAll('[data-lang]').length,
  footerMark: !!document.querySelector('.footer-mark svg'),
  favicons: document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').length,
  reveals: document.querySelectorAll('.reveal').length,
  notIn: document.querySelectorAll('.reveal:not(.is-in)').length,
  ready: !!window.__SITE_READY,
  skip: !!document.querySelector('.skip-link'),
  sections: document.querySelectorAll('main section').length,
  ghosts: document.querySelectorAll('.section-ghost .ghost').length,
  chartSvg: document.querySelectorAll('.work-media svg.chart').length,
  chartPaths: document.querySelectorAll('.work-media path.series').length,
  awards: document.querySelectorAll('.award-row').length,
  navLinks: document.querySelectorAll('.nav a').length,
  anchorsOk: [...document.querySelectorAll('.nav a')]
    .every(a => !!document.querySelector(a.getAttribute('href'))),
  hasDotMatrix: /1 DOT = 1 CONTEST/.test(document.body.innerHTML),
  hasPipeline: /BUILD PIPELINE/.test(document.body.innerHTML),
  textOnlyItems: document.querySelectorAll('.work-item.is-textonly').length,
  emptyMediaBoxes: [...document.querySelectorAll('.work-media')].filter(v => !v.firstElementChild).length,
  hasResearch: /科研方向|WHAT I'M EXPLORING/.test(document.body.innerHTML),
  tlHead: /PATH SO FAR/.test(document.body.innerHTML),
  tlD: (document.querySelector('.tl-path')?.getAttribute('d') || '').length,
  tlStops: document.querySelectorAll('[data-tl-stop]').length,
  tlReached: document.querySelectorAll('.tl-stop.is-reached').length,
  tlDash: getComputedStyle(document.querySelector('.tl-path')).strokeDasharray,
  tlNodeX: [...document.querySelectorAll('[data-tl-node]')]
    .map((n) => Math.round(n.getBoundingClientRect().left)),
  tlCta: document.querySelector('.tl-cta')?.classList.contains('is-in'),
  preloader: !!document.getElementById('preloader'),
  preBooted: !document.documentElement.classList.contains('is-booting'),
  preReady: document.documentElement.classList.contains('is-ready'),
  preParticles: document.querySelectorAll('.pl-particle').length,
  preObstacles: document.querySelectorAll('.pl-obstacles > *').length,
  prePath: !!document.querySelector('.pl-path'),
  heroVisible: getComputedStyle(document.querySelector('.hero')).visibility === 'visible',
  markOn: getComputedStyle(document.querySelector('.display .reveal-line:last-child .mark'), '::after').transform
})`));
check('无外部位图（插画走 CSS 背景，图标是内联 data URI）',
  r.brandImgs === 1 && r.abroadImgs === 0 && r.inlineIcons === 2 && /scenery\/orbit/.test(r.sceneBg),
  `头像 ${r.brandImgs} · 内联图标 ${r.inlineIcons} · 外部位图 ${r.abroadImgs} · 插画背景=${/scenery/.test(r.sceneBg) ? 'ok' : r.sceneBg}`);
check('主题切换按钮存在且有初始主题', r.themeBtn === 1 && (r.themeAttr === 'dark' || r.themeAttr === 'light'),
  `按钮 ${r.themeBtn} 个 · data-theme=${r.themeAttr}`);

/* ---------- QUCHEN 标识系统 ---------- */
check('导航左上角是头像 + quchen（alt 可读）',
  r.brandImgs === 1 && r.brandName && r.brandAlt === 'quchen',
  `头像 ${r.brandImgs} · 名字 ${r.brandName} · alt="${r.brandAlt}"`);
// 语言切换（中 / EN）等英文文案落实后再上；届时在这里补 langBtns === 2 的断言。
check('favicon 三件套 + Apple Touch Icon 都已声明', r.favicons === 4, `${r.favicons} 条 link`);
check('页脚有 Q+Path 标识', r.footerMark === true);

/* ---------- 中英文切换 ---------- */
{
  const en = JSON.parse(await evalJs(`(async () => {
    document.querySelector('[data-lang-btn="en"]').click();
    await new Promise(r => setTimeout(r, 700));
    const q = (s) => (document.querySelector(s) || {}).textContent || '';
    return JSON.stringify({
      attr: document.documentElement.getAttribute('data-lang'),
      htmlLang: document.documentElement.lang,
      lead: q('.hero .lead'),
      statLabel: q('.stat-label'),
      nav: q('.nav a'), ghost: q('.section-ghost .ghost'),
      theme: document.documentElement.getAttribute('data-theme'),
    });
  })()`));

  // 品牌层：这些必须在英文模式下**一模一样**。它们压根没有 data-en，
  // 所以切不到 —— 这条断言守的就是"结构上切不到"，不是靠自觉。
  check('品牌层保持英文（导航 / 幽灵标题）',
    /WORK|Work/.test(en.nav) && en.ghost === 'WORK', `nav="${en.nav.trim()}" ghost="${en.ghost}"`);
  // 内容层：必须真的换了
  check('内容层随语言切换（Hero 介绍 / 成绩说明）',
    !/[\u4e00-\u9fff]/.test(en.lead) && !/[\u4e00-\u9fff]/.test(en.statLabel),
    `lead="${en.lead.slice(0, 40)}…" label="${en.statLabel}"`);
  check('切换语言不影响主题', en.theme === r.themeAttr, `主题 ${en.theme}（切换前 ${r.themeAttr}）`);
  check('切换语言不改 <html lang>',
    en.htmlLang === 'en', `lang="${en.htmlLang}"`);

  // 回到中文，别把后面的断言带偏
  await evalJs(`document.querySelector('[data-lang-btn="zh"]').click()`);
  await new Promise((res) => setTimeout(res, 400));
}
/* ---------- 上线计时 ---------- */
check('页脚有上线计时，基准来自 data-since 而非写死数字', r.age && /^\d{4}-\d{2}-\d{2}T/.test(r.age.since), r.age ? `since=${r.age.since}` : '缺失');
if (r.age) {
  const expect = (() => {
    const tt = Math.floor((Date.now() - Date.parse(r.age.since)) / 1000);
    const p = (n) => (n < 10 ? '0' + n : '' + n);
    return `${Math.floor(tt / 86400)}|${p(Math.floor((tt % 86400) / 3600))}:${p(Math.floor((tt % 3600) / 60))}:${p(tt % 60)}`;
  })();
  const got = `${r.age.d.replace(/,/g, '')}|${r.age.hms}`;
  // 允许 2 秒误差（量的时候秒针刚好跳过）
  const [ed, eh] = expect.split('|'); const [gd, gh] = got.split('|');
  const near = Math.abs(Number(ed) * 86400 + hms2s(eh) - (Number(gd) * 86400 + hms2s(gh))) <= 2;
  check('计时值与真实时间一致（±2s）', near, `页面 ${r.age.d}${r.age.u} ${r.age.hms} · 期望 ${ed}天 ${eh}`);
  check('数字用等宽 tabular-nums（每秒刷新不抖）', r.age.tnum === true, `font-variant-numeric=${r.age.tnum}`);
  check('计时块声明了「非服务器在线时长」', /不代表服务器在线时长|不代表.*在线/.test(r.age.title || ''), r.age.title || '');
}
check('入场动画全部收尾', r.notIn === 0, `${r.reveals} 个 reveal，未进场 ${r.notIn}`);
check('app.js 正常收尾', r.ready === true);
check('有无障碍跳转链接', r.skip === true);
check('6 个 section（含 Hero）+ 5 条导航且锚点齐全',
  r.sections === 6 && r.navLinks === 5 && r.anchorsOk,
  `sections=${r.sections} nav=${r.navLinks} anchors=${r.anchorsOk}`);
check('幽灵区块标题已渲染', r.ghosts === 5, `${r.ghosts} 个`);
check('rating 曲线挂在项目卡内、含两条真实序列', r.chartSvg === 1 && r.chartPaths === 2,
  `svg=${r.chartSvg} series=${r.chartPaths}`);
check('已移除参与记录点阵', r.hasDotMatrix === false);
check('已移除构建流水线图', r.hasPipeline === false);
check('无视觉素材的项目退成通栏文字', r.textOnlyItems === 1, `${r.textOnlyItems} 个`);
check('没有空图位', r.emptyMediaBoxes === 0, `${r.emptyMediaBoxes} 个空框`);
check('已下线科研方向区块', r.hasResearch === false);

/* ---------- Timeline — PATH SO FAR ---------- */
check('标题为 PATH SO FAR', r.tlHead === true);
check('路径已由节点位置生成（d 非空 + dash 已量出）',
  r.tlD > 60 && r.tlDash !== '0px', `d=${r.tlD} 字符 · dasharray=${r.tlDash}`);
check('4 个路径节点（2024 / 2025 / 2026 / NEXT）', r.tlStops === 4, `${r.tlStops} 个`);
check('节点左右交错（不是居中竖线）',
  new Set(r.tlNodeX).size >= 2, `节点 x: ${r.tlNodeX.join(', ')}`);
check('滚到底后所有节点都被路径点亮 + 收尾文案出现',
  r.tlReached === 4 && r.tlCta === true, `点亮 ${r.tlReached}/4 · cta=${r.tlCta}`);

/* ---------- Preloader ---------- */
check('Preloader 标记完整（粒子层 / 障碍物 / 路径）',
  r.preloader && r.preObstacles === 4 && r.prePath,
  `容器=${r.preloader} 障碍物=${r.preObstacles} 路径=${r.prePath}`);
check('Preloader 已收尾且不残留加载锁',
  r.preBooted === true && r.preReady === true,
  `booting 已解除=${r.preBooted} is-ready=${r.preReady}`);
check('Preloader 结束后 Hero 恢复可见', r.heroVisible === true);
check('Hero 下划线已接上（scaleX 满格，不是 0）',
  !/matrix\(0,/.test(String(r.markOn)), String(r.markOn).slice(0, 40));
check('奖项行已渲染', r.awards >= 20, `${r.awards} 行`);

/* ---------- 3. 隐私：页面 + 公开 JSON ---------- */
const bodyText = await evalJs('document.documentElement.outerHTML');
const OFFLINE = [
  ['林' + '挺', '真名'],
  ['Lin' + ' Ting', '真名拼音'],
  ['2024' + '002391', '学号'],
  ['1815' + '0032643', '手机号'],
  ['86' + '.43', '加权成绩'],
  ['24 / 1' + '40', '专业排名'],
  ['相关' + '课程', '课程列表'],
  ['XCP' + 'C', '训练记录'],
  ['VP 打' + '卡台', 'VP 打卡台'],
  ['ccpc' + '-neo-vp', '非本人项目'],
  ['assets/' + 'certs', '证书图片目录'],
];
for (const [needle, label] of OFFLINE) {
  check(`页面不含 ${label}`, !bodyText.includes(needle));
}
check('页面无未获准的本地位图引用',
  !/src="(?![^"]*assets\/(?:scenery\/orbit|avatar\/avatar-navbar)\.webp)[^"]*\.(png|jpe?g|webp)"/i.test(bodyText),
  '只允许 scenery/orbit.webp 与 avatar/avatar-navbar.webp');

const DATA_FILES = ['src/data/profile.json', 'src/data/metrics.json', 'src/data/projects.json',
                    'src/data/research.json', 'src/data/competitions.json',
                    'src/data/contests.json', 'src/data/cf.json'];
for (const f of DATA_FILES) {
  const res = await fetch(`${BASE}/${f}`);
  if (!res.ok) { check(`${f} 可访问`, false, `HTTP ${res.status}`); continue; }
  const txt = await res.text();
  const hit = OFFLINE.filter(([n]) => txt.includes(n)).map(([, l]) => l);
  check(`${f} 不含隐私内容`, hit.length === 0, hit.join(', '));
}
const cfJson = await (await fetch(`${BASE}/src/data/cf.json`)).json();
check('cf.json 无 xcpc 字段', !('xcpc' in cfJson));

/* ---------- 4. 禁用 JS ---------- */
await send('Emulation.setScriptExecutionDisabled', { value: true });
await load(`${BASE}/index.html`, { scroll: false });
r = JSON.parse(await evalJs(`JSON.stringify({
  revealOpacity: getComputedStyle(document.querySelector('.reveal')).opacity,
  awardVisible: getComputedStyle(document.querySelector('.award-row')).opacity,
  heroVisible: getComputedStyle(document.querySelector('h1')).opacity
})`));
await send("Emulation.setScriptExecutionDisabled", { value: false });
check('禁用 JS 时项目卡可见', r.awardVisible === '1', `opacity=${r.awardVisible}`);
check('禁用 JS 时标题可见', r.heroVisible === '1', `opacity=${r.heroVisible}`);

/* ---------- 5. 打印模式 ---------- */
await send('Emulation.setEmulatedMedia', { media: 'print' });
await load(`${BASE}/index.html`, { scroll: false });
r = JSON.parse(await evalJs(`JSON.stringify({
  bodyBg: getComputedStyle(document.body).backgroundColor,
  topbar: getComputedStyle(document.querySelector('.topbar')).display,
  ghost: getComputedStyle(document.querySelector('.section-ghost')).display,
  skip: getComputedStyle(document.querySelector('.skip-link')).display,
  certItems: getComputedStyle(document.querySelector('.tl-items') ?? document.body).color,
  reveal: getComputedStyle(document.querySelector('.reveal')).opacity
})`));
await send('Emulation.setEmulatedMedia', { media: '' });
check('打印时背景转白', /255,\s*255,\s*255/.test(r.bodyBg), r.bodyBg);
check('打印时隐藏导航', r.topbar === 'none', r.topbar);
check('打印时隐藏幽灵标题', r.ghost === 'none', r.ghost);
check('打印时隐藏跳转链接', r.skip === 'none', r.skip);
check('打印时内容不再被隐藏', r.reveal === '1', `opacity=${r.reveal}`);

/* ---------- 6. 单文件离线版 ---------- */
if (existsSync(SINGLE)) {
  await load(pathToFileURL(SINGLE).href);
  r = JSON.parse(await evalJs(`JSON.stringify({
    title: document.title,
    fontLoaded: document.fonts.check('700 48px "Space Grotesk Variable"'),
    styled: getComputedStyle(document.querySelector('.stat-num')).color,
    awards: document.querySelectorAll('.award-row').length,
    chart: document.querySelectorAll('.work-media path.series').length,
    notIn: document.querySelectorAll('.reveal:not(.is-in)').length
  })`));
  check('单文件版可离线打开', /quchen/.test(r.title), r.title);
  check('单文件版内嵌字体已生效', r.fontLoaded === true, `fontLoaded=${r.fontLoaded}`);
  check('单文件版样式已内联', /216,\s*255,\s*74/.test(r.styled), r.styled);
  check('单文件版内容完整', r.awards >= 20 && r.chart === 2, `${r.awards} 行 / ${r.chart} 序列`);
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
