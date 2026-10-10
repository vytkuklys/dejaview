import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { escapeHtml, escapeMermaid, renderSequence, sketch, slugify, timestamp, toMermaid } from "../src/render.ts";
import { SequenceInputSchema } from "../src/schema.ts";

const template = readFileSync(new URL("../templates/sequence.html", import.meta.url), "utf8");

const login = {
  title: "Login flow",
  participants: ["Browser", "API", "DB"],
  steps: [
    { from: "Browser", to: "API", label: "POST /login" },
    { from: "API", to: "DB", label: "SELECT user" },
    { from: "API", to: "Browser", label: "200 OK" },
  ],
};

const rejects = (input: unknown) => assert.equal(SequenceInputSchema.safeParse(input).success, false);

test("renders a valid diagram into the template", () => {
  const html = renderSequence(SequenceInputSchema.parse(login), template);
  assert.ok(html.startsWith("<!doctype html>"));
  assert.ok(html.includes("<title>Login flow</title>"));
  assert.ok(html.includes("<h1>Login flow</h1>"));
  assert.ok(html.includes("participant P0 as Browser"));
  assert.ok(html.includes("P0-&gt;&gt;P1: POST /login"));
  assert.ok(html.includes("P1-&gt;&gt;P2: SELECT user"));
  assert.ok(html.includes("cdn.jsdelivr.net/npm/mermaid@"));
  assert.ok(!html.includes("{{"));
});

test("escapes <script> in title, participants and labels", () => {
  const evil = {
    title: "</title><script>alert(1)</script>",
    participants: ["<img src=x onerror=alert(1)>", "B"],
    steps: [{ from: "<img src=x onerror=alert(1)>", to: "B", label: "</pre><script>x</script>" }],
  };
  const html = renderSequence(SequenceInputSchema.parse(evil), template);
  assert.equal(html.match(/<script\b/g)?.length, 1, "only the template's own script tag");
  assert.ok(!html.includes("<img"));
  assert.equal(html.match(/<\/pre>/g)?.length, 1);
  assert.equal(html.match(/<\/title>/g)?.length, 1);
  assert.ok(html.includes("&lt;/title&gt;&lt;script&gt;"));
});

test("escapes Mermaid special characters in labels", () => {
  assert.equal(escapeMermaid("a;b"), "a#59;b");
  assert.equal(escapeMermaid("#1"), "#35;1");
  assert.equal(escapeMermaid("%%{init}%%"), "#37;#37;#123;init#125;#37;#37;");
  assert.equal(escapeMermaid("x\nA->>B: y"), "x#10;A-#62;#62;B#58; y");
  assert.equal(escapeMermaid("Café 42"), "Café 42");

  const diagram = toMermaid({
    title: "t",
    participants: ["A: x", "end"],
    steps: [{ from: "A: x", to: "end", label: "x;\nB->>A: injected %%" }],
  });
  assert.deepEqual(diagram.split("\n"), [
    "sequenceDiagram",
    "  participant P0 as A#58; x",
    "  participant P1 as end",
    "  P0->>P1: x#59;#10;B-#62;#62;A#58; injected #37;#37;",
  ]);
});

test("does not interpret $ replacement patterns", () => {
  assert.equal(renderSequence({ ...login, title: "cost $& $1 $$" }, "{{TITLE}}"), "cost $&amp; $1 $$");
});

test("escapeHtml escapes HTML special characters", () => {
  assert.equal(escapeHtml(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
});

test("rejects a step whose from is not a participant", () => {
  const result = SequenceInputSchema.safeParse({
    ...login,
    steps: [{ from: "Cache", to: "API", label: "GET" }],
  });
  assert.equal(result.success, false);
  assert.deepEqual(result.error?.issues.map((i) => i.path), [["steps", 0, "from"]]);
  rejects({ ...login, steps: [{ from: "Browser", to: "Cache", label: "GET" }] });
});

test("rejects unknown keys and missing fields", () => {
  rejects({ ...login, extra: 1 });
  rejects({ ...login, steps: [{ ...login.steps[0], note: "x" }] });
  rejects({ participants: login.participants, steps: login.steps });
  rejects({ title: login.title, steps: login.steps });
  rejects({ title: login.title, participants: login.participants });
});

test("enforces length and count limits", () => {
  rejects({ ...login, title: "x".repeat(81) });
  assert.ok(SequenceInputSchema.safeParse({ ...login, title: "x".repeat(80) }).success);
  rejects({ ...login, steps: [{ from: "API", to: "DB", label: "x".repeat(61) }] });
  rejects({ ...login, participants: ["Browser"], steps: [{ from: "Browser", to: "Browser", label: "x" }] });
  rejects({ ...login, participants: Array.from({ length: 13 }, (_, i) => `P${i}`) });
  rejects({ ...login, participants: ["Browser", "API", "API", "DB"] });
  rejects({ ...login, steps: [] });
  rejects({ ...login, steps: Array.from({ length: 41 }, () => login.steps[0]) });
});

test("sketch lists one step per line", () => {
  assert.equal(sketch(login), "Browser -> API: POST /login\nAPI -> DB: SELECT user\nAPI -> Browser: 200 OK");
});

test("slugify and timestamp build safe file names", () => {
  assert.equal(slugify("OAuth 2.0: Authorization Code Flow!"), "oauth-2-0-authorization-code-flow");
  assert.equal(slugify("Ünïcödé"), "unicode");
  assert.equal(slugify("../../etc"), "etc");
  assert.equal(slugify("!!!"), "diagram");
  assert.equal(timestamp(new Date(2026, 0, 5, 9, 3, 7)), "20260105-090307");
});
