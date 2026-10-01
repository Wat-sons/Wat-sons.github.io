/* sections/hero.mjs — 首屏
   构图：右下角的夜景插画（全站唯一的二次元元素，约 5%）→ 顶部四角页眉 →
   大面积留白 → 巨型宣言 → 底部四数字（带竖分隔线）。
   宣言逐行升起用纯 CSS animation-delay，不依赖 JS。 */

import { esc } from "../lib/html.mjs";
import { rail } from "../components/rail.mjs";
import { statBlock } from "../components/stat-block.mjs";

export const hero = ({ profile, metrics }) => {
  const h = profile.hero;

  const lines = h.headline.map((line, i) => {
    const inner = i === h.markLine ? `<span class="mark">${esc(line)}</span>` : esc(line);
    return `<span class="reveal-line"><span>${inner}</span></span>`;
  }).join("");

  const stats = (metrics.hero ?? [])
    .map((s, i) => statBlock({ ...s, delay: i }))
    .join("");

  return `
<section id="top" class="hero">
  <div class="hero-scenery" aria-hidden="true">
    <img src="assets/scenery/orbit.webp" alt="" width="1920" height="1080" decoding="async" fetchpriority="high">
  </div>
  <div class="wrap">
    ${rail(h.railLeft, h.railRight)}

    <div class="hero-main">
      <span class="eyebrow hero-fade">${esc(h.eyebrow)}</span>
      <h1 class="display">${lines}</h1>
      <p class="lead hero-fade">${esc(h.lead)}</p>
    </div>

    <div class="hero-stats">${stats}</div>
  </div>
</section>`;
};
