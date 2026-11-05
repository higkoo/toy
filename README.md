# bilibili Toy — Agent Skill + DSH 插件

[English](README.en.md) · 简体中文

## 一句话上手

把下面这段整段复制到任意支持 Skill 的 Agent（Claude Code、Codex、Trae、WorkBuddy、CodeBuddy、OpenCode、AtomCode、DeepSeek Harness 都可以）：

> 请帮我安装并使用 bilibili Toy skill：先克隆 https://github.com/bilibili/toy （如果我不能联网，就直接读取这个仓库里的 skills/toy/SKILL.md），把 skills/toy 复制到你自己的 skills 目录并确认你能读到 SKILL.md；然后用几句话告诉我 toy 是什么、能做什么、需要哪些前置条件；接着检查宿主机是否装了 toy 命令、是否已登录（没装就按 SKILL.md 的安装指引装，未登录就运行 toy login）；最后带我把 ./my-site 发布到 Toy——先做内容预检，再生成预览，等我看完并明确回复「提交」后再提交审核。每一步先说明你要做什么，出错时告诉我原因和下一步怎么办。

**贴进去之后你会看到**：Agent 先复述它读到的 skill 要点（toy 是什么、要装 `toy` CLI、要先登录），再检查 `command -v toy` 和登录态；若环境就绪，它会向你确认要发布的本地路径，先跑内容预检、再给出预览链接，不会直接提交审核。环境缺东西时，它会先给安装或登录命令，而不是报错停下。

这条指令不要求你理解 `npx`、skills 目录或 `PATH`。想用命令行安装、或者想直接调 CLI / 集成的，看下面的[三种入口](#三种入口先选一条)。

## 这是什么

两种独立的方式让 AI Agent 驱动 B 站 **Toy** 创作者平台：

- **Agent Skill（技能包）** — [`skills/toy`](skills/toy/SKILL.md)，采用 [Vercel skills](https://github.com/vercel-labs/skills) 格式。一条命令即可安装到 Claude Code、Codex、Cursor、DeepSeek Harness 等 50+ 主流 Agent。
- **DSH 插件** — [`dsh/`](dsh/)，[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的插件 bundle，内置完整 Web UI 和 `toy_*` 模型工具。

二者都封装官方 [`toy`](https://github.com/bilibili/toy) CLI。Skill 承载文档与工作流；插件则把安全闸门（**预览 → 显式确认 → 提交审核**）落实为代码约束。

## 三种入口：先选一条

| 你想做的事 | 用哪条 | 去哪里 |
|---|---|---|
| 直接发布、更新内容，或查看统计 | **CLI** | [路径 A](#路径-acli) |
| 在 Toy 页面里做存档、排行榜、分享、摄像头等交互 | **页面内 JS SDK** | [路径 B](#路径-b页面内-js-sdk) |
| 让 AI Agent 替我干活 | **Skill** | [路径 C](#路径-cskill) |

三者的共同前置（`toy` 二进制、登录、Node 版本）只写在[前置条件](#前置条件)一处。

### 路径 A：CLI

`toy` 是官方 CLI（[bilibili/toy](https://github.com/bilibili/toy)），本仓库的 Skill 和插件都只是它的封装。三步跑通（下面命令在仓库根目录执行，预检脚本随 skill 分发）：

```sh
# 1. 安装（macOS / Linux；Windows 见前置条件表）
curl -fsSL https://boss.hdslb.com/toy-cli/toy/install.sh | bash

# 2. 登录（会打开浏览器完成 B 站 OAuth）
toy login

# 3. 预检 → 预览 → 确认后提交
python3 skills/toy/scripts/toy_doctor.py ./my-site   # 本地内容预检，不联网
toy create ./my-site --json                            # 只上传生成预览，不提交
toy create ./my-site --json --yes                      # 看过预览、确认后再提交审核
```

三个高频场景的真实命令（参数取自 `toy v0.6.4` 的 `--help-json`）：

| 场景 | 命令 | 说明 |
|---|---|---|
| 登录 | `toy login` | `--no-open` 可禁止自动打开浏览器；会话失效只需重跑这一条 |
| 内容预检 | `python3 skills/toy/scripts/toy_doctor.py ./my-site` | 零依赖、不联网；加 `--poster ./cover.png` 可一起检查封面，`--json` 输出机器可读报告 |
| 发布 / 更新 | `toy create ./my-site --json` / `toy update <id> ./my-site --json` | 不带 `--yes` 只出预览；确认后同参数加 `--yes` 才提交审核 |

**成功的标志**：

- `toy version` 输出 `toy v0.6.x ...`；
- 预检最后一行以 `OK: Toy static checks passed` 开头（有 WARN 会逐条列出，退出码仍是 0，但要读给用户听）；
- `toy create` 的 JSON 里出现 `preview_url`，说明包已上传但**尚未提交审核**；
- 加 `--yes` 后 JSON 里出现 `id` 和 `status`，才算真正进入审核。

### 路径 B：页面内 JS SDK

Toy JS SDK 是**注入到 Toy 页面里的 `window.toy`**，不是 npm 包：它只在 B 站 App / Web 的 Toy 容器中存在，页面不需要安装或打包。除 `onContainerChange` 同步返回取消函数外，其余方法都返回 Promise。

**第 1 步：接入**。在 Toy 的 HTML `<head>` 里加一行：

```html
<script src="//s1.hdslb.com/bfs/seed/toy/app/sdk/toy-sdk.js"></script>
```

**第 2 步：复制这个最小示例**（读取云存档 + 用 `isSupport` 判断仅 App 可用的能力）：

```html
<script src="//s1.hdslb.com/bfs/seed/toy/app/sdk/toy-sdk.js"></script>
<div>金币：<span id="coins">0</span></div>
<script>
  (async () => {
    if (!window.toy) return console.warn('不在 Toy 容器内')
    try {
      // 云存储：同一登录用户在同一 Toy 下跨设备持久化
      const { coins = '0' } = await toy.getCloudStorage(['coins'])
      document.querySelector('#coins').textContent = coins

      // Web 端不支持的能力先判断，别直接调用
      if (await toy.isSupport('saveImageToAlbum')) {
        await toy.saveImageToAlbum({ url: 'https://i0.hdslb.com/bfs/archive/example.jpg' })
      }
    } catch (error) {
      console.warn(String(error)) // 所有 SDK 错误都带 [ToySDK] 前缀
    }
  })()
</script>
```

**第 3 步：验证**。把页面发布成 Toy（见[路径 A](#路径-acli)）并在 App / Web 打开：金币位置显示云存档值、控制台没有 `[ToySDK]` 报错；在 Web 上 `isSupport('saveImageToAlbum')` 返回 `false` 而不是抛错。

#### 能力分组（完整签名与参数见 [docs/toy-js-sdk.md](docs/toy-js-sdk.md)）

| 能力组 | 方法 | 用途 | App / Web |
|---|---|---|---|
| 导航 | `navigate` | 跳视频 / 空间 / 搜索 / 动态 / tribee / Toy | 都支持；**必须在用户手势中调用** |
| 分享与二维码 | `share`、`getQrCode`、`saveImageToAlbum`、`closeBrowser` | 拉起分享、跨设备接力、海报、保存图片 | `share` / `saveImageToAlbum` / `closeBrowser` 仅 App；`getQrCode` 两端都支持 |
| 用户与作者信息 | `getUserProfile`、`getAuthorProfile`、`getAuthorVideos`、`getAuthorRelation`、`getVideoUserActions` | 头像昵称、作者资料与稿件、关注关系、视频互动状态 | 都支持；外部手机浏览器返回 `unsupported` |
| 云存储与共享存档 | `get` / `set` / `removeCloudStorage`、`get` / `set` / `removeSharedStorage` | 单人存档；跨多个 Toy 的共享存档 | 都支持；需登录；单 Toy 最多 128 个 key、value ≤1024 字节 |
| 排行榜 | `submitScore`、`getRankList`、`getMyRank` | 上报分数、读榜、查我的名次 | 都支持；`board` 固定 1–5，`period` 为 all / month / week / day |
| 摄像头 / 麦克风 | `requestCamera`、`requestMicrophone`、`stopMedia` | 拍照、录音 | 都支持；**必须用户手势**，用完必须 `stopMedia` |
| 容器状态 | `onContainerChange`、`getContainerState`、`setContainerMode` | 监听尺寸、安全区、方向、沉浸模式 | **仅 App**；Web 调用抛 `unsupported` |
| 玩家输入检测 | `checkInputSafety` | 昵称、留言等展示前的内容检测 | 都支持；返回 `ok` / `rejected` / `unavailable` 三态 |

#### 必须知道的几个坑

- **Web 端不支持的方法会抛错**：先 `await toy.isSupport('<ability>')` 再调用，不要直接 try 着用。
- **所有错误带 `[ToySDK]` 前缀**：排查时按这个前缀过滤日志。
- **`navigate` 必须在用户手势事件（如 click）里调用**，否则会被拦截。
- **`toyOpenId` 不是鉴权凭证**：它只是当前用户在当前 Toy 内的稳定假名，不得写入埋点或公开日志。
- **限流错误 `307044` 要指数退避**，不要立即原样重试；云存储与排行榜共用同一个 Toy 的额度，玩家越多越要批量、少轮询。
- **`unavailable` 不等于检测通过**：`checkInputSafety` 返回 `unavailable` 时说明检测没跑成，应提示稍后再试，不能放行内容。

> 资料依据：Toy JS SDK 能力清单（更新于 2026-09-18）。本文是精简版，完整方法签名、参数约束与错误码见 [docs/toy-js-sdk.md](docs/toy-js-sdk.md)，最终以官方文档为准。

### 路径 C：Skill

一句话安装（命令行进阶路径；小白用户可直接用页面顶部的[一句话上手](#一句话上手)）：

```sh
npx -y skills add bilibili/toy -y
```

- 不带 `-a` 时，skills CLI 自动检测本机已安装的 Agent，把 skill 装到它们各自目录；没有检测到时它只装通用目录（`.agents/skills`）。
- `npx` 前面的 `-y` 表示允许 npx 自动安装 skills CLI，末尾的 `-y` 表示跳过 skills CLI 的确认提示。两个都加上，命令才是完全非交互的（已实测）。
- 只想装某一个 Agent：`npx -y skills add bilibili/toy -a claude-code -y`。多个 Agent 用重复参数，例如 `-a claude-code -a codex -a trae-cn`；逗号或空格分隔都会被判为无效（已实测）。

**成功的标志**：输出 `Installed 1 skill` 并给出写入路径；`npx skills list` 能看到 `toy`；在 Agent 里说「介绍一下 toy 能做什么」时能复述下面[验证话术](#怎么确认-agent-真的懂了)里的要点。

**触发示例**：在对话里说「带我发布 ./my-site」或「我的 Toy 有哪些」，Agent 应自动加载 `toy` skill。

### 各 Agent 接入矩阵

装完后 Agent 是否真的能用，取决于它能不能读到自己 skills 目录里的 `SKILL.md`。下表里的路径来自 skills CLI 的官方支持列表，标注「已实测」的是在本机真实执行过的。

| Agent | 安装方式 | 验证方法 |
|---|---|---|
| **Claude Code** | `npx -y skills add bilibili/toy -a claude-code -y`（已实测，写入 `.claude/skills/toy`；加 `-g` 写 `~/.claude/skills/toy`） | 新开会话说「介绍一下 toy 能做什么」，能复述发布/统计/绑定三类能力即生效；也可用 `npx skills list` 查看 |
| **Codex** | `npx -y skills add bilibili/toy -a codex -y`（已实测，写入 `.agents/skills/toy`；`-g` 写 `~/.agents/skills/toy`） | 同上；或确认 `.agents/skills/toy/SKILL.md` 存在，并在会话里问「我的 Toy 有哪些」 |
| **Trae（国际版）** | `npx -y skills add bilibili/toy -a trae -y`（已实测，写入 `.trae/skills/toy`；`-g` 写 `~/.trae/skills/toy`） | 新开一个 Trae 会话，说「带我发布 ./my-site」，看它是否先讲前置条件与预览流程 |
| **Trae CN** | `npx -y skills add bilibili/toy -a trae-cn -y`（已实测，写入 `.trae/skills/toy`；`-g` 写 `~/.trae-cn/skills/toy`） | 同上 |
| **CodeBuddy** | `npx -y skills add bilibili/toy -a codebuddy -y`（已实测，写入 `.codebuddy/skills/toy`；项目里没有该目录时会被跳过，先建目录或改 `-g`） | 新会话问「toy 有哪些命令」，能说出 `mylist`/`create`/`stats` 即生效 |
| **OpenCode** | `npx -y skills add bilibili/toy -a opencode -y`（已实测，写入 `.agents/skills/toy`；`-g` 写 `~/.config/opencode/skills/toy`） | 同上 |
| **DeepSeek Harness Desktop** | Skill 走通用目录：`npx -y skills add bilibili/toy -a codex -g -y`（写 `~/.agents/skills`，DSH rank 500）或项目内 `.agents/skills`（rank 200）。插件另见 [DSH 插件](#dsh-插件) | 面板 **Skill** 卡片显示「已安装」及版本；或在会话里问「你能发布 Toy 吗」 |
| **WorkBuddy** | **未验证**：skills CLI 的 agent 列表里没有 WorkBuddy。回退做法：让 Agent 直接读取 `skills/toy/SKILL.md`，或按 WorkBuddy 官方文档把 `skills/toy` 复制到它的 skills 目录 | 贴上面那条「一句话上手」后，看它能否复述 toy 的定位、前置与三步发布流程 |
| **AtomCode** | **未验证**：skills CLI 的 agent 列表里没有 AtomCode。回退做法同上 | 同上 |
| **其它 Agent**（Cursor、Cline、Gemini CLI、GitHub Copilot、Kimi Code、Qwen Code、Windsurf、Qoder 等） | 用对应的 `-a` 标识，完整列表见 skills CLI 的 [agents 文档](https://github.com/vercel-labs/skills/blob/main/docs/agents.md)；标注「未验证」的条目请先按通用回退步骤操作 | 新会话触发一次「Toy 发布」类请求，看是否命中 skill |

> 表格里未列出的 Agent 不等于不支持。只要它遵循 [Agent Skills 规范](https://agentskills.io)（读取含 `SKILL.md` 的目录），通用回退步骤就能用。

#### 通用回退步骤（适用于任何 Agent）

skills CLI 不认这个 Agent，或安装后没生效时：

1. 克隆仓库：`git clone https://github.com/bilibili/toy`。
2. 把 `toy/skills/toy` 整个目录复制到该 Agent 的 skills 目录（路径以其官方文档为准；常见是 `.agents/skills/`、`.claude/skills/`、`.trae/skills/`，或全局的 `~/.agents/skills/`）。
3. 重启 Agent（多数 Agent 只在启动时扫描 skills 目录）。
4. 用验证话术确认：**「介绍一下 toy 能做什么，然后带我发布 ./my-site」**。
5. 若 Agent 完全不能读文件，直接把 `SKILL.md` 的内容贴进对话，让它照此执行。

#### 怎么确认 Agent 真的懂了

装完后在对话里说这一句：

> 介绍一下 toy 能做什么，然后带我发布 ./my-site。

**期望回应至少包含**：

- toy 是 B 站 Toy 创作者平台的 CLI，能发布/更新、看列表与 PV/UV 统计、查本地发布记录、绑定视频；
- 前置条件是宿主机装了 `toy`、并且已经 `toy login`；
- 发布不是一步到位：先内容预检 → 生成预览 → 你明确确认后才提交审核；
- 不会上来就加 `--yes`，也不会替你跳过预检。

只复述「能发布」而漏掉登录/预览确认的，说明 skill 没完整加载，按通用回退步骤重装。

#### 你会看到什么

| 阶段 | 正常表现 | 不正常表现 |
|---|---|---|
| 安装 | 输出 `Installed 1 skill` 和写入路径（`.agents/skills/toy` 或对应 Agent 目录） | 卡在询问 Project/Global：漏了 `-y` |
| 首次对话 | 先复述定位/前置/三步流程，再问你要发布哪个路径 | 直接开始猜命令、或说「我不知道 toy 是什么」：skill 未加载 |
| 首次发布 | 先跑预检，再给预览链接，等你回复「提交」 | 直接提交、或跳过预检：立即中断，不要授权 |

## 前置条件

这是仓库里**唯一的前置条件表**；`dsh/README.md` 与 `dsh/packages/toy/README.md` 只链接到这里。

| 依赖 | 版本 | 获取方式与核对 |
|---|---|---|
| DeepSeek Harness | `>=0.2.1-rc.2 <0.3.0`（`engines.dsh`） | 官方安装：`npx @deepseek-ai/dsh web`（Node.js）。核对：`npx @deepseek-ai/dsh --version`（实测输出 `0.2.1-rc.5`），应在上述范围内。桌面端用官方安装包，版本看「关于」页 |
| `toy` CLI | `v0.6.x` | macOS/Linux：`curl -fsSL https://boss.hdslb.com/toy-cli/toy/install.sh \| bash`；Windows：`irm https://boss.hdslb.com/toy-cli/toy/install.ps1 \| iex`。核对：`toy version` |
| 登录态 | — | `toy login`（浏览器 OAuth）；插件面板的「登录」按钮等价 |
| Node.js | `>=22.19` | 仅 `npx skills` 安装与源码构建需要；`toy` 二进制和 dsh 运行时不需要 |

Skill 本身不依赖 Node.js 之外的东西；真正执行发布时才需要 `toy` 与登录态。

## Skill

### 包含什么

| 文件 | 作用 |
|---|---|
| [`SKILL.md`](skills/toy/SKILL.md) | 技能定义 + 铁律、工作流、错误处理 |
| `references/installation.md` | CLI 安装与登录指引 |
| `references/content-checklist.md` | Toy 包内容预检清单（白屏陷阱、HTML 体积限制等） |
| `references/error-codes.md` | CLI 错误码与应对方式 |
| `scripts/toy_doctor.py` | 零依赖静态预检脚本，一键跑清单 |

Skill 的本质是一个目录，内含 `SKILL.md`，frontmatter 带小写连字符 `name`（与目录名一致）和 `description`；详见 [Vercel skills 源格式](https://vercel-labs-skills.mintlify.app/guides/source-formats)。

### 更新

```sh
npx skills check
npx skills update
```

### 关键原则（摘录）

- **AI 调用一律 `--json`**：人类可读表格会因列宽/超链接渲染变化而崩，`--json` 是唯一稳定契约。
- **发布不是一步到位**：带包体的 `create` / `update` 先不加 `--yes` 跑，拿到 `preview_url` 请用户检查，再**主动发起一次显式确认**，明确拿到「提交」答复后才用同参数 + `--yes` 重跑。
- **先过内容预检再发包**：ERROR 必须修、WARN 必须逐条说给用户听（WARN 不改退出码，汇总行照样 `passed`，不说等于没查）。
- **登录态失效只重试一次**：执行 `toy login` 后重试**原命令一次**，仍失败就停下，不循环。
- **破坏性本地操作要确认**：`history clear` 删除本机全部发布记录，必须先确认再加 `--yes`。

完整铁律与 5 个典型工作流（首发、更新、统计、发布记录消歧、视频绑定）见 [`SKILL.md`](skills/toy/SKILL.md)。

## DSH 插件

[`dsh/`](dsh/) 是一个轻量 pnpm workspace，用于构建 [`@bilibili/dsh-toy`](dsh/packages/toy/package.json)。DSH 加载后，左侧栏会出现 **bilibili Toy** 面板入口。安装、更新与面板速查见 [`dsh/README.md`](dsh/README.md)；配置与安全模型见 [`dsh/packages/toy/README.md`](dsh/packages/toy/README.md)。

```sh
dsh plugin --profile web add https://github.com/bilibili/toy/releases/latest/download/bilibili-dsh-toy.tgz
```

### Web UI 功能一览

| Tab | 能做什么 |
|---|---|
| **My Toys** | 我的 Toy 卡片（封面/标题/slug/id/状态/可见性），刷新、选中目标 |
| **Stats** | PV/UV 柱状图、次日留存、点赞/收藏/评论/分享汇总，支持 7/30/90 天窗口 |
| **Publish / Update** | 创建或更新；包体/封面/图标路径（带历史建议）；标题/slug/分类/可见性/密码/主题/水印/活动；本地预检（ERROR/WARN）；**生成预览**；预览后需勾选「我已检查预览」才解锁 **提交审核** |
| **History** | 本地发布/更新流水；清空需要两步确认 |

顶栏显示登录账号、解析到的 `toy` 二进制路径、CLI 版本，以及登录/登出。

访问密码只传给 CLI：在所有网络负载、摘要与确认弹窗中都会被掩码（`••••`），不会进入模型 transcript 或页面 DOM。

### 模型工具

同一套 Host 实现还向模型暴露了 `toy_*` 工具，与 Web UI 共享同一套安全闸门——不会出现 UI 拦住了而工具端漏过的情况。

### 插件不内嵌 Skill

插件不会附带自己的 Skill 副本。Skill 通过上面的 [Skill](#skill) 一节单独安装/更新。面板里的 **Skill** 卡片会展示已安装版本（skills CLI 的 lock 文件哈希）、内容哈希与更新时间，并提供安装/更新入口（运行固定命令、显示输出，不接收自由参数）。

### 配置与已知限制

所有配置项均可选，默认值以 [`cordis.patch.yml`](dsh/packages/toy/cordis.patch.yml) 注释为准。完整字段表与已知限制见 [`dsh/packages/toy/README.md`](dsh/packages/toy/README.md#configuration)。

## 项目结构

```
skills/
  toy/
    SKILL.md              # 技能定义（YAML frontmatter: name, description）
    references/           # 按需加载的支持文档
      installation.md
      content-checklist.md
      error-codes.md
    scripts/
      toy_doctor.py       # 零依赖静态预检脚本
docs/
  toy-js-sdk.md           # Toy 页面内 JS SDK 的 API 明细（精简版，官方文档为准）
dsh/
  package.json            # 私有 pnpm workspace（构建/测试工具链）
  packages/toy/           # @bilibili/dsh-toy bundle：Host、Web UI、测试
  packages/dsh-typert-protocol/  # 构建目标使用的 vendored Typert 协议
.github/workflows/        # CI：构建/测试、文档校验，以及 tag 驱动的 Release tarball
```

## 文档分工

三份 README 各有唯一职责，改文档时只改对应的一份、其余放链接：

| 文件 | 负责 |
|---|---|
| 根 `README.md` / `README.en.md` | 人类上手：一句话上手、Agent 矩阵、**唯一权威的前置条件表**、端到端示例 |
| [`dsh/README.md`](dsh/README.md) | 插件速查：安装/更新命令、面板页签、开发时本地加载 |
| [`dsh/packages/toy/README.md`](dsh/packages/toy/README.md) | 配置字段、安全模型、已知限制 |

## 开发与贡献

前置：Node.js `>=22.19`、pnpm `10.30.3`（推荐 `corepack enable`）。

```sh
cd dsh
pnpm install    # 安装构建/测试工具链（必须在 dsh/ 目录内执行）
pnpm check      # build + node:test 套件（用 fake-toy.mjs，不碰真实平台）
```

`packageManager` 声明在 `dsh/package.json`；从仓库根执行 `pnpm --dir dsh ...` 时 corepack 可能解析到另一个 pnpm 版本并报 `ERR_PNPM_BAD_PM_VERSION`，所以统一写成先 `cd dsh`。

贡献流程与模板见 [`CONTRIBUTING.md`](CONTRIBUTING.md)；贡献者与 AI Agent 的工作规则、验证手册与 Release checklist 见根目录 [`AGENTS.md`](AGENTS.md)；插件开发另见 [`dsh/AGENTS.md`](dsh/AGENTS.md)。

**重要约束（摘录）**

- 永远不要用 Toy 写命令（publish / update / submit / bind / shared-storage 写入 / history clear / login / logout）打真实平台；测试统一使用 `fake-toy.mjs` + 一次性 `DSH_HOME`。只读查询（list / stats / history）允许。
- 不要给插件内嵌一份 Skill 副本，也不要加 `skill/` 构建步骤。
- 不走 npm 发布渠道；CI 使用自动 `GITHUB_TOKEN` 创建 Release。
- 不推 tag、不 force-push `main`、不合并 PR，除非人类明确要求该操作。

## License

[MIT](LICENSE)
