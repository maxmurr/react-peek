import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm", "cjs"],
    dts: true,
    outExtension: ({ format }) => ({
      js: format === "esm" ? ".mjs" : ".cjs",
    }),
    platform: "browser",
    clean: true,
  },
  {
    entry: { server: "src/server/middleware.ts" },
    format: ["esm", "cjs"],
    dts: true,
    outExtension: ({ format }) => ({
      js: format === "esm" ? ".mjs" : ".cjs",
    }),
    platform: "node",
    external: ["vite", "launch-editor", "magic-string"],
  },
]);
