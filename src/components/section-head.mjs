/* components/section-head.mjs — 区块头：编号 + 中英标题 + 右侧说明 */

import { esc } from "../lib/html.mjs";
import { bi } from "../lib/i18n.mjs";

export const sectionHead = ({ num, title, titleEn, note, noteEn }) => `
  <header class="sec-head reveal">
    <span class="sec-num">${esc(num)}</span>
    <h2 class="sec-title">${esc(title)}${titleEn ? `<span class="en">${esc(titleEn)}</span>` : ""}</h2>
    ${note ? `<p class="sec-note"${bi(note, noteEn)}>${esc(note)}</p>` : ""}
  </header>`;
