import fs from "node:fs";
import MagicString from "magic-string";

const PASCAL_CASE_RE = /^[A-Z][a-zA-Z0-9]*$/;

const DECLARATION_PATTERNS = [
  /^(?:export\s+)?(?:const|let|var)\s+([A-Z][a-zA-Z0-9]*)\s*=/,
  /^(?:export\s+(?:default\s+)?)?function\s+([A-Z][a-zA-Z0-9]*)\s*\(/,
  /^(?:export\s+(?:default\s+)?)?class\s+([A-Z][a-zA-Z0-9]*)\s/,
];

interface ComponentDeclaration {
  name: string;
  lineNumber: number;
  columnNumber: number;
}

const findComponentDeclarations = (code: string): ComponentDeclaration[] => {
  const declarations: ComponentDeclaration[] = [];
  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimStart();
    for (const pattern of DECLARATION_PATTERNS) {
      const match = trimmed.match(pattern);
      if (match && PASCAL_CASE_RE.test(match[1])) {
        const col = lines[i].indexOf(match[1]);
        declarations.push({
          name: match[1],
          lineNumber: i + 1,
          columnNumber: col,
        });
        break;
      }
    }
  }

  return declarations;
};

interface JsxElementPosition {
  tagName: string;
  insertOffset: number;
  lineNumber: number;
  columnNumber: number;
}

const HOST_TAG_RE = /^([a-z][a-zA-Z0-9]*)(?=[\s/>])/;
const COMPOSITE_TAG_RE = /^([A-Z][a-zA-Z0-9]*)(?=[\s/>])/;

const findJsxElements = (
  code: string,
  tagPattern: RegExp,
): JsxElementPosition[] => {
  const elements: JsxElementPosition[] = [];
  const len = code.length;
  let i = 0;
  let line = 1;
  let lineStart = 0;

  while (i < len) {
    const ch = code[i];

    if (ch === "\n") {
      line++;
      lineStart = i + 1;
      i++;
      continue;
    }

    if (ch === "/" && code[i + 1] === "/") {
      while (i < len && code[i] !== "\n") i++;
      continue;
    }

    if (ch === "/" && code[i + 1] === "*") {
      i += 2;
      while (i < len && !(code[i] === "*" && code[i + 1] === "/")) {
        if (code[i] === "\n") {
          line++;
          lineStart = i + 1;
        }
        i++;
      }
      i += 2;
      continue;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++;
      while (i < len && code[i] !== quote) {
        if (code[i] === "\\") i++;
        i++;
      }
      i++;
      continue;
    }

    if (ch === "`") {
      i++;
      while (i < len && code[i] !== "`") {
        if (code[i] === "\\") i++;
        if (code[i] === "\n") {
          line++;
          lineStart = i + 1;
        }
        i++;
      }
      i++;
      continue;
    }

    if (ch === "<") {
      const rest = code.substring(i + 1);
      const tagMatch = rest.match(tagPattern);
      if (tagMatch) {
        elements.push({
          tagName: tagMatch[1],
          insertOffset: i + 1 + tagMatch[1].length,
          lineNumber: line,
          columnNumber: i - lineStart,
        });
      }
    }

    i++;
  }

  return elements;
};

const SUPPORTED_EXTENSIONS = /\.(?:tsx|jsx|ts|js)$/;

export const transformComponentSource = (
  code: string,
  id: string,
): { code: string; map: ReturnType<MagicString["generateMap"]> } | null => {
  if (!SUPPORTED_EXTENSIONS.test(id)) return null;
  if (id.includes("node_modules")) return null;

  let originalSource: string;
  try {
    originalSource = fs.readFileSync(id, "utf-8");
  } catch {
    return null;
  }

  const declarations = findComponentDeclarations(originalSource);
  const codeHostEls = findJsxElements(code, HOST_TAG_RE);
  const origHostEls = findJsxElements(originalSource, HOST_TAG_RE);
  const codeCompositeEls = findJsxElements(code, COMPOSITE_TAG_RE);
  const origCompositeEls = findJsxElements(originalSource, COMPOSITE_TAG_RE);

  if (
    declarations.length === 0 &&
    origHostEls.length === 0 &&
    origCompositeEls.length === 0
  ) {
    return null;
  }

  const s = new MagicString(code);

  let oi = 0;
  for (const codeEl of codeHostEls) {
    while (oi < origHostEls.length && origHostEls[oi].tagName !== codeEl.tagName) {
      oi++;
    }
    if (oi >= origHostEls.length) break;
    const origEl = origHostEls[oi];
    s.appendLeft(
      codeEl.insertOffset,
      ` data-rgs="${origEl.lineNumber}:${origEl.columnNumber}"`,
    );
    oi++;
  }

  let ci = 0;
  for (const codeEl of codeCompositeEls) {
    while (ci < origCompositeEls.length && origCompositeEls[ci].tagName !== codeEl.tagName) {
      ci++;
    }
    if (ci >= origCompositeEls.length) break;
    const origEl = origCompositeEls[ci];
    s.appendLeft(
      codeEl.insertOffset,
      ` __rgs="${origEl.lineNumber}:${origEl.columnNumber}"`,
    );
    ci++;
  }

  if (declarations.length > 0) {
    const annotations = declarations
      .map(({ name, lineNumber, columnNumber }) => {
        const escaped = JSON.stringify(id);
        return (
          `\nif(typeof ${name}==="function")` +
          `${name}.__componentSource=` +
          `{fileName:${escaped},lineNumber:${lineNumber},columnNumber:${columnNumber}};`
        );
      })
      .join("");

    s.append(annotations);
  }

  return {
    code: s.toString(),
    map: s.generateMap({ hires: true }),
  };
};
