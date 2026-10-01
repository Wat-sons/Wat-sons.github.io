/**
 * 把 index.html + assets/* 打包成**单个自包含 HTML 文件**。
 *
 * 为什么需要它：B 站评论区里被 20 赞顶起来的需求 ——
 *   「可以直接导出成一个 HTML 格式作为简历去呈现，而不部署上线吗？
 *     因为部署上线反而会存在国内打不开的情况」
 * GitHub Pages 在国内时快时慢，HR 也不一定愿意点链接。打成一个文件后：
 * 双击即看、可以当附件发邮件、也能挂到任何静态托管上。
 *
 * 用法：
 *   npm run single
 *   node tools/build-single.mjs --out dist/我的主页.html
 *
 * 先跑 `npm run build` 生成 index.html，再跑这个。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const argv = process.argv.slice(2);
const outArg = argv.indexOf('--out') >= 0 ? argv[argv.indexOf('--out') + 1] : null;
const OUT = resolve(outArg || join(ROOT, 'dist', 'quchen-homepage.html'));

const read = (p) => readFileSync(join(ROOT, p), 'utf8');
/** 内联进 <script>/<style> 时，必须打断可能提前闭合标签的序列 */
const safeForInline = (s) => s.replace(/<\/(script|style)/gi, '<\\/$1');

if (!existsSync(join(ROOT, 'index.html'))) {
  console.error('没有 index.html，先跑 `npm run build`。');
  process.exit(1);
}

let html = read('index.html');
const css = read('assets/style.css');
const appJs = read('assets/app.js');
const favicon = read('assets/favicon.svg');

// 1) 外链 CSS → 内联 <style>
if (!html.includes('<link rel="stylesheet" href="assets/style.css">')) {
  throw new Error('index.html 里找不到 assets/style.css 的引用，脚本需要同步更新');
}
html = html.replace(
  '<link rel="stylesheet" href="assets/style.css">',
  `<style>\n${safeForInline(css)}\n</style>`
);

// 2) favicon 外链 → data URI
html = html.replace(
  '<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">',
  `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,${Buffer.from(favicon, 'utf8').toString('base64')}">`
);

// 3) 外链脚本 → 内联。
//    注意这里**去掉 type="module"**：file:// 下模块会被 CORS 拦下来，
//    而 app.js 没有任何 import/export，当普通脚本跑完全一样。
if (!html.includes('<script src="assets/app.js"></script>')) {
  throw new Error('index.html 里找不到 assets/app.js 的引用，脚本需要同步更新');
}
html = html.replace(
  '<script src="assets/app.js"></script>',
  `<script>\n${safeForInline(appJs)}\n</script>`
);

// 4) 自检：不能残留任何本地外部请求
const leftovers = [...html.matchAll(/(?:src|href)="((?!data:|#|mailto:)[^"]+)"/g)]
  .map((m) => m[1])
  .filter((u) => !/^https?:\/\//.test(u));
if (leftovers.length) {
  throw new Error('单文件里仍有本地外部引用：' + leftovers.join(', '));
}
const external = [...html.matchAll(/"(https?:\/\/[^"]+)"/g)].length;
const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html, 'utf8');

console.log(`已生成单文件：${OUT}`);
console.log(`  体积          ${kb} KB`);
console.log(`  本地外部引用  ${leftovers.length} 个（应为 0）`);
console.log(`  外链跳转      ${external} 个（GitHub / 博客 / 邮箱这类，点出去才用网）`);
console.log('双击就能打开，也可以直接当附件发出去。');
