# react-peek

Inspect React components and jump to their source code in your editor.

**Cmd+hover** to see component names and file paths. **Cmd+Shift+Click** to open the source file at the exact line.

## How It Works

React Peek comes in two flavors:

| | Build Plugin | Chrome Extension |
|---|---|---|
| **Setup** | Add to Vite/Webpack/Next.js config | Install extension + run companion server |
| **Source info** | Precise (compile-time annotations) | `_debugSource` (React 16-18) / `_debugStack` (React 19) |
| **Works on** | Your app only | Any React dev app |

## Option 1: Build Plugin

Add react-peek to your build tool for the best experience with precise source mapping.

### Vite

```bash
npm install react-peek --save-dev
```

```ts
// vite.config.ts
import react from "@vitejs/plugin-react";
import { reactPeek } from "react-peek/vite";

export default defineConfig({
  plugins: [react(), reactPeek()],
});
```

### Webpack

```ts
// webpack.config.js
const { reactPeek } = require("react-peek/webpack");

module.exports = {
  plugins: [reactPeek()],
};
```

### Next.js

```ts
// next.config.js
const { withReactPeek, registerReactPeek } = require("react-peek/next");

registerReactPeek(); // starts the editor server

module.exports = withReactPeek({
  // your next config
});
```

### Options

```ts
reactPeek({
  editor: "cursor", // cursor | code | webstorm | zed | windsurf | /path/to/binary
});
```

## Option 2: Chrome Extension

Works on **any** React app in dev mode without changing your build config.

### 1. Install the extension

Load the unpacked extension from `extension/output/chrome-mv3/` in `chrome://extensions` (enable Developer Mode).

### 2. Start the companion server

```bash
npx react-peek-server --editor cursor
```

Run this from your project root so relative file paths resolve correctly.

### 3. Use it

Open any React app running in dev mode, then:

- **Hold Cmd** (or Alt/Ctrl) to activate the inspector
- **Hover** over elements to see component names and source locations
- **Cmd+Shift+Click** to open the file in your editor

### Companion Server Options

```
react-peek-server [options]

Options:
  -e, --editor <name>   Editor: cursor, code, webstorm, zed, windsurf, or path
  -r, --root <path>     Project root for resolving relative paths (default: cwd)
  -p, --port <number>   Port to listen on (default: 51205)
  -h, --help            Show help
```

## Supported Editors

| Editor | Flag |
|---|---|
| Cursor | `cursor` |
| VS Code | `code` |
| WebStorm | `webstorm` |
| Zed | `zed` |
| Windsurf | `windsurf` |
| Custom | Full path to binary |

## Requirements

- **Build plugin**: React 16+, Vite 5+ / Webpack 5+ / Next.js 14+
- **Chrome extension**: React 16+ in development mode, Chrome/Chromium, Node.js 18+ (for companion server)

## License

MIT
