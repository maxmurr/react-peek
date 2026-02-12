import { modifierKey } from "../utils/storage";

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  async main() {
    let key: "meta" | "alt" | "ctrl" = "meta";
    try {
      key = await modifierKey.getValue();
    } catch {}

    const { script } = await injectScript("/main-world.js", {
      keepInDom: true,
      modifyScript(script) {
        script.dataset.modifierKey = key;
        script.addEventListener("react-peek-open", ((e: CustomEvent) => {
          const { file, line, column } = e.detail as {
            file: string;
            line: number;
            column?: number;
          };
          browser.runtime.sendMessage({
            type: "OPEN_EDITOR",
            file,
            line,
            column,
          });
        }) as EventListener);
      },
    });
  },
});
