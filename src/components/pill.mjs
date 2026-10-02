/* components/pill.mjs — 胶囊按钮 / 标签 */

import { esc } from "../lib/html.mjs";
import { bi } from "../lib/i18n.mjs";

const ARROW = `<svg class="arrow" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="none"
  stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
  <path d="M2 6h8M6.5 2.5 10 6l-3.5 3.5"/></svg>`;

export const pill = ({ href, label, variant = "", external = true, arrow = true, dot = false }) => {
  const cls = ["pill", variant].filter(Boolean).join(" ");
  const attrs = href
    ? ` href="${esc(href)}"${external && /^https?:/.test(href) ? ' target="_blank" rel="noopener"' : ""}`
    : "";
  const tag = href ? "a" : "span";
  return `<${tag} class="${cls}"${attrs}>${dot ? '<span class="dot" aria-hidden="true"></span>' : ""}${esc(label)}${arrow && href ? ARROW : ""}</${tag}>`;
};

export const tag = (label, labelEn) => `<span class="tag"${bi(label, labelEn)}>${esc(label)}</span>`;

export const textLink = ({ href, label, external = true }) => `
  <a class="link" href="${esc(href)}"${external && /^https?:/.test(href) ? ' target="_blank" rel="noopener"' : ""}>
    ${esc(label)}${ARROW}</a>`;
