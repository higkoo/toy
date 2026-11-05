# Toy JS SDK 参考

> 面向 Toy 页面开发者的精简 API 明细。资料依据：Toy JS SDK 能力清单（更新于 2026-09-18）。**最终以官方文档为准**；这里只记录接入方式、方法签名、关键约束与常见错误。

## 接入

在 Toy 页面 HTML 的 `<head>` 中引入：

```html
<script src="//s1.hdslb.com/bfs/seed/toy/app/sdk/toy-sdk.js"></script>
```

加载后全局可用 `window.toy`。除 `onContainerChange` **同步返回取消函数**外，其余方法都返回 Promise。

数据限制：SDK 仅在用户确认后返回 `getUserProfile` 约定的头像、昵称和当前 Toy 内用户标识；不会提供 UID / MID、登录令牌或跨 Toy 可识别的账号信息。

## 方法索引

| 方法 | 签名 | 返回 | App | Web |
|---|---|---|---|---|
| `isSupport` | `(ability: string)` | `Promise<boolean>` | ✅ | ✅ |
| `navigate` | `({ type, id, extra? })` | `Promise<void>` | ✅ | ✅ |
| `saveImageToAlbum` | `({ url?, base64Data?, hintMsg? })` | `Promise<{ localPath }>` | ✅ | ❌ |
| `share` | `({ path })` | `Promise<void>` | ✅ | ❌ |
| `getQrCode` | `({ path?, size? })` | `Promise<{ base64, url }>` | ✅ | ✅ |
| `closeBrowser` | `()` | `Promise<void>` | ✅ | ❌ |
| `getUserProfile` | `()` | `Promise<{ avatar, nickname, toyOpenId? }>` | ✅ | ✅ |
| `getAuthorProfile` | `()` | `Promise<AuthorProfileResp>` | ✅ | ✅ |
| `getAuthorVideos` | `({ videos })` | `Promise<AuthorVideosResp>` | ✅ | ✅ |
| `getAuthorRelation` | `()` | `Promise<AuthorRelationResp>` | ✅ | ✅ |
| `getVideoUserActions` | `({ aids? , videos? })` | `Promise<VideoUserActionsResp>` | ✅ | ✅ |
| `setCloudStorage` | `(items: Record<string,string>)` | `Promise<void>` | ✅ | ✅ |
| `getCloudStorage` | `(keys?: string[])` | `Promise<Record<string,string>>` | ✅ | ✅ |
| `removeCloudStorage` | `(keys: string[])` | `Promise<void>` | ✅ | ✅ |
| `setSharedStorage` | `(storageId, items)` | `Promise<void>` | ✅ | ✅ |
| `getSharedStorage` | `(storageId, keys?)` | `Promise<Record<string,string>>` | ✅ | ✅ |
| `removeSharedStorage` | `(storageId, keys)` | `Promise<void>` | ✅ | ✅ |
| `submitScore` | `({ board?, score })` | `Promise<{ score }>` | ✅ | ✅ |
| `getRankList` | `({ board?, period?, limit? })` | `Promise<RankItem[]>` | ✅ | ✅ |
| `getMyRank` | `({ board?, period? })` | `Promise<{ ranked, rank, score }>` | ✅ | ✅ |
| `requestCamera` | `({ facingMode? })` | `Promise<MediaStream>` | ✅ | ✅ |
| `requestMicrophone` | `()` | `Promise<MediaStream>` | ✅ | ✅ |
| `stopMedia` | `(stream: MediaStream)` | `Promise<void>` | ✅ | ✅ |
| `onContainerChange` | `(listener)` | `() => void` | ✅ | ❌ |
| `getContainerState` | `()` | `Promise<ToyContainerState>` | ✅ | ❌ |
| `setContainerMode` | `({ orientation?, immersive? })` | `Promise<void>` | ✅ | ❌ |
| `checkInputSafety` | `({ text, scene? })` | `Promise<CheckInputSafetyResp>` | ✅ | ✅ |

## 关键约束

### 导航

```js
await toy.navigate({ type: 'video', id: 'BV1Hh411S7Ys', extra: { from: 'toy' } })
```

`type`：`video` | `space` | `search` | `opus` | `tribee` | `toy`；`id` 必填。**必须在用户手势中调用**。

### 分享与二维码

- `share({ path })`：`path` 是相对当前 Toy 页面根的路径，可带 query；绝对 URL 或 `../` 越界抛 `invalid_param`；页面不在 `/toy/<slug>/` 下抛 `unsupported`。仅 App。
- `getQrCode({ path?, size? })`：两端都支持。`path` 省略即首页；`size` 为 [80, 1024] 的整数，默认 320。返回 PNG data URL，可直接赋给 `img.src`，也可原样作为 `saveImageToAlbum` 的 `base64Data`。只能编码当前 Toy 内的页面，不能编码任意文本。
- `saveImageToAlbum`：`url` 与 `base64Data` 二选一，同传优先 `url`；`base64Data` 上限 5MB（按 base64 字符串长度计，含前缀与空白），建议 ≤2M。仅 App；Web 用 `<a download>` 或 canvas blob 下载。
- `closeBrowser()`：关闭当前 WebView。仅 App。

### 用户与作者信息

- `getUserProfile()`：返回 `{ avatar, nickname, toyOpenId? }`。首次调用需用户操作触发平台数据确认弹窗；OpenID 模式关闭时省略 `toyOpenId`。
- `getAuthorProfile()` / `getAuthorRelation()`：只读当前 Toy 作者，不能指定作者 ID。
- `getAuthorVideos({ videos })`：1–50 项，每项 `{ aid }` 或 `{ bvid }`；SDK 去重并保留首次顺序。
- `getVideoUserActions({ aids?, videos? })`：`aids` 与 `videos` 二选一（都传或都不传报错），1–50 项。
- 以上仅校验登录态，不触发用户数据确认；外部手机浏览器返回 `unsupported`。

### 云存储与共享存档

云存储按「登录用户 + Toy」隔离；共享存档按「玩家 + storageId」隔离，被授权的多个作者名下 Toy 共用同一份数据。

- 单个 Toy 最多 128 个 key-value。
- key：字母、数字、`_`、`-`，≤128 字节，不能以 `__` 开头（平台保留）。
- value：字符串，≤1024 字节；存对象自行 `JSON.stringify` / `JSON.parse`。
- `storageId` 形如 `st_` + 16 位小写字母数字，在创作中心「共享存档」页创建。作者未授权报 `no_permission`，存档被删报 `not_found`，这两类重试无用。
- 写入 / 删除失败时 Promise reject，请 `try/catch`。

```js
await toy.setCloudStorage({ coins: '100', level: '5' })
const { coins } = await toy.getCloudStorage(['coins'])
const all = await toy.getCloudStorage()
await toy.removeCloudStorage(['level'])
```

### 排行榜

按「Toy + `board` + `period`」隔离。`board` 固定 1–5（含义由 Toy 自定义），默认 1；`period` 为 `all` / `month` / `week` / `day`，默认 `all`。

- `score` 为整数，范围 -16777216 ~ 16777215，允许 0 / 负数；是**绝对分数**，服务端只保留历史最高分。
- `getRankList` 游客可读，`limit` ≤100，同分先达成者靠前。
- `getMyRank` 需登录；**是否上榜必须看 `ranked`**，不能看 `score`。

```js
const { score } = await toy.submitScore({ board: 1, score: 100 })
const list = await toy.getRankList({ board: 1, period: 'week', limit: 50 })
const mine = await toy.getMyRank({ board: 1, period: 'week' })
```

### 摄像头与麦克风

```js
const stream = await toy.requestCamera({ facingMode: 'environment' }) // user | environment
videoEl.srcObject = stream
await videoEl.play().catch(() => {})   // 远端流异步到达，iOS 上仅 autoplay 不会起播

const mic = await toy.requestMicrophone() // 不接受参数
audioEl.srcObject = mic

await toy.stopMedia(stream)            // 用完必须停止并释放设备
```

两者都必须由用户手势触发。

### 容器状态（仅 App）

`onContainerChange(listener)` 同步返回取消函数，调用后先收到一次完整状态，之后只在变化时通知；`changedFields` 标出变化字段。

`getContainerState()` 主动读取一次，`changedFields` 恒为空数组。

`setContainerMode({ orientation?, immersive? })` 原子更新，两个字段都不传抛 `invalid_param`。**`Promise<void>` 不是成功回执**：先 `onContainerChange` 再 `setContainerMode`，收到匹配状态才算成功；没收到变化无法确认。

```js
let pending = null
const off = toy.onContainerChange((state) => {
  if (pending && state.immersive === pending.immersive) {
    pending = null
    console.log('已生效', state)
  }
})
pending = { immersive: true }
await toy.setContainerMode(pending)
off() // 不再需要时取消监听
```

### 玩家输入检测

`checkInputSafety({ text, scene? })` 无需申请权限点，所有 Toy 可用。`text` 非空且 ≤16384 字节（UTF-8，一个汉字 3 字节）；`scene` 仅 `[A-Za-z0-9_.:-]`、≤64 字节，不参与判定。

返回 `ok` / `rejected` / `unavailable` 三态。**`unavailable` 表示检测没跑成，不等于通过**，不要放行。有调用配额：在提交时检测，不要每次按键都调用；命中限流抛 `307044`。

```js
const { passed, status } = await toy.checkInputSafety({ text: nicknameInput.value, scene: 'nickname' })
if (passed) saveNickname(nicknameInput.value)
else if (status === 'rejected') tip('这个昵称不能用，换一个试试')
else tip('暂时没法验证，稍后再试') // unavailable
```

## 频率限制与重试

云存储、共享存档、排行榜按 Toy 共享额度。超限 reject：`type === 'http_error'`、`code === 307044`。

```js
try {
  await toy.setCloudStorage({ coins: '100' })
} catch (error) {
  if (error.type === 'http_error' && error.code === 307044) {
    // 指数退避后重试，并明确提示玩家；不要立即原样重试
  } else {
    // 未登录 / 参数非法等，按业务处理
  }
}
```

实践：存档只在结算、过关、页面隐藏等关键节点落盘；用批量读写代替循环；结果本地缓存，不轮询；`submitScore` 在结算时提交一次。

## 错误

- 所有错误带 `[ToySDK]` 前缀。
- Web 端不支持的方法调用会抛 `unsupported`；调用前用 `isSupport` 判断。
- 参数问题抛 `invalid_param`。
- 作者未授权共享存档 `no_permission`；存档不存在 `not_found`。
