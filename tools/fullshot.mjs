/**
 * 用 Chrome DevTools Protocol 精确控制视口并截图（headless 的 --window-size 会被钳到 485px 以上）。
 *
 * 用法：
 *   node tools/fullshot.mjs --url http://127.0.0.1:8765/index.html?theme=dark \
 *                           --out 预览/整页.png --width 1440 [--height 900] [--dpr 1] [--mobile] [--viewport-only]
 *
 * 依赖 Node >= 22（内置全局 WebSocket）。Chrome 路径可用 --chrome 覆盖。
 */
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf("--" + name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : dflt;
};
const flag = (name) => argv.includes("--" + name);

const URL_ = arg("url", "http://127.0.0.1:8765/index.html");
const OUT = resolve(arg("out", "shot.png"));
const WIDTH = parseInt(arg("width", "1440"), 10);
const HEIGHT = parseInt(arg("height", "900"), 10);
const DPR = parseFloat(arg("dpr", "1"));
const MOBILE = flag("mobile");
const VIEWPORT_ONLY = flag("viewport-only");
const EVAL = arg("eval", null);
const PORT = parseInt(arg("port", "9333"), 10);
const CHROME =
  arg("chrome", null) ||
  ["C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
   "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"].find((p) => existsSync(p));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const chrome = spawn(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${PORT}`,
    "about:blank",
  ], { stdio: "ignore" });

  let target = null;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(250);
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      target = list.find((t) => t.type === "page");
    } catch { /* 还没起来 */ }
  }
  if (!target) { chrome.kill(); throw new Error("连不上 Chrome 调试端口"); }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let id = 0;
  const pending = new Map();
  const events = new Map();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method && events.has(m.method)) { events.get(m.method)(); events.delete(m.method); }
  };
  const send = (method, params = {}) =>
    new Promise((res) => { const i = ++id; pending.set(i, (m) => res(m.result ?? m.error)); ws.send(JSON.stringify({ id: i, method, params })); });
  const once = (method) => new Promise((res) => events.set(method, res));

  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: WIDTH, height: HEIGHT, deviceScaleFactor: DPR, mobile: MOBILE,
  });

  const loaded = once("Page.loadEventFired");
  await send("Page.navigate", { url: URL_ });
  await loaded;
  await sleep(1200);

  // 滚一遍整页，触发 IntersectionObserver 的入场动画 / 懒加载图片
  await send("Runtime.evaluate", {
    expression: `(async () => {
      // 站点开了 scroll-behavior:smooth，会打断连续 scrollTo，先关掉
      const prev = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      const step = Math.round(innerHeight * 0.8);
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        scrollTo(0, y);
        await new Promise(r => setTimeout(r, 90));
      }
      scrollTo(0, document.documentElement.scrollHeight);
      await new Promise(r => setTimeout(r, 400));
      scrollTo(0, 0);
      document.documentElement.style.scrollBehavior = prev;
      await new Promise(r => setTimeout(r, 400));
    })()`,
    awaitPromise: true,
  });
  await sleep(1200); // 等动画收尾 / 图片解码

  const shotParams = { format: "png" };
  if (EVAL) {
    const r = await send("Runtime.evaluate", { expression: EVAL, returnByValue: true, awaitPromise: true });
    console.log(JSON.stringify(r.result?.value ?? r, null, 2));
  }
  if (!VIEWPORT_ONLY) {
    // captureBeyondViewport 单用不管用，得显式给出整页 clip
    const lm = await send("Page.getLayoutMetrics");
    const size = lm.cssContentSize || lm.contentSize;
    shotParams.captureBeyondViewport = true;
    shotParams.clip = { x: 0, y: 0, width: size.width, height: size.height, scale: 1 };
  }
  const shot = await send("Page.captureScreenshot", shotParams);

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, Buffer.from(shot.data, "base64"));
  console.log(`saved ${OUT}  (viewport ${WIDTH}x${HEIGHT} @${DPR}x${MOBILE ? " mobile" : ""})`);

  ws.close();
  chrome.kill();
}

main().catch((e) => { console.error(e); process.exit(1); });
