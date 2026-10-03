---
title: "txt2md：把随手记的 txt，自动变成排版好的 Markdown"
date: 2026-09-27
description: "一个 Windows 托盘小工具：监视你写的 txt，保存后用 AI 自动重排成排版美观的 Markdown，绿色便携、开箱即用。"
category: "项目"
tags: ["开源", "Python", "工具"]
cover: "/images/posts/txt2md/cover.jpg"
---

写笔记时最顺手的状态，往往是打开一个空白的 `.txt` 直接敲。但 `.txt` 没有标题层级、没有列表、没有代码块，攒久了就成了一团乱麻。Markdown 好看，可手动排版又嫌麻烦。

**txt2md** 就是为了解决这个矛盾：**你只管用 txt 随手写，保存后由 AI 自动重排成排版整齐的 Markdown。**

> 仓库地址：<https://github.com/duruoxian/txt2md>

## 它怎么工作

一句话：**监视 → 转换 → 生成**。

1. 把要监视的 `.txt`（或整个文件夹）加进清单
2. 每次保存后，程序延迟约 2 秒自动触发
3. AI 按预设规则把内容重排、写入同名的 `.md`

`.txt` 是唯一的内容来源，`.md` 是自动生成的产物 —— **单向生成**，不会把你手写的 txt 改乱。

## 功能

- **监视清单**：可加单个文件，也可加文件夹（含子目录，自动跟随里面的所有 txt）
- **自动更新**：文件保存后自动转换，延迟可配置
- **托盘操作**：托盘左键单击 = 立即转换全部；双击 = 打开最近文件夹
- **安全兜底**：覆盖前把旧的 md 备份为 `x.md.bak`；清单里的 txt 被删除时，对应 md 一并删除
- **明暗主题**：默认跟随系统，可手动切换
- **绿色便携**：一个 exe，无需安装，配置存在程序同目录

## 怎么用

1. 到 [Releases](https://github.com/duruoxian/txt2md/releases) 下载 `txt2md.exe`
2. 放到任意文件夹，双击运行
3. 点 ⚙ 填入自己的 DeepSeek API Key（`api_base` 默认 `https://api.deepseek.com`，模型 `deepseek-chat`），点「测试连接」再「保存设置」
4. 点「＋ 文件」或「＋ 文件夹」把要监视的 txt 加进来
5. 之后正常编辑、保存，同目录就会自动生成同名 `.md`

> 关闭窗口不会退出，程序会缩到右下角托盘；右键托盘图标可退出。

## 技术栈

用 Python 写成，主界面是 `customtkinter`，系统托盘用 `pystray`，文件监听用 `watchdog`，打包用 PyInstaller（`build.bat` 一键出 exe）。

| 文件 | 作用 |
| --- | --- |
| `app.py` | 入口：UI 装配、托盘、监听、转换调度 |
| `ui_home.py` / `ui_settings.py` | 主界面 / 设置页 |
| `converter.py` | 调用 AI 并写入 md |
| `watcher.py` | 文件/文件夹监听 |
| `tray.py` | 系统托盘 |
| `prompt.md` | 给 AI 的排版规则（可自行修改） |

## 几个设计取舍

- **只支持 Windows**：托盘、打包、路径都按 Windows 来做，不为跨平台过度设计。
- **不需要自己的服务器**：直接用你自己的 API Key，按量计费，个人使用极便宜。
- **隐私**：除了调用你配置的 AI 接口，程序不会把内容发到别处。
- **超限跳过**：单个 txt 超过 1MB 直接跳过，避免误传大文件。

## 写在最后

这个工具的目标很窄：**把「随手写」和「好看」这两件事解耦**。写的时候零负担，排版交给后台。
如果你也习惯用纯文本记东西，欢迎到仓库下载试用，或直接看源码改一个更顺手的版本。

- 源码与下载：<https://github.com/duruoxian/txt2md>
- 许可证：MIT
