---
title: "实验十五　ext4 文件系统操作命令——U-Boot 里的文件管理器"
date: 2026-11-01
description: "ext4ls/ext4load 上手:在 U-Boot 里直接浏览和加载 SD 卡第二分区里的文件,文件系统 Awareness 提前一步。"
category: "技术"
tags: [嵌入式, U-Boot, Linux]
series: "嵌入式Linux实验·U-Boot使用"
draft: false
---

> 开发板：华清远见 FS-MP1A（STM32MP157A）　实验日期：2026-11-01
> **最终状态：`ext4ls` / `ext4load` / `ext4write` 三条命令全部实测通过——eMMC bootfs 清单在册、uImage 本地读取 7546640 字节（35.6 MiB/s）、TFTP 拉取同字节数、写回 `/test_uImage` 7546640 字节（10.2 MiB/s）并复扫确认。**

---

## 一、实验目的

1. 掌握 U-Boot 的 ext4 文件系统操作三条命令：`ext4ls`（列目录）、`ext4load`（文件→内存）、`ext4write`（内存→文件）；
2. 在 U-Boot 阶段打通"本地 eMMC"与"网络 TFTP"两条数据通道，并用字节数互验；
3. 为实验十六（从网络加载内核启动）备齐 uImage 与设备树文件。

## 二、实验环境

| 项目 | 内容 |
|---|---|
| 开发板 | FS-MP1A，trusted 版 U-Boot `g392260b4`，`STM32MP>` 提示符 |
| 操作对象 | eMMC（mmc1）GPT 2 号分区 bootfs（64 MiB，ext4） |
| TFTP 服务器 | Ubuntu 虚拟机 `192.168.0.100`，根目录 `/home/cnu/tftpboot`（实验十三搭建），已放入课程官方 `uImage`（7546640 字节）与 `stm32mp157a-fsmp1a-mipi050.dtb` |

## 三、实验原理

U-Boot 的 ext4 驱动支持对 ext2/ext4 分区的目录列举与文件读写，命令格式统一为 `<设备>:<GPT分区号>` 定位分区（如 `mmc 1:2` = mmc1 的 2 号分区）。`ext4load` 把分区里的文件读到 DRAM 指定地址；`ext4write` 把 DRAM 区间落盘成分区里的新文件，**长度参数必须是十六进制**（直接抄 `tftp`/`tftpload` 回显括号里的 hex 值，不要手算）。ext4 有日志（journal），U-Boot 写入前后会自行做一致性检查与日志更新。

## 四、实验步骤（实际执行）

> 全部在 `STM32MP>` 提示符执行。原始日志见 `资料/serial_exp15_ext4.log`。

### 1. 列出 eMMC bootfs（mmc 1:2）内容

```bash
ext4ls mmc 1:2
```

实测清单：

```
<DIR>       1024 .
<DIR>       1024 ..
<DIR>      12288 lost+found
            2943 boot.scr.uimg
<DIR>       1024 mmc0_extlinux
<DIR>       1024 mmc1_extlinux
           18244 splash.bmp
           73906 stm32mp157a-fsmp1a-extended-mipi050.dtb
           73661 stm32mp157a-fsmp1a-extended-rgb070.dtb
           73046 stm32mp157a-fsmp1a-extended.dtb
           71805 stm32mp157a-fsmp1a-mipi050.dtb
           71564 stm32mp157a-fsmp1a-rgb070.dtb
         7546640 uImage
         3632471 uInitrd
         7546640 test_uImage
```

> 注：清单里的 `test_uImage` 是板子外借期间他人做同款实验留下的同名文件（课程练手名即 `/test_uImage`），与本实验无关——本篇步骤 4 会用同一份官方 uImage 覆盖它，见 `file found, deleting` 回显。

### 2. 从 eMMC 读 uImage 进 DRAM

```bash
ext4load mmc 1:2 c2000000 uImage
```

实测：`7546640 bytes read in 202 ms (35.6 MiB/s)`——与步骤 1 清单中 uImage 的字节数一致。

### 3. 从 TFTP 服务器下载同一文件到另一地址

```bash
tftp c0000000 uImage
```

实测：`Bytes transferred = 7546640 (732710 hex)`——两条通道（本地 eMMC / 网络 TFTP）读到同一文件、字节数互相印证。

### 4. 把内存数据落盘为新文件 `/test_uImage`

```bash
ext4write mmc 1:2 c0000000 /test_uImage 0x732710
```

实测：

```
File System is consistent
file found, deleting
update journal finished
File System is consistent
update journal finished
7546640 bytes written in 706 ms (10.2 MiB/s)
```

`file found, deleting` = 同名文件已存在、先删后写（U-Boot 没有 ext4 删除命令，覆盖是唯一手段）；长度参数 `0x732710` 直接抄步骤 3 回显括号里的 hex 值。

### 5. 复扫分区确认

```bash
ext4ls mmc 1:2
```

实测：清单中 `7546640 test_uImage` 在列，`lost+found`、`boot.scr.uimg`、五个 dtb、`uImage`、`uInitrd` 等原有条目一个不少。

## 五、实验结果

| 检查项 | 实测结果 |
|---|---|
| `ext4ls mmc 1:2` | 完整清单：boot.scr.uimg、5 个 dtb、uImage（7546640）、uInitrd 等 |
| `ext4load` 本地读取 | 7546640 字节，35.6 MiB/s |
| `tftp` 网络下载 | `Bytes transferred = 7546640 (732710 hex)` |
| `ext4write` 写回 | 7546640 字节，10.2 MiB/s，日志一致性检查通过 |
| 复扫 | `test_uImage` 新增在列，原有条目无缺 |

**结论**：ext4 三条命令全部实测通过，本地/网络两条数据通道以字节数互验一致，实验十六所需的 uImage 与设备树文件已就位（TFTP 根目录）。

## 六、问题与心得

1. **`ext4write` 的长度参数是十六进制**：直接抄 `tftp` 回显括号里的 `732710 hex`，手算十进制再转回去纯属给自己挖坑。
2. **U-Boot 没有 ext4 删除命令**：`ext4write` 遇同名文件"先删后写"且不提示——所以写入前必须核对设备与文件名；本次的 `file found, deleting` 正好把这条隐性规则演示了一遍。
3. **`File System is consistent` 与 `Recovery required` 都正常**：前者是日志干净，后者是上一次写入后未正常卸载、U-Boot 正在重放日志——两种回显都不影响写入结果。
4. **字节数互验法**：同 一份文件走"本地 ext4"与"网络 TFTP"两条通道，读出/收到的字节数一致（7546640）即双向无损——这是裸机阶段最朴素也最可靠的校验手段。
5. eMMC bootfs 里翻到了外借期间的残留文件（`test_uImage`，见实验十一/交接文档的外借记录），本次用同一份官方 uImage 原样覆盖，等于做了一次"以文件覆盖代替删除"的现场教学。
