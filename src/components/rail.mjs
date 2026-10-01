/* components/rail.mjs — 四角页眉（杂志 folio 式的角落标记） */

import { esc } from "../lib/html.mjs";

export const rail = (left, right) =>
  `<div class="rail hero-fade"><span>${esc(left)}</span><span>${esc(right)}</span></div>`;
