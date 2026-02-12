const HIGHLIGHT_STYLES: Partial<CSSStyleDeclaration> = {
  position: "fixed",
  pointerEvents: "none",
  zIndex: "2147483646",
  backgroundColor: "rgba(66, 135, 245, 0.15)",
  border: "1.5px solid rgba(66, 135, 245, 0.6)",
  borderRadius: "3px",
  display: "none",
  transition: "all 50ms ease-out",
};

const TOOLTIP_STYLES: Partial<CSSStyleDeclaration> = {
  position: "fixed",
  pointerEvents: "none",
  zIndex: "2147483647",
  display: "none",
  fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace",
  fontSize: "12px",
  lineHeight: "1.4",
  color: "#e4e4e7",
  backgroundColor: "#18181b",
  border: "1px solid #3f3f46",
  borderRadius: "6px",
  padding: "4px 8px",
  whiteSpace: "nowrap",
  maxWidth: "500px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
};

const applyStyles = (el: HTMLElement, styles: Partial<CSSStyleDeclaration>) => {
  Object.assign(el.style, styles);
};

export class OverlayManager {
  private highlight: HTMLDivElement | null = null;
  private tooltip: HTMLDivElement | null = null;

  init() {
    if (this.highlight) return;

    this.highlight = document.createElement("div");
    this.highlight.dataset.reactPeek = "highlight";
    applyStyles(this.highlight, HIGHLIGHT_STYLES);
    document.body.appendChild(this.highlight);

    this.tooltip = document.createElement("div");
    this.tooltip.dataset.reactPeek = "tooltip";
    applyStyles(this.tooltip, TOOLTIP_STYLES);
    document.body.appendChild(this.tooltip);
  }

  show(el: Element, name: string, filePath?: string) {
    if (!this.highlight || !this.tooltip) return;

    const rect = el.getBoundingClientRect();

    this.highlight.style.top = `${rect.top}px`;
    this.highlight.style.left = `${rect.left}px`;
    this.highlight.style.width = `${rect.width}px`;
    this.highlight.style.height = `${rect.height}px`;
    this.highlight.style.display = "block";

    const nameSpan = `<span style="color:#93c5fd;font-weight:600">${escapeHtml(name)}</span>`;
    const fileSpan = filePath
      ? ` <span style="color:#71717a">${escapeHtml(truncatePath(filePath))}</span>`
      : "";
    this.tooltip.innerHTML = nameSpan + fileSpan;

    const tooltipRect = this.tooltip.getBoundingClientRect();
    let top = rect.top - tooltipRect.height - 6;
    let left = rect.left;

    if (top < 4) {
      top = rect.bottom + 6;
    }
    if (left + tooltipRect.width > window.innerWidth - 4) {
      left = window.innerWidth - tooltipRect.width - 4;
    }

    this.tooltip.style.top = `${top}px`;
    this.tooltip.style.left = `${Math.max(4, left)}px`;
    this.tooltip.style.display = "block";
  }

  hide() {
    if (this.highlight) this.highlight.style.display = "none";
    if (this.tooltip) this.tooltip.style.display = "none";
  }

  destroy() {
    this.highlight?.remove();
    this.tooltip?.remove();
    this.highlight = null;
    this.tooltip = null;
  }
}

const truncatePath = (filePath: string): string => {
  const parts = filePath.split("/");
  if (parts.length <= 3) return filePath;
  return `.../${parts.slice(-3).join("/")}`;
};

const escapeHtml = (str: string): string =>
  str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
