import type { SequenceInput } from "./schema.js";

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/**
 * Encodes every character outside a small safe set as a Mermaid entity code
 * (`#<codepoint>;`), so user text cannot end a statement, open a comment,
 * inject directives or HTML, or otherwise change the diagram's structure.
 */
export function escapeMermaid(text: string): string {
  let out = "";
  for (const ch of text) {
    out += /[\p{L}\p{N} .,_/()?!'=@+*-]/u.test(ch) ? ch : `#${ch.codePointAt(0)};`;
  }
  return out;
}

export function toMermaid(input: SequenceInput): string {
  const ids = new Map(input.participants.map((p, i) => [p, `P${i}`]));
  const lines = ["sequenceDiagram"];
  input.participants.forEach((p, i) => {
    lines.push(`  participant P${i} as ${escapeMermaid(p)}`);
  });
  for (const step of input.steps) {
    lines.push(`  ${ids.get(step.from)}->>${ids.get(step.to)}: ${escapeMermaid(step.label)}`);
  }
  return lines.join("\n");
}

/**
 * Fills the sequence template with the diagram for `input`. Pure: the caller
 * supplies the template text (see templates/sequence.html), so this does no I/O.
 */
export function renderSequence(input: SequenceInput, template: string): string {
  const values: Record<string, string> = {
    TITLE: escapeHtml(input.title),
    DIAGRAM: escapeHtml(toMermaid(input)),
  };
  return template.replace(/\{\{(TITLE|DIAGRAM)\}\}/g, (_, key: string) => values[key]);
}

export function sketch(input: SequenceInput): string {
  return input.steps.map((s) => `${s.from} -> ${s.to}: ${s.label}`).join("\n");
}

export function slugify(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/, "");
  return slug || "diagram";
}

export function timestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}
