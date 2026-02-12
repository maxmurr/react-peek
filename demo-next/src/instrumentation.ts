export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		const { registerReactPeek } = await import("react-peek/next");
		registerReactPeek({ editor: "cursor" });
	}
}
