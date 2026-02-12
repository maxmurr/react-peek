import type { Plugin, Connect, ViteDevServer } from "vite";
import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { transformComponentSource } from "./transform";

export interface ReactPeekOptions {
	endpoint?: string;
	editor?: string;
}

interface EditorDef {
	binary: string[];
	args: (location: string) => string[];
}

const DEFAULT_ENDPOINT = "/__react-peek/open";

const GOTO_EDITORS = new Set(["cursor", "code", "windsurf"]);

const DARWIN_EDITORS: Record<string, EditorDef> = {
	cursor: {
		binary: [
			"/Applications/Cursor.app/Contents/Resources/app/bin/cursor",
			`${process.env.HOME}/Applications/Cursor.app/Contents/Resources/app/bin/cursor`,
		],
		args: (loc) => ["--goto", loc],
	},
	code: {
		binary: [
			"/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code",
			`${process.env.HOME}/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code`,
		],
		args: (loc) => ["--goto", loc],
	},
	webstorm: {
		binary: [
			"/Applications/WebStorm.app/Contents/MacOS/webstorm",
			`${process.env.HOME}/Applications/WebStorm.app/Contents/MacOS/webstorm`,
		],
		args: (loc) => ["--line", loc.split(":")[1] ?? "1", loc.split(":")[0]],
	},
	zed: {
		binary: [
			"/Applications/Zed.app/Contents/MacOS/cli",
			`${process.env.HOME}/Applications/Zed.app/Contents/MacOS/cli`,
		],
		args: (loc) => [loc],
	},
	windsurf: {
		binary: [
			"/Applications/Windsurf.app/Contents/Resources/app/bin/windsurf",
			`${process.env.HOME}/Applications/Windsurf.app/Contents/Resources/app/bin/windsurf`,
		],
		args: (loc) => ["--goto", loc],
	},
};

const LINUX_EDITORS: Record<string, EditorDef> = {
	cursor: {
		binary: ["/usr/bin/cursor", "/usr/local/bin/cursor", "/snap/bin/cursor"],
		args: (loc) => ["--goto", loc],
	},
	code: {
		binary: ["/usr/bin/code", "/usr/local/bin/code", "/snap/bin/code"],
		args: (loc) => ["--goto", loc],
	},
	webstorm: {
		binary: [
			"/usr/bin/webstorm",
			"/usr/local/bin/webstorm",
			"/snap/bin/webstorm",
		],
		args: (loc) => ["--line", loc.split(":")[1] ?? "1", loc.split(":")[0]],
	},
	zed: {
		binary: ["/usr/bin/zed", "/usr/local/bin/zed"],
		args: (loc) => [loc],
	},
	windsurf: {
		binary: ["/usr/bin/windsurf", "/usr/local/bin/windsurf"],
		args: (loc) => ["--goto", loc],
	},
};

const PLATFORM_EDITORS =
	process.platform === "darwin" ? DARWIN_EDITORS : LINUX_EDITORS;

interface ResolvedEditor {
	bin: string;
	args: (location: string) => string[];
}

const resolveEditor = (editor: string): ResolvedEditor | null => {
	const name = editor.toLowerCase();
	const def = PLATFORM_EDITORS[name];

	if (def) {
		const bin = def.binary.find((p) => fs.existsSync(p));
		if (bin) return { bin, args: def.args };

		console.warn(
			`[react-peek] Could not find "${editor}" at known paths. ` +
				`Install the "${editor}" CLI command or pass a full path.`,
		);
		return null;
	}

	if (editor.startsWith("/") || editor.startsWith("~")) {
		const needsGoto = GOTO_EDITORS.has(
			path
				.basename(editor)
				.toLowerCase()
				.replace(/\.exe$/, ""),
		);
		return {
			bin: editor,
			args: needsGoto ? (loc) => ["--goto", loc] : (loc) => [loc],
		};
	}

	return { bin: editor, args: (loc) => [loc] };
};

const openInEditor = (resolved: ResolvedEditor, location: string) => {
	const args = resolved.args(location);
	console.log(`[react-peek] Opening: ${resolved.bin} ${args.join(" ")}`);
	const child = spawn(resolved.bin, args, { stdio: "ignore", detached: true });
	child.unref();
	child.on("error", (err) => {
		console.error(`[react-peek] Failed to open editor: ${err.message}`);
	});
};

interface OriginalPosition {
	line: number;
	column: number;
}

const resolveOriginalPosition = async (
	server: ViteDevServer,
	filePath: string,
	line: number,
	column: number,
): Promise<OriginalPosition | null> => {
	const relativeUrl =
		"/" + path.relative(server.config.root, filePath).replace(/\\/g, "/");
	const mod = server.moduleGraph.getModuleById(filePath);

	const url = mod?.url ?? relativeUrl;
	const result = await server.transformRequest(url);
	if (!result?.map) return null;

	const mappings =
		typeof result.map.mappings === "string" ? result.map.mappings : "";
	if (!mappings) return null;

	const decoded = decodeMappings(mappings);
	let closest: OriginalPosition | null = null;

	for (const [genLine, segments] of decoded.entries()) {
		const genLineNum = genLine + 1;
		if (genLineNum > line) break;

		for (const seg of segments) {
			if (seg.length < 4) continue;
			const segCol = seg[0];
			const origLine = seg[2] + 1;
			const origCol = seg[3];

			if (genLineNum === line && segCol <= column) {
				closest = { line: origLine, column: origCol };
			} else if (genLineNum < line) {
				closest = { line: origLine, column: origCol };
			}
		}
	}

	return closest;
};

const VLQ_CHARS =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const VLQ_LOOKUP = new Map(VLQ_CHARS.split("").map((c, i) => [c, i]));

const decodeVLQ = (encoded: string, pos: { i: number }): number => {
	let result = 0;
	let shift = 0;
	let cont = true;
	while (cont && pos.i < encoded.length) {
		const val = VLQ_LOOKUP.get(encoded[pos.i++])!;
		cont = (val & 32) !== 0;
		result += (val & 31) << shift;
		shift += 5;
	}
	return result & 1 ? -(result >> 1) : result >> 1;
};

const decodeMappings = (mappings: string): number[][][] => {
	const lines: number[][][] = [];
	let sourceIndex = 0;
	let sourceLine = 0;
	let sourceColumn = 0;
	let nameIndex = 0;

	for (const line of mappings.split(";")) {
		const segments: number[][] = [];
		let generatedColumn = 0;

		if (line) {
			for (const segment of line.split(",")) {
				if (!segment) continue;
				const pos = { i: 0 };
				const fields: number[] = [];

				generatedColumn += decodeVLQ(segment, pos);
				fields.push(generatedColumn);

				if (pos.i < segment.length) {
					sourceIndex += decodeVLQ(segment, pos);
					fields.push(sourceIndex);
					sourceLine += decodeVLQ(segment, pos);
					fields.push(sourceLine);
					sourceColumn += decodeVLQ(segment, pos);
					fields.push(sourceColumn);

					if (pos.i < segment.length) {
						nameIndex += decodeVLQ(segment, pos);
						fields.push(nameIndex);
					}
				}

				segments.push(fields);
			}
		}

		lines.push(segments);
	}

	return lines;
};

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
	const endpoint = options?.endpoint ?? DEFAULT_ENDPOINT;
	const editorInput = options?.editor ?? process.env.REACT_GREP_EDITOR;
	const resolved = editorInput ? resolveEditor(editorInput) : null;

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
