import { startServer } from "./server";

const DEFAULT_PORT = 51205;

const parseArgs = (
  argv: string[],
): { port: number; editor?: string; root?: string } => {
  let port = DEFAULT_PORT;
  let editor: string | undefined;
  let root: string | undefined;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if ((arg === "--port" || arg === "-p") && argv[i + 1]) {
      port = Number(argv[i + 1]);
      i++;
    } else if ((arg === "--editor" || arg === "-e") && argv[i + 1]) {
      editor = argv[i + 1];
      i++;
    } else if ((arg === "--root" || arg === "-r") && argv[i + 1]) {
      root = argv[i + 1];
      i++;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
react-peek-server — Companion server for the React Peek Chrome extension

Usage:
  react-peek-server [options]

Options:
  -p, --port <number>   Port to listen on (default: ${DEFAULT_PORT})
  -e, --editor <name>   Editor to use (cursor, code, webstorm, zed, windsurf, or path)
  -r, --root <path>     Project root for resolving relative paths (default: cwd)
  -h, --help            Show this help message
`);
      process.exit(0);
    }
  }

  return { port, editor, root };
};

const options = parseArgs(process.argv);
startServer(options);
