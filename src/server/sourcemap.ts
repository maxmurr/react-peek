import type { ViteDevServer } from "vite";
import path from "node:path";

export interface OriginalPosition {
	line: number;
	column: number;
}

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

export const decodeMappings = (mappings: string): number[][][] => {
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

export const resolveOriginalPosition = async (
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
