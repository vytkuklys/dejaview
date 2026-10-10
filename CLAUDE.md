# DejaView

MCP server (`dejaview-mcp` on npm) with one tool, `show_sequence`: compact JSON in, a fixed
HTML template out. The model never writes HTML; every new visual type follows that shape.

## Releasing

Before touching versions, `package.json` name/bin, `.github/workflows/`, or anything on npm
or GitHub settings: read `RELEASING.md`. Versions are single-use and the trusted publisher
is pinned to file and environment names.

## Hard rules

- The maintainer publishes, commits and pushes. Leave changes uncommitted and say what
  is ready, unless explicitly asked in the current message.
- The version lives in two places: `package.json` and `src/server.ts`. Change both together.
- Escaping is the security boundary: every user string goes through `escapeMermaid` and then
  `escapeHtml` in `src/render.ts`. Keep the injection tests in `test/render.test.ts` passing
  and extend them for any new field.
- The server makes no network calls and collects no data (stated in the README). The only
  network access is the browser loading Mermaid from jsDelivr when a user opens a diagram.
- `src/render.ts` stays pure; file and network I/O belong in `src/server.ts`.

## Checking a change

`npm run build && npm test`, then `npm pack --dry-run` when `files`, `bin` or templates change.
To see a diagram, render with headless Chrome:
`google-chrome --headless=new --virtual-time-budget=20000 --screenshot=out.png file://<html>`.
A short budget screenshots the raw Mermaid text before the CDN script loads.
