/* sections/about.mjs — 关于
   叙事式自述 + CURRENTLY 清单 + 技能矩阵。刻意不做成「姓名/年龄/学校」的字段表。 */

import { esc } from "../lib/html.mjs";
import { ghostTitle } from "../components/ghost-title.mjs";
import { sectionHead } from "../components/section-head.mjs";
import { tag } from "../components/pill.mjs";

/** 把「|会被评测机打分|」里的内容包成 <em>，避免在数据里写裸 HTML */
const emphasized = (s) => {
  const parts = String(s ?? "").split("|");
  return parts.map((p, i) => (i % 2 ? `<em>${esc(p)}</em>` : esc(p))).join("");
};

export const about = ({ profile, ctx }) => {
  const a = profile.about;

  const currently = (a.currently ?? []).map((c) => `
    <li><span class="marker" aria-hidden="true"></span>
      <span><b>${esc(c.marker)}</b> — ${esc(c.text)}</span></li>`).join("");

  const skills = (profile.skills ?? []).map((g, i) => `
    <div class="skill-row reveal" data-delay="${i % 4}">
      <dt>${esc(g.group)}</dt>
      <dd>${(g.items ?? []).map(tag).join("")}</dd>
    </div>`).join("");

  const edu = profile.education;
  const campus = (profile.campus ?? []).map((c) => `
    <div class="reveal">
      <div class="meta">${esc(c.period)}</div>
      <h3 class="work-title" style="font-size:var(--fs-h3)">${esc(c.org)}</h3>
      <ul class="tl-items" style="margin-top:.9rem">${c.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
    </div>`).join("");

  return `
<section id="about" class="section has-ghost">
  ${ghostTitle("ABOUT")}
  <div class="wrap">
    ${sectionHead({
      num: ctx.num,
      title: "关于",
      titleEn: "About",
      note: a.secNote,
    })}

    <div class="grid">
      <div class="c-1-6 reveal">
        <p class="about-lead">${emphasized(a.lead)}</p>
        <div style="margin-top:clamp(1.5rem,3vw,2.25rem)">
          ${(a.paragraphs ?? []).map((p) => `<p class="body-text">${esc(p)}</p>`).join("")}
        </div>
      </div>
      <div class="c-8-12 reveal" data-delay="1">
        <p class="meta accent">Currently</p>
        <ul class="currently" style="margin-top:1rem">${currently}</ul>
      </div>
    </div>

    <dl class="skill-rows">${skills}</dl>

    <div class="grid" style="margin-top:clamp(2.5rem,6vw,4rem)">
      <div class="c-1-6 reveal">
        <p class="meta accent">Education</p>
        <h3 class="work-title" style="font-size:var(--fs-h3);margin-top:.7rem">
          ${esc(edu.school)} · ${esc(edu.college)}
        </h3>
        <p class="award-meta" style="margin-top:.5rem">${esc(edu.major)} · ${esc(edu.period)}</p>
      </div>
      <div class="c-8-12">${campus}</div>
    </div>
  </div>
</section>`;
};
