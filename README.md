# DejaView

DejaView gives AI coding agents a small, fixed visual vocabulary: the same kind of
information always renders the same way. The agent sends compact JSON, DejaView fills a
fixed template, and you get a consistent, readable diagram every time. The model never
writes HTML, so there's no layout drift, no broken markup and far fewer tokens.

**Status:** early: one visual type so far (sequence diagrams).

## Add it to Claude Code

```sh
claude mcp add dejaview -- npx -y dejaview-mcp
```

Other MCP clients can run the same command over stdio:

```json
{
  "mcpServers": {
    "dejaview": { "command": "npx", "args": ["-y", "dejaview-mcp"] }
  }
}
```

Requires Node.js 18 or later.

## Tool: `show_sequence`

For questions about who calls whom and in what order: request flows, call chains,
protocols. Not for simple facts.

| Field          | Type                    | Rules                                                              |
| -------------- | ----------------------- | ------------------------------------------------------------------ |
| `title`        | string                  | required, 1–80 characters                                          |
| `participants` | string[]                | required, 2–12 unique, non-empty names                             |
| `steps`        | `{ from, to, label }[]` | required, 1–40 steps; `from` and `to` must be participants; `label` up to 60 characters |

Any other key is rejected.

```json
{
  "title": "Login flow",
  "participants": ["Browser", "API", "DB"],
  "steps": [
    { "from": "Browser", "to": "API", "label": "POST /login" },
    { "from": "API", "to": "DB", "label": "SELECT user" },
    { "from": "DB", "to": "API", "label": "row" },
    { "from": "API", "to": "Browser", "label": "200 + session cookie" }
  ]
}
```

DejaView saves a self-contained HTML file to
`~/.dejaview/diagrams/<YYYYMMDD-HHMMSS>-<slug>.html` and replies with a text sketch and
the file path:

```
Browser -> API: POST /login
API -> DB: SELECT user
DB -> API: row
API -> Browser: 200 + session cookie

Diagram: /home/you/.dejaview/diagrams/20261011-143005-login-flow.html
```

The page follows your system's light or dark mode. All user text is HTML-escaped and
Mermaid-escaped, so labels can't break the diagram or inject markup.

## Privacy

No telemetry, no data collection. The server itself makes no network calls; it only
writes files under `~/.dejaview/`. The generated page loads Mermaid from the jsDelivr CDN
when you open it in a browser.

## Roadmap

- State machine
- Comparison table
- Before/after
- Schema
- Callouts

## Development

```sh
npm install
npm test        # node:test via tsx
npm run build   # tsc -> dist/
```

## License

Licensed under the [Apache License 2.0](LICENSE).

The name "DejaView" is not licensed for use by forks. If you distribute a modified
version, please give it a different name.
