/* ============================================================
   lib/icons.mjs — 链接图标

   站点是零外部依赖的，所以：
     · 能用矢量画的（邮箱 / GitHub / 网站 / 源码 / Codeforces）→ 内联 SVG
     · 官方彩色 logo（牛客 / 博客园）→ base64 内嵌 PNG
       （外链图片会被隐私闸门拦，而且站点本来就不引第三方资源）

   彩色 logo 的图由 build.mjs 读文件后注入 —— 模块里不留文件路径。
   ============================================================ */

import { esc } from "./html.mjs";

/** build 期注入的 base64 图（key → data URI） */
const ASSETS = {};
export const setIconAssets = (a) => Object.assign(ASSETS, a);

const svg = (body, size = 14) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;

/* Codeforces：三条**异色**（黄/蓝/红，罗马尼亚国旗）。
   色值实测自 https://codeforces.com/images/codeforces-mark.png。
   官网原色里黄在浅底只有 1.34:1、红在深底只有 2.55:1，
   所以按主题各替换一条 —— 由 CSS 变量 --cf-1/2/3 给色。 */
const CF_BARS = svg(
  `<rect x="0" y="7.5" width="6" height="13.5" rx="1" fill="var(--cf-1)"/>` +
  `<rect x="9" y="3" width="6" height="18" rx="1" fill="var(--cf-2)"/>` +
  `<rect x="18" y="10.5" width="6" height="10.5" rx="1" fill="var(--cf-3)"/>`
);

const GLYPHS = {
  // 信封
  email: svg(
    `<rect x="2.5" y="5" width="19" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/>` +
      `<path d="M3.5 7 12 13.2 20.5 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`
  ),
  // GitHub 官方图形（simple-icons 路径，单色 currentColor）
  github: svg(
    `<path fill="currentColor" d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6.1-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.3 2.8.1 3.2.8.8 1.3 1.9 1.3 3.1 0 4.7-2.9 5.7-5.6 6 .4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"/>`
  ),
  // 地球（个人网站）
  site: svg(
    `<circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="1.8"/>` +
      `<ellipse cx="12" cy="12" rx="3.8" ry="8.6" fill="none" stroke="currentColor" stroke-width="1.8"/>` +
      `<path d="M3.4 12h17.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`
  ),
  // 尖括号（源码）
  code: svg(
    `<path d="M8.5 7 3.8 12l4.7 5M15.5 7l4.7 5-4.7 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`
  ),
};

/** 按名字取图标 HTML。未知名字返回空串 —— 调用方不用判空。 */
export function icon(name) {
  if (!name) return "";
  if (name === "codeforces") return `<span class="ico ico-cf">${CF_BARS}</span>`;
  const uri = ASSETS[name];
  if (uri) {
    return `<span class="ico"><img src="${esc(uri)}" alt="" width="14" height="14" loading="lazy" decoding="async"></span>`;
  }
  const g = GLYPHS[name];
  return g ? `<span class="ico">${g}</span>` : "";
}
