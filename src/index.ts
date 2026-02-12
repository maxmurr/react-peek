import { Inspector } from "./core/inspect";
import type { InspectorConfig } from "./types";

export type { InspectorConfig, ComponentInfo, DebugSource } from "./types";

let instance: Inspector | null = null;

export const initInspector = (config?: InspectorConfig): void => {
  if (instance) {
    instance.stop();
  }
  instance = new Inspector(config);
  instance.start();
};

export const destroyInspector = (): void => {
  instance?.stop();
  instance = null;
};

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initInspector(), { once: true });
  } else {
    initInspector();
  }
}
