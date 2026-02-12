import { companionUrl } from "../utils/storage";

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    (message: { type: string; file: string; line: number; column?: number }) => {
      if (message.type !== "OPEN_EDITOR") return;

      (async () => {
        const baseUrl = await companionUrl.getValue();
        const params = new URLSearchParams({
          file: message.file,
          line: String(message.line),
        });
        if (message.column != null) {
          params.set("column", String(message.column));
        }

        try {
          await fetch(`${baseUrl}/__react-peek/open?${params}`);
        } catch {
          console.warn(
            "[react-peek] Failed to reach companion server at",
            baseUrl,
            "- is react-peek-server running?",
          );
        }
      })();
    },
  );
});
