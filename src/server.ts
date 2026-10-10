#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { renderSequence, sketch, slugify, timestamp } from "./render.js";
import { SequenceInputSchema } from "./schema.js";

const TEMPLATE_URL = new URL("../templates/sequence.html", import.meta.url);
const OUTPUT_DIR = join(homedir(), ".dejaview", "diagrams");

const server = new McpServer({ name: "dejaview", version: "0.0.1" });

server.registerTool(
  "show_sequence",
  {
    title: "Show sequence diagram",
    description:
      "Use for questions about who calls whom and in what order (request flows, call chains, " +
      "protocols). Do not use for simple facts. Renders a sequence diagram to a self-contained " +
      "HTML file and returns a plain-text sketch plus the file path.",
    inputSchema: SequenceInputSchema,
  },
  async (raw) => {
    // The SDK validates against the schema too; parse again so this handler never
    // depends on how the SDK treats refinements and unknown keys.
    const input = SequenceInputSchema.parse(raw);
    const template = await readFile(TEMPLATE_URL, "utf8");
    const html = renderSequence(input, template);

    await mkdir(OUTPUT_DIR, { recursive: true });
    const filePath = await writeUnique(OUTPUT_DIR, `${timestamp(new Date())}-${slugify(input.title)}`, html);

    return { content: [{ type: "text", text: `${sketch(input)}\n\nDiagram: ${filePath}` }] };
  },
);

/** Writes `<base>.html`, or `<base>-2.html` etc. if a file from the same second exists. */
async function writeUnique(dir: string, base: string, content: string): Promise<string> {
  for (let n = 1; ; n++) {
    const filePath = join(dir, n === 1 ? `${base}.html` : `${base}-${n}.html`);
    try {
      await writeFile(filePath, content, { flag: "wx" });
      return filePath;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
    }
  }
}

await server.connect(new StdioServerTransport());
