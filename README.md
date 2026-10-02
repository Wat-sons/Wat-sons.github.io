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
│   │   └── visuals.mjs      构建期 SVG：目前只剩 rating 曲线│   ├── components/          ghost-title · section-head · project-card
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

## Preloader —「An Algorithm Finding Its Way.」

页面打开时不是「加载」，而是**算法在一个抽象空间里找路**：粒子探索 → 收敛 → PATH FOUND
→ 那条路径变形成首页标题下的强调色横线。让访客的感觉是「这个首页就是算法找到的结果」。

```
INIT (QUCHEN + 坐标空间)        0 ─ 150ms
EXPLORE (SEARCHING…，粒子散开)  150 ─ 650ms
CONVERGE (CONVERGING…，拖尾拉长) 650 ─ 1450ms
PATH FOUND (路径画出 + 見つけた。) 1450 ─ 1900ms
ENTER (路径→横线→Hero)          1900 ─ 2420ms
```

**设计上的几个决定**

| 决定 | 原因 |
|---|---|
| 暗底 `#0B0B0C`，不是规格里写的米白 `#F5F5F2` | 亮底 Loading 切到暗色 Hero 会闪一下，直接违背「两者必须连续」这条核心要求 |
| Accent 沿用青柠 `#D8FF4A`，没有引入电光蓝 | 全站只有一个 accent 是上一轮定下的规则；加蓝立刻变成两色杂烩 |
| 不出现任何算法名字、公式、参数 | 规格要求「不要做成科研论文演示」。懂的人看到「探索→收敛→最优路径」自己会认出来 |
| 最终路径是**手工设计的贝塞尔曲线**，不是跑出来的 | 这是视觉模拟，不是科研。手工设计换来每次打开都好看、且必然避开障碍 |
| 粒子跑的是简化的 PSO 更新式（惯性 + 拉力 + 噪声 + 限速） | 真的 PSO 在这个尺度上没有视觉差别，还更贵。参数是调出来的：k 太大粒子会 1 帧跨半张图 |
| 收敛段给足 800ms、限速放到 2.8 | 否则粒子还没游到目标就 PATH FOUND 了，「找到路径」说服力不足 |
| 贴到目标时加斥力 | 不加的话 24 个粒子会塌缩成一个点，很难看 |

**Loading 与 Hero 怎么接起来的（最关键的一段）**

不是「Loading → 黑屏 → 首页」，而是**同一条线**：

1. `is-booting` 期间 Hero 用 `visibility: hidden` 藏起来 —— **不能用 transform**，
   因为 preloader 要精确量出最后一行下划线该在的位置，而 `visibility:hidden`
   的元素仍保留最终布局，量出来是准的；
2. ENTER 阶段把那条路径送到量出来的坐标（写进 `--pl-x/y/w/h`），拉成一条横线；
3. 收尾时摘掉 `is-booting` → preloader 消失、Hero 恢复可见，
   同时下划线用 `transform: scaleX(1)` 在同一位置**瞬间就位**（不再自己播 `mark-in`）。
   视觉上就是同一条线继续存在。

`window.__SITE_READY` 照旧在装好所有系统后立刻置位，preloader 单独 `try/catch` 包着，
它挂掉不影响任何一个既有系统。

**降级路径（三条都实测过）**

| 场景 | 行为 |
|---|---|
| `prefers-reduced-motion: reduce` | 仍然走一遍，但压到 ~0.9s、不跑 rAF、粒子数 0、不出现彩蛋 |
| JS 完全禁用 | `is-booting` 从没被加上 → preloader `display:none` → 页面直接可读 |
| 移动端 / 低配 | 粒子 24 → 14（≤1080px）→ 10（≤720px）；`hardwareConcurrency ≤ 4` 再砍 40% |
| 兜底 | 2.5s 解除入场隐藏；**3.6s 无条件撤掉 preloader**，防止动画卡住盖住整页 |

## Timeline —「PATH SO FAR」

和 Preloader 是一对：**那边是算法正在找路，这边是我已经走过的路。**
所以它没做成简历式时间线（`2024 → 事件列表`），而是一条贯穿区块的 path，
年份是 path 上的节点，节点亮起 = 路径画到了那里。

```
2024  START     学习      左侧内容 · 节点在右
2025  COMPETE   竞争      右侧内容 · 节点在左
2026  BUILD     创造      左侧内容 · 节点在右
 ○    NEXT      ——        未完成节点，路径在这里淡出
```

**几何是运行时量出来的，不是写死的。** `setupPath()` 读取每个节点的实际坐标，
连成三次贝塞尔（控制点各占一半竖直距离 → 平滑 S 形），再写进 `d`。
写死坐标的话，改一句话、换一个断点，路径就会穿到文字上；现在四档断点共用一套逻辑，
移动端自动从「左右交错」收成「左侧竖线」。

**滚动联动**：绘制进度绑定在轨道穿过视口的比例上，
画笔尖端用 `path.getPointAtLength()` 求真实曲线位置 ——
尖端到哪个节点，那个节点的内容才淡入（不是按 y 估算）。整站只有一个 rAF 滚动循环，
`setupPath` 把绘制函数推进 `scrollFns`，不另开 listener。

| 决定 | 原因 |
|---|---|
| 节点坐标运行时实测 | 见上。这是这个区块唯一容易做错的地方 |
| 用 `getPointAtLength` 定位画笔尖端 | 曲线长度与 y 不成正比，按 y 估算会「文不对题」 |
| 路径末端用渐变淡出 | 「路还在生成」需要视觉上真的没有尽头，而不是突然截断 |
| NEXT 节点是**虚线空心环**且旋转 45° | 不是内容卡片，是一个位置尚未确定的 algorithm node |
| 内容文案用中文 | **全站语言规则：英文管结构，中文管内容。** 英文用于区块英文副标题、`START/COMPETE/BUILD` 这类 mono 标签、技术名词、`[2026]`、`BACK TO TOP`、首屏宣言；正文、描述、叙事一律中文。曾经把 Timeline 的正文写成英文 —— 那是内容，不是结构，破坏了一致性 |
| 不做逐节点的通用 reveal | 点亮时机必须跟着路径走，通用 IntersectionObserver 做不到 |

## QUCHEN 标识系统

三层身份，**刻意不共用同一张图** —— 换了竞赛头像也不会动摇网站品牌：

| 层 | 代表 | 实现 | 用在哪 |
|---|---|---|---|
| **Avatar** | 这是我 | 二次元头像（原图裁头部） | 导航左上角 |
| **Mark** | 我的品牌 | `Q + Path` 抽象几何 | 页脚、favicon |
| **Logo** | 我的品牌 | Mark + `quchen` 文字 | 独立文件（OG / 分享） |

`Q` 的尾部不是普通一撇，而是一小段**带节点的路径** —— 和 Preloader「算法找路」、
Timeline「PATH SO FAR」里的 node 是同一个符号。整站的叙事因此闭环：

```
LOADING   PATH FOUND      算法找到了路
HERO      AI · ALGORITHMS · BUILDING
TIMELINE  PATH SO FAR     我走过的路
CONTACT   THE PATH CONTINUES
```

**颜色不写死**：`build.mjs` 从 `tokens.css` 里读出 `--accent` 注入 SVG，
改令牌时 logo / favicon 跟着变，不会两处各写一份。

| 决定 | 原因 |
|---|---|
| 头像不加 border / glow / shadow / 装饰框 | 它是全站唯一的彩色元素，本身够抢眼；再加壳子就从"签名"变成"装饰" |
| 头像裁到「脸占满圆」而不是「全身」 | 32px 下只有脸能认出来。试过三档，最紧的那档把头饰切掉了，最终取中间档 |
| favicon 用 `Q + Path` 而不是头像 | 需求 §8。16px 下画一张脸只会糊成一团；几何标识才立得住 |
| favicon 的 PNG 用 Pillow 手画，不引 cairosvg | 形状只有「环 + 曲线 + 点」，手画准确且不给构建加重依赖。生成后提交，构建期不需要 Python。改几何要重跑 `python tools/make-icons.py` |
| 位图白名单从 1 条扩到 5 条 | **精确路径**，不是"允许 png/webp"。没被引用的 `avatar-square.webp` 故意不列 —— 进公开仓库的应该只有线上真正用到的东西 |

## 证书编号不公开

证书编号本身是**个人标识** —— 拿到编号可以在主办方系统里查到具体的人。
所以它既不进 `src/data/*.json`，也不该出现在注释、README 或提交信息里
（写进注释等于换个地方重新发布一次）。

`check.mjs` 有硬断言：`src/data/*.json` 里出现
`3-4 位数字 + 2-5 位大写字母 + 2-4 位数字` 的组合即阻断推送。

**踩过的坑**：核验证书时顺手把编号写进了 award 的 `extra` 字段，
并且只改了源数据、忘了构建产物 `index.html` 也在仓库里 ——
结果编号散落在 15 个历史提交中，最后靠 `git filter-branch` 重写历史才清干净。
**核验归核验，发布归发布。**

## 已知取舍

| 取舍 | 原因 |
|---|---|
| 不做图片 / 视频背景 / 外部字体 | 参考站评论区里翻车最多的就是加载慢与国内打不开 |
| 视觉素材全部用真实数据生成 | 没有摄影素材，硬塞 stock 图立刻变模板；真实 rating 曲线反而是这个站的辨识点 |
| **全站只留一张二次元插画，且只占约 5%** | 目标是「80% 现代技术作品集 + 15% 个人编辑感 + 5% 二次元」。插画只在首屏右下角出现一次（页尾镜像再淡一次做呼应）。不做角色立绘、不做满屏贴纸、不做发光特效 |
| **插画必须是环境型，不能是人物主体** | 用的是「环状行星 + 星点 + 一个极小的猫耳少女背影剪影」。环 = 轨道 / 优化，本身和技术主题相通，不是随便贴一张动漫图。剪影小到要留意才发现 —— 就是留给同好的那点彩蛋 |
| 插画的黑点被重映射成站点底色 `#0B0B0C` | 图的底色和页面底色（还叠了层辉光）差几个色阶，直接铺会露出矩形边。抬黑点后无缝贴合 |
| 四边淡出烘进 WebP 的 alpha，不用 CSS mask | 试过 `radial-gradient` 遮罩，容器边缘还剩 82% 不透明度，等于没遮。烘进 alpha 才能保证四边真的为 0 |
| 不使用 `mix-blend-mode: screen` | 那个剪影本身是黑的，screen 会把它当"无贡献"直接抹掉 —— 全站唯一的二次元细节就没了 |
| **绝不自制第二套画风** | 收到过五张画风迥异的壁纸（厚涂蓝调 / 平涂赛璐璐 / 粉色花瓣 / 极简黑白 / 大理石浮世绘）。只用其中画风与站点一致的那一张，其余全部不用 —— 画风杂糅比没有插画更糟 |
| **图表坐标轴用固定量程，不按数据自动伸缩** | 自动 fit 会把「陡」变成缩放的产物：同一份数据换个范围就是另一个斜率，读者无从判断。rating 图固定 `0 → 2400`（Codeforces 段位带上界），每 200 一条刻度且**每条都标数值**，轴上不留没有刻度的区域 |
| **图形要么一眼读懂，要么讲的是人不是站** | 已删掉两个自己做的图形：①「506 场参与记录点阵」—— 78% 的点是灰的，不读小字图例看不懂，信息量撑不起那么大面积；②「本站构建流程图」—— 讲的是这个站自己的内部结构，对访客没有价值，属于自说自话。现在只保留 rating 折线 |
| 没有视觉素材的项目不给空图位 | 一个空框比没有框更难看；退成通栏文字（`.work-item.is-textonly`）反而形成大小节奏 |
| 科研方向区块已下线 | 本人暂无可以声称的成果。`research.json` 保留，恢复方法见下 |
| 章节编号由渲染器自动算 | 手工编号插一章要改五个地方 |
| 统计数字全部从数据算，不写死 | 手写的 summary 一定会跟列表跑偏 |
| 竞赛列表按 `date` 升序 | 本人要求按获奖时间先后。`date` 允许 `YYYY-MM` 或 `YYYY-MM-DD`：**有据可查就到日，只知道月份就写到月**。字典序里 `"2025-08" < "2025-08-27"`，所以只知月份的条目自然落在当月最前（省赛这种「早于国赛但不知具体哪天」正好合适）。改成最新在前只需对调 `competition.mjs` 里 `localeCompare` 的两个参数 |
| 完整的 `@media print` | HR 更可能 Ctrl+P 存 PDF 而不是翻网页 |
| 单文件导出（内联字体） | 国内访问 GitHub Pages 时好时坏，离线文件最稳 |

### 恢复「科研方向」区块

```
1. 把 _archive/v2-sections/research.mjs 拷回 src/sections/
2. 在 src/build.mjs 里 import 并注册该区块（注意后续区块的编号要顺延）
3. 在 src/data/profile.json 的 nav 里加回 { "id": "research", "label": "Research" }
4. 在 src/data/research.json 里给每个方向补 note
```
