import { Inspector } from "../lib/inspect";

export default defineUnlistedScript({
  main() {
    const script = document.currentScript as HTMLScriptElement | null;
    const modifierKey =
      (script?.dataset.modifierKey as "meta" | "alt" | "ctrl") ?? "meta";

    const inspector = new Inspector({
      modifierKey,
      onOpenEditor(file, line, column) {
        script?.dispatchEvent(
          new CustomEvent("react-peek-open", {
            detail: { file, line, column },
          }),
        );
      },
    });

    inspector.start();

    script?.addEventListener("react-peek-cleanup", () => {
      inspector.stop();
    });
  },
});
