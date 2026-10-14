---
title: "我给 opencode 写了个 ZCode 风格的会话选择器：ocs"
date: 2026-10-08
description: "单文件 Python + fzf，按项目分组、能搜聊天内容、还有可折叠的对话视图；顺手解决了终端里「鼠标想点列表又想拖选文字」的经典矛盾——不用按 Shift。已在 GitHub 开源，现已支持 Windows。"
category: "项目"
tags: ["opencode", "Python", "fzf", "终端", "Windows", "开源"]
cover: "/images/posts/opencode-ocs/cover.svg"
---

> 项目地址：https://github.com/duruoxian/ocs （MIT，单文件 Python，零依赖）
> **2026-10 更新**：已支持 Windows（PowerShell 5.1 / 7）。见文末「把 ocs 搬到了 Windows」。

## 缘起：历史会话太难找了

我日常用 [opencode](https://github.com/sst/opencode) 写代码，它什么都好，就是**回到旧会话**特别费劲。官方的 `opencode session list` 只列当前目录的会话，信息只有 ID、标题和时间；想找回“上周二在某个项目里聊过的那个方案”，基本靠考古。

而在 ZCode 里，历史会话是一等公民：按项目分组、能搜索、有预览、点一下就切回去。于是我决定自己给 opencode 补上这一块，做一个终端里的、和 ZCode 一样顺手的会话选择器 —— **ocs**。

![会话列表](/images/posts/opencode-ocs/screenshot-1.webp)

## 想要的效果

- 打开就跑出一个列表：**按项目分组**，组内按时间倒序，一眼看到哪个项目最近在忙什么
- 搜索要能搜**内容**：标题是 AI 起的不一定记得住，直接输“安装”就能把聊过安装的会话全捞出来
- 右侧**实时预览**：会话详情、我提过的问题，光标移动到哪就显示哪
- 会话内容折叠着看：默认只显示**我提过的问题**（一条一行），点击某条提问，才展开这一条的 AI 回答，再点收起
- 回车**直接切回去**，opencode 退出后自动回到列表继续挑
- 日常管理：重命名、批量删除、分叉继续、复制会话 ID

![对话视图](/images/posts/opencode-ocs/screenshot-2.webp)

## 实现里的几个有意思的点

### 1. 数据：直接读 opencode 的 SQLite

opencode 把所有会话存在 `~/.local/share/opencode/opencode.db`（WAL 模式）。ocs 以**只读**方式连上去（`file:...?mode=ro`），把 `session` / `message` / `part` 三张表里的标题、目录、时间、token、费用、消息正文全部读出来。不打补丁、不装插件，opencode 升级也不影响（重命名是唯一一次写：直接 `UPDATE session SET title`，因为官方没有改名的 CLI）。

### 2. 界面：单个 fzf 实例 + execute/reload

整个 UI 就是一个 fzf：列表是菜单，右侧 `--preview` 是详情，所有按键通过 `--bind ... execute(ocs --xxx {2})+reload(...)` 回调回自己。这样**所有操作都在界面内完成**——重命名、删除、进会话，界面不闪回终端、筛选词不丢。对话视图也是同一个 fzf：按 `→` 把列表“换页”成消息列表，`--track` 让光标在刷新后保持跟随，点击消息行展开/收起该条的 AI 回答（展开状态记在状态文件里）。

### 3. 最好玩的一块：运行时把鼠标“让”给终端

这个需求是自己用着用着逼出来的：**平时要能点击列表选会话；选中文字时要能拖动选字、右键弹复制菜单，而且都不想按 Shift**。

问题在于：终端里鼠标同一时刻只能有一个主人。程序开启了鼠标跟踪（1000/1002/1006 模式）后，**所有**拖动和右键都会送给程序，终端自己就不做选区、也不弹菜单；想选字只能按 Shift 绕过——这是所有终端的老规矩。

但有个破绽：**鼠标归属是程序用转义序列声明的**，而 Konsole 是实时解析这些序列的。所以 ocs 做了件事：

```python
MOUSE_OFF = "\033[?1000l\033[?1002l\033[?1006l"  # 鼠标归终端
MOUSE_ON  = "\033[?1000h\033[?1002h\033[?1006h"  # 鼠标归程序
```

把 `MOUSE_OFF` 写进 `/dev/tty`，Konsole 立刻把鼠标交还给终端——**fzf 毫无感知、界面纹丝不动**；此时拖动就是选字、右键就是「复制」菜单。再写入 `MOUSE_ON` 就切回“能点列表”的模式。绑定成两个动作：

- **右键一下**（或 `F8`）→ 进入选字模式；
- **再按 `F8`** → 切回点击模式。

于是三个愿望同时成立：平时单击/双击/滚轮都好使；要复制时右键一下，就和普通终端一样了，全程不用碰 Shift。

### 4. 一些踩过的坑（给同样折腾终端的朋友）

- **别用 F2 当功能键**：Konsole 的 `linux` 键盘映射表里 F1–F5 发的是 Linux 控制台序列（`ESC[[B`），现代程序（fzf）根本不识别，尾字节还会漏进搜索框；F6–F12 才是标准序列。
- **fzf 的 `reload` 会把光标弹回第一行**——每次点击后刷新列表会把“点中”的选择撤销掉，加 `--track` 才解决。
- **子进程量不到终端尺寸**：`reload`/`execute` 子进程的 stdout 是管道，`shutil.get_terminal_size()` 拿不到真实宽度，会导致列表错位；直接向 `/dev/tty` 要 `TIOCGWINSZ` 才准。
- **颜色要看主题**：我的终端主题把 cyan 槽位定义成了纯绿 (0,255,0)，所有“青色”高亮都变成刺眼的绿色——现在统一用蓝色 + 品红。

### 5. 验证方式：给终端 TUI 做“真鼠标”回归测试

这些交互都跟鼠标有关，靠肉眼在山寨环境里点是不靠谱的。所以我在 **Xvfb**（无头 X 服务器）里跑真的 Konsole + 真的鼠标事件（`xdotool`），截图比对、读剪贴板验证：拖动是否产生选区、右键菜单里的「复制」是否可用、剪贴板内容是否正确、点击是否选中了目标行……全流程自动化。凡是“应该能用”的功能，都是在这种环境里点过一遍才敢说它行。

## 安装与使用

```bash
git clone https://github.com/duruoxian/ocs.git
cd ocs && ./install.sh     # 装到 ~/.local/bin/ocs
ocs                        # 打开会话列表
```

依赖只有 Python 3 和 [fzf](https://github.com/junegunn/fzf)；数据来自你已经用过的 opencode。

日常就记住三件事：

1. 打开 `ocs`，打字搜索，回车切回；
2. 按 `→` 进对话视图，点问题看 AI 回答，`←` 回来；
3. 要复制文字：右键一下（或按 `F8`），拖选、右键复制，再 `F8` 切回。

## 把 ocs 搬到了 Windows

一开始 ocs 是纯 Linux 的：读 `/dev/tty`、用 `termios` 查终端背景色、剪贴板走 `wl-copy`/`xclip`、临时状态文件丢在 `/tmp`，续会话时用 `os.execvp` 把进程替换掉。这些在 Windows 上要么不存在，要么行为完全不同。补 Windows 分支的过程里，踩到几个挺典型的坑，记一下。

### 1. fzf 在 Windows 下用 cmd 当子 shell，引号规则不一样

fzf 的 `--preview` / `--bind=execute(...)` 是把命令字符串交给一个子 shell 去跑的。Linux 上是 `sh`，Windows 上默认是 `cmd.exe`。问题在于**两者的引号规则不同**：`sh` 里单引号 `'...'` 是强引用，`cmd` 里单引号只是普通字符、根本不是引号。

我最初把预览写成 `--show '{{2}}'`，在 Linux 上好好的，到 Windows 上那个单引号被原样传给了 Python，于是程序拿着带引号的会话 ID 去查库，自然查不到。正确做法是——**fzf 的占位符不要自己加引号**，直接写 `{2}`，fzf 会按目标 shell 的规则替你转义好（含空格、`&`、`^`、`%`、`(` 这些它都处理了）。

```python
# 之前（Linux OK，Windows 坏）：q() 按 sh 规则加单引号
f"--preview={script} --show {q('{{2}}')}"
# 现在：交给 fzf 自己转义
f"--preview={script} --show {{2}}"
```

顺带还发现一个隐蔽的：Python 的 `subprocess.run(..., text=True)` 在 Windows 上会用**本地编码**（这里是 GBK）去编码喂给 fzf 的 stdin，而列表里有 `✅` 之类的字符，直接 `UnicodeEncodeError`。得显式 `encoding="utf-8"`。

### 2. 状态文件不能用 PID 命名

ocs 的「对话视图」是把当前视图（列表 / 消息列表、展开了哪几条）写进一个临时状态文件，让 fzf 每次 `reload` 时重新调用自己、读到同一份状态。Linux 上这个文件按 tty 命名。

我一开始在 Windows 上偷懒用了 `os.getpid()`——结果每次 fzf 回调都是**新的进程**，PID 不同，状态永远对不上，按 `→` 根本进不了对话视图。后来改成拿**控制台窗口句柄**（`GetConsoleWindow`）做 key：同一个终端里所有 ocs 子进程共享同一个控制台，于是拿到了稳定的标识。

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

好在**数据层完全不用改**：两个平台的 opencode 都把库放在 `~/.local/share/opencode/opencode.db`，只读连过去一模一样。所以核心那套「按项目分组、搜内容、折叠对话」的逻辑是共用的，Windows 只是把外面那层壳换掉。

### Windows 上怎么装

```powershell
git clone https://github.com/duruoxian/ocs.git
cd ocs
./install.ps1     # 装 ocs / ocs.ps1 / ocs.cmd 到 ~/.local/bin，并加进 PATH
# 新开一个 PowerShell 窗口
ocs
```

依赖：Python 3.8+（`winget install Python.Python.3.12`）、fzf（`winget install junegunn.fzf`）、以及已经用过的 opencode。

Windows 下有一点体验差异：**复制文字不需要 `F8`/右键切换鼠标归属了**——直接用鼠标拖动选中、右键「复制」就行（Windows 终端本身就支持）；`ctrl-y` 复制会话 ID 依然可用。其余功能（对话视图、重命名、删除、分叉、`--last`/`--show`/`--delete`/`-l`）全部一致。

项目在 https://github.com/duruoxian/ocs ，MIT 协议，欢迎来提 issue 或者点个 star ⭐
