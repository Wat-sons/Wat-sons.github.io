/* sections/footer.mjs — 页脚：标识 + 一行版权 + 一句签名 + 上线计时 + 回到顶部 */

import { esc } from "../lib/html.mjs";
import { markSvg } from "../lib/brand.mjs";
import { biTitle } from "../lib/i18n.mjs";

const UP = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
  stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M7 12V2M3 6l4-4 4 4"/></svg>`;

/* 轨道图标：一圈 + 一个节点，和品牌标识、Timeline 的 node 是同一种符号。
   只有那个节点在极慢地绕圈（12s 一圈），静止时也不突兀。 */
const ORBIT = `<svg class="age-orbit" viewBox="0 0 16 16" aria-hidden="true">
  <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.1" opacity=".45"/>
  <circle class="age-orbit-node" cx="8" cy="1.8" r="1.7" fill="var(--accent)"/>
</svg>`;

/* 上线计时。

   **这不是"服务器在线时长"，是"网站上线至今"** —— 静态站没有常驻进程，
   算的是从首次发布那一刻起经过的墙钟时间。这个区别必须说清楚，
   不能拿它冒充服务可用性（SLA）。title 属性里也写了这句。

   数字全部由客户端按 data-since 现算，页面上不写死任何示例值；
   起始日期来自 profile.json 的 site.launchedAt（构建期注入）。
   日期缺失或非法时整块不渲染 —— 页脚其它内容不受影响。 */
export const footer = ({ profile, year, accent }) => {
  const launchedAt = profile.site?.launchedAt;
  const valid = typeof launchedAt === "string" && !Number.isNaN(Date.parse(launchedAt));

  const age = valid
    ? `
      <div class="site-age" data-site-age data-since="${esc(launchedAt)}"
           ${biTitle(profile.siteAge?.title ?? "", profile.siteAge?.titleEn ?? "")}>
        ${ORBIT}
        <span class="age-label">Site age</span>
        <span class="age-value">
          <b data-age-d>–</b><i data-age-ud data-zh="天" data-en="days">天</i>
          <b data-age-hms>--:--:--</b>
        </span>
      </div>`
    : "";

  return `
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
    ${age}
    <a class="to-top" href="#top">Back to top ${UP}</a>
  </div>
</footer>`;
};
