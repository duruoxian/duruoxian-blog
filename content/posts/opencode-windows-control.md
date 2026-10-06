---

title: "opencode 配置笔记：让 AI 助手直接操控 Windows"

date: 2026-10-06

description: "一个 MCP + 两个插件 + 内置 PowerShell，三层能力从「看得见摸得着」到「系统级万能」：截图点按、winget 装软件、虚拟机控制，全部一句话完成。"

category: 工具

tags: ["AI", "MCP", "Windows", "自动化"]

cover: /images/posts/opencode-windows-control/cover.svg

---

终端里的 AI 编程助手（opencode、ZCode 这类）不只能写代码。给它们接上合适的工具，就能**看见屏幕、动鼠标键盘、管进程服务、控制虚拟机**——「帮我打开 QQ 给某人发条消息」「看看哪个进程最吃内存顺手关掉」这种话，是真的可以一句话完成的。

这篇是我自己配置 opencode 操控 Windows 的完整笔记。整体架构一句话：**1 个 MCP + 2 个插件 + 2 个 Skill + 内置 bash（PowerShell 7）**。

## 三层能力模型

操控 Windows 的能力分三层，从「看得见摸得着」到「系统级万能」：

| 层 | 载体 | 能做什么 | 特点 |
|---|---|---|---|
| ① 界面层（眼睛+手） | Windows-MCP | 截图、点按、输入、快捷键、窗口管理 | 基于 UIA 无障碍树定位，比纯坐标稳 |
| ② 系统层（万能） | 内置 bash（pwsh 7） | 进程/服务、计划任务、winget、网络、注册表 | 上限最高，零额外依赖 |
| ③ 虚拟机层 | vmware 插件 | VM 电源/快照、客户机内执行脚本、主客机传文件 | 只调 `vmrun.exe`，零第三方依赖 |

分工直觉：**界面上有的用界面层，界面没有的用系统层，不想污染宿主机就丢进虚拟机层。**

## 主配置

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "shell": "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
  "mcp": {
    "windows": {
      "type": "local",
      "command": [
        "%USERPROFILE%\\.local\\bin\\uvx.exe",
        "windows-mcp", "serve",
        "--exclude-tools", "PowerShell,Registry,FileSystem"
      ],
      "enabled": true,
      "environment": {
        "ANONYMIZED_TELEMETRY": "false",
        "WINDOWS_MCP_SCREENSHOT_SCALE": "0.5"
      }
    }
  }
}
```

几个关键决策：

- **`shell` 指到 PowerShell 7**：`bash` 工具实际用 pwsh 执行，系统层能力全从这里出。
- **`--exclude-tools` 故意禁用了三个高危工具**（任意命令执行 / 注册表 / 文件系统）——AI 助手自带文件工具、bash 本就能执行命令，再暴露它们纯属重复加风险。
- **`WINDOWS_MCP_SCREENSHOT_SCALE=0.5`**：截图缩一半，2560×1440 → 1280×720，token 消耗大幅下降，识别精度基本无损。

## Windows-MCP：17 个工具怎么用

项目是开源的 [CursorTouch/Windows-MCP](https://github.com/CursorTouch/Windows-MCP)（MIT），基于 Windows **UIA 无障碍树**定位界面元素，而不是纯像素坐标猜。日常最高频的几个：

- `windows_Screenshot` —— 快速截图 + 鼠标位置 + 窗口概要，获取视觉上下文默认用它；
- `windows_Snapshot` —— 完整桌面状态：交互元素带坐标、可滚动区域，需要精确元素 id 时用；
- `windows_Click / Type / Shortcut / Scroll` —— 点按、输入（支持中文）、快捷键（`win+r`、`alt+tab`）、滚动；
- `windows_App` —— 按开始菜单名或路径启动应用、调窗口、切前台；
- `windows_WaitFor` —— 轮询等待「文本出现 / 窗口激活 / 元素可用」，避免反复截图浪费 token；
- `windows_Clipboard / Process / Notification / Scrape` —— 剪贴板、进程管理、系统通知、抓网页。

## 两个自写插件

opencode 的插件放在 `~/.config/opencode/plugins/`，启动时自动加载：

**vmware.ts** —— 7 个 `vm_*` 工具，底层全部调 `vmrun.exe`：列 VM、电源控制、快照、客户机内执行脚本、主客机传文件、截 VM 屏幕。写操作走权限确认，只读免确认。连接 VMware 的凭据放在独立配置文件里——**这个文件一定要加进 `.gitignore`**，里面是明文密码。

**utf8-powershell.ts** —— 一个 20 行的小钩子：`tool.execute.before` 给每条 bash 命令自动拼 UTF-8 编码前缀，根治 PowerShell 的中文乱码。装完再也看不到 `娴嬭瘯` 这种天书了。

## 自定义 Skill

给 opencode 加新能力最轻的方式是 Skill，创建 `~/.config/opencode/skill/<名字>/SKILL.md`：

```markdown
---
name: my-skill
description: 一句话说明"做什么"和"什么时候用"，关键词前置。
---
# 正文（markdown 指令）
```

我写了一个 `image-edit`：会话里有人贴图要求修图时，自动在会话数据库里定位原图，用 Pillow + numpy 做低 token 的像素编辑。

## 安全与固有限制

**安全设计的真相**：排除名单挡不住「内置 bash 本身就是任意命令执行」——真正的安全边界是 **opencode 的权限确认模式**（敏感操作弹窗人工批准），不是工具排除名单。所以权限模式别图省事全放行。

**固有限制**（对一切 GUI 自动化成立）：

- 必须**解锁亮屏**、目标窗口在前台，锁屏即失效；
- **UAC 提权弹窗无法自动化**（Windows 的安全设计，别试图绕）；
- 杀软可能拦截「模拟输入」；
- 工作流是「截图 → 思考 → 操作 → 再截图」，不是实时连贯操控。

**经验法则**：能用 UIA 元素定位就不要用纯坐标；能用命令行/API 完成的事情就不要点界面。坐标点击是最后手段。

## 值得关注的增强

- [Playwright MCP](https://github.com/microsoft/playwright-mcp)（微软官方）：浏览器 DOM 级自动化，经常操作网页时比 UIA 点浏览器稳得多；
- AutoHotkey v2：复杂连招/批量脚本，让 AI 写、人审批；
- 改完配置、插件、Skill 记得**重启 opencode**——所有东西只在启动时加载。
