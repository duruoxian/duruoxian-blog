---
title: "实验二十　编译内核与设备树——第一次编出自己的 uImage 和 fsmp1a.dtb"
date: 2026-11-01
description: "make 编译一条龙:产出内核镜像与设备树 dtb,理解各产物的用途与加载地址。"
category: "技术"
tags: [嵌入式, Linux内核, 设备树]
series: "嵌入式Linux实验·内核移植"
draft: false
---

> 开发板：华清远见 FS-MP1A（STM32MP157A）　实验日期：2026-11-01
> **最终状态：`uImage`（9384512B = zImage 9384448B + 64B 头）与 `stm32mp157a-fsmp1a.dtb`（63250B）编译完成并交付 TFTP 根目录；内核版本串 `5.4.31-g8f42bed88` 干净无 `-dirty`。**

---

## 一、实验目的

1. 编译出属于 FS-MP1A 的第一个内核镜像 `uImage`（含 64 字节 U-Boot 头，加载地址 0xC2000040）；
2. 把课程初始设备树（`stm32mp157a-fsmp1a.dts` / `stm32mp15xx-fsmp1x.dtsi`）接入内核构建体系，编译出 `stm32mp157a-fsmp1a.dtb`；
3. 改动以 git 提交收口，产物交付 TFTP 根目录为实验二十三（自己内核点火）备弹。

## 二、实验环境

| 项目 | 内容 |
|---|---|
| 编译机 | Ubuntu 20.04 虚拟机（4 vCPU / 4GB，`-j4` + 内置 swap 兜底） |
| 源码 | 实验十九产物：linux-5.4.31 + 23 补丁，git `8f42bed88`（WORKING 分支） |
| 工具链 | `/usr/local/arm/gcc-arm-9.2-.../bin`（arm-none-linux-gnueabihf-）+ SDK 环境（mkimage） |

## 三、实验原理

内核顶层 Makefile 的 `ARCH`/`CROSS_COMPILE` 用 `?=` 赋默认值——在其后追加 `:=` 硬赋值，即可免敲冗长命令行。`uImage` 目标需要 `LOADADDR`（内核解压后期望的物理加载地址）：FS-MP1A DDR 起始 0xC0000000，U-Boot 约定内核加载在 0xC2000000，uImage 头 64 字节（0x40），故 `LOADADDR=0xC2000040`——差 0x40 就是差一个头，点火必挂。`make dtbs` 按 `arch/arm/boot/dts/Makefile` 的清单编设备树，新板子的 dtb 必须注册进清单，否则"不编也不报错"。

## 四、实验步骤（实际执行）

> 全部在 Ubuntu 终端执行，源码顶层：`~/share/stm32mp1-openstlinux-5.4-dunfell-mp1-20-06-24/sources/arm-ostl-linux-gnueabi/linux-stm32mp-5.4.31-r0/linux-5.4.31`。

### 1. 顶层 Makefile 插入编译器两行

在 `ARCH ?= $(SUBARCH)`（360 行）之后插入两行（顶格、无空行）：

```makefile
ARCH := arm
CROSS_COMPILE := arm-none-linux-gnueabihf-
```

实测：`grep` 确认 361/362 两行，`git diff --stat` 仅 Makefile +2。

### 2. 初始设备树接入

```bash
cp ~/share/kernel-初始设备树/stm32mp15xx-fsmp1x.dtsi arch/arm/boot/dts/
cp ~/share/kernel-初始设备树/stm32mp157a-fsmp1a.dts arch/arm/boot/dts/
```

实测：两文件就位（3662B / 724B）；补丁产物依赖 `stm32mp157.dtsi / stm32mp15xa.dtsi / stm32mp15-pinctrl.dtsi / stm32mp15xxaa-pinctrl.dtsi` 四件齐全（0020-DEVICETREE 补丁的产物）。

### 3. dtb 清单注册

在 `arch/arm/boot/dts/Makefile` 的 `stm32mp157a-dk1.dtb \` 行（991 行）之后插入一行（行尾续行符 `\` 一个不能少）：

```makefile
	stm32mp157a-fsmp1a.dtb \
```

实测：注册在 992 行，`grep fsmp1a.dtb` 恰一条。

### 4. 提交本实验改动（显式列文件，不用 `git add -A`）

```bash
git add Makefile arch/arm/boot/dts/Makefile arch/arm/boot/dts/stm32mp15xx-fsmp1x.dtsi arch/arm/boot/dts/stm32mp157a-fsmp1a.dts arch/arm/configs/stm32_fsmp1a_defconfig
git commit -m "FS-MP1A 设备树与编译配置（实验二十）"
```

实测：`git status --short` 恰好 5 条（2 改 3 新）→ 提交 `8f42bed88`，工作区清零——**提交发生在编译之前**，版本串因此无 `-dirty` 尾巴。

### 5. 编译内核

```bash
make uImage LOADADDR=0xC2000040 -j4
```

实测：`Kernel: arch/arm/boot/uImage is ready`，`Load Address: c2000040 / Entry Point: c2000040`。产物对账：`uImage 9384512B` − `zImage 9384448B` = **恰 64 字节**（uImage 头），与"四兄弟"理论一致。

### 6. 编译设备树并交付

```bash
make dtbs
cp arch/arm/boot/uImage /home/cnu/tftpboot/uImage
cp arch/arm/boot/dts/stm32mp157a-fsmp1a.dtb /home/cnu/tftpboot/stm32mp157a-fsmp1a.dtb
```

实测：`stm32mp157a-fsmp1a.dtb` 63250B；`cat include/config/kernel.release` = **`5.4.31-g8f42bed88`**；两产物已入 TFTP 根目录（644 权限）。

## 五、实验结果

| 检查项 | 实测结果 |
|---|---|
| Makefile 注入 | 361/362 行，`git diff` 仅 +2 |
| 设备树接入 | 3662B / 724B 两文件就位，依赖 dtsi 齐全 |
| dtb 注册 | `dts/Makefile` 992 行 |
| git 提交 | `8f42bed88`，恰好 5 文件，工作区干净 |
| uImage | 9384512B，Load/Entry `c2000040` |
| uImage − zImage | 恰 64 字节 |
| fsmp1a.dtb | 63250B |
| 版本串 | `5.4.31-g8f42bed88`（无 -dirty） |

**结论**：自己的 uImage 与 fsmp1a.dtb 编成并交付，实验二十三（自己内核点火）备弹完毕。

## 六、问题与心得

1. **编译提速实录**：`-j2`（4GB 稳妥档）实测 52 个文件/分钟，切 `-j4` 后 **~180 个/分钟（3.5 倍）**——4 vCPU 本来就该吃满，4GB 内存配 VM 自带 2G swap 足以兜住 4 路并行。提速前先用 `grep -c "^  CC"` 记下进度基数，切换后好对账。
2. **编译会话必须显式带编译器 PATH**：非登录 shell 不读 `/etc/profile`，重开终端直接 `make` 会在 syncconfig 处报 `compiler 'arm-none-linux-gnueabihf-gcc' not found`——每个编译会话开头 `export PATH=$PATH:/usr/local/arm/gcc-arm-9.2-.../bin` 一条都不能省。
3. **`pkill -f "make uImage"` 会自杀**：pkill 按命令行匹配，承载它的远程 shell 命令行里也含同串——停编译要么按 PID，要么换不含关键字的模式。
4. **`make dtbs` "不编也不报错"**：dtb 没注册进 dts/Makefile 时，make 根本不知道它的存在——注册行的行尾 `\` 续行符丢了同样如此。验证靠 `grep fsmp1a.dtb` 而不是等报错。
5. **uImage − zImage = 64**：一行 `ls -l` 就是"四兄弟"理论的实验证明，也顺带确认 LOADADDR 没写错（mkimage 回显 `Load Address: c2000040`）。
