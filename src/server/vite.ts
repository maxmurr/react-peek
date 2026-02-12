import type { Plugin, Connect } from "vite";
import path from "node:path";
import { resolveEditor, openInEditor } from "./editor";
import { createOpenHandler, type ReactPeekOptions } from "./open-handler";
import { resolveOriginalPosition } from "./sourcemap";
import { transformComponentSource } from "./transform";

const DEFAULT_ENDPOINT = "/__react-peek/open";

export const reactPeek = (options?: ReactPeekOptions): Plugin => {
	const endpoint = options?.endpoint ?? DEFAULT_ENDPOINT;
	const editorInput = options?.editor ?? process.env.REACT_GREP_EDITOR;
	const resolved = editorInput ? resolveEditor(editorInput) : null;

	return {
		name: "react-peek",
		apply: "serve",
		enforce: "pre",
		transform(code, id) {
			return transformComponentSource(code, id);
		},
		configureServer(server) {
			if (resolved) {
				console.log(`[react-peek] Using editor: ${resolved.bin}`);
			}

			server.middlewares.use((req, res, next) => {
				if (!req.url?.startsWith(endpoint)) return next();

				const url = new URL(req.url, "http://localhost");
				const file = url.searchParams.get("file");
				const line = url.searchParams.get("line");
				const column = url.searchParams.get("column");
				const isOriginal = url.searchParams.get("original") === "true";

				if (!file) {
					res.statusCode = 400;
					res.end("Missing ?file= parameter");
					return;
				}

				const resolvedPath = path.isAbsolute(file)
					? file
					: path.resolve(server.config.root, file);

				const openWithEditor = (location: string) => {
					if (resolved) {
						openInEditor(resolved, location);
					} else {
						const launchEditor =
							require("launch-editor") as typeof import("launch-editor");
						launchEditor(location);
					}
				};

				const transformedLine = Number(line) || 1;
				const transformedCol = Number(column) || 0;

				if (isOriginal) {
					const location = [resolvedPath, transformedLine, transformedCol]
						.filter(Boolean)
						.join(":");
					openWithEditor(location);
				} else {
					resolveOriginalPosition(
						server,
						resolvedPath,
						transformedLine,
						transformedCol,
					)
						.then((original) => {
							const finalLine = original?.line ?? transformedLine;
							const finalCol = original?.column ?? transformedCol;
							const location = [resolvedPath, finalLine, finalCol]
								.filter(Boolean)
								.join(":");
							openWithEditor(location);
						})
						.catch(() => {
							const location = [resolvedPath, line, column]
								.filter(Boolean)
								.join(":");
							openWithEditor(location);
						});
				}

				res.statusCode = 204;
				res.end();
			});
		},
	};
};

export const createMiddleware = (
	rootDir: string,
	options?: ReactPeekOptions,
): Connect.NextHandleFunction => {
	return createOpenHandler(rootDir, options) as Connect.NextHandleFunction;
};

export type { ReactPeekOptions };
