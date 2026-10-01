// Renders index.html from data/*.json. Pure string building — no dependencies.
// Run through build.mjs, not directly.
//
// 隐私约定（本文件产出的是**公开**页面）：
//   · 只使用 profile.name（= quchen），绝不输出真名 / 学号 / 电话
//   · 不渲染任何证书图片，证书只以「名称」形式出现在证书清单里
//   · awards.json 里的 vault 字段是本地记账，下面从不读取它

const ICONS = {
  github: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>',
  blog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3 7 9 6 9-6"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
};

const esc = (s) => String(s ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const num = (n) => (typeof n === 'number' ? n.toLocaleString('en-US') : String(n ?? '—'));

function embedJson(obj) {
  return JSON.stringify(obj).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026');
}

/** 全国性（含全国总决赛）的 level，用于「全国性奖项」统计 */
const NATIONAL_LEVELS = new Set(['gold', 'first', 'second', 'silver', 'third', 'bronze', 'finalist']);

function statCard({ k, v, unit, sub, to }) {
  const value = Number.isFinite(to)
    ? `<span data-to="${to}">0</span>${unit ? `<small>${esc(unit)}</small>` : ''}`
    : `${esc(v)}${unit ? `<small>${esc(unit)}</small>` : ''}`;
  return `<div class="stat"><div class="k">${esc(k)}</div><div class="v">${value}</div><div class="s">${esc(sub)}</div></div>`;
}

function awardRow(a, levels) {
  const lv = levels[a.level] ?? { label: a.level, tone: 'blue' };
  const extra = a.extra ? `<span class="ex">${esc(a.extra)}</span>` : '';
  const stage = a.stage && a.stage !== '全国' ? `${esc(a.stage)} · ` : '';
  return `<div class="award reveal">
    <div class="when">${esc(a.date)}</div>
    <div class="what">
      <div class="t">${esc(a.title)}</div>
      <div class="m">${stage}${esc(a.series)}</div>
    </div>
    <div class="res"><span class="badge ${esc(lv.tone)}">${esc(a.result)}${extra}</span></div>
  </div>`;
}

export function render({ profile, awards, contests, cf }) {
  const levels = awards.levels ?? {};
  const list = [...awards.awards].sort((a, b) => (a.weight ?? 999) - (b.weight ?? 999));
  const cfh = cf?.codeforces?.handles ?? [];
  const peak = cf?.codeforces?.peak;
  const cfStats = cf?.codeforces?.stats;
  const xcpc = cf?.xcpc;
  const byStatus = cfStats?.byStatus ?? {};
  const submissions = Object.values(cfStats?.submissions ?? {}).reduce((a, b) => a + b, 0);
  const ratedTotal = cf?.codeforces?.ratedContests ?? 0;

  /* ---- 奖项统计：全部从数据算，别手写 summary，免得跟奖项列表跑偏 ---- */
  const levelCount = {};
  for (const a of list) levelCount[a.level] = (levelCount[a.level] ?? 0) + 1;
  const LEVEL_ORDER = ['gold', 'first', 'second', 'silver', 'third', 'bronze', 'finalist',
                       'provincial-first', 'provincial-second', 'cert'];
  const breakdown = LEVEL_ORDER
    .filter((k) => levelCount[k])
    .map((k) => `${levels[k]?.label ?? k} ${levelCount[k]}`)
    .join(' · ');
  const national = list.filter((a) => NATIONAL_LEVELS.has(a.level)).length;
  const provincial = list.filter((a) => String(a.level).startsWith('provincial-')).length;
  const certCount = list.filter((a) => a.level === 'cert').length;

  /* ---- 证书清单：只取名称，绝不碰图片 ---- */
  const certRows = [];
  for (const a of list) {
    for (const n of a.certs ?? []) certRows.push({ name: n, award: a });
  }
  const certByYear = {};
  for (const r of certRows) {
    const y = String(r.award.date ?? '').slice(0, 4) || '其他';
    (certByYear[y] ??= []).push(r);
  }
  const certYears = Object.keys(certByYear).sort((a, b) => b.localeCompare(a));

  const mailIcon = ICONS.mail;
  const linkButtons = [
    ...(profile.links ?? []).map((l) => `<a class="btn" href="${esc(l.url)}" target="_blank" rel="noopener">${ICONS[l.icon] ?? ICONS.link}${esc(l.label)}</a>`),
    profile.contacts?.email
      ? `<a class="btn mail" href="mailto:${esc(profile.contacts.email)}">${mailIcon}${esc(profile.contacts.email)}</a>`
      : '',
  ].join('');

  const stats = [
    statCard({ k: 'Codeforces 最高', v: peak?.maxRating ?? '—', unit: peak ? `· ${peak.maxRank}` : '', sub: peak ? `账号 ${peak.handle}` : '', to: peak?.maxRating }),
    statCard({ k: 'CCF-CSP', v: 355, sub: '累计排名前 1.76%', to: 355 }),
    statCard({ k: '全国性奖项', v: national, unit: '项', sub: `省赛 / 区域 ${provincial} 项 · 认证 ${certCount} 项`, to: national }),
    statCard({ k: 'XCPC 覆盖', v: xcpc?.problems ?? '—', unit: '题', sub: `${xcpc?.contests ?? '—'} 个赛站 · 已过 ${xcpc?.solved ?? '—'} 题`, to: xcpc?.problems }),
  ].join('');

  const splitTotal = Object.values(byStatus).reduce((a, b) => a + b, 0) || 1;
  const splitColors = { contest: '#22d3ee', vp: '#3ddc84', practice: '#5b6b8c', other: '#8b5cf6' };
  const splitBar = ['contest', 'vp', 'practice', 'other']
    .filter((k) => byStatus[k])
    .map((k) => `<span style="width:${((byStatus[k] / splitTotal) * 100).toFixed(2)}%;background:${splitColors[k]}" title="${k}: ${byStatus[k]}"></span>`)
    .join('');

  const metrics = [
    { v: ratedTotal, k: 'rated 参赛场次' },
    { v: submissions, k: 'CF 历史提交' },
    { v: cfStats?.contestsSeen, k: 'CF 打过比赛' },
    { v: byStatus.vp, k: 'VP（虚拟赛）' },
    { v: byStatus.contest, k: '正式参赛' },
    { v: byStatus.practice, k: '赛后补题' },
  ].filter((m) => m.v != null)
    .map((m) => `<div class="metric"><div class="v">${num(m.v)}</div><div class="k">${esc(m.k)}</div></div>`)
    .join('');

  const handleRows = cfh.map((h) => {
    const color = h.handle === cf?.codeforces?.primary ? 'var(--cyan)' : 'var(--violet)';
    return `<div class="metric"><div class="v" style="color:${color}">${h.rating ?? '—'}<small style="font-size:.72rem;color:var(--fg-faint)"> / max ${h.maxRating ?? '—'}</small></div><div class="k">${esc(h.handle)} · ${esc(h.rank ?? '')}</div></div>`;
  }).join('');

  const skillGroups = (profile.skills ?? []).map((g) => `<div class="skill-group">
      <div class="g">${esc(g.group)}</div>
      <div class="chips">${g.items.map((i) => `<span class="chip">${esc(i)}</span>`).join('')}</div>
    </div>`).join('');

  const edu = profile.education ?? {};
  const projects = (profile.projects ?? []).map((p) => `<div class="card reveal">
      <h3>${esc(p.name)}</h3>
      <p>${esc(p.desc)}</p>
      <div class="chips" style="margin-top:.7rem">${(p.tags ?? []).map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div>
      <div class="foot">
        <a href="${esc(p.url)}" target="_blank" rel="noopener">${ICONS.link}访问</a>
        ${p.repo && p.repo !== p.url ? `<a href="${esc(p.repo)}" target="_blank" rel="noopener">源码</a>` : ''}
      </div>
    </div>`).join('');

  const highlights = (contests.highlights ?? []).map((h) => `<div class="award reveal">
      <div class="when">${esc(h.date)}</div>
      <div class="what"><div class="t">${esc(h.name)}</div><div class="m">${esc(h.note ?? '')}</div></div>
      <div class="res"><span class="badge ${/银/.test(h.result) ? 'silver' : /铜/.test(h.result) ? 'bronze' : 'blue'}">${esc(h.result)}</span></div>
    </div>`).join('');

  const campus = (profile.campus ?? []).map((c) => `<div class="card reveal">
      <h3>${esc(c.org)}</h3>
      <div class="meta">${esc(c.period)}</div>
      <ul>${c.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
    </div>`).join('');

  const certListHtml = certYears.map((y) => `<div class="cert-year reveal">
      <div class="cert-year-head"><span>${esc(y)}</span><em>${certByYear[y].length} 项</em></div>
      <ul class="cert-items">${certByYear[y].map((r) => `<li class="cert-item" data-tone="${esc(levels[r.award.level]?.tone ?? 'blue')}">
        <span class="cdot" aria-hidden="true"></span>
        <span class="cert-name">${esc(r.name)}</span>
        <span class="cert-meta">${esc(r.award.title)} · ${esc(r.award.date)}</span>
      </li>`).join('')}</ul>
    </div>`).join('');

  const syncedAt = cf?.syncedAt ? new Date(cf.syncedAt).toISOString().slice(0, 10) : '—';

  /* ---- 章节编号自动算，插/删章节不用手工改 /0N ---- */
  const sections = [
    {
      id: 'awards',
      title: '竞赛奖项',
      hint: breakdown,
      body: `<div class="awards">${list.map((a) => awardRow(a, levels)).join('')}</div>`,
    },
    {
      id: 'certs',
      title: '证书清单',
      hint: `共 ${certRows.length} 项 · 只列名称，不展示证书图片`,
      body: `<div class="certlist">${certListHtml}</div>`,
    },
    {
      id: 'codeforces',
      title: 'Codeforces 战绩',
      hint: `数据来自 Codeforces 公开 API，最近同步 ${esc(syncedAt)}`,
      body: `<div class="panel reveal">
        <div class="chart-head">
          <div class="legend">${cfh.map((h, i) => `<span><i style="background:${i === 0 ? '#22d3ee' : '#8b5cf6'}"></i>${esc(h.handle)}</span>`).join('')}</div>
          <div class="hint" style="color:var(--fg-faint);font-size:.84rem">鼠标划过看每场变化</div>
        </div>
        <div id="rating-chart"></div>
        <div class="metrics">${handleRows}${metrics}</div>
        <div class="split-bar" aria-hidden="true">${splitBar}</div>
        <div class="hint" style="color:var(--fg-faint);font-size:.82rem;margin-top:.5rem">
          共 ${Object.values(byStatus).reduce((a, b) => a + b, 0)} 场：正式参赛 ${byStatus.contest ?? 0} · VP ${byStatus.vp ?? 0} · 赛后补题 ${byStatus.practice ?? 0} · 其他 ${byStatus.other ?? 0}
        </div>
      </div>`,
    },
    {
      id: 'xcpc',
      title: 'XCPC 与训练记录',
      hint: '从 XCPC-Solutions 与 VP 打卡台汇总',
      body: `<div class="panel reveal">
        <div class="metrics">
          <div class="metric"><div class="v">${num(xcpc?.contests)}</div><div class="k">已整理赛站</div></div>
          <div class="metric"><div class="v">${num(xcpc?.regional)}</div><div class="k">区域赛</div></div>
          <div class="metric"><div class="v">${num(xcpc?.online)}</div><div class="k">网络赛</div></div>
          <div class="metric"><div class="v">${num(xcpc?.problems)}</div><div class="k">题库规模</div></div>
          <div class="metric"><div class="v">${num(xcpc?.solved)}</div><div class="k">已通过</div></div>
          <div class="metric"><div class="v">${num(xcpc?.withSolutions)}</div><div class="k">已写题解</div></div>
        </div>
        <div class="foot" style="margin-top:1.1rem;display:flex;gap:1rem;flex-wrap:wrap;font-size:.9rem">
          <a href="https://wat-sons.github.io/XCPC-VP-Tracker/" target="_blank" rel="noopener">${ICONS.chart}VP 打卡台</a>
          <a href="https://github.com/Wat-sons/XCPC-Solutions" target="_blank" rel="noopener">${ICONS.github}XCPC-Solutions</a>
        </div>
      </div>
      <div class="awards" style="margin-top:1rem">${highlights}</div>`,
    },
    {
      id: 'skills',
      title: '技能与教育',
      body: `<div class="grid-2">
        <div class="card reveal">
          <h3>${esc(edu.school)} · ${esc(edu.college)}</h3>
          <div class="meta">${esc(edu.major)} · ${esc(edu.period)}</div>
          <ul>
            <li>${esc(edu.gpa)}</li>
            <li>${esc(edu.rank)}</li>
            <li>相关课程：${(edu.courses ?? []).map(esc).join('、')}</li>
          </ul>
        </div>
        <div class="card reveal">
          <h3>技能</h3>
          ${skillGroups}
        </div>
      </div>`,
    },
    {
      id: 'projects',
      title: '项目',
      hint: '竞赛训练顺手做出来的工具',
      body: `<div class="grid-2">${projects}</div>`,
    },
  ];

  if (campus) {
    sections.push({ id: 'campus', title: '校园经历', body: `<div class="grid-2">${campus}</div>` });
  }

  const sectionsHtml = sections.map((s, i) => `
    <section id="${s.id}">
      <div class="sec-head"><h2 data-idx="/${String(i + 1).padStart(2, '0')}">${esc(s.title)}</h2>${s.hint ? `<span class="hint">${esc(s.hint)}</span>` : ''}</div>
      ${s.body}
    </section>`).join('');

  const navLinks = sections.map((s) => `<a href="#${s.id}">${esc(s.title)}</a>`).join('');

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(profile.name)} · ${esc(profile.tagline)}</title>
<meta name="description" content="${esc(profile.summary)}">
<meta name="author" content="${esc(profile.name)}">
<meta name="robots" content="index, follow">
<meta name="theme-color" content="#06080f">
<meta property="og:type" content="profile">
<meta property="og:title" content="${esc(profile.name)} · ${esc(profile.tagline)}">
<meta property="og:description" content="${esc(profile.tagline)} — ${esc(profile.school)}${esc(profile.college)}">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="assets/style.css">
<!-- 渐进增强：只有 JS 真跑起来才隐藏待入场元素；main.js 若加载失败，2.5s 后自动解除隐藏 -->
<script>
(function () {
  var d = document.documentElement;
  d.classList.add("js");
  setTimeout(function () { if (!window.__SITE_READY) d.classList.remove("js"); }, 2500);
})();
</script>
</head>
<body>
<a class="skip-link" href="#awards">跳到主要内容</a>
<canvas id="bg" aria-hidden="true"></canvas>

<div class="wrap">
  <header class="hero">
    <span class="eyebrow"><span class="dot"></span>${esc(profile.school)} · ${esc(profile.college)}</span>
    <h1>${esc(profile.name)}</h1>
    <div class="handle">github <b>${esc(profile.github)}</b>${profile.contacts?.location ? ` · ${esc(profile.contacts.location)}` : ''}</div>
    <p class="tagline">${esc(profile.tagline)}</p>
    <p class="summary">${esc(profile.summary)}</p>
    <nav class="links">${linkButtons}</nav>
    <nav class="jump" aria-label="章节导航">${navLinks}</nav>
    <div class="stats">${stats}</div>
  </header>

  <main>
${sectionsHtml}
  </main>

  <footer>
    <div>© ${new Date().getFullYear()} ${esc(profile.name)} · ${esc(profile.contacts?.location ?? '')}</div>
    <div>站点不含姓名 / 学号 / 电话等个人信息，也不展示任何证书图片 · 更新 <code>${esc(profile.updatedAt)}</code> · 战绩同步 <code>${esc(syncedAt)}</code></div>
  </footer>
</div>

<noscript>
  <div class="noscript-note wrap">浏览器禁用了 JavaScript：页面文字内容仍可正常阅读，仅评分曲线与数字动画不可用。</div>
</noscript>

<script id="cf-data" type="application/json">${embedJson({ codeforces: cf?.codeforces ?? null })}</script>
<script src="assets/app.js"></script>
</body>
</html>
`;
}
