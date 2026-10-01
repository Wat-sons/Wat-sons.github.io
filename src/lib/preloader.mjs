/* ============================================================
   lib/preloader.mjs — Preloader：「An Algorithm Finding Its Way.」

   概念：算法在一个抽象空间里寻找路径 → 收敛 → PATH FOUND →
   那条路径变形成首页标题下的强调色横线，Loading 与 Hero 连成一体。
   让访客的感觉是「这个首页就是算法找到的结果」，而不是「加载完了」。

   刻意保留的克制：
     · 不出现任何算法名字、公式、参数 —— 懂的人看到
       「粒子探索 → 收敛 → 最优路径」自己会心一笑就够了
     · 不加第二种颜色，沿用全站唯一的 accent
     · 坐标空间用 0..100 的单位方格，所有几何都写在这套坐标里，好读好改
   ============================================================ */

import { esc } from "./html.mjs";

/* 起点、终点 ------------------------------------------------ */
export const START = [10, 88];
export const TARGET = [88, 12];

/* 障碍物：抽象的「几何约束」，不是游戏地图。
   只画形状，不写标签 —— 它们的作用是让最终路径必须绕，从而显出「有解」。
   形状与位置和下面那条路径是配套的（路径从它们之间穿过去），改一个就要改另一个。 */
const OBSTACLES = [
  `<circle cx="32" cy="64" r="10"/>`,
  `<rect x="49" y="33" width="18" height="18" rx="4"/>`,
  `<circle cx="76" cy="66" r="8"/>`,
  `<rect x="14" y="34" width="18" height="6" rx="3"/>`,
].join("");

/* 最终路径：手工设计的三次贝塞尔链。
   不是跑出来的 —— 这个动画是「视觉模拟算法行为」，不是科研演示。
   手工设计换来的是每次打开都好看、且必然避开上面那些障碍。
   形状：有轻微弯曲、平滑、有几何美感，不是一条直线。 */
const PATH_D = [
  "M 10 88",
  "C 20 86 26 80 34 78",
  "C 42 76 40 66 44 58",
  "C 48 50 42 44 46 34",
  "C 50 24 66 22 88 12",
].join(" ");

export const preloader = () => `
<div class="preloader" id="preloader" role="status" aria-live="polite" aria-label="正在为这个页面寻找路径">
  <div class="pl-inner">
    <p class="pl-word">${esc("QUCHEN")}</p>

    <div class="pl-stage">
      <svg class="pl-space" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <pattern id="pl-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 H 0 V 10" fill="none" stroke="var(--line)" stroke-width="0.16"/>
          </pattern>
        </defs>

        <rect class="pl-grid" x="0" y="0" width="100" height="100" fill="url(#pl-grid)"/>

        <g class="pl-obstacles">${OBSTACLES}</g>

        <path class="pl-path" d="${PATH_D}"/>

        <g class="pl-node pl-node-start">
          <circle cx="${START[0]}" cy="${START[1]}" r="2.2"/>
        </g>
        <g class="pl-node pl-node-target">
          <circle class="pl-ring" cx="${TARGET[0]}" cy="${TARGET[1]}" r="2.2"/>
          <circle class="pl-halo" cx="${TARGET[0]}" cy="${TARGET[1]}" r="2.2"/>
        </g>

        <!-- 粒子层：由 main.js 注入并逐帧更新 -->
        <g class="pl-swarm"></g>

        <text class="pl-tag" x="${START[0]}" y="${START[1] + 7.5}" text-anchor="start">START</text>
        <text class="pl-tag" x="${TARGET[0]}" y="${TARGET[1] - 5.5}" text-anchor="end">TARGET</text>
      </svg>

      <p class="pl-verdict"><b>PATH FOUND</b><i>OPTIMAL PATH</i></p>
      <p class="pl-egg" lang="ja">見つけた。</p>
      <p class="pl-status" data-pl-status>INITIALIZING ALGORITHM</p>
    </div>
  </div>

  <!-- Loading 的最后一个动作：路径收敛成一条横线，
       并精确落到首页标题下划线的位置 —— 随后 Hero 的下划线从同一起点拉满，
       视觉上是「同一条线」，不是「切了个页」。坐标由 JS 量出来写进 CSS 变量。 -->
  <div class="pl-line" aria-hidden="true"></div>
</div>`;
