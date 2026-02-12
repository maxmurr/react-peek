import { transformComponentSource } from "./transform";

export default function reactPeekLoader(this: { resourcePath: string }, source: string): string {
	const result = transformComponentSource(source, this.resourcePath);
	return result ? result.code : source;
}
