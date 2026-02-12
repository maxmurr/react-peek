import type { IncomingMessage, ServerResponse } from "node:http";
import { unplugin } from "./unplugin";
import { createOpenHandler, type ReactPeekOptions } from "./open-handler";

export const reactPeekWebpack = (options?: ReactPeekOptions): unknown =>
	unplugin.webpack(options);

export const reactPeekDevServerMiddleware = (
	rootDir: string,
	options?: ReactPeekOptions,
): (req: IncomingMessage, res: ServerResponse, next: () => void) => void =>
	createOpenHandler(rootDir, options);

export type { ReactPeekOptions };
