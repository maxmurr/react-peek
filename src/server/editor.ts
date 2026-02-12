import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";

export interface EditorDef {
	binary: string[];
	args: (location: string) => string[];
}

export interface ResolvedEditor {
	bin: string;
	args: (location: string) => string[];
}

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

export const resolveEditor = (editor: string): ResolvedEditor | null => {
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

export const openInEditor = (resolved: ResolvedEditor, location: string): void => {
	const args = resolved.args(location);
	console.log(`[react-peek] Opening: ${resolved.bin} ${args.join(" ")}`);
	const child = spawn(resolved.bin, args, { stdio: "ignore", detached: true });
	child.unref();
	child.on("error", (err) => {
		console.error(`[react-peek] Failed to open editor: ${err.message}`);
	});
};
