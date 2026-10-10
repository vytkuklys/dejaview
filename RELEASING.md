# Releasing

How a new version of `dejaview-mcp` reaches npm, and the traps around it. Read this before
changing the version, the workflows, the package name, or anything npm/GitHub-side.

## Release steps

1. **Pick the version.** Semver, with the tool schema as the public API:
   - patch: fixes, template styling, docs.
   - minor: a new tool or a new optional input field.
   - major (or minor while `0.x`): removing or tightening a field, renaming a tool,
     changing the output text format agents rely on.
2. **Bump it in both places.** `package.json` and the `version` passed to `McpServer` in
   `src/server.ts`. Nothing keeps them in sync.
   ```sh
   npm version patch --no-git-tag-version   # or minor / major
   # then edit src/server.ts to the same version
   ```
3. **Check locally.** All four must pass:
   ```sh
   npm ci && npm run build && npm test
   npm pack --dry-run   # only dist/, templates/, README.md, LICENSE, SECURITY.md, package.json
   ```
4. **Commit, tag, push.** The tag must be `v` + the exact `package.json` version; the
   release workflow refuses anything else.
   ```sh
   git commit -am "Release vX.Y.Z"
   git tag vX.Y.Z
   git push && git push origin vX.Y.Z
   ```
5. **Create the GitHub release** for that tag (github.com → Releases → Draft a new release).
   Publishing it triggers `.github/workflows/release.yml`, which **stages** the version on npm.
   Done when the Release workflow run is green.
6. **Approve the staged version** with npm 2FA. Nothing is public until this step.
   ```sh
   npm install -g npm@11.21.0          # stage commands need npm >= 11.21
   npm stage list dejaview-mcp
   npm stage approve <stage-id>
   ```
   Or approve it on npmjs.com. To discard instead: `npm stage reject <stage-id>`.
7. **Verify from the registry.** Done when `npm view` shows the new version and a fresh
   Claude Code session can call `show_sequence` and open the diagram it writes:
   ```sh
   npm view dejaview-mcp version
   claude mcp add dejaview -- npx -y dejaview-mcp@X.Y.Z   # pin the version for the check
   ```

## Irreversible things

- **A version number is used once, forever.** Published, staged, rejected or unpublished:
  that number can never be published again. A bad release is fixed by a new version, plus
  `npm deprecate dejaview-mcp@X.Y.Z "reason"` on the bad one.
- **Everything in the tarball is public the moment it's approved.** Check `npm pack --dry-run`
  and look for leftover placeholders or personal data before approving.
- **The trusted publisher connection on npmjs.com is fixed** to: user `vytkuklys`, repo
  `dejaview`, workflow `release.yml`, environment `npm`, actions: stage only. Renaming the
  workflow file, the environment, or the repo breaks publishing until the connection is
  deleted and recreated on npmjs.com.
- **No GitHub release for v0.0.1.** It was published by hand before the workflow existed;
  a release for that tag would run the workflow and fail on the existing version.

## Names

| Thing                             | Value          | Where it lives                       |
| --------------------------------- | -------------- | ------------------------------------ |
| npm package                       | `dejaview-mcp` | `package.json` `name`, README install commands, SECURITY.md |
| CLI command inside the package    | `dejaview`     | `package.json` `bin`                 |
| MCP server name (shown in clients)| `dejaview`     | `src/server.ts`                      |
| Output folder                     | `~/.dejaview/` | `src/server.ts`                      |
| Product name                      | DejaView       | README, LICENSE notice               |

`dejaview` (unscoped) is blocked on npm as too similar to `deja-view`. `npx -y dejaview-mcp`
works because the package has exactly one `bin` entry; adding a second `bin` breaks it.

## GitHub settings coupled to the code

- **Ruleset `main`**: blocks force-push and deletion of `main`, no bypass.
- **Ruleset `main-ci`**: requires checks `test (18)`, `test (20)`, `test (22)`, `test (24)`;
  repository admins bypass. These names come from the `test` job and its `node` matrix in
  `.github/workflows/ci.yml`. Renaming the job or changing the matrix means updating the
  ruleset, or pull requests block forever on checks that never report.
- Source JSON for both rulesets: `C:\Users\vttsk\OneDrive\Documents\dejaview-ruleset-*.json`.

## Accounts

- npm publishing access: 2FA required, bypass tokens disallowed. Publishing from a laptop
  still works with 2FA; prefer the workflow so the release gets provenance.
- On WSL, npm can't open a browser for login/2FA: open the printed URL in Windows yourself
  and leave the terminal waiting, or run with `BROWSER=/mnt/c/Windows/explorer.exe`.
- The `GITHUB_TOKEN` environment variable on the dev machine is invalid and breaks `gh`.
  Run `gh` with it unset, or remove it from the shell profile.
