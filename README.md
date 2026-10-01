# quchen · 个人主页

> 线上：<https://wat-sons.github.io/> · 单文件离线版：`npm run single` → `dist/quchen-homepage.html`

数据驱动生成的一页式主页。`data/*.json` 是唯一事实来源，`build.mjs` 产出纯静态 HTML，
线上零运行时依赖、零构建步骤（GitHub Pages 直接托管 `index.html`）。

## ⚠️ 这个仓库是公开的 —— 改之前先读

本目录就是公开仓库 `Wat-sons.github.io` 的工作区。硬性要求：

1. **不出现真实姓名、学号、手机号、身份证号**。对外统一用 `quchen`。
2. **不放任何证书图片、扫描件、成绩单**。证书只以「名称」出现在 `data/awards.json`
   的 `certs` 数组里，由页面渲染成纯文字清单。
3. **别用证书的原始文件名**。原始文件名里带真名，一律重写成不含姓名的描述性名称。
   `awards.json` 里的 `vault` 只是指向私有仓库的记账路径，页面从不读取它。
4. 证书原件、简历、含个人信息的 PDF → 只进私有仓库 `awards`（本地是 `awards-repo/`），
   该目录写在 `.gitignore` 里。

以上第 1–3 条由 `npm run check` 的**隐私闸门**自动校验，不过闸门就推不上去。

> 背景：这个项目曾经把 29 张证书图片推上过公开仓库。删文件不够——force push 之后
> 旧 commit 里的图仍然能用 SHA 从 GitHub API 下载。当时的处置是把旧仓库改名+转私有
> 再重建公开仓库。所以现在从源头堵：图片根本不进这个目录。

## 目录

```
.
├── index.html            ← build.mjs 生成，别手改
├── assets/
│   ├── style.css         深色科技风 + 打印样式
│   ├── app.js            canvas 背景 / rating 曲线 / 数字动画 / 滚动入场
│   └── favicon.svg
├── data/
│   ├── profile.json      基本信息、技能、教育、项目、校园经历
│   ├── awards.json       奖项 + 证书名称（weight 越小越靠前）
│   ├── contests.json     比赛记忆（手工维护的事实与日志）
│   └── cf.json           ← tools/sync.mjs 从 Codeforces API 抓的，别手改
├── src/page.mjs          渲染器（纯字符串拼接，无依赖）
├── build.mjs             data/*.json → index.html
├── tools/
│   ├── sync.mjs          刷新 data/cf.json（Codeforces + XCPC-VP-Tracker）
│   ├── check.mjs         发布前自检 + 隐私闸门
│   ├── serve.mjs         本地预览（默认 5174）
│   ├── fullshot.mjs      CDP 截图（无头 Chrome 的 --window-size 在 Windows 会被钳到 485px）
│   └── build-single.mjs  打包成单个自包含 HTML
├── publish.ps1           构建 → 自检 → 建仓 → 推送 → 开 Pages
├── .gitignore            ★ 挡着 awards-repo/ 等敏感目录
└── awards-repo/          ← 私有仓库 awards 的工作区（已被 gitignore）
```

## 常用命令

```bash
npm run build      # data/*.json → index.html
npm run check      # 自检 + 隐私闸门（不通过就别推）
npm run page       # build + check
npm run single     # 生成 dist/quchen-homepage.html（单文件，离线可看）
npm run serve      # http://127.0.0.1:5174/
npm run sync       # 刷新 Codeforces 战绩
```

## 发布

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force   # 若被拦
.\publish.ps1 -Token ghp_xxxx
```

Token 在 <https://github.com/settings/tokens/new?scopes=repo,workflow&description=quchen-homepage>
勾 `repo` + `workflow`，**用完立刻撤销**。
脚本会先跑 `build` + `check`，隐私闸门不过就直接中止，不会推出去。

## 设计上的几个取舍

| 取舍 | 原因 |
|---|---|
| 不做图片、不做视频背景、不引外部字体 | 评论区翻车最多的就是加载慢；整站 4 个文件 ~60 KB，打开即见 |
| `html.js` 才隐藏入场元素，并带 2.5s 兜底 | JS 挂了或没加载出来时，正文必须仍然可见 |
| canvas 粒子在滚出视口后停掉 rAF | 后台空转白烧电，属于「没功能的动效」 |
| 章节编号 `/01` 由渲染器自动算 | 之前手工写死，插一个章节就得改五个地方 |
| 奖项统计全部从数据算，不写死 summary | 手写的 summary 一定会跟奖项列表跑偏 |
| 完整的 `@media print` | HR 更可能 Ctrl+P 存 PDF，而不是翻网页 |
| 单文件导出 | 国内访问 GitHub Pages 时好时坏，离线文件最稳 |
