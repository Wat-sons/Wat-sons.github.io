/* sections/topbar.mjs — 固定顶部导航

   左上：二次元头像 + quchen
     —— 头像是全站**唯一**的彩色个人元素，代表「这是我」。
        刻意不加边框 / 发光 / 阴影 / 装饰框（需求 §3）：它已经足够抢眼，
        再加壳子就从"签名"变成了"装饰"。
   右侧：年份 + 菜单按钮。

   中/EN 语言切换暂未加入：它需要 137 条字符串的英文版（其中 66 条是竞赛奖项，
   而部分赛事没有可靠的官方英文名）。发一个点不动的开关比没有更糟，
   所以等英文文案落实后再一起上。

   和品牌标识（Q + Path）的分工见 src/lib/brand.mjs：
   头像 = Personal Identity，Q+Path = Technical Identity，两者不共用同一张图。 */

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
      <img class="brand-avatar" src="assets/avatar/avatar-navbar.webp" alt="quchen"
           width="32" height="32" decoding="async">
      <span class="brand-name">${esc(profile.handle)}</span>
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
