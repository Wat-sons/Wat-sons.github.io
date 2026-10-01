/**
 * 在指定时刻给 Preloader 连拍，看五个阶段各自长什么样。
 * 用法：node tools/plshot.mjs --url http://127.0.0.1:5174/index.html --out 预览/pl --width 1440
 */
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf("--" + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d; };

const URL_ = arg("url", "http://127.0.0.1:5174/index.html");
const OUT = resolve(arg("out", "预览/pl"));
const WIDTH = parseInt(arg("width", "1440"), 10);
const HEIGHT = parseInt(arg("height", "900"), 10);
const DPR = parseFloat(arg("dpr", "1"));
const SHOTS = argv.includes("--phases") ? null
  : (arg("at", "120,420,900,1200,1500,1900,2150,2450,3000")).split(",").map(Number);
const PORT = parseInt(arg("port", "9341"), 10);
const MOBILE = argv.includes("--mobile");
const CHROME = ["C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"].find((p) => existsSync(p));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
  "--no-default-browser-check", `--remote-debugging-port=${PORT}`, "about:blank"], { stdio: "ignore" });

let target = null;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(250);
  try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page"); } catch {}
}
if (!target) { chrome.kill(); throw new Error("连不上 Chrome"); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pending = new Map(); const events = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method && events.has(m.method)) { events.get(m.method)(); events.delete(m.method); } };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, (m) => res(m.result ?? m.error)); ws.send(JSON.stringify({ id: i, method, params })); });
const once = (method) => new Promise((res) => events.set(method, res));

await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: DPR, mobile: MOBILE });

// 用一个可复现的时间轴：先禁掉动画的随机性来源（Math.random 固定种子）
await send("Page.addScriptToEvaluateOnNewDocument", {
  source: `(() => { let s = 12345; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();`,
});

const loaded = once("Page.loadEventFired");
await send("Page.navigate", { url: URL_ });
await loaded;

// 锚点：等页面自己报告动画起始时刻（window.__PL.startedAt）。
// 之前用 loadEventFired 起算，本地就偏了近 1 秒，每个阶段都标错位置。
for (let i = 0; i < 400; i++) {
  const r = await send("Runtime.evaluate", { expression: "window.__PL ? window.__PL.startedAt : 0", returnByValue: true });
  if (r?.result?.value) break;
  await sleep(10);
}
const info = await send("Runtime.evaluate", { expression: "JSON.stringify(window.__PL||null)", returnByValue: true });
console.log("  页面报告的动画参数:", info?.result?.value);
const PL = JSON.parse(info?.result?.value || "{}");

/* --phases：按页面自己报的 shift 反推四个阶段的**确切**时刻。
   at(ms) 实际在 ms - shift 触发，所以阶段时刻 = 配方值 - shift。
   这样不管本次加载多慢、补偿多少，拍到的永远是真正的阶段画面，
   而不是"差不多那个时间点"的猜。 */
const PHASES = SHOTS || [
  Math.max(20, 40 - (PL.shift || 0)),                    // EXPLORE 刚起
  Math.max(60, 900 - (PL.shift || 0)),                   // CONVERGE 中段
  Math.max(80, 1500 - (PL.shift || 0)),                  // PATH FOUND 路径刚画完
  Math.max(100, 2000 - (PL.shift || 0)),                 // ENTER 横向拉伸中
];
if (!SHOTS) console.log("  四个阶段时刻:", PHASES.join(", "), "ms");

// 之后按页面时钟等待，而不是按墙钟 —— CDP 往返开销不再累积成偏差
const pageNow = async () => (await send("Runtime.evaluate", { expression: "Math.round(performance.now())", returnByValue: true }))?.result?.value || 0;
const startedAt = (await send("Runtime.evaluate", { expression: "window.__PL ? window.__PL.startedAt : Math.round(performance.now())", returnByValue: true }))?.result?.value || 0;

const t0 = Date.now();
for (const at of PHASES) {
  for (let i = 0; i < 400; i++) {
    if ((await pageNow()) - startedAt >= at) break;
    await sleep(8);
  }
  const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  if (!r || !r.data) { console.log(`  ${at}ms 截图失败`); continue; }
  const f = join(OUT, `t${String(at).padStart(4, "0")}.png`);
  writeFileSync(f, Buffer.from(r.data, "base64"));
  const state = await send("Runtime.evaluate", {
    expression: `JSON.stringify({
      booting: document.documentElement.classList.contains("is-booting"),
      ready: document.documentElement.classList.contains("is-ready"),
      status: (document.querySelector('[data-pl-status]')||{}).textContent,
      found: !!(document.querySelector('.pl-stage')||{}).classList?.contains('is-found'),
      enter: !!(document.getElementById('preloader')||{}).classList?.contains('is-enter'),
      particles: document.querySelectorAll('.pl-particle').length
    })`,
    returnByValue: true,
  });
  console.log(`  t=${String(at).padStart(4)}ms  ${state.result?.value ?? ""}`);
}
chrome.kill();
console.log("→", OUT);
