export interface DebugSource {
  fileName: string;
  lineNumber: number;
  columnNumber?: number;
}

export interface ComponentSourceAnnotation {
  fileName: string;
  lineNumber: number;
  columnNumber: number;
}

export interface AnnotatedFunction extends Function {
  __componentSource?: ComponentSourceAnnotation;
  displayName?: string;
}

export interface Fiber {
  tag: number;
  type:
    | string
    | AnnotatedFunction
    | { type: AnnotatedFunction; displayName?: string }
    | { render: AnnotatedFunction; displayName?: string }
    | null;
  return: Fiber | null;
  memoizedProps?: Record<string, unknown>;
  _debugSource?: DebugSource;
  _debugOwner?: Fiber | null;
}

export interface ComponentInfo {
  name: string;
  debugSource: DebugSource | null;
  elementSource: DebugSource | null;
  isOriginalSource: boolean;
  fiber: Fiber;
}

export interface InspectorConfig {
  modifierKey?: "meta" | "alt" | "ctrl";
  endpoint?: string;
  debug?: boolean;
}
