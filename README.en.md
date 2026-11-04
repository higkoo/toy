# bilibili Toy — Agent Skill + DSH plugin

English · [简体中文](README.md)

## One-sentence onboarding

Copy this whole block into any agent that supports skills (Claude Code, Codex, Trae, WorkBuddy, CodeBuddy, OpenCode, AtomCode, DeepSeek Harness — all of them):

> Please install and use the bilibili Toy skill: clone https://github.com/bilibili/toy (if I have no network, read `skills/toy/SKILL.md` from that repository instead), copy `skills/toy` into your own skills directory, and confirm you can read `SKILL.md`; then explain in a few sentences what Toy is, what it can do, and what it requires; next check whether the host has the `toy` command and a logged-in session (install it per the install guide in `SKILL.md` if missing, run `toy login` if not logged in); finally walk me through publishing `./my-site` to Toy — run the content precheck first, generate a preview, and only submit after I have reviewed it and explicitly replied "submit". State what you are about to do at every step, and when something fails tell me why and what the next step is.

**What you should see**: the agent first repeats the skill's key points (what Toy is, that the `toy` CLI and a login are required), then checks `command -v toy` and the session. If the environment is ready it asks which local path to publish, runs the content precheck, and returns a preview URL — it does not submit on its own. If something is missing it gives you the install or login command instead of stopping with an error.

You do not need to understand `npx`, skills directories or `PATH`. For the command-line route, or to call the CLI directly / integrate it, see [the three entry points](#three-entry-points-pick-one).

## What this is

Two independent ways to let an agent drive the Bilibili **Toy** creator platform:

- **Agent skill** — [`skills/toy`](skills/toy/SKILL.md) in the [Vercel skills](https://github.com/vercel-labs/skills) format. One command installs it into Claude Code, Codex, Cursor, DeepSeek Harness and 50+ other agents.
- **DSH plugin** — [`dsh/`](dsh/), a [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) bundle with a full Web UI and `toy_*` model tools.

Both wrap the official [`toy`](https://github.com/bilibili/toy) CLI. The skill carries the workflow; the plugin enforces **preview → explicit confirmation → submit** in code.

## Three entry points: pick one

| What you want | Use | Where |
|---|---|---|
| Publish or update content, read stats | **CLI** | [Path A](#path-a-cli) |
| Integrate Toy publishing into your own tool or service | **SDK** (none in this repo; see the fallback) | [Path B](#path-b-sdk) |
| Have an AI agent do the work | **Skill** | [Path C](#path-c-skill) |

Shared prerequisites (`toy` binary, login, Node version) live in exactly one place: [Requirements](#requirements).

### Path A: CLI

`toy` is the official CLI ([bilibili/toy](https://github.com/bilibili/toy)); both the skill and the plugin here are wrappers around it. Three steps (run from the repository root; the precheck script ships with the skill):

```sh
# 1. Install (macOS / Linux; Windows is in the Requirements table)
curl -fsSL https://boss.hdslb.com/toy-cli/toy/install.sh | bash

# 2. Log in (opens a browser for Bilibili OAuth)
toy login

# 3. Precheck → preview → submit after confirmation
python3 skills/toy/scripts/toy_doctor.py ./my-site   # local content precheck, no network
toy create ./my-site --json                            # uploads and returns a preview, no submit
toy create ./my-site --json --yes                      # submit for review after reviewing the preview
```

The three common commands (flags read from `toy v0.6.4` `--help-json`):

| Task | Command | Notes |
|---|---|---|
| Login | `toy login` | `--no-open` disables the browser launch; rerun this one command when the session expires |
| Content precheck | `python3 skills/toy/scripts/toy_doctor.py ./my-site` | Zero dependencies, no network; add `--poster ./cover.png`, or `--json` for a machine-readable report |
| Publish / update | `toy create ./my-site --json` / `toy update <id> ./my-site --json` | Without `--yes` it only produces a preview; re-run with identical arguments plus `--yes` to submit |

**Success looks like**:

- `toy version` prints `toy v0.6.x ...`;
- the precheck ends with a line starting `OK: Toy static checks passed` (WARNs are listed per item and do not change the exit code, but you should still read them to the user);
- the `toy create` JSON contains `preview_url`, meaning the package is uploaded but **not submitted**;
- after `--yes`, the JSON contains `id` and `status`, which means it entered review.

### Path B: SDK

**This repo ships no public Toy publishing SDK.** Evidence:

- there is no importable SDK package here; `skills/toy` is documentation plus a Python precheck script;
- `dsh/packages/toy` is `@bilibili/dsh-toy`, a **DSH plugin bundle** whose `main` is `lib/index.js` (a Cordis plugin entry that registers the `toy_*` tools and the panel), not a general SDK;
- the official capability surface is the `toy` binary.

For now, integrate through the CLI's `--json` output. Minimal wrapper, no dependencies:

```js
// toy-shim.mjs — using the CLI as a poor man's SDK
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

export async function toy(args, { binary = 'toy', timeout = 60_000 } = {}) {
  const { stdout } = await run(binary, [...args, '--json'], { timeout })
  return JSON.parse(stdout)          // every command accepts the global --json flag
}

// e.g. get a preview (no submit)
const preview = await toy(['create', './my-site'])
console.log(preview.preview_url)
```

This wraps the CLI; it is not an official SDK. `toy --help-json` is the authoritative contract — do not hand-write field names.

**Success looks like**: the script prints the output of `toy version` (the skeleton was run locally); `toy(['create', ...])` returns an object with `preview_url` (requires a login; not verified online here).

### Path C: Skill

One command (the command-line route; newcomers can use the [one-sentence onboarding](#one-sentence-onboarding) at the top):

```sh
npx -y skills add bilibili/toy -y
```

- With no `-a`, the skills CLI detects installed agents and writes the skill to each one's directory; when it detects none it installs to the shared directory (`.agents/skills`).
- The leading `npx -y` lets npx install the skills CLI itself, and the trailing `-y` skips the skills CLI prompts. Both are needed for a fully non-interactive run (verified).
- One agent only: `npx -y skills add bilibili/toy -a claude-code -y`. Several agents: repeat the flag, e.g. `-a claude-code -a codex -a trae-cn`; comma- or space-separated lists are rejected (verified).

**Success looks like**: `Installed 1 skill` plus a path; `npx skills list` shows `toy`; asking the agent "what can toy do?" restates the points in [How to confirm the agent actually understood](#how-to-confirm-the-agent-actually-understood).

**Trigger example**: say "walk me through publishing ./my-site" or "which Toys do I have?" — the agent should load the `toy` skill.

### Agent matrix

Whether an agent can actually use the skill depends on it reading `SKILL.md` from its own skills directory. Paths below come from the skills CLI's official agent list; "verified" means we ran it locally.

| Agent | Install | Verify |
|---|---|---|
| **Claude Code** | `npx -y skills add bilibili/toy -a claude-code -y` (verified → `.claude/skills/toy`; `-g` → `~/.claude/skills/toy`) | Open a new session and ask "what can toy do?"; it should list publish, stats and video binding. `npx skills list` also shows it |
| **Codex** | `npx -y skills add bilibili/toy -a codex -y` (verified → `.agents/skills/toy`; `-g` → `~/.agents/skills/toy`) | Same; or confirm `.agents/skills/toy/SKILL.md` exists and ask "which Toys do I have?" |
| **Trae (international)** | `npx -y skills add bilibili/toy -a trae -y` (verified → `.trae/skills/toy`; `-g` → `~/.trae/skills/toy`) | New Trae session: "help me publish ./my-site"; it should start with prerequisites and the preview flow |
| **Trae CN** | `npx -y skills add bilibili/toy -a trae-cn -y` (verified → `.trae/skills/toy`; `-g` → `~/.trae-cn/skills/toy`) | Same |
| **CodeBuddy** | `npx -y skills add bilibili/toy -a codebuddy -y` (verified → `.codebuddy/skills/toy`; skipped when the project has no such directory — create it or use `-g`) | Ask "which commands does toy have?"; `mylist`/`create`/`stats` means it loaded |
| **OpenCode** | `npx -y skills add bilibili/toy -a opencode -y` (verified → `.agents/skills/toy`; `-g` → `~/.config/opencode/skills/toy`) | Same |
| **DeepSeek Harness Desktop** | Skill through the shared directory: `npx -y skills add bilibili/toy -a codex -g -y` (`~/.agents/skills`, DSH rank 500) or project `.agents/skills` (rank 200). For the plugin see [DSH plugin](#dsh-plugin) | The panel's **Skill** card shows "installed" and a version, or ask "can you publish a Toy?" |
| **WorkBuddy** | **Unverified** — the skills CLI has no WorkBuddy agent id. Fallback: have the agent read `skills/toy/SKILL.md` directly, or copy `skills/toy` into its skills directory per WorkBuddy's own docs | Paste the one-sentence prompt above and check that it can restate Toy's purpose, prerequisites and three-step publish flow |
| **AtomCode** | **Unverified** — no AtomCode agent id in the skills CLI. Same fallback | Same |
| **Other agents** (Cursor, Cline, Gemini CLI, GitHub Copilot, Kimi Code, Qwen Code, Windsurf, Qoder, …) | Use the matching `-a` id; the full list is in the skills CLI [agents doc](https://github.com/vercel-labs/skills/blob/main/docs/agents.md). Anything not listed there: use the fallback steps | Trigger a Toy-related request in a new session and see whether the skill is picked up |

> An agent missing from this table is not necessarily unsupported. Anything that follows the [Agent Skills spec](https://agentskills.io) (reads a directory containing `SKILL.md`) works with the fallback steps.

#### Fallback for any agent

When the skills CLI does not know the agent, or the install did not take effect:

1. Clone the repo: `git clone https://github.com/bilibili/toy`.
2. Copy `toy/skills/toy` into that agent's skills directory (see its own docs; common ones are `.agents/skills/`, `.claude/skills/`, `.trae/skills/`, or global `~/.agents/skills/`).
3. Restart the agent (most scan skills directories only at startup).
4. Verify with: **"Introduce what toy can do, then walk me through publishing ./my-site."**
5. If the agent cannot read files at all, paste the contents of `SKILL.md` into the conversation and ask it to follow that.

#### How to confirm the agent actually understood

Say this in the conversation:

> Introduce what toy can do, then walk me through publishing ./my-site.

**The reply should include at least**:

- Toy is the CLI for the Bilibili Toy creator platform: publish/update, list Toys and PV/UV stats, read local publish history, bind videos;
- the host needs the `toy` binary and a `toy login` session;
- publishing is not one step: content precheck → preview → submit only after your explicit confirmation;
- it must not add `--yes` up front or skip the precheck.

If it only mentions "publishing" and omits login and preview confirmation, the skill did not load fully — use the fallback steps.

#### What you should see

| Stage | Healthy | Not healthy |
|---|---|---|
| Install | `Installed 1 skill` plus a path (`.agents/skills/toy` or the agent's own directory) | Stuck asking Project/Global: `-y` was missing |
| First conversation | Restates purpose, prerequisites and the three-step flow, then asks for a path | Starts guessing commands, or says it does not know Toy: skill not loaded |
| First publish | Runs the precheck, returns a preview link, waits for "submit" | Submits directly or skips the precheck: stop and revoke approval |

## Requirements

This is the **only** prerequisites table in the repo; `dsh/README.md` and `dsh/packages/toy/README.md` link here.

| Dependency | Version | How to get it / check it |
|---|---|---|
| DeepSeek Harness | `>=0.2.1-rc.2 <0.3.0` (`engines.dsh`) | Official install: `npx @deepseek-ai/dsh web` (Node.js). Check: `npx @deepseek-ai/dsh --version` (measured `0.2.1-rc.5`), which must fall in that range. The desktop app ships its own runtime; read its version on the About screen |
| `toy` CLI | `v0.6.x` | macOS/Linux: `curl -fsSL https://boss.hdslb.com/toy-cli/toy/install.sh \| bash`; Windows: `irm https://boss.hdslb.com/toy-cli/toy/install.ps1 \| iex`. Check: `toy version` |
| Login session | — | `toy login` (browser OAuth); the panel's **Login** button is equivalent |
| Node.js | `>=22.19` | Only for `npx skills` installs and source builds; the `toy` binary and the dsh runtime do not need it |

The skill itself needs nothing beyond Node.js for installation; publishing needs `toy` plus a login.

## Skill

### What's inside

| File | What it does |
|---|---|
| [`SKILL.md`](skills/toy/SKILL.md) | Skill definition + rules, workflows, error handling |
| `references/installation.md` | CLI install and login guide |
| `references/content-checklist.md` | What a Toy package needs before review (white-screen traps, HTML size limits) |
| `references/error-codes.md` | CLI errors and how to react |
| `scripts/toy_doctor.py` | Zero-dependency static preflight for a package |

A skill is a directory with a `SKILL.md` whose frontmatter carries a lowercase-hyphen `name` (matching the directory name) and a `description`; see the [Vercel skills source formats](https://vercel-labs-skills.mintlify.app/guides/source-formats).

### Update

```sh
npx skills check
npx skills update
```

### Key rules (excerpt)

- **Always `--json` from an agent**: human-readable tables shift with column width and hyperlinks; `--json` is the stable contract.
- **Publishing is not one step**: for `create` / `update` with a package, run without `--yes` first, hand the user the `preview_url`, then **ask explicitly** and only re-run with identical arguments plus `--yes` after a clear "submit".
- **Precheck before uploading**: fix every ERROR; repeat every WARN to the user (WARN does not change the exit code and the summary still says `passed`).
- **Expired login: retry once**: run `toy login`, retry the original command **once**, then stop.
- **Confirm destructive local operations**: `history clear` wipes local history; confirm before adding `--yes`.

The full rules and the five workflows (first publish, update, stats, history disambiguation, video binding) are in [`SKILL.md`](skills/toy/SKILL.md).

## DSH plugin

[`dsh/`](dsh/) is a small pnpm workspace that builds [`@bilibili/dsh-toy`](dsh/packages/toy/package.json). Once dsh loads it, a **bilibili Toy** entry appears in the sidebar. Install, update and panel reference: [`dsh/README.md`](dsh/README.md). Configuration and the security model: [`dsh/packages/toy/README.md`](dsh/packages/toy/README.md).

```sh
dsh plugin --profile web add https://github.com/bilibili/toy/releases/latest/download/bilibili-dsh-toy.tgz
```

### Web UI

| Tab | What you can do |
|---|---|
| **My Toys** | Poster/title/slug/id/status/visibility cards, refresh, select a Toy |
| **Stats** | PV/UV bar chart, next-day retention, like/favorite/comment/share totals, 7/30/90-day windows |
| **Publish / Update** | create or update; package/poster/icon paths (history suggestions); title, slug (create only), category, visibility/password, theme, watermark, activity; local precheck with ERROR/WARN findings; **generate preview**; after the preview, an explicit "I checked the preview" step enables **submit for review** |
| **History** | local publish/update records; clear-all behind a two-step confirmation |

Account header: logged-in user, resolved binary, CLI version, login/logout.

The access password is sent only to the CLI: it is masked (`••••`) in every wire payload, summary and confirmation dialog, so it never reaches the model transcript or the page's DOM.

### Model tools

The same Host implementation exposes `toy_*` tools to the model, sharing the Web UI's safety gates so the rules cannot drift.

### The skill is not bundled

The plugin does not ship a copy of the skill; install it via the [Skill](#skill) section. The panel's **Skill** card shows the installed version (skills CLI lock-file hash), content hash and update time, and can install/update it after a confirmation (fixed command, no free-form arguments).

### Configuration and limitations

Every field is optional; defaults are in [`cordis.patch.yml`](dsh/packages/toy/cordis.patch.yml). The complete field table and known limitations are in [`dsh/packages/toy/README.md`](dsh/packages/toy/README.md#configuration).

## Layout

```
skills/
  toy/
    SKILL.md              # skill definition (YAML frontmatter: name, description)
    references/           # supporting docs loaded on demand
      installation.md
      content-checklist.md
      error-codes.md
    scripts/
      toy_doctor.py       # zero-dependency static preflight for Toy packages
dsh/
  package.json            # private pnpm workspace (build/test toolchain)
  packages/toy/           # @bilibili/dsh-toy bundle: host, Web UI, tests
  packages/dsh-typert-protocol/  # vendored Typert protocol the build targets
.github/workflows/        # CI: build/test, docs checks, tag-driven release tarballs
```

## Doc ownership

The three READMEs have single responsibilities; change the one that owns the topic and link from the others:

| File | Owns |
|---|---|
| root `README.md` / `README.en.md` | Human onboarding: one-sentence prompt, agent matrix, **the only prerequisites table**, end-to-end example |
| [`dsh/README.md`](dsh/README.md) | Plugin quick reference: install/update, panel tabs, local loading for development |
| [`dsh/packages/toy/README.md`](dsh/packages/toy/README.md) | Configuration fields, security model, known limitations |

## Development

Prerequisites: Node.js `>=22.19`, pnpm `10.30.3` (use `corepack enable`).

```sh
cd dsh
pnpm install    # build/test toolchain (must run inside dsh/)
pnpm check      # build + node:test suite (fake toy binary, no real platform access)
```

`packageManager` is declared in `dsh/package.json`; running `pnpm --dir dsh ...` from the repository root can resolve a different pnpm through corepack and fail with `ERR_PNPM_BAD_PM_VERSION`, hence the explicit `cd dsh`.

Contribution flow and templates: [`CONTRIBUTING.md`](CONTRIBUTING.md). Working rules, verification playbooks and the release checklist for contributors and agents: [`AGENTS.md`](AGENTS.md); plugin-specific guide: [`dsh/AGENTS.md`](dsh/AGENTS.md).

**Constraints (excerpt)**

- Never run Toy write commands (publish / update / submit / bind / shared-storage writes / history clear / login / logout) against the real platform; tests use `fake-toy.mjs` with a throwaway `DSH_HOME`. Read-only queries (list / stats / history) are fine.
- Do not add a bundled skill copy or a `skill/` build step.
- No npm release channel; CI uses the automatic `GITHUB_TOKEN`.
- Do not push tags, force-push `main`, or merge PRs unless a human explicitly asks.

## License

[MIT](LICENSE)
