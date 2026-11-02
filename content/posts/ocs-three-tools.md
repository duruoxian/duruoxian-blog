---
title: "ocs 不止 opencode 了：三端会话，一套门面"
date: 2026-11-02
description: "ocs 从 opencode 专用升级为 opencode / claude code / codex 三端通用：一套适配器抹平 SQLite 与 JSONL 的差异，门面重做成单工具视图、点击工具行即切；顺手补上 macOS 支持，源码瘦身到 1946 行。"
category: "项目"
tags: ["opencode", "Python", "fzf", "终端", "开源"]
series: "ocs"
cover: "/images/posts/ocs-three-tools/cover.svg"
---

> 接前两篇：《[我给 opencode 写了个 ZCode 风格的会话选择器：ocs](/posts/opencode-ocs)》、《[ocs 跨越系统：从 Linux 到 Windows](/posts/opencode-ocs-windows)》。
> 项目地址：https://github.com/duruoxian/ocs （MIT，单文件 Python，零依赖）

前两篇结束时，ocs 还是「opencode 会话选择器」。但这段时间我的终端里早就不止 opencode 一个 CLI 了——claude code、codex 也天天在跑，三家的历史会话散落在三个地方，各有各的查法。既然痛点一模一样，那就把 ocs 升级成**三端通用**：现在是 opencode / claude code / codex 共用一套选择器，项目也更了名——**Open Coding Sessions**。

## 第一步：把「数据」从「门面」里拆出来

三家的会话存储完全是三个世界：

| 工具 | 存储位置 | 格式 |
| --- | --- | --- |
| opencode | `~/.local/share/opencode/opencode.db` | SQLite，SQL 一查就有结构化行，连成本、token 数都是现成的 |
| claude code | `~/.claude/projects/**` | 每个会话一个 JSONL，按目录编码成文件夹名 |
| codex | `~/.codex/sessions/**` | 「信封式」JSONL，首行是元信息 |

字段也对不齐：claude code 和 codex 干脆没有「标题」，时间戳一边是 ISO 8601 一边是毫秒，成本和 token 数只有 opencode 记了。

硬要在主程序里写三个 `if` 分支，很快就会糊掉。所以第一刀切在数据层：注册一个 `ADAPTERS` 表，三家各自实现「扫描 → 解析 → 统一行模型」，然后**主程序从此不再认识「哪家工具」这回事**：

```python
ADAPTERS = {
    "oc": {"name": "opencode",     "cmd": "opencode", "rename_ok": True,  "fork_ok": True},
    "cc": {"name": "claude code",  "cmd": "claude",   "rename_ok": False, "fork_ok": False},
    "cx": {"name": "codex",        "cmd": "codex",    "rename_ok": False, "fork_ok": False},
}
```

每一行会话（不管来自哪家）最终都被整成同一个模型：`tool / id / key / title / directory / time_updated / msgs / tokens / texts / _reply`。`key` 统一打上前缀（`cc:abc123`），搜索文本、按目录分组、问答对抽取，全都走同一套函数。没有标题的会话？取第一条用户消息截 30 个字兜底。

能力差异也不硬编码在逻辑里，而是声明在注册表上：目前只有 opencode 支持**改名**和**分叉续接**（`fork_ok`），claude code / codex 的会话就老老实实置灰这两项。以后哪家补了能力，改一行注册表就行。

续接也顺手统一了——三家的恢复命令各不相同，但都收敛到 `resume_cmd` 一个出口：

```python
def resume_cmd(tool, sid, fork):
    if tool == "oc":
        return ["opencode", "--session", sid] + (["--fork"] if fork else [])
    if tool == "cc":
        return ["claude", "--resume", sid]
    return ["codex", "resume", sid]
```

## 第二步：合并列表被我自己否了

数据层通了之后，第一版门面很偷懒：三家会话混在一个列表里，前缀区分。用了半天就受不了——三家的 logo、时间格式、字段密度堆在一起，像个大杂烩，而且我 90% 的时间其实只想看其中一家。

于是重构成**单工具视图**：一次只显示当前工具的 logo 和会话列表，按目录分组、组内时间倒序。顶部放三条工具行，**点击或回车即切换**，上次的选择会被记住。

这里有个 fzf 的小坑：工具行放在 header 里，而 fzf 切换列表靠 `reload`，reload 会把 header 一起重绘——Windows 下重绘时 logo 会闪一下旧内容。解法是用 fzf 的 `transform-header` 让 header 现场按状态文件重算，logo 就「原地」换了，不再有闪烁。数字键 `1/2/3` 原本想给工具切换，后来发现和「搜索后跳组」冲突，也一并还了回去——现在**纯点击/回车**，键位留给搜索。

## 顺手补了 macOS

三端数据层写完，Linux 和 Windows 都能跑，就差 macOS 没验证过。补起来不难，但都是细活：

- 剪贴板换 `pbcopy`（系统自带）
- 进程探测 `ps` 替代读 `/proc`（macOS 没有）
- `install.sh` 检测到 `~/.local/bin` 不在 PATH 时自动补一行进 shell 配置

## 其他杂项

- **性能**：会话多了之后查询改批量，列表一次性拉全
- **CJK 对齐**：fzf 列宽按显示宽度算，中文会话名不再把右栏顶歪
- **逻辑瘦身**：删死代码、合并重复，2016 行 → 1946 行，输出逐字节不变
- **文档双语**：README 和教程重写成英文默认 + 简体中文，名字定稿 **Open Coding Sessions**

## 装了哪个用哪个

三家的数据源是「有就显示，没有也不报错」：只装了 opencode，另外两条工具行照样能点，进去看一句「no sessions yet」而已。`ocs` 一条命令开列表，`ocs -h` 看完整键位。

仓库在这：**[github.com/duruoxian/ocs](https://github.com/duruoxian/ocs)**，Python 3.8+ 标准库 + fzf ≥ 0.68 就能跑。哪家 CLI 的会话存储又变了花样，欢迎提 issue。
