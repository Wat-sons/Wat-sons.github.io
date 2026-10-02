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
      <!-- 语言切换：只切「内容层」，品牌层的导航 / 区块标题 / 阶段标签两边都不变。
           中 / EN 各自是个独立按钮（不是一个开关），因为将来可能加更多语言。 -->
      <div class="lang" role="group" aria-label="Language">
        <button type="button" class="lang-btn is-on" data-lang-btn="zh" lang="zh" aria-pressed="true">中</button>
        <span class="lang-sep" aria-hidden="true">/</span>
        <button type="button" class="lang-btn" data-lang-btn="en" lang="en" aria-pressed="false">EN</button>
      </div>
      <span class="year-tag">[${esc(year)}]</span>
      <button class="theme-toggle" type="button" data-theme-toggle aria-pressed="false" aria-label="切换到亮色主题">
        <!-- 图标显示的是「点了会切到哪一边」：暗色下显示太阳，亮色下显示月亮 -->
        <svg class="ti ti-sun" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor"
             stroke-width="1.4" stroke-linecap="round">
          <circle cx="8" cy="8" r="3.1"/>
          <path d="M8 1.2v1.8M8 13v1.8M1.2 8h1.8M13 8h1.8M3.2 3.2l1.3 1.3M11.5 11.5l1.3 1.3M12.8 3.2l-1.3 1.3M4.5 11.5l-1.3 1.3"/>
        </svg>
        <svg class="ti ti-moon" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor"
             stroke-width="1.4" stroke-linejoin="round">
          <path d="M13.2 9.7A5.6 5.6 0 0 1 6.3 2.8a5.6 5.6 0 1 0 6.9 6.9Z"/>
        </svg>
      </button>
      <button class="nav-toggle" type="button" aria-label="打开导航" aria-expanded="false" aria-controls="nav">
        <span></span><span></span>
      </button>
    </div>
  </div>
</header>`;
};
