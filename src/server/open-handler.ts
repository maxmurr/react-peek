import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { resolveEditor, openInEditor } from "./editor";

export interface ReactPeekOptions {
	endpoint?: string;
	editor?: string;
}

const DEFAULT_ENDPOINT = "/__react-peek/open";

export const createOpenHandler = (
	rootDir: string,
	options?: ReactPeekOptions,
): (req: IncomingMessage, res: ServerResponse, next: () => void) => void => {
	const endpoint = options?.endpoint ?? DEFAULT_ENDPOINT;
	const editorInput = options?.editor ?? process.env.REACT_GREP_EDITOR;
	const resolved = editorInput ? resolveEditor(editorInput) : null;

	if (resolved) {
		console.log(`[react-peek] Using editor: ${resolved.bin}`);
	}

	return (req, res, next) => {
		if (!req.url?.startsWith(endpoint)) return next();

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
			: path.resolve(rootDir, file);
		const location = [resolvedPath, line, column].filter(Boolean).join(":");

		if (resolved) {
			openInEditor(resolved, location);
		} else {
			const launchEditor =
				require("launch-editor") as typeof import("launch-editor");
			launchEditor(location);
		}

		res.statusCode = 204;
		res.end();
	};
};
