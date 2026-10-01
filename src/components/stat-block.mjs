/* components/stat-block.mjs — 大数字 + 小文字
   「大数字成为视觉元素」是这个站的主要叙事手段，所以单独抽成组件。 */

import { esc, num } from "../lib/html.mjs";

export const statBlock = ({ value, unit, label, note, delay = 0, plain = false }) => {
  const countable = typeof value === "number";
  const shown = countable ? num(value) : esc(value);
  const small = unit ? `<small>${esc(unit)}</small>` : "";
  const numAttrs = countable
    ? ` data-to="${value}" data-unit="${esc(unit ?? "")}"`
    : "";
  return `<div class="hero-stat reveal" data-delay="${delay}">
    <span class="stat-num${plain ? " is-plain" : ""}"${numAttrs}>${shown}${small}</span>
    <div class="stat-label">${esc(label)}</div>
    ${note ? `<div class="stat-note">${esc(note)}</div>` : ""}
  </div>`;
};

/** 竞赛区用的版本：外面多一层 grid 单元格 */
export const compStat = (s, i) => `
  <div class="reveal" data-delay="${i % 4}">
    <span class="stat-num"${typeof s.value === "number" ? ` data-to="${s.value}" data-unit="${esc(s.unit ?? "")}"` : ""}>
      ${typeof s.value === "number" ? num(s.value) : esc(s.value)}${s.unit ? `<small>${esc(s.unit)}</small>` : ""}
    </span>
    <div class="stat-label">${esc(s.label)}</div>
    ${s.note ? `<div class="stat-note">${esc(s.note)}</div>` : ""}
  </div>`;
