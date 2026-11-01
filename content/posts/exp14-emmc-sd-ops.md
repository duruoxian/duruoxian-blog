---
title: "实验十四　eMMC 和 SD 卡操作命令——mmc 全家桶，顺带给 eMMC 摸底"
date: 2026-11-01
description: "mmc list/dev/info/read/write 全套命令上手:不进 Linux 也能直接读写 eMMC 与 SD 卡的裸区块。"
category: "技术"
tags: [嵌入式, U-Boot, eMMC]
series: "嵌入式Linux实验·U-Boot使用"
draft: false
---

> 开发板：华清远见 FS-MP1A（STM32MP157A）　实验日期：2026-11-01
> **最终状态：`mmc` 命令族 15 条子命令全览；SD 卡（SD32G / 29.7 GiB / 4-bit）与 eMMC（004GA / 3.7 GiB / 8-bit / MMC 5.0）双设备信息、GPT 分区表、硬件分区窗口、扇区读取全部实测通过，全程只读未做任何写入。**

---

## 一、实验目的

1. 掌握 U-Boot 的 `mmc` 命令族：设备切换（`mmc dev`）、设备信息（`mmc info`）、设备列表（`mmc list`）、GPT 分区表（`mmc part`）、扇区读写（`mmc read`/`write`/`erase`）；
2. 分清两颗存储设备：SD 卡（mmc0）与板载 eMMC（mmc1），给 eMMC 的分区布局做一次"摸底"，记录各分区号与起止 LBA（后续 ext4 操作、内核加载要用）；
3. 理解 eMMC 的**硬件分区**（user/boot0/boot1/boot2/RPMB）与**软件 GPT 分区**是两个不同层面的概念。

## 二、实验环境

| 项目 | 内容 |
|---|---|
| 开发板 | FS-MP1A，trusted 版 U-Boot `g392260b4`，`STM32MP>` 提示符 |
| mmc0 | SD 卡（实验十一烧写的启动卡，32GB） |
| mmc1 | 板载 eMMC（出厂 ST 官方系统布局，未动过） |

## 三、实验原理

STM32MP157 有两个 SDMMC 控制器，U-Boot 枚举为 mmc0（SD 卡槽）与 mmc1（eMMC）。`mmc dev [dev] [hwpart]` 的第二个参数是**硬件分区访问窗口**（0=用户区，1/2=boot1/boot2，7=RPMB），不是 GPT 分区号——窗口切到非 0 时，`mmc read/write` 作用的地址空间完全改变，这是本篇最危险的参数。GPT 分区表存在于用户区的开头，`mmc part` 解析它；eMMC 的 boot 硬件分区里没有 GPT，报 `Invalid GPT` 属预期。`mmc hwpartition`、`mmc rst-function` 等属于 write-once 的 eMMC 寄存器级配置，设错不可逆，本篇只认格式不执行。

## 四、实验步骤（实际执行）

> 全部在 `STM32MP>` 提示符执行，全程只读。原始日志见 `资料/serial_exp14_mmc.log`。

### 1. mmc 命令族总览

```bash
? mmc
```

实测列出 15 条子命令（info / read / write / erase / rescan / part / dev / list / bootpart / bootbus / hwpartition / rst-function / …），其中 `mmc hwpartition` 与 `mmc rst-function` 各带一条 write-once 警告。

### 2. 当前设备、设备信息与设备列表

```bash
mmc dev
mmc info
mmc list
```

实测：`mmc0 is current device`（当前设备=启动设备=SD 卡）；`mmc list` 两行 `STM32 SD/MMC: 0 (SD)`、`STM32 SD/MMC: 1`。

### 3. SD 卡（mmc0）信息与分区表

```bash
mmc dev 0
mmc info
mmc part
```

实测：`Name: SD32G`、`Capacity: 29.7 GiB`、`Bus Width: 4-bit`；GPT 五分区：

| # | 分区 | Start LBA | End LBA | 说明 |
|---|---|---|---|---|
| 1 | fsbl1 | 0x22 | 0x221 | TF-A 副本 1 |
| 2 | fsbl2 | 0x222 | 0x421 | TF-A 副本 2 |
| 3 | ssbl | 0x422 | 0x1421 | U-Boot |
| 4 | bootfs | 0x1422 | 0x21421 | **attrs 0x4（legacy-boot）** |
| 5 | rootfs | 0x21422 | … | 根文件系统区 |

### 4. eMMC（mmc1）芯片信息与分区表（本篇核心）

```bash
mmc dev 1
mmc info
mmc part
```

实测：`mmc1(part 0) is current device`；`Name: 004GA`、`MMC version 5.0`、`Capacity: 3.7 GiB`、`Bus Width: 8-bit`、`Boot Capacity: 2 MiB ENH`、`RPMB Capacity: 512 KiB ENH`；GPT 五分区（**记下，后续实验要用**）：

| # | 分区 | Start LBA | End LBA | 容量 | 说明 |
|---|---|---|---|---|---|
| 1 | ssbl | 0x22 | 0x1021 | 2 MiB | 出厂 U-Boot |
| 2 | bootfs | 0x1022 | 0x21021 | 64 MiB | **attrs 0x4（legacy-boot）** |
| 3 | vendorfs | 0x21022 | 0x29021 | 16 MiB | 出厂 vendor |
| 4 | rootfs | 0x29022 | 0x28d021 | ≈1.13 GiB | 出厂 rootfs |
| 5 | userfs | 0x28d022 | 0x75ffde | ≈2.41 GiB | 出厂用户区 |

对照 SD 卡：带 legacy-boot 标志的分区在 eMMC 上是 **GPT 2 号**、在 SD 卡上是 **4 号**——后续 ext4 命令里 eMMC 写 `mmc 1:2`、SD 卡写 `mmc 0:4`。

### 5. 硬件分区窗口切换（boot2 窗口看一眼就回来）

```bash
mmc dev 1 2
mmc part
mmc dev 1
mmc part
```

实测：`switch to partitions #2, OK` + `mmc1(part 2) is current device`；窗口在 #2 时 `mmc part` 报 `find_valid_gpt: *** ERROR: Invalid GPT ***`（boot2 硬件区没有 GPT，**属预期**）；`mmc dev 1` 回 `#0` 后五分区表原样恢复。

### 6. 从 eMMC 用户区读扇区到 DRAM

```bash
mmc dev 1
mmc read c0000000 400 10
```

实测：`MMC read: dev # 1, block # 1024, count 16 ... 16 blocks read: OK`——输入按十六进制（0x400=1024、0x10=16），回显是十进制。

### 7. 写类命令只认格式、一律不执行

`mmc write addr blk# cnt`（DRAM→设备）、`mmc erase blk# cnt`（擦除）、以及 `mmc hwpartition`/`bootbus`/`partconf`/`rst-function` 这些 write-once/寄存器级命令：认清用法，一条都不执行——`mmc erase` 一次手滑就要重走整个烧写流程。

## 五、实验结果

| 检查项 | 实测结果 |
|---|---|
| `? mmc` | 15 条子命令 + 两条 write-once WARNING |
| 设备列表 | `STM32 SD/MMC: 0 (SD)`、`STM32 SD/MMC: 1` |
| SD 卡 | SD32G / 29.7 GiB / 4-bit；fsbl1/fsbl2/ssbl/bootfs/rootfs |
| eMMC | 004GA / 3.7 GiB / 8-bit / MMC 5.0；ssbl/bootfs/vendorfs/rootfs/userfs |
| 硬件分区窗口 | `dev 1 2` → Invalid GPT（预期）→ `dev 1` 回 #0 恢复 |
| 扇区读取 | block 1024 起 16 块 → `16 blocks read: OK` |

**结论**：双存储设备的芯片信息、GPT 布局、硬件分区窗口概念全部实测到位，eMMC 摸底数据已记录，后续实验的设备号/分区号以此为据。

## 六、问题与心得

1. **两个"分区"概念别混**：eMMC 的硬件分区（user/boot1/boot2/RPMB）是芯片级物理划分，GPT 五分区是用户区里的软件表；`mmc dev 1 2` 的 "2" 是前者，`mmc 1:2` 的 "2" 是后者。
2. **legacy-boot 标志（attrs 0x4）决定"从哪启动"**：TF-A 固定从 fsbl1 引导，而 bootfs 上的 legacy-boot 标志是给后续 distro-boot 用的提示位——同一标志在两张卡上序号不同，写死序号是隐患，认名字。
3. **窗口停在非 0 时千万别写**：`mmc dev 1 2` 之后 `mmc write` 写的是 boot2 硬件区，会直接毁掉 eMMC 的引导区。练完窗口立即 `mmc dev 1` 回用户区，形成肌肉记忆。
4. **输入十六进制、回显十进制**：`mmc read c0000000 400 10` 的回显是 `block # 1024, count 16`——两边数制不同，别当成错误。
