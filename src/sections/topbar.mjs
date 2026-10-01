/* sections/topbar.mjs — 固定顶部导航
   极简：编号菜单靠左 + 年份与菜单按钮靠右。
   刻意不放 logo / 昵称 —— 单页作品集里那只是把名字说了第二遍，
   页脚与联系区已经各有一处。 */

import { esc } from "../lib/html.mjs";

export const topbar = ({ profile, year }) => {
  const links = (profile.nav ?? [])
    .map((n, i) => `<a href="#${esc(n.id)}"><span class="idx">${String(i + 1).padStart(2, "0")}</span>${esc(n.label)}</a>`)
    .join("");

  return `
<div class="scroll-progress" aria-hidden="true"></div>
<header class="topbar">
  <div class="wrap topbar-inner">
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
