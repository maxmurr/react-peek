import { createUnplugin } from "unplugin";
import { transformComponentSource } from "./transform";
import type { ReactPeekOptions } from "./open-handler";

export const unplugin = createUnplugin((_options?: ReactPeekOptions) => ({
	name: "react-peek",
	transformInclude: (id: string) =>
		/\.(?:tsx|jsx|ts|js)$/.test(id) && !id.includes("node_modules"),
	transform: (code: string, id: string) => transformComponentSource(code, id),
}));
