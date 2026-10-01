/* sections/competition.mjs — 竞赛
   主张：大数字 + 小文字。数字本身是视觉元素。
   图形素材是真实 rating 曲线（来自 src/data/cf.json），不是示意图。 */

import { ghostTitle } from "../components/ghost-title.mjs";
import { sectionHead } from "../components/section-head.mjs";
import { compStat } from "../components/stat-block.mjs";
import { awardRow } from "../components/award-row.mjs";

export const competition = ({ competitions, metrics, ctx }) => {
  const levels = competitions.levels ?? {};

  // 按获奖时间先后（早 → 晚）。
  // date 可能是 YYYY-MM 也可能是 YYYY-MM-DD：只知道月份的排在当月最前
  // （字典序里 "2025-08" < "2025-08-27"），省赛这种「早于国赛但不知具体哪天」
  // 的情况正好落在前面。同一天的按数组顺序（sort 是稳定的）。
  // 想改成最新在前，把下面两个参数对调即可。
  const awards = [...(competitions.awards ?? [])]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const rows = awards
    .map((a) => awardRow({ a, tone: `tone-${levels[a.level]?.tone ?? "blue"}` }))
    .join("");

  const certNames = awards.flatMap((a) => (a.certs ?? []).map((n) => ({ n, a })));
  const certBlock = certNames.length ? `
    <details class="award-more">
      <summary class="pill">证书清单 · ${certNames.length}</summary>
      <ul class="cert-items">${certNames.map(({ n, a }) =>
        `<li><span class="award-name">${n}</span><span class="award-meta">${a.title}</span></li>`).join("")}</ul>
    </details>` : "";

  return `
<section id="competition" class="section has-ghost">
  ${ghostTitle("COMPETITION")}
  <div class="wrap">
    ${sectionHead({
      num: ctx.num,
      title: "竞赛",
      titleEn: "Competition Record",
      note: ctx.note,
    })}

    <div class="comp-stats">${(metrics.competition ?? []).map(compStat).join("")}</div>

    <ul class="award-list">${rows}</ul>
    ${certBlock}
  </div>
</section>`;
};
