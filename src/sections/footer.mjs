/* sections/footer.mjs — 页脚：标识 + 一行版权 + 一句签名 + 回到顶部 */

import { esc } from "../lib/html.mjs";
import { markSvg } from "../lib/brand.mjs";

const UP = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
  stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M7 12V2M3 6l4-4 4 4"/></svg>`;

export const footer = ({ profile, year, accent }) => `
<footer class="footer">
  <div class="wrap footer-inner">
    <div class="footer-brand">
      <!-- Q + Path 标识在页脚再出现一次：整页形成
           「头像（这是我）→ 内容 → 标识（我的品牌）」的收束 -->
      <span class="footer-mark">${markSvg({ accent, ink: "currentColor", size: 44 })}</span>
      <div class="footer-line">
        © ${esc(year)} <b>${esc(profile.handle)}</b> · ${esc(profile.footer?.line1 ?? "")}<br>
        ${esc(profile.footer?.line2 ?? "")}
      </div>
    </div>
    <a class="to-top" href="#top">Back to top ${UP}</a>
  </div>
</footer>`;
