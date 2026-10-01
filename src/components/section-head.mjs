/* components/section-head.mjs — 区块头：编号 + 中英标题 + 右侧说明 */

import { esc } from "../lib/html.mjs";

export const sectionHead = ({ num, title, titleEn, note }) => `
  <header class="sec-head reveal">
    <span class="sec-num">${esc(num)}</span>
    <h2 class="sec-title">${esc(title)}${titleEn ? `<span class="en">${esc(titleEn)}</span>` : ""}</h2>
    ${note ? `<p class="sec-note">${esc(note)}</p>` : ""}
  </header>`;
