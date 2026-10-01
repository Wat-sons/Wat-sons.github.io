/* sections/topbar.mjs — 固定顶部导航
   极简：品牌 + 编号菜单 + 年份。移动端收成右侧抽屉。 */

import { esc } from "../lib/html.mjs";

export const topbar = ({ profile, year }) => {
  const links = (profile.nav ?? [])
    .map((n, i) => `<a href="#${esc(n.id)}"><span class="idx">${String(i + 1).padStart(2, "0")}</span>${esc(n.label)}</a>`)
    .join("");

  return `
<div class="scroll-progress" aria-hidden="true"></div>
<header class="topbar">
  <div class="wrap topbar-inner">
    <a class="brand" href="#top">
      <span class="brand-mark" aria-hidden="true">q</span>
      <span>${esc(profile.handle)}</span>
    </a>
    <nav class="nav" id="nav" aria-label="章节导航">${links}</nav>
    <div class="topbar-tail">
      <span class="year-tag">[${esc(year)}]</span>
      <button class="nav-toggle" type="button" aria-label="打开导航" aria-expanded="false" aria-controls="nav">
        <span></span><span></span>
      </button>
    </div>
  </div>
</header>`;
};
