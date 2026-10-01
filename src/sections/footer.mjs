/* sections/footer.mjs — 页脚：一行版权 + 一句签名 + 回到顶部 */

import { esc } from "../lib/html.mjs";

const UP = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
  stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M7 12V2M3 6l4-4 4 4"/></svg>`;

export const footer = ({ profile, year }) => `
<footer class="footer">
  <div class="wrap footer-inner">
    <div class="footer-line">
      © ${esc(year)} <b>${esc(profile.handle)}</b> · ${esc(profile.footer?.line1 ?? "")}<br>
      ${esc(profile.footer?.line2 ?? "")}
    </div>
    <a class="to-top" href="#top">Back to top ${UP}</a>
  </div>
</footer>`;
