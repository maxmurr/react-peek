import type { ComponentInfo, DebugSource, Fiber } from "./types";

const FUNCTION_COMPONENT_TAG = 0;
const CLASS_COMPONENT_TAG = 1;
const FORWARD_REF_TAG = 11;
const MEMO_TAG = 14;
const SIMPLE_MEMO_TAG = 15;

const COMPOSITE_TAGS = new Set([
  FUNCTION_COMPONENT_TAG,
  CLASS_COMPONENT_TAG,
  FORWARD_REF_TAG,
  MEMO_TAG,
  SIMPLE_MEMO_TAG,
]);

export const getFiberFromElement = (el: Element): Fiber | null => {
  const key = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
  if (!key) return null;
  return (el as unknown as Record<string, unknown>)[key] as Fiber;
};

export const getCompositeComponentFiber = (fiber: Fiber): Fiber | null => {
  let current: Fiber | null = fiber;
  while (current) {
    if (COMPOSITE_TAGS.has(current.tag)) {
      return current;
    }
    current = current.return;
  }
  return null;
};

const getInnerFunction = (
  type: Fiber["type"],
): (Function & { displayName?: string }) | null => {
  if (typeof type === "function") return type as Function & { displayName?: string };
  if (type && typeof type === "object") {
    if ("render" in type && typeof type.render === "function") {
      return type.render as Function & { displayName?: string };
    }
    if ("type" in type && typeof type.type === "function") {
      return type.type as Function & { displayName?: string };
    }
  }
  return null;
};

export const getComponentName = (fiber: Fiber): string => {
  const { type } = fiber;
  if (typeof type === "function") {
    return (type as Function & { displayName?: string }).displayName || type.name || "Anonymous";
  }
  if (type && typeof type === "object") {
    if ("displayName" in type && type.displayName) {
      return type.displayName;
    }
    const inner = getInnerFunction(type);
    if (inner) {
      return inner.displayName || inner.name || "Anonymous";
    }
  }
  return "Anonymous";
};

const SKIP_FRAMES = new Set([
  "jsxDEV",
  "jsxs",
  "jsx",
  "react-stack-top-frame",
  "react_stack_bottom_frame",
]);

const FRAME_RE = /at (?:(\S+) )?\(?(.+):(\d+):(\d+)\)?$/;

const parseDebugStack = (fiber: Fiber): DebugSource | null => {
  const stack = fiber._debugStack?.stack;
  if (!stack) return null;

  const lines = stack.split("\n");
  for (const line of lines) {
    const match = FRAME_RE.exec(line.trim());
    if (!match) continue;

    const [, fnName, url, lineStr, colStr] = match;
    if (fnName && SKIP_FRAMES.has(fnName)) continue;
    if (url.includes("/node_modules/")) continue;

    let fileName = url;
    try {
      const parsed = new URL(url);
      fileName = decodeURIComponent(parsed.pathname);
      const qIdx = fileName.indexOf("?");
      if (qIdx !== -1) fileName = fileName.substring(0, qIdx);
    } catch {}

    if (fileName.startsWith("/")) fileName = fileName.substring(1);

    return {
      fileName,
      lineNumber: Number(lineStr),
      columnNumber: Number(colStr),
    };
  }

  return null;
};

export const getDebugSource = (fiber: Fiber): DebugSource | null => {
  if (fiber._debugSource) return fiber._debugSource;
  if (fiber._debugOwner?._debugSource) return fiber._debugOwner._debugSource;

  const fromStack = parseDebugStack(fiber);
  if (fromStack) return fromStack;

  if (fiber._debugOwner) {
    const ownerStack = parseDebugStack(fiber._debugOwner);
    if (ownerStack) return ownerStack;
  }

  return null;
};

export const getComponentInfo = (el: Element): ComponentInfo | null => {
  const fiber = getFiberFromElement(el);
  if (!fiber) return null;

  const composite = getCompositeComponentFiber(fiber);
  if (!composite) return null;

  const owner = fiber._debugOwner;
  const ownerIsParent =
    owner != null && owner !== composite && COMPOSITE_TAGS.has(owner.tag);

  const target = ownerIsParent ? owner : composite;

  return {
    name: getComponentName(target),
    debugSource: getDebugSource(target),
    fiber: target,
  };
};
