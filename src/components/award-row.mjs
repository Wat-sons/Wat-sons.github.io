/* components/award-row.mjs — 竞赛奖项行：日期 · 名称 · 等级胶囊 */

import { esc } from "../lib/html.mjs";
import { bi } from "../lib/i18n.mjs";

export const awardRow = ({ a, tone }) => `
  <li class="award-row reveal">
    <span class="award-date">${esc(a.date)}</span>
    <span>
      <span class="award-name">${esc(a.title)}</span>
      <span class="award-meta">${a.stage && a.stage !== "全国" ? `<span${bi(a.stage, a.stageEn)}>${esc(a.stage)}</span> · ` : ""}${esc(a.series)}</span>
    </span>
    <span class="award-badge ${esc(tone)}"><span${bi(a.result, a.resultEn)}>${esc(a.result)}</span>${a.extra ? ` · <span${bi(a.extra, a.extraEn)}>${esc(a.extra)}</span>` : ""}</span>
  </li>`;
