import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { reactPeek } from "react-peek/vite";

export default defineConfig({
  plugins: [
    react(),
    reactPeek({ editor: "cursor" }),
  ],
});
