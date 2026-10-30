# bilibili Toy — DSH 插件

[English](README.en.md) · 简体中文

`@bilibili/dsh-toy` 是 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的插件 bundle：把 B 站 [Toy](https://www.bilibili.com/toy) 创作者平台的官方 [`toy`](https://github.com/bilibili/toy) CLI 封装成一套 Web UI 和 `toy_*` 模型工具。

面板操作和模型工具共用同一份 Host 实现（`packages/toy/src/host/service.js`），「预览 → 显式确认 → 提交审核」等安全闸门不会因入口不同而漂移。

> 功能细节、配置与已知限制见 [packages/toy/README.md](packages/toy/README.md)；仓库总览与 Skill 安装见 [根 README](../README.md)。

## 组成

| 部分 | 说明 |
|---|---|
| Web UI | 侧边栏 **bilibili Toy**、主面板，以及 Plugins 页上的紧凑卡片 |
| 模型工具 | `toy_account`、`toy_list`、`toy_stats`、`toy_history`、`toy_precheck`、`toy_publish`、`toy_submit`、`toy_run` |
| Host 服务 | 解析 `toy` 二进制、执行 CLI、归一化输出，维护一次性 ticket 与待提交预览 |

## 前置条件

| 依赖 | 版本 | 说明 |
|---|---|---|
| DeepSeek Harness | `0.2.1-rc.2`（`0.2.x` 线） | `engines.dsh` 声明的范围，不兼容的运行时会在加载前被拒 |
| `toy` CLI | `v0.6.x` | 需在运行 dsh 的机器安装，并完成 `toy login` |
| Node.js | `22.20+` | 仅 `npx skills` 安装与源码构建需要 |

`toy` 二进制和登录态是**按机器/用户**的，不随 dsh profile 走。找不到二进制时，面板会显示安装指引和「重新检测」。

## 安装与更新

```sh
# 最新 Release
dsh plugin --profile web add https://github.com/bilibili/toy/releases/latest/download/bilibili-dsh-toy.tgz

# 锁定版本
dsh plugin --profile web add https://github.com/bilibili/toy/releases/download/dsh-plugin-v0.1.3/bilibili-dsh-toy-0.1.3.tgz
```

从源码构建：

```sh
pnpm --dir dsh install
pnpm --dir dsh build
dsh plugin --profile web add /absolute/path/to/dsh/packages/toy
```

更新已安装的 Release 需要重新 `add` 新的 tarball（没有自动更新通道）；源码方式则拉取后重建。改完插件后重启 dsh。

## 面板

| 页签 | 能做什么 |
|---|---|
| 我的 Toy | 封面/标题/slug/ID/状态/可见性卡片，刷新与选中 |
| 统计 | PV/UV 柱状图、次日留存、点赞/收藏/评论/分享，7/30/90 天窗口 |
| 发布 / 更新 | 本地包路径（含历史建议）、封面/图标、标题、slug（仅新建）、分区、可见性/密码、主题、水印、活动；本地预检；生成预览；勾选确认后提交审核 |
| 历史 | 本地发布/更新记录；清空需要二次确认和 Host 一次性 ticket |

顶部还有账号信息（登录用户、二进制路径、CLI 版本、登录/登出、CLI 升级），以及 Skill 卡片（安装/更新/刷新）。

## 安全模型

- **预览 → 显式确认 → 提交审核**：生成预览只上传一次包体（不带 `--yes`）；真正提交必须由 UI 或模型工具拿到明确的人类确认，并用完全相同的参数重跑。
- **包体指纹前置**：预览前记录内容指纹；预览到提交之间包被改动则拒绝提交，必须重新生成预览。
- **预检拦截**：上传前跑本地预检，ERROR 直接拦截；`precheck` 可配置为 `block` / `warn` / `off`。
- **破坏性操作要 ticket**：`history clear` 需要 Host 在人类确认后下发一次性 ticket，单次调用无法误删本地历史。
- **凭据不外传**：传给 `toy` 子进程的环境会剔除 `DSH_*` 与 `*_KEY` / `*_TOKEN` / `*_SECRET` / `*_PASSWORD`。
- 测试始终使用 [`test/fixtures/fake-toy.mjs`](packages/toy/test/fixtures/fake-toy.mjs) 和一次性 `DSH_HOME`，不对真实平台做写操作。

## 配置

所有字段可选，默认值见 [`cordis.patch.yml`](packages/toy/cordis.patch.yml) 的注释。常用字段：`binary`、`timeoutMs`、`uploadTimeoutMs`、`precheck`、`agentsHome`、`env`。完整表格见 [packages/toy/README.md#configuration](packages/toy/README.md#configuration)。

## 开发与验证

```sh
pnpm --dir dsh install
pnpm --dir dsh check   # 构建 + 类型检查 + node:test（fake toy，无真实平台写入）
```

本地加载：

```sh
DSH=/path/to/dsh
DSH_HOME=/tmp/dsh-toy-dev "$DSH" plugin --profile web add "$PWD/dsh/packages/toy"
DSH_HOME=/tmp/dsh-toy-dev "$DSH" --profile web --no-open --port 0
```

开发约定与发布流程见 [AGENTS.md](AGENTS.md)。

## 文档

- [packages/toy/README.md](packages/toy/README.md)：完整功能、配置、已知限制
- [AGENTS.md](AGENTS.md)：插件开发、验证与发布流程
- [../README.md](../README.md)：仓库总览与 Skill 安装
- [../skills/toy/SKILL.md](../skills/toy/SKILL.md)：Agent Skill

## License

MIT.
