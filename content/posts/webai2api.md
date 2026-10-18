---
title: "webai2api：把 DeepSeek 和智谱网页版，做成可以按 Key 分发的 OpenAI API"
date: 2026-10-19
description: "一个 Windows 免安装的小工具：内置 WebView2 登录多个 DeepSeek / 智谱账号，对外提供 OpenAI 兼容接口；每个 API Key 可以绑定自己的账号和模型，还能看每个 Key 的用量。"
category: "项目"
tags: ["AI", "Python", "Windows", "FastAPI", "opencode", "开源"]
cover: "/images/posts/webai2api/cover.svg"
---

> 项目地址：https://github.com/duruoxian/webai2api
> 下载：https://github.com/duruoxian/webai2api/releases/latest
> 当前版本：v0.1.7 ｜ Windows 免安装（解压即用）｜ MIT

![webai2api 总览](/images/posts/webai2api/overview-light.png)

## 这是个什么东西

DeepSeek 和智谱清言都有网页版，但网页版没有公开的 OpenAI 兼容 API。`webai2api` 做的事很直接：

**用内置浏览器登录你自己的网页账号，把网页端包装成本机的 OpenAI 兼容接口。**

启动后你会得到：

```
http://127.0.0.1:8800/v1
```

任何支持「自定义提供商 / OpenAI 兼容」的客户端——opencode、Cherry Studio、ChatBox、LangChain、OpenAI SDK——都能把它当成一个模型源。额度走的是你网页版账号，不需要官方 API Key。

和单账号的反代脚本不同，它是按「软件」来做的：有管理面板、多账号池、多 API Key、用量统计、登录隔离和权限控制。

## 它解决的核心问题

单账号反代最麻烦的不是接口本身，而是「给谁用」：

- 家里人/朋友想用，但你不想把账号密码或主凭证给出去；
- 每个人应该只用自己的账号，不能串到别人的会话；
- 有的人只需要某个模型，不应该能调其它模型；
- 用超了要能看出来是谁用的。

所以 webai2api 把关系拆成了三层：

```
账号（凭证）  ←多对多→  API Key（对外凭证）  ←白名单→  模型
```

- **一个账号可以绑定多个 Key**：同一个 DeepSeek 账号，可以分别发给几个人；
- **一个 Key 可以绑定多个账号**：一个人有 DeepSeek + 智谱两个账号，可以共用一个 Key 轮询；
- **Key 只能使用被勾选的模型**：网关会强校验，客户端即使硬写别的模型也会被拒绝；
- **删除 Key 后**，它的权限随之失效，历史用量仍然保留并标记为「已删除」。

## 主要功能

- **多账号池**：DeepSeek 与智谱清言账号统一管理，按模型自动路由到对应平台；
- **内置 WebView2 登录**：点「浏览器登录」在软件内部弹窗，不调用系统 Edge/Chrome，每个账号独立 profile，互不干扰；
- **OpenAI 兼容网关**：`/v1/chat/completions`、`/v1/models`，支持流式与非流式；
- **推理内容透传**：`deepseek-reasoner` 的思维链通过 `reasoning_content` 返回；
- **联网搜索**：可全局开启，也可单次请求用 `extra_body.search_enabled` 打开；
- **PoW 自动求解**：内置 `DeepSeekHashV1` 的 WASM 求解，自动处理上游挑战；
- **防风控**：请求前随机延迟、账号冷却、失败自动换号重试、并发排队；
- **按 Key 的权限**：账号范围 + 模型白名单，网关层强校验；
- **用量统计**：按模型 / 账号 / Key 汇总，支持按 Key、按账号筛选最近请求，已删除的 Key 会标红；
- **Apple 风格面板**：亮色 / 暗色一键切换，设置页自带「在其他客户端中接入」填写指引；
- **零外部服务**：SQLite 单文件存数据，所有东西都在本机。

## 界面一览

亮色主题的总览页，能看到请求数、Token、成功率、可用账号，以及按模型/按 Key 的用量：

![总览（亮色）](/images/posts/webai2api/overview-light.png)

暗色主题：

![总览（暗色）](/images/posts/webai2api/overview-dark.png)

账号页里每个账号独立登录、独立凭证：

![账号管理](/images/posts/webai2api/accounts.png)

API Key 页，每个 Key 会显示绑定的账号数与模型数：

![API Key 列表](/images/posts/webai2api/keys.png)

编辑 Key 时可以勾选可用账号和模型。勾了 DeepSeek 账号，模型列表就只会出现 DeepSeek 的模型；勾了智谱账号，才出现 GLM：

![编辑 Key 的账号与模型范围](/images/posts/webai2api/key-scope.png)

用量页支持按模型 / 按 Key 查看，最近请求可以按 Key 或账号筛选：

![用量统计](/images/posts/webai2api/usage.png)

设置页内置了给 opencode 等客户端的填写说明，每一项都能一键复制：

![在其他客户端中接入](/images/posts/webai2api/settings-guide.png)

## 快速上手

### 1. 下载与启动

到 [Releases](https://github.com/duruoxian/webai2api/releases/latest) 下载 `webai2api-win64.zip`（约 27 MB，解压后约 60 MB），解压到任意目录，双击 `webai2api.exe`。

首次启动会自动打开管理面板：

```
http://127.0.0.1:8800/admin
默认密码：admin
```

端口被占用时会自动换一个，实际端口写在同目录的 `current_port.txt`。

### 2. 添加账号

「账号」→「添加账号」→ 只填名称 → 保存。

然后点该账号的「浏览器登录」，在软件内部弹出的窗口里登录你自己的 DeepSeek 或智谱账号。登录成功后凭证会自动抓取，不需要手动复制 token。

> 智谱有个坑：打开页面 1~2 秒内会先下发一个「游客」refresh_token。webai2api 会识别 JWT 里的 `is_guest` 并忽略它，避免出现「窗口闪一下就说登录成功」的假登录。

### 3. 生成 Key，并限定范围

「API Key」→「生成 Key」→ 填备注（发给谁用）。

生成后点「编辑」，勾选这个 Key 允许使用的账号和模型。**不勾账号 = 全部账号，不勾模型 = 全部模型。**

如果只勾了一个 DeepSeek 账号，模型列表里就不会出现 GLM；反过来也一样。保存时后端还会再校验一次，防止绕过界面提交不匹配的组合。

### 4. 接入客户端

以 opencode 的「自定义提供商」为例：

| 字段 | 填写 |
|---|---|
| 提供商 ID | `webai2api` |
| 显示名称 | `webai2api` |
| 基础 URL | `http://127.0.0.1:8800/v1` |
| API 密钥 | 面板里生成的 `sk-...` |
| 模型 | `deepseek-chat`、`deepseek-reasoner`、`GLM-5.3`、`GLM-5.3-Flash` |
| 请求头 | 留空 |

模型 ID 必须和网关一致，显示名称可以随便写。模型要一条一条添加。

对应的配置文件写法：

```jsonc
{
  "provider": {
    "webai2api": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "webai2api",
      "options": {
        "baseURL": "http://127.0.0.1:8800/v1",
        "apiKey": "sk-你的Key",
        "maxRetries": 0
      },
      "models": {
        "deepseek-chat": { "name": "DeepSeek V4.1-Flash（非思考）" },
        "deepseek-reasoner": { "name": "DeepSeek V4.1-Flash 思考" },
        "GLM-5.3": { "name": "GLM-5.3" },
        "GLM-5.3-Flash": { "name": "GLM-5.3-Flash" }
      }
    }
  }
}
```

## 模型与账号的对应关系

| 模型 ID | 平台 | 说明 |
|---|---|---|
| `deepseek-chat` | DeepSeek | V4.1-Flash 非思考 |
| `deepseek-reasoner` | DeepSeek | V4.1-Flash 思考模式，返回 `reasoning_content` |
| `GLM-5.3` | 智谱清言 | 旗舰模型 |
| `GLM-5.3-Flash` | 智谱清言 | 快速模型 |

网关按模型名路由：`GLM-*` 走智谱账号池，其它走 DeepSeek 账号池。一个 Key 如果同时绑定了两个平台的账号，就可以同时使用两边的模型。

## 给别人的 Key，会不会连到我的账号

不会，前提是你在 Key 里勾了账号。

- Key 勾了某个账号 → 只能使用这些账号，其它账号即使在线也不会被选中；
- Key 不勾账号 → 表示「全部账号」，适合自己用；
- 请求里即使带 `x-account-id` 指定别人的账号，也会被拒绝；
- 模型不在白名单里，直接返回 403。

所以典型用法是：别人在你这里登录他自己的账号 → 你给他一个只绑这个账号、只勾他需要的模型的 Key。他用的是自己的额度，你随时可以停用或删除这个 Key。

## 用量与统计

- 总览：请求数、成功数、输入/输出/总 Token、可用账号；
- 模型用量：可在「按模型 / 按 Key」之间切换，环形图和表格一起变；
- 按账号：每个账号贡献了多少请求和 Token；
- 最近请求：支持按 Key、按账号筛选，可翻页；
- 已删除的 Key / 账号会标红「已删除」，历史记录不会凭空消失。

## 一些实现细节

- **面板**：FastAPI + 原生 HTML/CSS/JS，单文件页面，没有前端构建链；
- **网关**：同步客户端放到线程池里跑，避免阻塞事件循环；流式请求先拿到第一块有内容的数据再开始吐流，失败可以换账号重试；
- **登录**：pywebview + WebView2，每个账号独立 `storage_path`；登录结束后用 PowerShell CIM 精确清理残留进程，兼容没有 `wmic` 的 Win11；
- **存储**：SQLite（WAL），账号、Key、用量、设置都在一个 `data/webai2api.db` 里；
- **打包**：PyInstaller 目录模式，发布 zip 里不含 `data`，首次运行自动创建；
- **更新**：替换 `webai2api.exe` 和 `_internal` 即可，保留 `data` 目录不会丢账号和用量。

## 安全与合规提醒

这个工具的本质是**复用网页版会话**，所以有几件事必须说清楚：

- 与 DeepSeek、智谱 AI 没有任何隶属、合作或授权关系；
- 使用它可能违反对应平台的服务条款，存在被限流、封号的风险；
- 不要把接口直接暴露到公网，也不要把 Key 发给不信任的人；
- 给对方 Key 等于让对方消耗你账号的额度，建议一人一 Key，随时可停用；
- 仅供个人学习、研究与自用，请勿用于商业转售、批量注册或恶意爬取。

如果这些风险你不能接受，请不要使用。

## 更新记录

- **v0.1.7**：Apple 液态玻璃面板（亮/暗主题）、弹窗滚动重构、智谱游客 token 隔离修复、关于/免责声明、客户端接入指引、静态资源防缓存；
- **v0.1.6**：单行吸顶顶栏、设置页重构、首 token 优化、会话缓存、SQLite 索引 + WAL、退避重试、用量保留期；
- **v0.1.5**：思考强度对齐智谱三档（快速 / 深度 / 极致）；
- **v0.1.4**：新增智谱清言反代，模型 GLM-5.3 / GLM-5.3-Flash，按模型自动路由；
- **v0.1.3**：应用图标；
- **v0.1.2**：内置浏览器改为 WebView2，与系统浏览器零冲突；
- **v0.1.1**：首个发布版，修复并发阻塞、windowed exe 启动卡死等问题。

> 本文发布时的代码版本为 v0.1.7。之后新增的「Key 绑定账号/模型」「按 Key 查看用量」「最近请求筛选」等功能已经合入仓库，会在下个版本一起打包。

## 下载

- GitHub：https://github.com/duruoxian/webai2api
- Releases：https://github.com/duruoxian/webai2api/releases/latest

如果这个项目对你有帮助，欢迎点个 Star。
