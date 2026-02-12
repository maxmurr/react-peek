# react-peek-server

Companion server for the [React Peek](https://github.com/maxmurr/react-peek) Chrome extension. Receives "open file" requests from the extension and opens source files in your editor.

## Usage

Run from your project root:

```bash
npx react-peek-server --editor cursor
```

The server starts on `http://127.0.0.1:51205` and listens for requests from the React Peek Chrome extension.

## Options

```
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
| Custom | Full path to binary (e.g. `/usr/local/bin/code`) |

If no `--editor` is specified, falls back to [`launch-editor`](https://github.com/nicknisi/launch-editor) auto-detection.

## How It Works

1. You hold **Cmd** and **Shift+Click** a component in the browser
2. The React Peek Chrome extension sends an HTTP request to this server
3. The server resolves the file path and opens it in your editor at the correct line

## License

MIT
