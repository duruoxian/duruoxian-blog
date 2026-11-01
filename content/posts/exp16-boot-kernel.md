---
title: "实验16|启动 Linux 内核命令——bootm 点火，第一章悬案揭晓"
date: 2026-11-01
description: "bootz 引导一条龙:从 eMMC/SD 加载内核镜像与设备树,手动把 Linux 拉起来——启动链的最后一棒。"
category: "技术"
tags: [嵌入式, U-Boot, Linux内核]
series: "嵌入式Linux实验·U-Boot使用"
draft: false
---

> 开发板：华清远见 FS-MP1A（STM32MP157A）　实验日期：2026-11-01
> **最终状态：TFTP 双文件装弹 → 魔数校验 → `bootm` 点火成功——内核 `Linux 5.4.31` 真实启动，Machine model 确认，止于预期中的 `Kernel panic: VFS: Unable to mount root fs`（无根文件系统，课程设计节点）。**

---

## 一、实验目的

1. 掌握 `bootm` 三段式启动命令（内核镜像 + `-` 占位 + 设备树）；
2. 用 `md.l` 内存检查法验证装弹结果（uImage/FDT 魔数）；
3. 亲眼确认"U-Boot 引导链的终点就是内核的起点"：内核点火后因没有根文件系统而 panic——把第一章悬案（板子到底怎么从 U-Boot 走进 Linux）画上阶段性句号。

## 二、实验环境

| 项目 | 内容 |
|---|---|
| 开发板 | FS-MP1A，trusted 版 U-Boot `g392260b4`，`STM32MP>` 提示符 |
| TFTP 服务器 | Ubuntu `192.168.0.100`（实验十三搭建），已放置课程官方 `uImage`（7546640B）与 `stm32mp157a-fsmp1a-mipi050.dtb`（71805B） |

## 三、实验原理

`bootm <内核地址> <initrd地址> <设备树地址>` 是 U-Boot 启动 Linux 的标准三段式；没有 initrd 时第二段用 `-` 占位。uImage 是 zImage 加 64 字节 U-Boot 头，头首四字节是魔数 `0x27051956`；设备树（FDT）首四字节魔数是 `0xd00dfeed`——`md.l` 按 32 位小端显示，所以看到的是字节序翻转后的 `56190527` 与 `edfe0dd0`。内核启动时没有任何 `root=` 参数，VFS 找不到根文件系统就会 `Kernel panic`；U-Boot 期间开启的 IWDG 看门狗（32s 超时）会在 panic 挂死约 32 秒后自动复位板子。

## 四、实验步骤（实际执行）

> 全部在 `STM32MP>` 提示符执行。原始日志见 `资料/serial_exp16_bootm.log`（含 `资料/serial_exp16_bootm.log` 前半段装弹记录）。

### 1. 从 TFTP 装弹：内核 + 设备树

```bash
tftp c2000000 uImage
tftp c4000000 stm32mp157a-fsmp1a-mipi050.dtb
```

实测：`Bytes transferred = 7546640 (732710 hex)`、`Bytes transferred = 71805 (1187d hex)`，与服务器上两个文件的字节数一一对应。

### 2. 点火前检查：内存魔数

```bash
md.l c2000000 1
md.l c4000000 1
```

实测：

```
c2000000: 56190527                               '..V
c4000000: edfe0dd0                               ....
```

`56190527` 小端还原即 uImage 魔数 `27051956`；`edfe0dd0` 即 FDT 魔数 `d00dfeed`——两发装弹全部到位。

### 3. bootm 点火

```bash
bootm c2000000 - c4000000
```

实测关键回显（节选，完整日志见资料）：

```
## Transferring control to Linux (at address c2000040)...
Starting kernel ...

[    0.000000] Linux version 5.4.31 (oe-user@oe-host) (gcc version 9.3.0 (GCC)) #1 SMP PREEMPT Wed Apr 8 07:08:47 UTC 2020
[    0.000000] OF: fdt: Machine model: HQYJ STM32MP157 FSMP1A MIPI Discovery Board
...（内核初始化日志百余行：CPU/时钟/串口/eMMC 网卡/USB 等驱动逐个报到）
[    6.992816] Kernel panic - not syncing: VFS: Unable to mount root fs on unknown-block(0,0)
[    7.382012] ---[ end Kernel panic - not syncing: VFS: Unable to mount root fs on unknown-block(0,0) ]---
```

内核真实点火并打印了百余行初始化日志后，按预期止于 VFS 找不到根文件系统的 panic。pan 前日志里仅一条无害驱动告警（`st7701 ... cannot get reset GPIO: -517`，MIPI 屏未接，探头失败不致命）。

## 五、实验结果

| 检查项 | 实测结果 |
|---|---|
| `tftp` 内核 | `Bytes transferred = 7546640 (732710 hex)` |
| `tftp` 设备树 | `Bytes transferred = 71805 (1187d hex)` |
| 魔数检查 | `56190527`（uImage）/ `edfe0dd0`（FDT），小端还原正确 |
| `bootm` | `Starting kernel ...` → Linux 5.4.31 启动 → `Machine model: HQYJ STM32MP157 FSMP1A MIPI Discovery Board` |
| 预期 panic | `[6.99s] Kernel panic - not syncing: VFS: Unable to mount root fs on unknown-block(0,0)` |

**结论**：第一次用自己拉取的内核+设备树完成点火，启动链"U-Boot → 内核"走通；panic 是"没有根文件系统"的必然结果，不是失败——根文件系统正是下一阶段（实验二十四起）的主角。

## 六、问题与心得

1. **三段式的 `-` 占位**：`bootm c2000000 - c4000000` 中间的 `-` 两侧必须有空格，它告诉 bootm"没有 initrd，直接跳到设备树"——写成 `bootm c2000000 c4000000` 会把设备树当 initrd 解析，必挂。
2. **魔数要会看小端**：`md.l` 按 32 位小端回显，uImage 魔数显示为 `56190527`，字节序还原后才是 `27051956`——两个魔数一查，"装没装弹"一目了然，省得点火失败回头瞎猜。
3. **panic 的位置就是课程的路标**：`VFS: Unable to mount root fs` 说明 CPU 跑起来、内核解压完成、驱动初始化全部正常，只差一个根文件系统——这一行 panic 等于宣布"U-Boot 阶段全部收官"。
4. **看门狗是兜底保险**：panic 后内核挂死不再输出，U-Boot 期间开着的 IWDG（32s 超时）会自动复位板子，复位后倒计时归零还会自动跑 bootcmd——所以拦停要快；本篇捕获窗在 panic 转储后即结束，复位段未入镜，现象与课件一致。
5. 驱动日志里 `st7701 ... cannot get reset GPIO: -517` 不用管：MIPI 屏没接，面板驱动探头失败属正常，不阻塞启动。
