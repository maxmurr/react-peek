import type { IncomingMessage, ServerResponse } from "node:http";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createOpenHandler, type ReactPeekOptions } from "./open-handler";

export interface ReactPeekNextOptions extends ReactPeekOptions {
	port?: number;
}

interface NextConfig {
	webpack?: (config: WebpackConfig, context: WebpackContext) => WebpackConfig;
	env?: Record<string, string>;
	[key: string]: unknown;
}

interface WebpackConfig {
	module: {
		rules: WebpackRule[];
	};
	[key: string]: unknown;
}

interface WebpackRule {
	test?: RegExp;
	exclude?: RegExp;
	use?: string | string[];
	[key: string]: unknown;
}

interface WebpackContext {
	dev: boolean;
	isServer: boolean;
	[key: string]: unknown;
}

const DEFAULT_PORT = 51205;

const getLoaderPath = (): string => {
	const dir =
		typeof __dirname !== "undefined"
			? __dirname
			: path.dirname(fileURLToPath(import.meta.url));
	return path.resolve(dir, "loader.cjs");
};

export const withReactPeek = (
	options?: ReactPeekNextOptions,
): ((nextConfig: NextConfig) => NextConfig) => {
	const port = options?.port ?? DEFAULT_PORT;

	return (nextConfig: NextConfig): NextConfig => ({
		...nextConfig,
		env: {
			...nextConfig.env,
			NEXT_PUBLIC_REACT_PEEK_PORT: String(port),
		},
		webpack: (config: WebpackConfig, context: WebpackContext) => {
			if (context.dev) {
				config.module.rules.push({
					test: /\.(?:tsx|jsx|ts|js)$/,
					exclude: /node_modules/,
					use: getLoaderPath(),
				});
			}

			if (nextConfig.webpack) {
				return nextConfig.webpack(config, context);
			}
			return config;
		},
	});
};

let editorServer: http.Server | null = null;

export const registerReactPeek = (options?: ReactPeekNextOptions): void => {
	if (editorServer) return;

	const port = options?.port ?? DEFAULT_PORT;
	const rootDir = process.cwd();
	const handler = createOpenHandler(rootDir, options);

	editorServer = http.createServer(
		(req: IncomingMessage, res: ServerResponse) => {
			res.setHeader("Access-Control-Allow-Origin", "*");
			res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
			if (req.method === "OPTIONS") {
				res.statusCode = 204;
				res.end();
				return;
			}
			handler(req, res, () => {
				res.statusCode = 404;
				res.end();
			});
		},
	);

	editorServer.listen(port, "127.0.0.1", () => {
		console.log(`[react-peek] Editor server listening on http://127.0.0.1:${port}`);
	});
};

export type { ReactPeekOptions };
