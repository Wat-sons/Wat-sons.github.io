# quchen · 个人主页

> 线上：<https://wat-sons.github.io/> · 离线单文件：`npm run single` → `dist/quchen-homepage.html`

Minimal / Editorial 风格的 AI & Algorithms 个人作品集。
数据驱动、**零运行时依赖、零 CDN、零位图**，GitHub Pages 直接托管。

---

## ⚠️ 这个仓库是公开的 —— 改之前先读

本目录就是公开仓库 `Wat-sons.github.io` 的工作区。硬性要求：

1. **不出现真实姓名、学号、手机号、身份证号**。对外统一用 `quchen`。
2. **不放任何证书图片、扫描件、成绩单**。证书只以「名称」形式出现在
   `src/data/competitions.json` 的 `certs` 字段，渲染成纯文字折叠清单。
3. **别用证书原始文件名**（里面带真名）。`vault` 字段只是指向私有仓库的记账路径，从不参与渲染。
4. **不公开**：加权成绩 / 专业排名 / 相关课程；训练量统计与相关仓库链接；非本人的项目。
5. 证书原件、简历、含个人信息的 PDF → 只进私有仓库 `awards`（本地 `awards-repo/`，已 gitignore）。

> ⚠️ `src/data/*.json` 本身也是公开可下载的（`https://wat-sons.github.io/src/data/cf.json`）。
> **「页面上不显示」不等于「不公开」——数据必须一起删。**

以上由 `npm run check` 的**隐私闸门**自动校验，分两级：
**HARD**（会渲染进页面或作为数据发布 → 命中即阻断推送）、**SOFT**（工具与文档提到规则 → 只提示）。

> 背景：这个项目曾经把 29 张证书图片推上过公开仓库。删文件不够 —— force push 之后
> 旧 commit 里的图仍能用 SHA 从 GitHub API 下载。当时只能把旧仓库改名+转私有再重建公开仓库。
> 所以现在从源头堵。

---

## 技术栈

**没有任何框架、没有任何构建工具依赖。** Node 只用来在构建期拼字符串。

| 层 | 方案 | 理由 |
|---|---|---|
| 页面 | 构建期渲染的静态 HTML | 首屏不依赖 JS，SEO 与国内访问都最稳 |
| 样式 | 手写分层 CSS（7 个文件按序拼接） | 相比 Tailwind 省一个构建步骤和一份体积 |
| 行为 | 单个 `src/scripts/main.js`，~7 KB | 只做 CSS 做不到的事 |
| 动效 | CSS transition/animation + IntersectionObserver + 少量 rAF | 只动 `transform`/`opacity`，不触发 layout |
| 字体 | 自托管 Space Grotesk Variable（Latin 子集，21.8 KB） | 不引 Google Fonts——国内不稳 |
| 视觉 | 构建期生成的内联 SVG | 真实数据画出来的图，比 stock 图有辨识度 |

---

## 目录

```
.
├── index.html               ← 构建产物（别手改）
├── assets/
│   ├── style.css            ← 由 src/styles/*.css 拼接而成
│   ├── app.js               ← 由 src/scripts/main.js 拷贝而来
│   ├── favicon.svg
│   └── fonts/space-grotesk-latin-var.woff2
├── src/
│   ├── build.mjs            构建入口：数据 → HTML，拼 CSS，拷 JS
│   ├── lib/
│   │   ├── html.mjs         转义 / 拼接工具
│   │   └── visuals.mjs      构建期 SVG：目前只剩 rating 曲线
│   ├── components/          ghost-title · section-head · project-card
│   │                        stat-block · award-row · rail · pill
│   ├── sections/            topbar · hero · work · competition
│   │                        timeline · about · contact · footer
│   ├── data/                ★ 内容唯一事实来源（改内容只动这里）
│   │   ├── profile.json     身份、导航、Hero 文案、自述、技能、教育、校园
│   │   ├── metrics.json     首屏四数字 / 竞赛四数字 / 时间线
│   │   ├── projects.json    项目（visual：rating / none，无图自动退成通栏文字）
│   │   ├── research.json    ⚠️ 当前不参与渲染（科研方向区块已下线，数据保留待恢复）
│   │   ├── competitions.json 奖项 + 证书名称（页面按 date 升序）
│   │   ├── contests.json    CF handles 与更新日志
│   │   └── cf.json          ← tools/sync.mjs 自动生成，别手改
│   ├── styles/              tokens · base · typography · layout
│   │                        sections · motion · print
│   └── scripts/main.js      运行时行为
├── tools/
│   ├── sync.mjs             刷新 src/data/cf.json（Codeforces 公开 API）
│   ├── check.mjs            发布前自检 + 分级隐私闸门
│   ├── serve.mjs            本地预览（默认 5174）
│   ├── fullshot.mjs         CDP 截图（无头 Chrome 的 --window-size 在 Windows 会被钳到 485px）
│   ├── verify.mjs           浏览器级回归：四档断点 / 隐私 / 无 JS / 打印 / 单文件
│   └── build-single.mjs     打包成单个自包含 HTML（含内联字体）
├── publish.ps1              构建 → 自检 → 建仓 → 推送 → 开 Pages
├── .gitignore               ★ 挡着 awards-repo/ 等敏感目录
└── awards-repo/             ← 私有仓库 awards 的工作区（已 gitignore）
```

---

## 命令

```bash
npm run build      # src/data/*.json → index.html（+ 拼 CSS / 拷 JS）
npm run check      # 自检 + 隐私闸门（不通过就别推）
npm run page       # build + check
npm run verify     # 浏览器回归：4 档断点 / 隐私 / 无 JS / 打印 / 单文件
npm run single     # 生成 dist/quchen-homepage.html（~150 KB，含内联字体，离线可看）
npm run serve      # http://127.0.0.1:5174/
npm run sync       # 刷新 Codeforces 战绩
```

发布：

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force   # 若被拦
.\publish.ps1 -Token ghp_xxxx
```

Token 在 <https://github.com/settings/tokens/new?scopes=repo,workflow&description=quchen-homepage>
勾 `repo` + `workflow`，**用完立刻撤销**。脚本先跑 build + check，隐私闸门不过就直接中止。

---

## 设计系统

改视觉只动 `src/styles/tokens.css` 一个文件。

**色彩** —— 暖调近黑（不用纯黑）、暖白正文、**全站唯一强调色**青柠 `#D8FF4A`。
强调色只允许出现在五个位置：大数字 / 链接 hover / 状态点 / 焦点环 / Hero 末行下划线。

**字体** —— Space Grotesk Variable（显示与拉丁）+ 系统中文栈。
层级靠比值而非绝对值：显示字 / 正文 / meta ≈ **8 : 1.3 : 1**。

**布局** —— 12 列栅格，`--maxw: 1440px`。**不同区块占不同列宽**（文章 1–6、导语 7–12、
项目左右交替），刻意避开「max-width + margin auto」那种模板感。
断点 1440 / 1280 / 1080 / 720 四档，**移动端重新编排而不是等比缩小**：导航收成抽屉、
项目卡转为纵向、统计卡转 2×2、字号重新取值。

**动效分层** ——
| 层 | 手段 | 内容 |
|---|---|---|
| L0 | 纯 CSS | hover 位移 / 下划线生长 / 图片 1.02 倍 |
| L1 | IntersectionObserver | 区块 reveal（位移 18px + 透明度） |
| L2 | rAF + scroll | 顶部进度条、幽灵标题轻视差、导航高亮 |
| L3 | CSS animation-delay | Hero 逐行升起 + 末行下划线展开 |
| L4 | pointermove → CSS 变量 | Hero 鼠标微视差（≤6px） |

全部只动 `transform`/`opacity`。`prefers-reduced-motion` 下 L1–L4 全关。

**渐进增强** —— `<head>` 里一小段脚本给 `<html>` 加 `.js`；只有这个类存在时才隐藏待入场元素，
并且 2.5 秒内没等到 `window.__SITE_READY` 就自动解除隐藏。**JS 挂了正文也一定看得见。**

---

## 已知取舍

| 取舍 | 原因 |
|---|---|
| 不做图片 / 视频背景 / 外部字体 | 参考站评论区里翻车最多的就是加载慢与国内打不开 |
| 视觉素材全部用真实数据生成 | 没有摄影素材，硬塞 stock 图立刻变模板；真实 rating 曲线反而是这个站的辨识点 |
| **图形要么一眼读懂，要么讲的是人不是站** | 已删掉两个自己做的图形：①「506 场参与记录点阵」—— 78% 的点是灰的，不读小字图例看不懂，信息量撑不起那么大面积；②「本站构建流程图」—— 讲的是这个站自己的内部结构，对访客没有价值，属于自说自话。现在只保留 rating 折线 |
| 没有视觉素材的项目不给空图位 | 一个空框比没有框更难看；退成通栏文字（`.work-item.is-textonly`）反而形成大小节奏 |
| 科研方向区块已下线 | 本人暂无可以声称的成果。`research.json` 保留，恢复方法见下 |
| 章节编号由渲染器自动算 | 手工编号插一章要改五个地方 |
| 统计数字全部从数据算，不写死 | 手写的 summary 一定会跟列表跑偏 |
| 竞赛列表按 `date` 升序 | 本人要求按获奖时间先后。改成最新在前只需对调 `competition.mjs` 里 `localeCompare` 的两个参数 |
| 完整的 `@media print` | HR 更可能 Ctrl+P 存 PDF 而不是翻网页 |
| 单文件导出（内联字体） | 国内访问 GitHub Pages 时好时坏，离线文件最稳 |

### 恢复「科研方向」区块

```
1. 把 _archive/v2-sections/research.mjs 拷回 src/sections/
2. 在 src/build.mjs 里 import 并注册该区块（注意后续区块的编号要顺延）
3. 在 src/data/profile.json 的 nav 里加回 { "id": "research", "label": "Research" }
4. 在 src/data/research.json 里给每个方向补 note
```
