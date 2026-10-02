/* components/project-card.mjs — 项目大卡
   有视觉素材的：文左图右，下一项自动翻转。
   没有视觉素材的（.is-textonly）：整块退成通栏文字，不给空图位 ——
   宁可留白，也别摆一张说不清楚的东西。 */

import { esc } from "../lib/html.mjs";
import { bi } from "../lib/i18n.mjs";
import { tag, textLink } from "./pill.mjs";

export const projectCard = ({ item, visual, flipped }) => `
  <article class="work-item reveal${flipped ? " is-flipped" : ""}${visual ? "" : " is-textonly"}">
    ${visual ? `<div class="work-media">${visual}</div>` : ""}
    <div class="work-body">
      <span class="work-index">${esc(item.index)} — ${esc(item.year)}</span>
      <h3 class="work-title">
        ${esc(item.title)}
        ${item.titleCn ? `<span class="cn">${esc(item.titleCn)}</span>` : ""}
      </h3>
      <p class="work-desc"${bi(item.desc, item.descEn)}>${esc(item.desc)}</p>
      <div class="work-tags">${(item.tags ?? []).map(tag).join("")}</div>
      ${(item.links ?? []).length
        ? `<div class="work-links">${item.links.map((l) => textLink({ href: l.url, label: l.label })).join("")}</div>`
        : ""}
    </div>
  </article>`;
