/* sections/competition.mjs — 竞赛
   主张：大数字 + 小文字。数字本身是视觉元素。
   图形素材是真实 rating 曲线（来自 src/data/cf.json），不是示意图。 */

import { ghostTitle } from "../components/ghost-title.mjs";
import { sectionHead } from "../components/section-head.mjs";
import { compStat } from "../components/stat-block.mjs";
import { awardRow } from "../components/award-row.mjs";
import { VISUALS } from "../lib/visuals.mjs";

export const competition = ({ competitions, metrics, cf, ctx }) => {
  const levels = competitions.levels ?? {};
  const awards = [...(competitions.awards ?? [])]
    .sort((a, b) => (a.weight ?? 999) - (b.weight ?? 999));

  // 主列表只放有分量的（认证类单独折叠），避免 23 行平铺把重点冲淡
  const main = awards.filter((a) => a.level !== "cert");
  const certs = awards.filter((a) => a.level === "cert");

  const rows = main.map((a) => awardRow({ a, tone: `tone-${levels[a.level]?.tone ?? "blue"}` })).join("");

  const certNames = awards.flatMap((a) => (a.certs ?? []).map((n) => ({ n, a })));
  const certBlock = certNames.length ? `
    <details class="award-more">
      <summary class="pill">证书清单 · ${certNames.length}</summary>
      <ul class="cert-items">${certNames.map(({ n, a }) =>
        `<li><span class="award-name">${n}</span><span class="award-meta">${a.title}</span></li>`).join("")}</ul>
    </details>` : "";

  const certRows = certs.length ? `
    <ul class="award-list" style="margin-top:0;border-top:0">${certs.map((a) =>
      awardRow({ a, tone: `tone-${levels[a.level]?.tone ?? "blue"}` })).join("")}</ul>` : "";

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

    <div class="comp-chart reveal">${VISUALS.rating(cf)}</div>

    <ul class="award-list">${rows}</ul>
    ${certRows}
    ${certBlock}
  </div>
</section>`;
};
