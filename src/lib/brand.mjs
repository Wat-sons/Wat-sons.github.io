/* ============================================================
   lib/brand.mjs — QUCHEN 标识系统

   三层身份，刻意不共用同一张图（需求 §2 / §11）：
     Avatar   → 这是我        （二次元头像，唯一的彩色个人元素）
     Logo     → 我的品牌      （Q + Path，抽象几何，承担技术身份）
     Favicon  → 我的网站      （同一套 mark，缩到 16px 仍要清楚）

   Q 的尾部不是普通的一撇，而是一小段**带节点的路径** ——
   和 Preloader 里「算法找路」是同一种语言：
   环形 = 起点与约束，路径 = 探索，末端圆点 = 找到的节点。

   颜色不写死：accent 由 build.mjs 从 tokens.css 里读出来注入，
   这样改令牌时标识会跟着变，不会两处各写一份。
   ============================================================ */

/** mark：只有 Q + Path，透明底。宽高比约 40:30。 */
export function markSvg({ accent = "#D8FF4A", ink = "currentColor", size = 40 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 30" width="${size}" height="${Math.round(size * 30 / 40)}" role="img" aria-label="quchen">
  <title>quchen</title>
  <!-- Q 的环：起点与约束 -->
  <circle cx="14.5" cy="14.5" r="10" fill="none" stroke="${ink}" stroke-width="4"/>
  <!-- 尾部 = 一小段路径，绕出去再收回来 -->
  <path d="M 21.6 21.6 C 25.4 25.4 28.8 24.6 32.6 22.2" fill="none"
        stroke="${accent}" stroke-width="4" stroke-linecap="round"/>
  <!-- 末端节点：和 Timeline / Preloader 里的 node 是同一个符号 -->
  <circle cx="34.6" cy="21.4" r="2.3" fill="${accent}"/>
</svg>
`;
}

/** logo：mark + 文字。文字用 <text>，在页面内联时会用到站点的字体。 */
export function logoSvg({ accent = "#D8FF4A", ink = "currentColor", wordmark = "quchen" } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 172 30" width="172" height="30" role="img" aria-label="quchen">
  <title>${wordmark}</title>
  <g>
    <circle cx="14.5" cy="14.5" r="10" fill="none" stroke="${ink}" stroke-width="4"/>
    <path d="M 21.6 21.6 C 25.4 25.4 28.8 24.6 32.6 22.2" fill="none"
          stroke="${accent}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="34.6" cy="21.4" r="2.3" fill="${accent}"/>
  </g>
  <text x="48" y="21.5" font-family="Space Grotesk, Inter, system-ui, -apple-system, 'Segoe UI', sans-serif"
        font-size="21" font-weight="500" letter-spacing="-0.5" fill="${ink}">${wordmark}</text>
</svg>
`;
}

/** favicon：圆角深底 + mark。16px 下要清楚，所以环更粗、路径更短。 */
export function faviconSvg({ accent = "#D8FF4A", bg = "#0B0B0C", ink = "#EDEAE3" } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" role="img" aria-label="quchen">
  <title>quchen</title>
  <rect width="32" height="32" rx="7" fill="${bg}"/>
  <circle cx="13.6" cy="13.6" r="7.1" fill="none" stroke="${ink}" stroke-width="3.2"/>
  <path d="M 19.3 19.3 C 22.2 22.2 24.4 21.8 26.4 20.4" fill="none"
        stroke="${accent}" stroke-width="3.2" stroke-linecap="round"/>
  <circle cx="27.4" cy="19.7" r="1.9" fill="${accent}"/>
</svg>
`;
}
