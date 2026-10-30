# bilibili Toy — DSH Plugin

[简体中文](README.md) · English

`@bilibili/dsh-toy` is a [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin bundle that wraps the official [`toy`](https://github.com/bilibili/toy) CLI for the Bilibili [Toy](https://www.bilibili.com/toy) creator platform into a Web UI and a set of `toy_*` model tools.

The panel and the model tools share one Host implementation (`packages/toy/src/host/service.js`), so the preview → explicit confirmation → submit gate cannot drift between entry points.

> Full feature set, configuration and known limitations: [packages/toy/README.md](packages/toy/README.md). Repository overview and Skill install: [root README](../README.md).

## Components

| Part | What it is |
|---|---|
| Web UI | A **bilibili Toy** sidebar entry, the main panel, and a compact card on the Plugins page |
| Model tools | `toy_account`, `toy_list`, `toy_stats`, `toy_history`, `toy_precheck`, `toy_publish`, `toy_submit`, `toy_run` |
| Host service | Resolves the `toy` binary, runs the CLI, normalizes output, and holds one-shot tickets and prepared previews |

## Requirements

| Dependency | Version | Notes |
|---|---|---|
| DeepSeek Harness | `0.2.1-rc.2` (the `0.2.x` line) | The `engines.dsh` range; an incompatible runtime is rejected before the bundle loads |
| `toy` CLI | `v0.6.x` | Install it on the machine running dsh and complete `toy login` |
| Node.js | `22.20+` | Only for `npx skills` installs and building from source |

The `toy` binary and its login are **per machine/user**, not per dsh profile. When the binary is missing, the panel shows the install steps and a **Check again** button.

## Install and update

```sh
# latest release
dsh plugin --profile web add https://github.com/bilibili/toy/releases/latest/download/bilibili-dsh-toy.tgz

# pinned version
dsh plugin --profile web add https://github.com/bilibili/toy/releases/download/dsh-plugin-v0.1.3/bilibili-dsh-toy-0.1.3.tgz
```

From a source checkout:

```sh
pnpm --dir dsh install
pnpm --dir dsh build
dsh plugin --profile web add /absolute/path/to/dsh/packages/toy
```

Updating a released install means running `add` again with the new tarball (there is no auto-update channel); a source checkout is updated by pulling and rebuilding. Restart dsh after changing the plugin.

## Panel

| Tab | What you can do |
|---|---|
| My Toys | Poster/title/slug/id/status/visibility cards, refresh and select |
| Stats | PV/UV bar chart, next-day retention, like/favorite/comment/share totals, 7/30/90-day windows |
| Publish / Update | Local package path (with history suggestions), cover/icon, title, slug (create only), category, visibility/password, theme, watermark, activity; local precheck; generate a preview; submit for review after an explicit confirmation |
| History | Local publish/update records; clearing needs a second confirmation and a one-shot Host ticket |

The header also shows the account (signed-in user, binary path, CLI version, sign-in/out, CLI upgrade) and a **Skill** card (install/update/refresh).

## Safety model

- **Preview → explicit confirmation → submit**: generating a preview uploads the package once (without `--yes`); the actual submit requires an explicit human confirmation from the UI or the model tool, then re-runs exactly the same arguments.
- **Package fingerprint first**: the package is content-fingerprinted before the preview; if it changes before submit, the submit is refused and the preview must be regenerated.
- **Precheck gate**: the local precheck runs before upload and blocks on ERROR; `precheck` can be `block`, `warn` or `off`.
- **Tickets for destructive actions**: `history clear` needs a one-shot ticket issued by the Host after a human confirmation, so a stray call cannot wipe local history.
- **No credential leakage**: the `toy` child process gets the ambient environment minus `DSH_*` and `*_KEY` / `*_TOKEN` / `*_SECRET` / `*_PASSWORD`.
- Tests always use [`test/fixtures/fake-toy.mjs`](packages/toy/test/fixtures/fake-toy.mjs) and a throwaway `DSH_HOME`; they never write to the real platform.

## Configuration

Every field is optional; defaults are documented in [`cordis.patch.yml`](packages/toy/cordis.patch.yml). Common fields: `binary`, `timeoutMs`, `uploadTimeoutMs`, `precheck`, `agentsHome`, `env`. The full table is in [packages/toy/README.md#configuration](packages/toy/README.md#configuration).

## Development and verification

```sh
pnpm --dir dsh install
pnpm --dir dsh check   # build + typecheck + node:test (fake toy, no real platform writes)
```

Load locally:

```sh
DSH=/path/to/dsh
DSH_HOME=/tmp/dsh-toy-dev "$DSH" plugin --profile web add "$PWD/dsh/packages/toy"
DSH_HOME=/tmp/dsh-toy-dev "$DSH" --profile web --no-open --port 0
```

Development and release conventions live in [AGENTS.md](AGENTS.md).

## Documentation

- [packages/toy/README.md](packages/toy/README.md): full features, configuration, known limitations
- [AGENTS.md](AGENTS.md): plugin development, verification and release process
- [../README.md](../README.md): repository overview and Skill install
- [../skills/toy/SKILL.md](../skills/toy/SKILL.md): the Agent Skill

## License

MIT.
