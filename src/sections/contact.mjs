/* sections/contact.mjs — 联系
   巨型 CTA 收尾。联系方式用胶囊按钮，不用「Email: / GitHub:」这种字段表。 */

import { esc } from "../lib/html.mjs";
import { ghostTitle } from "../components/ghost-title.mjs";
import { sectionHead } from "../components/section-head.mjs";
import { pill } from "../components/pill.mjs";

export const contact = ({ profile, ctx }) => {
  const links = [
    pill({ href: `mailto:${profile.email}`, label: profile.email, variant: "is-solid", external: false, arrow: false }),
    pill({ href: `https://github.com/${profile.github}`, label: `GitHub · ${profile.github}` }),
    pill({ href: profile.nowcoder, label: `牛客 · ${profile.nowcoderHandle}` }),
    pill({ href: profile.blog, label: "技术博客" }),
  ].join("");

  return `
<section id="contact" class="section has-ghost">
  ${ghostTitle("CONTACT")}
  <div class="wrap">
    ${sectionHead({ num: ctx.num, title: "联系", titleEn: "Contact", note: ctx.note })}

    <p class="contact-kicker reveal">The path continues</p>

    <h2 class="display contact-cta reveal">
      <span class="reveal-line"><span>LET'S</span></span>
      <span class="reveal-line"><span>BUILD</span></span>
      <span class="reveal-line"><span><span class="mark">SOMETHING.</span></span></span>
    </h2>

    <p class="contact-lead reveal" data-delay="1">
      有想法、想聊算法或竞赛，或者只是想指出这个站哪里做得不好 —— 都欢迎写信给我。
    </p>

    <div class="contact-links reveal" data-delay="2">${links}</div>

    <p class="contact-sign">
      ${esc(profile.handle)} · ${esc(profile.location)}
    </p>
  </div>

  <!-- 首尾呼应：同一张插画镜像后淡淡压在右下角。
       不引入第二种画风，只让页面开头和结尾看到同一片天。
       图由 CSS 背景给出（见 sections.css）—— 这样亮/暗两套只下载当前主题那一张。 -->
  <div class="contact-scenery" aria-hidden="true"></div>
</section>`;
};
