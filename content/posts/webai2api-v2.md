---
title: "webai2api 续篇：四个平台全部打通——Kimi 的 Connect 协议、千问的隐藏浏览器中继，与封号的两个根因"
date: 2026-10-23
description: "从 v0.1.7 到 v0.1.20 的完整演进：Kimi 走网页版 Connect 协议、通义千问用隐藏浏览器中继绕开阿里风控，把思考档位对齐真实产品、会话级防封、每账号出口分流——四家平台在 v0.1.20 全部放开。"
category: 项目
tags: ["AI", "Python", "Windows", "FastAPI", "opencode", "逆向"]
series: "webai2api"
cover: "/images/posts/webai2api/cover.svg"
---

> 项目地址：https://github.com/duruoxian/webai2api
> 下载：https://github.com/duruoxian/webai2api/releases/latest
> 当前版本：v0.1.20 ｜ Windows ｜ MIT
>
> 上一篇（v0.1.7）讲的是「怎么把网页版变成 API」。这一篇讲之后发生的事：
> 怎么把 Kimi 和千问真正打通，以及为此踩过的坑。

## 先说结论：现在它是什么

一个 Windows 本地程序，把 **四个平台**的网页版账号包装成本机 OpenAI 兼容接口：

| 平台 | 模型 | 思考档位 |
|---|---|---|
| DeepSeek | `deepseek-chat` / `deepseek-reasoner` | 不思考 / 深度思考 |
| 智谱清言 | `GLM-5.3` / `GLM-5.3-Flash` | 快速 / 深度 / 极致 |
| Kimi | `kimi-k3` / `kimi-k2.8` / `kimi-k2.6` | 标准 / 进阶 / 极致（k2.6 无极致）|
| 通义千问 | `qwen3.7-plus` / `qwen3.8-max` / `qwen3.8-omni-flash` | 自动 / 思考 / 快速（flash 两档）|

对外一个地址，开发端各客户端都从这里接：

```
http://127.0.0.1:8800/v1
```

## v0.1.20：把 Kimi 和千问真正打通

v0.1.18 时这两家只是「接进去了」，实际发消息要么返回空、要么被风控拦。这一版才把它们跑到能日常用，两家踩的是完全不同的坑。

### Kimi：网页版不是 REST，是 Connect 协议

一开始对着 `/api/chat` 试了半天，它返回的是一个**新建会话对象**，不是回答。翻前端 bundle 才看清：网页版用的是 `@connectrpc/connect`，真正的聊天端点是：

```
POST /apiv2/kimi.gateway.chat.v1.ChatService/Chat
Content-Type: application/connect+json
```

请求体是 **5 字节帧头 + JSON**，响应也是流式帧（每帧 5 字节头 + 一个 JSON 事件）：

```json
{"op":"append","mask":"block.text.content","block":{"text":{"content":"..."}}}
{"op":"append","mask":"block.think.content","block":{"think":{"content":"..."}}}
```

还有个必须记的细节：**模型和 scenario 必须配对**。

| 对外模型 | 内部 id | scenario |
|---|---|---|
| `kimi-k3` | `k3-agent` | `SCENARIO_OK_COMPUTER` |
| `kimi-k2.8` | `k28-agent-preview` | `SCENARIO_OK_COMPUTER` |
| `kimi-k2.6` | `k2d6-chat` | `SCENARIO_CHAT` |

我最开始把 k3 也配成 `SCENARIO_CHAT`，服务端一律回 `invalid_argument`，我还以为是账号没买套餐——其实是参数配错了。这算这轮最大的一个误判，写代码时最怕把「我调错了」当成「对方不让用」。

### 千问：纯 HTTP 一定被风控，只能在页面里发请求

千问的接口本身很简单（`POST /api/v2/chat/completions`），但从 Python 发，阿里风控直接给你一个滑块惩罚页（`FAIL_SYS_USER_VALIDATE`）。原因是要 `bx-ua`、`bx-umidtoken` 这些由浏览器 JS 现算的头。

最后的方案是**每个账号挂一个隐藏的 WebView2 中继**：

```
主程序 ──本地 HTTP──> 中继进程 ──> 隐藏浏览器加载 chat.qwen.ai
                                    └─ 页面内 fetch，baxia SDK 自动补头
```

- 用登录时那份浏览器 profile，cookie 天然有效
- `fetch` 的流通过 pywebview 桥回传，再转成 OpenAI 的 SSE
- 首次调用要拉起浏览器，冷启动约 10~15 秒；之后常驻复用
- 千问 token 只有 15 分钟，且服务端**没有** `/auths/refresh`（实测 404），
  所以过期时是中继「整页重载」让网页自己换票；换不到（cookie 也过期）才弹窗让人重登

这个方案不优雅，但它是唯一稳定的。纯 HTTP 那套我试过各种补头，都过不去。

## 第一件难事：思考档位不是「开关」，是分档

最初我把所有平台的思考模式都当成二元的：开 / 关。接入 Kimi 和千问之后发现不对——它们的产品形态是三档，而且**不同模型支持的档位还不一样**。

以 Kimi 为例：

- `kimi-k3`、`kimi-k2.8`：标准 / 进阶 / 极致
- `kimi-k2.6`（网页上标成「快速」的那个）：只有标准 / 进阶

千问更绕：

- `qwen3.7-plus`、`qwen3.8-max`：自动 / 思考 / 快速
- `qwen3.8-omni-flash`：只有思考 / 快速，**没有自动**

所以映射不能只看客户端传的 `reasoning_effort`，必须**结合模型 ID**。我的做法是把档位判定收敛成两个纯函数：

```python
def _tier_for(effort: str, model: str) -> str:
    """reasoning_effort → Kimi 三档；K2.6 没有极致档，请求极致降为进阶"""
    e = (effort or "").strip().lower()
    if e in ("max", "highest", "extreme"):
        return "进阶" if "k2.6" in model.lower() else "极致"
    if e in ("medium", "high"):
        return "进阶"
    return "标准"
```

千问那边对应的是三个真实的请求字段组合（从它前端 bundle 里挖出来的判定逻辑）：

```
自动 → thinking_enabled = False, auto_thinking = True
思考 → thinking_enabled = True,  auto_thinking = False
快速 → thinking_enabled = False, auto_thinking = False
```

这个逻辑我不是猜的。千问前端里有一段判断：

```js
auto_thinking ? "Auto" : (thinking_enabled ? "Thinking" : "Fast")
```

而且对 `auto_thinking` 为假的模型只返回 `["Thinking", "Fast"]` 两项。
和产品表现完全对得上。

> 顺带一个坑：我一开始按记忆写了 `qwen3.7-max`、`qwen3.6-flash`，
> 结果真实接口 `/api/v2/models/` 返回的是 `qwen3.8-max`、`qwen3.8-omni-flash`。
> **模型 ID 这种事必须以线上接口为准，不能凭印象。**

客户端侧，这些档位会变成 opencode 的 `variants`，用户在一个下拉里选：

```jsonc
"kimi-k2.6": {
  "variants": {
    "标准": { "reasoningEffort": "low" },
    "进阶": { "reasoningEffort": "high" }
  }
}
```

这份配置由面板按「你实际勾选的模型」动态生成，不用手写。

## 第二件难事：为什么账号会被封

做多账号分发之后，最先出问题的是封号。复盘下来有两个根因，都是「行为不像人」。

### 根因一：每一轮对话都在新建会话

早期的会话缓存 key 用的是「完整历史 + 模型」的哈希。这看起来很合理，实际上完全失效——
每多一轮对话、每多一次工具调用，历史就变一次，哈希就变一次，缓存永远 MISS。

结果就是：一个用户问 20 轮，上游就多了 20 个会话。在风控眼里，这是一个刚注册的账号在疯狂开新会话。

改成「对话指纹」：

```python
system[:200] + 第一条user[:500] + model + api_key_id
```

同一个对话从第一句到第一百句，指纹都不变。这才真正复用了一个会话。
再加两个保险：单会话最多 40 轮（超了轮换）、缓存落盘（重启不丢）。

### 根因二：设备指纹每次请求都在变

智谱适配器早期有两个随机：

- `X-Device-Id` 每次请求随机生成
- `User-Agent` 每次请求随机挑

这两条放在一起，等于告诉风控「这个账号正在被几十台设备轮流登录」。
现在改成：**登录时抓一次真实的 UA 和平台，写进账号 profile，之后永远复用**；
`device_id` 由账号 ID 派生一次，之后固定。

还有一个隐蔽的 bug：多轮请求时 body 里漏传了 `conv_id`，
导致「服务端会话复用」这段代码写了但从未生效。修好之后，
同一个对话在上游是同一个会话，而不是 N 个。

## 第三件难事：出口 IP

这一块最容易被误解，值得单独说清楚。

每个账号可以选「连接方式」：直连 / 跟随系统代理 / 自定义代理。
聊天、健康检查、内置浏览器登录**三条链路共用同一个出口**——
这是有意的，避免「登录一个 IP、请求另一个 IP」这种强关联信号。

但很多人（包括我）对 TUN 模式有误解。实测数据：

| 目标 | 直连 | 跟随系统 | 走 Clash 7897 |
|---|---|---|---|
| 国内站回显 | 家宽 IP | 家宽 IP | 家宽 IP |
| 国外站回显 | 节点 IP | 节点 IP | 节点 IP |

结论有点反直觉：**Clash 开 TUN + 规则模式时，「直连」和「走代理」对国内站来说出口是一样的。**

原因是 TUN 在网卡层接管了所有流量，应用层设不设代理都没用；
而规则模式对国内域名判 `DIRECT`，最终仍然从物理网卡用真实 IP 出去。

所以：

- 你接的是国产站 → TUN 开着也无所谓，「直连」是有效的；
- 只有把 Clash 切成**全局模式**，直连账号才会被强制走节点；
- 想让多个账号用不同 IP → 必须用 `custom` 各填不同的住宅代理，
  靠「直连 vs 系统代理」是分不出来的。

面板现在会自动探测 TUN、Clash 混合端口和全局/规则模式，
并在顶部给出准确提示（而不是笼统地说「直连无效」）。

## 其他值得记录的小修复

- **相对导入层级错误**：智谱适配器的 `_conn` 里写了 `from ....egress`（4 个点），
  但它只有 3 层包结构。这个错误会导致**冻结版每次聊天都 ImportError**，
  而单元测试不跑真实连接，所以一直没暴露。是新写的 e2e 测试（本地 mock 服务器）
  把它逼出来的。
- **WebView2 残留进程**：旧的登录 profile 目录删不掉，
  因为上个窗口的 `msedgewebview2.exe` 还锁着 cookie。
  现在开窗前按命令行精确杀掉本账号目录的进程，再 rmtree，
  失败才退化为精确删除 `Cookies` / `Local Storage` / `Session Storage`。
- **登录窗口里的旧账号**：除了缓存，还有一个来源是微信/QQ 客户端本身记住的账号，
  那个不在浏览器 profile 里，清缓存清不掉。

## 更新记录（v0.1.8 → v0.1.20）

- **v0.1.20**：Kimi 改走网页版 Connect 协议（k3 / k2.8 / k2.6 全部可用，含思考与联网）；千问改为「每账号隐藏浏览器中继」绕过阿里风控；修复千问健康检查解包错误与删除会话接口 bug；四家平台全部放开；
- **v0.1.19**：登录窗口显示出口；网络诊断更准确；
- **v0.1.18**：接入 Kimi / 通义千问；思考档位按真实产品分档；修复智谱打包版导入错误；
- **v0.1.17**：登录残留清理；
- **v0.1.16**：TUN / Clash 全局模式识别 + 「交给 Clash 分流」预设；
- **v0.1.15**：登录窗口出口角标；WebView2 残留进程清理；
- **v0.1.14**：Kimi / 千问适配器（开发端）；
- **v0.1.13**：每账号出口模式（直连 / 系统代理 / 自定义），三条链路统一；
- **v0.1.12**：代理连通性测试；SOCKS5 支持（PySocks）；
- **v0.1.10**：接入方式合并；一键接入 / 移除 opencode；Key 生成防连点；
- **v0.1.8**：会话复用与连接保持。

## 现在能做什么

四家平台（DeepSeek / 智谱清言 / Kimi / 通义千问）都能当普通 OpenAI 模型用：同一个 `/v1`、同一个 Key，流式、非流式、多轮、思考内容都通。千问首次调用会慢十几秒（要拉起隐藏浏览器），之后正常。

现在：

1. 下载 `webai2api-win64.zip`，解压即用，`http://127.0.0.1:8800/admin`
2. 添加四个平台的任意账号，内置浏览器登录
3. 建 Key，勾选允许的账号与模型
4. 面板一键接入 opencode

## 一点感想

这个项目从「把网页版包一层」到四家平台全部可用，中间隔着的不是功能，而是**一堆反直觉的细节**：

- 模型 ID 要以线上接口为准，不能靠文档和记忆；
- 思考档位是「模型 × 档位」的二维表，不是开关；
- 封号的主要原因是「行为不像人」，不是请求太多；
- TUN 开了之后，应用层的「直连」到底是不是直连，取决于 Clash 的规则。

## 下载

- GitHub：https://github.com/duruoxian/webai2api
- Releases：https://github.com/duruoxian/webai2api/releases/latest

如果这个项目对你有帮助，欢迎点个 Star。
