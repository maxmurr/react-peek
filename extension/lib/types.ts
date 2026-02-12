export interface DebugSource {
  fileName: string;
  lineNumber: number;
  columnNumber?: number;
}

export interface Fiber {
  tag: number;
  type:
    | string
    | (Function & { displayName?: string })
    | { type: Function & { displayName?: string }; displayName?: string }
    | { render: Function & { displayName?: string }; displayName?: string }
    | null;
  return: Fiber | null;
  memoizedProps?: Record<string, unknown>;
  _debugSource?: DebugSource;
  _debugStack?: { stack?: string };
  _debugOwner?: Fiber | null;
}

export interface ComponentInfo {
  name: string;
  debugSource: DebugSource | null;
  fiber: Fiber;
}

export interface InspectorConfig {
  modifierKey?: "meta" | "alt" | "ctrl";
  onOpenEditor: (file: string, line: number, column?: number) => void;
  debug?: boolean;
}
