/* components/ghost-title.mjs — 巨型幽灵标题
   全站的节奏锚点：极低对比、被左边缘裁掉一截，作为区块的背景水印。
   纯装饰，对读屏隐藏。 */

import { esc } from "../lib/html.mjs";

export const ghostTitle = (text) =>
  `<div class="section-ghost" aria-hidden="true"><div class="wrap"><div class="ghost">${esc(text)}</div></div></div>`;
