import type {
  AnnotatedFunction,
  ComponentInfo,
  ComponentSourceAnnotation,
  DebugSource,
  Fiber,
} from "../types";

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
): AnnotatedFunction | null => {
  if (typeof type === "function") return type as AnnotatedFunction;
  if (type && typeof type === "object") {
    if ("render" in type && typeof type.render === "function") {
      return type.render as AnnotatedFunction;
    }
    if ("type" in type && typeof type.type === "function") {
      return type.type as AnnotatedFunction;
    }
  }
  return null;
};

export const getComponentName = (fiber: Fiber): string => {
  const { type } = fiber;
  if (typeof type === "function") {
    return (type as AnnotatedFunction).displayName || type.name || "Anonymous";
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

const getComponentSource = (
  fiber: Fiber,
): ComponentSourceAnnotation | null => {
  const inner = getInnerFunction(fiber.type);
  return inner?.__componentSource ?? null;
};

const getDebugSource = (fiber: Fiber): DebugSource | null => {
  if (fiber._debugSource) return fiber._debugSource;
  if (fiber._debugOwner?._debugSource) return fiber._debugOwner._debugSource;
  return null;
};

const parseElementSource = (
  el: Element,
  fileName: string | undefined,
): DebugSource | null => {
  const attr = el.getAttribute("data-rgs");
  if (!attr || !fileName) return null;
  const sep = attr.indexOf(":");
  const line = Number(attr.substring(0, sep));
  const col = Number(attr.substring(sep + 1));
  return line > 0 ? { fileName, lineNumber: line, columnNumber: col } : null;
};

export const getComponentInfo = (el: Element): ComponentInfo | null => {
  const fiber = getFiberFromElement(el);
  if (!fiber) return null;

  const composite = getCompositeComponentFiber(fiber);
  if (!composite) return null;

  const owner = fiber._debugOwner;
  const ownerIsParent =
    owner != null && owner !== composite && COMPOSITE_TAGS.has(owner.tag);

  let target = ownerIsParent ? owner : composite;
  let usageSource: DebugSource | null = null;

  if (
    !ownerIsParent &&
    target.memoizedProps?.children != null &&
    target._debugOwner &&
    COMPOSITE_TAGS.has(target._debugOwner.tag)
  ) {
    const rgs = target.memoizedProps.__rgs;
    const parentSource = getComponentSource(target._debugOwner);
    if (typeof rgs === "string" && parentSource) {
      const sep = rgs.indexOf(":");
      const line = Number(rgs.substring(0, sep));
      const col = Number(rgs.substring(sep + 1));
      if (line > 0) {
        usageSource = {
          fileName: parentSource.fileName,
          lineNumber: line,
          columnNumber: col,
        };
      }
    }
    target = target._debugOwner;
  }

  const componentSource = getComponentSource(target);
  const debugSourceForFile =
    componentSource ?? fiber._debugSource ?? getDebugSource(target);

  const elementSource =
    usageSource ?? parseElementSource(el, debugSourceForFile?.fileName);

  const useElementSource =
    elementSource != null &&
    componentSource != null &&
    elementSource.lineNumber >= componentSource.lineNumber;

  if (componentSource) {
    return {
      name: getComponentName(target),
      debugSource: {
        fileName: componentSource.fileName,
        lineNumber: componentSource.lineNumber,
        columnNumber: componentSource.columnNumber,
      },
      elementSource: useElementSource ? elementSource : null,
      isOriginalSource: true,
      fiber: target,
    };
  }

  return {
    name: getComponentName(target),
    debugSource: getDebugSource(target),
    elementSource,
    isOriginalSource: false,
    fiber: target,
  };
};
