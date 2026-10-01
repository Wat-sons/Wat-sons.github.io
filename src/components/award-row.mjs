/* components/award-row.mjs — 竞赛奖项行：日期 · 名称 · 等级胶囊 */

import { esc } from "../lib/html.mjs";

export const awardRow = ({ a, tone }) => `
  <li class="award-row reveal">
    <span class="award-date">${esc(a.date)}</span>
    <span>
      <span class="award-name">${esc(a.title)}</span>
      <span class="award-meta">${esc([a.stage && a.stage !== "全国" ? a.stage : "", a.series].filter(Boolean).join(" · "))}</span>
    </span>
    <span class="award-badge ${esc(tone)}">${esc(a.result)}${a.extra ? ` · ${esc(a.extra)}` : ""}</span>
  </li>`;
