/* sections/timeline.mjs — PATH SO FAR
   ────────────────────────────────────────────────────────────
   与 Preloader 呼应：那边是「算法正在找路」，这边是「我已经走过的路」。
   所以它不能做成简历式时间线，而是一条贯穿区块的 path，年份是 path 上的节点。

   几何不写死在模板里：节点的 x/y 由 main.js 在运行时量出来，
   再据此生成 SVG 的 d。这样四档断点、任何文案长度都不会错位 ——
   写死坐标的话，改一句话路径就穿到文字上去了。 */

import { esc } from "../lib/html.mjs";
import { ghostTitle } from "../components/ghost-title.mjs";
import { bi } from "../lib/i18n.mjs";
import { sectionHead } from "../components/section-head.mjs";

const stop = (s) => `
  <article class="tl-stop is-${esc(s.side)}" data-tl-stop>
    <span class="tl-node" data-tl-node aria-hidden="true">
      <span class="tl-node-core"></span>
    </span>
    <div class="tl-body">
      <span class="tl-tag">${esc(s.tag)}</span>
      <h3 class="tl-year">${esc(s.year)}</h3>
      ${(s.lines ?? []).map((t, j) => `<p class="tl-line"${bi(t, (s.linesEn ?? [])[j])}>${esc(t)}</p>`).join("")}
      ${(s.keys ?? []).length
        ? `<p class="tl-keys">${s.keys.map((k) => `<span>${esc(k)}</span>`).join("")}</p>`
        : ""}
      ${(s.miles ?? []).length
        ? `<ul class="tl-miles">${s.miles.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>`
        : ""}
    </div>
  </article>`;

export const timeline = ({ metrics, ctx }) => {
  const tl = metrics.timeline ?? {};
  const stops = (tl.stops ?? []).map(stop).join("");
  const nx = tl.next ?? {};

  // 未完成的节点：不是内容卡片，而是一个位置尚未确定的 algorithm node，
  // 路径在这里淡出。所以它不写年份，只留一个空心环 + 一句话。
  const nextStop = `
  <article class="tl-stop is-next is-right" data-tl-stop>
    <span class="tl-node is-open" data-tl-node aria-hidden="true">
      <span class="tl-node-core"></span>
    </span>
    <div class="tl-body">
      <span class="tl-tag">${esc(nx.tag ?? "NEXT")}</span>
      <p class="tl-line tl-line-next"${bi(nx.line, nx.lineEn)}>${esc(nx.line ?? "")}</p>
    </div>
  </article>`;

  return `
<section id="timeline" class="section has-ghost">
  ${ghostTitle("PATH SO FAR")}
  <div class="wrap">
    ${sectionHead({
      num: ctx.num,
      title: "路径",
      titleEn: "PATH SO FAR",
      note: tl.range ?? null,
    })}

    <p class="tl-intro reveal"${bi(tl.intro, tl.introEn)}>${esc(tl.intro ?? "")}</p>

    <div class="tl-track" data-tl-track>
      <svg class="tl-svg" aria-hidden="true" preserveAspectRatio="none">
        <defs>
          <!-- 路径末端淡出：越靠近「还没有发生」的部分越轻 -->
          <linearGradient id="tl-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="var(--accent)"/>
            <stop offset="0.72" stop-color="var(--accent)"/>
            <stop offset="1" stop-color="var(--accent)" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path class="tl-path" d="" stroke="url(#tl-fade)"/>
      </svg>
      ${stops}
      ${nextStop}
    </div>

    <p class="tl-cta" data-tl-cta>${esc(nx.cta ?? "PATH CONTINUES")} <span aria-hidden="true">→</span></p>
  </div>
</section>`;
};
