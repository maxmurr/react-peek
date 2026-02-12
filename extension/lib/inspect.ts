import type { InspectorConfig } from "./types";
import { getComponentInfo } from "./fiber";
import { OverlayManager } from "./overlay";

const MODIFIER_KEY_MAP = {
  meta: "Meta",
  alt: "Alt",
  ctrl: "Control",
} as const;

export class Inspector {
  private active = false;
  private overlay = new OverlayManager();
  private config: Required<InspectorConfig>;
  private modifierKeyValue: string;
  private boundHandlers: {
    keydown: (e: KeyboardEvent) => void;
    keyup: (e: KeyboardEvent) => void;
    mousemove: (e: MouseEvent) => void;
    click: (e: MouseEvent) => void;
  };

  constructor(config: InspectorConfig) {
    this.config = {
      modifierKey: config.modifierKey ?? "meta",
      onOpenEditor: config.onOpenEditor,
      debug: config.debug ?? false,
    };
    this.modifierKeyValue = MODIFIER_KEY_MAP[this.config.modifierKey];

    this.boundHandlers = {
      keydown: this.handleKeyDown.bind(this),
      keyup: this.handleKeyUp.bind(this),
      mousemove: this.handleMouseMove.bind(this),
      click: this.handleClick.bind(this),
    };
  }

  start() {
    window.addEventListener("keydown", this.boundHandlers.keydown);
    window.addEventListener("keyup", this.boundHandlers.keyup);
    window.addEventListener("mousemove", this.boundHandlers.mousemove);
    window.addEventListener("click", this.boundHandlers.click, true);
    this.log("Inspector started");
  }

  stop() {
    this.deactivate();
    window.removeEventListener("keydown", this.boundHandlers.keydown);
    window.removeEventListener("keyup", this.boundHandlers.keyup);
    window.removeEventListener("mousemove", this.boundHandlers.mousemove);
    window.removeEventListener("click", this.boundHandlers.click, true);
    this.overlay.destroy();
    this.log("Inspector stopped");
  }

  private activate() {
    if (this.active) return;
    this.active = true;
    this.overlay.init();
    document.body.style.cursor = "crosshair";
  }

  private deactivate() {
    if (!this.active) return;
    this.active = false;
    this.overlay.hide();
    document.body.style.cursor = "";
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === this.modifierKeyValue) {
      this.activate();
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    if (e.key === this.modifierKeyValue) {
      this.deactivate();
    }
  }

  private handleMouseMove(e: MouseEvent) {
    if (!this.active) return;

    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target || target.closest("[data-react-peek]")) return;

    const info = getComponentInfo(target);
    if (!info) {
      this.overlay.hide();
      return;
    }

    const filePath = info.debugSource
      ? `${info.debugSource.fileName}:${info.debugSource.lineNumber}`
      : undefined;

    this.overlay.show(target, info.name, filePath);
    this.log("Component:", info.name, filePath ?? "(no source)");
  }

  private handleClick(e: MouseEvent) {
    if (!this.active || !e.shiftKey) return;

    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target || target.closest("[data-react-peek]")) return;

    const info = getComponentInfo(target);
    if (!info?.debugSource) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const { fileName, lineNumber, columnNumber } = info.debugSource;
    this.config.onOpenEditor(fileName, lineNumber, columnNumber);
    this.log("Opening:", fileName, `line ${lineNumber}`);
  }

  private log(...args: unknown[]) {
    if (this.config.debug) {
      console.log("[react-peek]", ...args);
    }
  }
}
