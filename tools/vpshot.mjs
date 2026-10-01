import { spawn } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
const CHROME = ["C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"].find((p) => existsSync(p));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = parseInt(process.argv[2] || "9404", 10);
const W = parseInt(process.argv[3] || "1440", 10);
const H = parseInt(process.argv[4] || "900", 10);
const MOBILE = process.argv[5] === "mobile";
const SHOTS = (process.argv[6] || "").split(",").filter(Boolean)
  .map((s) => { const [y, name] = s.split(":"); return [parseInt(y, 10), name]; });

const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
  `--remote-debugging-port=${PORT}`, "about:blank"], { stdio: "ignore" });
let t = null;
for (let i = 0; i < 60 && !t; i++) { await sleep(250);
  try { t = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((x) => x.type === "page"); } catch {} }
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const p = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && p.has(m.id)) { p.get(m.id)(m); p.delete(m.id); } };
const send = (m, params = {}) => new Promise((r) => { const i = ++id; p.set(i, (x) => r(x.result ?? x.error)); ws.send(JSON.stringify({ id: i, method: m, params })); });
const evalJs = async (e) => (await send("Runtime.evaluate", { expression: e, returnByValue: true }))?.result?.value;

await send("Page.enable"); await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: MOBILE ? 2 : 1, mobile: MOBILE });
await send("Page.navigate", { url: "http://127.0.0.1:5174/index.html" });
await sleep(5000);
await evalJs(`document.documentElement.style.scrollBehavior='auto';`);

for (const [y, name] of SHOTS) {
  await evalJs(`scrollTo(0, ${y});`);
  await sleep(800);
  const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  writeFileSync(`预览\\${name}.png`, Buffer.from(r.data, "base64"));
  console.log("  saved", name, "@", y);
}
chrome.kill();
