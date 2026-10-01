/* sections/timeline.mjs — 年份时间线
   只写能确认的事实。加一年：往 metrics.json 的 timeline 数组里加一条。 */

import { esc } from "../lib/html.mjs";
import { ghostTitle } from "../components/ghost-title.mjs";
import { sectionHead } from "../components/section-head.mjs";

export const timeline = ({ metrics, ctx }) => {
  const rows = (metrics.timeline ?? []).map((row) => `
    <li class="tl-row reveal">
      <span class="tl-year${row.current ? " is-current" : ""}">${esc(row.year)}</span>
      <ul class="tl-items">${(row.items ?? []).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
    </li>`).join("");

  return `
<section id="timeline" class="section has-ghost">
  ${ghostTitle("TIMELINE")}
  <div class="wrap">
    ${sectionHead({
      num: ctx.num,
      title: "时间线",
      titleEn: "Timeline",
      note: ctx.note,
    })}
    <ul class="timeline">${rows}</ul>
  </div>
</section>`;
};
