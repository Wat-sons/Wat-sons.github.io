/* components/project-card.mjs — 项目大卡
   布局在 CSS 里按奇偶交替（.is-flipped），这里只负责内容与语义。
   视觉由 visual 字段决定用哪个 SVG 生成器，没有就留一块低调的空位。 */

import { esc } from "../lib/html.mjs";
import { tag, textLink } from "./pill.mjs";

export const projectCard = ({ item, visual, flipped }) => `
  <article class="work-item reveal${flipped ? " is-flipped" : ""}">
    <div class="work-media">${visual || ""}</div>
    <div class="work-body">
      <span class="work-index">${esc(item.index)} — ${esc(item.year)}</span>
      <h3 class="work-title">
        ${esc(item.title)}
        ${item.titleCn ? `<span class="cn">${esc(item.titleCn)}</span>` : ""}
      </h3>
      <p class="work-desc">${esc(item.desc)}</p>
      <div class="work-tags">${(item.tags ?? []).map(tag).join("")}</div>
      ${(item.links ?? []).length
        ? `<div class="work-links">${item.links.map((l) => textLink({ href: l.url, label: l.label })).join("")}</div>`
        : ""}
    </div>
  </article>`;
