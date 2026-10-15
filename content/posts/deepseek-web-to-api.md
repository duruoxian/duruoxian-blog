---
title: "把 DeepSeek 网页版变成 OpenAI 兼容 API：deepseek2api-fixed 部署全记录"
date: 2026-10-15
description: "在 Windows 上部署 deepseek2api-fixed，把 chat.deepseek.com 转成本地 OpenAI 兼容接口，接进 opencode 当模型源用；顺带修了三个反代 bug：思考混进正文、工具调用不执行、上传图片解析失败导致整条消息被吞。"
category: "项目"
tags: ["AI", "Python", "Windows", "opencode", "开源"]
cover: "/images/posts/deepseek-web-to-api/cover.svg"
---

> 项目地址：https://github.com/duruoxian/deepseek2api-fixed （基于 `safe049/deepseek2api`，MIT）
> 本文记录我在 Windows 上把它跑起来、接进 opencode、以及顺手修掉的三个坑的完整过程。

## 这是个什么项目

DeepSeek 网页版（chat.deepseek.com）有网页界面，但**没有公开的 OpenAI 兼容 API**；官方 API（api.deepseek.com）要单独充钱、token 另算。

`deepseek2api` 这类项目做的事就是：**复用你浏览器登录网页版的凭证，把网页端包装成一个本地的 OpenAI 兼容接口**（`http://127.0.0.1:8000/v1`）。这样任何支持 OpenAI 格式的客户端——opencode、Cherry Studio、各种 SDK——都能直接把它当模型源用，额度走的是你网页版的账号。

它内部要解决的核心问题是 DeepSeek 的 **PoW 反爬**：每次请求前要先解一个哈希挑战（`DeepSeekHashV1`，难度 144000），求解逻辑在一个 WASM 里。所以部署时得准备一个 `sha3_wasm_bg.wasm` 文件。

## 前置准备

- **Python 3.12+**（我用 3.12.10）
- **一个已登录的 DeepSeek 网页版账号**（拿凭证用）
- 会看浏览器 F12

### 1. 克隆与装依赖

```powershell
git clone https://github.com/duruoxian/deepseek2api-fixed.git
cd deepseek2api-fixed
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e .
```

### 2. 拿到 WASM 文件

打开 https://chat.deepseek.com ，F12 → Network，刷新页面，在资源列表里找：

```
sha3_wasm_bg.7b9ca65ddd.wasm   ← 名字带一串哈希
```

下载它，**重命名成 `sha3_wasm_bg.wasm`**，放到项目根目录：

```
deepseek2api-fixed\sha3_wasm_bg.wasm
```

注意是放到 `deepseek2api-fixed` 文件夹里，不是新建文件夹。项目默认读 `./sha3_wasm_bg.wasm`，所以文件名必须去掉那串哈希。

### 3. 配置 .env

```powershell
Copy-Item configs\env.example .env
```

然后填四个凭证。这四项都要从浏览器里抓——最省事的办法是在 DeepSeek 页面按 F12 打开 **Console**，粘一句 JS 一次性读出来：

```javascript
copy(JSON.stringify({
  t: localStorage.getItem('userToken'),
  d: localStorage.getItem('deepseek-device-id:chat'),
  s: localStorage.getItem('settingsJwt'),
  c: document.cookie
}));
```

（Chrome/Edge 会弹「允许粘贴」提示，输入"允许粘贴"回车放行即可。）

注意 `userToken` 和 `settingsJwt` 存的是 `{"value":...,"__version":"0"}` 这种包装，取里面的 `value`；`settingsJwt` 里还要再取一层 `jwt` 字段。对应关系：

| `.env` 变量 | 来源 |
|---|---|
| `DEEPSEEK_AUTH_TOKEN` | `userToken.value`（去掉 `Bearer ` 前缀） |
| `DEEPSEEK_DEVICE_ID` | `deepseek-device-id:chat` |
| `DEEPSEEK_SETTINGS_TOKEN` | `settingsJwt.value.jwt`（JWE 长串） |
| `DEEPSEEK_COOKIE` | `document.cookie` 全串 |

几个保持默认别乱动：`CORS_ENABLED=false`、`TOOL_NAME_STRICT=true`、`TOOL_JSON_FALLBACK=false`。

**安全提醒**：`.env` 里是明文凭证，`.gitignore` 已经忽略了它和 wasm 文件，千万别提交。

### 4. 启动

```powershell
python main.py
```

监听 `http://127.0.0.1:8000`，验证：

```powershell
curl http://127.0.0.1:8000/health
# {"status":"ok", ...}
```

管理面板在 `http://127.0.0.1:8000/admin`（默认密码 `admin`）。

## 接进 opencode

在 `~/.config/opencode/opencode.jsonc` 的 provider 块里加一个：

```jsonc
"deepseek-web": {
  "npm": "@ai-sdk/openai-compatible",
  "name": "DeepSeek 网页版反代",
  "options": {
    "baseURL": "http://127.0.0.1:8000/v1",
    "apiKey": "local",
    "maxRetries": 0
  },
  "models": {
    "deepseek-chat": { "name": "DeepSeek V4.1-Flash (识图/1M)", "attachment": true, "reasoning": true,
      "modalities": { "input": ["image", "text"], "output": ["text"] },
      "limit": { "context": 1000000, "output": 384000 } },
    "deepseek-reasoner": { "name": "DeepSeek V4.1-Flash 思考 (识图/1M)", "attachment": true, "reasoning": true,
      "modalities": { "input": ["image", "text"], "output": ["text"] },
      "limit": { "context": 1000000, "output": 384000 } }
  }
}
```

重启 opencode，模型选择里就能看到这两个了。

顺带说下 `maxRetries: 0`：opencode 底层是 AI SDK，默认对失败请求会自动重试（最多 3 次）。当反代的上游流中途断掉时，重试会让**同一条消息被生成好几遍**、叠在界面上。关掉自动重试能根治"一次提问回出多段答案"的现象。

## 网页版背后其实是 V4.1-Flash

抓包能看到，反代转发给网页端的 `model_type` 只有两个值：`deepseek-chat → default`、`deepseek-reasoner → expert`（深度思考）。网页端不暴露具体版本号，但对照官方文档，它背后就是 **DeepSeek-V4.1-Flash**：支持 Vision（识图）、1M 上下文、384K 输出。所以上面配置里我把上下文和输出上限都按官方参数写了。

## 踩坑记录：三个反代 bug

跑起来之后，我遇到了三个问题，都出在反代本身，顺手修掉了（已提 PR 到上游）。

### 坑一：思考过程混进回复正文

用 `deepseek-reasoner` 时，回答长这样：

```
The user just said "你好" (hello). Simple greeting. Respond briefly.有什么需要我做的？
```

英文思考（`The user just said...`）和中文回答粘在一条消息里，很丑。

**根因**：反代把上游的思考片段映射到 OpenAI 的 `reasoning_content` 字段（这个字段 opencode 会折叠显示），正常应该分开。但网页端思考片段的类型字段是 **`"THINK"`**，而反代代码判断的是 **`"THINKING"`**——差一个字母，不匹配，于是思考被当成正文输出了。

**修复**：把判定改成兼容两者：

```python
# translator.py
if frag_type in ("THINK", "THINKING"):
    delta["reasoning_content"] = content
else:
    delta["content"] = content
```

### 坑二：reasoner 带工具时，工具不执行，DSML 全糊在思考里

更麻烦的一个。我让 DeepSeek 生成一个文件，它没去调 `write` 工具，而是吐了一堆这样的文本：

```
DSML | calls> < | DSML | invoke name="write"> < | DSML | parameter name="filePath" ...
```

**背景**：网页版没有原生工具调用。反代的做法是**在提示词里教模型按一套 `｜｜DSML｜｜` 标记来输出工具调用**，然后自己把这段文本解析回标准的 `tool_calls` 结构。这套解析在 `deepseek-chat` 下是好的。

我用调试转储抓了上游原始事件流，发现问题在**片段边界**。`expert`（深度思考）模式的真实事件流是：

1. 先开一个 `type: "THINK"` 片段（思考），哗哗输出一堆自然语言；
2. 思考结束后，**再开一个 `type: "RESPONSE"` 片段**，工具调用的 DSML 就在这里；
3. 后面的续写用裸值 `{"v": "..."}` 追加到当前片段。

关键是那个"**新开片段**"事件：`{"p": "response/fragments", "o": "APPEND", "v": [{"id":3, "type":"RESPONSE", ...}]}`。反代的流式转换器**漏处理了它**——没有把当前片段类型从 `THINK` 更新成 `RESPONSE`。结果后续的 DSML 续写全被当成"还在思考"，一股脑塞进了 `reasoning_content`，工具解析器根本看不到。

我一开始图省事，用了个下策：**请求带 tools 时强制把 reasoner 降级成非思考模式**（`model_type=default`）。这样确实能用了，但代价是——**一旦带工具就没了思考**，跟官方 API"先 reasoning 再 tool_calls"的行为不一样。

后来还是决定做对：直接修那个漏掉的事件处理。

```python
# translator.py —— 处理“新片段声明”，及时更新当前片段类型
if operation == "APPEND" and path == "response/fragments" and isinstance(value, list):
    out_delta = None
    for frag in value:
        if not isinstance(frag, dict):
            continue
        frag_type = frag.get("type", "RESPONSE")
        state.last_fragment_type = frag_type          # ← 关键
        content = frag.get("content", "")
        if isinstance(content, str) and content:
            delta = {}
            if state.is_first_content:
                delta["role"] = "assistant"
                state.is_first_content = False
            if frag_type in ("THINK", "THINKING"):
                delta["reasoning_content"] = content
            else:
                delta["content"] = content
            out_delta = delta
    if out_delta is not None:
        return _build_chunk(model, out_delta, None, completion_id)
    return None
```

修完之后，`deepseek-reasoner` 带工具时**思考和工具调用终于共存**了，跟官方 API 的行为对齐：

```
reasoning_len: 343          ← 思考保留
content_len: 1              ← 正文干净，无 DSML 污染
tool_calls chunks: 2        ← 工具正确解析
finish: tool_calls
```

### 坑三：上传图片解析失败，整条消息被吞（网页版"不回复也不报错"）

有一次用带图片的会话，模型突然**既不回复也不报错**，界面就卡着。

翻日志发现上游返回：

```
event: update_file
data: {"id":"file-xxx","status":"FAILED","file_name":"image_0.png","error_code":50404,"retryable":true}
event: hint
data: {"type":"error","content":"解析失败，消息未能发送","finish_reason":"file_parse_error"}
```

**根因**：反代把图片上传给网页端后，拿到一个 `file_id`，**但文件在服务端是异步解析的**。某张图解析失败了（`error_code 50404`），而反代**把这个坏 file_id 缓存了起来**——之后每次请求都复用这个 ID，于是每次都触发 `file_parse_error`，整条消息被丢弃。

更巧的是，那张图重新上传一次就成功了——说明不是图本身永久坏，是上传那一刻的偶发问题，反代却没做兜底。

**修复**：加"自愈"——遇到 `file_parse_error` 时，清空文件缓存、去掉图片附件降级重试一次：

```python
# deepseek_client.py
except FileParseError as exc:
    file_retries += 1
    self._invalidate_and_delete_session(resolved)
    if anything_yielded or file_retries >= MAX_FILE_PARSE_RETRIES:
        raise UpstreamAPIError(status_code=502, message=f"上游文件解析失败: {exc}") from exc
    cleared = self.file_uploader.clear_cache()      # 清掉可能损坏的 file_id 缓存
    payload = _strip_image_messages(payload)        # 去掉图片
    resolved = self._resolve_conversation(payload)  # 纯文本重发
```

这样图片正常时照常识图；万一解析失败，会降级成纯文本重发，不会再整条卡死。`FileUploader` 里也补了 `invalidate()` / `clear_cache()` 两个方法。

## 让它开机自启（Windows）

手动开窗口太麻烦，配个开机自启。用一个 `.cmd` 包一层（保证工作目录正确，且用 `pythonw.exe` 无窗口后台跑）：

```cmd
@echo off
cd /d "D:\study\deepseek2api-fixed"
start "" /b ".venv\Scripts\pythonw.exe" "main.py"
```

存成 `start-deepseek2api.cmd`，然后写进当前用户的注册表 Run 项：

```powershell
Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' `
  -Name 'deepseek2api' -Value '"D:\study\deepseek2api-fixed\start-deepseek2api.cmd"'
```

重启电脑后服务会自动起来。想手动重启，先 `Stop-Process -Name pythonw` 再跑那个 `.cmd`。

## 验证清单

部署完我是这么逐项验的（都通过）：

| 场景 | 结果 |
|---|---|
| `deepseek-chat` 纯文本 | ✅ |
| `deepseek-reasoner` 思考/答案分离 | ✅ |
| `deepseek-chat` 流式 + 工具调用 | ✅ |
| `deepseek-reasoner` 流式 + 工具（思考+工具共存） | ✅ |
| 识图 | ✅ |

## 注意事项

- **凭证会过期**。一旦反代开始报 401，重新登录 chat.deepseek.com、更新 `.env` 里那几项即可。`AUTH_TOKEN`、`SETTINGS_TOKEN`、`COOKIE` 都可能需要一起换。
- 服务**只监听 127.0.0.1、无鉴权**，凭证还是明文存 `.env`，**别往公网暴露**。
- 这本质上是"借网页版的登录态"，属于灰色地带，自己本地用用就好，别拿去对外提供服务。
- 默认并发是 1，每次上游请求前还有 1.5~3s 的随机延迟（防风控）。自己单机用足够了。

## 小结

整个部署最费劲的不是环境，是那三个反代 bug——尤其"思考片段边界"那个，得扒到上游的 SSE 原始事件才看得明白。修完之后，opencode 里就多了一个白嫖网页版额度的、支持识图和工具调用的模型源，跟官方 API 的体验基本对齐了。

代码修复已经提回上游仓库（MIT），如果你也在用这个项目、遇到同样的问题，可以直接拉最新版。
