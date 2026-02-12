import { defineConfig } from "wxt";

export default defineConfig({
  outDir: "output",
  manifest: {
    name: "React Peek",
    description: "Cmd+hover to inspect React components, Cmd+Shift+Click to open source in editor",
    permissions: ["storage"],
    host_permissions: ["http://127.0.0.1/*", "http://localhost/*"],
    web_accessible_resources: [
      {
        resources: ["main-world.js"],
        matches: ["<all_urls>"],
      },
    ],
  },
});
