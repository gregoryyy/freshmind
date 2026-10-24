/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */
import type { Annotation } from "../model/index.js";

/** Returns an explicitly openable web/mail URL; legacy local paths remain stored, never rewritten. */
export function resourceURL(value: string): string | null {
  if (!value.trim()) return null;
  try {const url = new URL(value, document.baseURI); return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.href : null;} catch {return null;}
}

/** Renders retained annotation source through a small formatting/link allowlist; never copies active markup. */
export function renderAnnotation(container: HTMLElement, annotation: Annotation, onNodeLink?: (id: string) => void): void {
  container.replaceChildren();
  if (annotation.format === "text") { container.textContent = annotation.text; return; }
  const source = document.createElement("template"); source.innerHTML = annotation.text;
  const allowed = new Set(["P", "BR", "HR", "B", "I", "EM", "STRONG", "U", "UL", "OL", "LI", "PRE", "CODE", "BLOCKQUOTE", "H1", "H2", "H3", "H4", "H5", "H6", "A", "DIV", "SPAN"]);
  const blocked = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "SVG", "MATH", "TEMPLATE", "FORM", "INPUT", "BUTTON", "IMG", "VIDEO", "AUDIO", "LINK", "META", "BASE"]);
  const append = (node: globalThis.Node, parent: globalThis.Node): void => {
    if (node.nodeType === globalThis.Node.TEXT_NODE) {parent.appendChild(document.createTextNode(node.textContent ?? "")); return;}
    if (!(node instanceof Element) || blocked.has(node.tagName)) return;
    const target = allowed.has(node.tagName) ? document.createElement(node.tagName.toLowerCase()) : document.createDocumentFragment();
    if (target instanceof HTMLAnchorElement) {
      const href = node.getAttribute("href") ?? "";
      if (href.startsWith("#node=")) {
        try {const id = decodeURIComponent(href.slice(6)); target.href = "#"; target.addEventListener("click", event => {event.preventDefault(); onNodeLink?.(id);});} catch { /* Invalid links remain text. */ }
      } else {const url = resourceURL(href); if (url) {target.href = url; target.target = "_blank"; target.rel = "noopener noreferrer";}}
    }
    for (const child of node.childNodes) append(child, target);
    parent.appendChild(target);
  };
  for (const child of source.content.childNodes) append(child, container);
}
