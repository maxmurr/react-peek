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
    entry: {
      server: "src/server/middleware.ts",
      vite: "src/server/vite.ts",
      webpack: "src/server/webpack.ts",
      next: "src/server/next.ts",
      loader: "src/server/loader.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    outExtension: ({ format }) => ({
      js: format === "esm" ? ".mjs" : ".cjs",
    }),
    platform: "node",
    external: ["vite", "webpack", "next", "launch-editor", "magic-string"],
  },
]);
