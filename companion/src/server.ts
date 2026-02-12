import http from "node:http";
import path from "node:path";
import { resolveEditor, openInEditor } from "./editor";

const ENDPOINT = "/__react-peek/open";

export interface ServerOptions {
  port: number;
  editor?: string;
  root?: string;
}

export const startServer = (options: ServerOptions): void => {
  const { port, editor: editorInput, root: rootDir } = options;
  const resolved = editorInput ? resolveEditor(editorInput) : null;

  if (rootDir) {
    console.log(`[react-peek] Project root: ${rootDir}`);
  }

  if (resolved) {
    console.log(`[react-peek] Using editor: ${resolved.bin}`);
  }

  const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (!req.url?.startsWith(ENDPOINT)) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }

    const url = new URL(req.url, "http://localhost");
    const file = url.searchParams.get("file");
    const line = url.searchParams.get("line");
    const column = url.searchParams.get("column");

    if (!file) {
      res.statusCode = 400;
      res.end("Missing ?file= parameter");
      return;
    }

    const resolvedPath = path.isAbsolute(file)
      ? file
      : path.resolve(rootDir ?? process.cwd(), file);
    const location = [resolvedPath, line, column].filter(Boolean).join(":");

    if (resolved) {
      openInEditor(resolved, location);
    } else {
      import("launch-editor").then((mod) => {
        const launchEditor = mod.default ?? mod;
        launchEditor(location);
      });
    }

    res.statusCode = 204;
    res.end();
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`[react-peek] Companion server listening on http://127.0.0.1:${port}`);
    console.log(`[react-peek] Endpoint: ${ENDPOINT}`);
  });
};
