/* sections/work.mjs — Selected Work
   每个项目占一屏宽度的大卡，左右交替，形成视觉节奏。
   视觉由 projects.json 的 visual 字段决定，取不到就留低调空位。 */

import { ghostTitle } from "../components/ghost-title.mjs";
import { sectionHead } from "../components/section-head.mjs";
import { projectCard } from "../components/project-card.mjs";
import { VISUALS } from "../lib/visuals.mjs";

export const work = ({ projects, cf, ctx }) => {
  const visualFor = (key) => {
    if (key === "pipeline") return VISUALS.pipeline();
    if (key === "rating") return VISUALS.rating(cf);
    return "";
  };

  const items = (projects.items ?? []).map((item, i) => projectCard({
    item,
    visual: visualFor(item.visual),
    flipped: i % 2 === 1,
  })).join("");

  const body = items || `<p class="work-empty">项目资料整理中。</p>`;

  return `
<section id="work" class="section has-ghost">
  ${ghostTitle("WORK")}
  <div class="wrap">
    ${sectionHead({
      num: ctx.num,
      title: "项目",
      titleEn: "Selected Work",
      note: ctx.note, noteEn: ctx.noteEn,
    })}
    <div class="work-list">${body}</div>
  </div>
</section>`;
};
