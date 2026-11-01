---
title: "实验二　获取 U-Boot 源码并打 ST 补丁"
date: 2026-10-04
description: "拿到 u-boot-stm32mp-2020.01 官方源码,按顺序应用 6 个 ST 板级补丁:理解补丁链如何一步步把通用 U-Boot 变成 STM32MP1 专用。"
category: "技术"
tags: [嵌入式, Linux, U-Boot]
series: "嵌入式Linux实验·U-Boot移植"
draft: false
---

> 开发板：华清远见 FS-MP1A（STM32MP157A）
> 实验平台：VMware + Ubuntu 20.04（`192.168.56.103`，用户 `cnu`）
> 实验日期：2026-10-04

---

## 一、实验目的

1. 理清三层代码结构：**DENX 官方主线源码 → ST 厂商适配补丁 → 自己的移植修改**；
2. 学会按 `README.HOW_TO.txt` 用 `git am` 按序打入 ST 的 6 个补丁，并保留原作者与提交说明；
3. 用 git 把源码变成"有历史、可追溯、可回退"的仓库（基线提交 + 补丁提交 + WORKING 分支）。

## 二、实验环境

| 项目 | 内容 |
|---|---|
| 源码包 | `en.SOURCES-stm32mp1-openstlinux-5-4-dunfell-mp1-20-06-24.tar.xz`（约 140 MB，ST 官网与 SDK 同批次发布） |
| 虚拟机 | Ubuntu 20.04，git 2.25.1 已配置 |
| 工作目录 | `~/share/stm32mp1-openstlinux-5.4-dunfell-mp1-20-06-24/sources/arm-ostl-linux-gnueabi/`（纯英文路径） |

## 三、实验原理

- ST 成对发布 SDK（工具链）与 SOURCES（源码）。SOURCES 解压后 `sources/arm-ostl-linux-gnueabi/` 下有 u-boot / linux / tf-a / optee 四套源码工程。
- u-boot 工程目录（`u-boot-stm32mp-2020.01-r0`）内的 6 个补丁必须**按序**打：

| 补丁 | 内容 |
|---|---|
| 0001-ARM-v2020.01-stm32mp-r1-MACHINE.patch | SoC 平台（MACHINE）适配 |
| 0002-ARM-v2020.01-stm32mp-r1-BOARD.patch | 板级（BOARD）适配 |
| 0003-ARM-v2020.01-stm32mp-r1-MISC-DRIVERS.patch | 杂项驱动 |
| 0004-ARM-v2020.01-stm32mp-r1-DEVICETREE.patch | 设备树 |
| 0005-ARM-v2020.01-stm32mp-r1-CONFIG.patch | 配置 |
| 0099-Add-external-var-to-allow-build-of-new-devicetree-fi.patch | 允许用 `DEVICE_TREE=xxx` 编译官方清单外的新设备树（实验三依赖） |

- 用 `git am`（而非 `patch`/`git apply`）打补丁，每条补丁成为一个 commit，可追溯、可单独回退。

## 四、实验步骤（实际执行）

### 0. 前置检查——git 已装好并完成全局配置

`git am` 打补丁时会创建提交，**必须先有全局用户名和邮箱**（实验一步骤 7 已安装配置），否则 git am 直接拒绝工作。开始前先确认：

```bash
git --version                      # git version 2.25.1（实验一已装）
git config --global user.name      # cnu（实验一已配置）
git config --global user.email     # drx00112233@qq.com（实验一已配置）
```

### 1. 解压源码包与官方源码

```bash
cd ~/share
tar -xf en.SOURCES-stm32mp1-openstlinux-5-4-dunfell-mp1-20-06-24.tar.xz
cd stm32mp1-openstlinux-5.4-dunfell-mp1-20-06-24/sources/arm-ostl-linux-gnueabi/u-boot-stm32mp-2020.01-r0
ls    # 实测：6 个 patch + Makefile.sdk + README.HOW_TO.txt + series + u-boot-stm32mp-2020.01-r0.tar.gz
tar xfz u-boot-stm32mp-2020.01-r0.tar.gz
cd u-boot-stm32mp-2020.01
```

（r0 目录同时还有 `series` 补丁顺序清单；编译方法以 `README.HOW_TO.txt` 为准。）

### 2. 初始化 git 仓库并提交基线

```bash
test -d .git || git init . && git add . && git commit -m "U-Boot source code" && git gc
```

- `test -d .git ||`：已有仓库则跳过（幂等）；
- `git add .` 输出几千行 `create mode ...` 属正常；
- 基线提交即"DENX 官方原始源码"。

### 3. 切出 WORKING 分支

```bash
git checkout -b WORKING
```

约定：master 保持"官方源码 + ST 补丁"的原始状态，后续自己的修改全部在 WORKING 分支进行。

### 4. 按序打入全部补丁

```bash
for p in `ls -1 ../*.patch`; do git am $p; done
```

`ls -1` 的排序天然满足 0001→0099 的顺序。6 个补丁全部应用成功，仅有 "new blank line at EOF" 之类的空白警告（无害）。

### 5. 验证（本机实测输出）

```
$ git log --oneline | head -12
25934cab exp3: register stm32mp157a-fsmp1a.dtb and switch include to fsmp1x   ← 实验三的修改（后续实验）
6536d17d wip: before auto-porting (basic+fsmp1a dts copies, defconfig)        ← 实验三的三件套复制（后续实验）
d90ba927 Add external var to allow build of new devicetree file               ← 0099 补丁
c54079cd ARM v2020.01-stm32mp-r1 CONFIG                                        ← 0005 补丁
9b6d5050 ARM v2020.01-stm32mp-r1 DEVICETREE                                    ← 0004 补丁
8e6f6a2f ARM v2020.01-stm32mp-r1 MISC-DRIVERS                                  ← 0003 补丁
9ebe9638 ARM v2020.01-stm32mp-r1 BOARD                                         ← 0002 补丁
1ddf0d05 ARM v2020.01-stm32mp-r1 MACHINE                                       ← 0001 补丁
1d52e8f8 U-Boot source code                                                    ← 基线提交

$ git branch
  WORKING
  exp3-basic      ← 实验三从 wip 状态切出的分支
* exp5-f1          ← 实验五的分支
  master
```

## 五、实验结果

1. 源码目录结构与课件一致（configs/、arch/arm/dts/、drivers/ 等）；
2. git 基线提交 `1d52e8f8 U-Boot source code` + 6 条补丁提交（1ddf0d05 → d90ba927）全部成功，无冲突；
3. `git status` 工作区干净；master 分支保存"官方源码+ST补丁"原始状态。

**结论**：U-Boot 源码已变成带完整历史的 git 仓库，ST 适配已就位，可以开始 FS-MP1A 的板级移植。

## 六、问题与心得

1. **必须在源码目录（u-boot-stm32mp-2020.01）里 git init**，不能在 r0 目录里打转——否则补丁打不到源码上（首次最易犯的错）。
2. 补丁顺序由 `series` 文件记录，`ls -1` 的字典序恰好一致；顺序错了会冲突。
3. `git am` vs `git apply`：前者保留原作者、原提交说明，git log 里能看到每条补丁是谁写的、改了什么，这正是"把别人的代码理清楚"的意义。
4. 工作目录不能有中文和空格（U-Boot 的 Make/Kconfig 对非 ASCII 路径支持差）。
5. 报错先读内容再慌：`git gc` 的某些 fatal 提示、EOF 空行 warning 均无害，看关键动作（commit、`应用：`）是否完成即可。
