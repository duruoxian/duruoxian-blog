---
title: "ocs 跨越系统：从 Linux 到 Windows，顺带修好了预览的排版"
date: 2026-10-14
description: "给 ocs 补上 Windows（PowerShell 5.1/7）支持：一个 Python 内核同时跑在 Linux 和 Windows 上，踩了 fzf 引号、状态文件、剪贴板编码、PowerShell BOM 一串坑；还顺手解决了对话预览被压成一堵文字墙的格式问题。"
category: "项目"
tags: ["opencode", "Python", "fzf", "Windows", "终端", "开源"]
series: "ocs"
cover: "/images/posts/opencode-ocs-windows/cover.svg"
---

> 接上一篇《[我给 opencode 写了个 ZCode 风格的会话选择器：ocs](/posts/opencode-ocs)》。
> 项目地址：https://github.com/duruoxian/ocs （MIT，单文件 Python，零依赖）

上一篇里 ocs 还是纯 Linux 的。这次把它搬到了 Windows，顺便修掉了一个一直让我别扭的排版问题。现在**一个 Python 内核同时跑在两个系统上**。

## 起因：Windows 用户也得能用

ocs 一开始是照着 Linux 终端写的：读 `/dev/tty`、用 `termios` 查终端背景色、剪贴板走 `wl-copy`/`xclip`、临时状态文件丢在 `/tmp`，续会话时用 `os.execvp` 把进程替换掉。这些在 Windows 上要么不存在，要么行为完全不同。

但转念一想：**opencode 本身是跨平台的**，两个系统的数据库位置还一模一样（`~/.local/share/opencode/opencode.db`）。既然数据层完全一致，那核心那套「按项目分组、搜内容、折叠对话」的逻辑就没必要写两遍——只要把外面那层「壳」按平台换掉就行。

于是目标定了：**一个 Python 内核 + 每个平台一个薄启动器**。

## 移植路上踩的坑

### 1. fzf 在 Windows 下用 cmd 当子 shell，引号规则不一样

fzf 的 `--preview` / `--bind=execute(...)` 是把命令字符串交给一个子 shell 去跑的。Linux 上是 `sh`，Windows 上默认是 `cmd.exe`。问题在于**两者的引号规则不同**：`sh` 里单引号 `'...'` 是强引用，`cmd` 里单引号只是普通字符、根本不是引号。

我最初把预览写成 `--show '{{2}}'`，在 Linux 上好好的，到 Windows 上那个单引号被原样传给了 Python，于是程序拿着带引号的会话 ID 去查库，自然查不到——界面上直接弹「找不到会话」。

正确做法是：**fzf 的占位符不要自己加引号**，直接写 `{2}`，fzf 会按目标 shell 的规则替你转义好（空格、`&`、`^`、`%`、`(` 这些它都处理了）。

```python
# 之前（Linux OK，Windows 坏）：q() 按 sh 规则加单引号
f"--preview={script} --show {q('{{2}}')}"
# 现在：交给 fzf 自己转义
f"--preview={script} --show {{2}}"
```

顺带还发现一个隐蔽的：Python 的 `subprocess.run(..., text=True)` 在 Windows 上会用**本地编码**（这里是 GBK）去编码喂给 fzf 的 stdin，而列表里有 `✅` 之类的字符，直接 `UnicodeEncodeError`。得显式 `encoding="utf-8"`。

### 2. 状态文件不能用 PID 命名

ocs 的「对话视图」是把当前视图（列表 / 消息列表、展开了哪几条）写进一个临时状态文件，让 fzf 每次 `reload` 时重新调用自己、读到同一份状态。Linux 上这个文件按 tty 命名。

我一开始在 Windows 上偷懒用了 `os.getpid()`——结果每次 fzf 回调都是**新进程**，PID 不同，状态永远对不上，按 `→` 根本进不了对话视图。后来改成拿**控制台窗口句柄**做 key：同一个终端里所有 ocs 子进程共享同一个控制台，于是拿到了稳定的标识。

```python
import ctypes
hwnd = ctypes.windll.kernel32.GetConsoleWindow()
return "win-%x" % hwnd
```

### 3. 剪贴板：`clip` 吃的是 UTF-16

Linux 那边是 `wl-copy` / `xclip`，Windows 换成了系统自带的 `clip`。这里有个坑：`clip` 读 stdin 时按 **UTF-16LE** 解码，不是 UTF-8。所以得 `text.encode("utf-16le")` 喂进去，否则中文会变乱码。

### 4. 启动器要过 PowerShell 的编码关

Windows 上的入口是一个薄薄的 `ocs.ps1`：切 UTF-8、找 Python、把参数转发给真正的 `ocs`。这里又撞上一个经典问题——**Windows PowerShell 5.1 读 `.ps1` 时，如果没有 BOM 就按系统 ANSI（GBK）解码**，脚本里的中文注释直接变乱码，进而把语法搞崩（报「字符串缺少终止符」之类）。

解决办法很土但有效：**给 `.ps1` 存成带 BOM 的 UTF-8**。这样 5.1 和 PowerShell 7 都能正确读。

另外，裸命令 `ocs` 也没法直接解析——`.ps1` 不在 `PATHEXT` 里。所以安装脚本会额外放一个 `ocs.cmd` 垫片，里面优先用 `pwsh`（7）、没有就退回 `powershell`（5.1），并带上 `-ExecutionPolicy Bypass`，绕开执行策略。

### 5. 其余的小适配

- 查终端背景色（给 Logo 用）依赖 `termios` + `ioctl`，Windows 直接跳过，用 opencode 深色主题的兜底底色。
- 量终端宽度靠 `/dev/tty` 的 `TIOCGWINSZ`，Windows 退回 `shutil.get_terminal_size()`。
- 续会话的 `os.execvp` 换成 `subprocess.run`（Windows 没有进程替换）。

好在**数据层完全不用改**，核心逻辑共用，Windows 只是把外面那层壳换掉。

## 顺带修好了预览的排版

移植过程中我盯着右侧预览看，越看越别扭：**AI 回答被压成了一整段**，段落、列表、表格、代码块全糊成一堵文字墙，再靠 fzf 的 `--wrap=word` 硬折行（每行末尾那个 `⏎` 就是折行标记）。

翻代码找到了元凶——读消息时有一句把所有空白都折叠掉了：

```python
# 罪魁祸首：把正文的换行、缩进全吞了
body = " ".join(" ".join(texts).split())
```

改成保留原始换行后，预览里的 Markdown 结构就回来了：段落分明、表格对齐、列表成行、代码块也正常换行。

```python
body = "\n\n".join(x.strip() for x in texts if x.strip())
```

但这里有个连带的坑：fzf 的**列表项是「一行一项、`\t` 分列」**的，如果正文里的换行/制表符直接混进列表项，会把一项拆成好几项、把列冲乱。所以预览（走 `--preview`，可以多行）保留换行，而拼进列表项、隐藏搜索字段的地方，用一个小函数压成单行：

```python
def oneline(s):
    """压成单行：fzf 的列表项/隐藏字段不能含换行或制表符。"""
    return " ".join((s or "").split())
```

这样「预览有结构、列表不串行」，两全其美。

## Windows 上怎么装

```powershell
git clone https://github.com/duruoxian/ocs.git
cd ocs
./install.ps1     # 装 ocs / ocs.ps1 / ocs.cmd 到 ~/.local/bin，并加进 PATH
# 新开一个 PowerShell 窗口
ocs
```

依赖：Python 3.8+（`winget install Python.Python.3.12`）、fzf（`winget install junegunn.fzf`）、以及已经用过的 opencode。

安装脚本会把三个文件放进 `~/.local/bin`：

- `ocs`：真正的 Python 逻辑；
- `ocs.ps1`：启动器（切 UTF-8、找 Python、转发参数）；
- `ocs.cmd`：让裸命令 `ocs` 能被解析（`.ps1` 不在 `PATHEXT` 里）。

如果提示脚本被禁止运行（执行策略），直接用 `ocs` 的 `.cmd` 入口即可（它已带 `-ExecutionPolicy Bypass`）；也可以运行 `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`。

## 如何删除（卸载）

两个平台的卸载都一样干脆——**删掉装进去的那几个文件**：

```powershell
# Windows
Remove-Item "$HOME\.local\bin\ocs", "$HOME\.local\bin\ocs.ps1", "$HOME\.local\bin\ocs.cmd"
```

```bash
# Linux
rm -f ~/.local/bin/ocs
```

如果想连 `PATH` 里的那一行也撤掉，去改对应的 shell 配置（`.bashrc` / `.zshrc` / `config.fish`，Windows 是用户环境变量 `Path`）。运行时的临时状态文件（Linux 在 `/tmp/ocs-*`，Windows 在 `%TEMP%\ocs\`）重启后系统会自动清理。

**ocs 从不改动 opencode 的数据**（只读连接），唯一的例外是你主动重命名时的一次 `UPDATE session`。所以卸载后你的会话历史分毫不少。

## 一点小感想

这次移植最爽的一点，是发现**跨平台的成本可以很低**——只要把「数据 + 逻辑」和「平台外壳」分清楚，需要按系统分叉的其实就那么几处（终端查询、剪贴板、进程启动、编码）。核心那一大坨查询和界面逻辑，一行都不用改。

而预览排版那个 bug 也提醒我：**「能显示」和「能读」是两回事**。把结构压平确实省事，但代价是用户得在一堵墙里自己找重点。有些细节，只有自己天天用才会发现别扭。

项目在 https://github.com/duruoxian/ocs ，MIT 协议，欢迎来提 issue 或者点个 star ⭐
