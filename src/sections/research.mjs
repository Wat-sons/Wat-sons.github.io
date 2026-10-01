/* sections/research.mjs — Research 方向
   按本人要求：现阶段只列方向，不声称任何成果。
   note 为空的条目显示「整理中」标记 —— 不编造一句话说明。 */

import { esc } from "../lib/html.mjs";
import { ghostTitle } from "../components/ghost-title.mjs";
import { sectionHead } from "../components/section-head.mjs";

const ARROW = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
  stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M3 8h10M9 4l4 4-4 4"/></svg>`;

export const research = ({ research, ctx }) => {
  const items = (research.items ?? []).map((r, i) => `
    <li class="research-item reveal" data-delay="${i % 4}">
      <span class="research-idx">${String(i + 1).padStart(2, "0")}</span>
      <span class="research-title">${esc(r.title)}<span class="cn">${esc(r.titleCn ?? "")}</span></span>
      <span class="research-note${r.note ? "" : " is-todo"}">${esc(r.note ?? research.todoLabel ?? "整理中")}</span>
      <span class="research-go" aria-hidden="true">${ARROW}</span>
    </li>`).join("");

  return `
<section id="research" class="section has-ghost">
  ${ghostTitle("RESEARCH")}
  <div class="wrap">
    ${sectionHead({
      num: ctx.num,
      title: "科研方向",
      titleEn: "What I'm Exploring",
      note: research.secNote,
    })}
    <ul class="research-list">${items}</ul>
  </div>
</section>`;
};
