/* ============================================================
   lib/html.mjs — 字符串拼接与转义工具
   纯函数，无依赖。
   ============================================================ */

const ENT = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** HTML 转义。所有插进模板的数据都要过这一层。 */
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ENT[c]);

/** 过滤掉空值再拼接，省掉一堆三元表达式 */
export const join = (arr, sep = "") => (arr ?? []).filter(Boolean).join(sep);

/** 数字加千分位；非数字原样返回 */
export const num = (n) =>
  typeof n === "number" ? n.toLocaleString("en-US") : String(n ?? "—");

/** 把 & / < / > 转成 JSON 里的 unicode 转义，避免内联 JSON 里出现 </script> */
export const embedJson = (obj) =>
  JSON.stringify(obj).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e").replaceAll("&", "\\u0026");

/** class 名拼接，过滤假值 */
export const cx = (...parts) => parts.filter(Boolean).join(" ");

/**
 * 渲染一段「大数字」。data-to 交给前端做滚动计数；
 * 无 JS 时 <noscript> 之外也能看到终值，因为初始文本就是终值。
 */
export const statNum = ({ value, unit, to, plain = false }) => {
  const target = to === undefined ? value : to;
  const countable = typeof target === "number";
  const text = countable ? num(target) : esc(target);
  const small = unit ? `<small>${esc(unit)}</small>` : "";
  return countable
    ? `<span class="stat-num${plain ? " is-plain" : ""}" data-to="${target}" data-unit="${esc(unit ?? "")}">${text}${small}</span>`
    : `<span class="stat-num${plain ? " is-plain" : ""}">${text}${small}</span>`;
};
