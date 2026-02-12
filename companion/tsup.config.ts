import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/bin.ts"],
  format: ["esm"],
  outDir: "dist",
  platform: "node",
  target: "node18",
  clean: true,
  banner: { js: "#!/usr/bin/env node" },
  external: ["launch-editor"],
});
