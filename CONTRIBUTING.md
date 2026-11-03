# Contributing

Thanks for helping. This repo ships an Agent Skill (`skills/toy`) and a DeepSeek Harness plugin (`dsh/`). Both wrap the official `toy` CLI; neither reimplements it.

## Setup

Prerequisites: Node.js `>=22.19`, pnpm `10.30.3` (use `corepack enable`).

```sh
cd dsh
pnpm install
pnpm check          # build + typecheck + node:test, fake toy binary, no network
```

Docs-only changes still need the doc check:

```sh
node .github/scripts/check-docs.mjs
```

It verifies local links and anchors, that `SKILL.md` frontmatter matches its directory, that every backticked `references/…` / `scripts/…` path exists, and that the READMEs and `SKILL.md` keep the required onboarding sections (positioning, prerequisites, login, the three-step publish flow, four common error classes).

## Safety rules

- **Never** run Toy write commands (publish / update / submit / bind / shared-storage writes / history clear / login / logout) against the real platform. Tests use `fake-toy.mjs` with a throwaway `DSH_HOME`. Read-only queries (list / stats / history) are fine.
- Do not bundle a copy of the skill inside the plugin or add a `skill/` build step.
- Do not add a release channel beyond the tag-driven GitHub Release tarball.
- Do not push tags, force-push `main`, or merge PRs unless a human explicitly asks.

## What to change where

| You are changing | Edit | Do not |
|---|---|---|
| Human onboarding, agent matrix, prerequisites | root `README.md` / `README.en.md` | copy the prerequisites table elsewhere |
| Plugin install/update, panel reference | `dsh/README.md` / `dsh/README.en.md` | re-list prerequisites |
| Config fields, security model | `dsh/packages/toy/README.md` | duplicate install instructions |
| Agent behavior, workflows, rules | `skills/toy/SKILL.md` + `references/` | hardcode CLI fields that `--help-json` already exposes |

Both Chinese and English READMEs must be updated together. Keep the panel copy bilingual in `dsh/packages/toy/src/client/i18n.ts`; any new failure kind needs a matching hint in both `ERROR_HINT_ZH` and `ERROR_HINT_EN`.

## Pull requests

1. Branch from `main`.
2. Keep the diff focused; unrelated cleanups belong in their own PR.
3. Run `cd dsh && pnpm check` and `node .github/scripts/check-docs.mjs` locally.
4. Describe what changed, how you verified it, and anything you could not verify.
5. Open the PR with the template; do not merge it yourself.

Commit messages follow Conventional Commits with the area in parentheses, e.g. `fix(dsh): follow the DSH locale for panel copy`, `docs(readme): add the one-sentence onboarding`.

## Reporting issues

Use the issue templates. For anything that touches publishing, include the `toy` version (`toy version`), your OS, and the failing command's `--json` output with secrets removed.
