---
title: "实验二十三　运行内核——自己编的内核第一次点火，并走进 Linux 命令行"
date: 2026-11-01
description: "内核真正跑起来:逐段解读串口启动日志,从 Starting kernel 到挂载根文件系统前的最后一课。"
category: "技术"
tags: [嵌入式, Linux内核, 串口调试]
series: "嵌入式Linux实验·内核移植"
draft: false
---

> 开发板：华清远见 FS-MP1A（STM32MP157A）　实验日期：2026-11-01～11-02（深夜排障到通）
> **最终状态：自编内核 `Linux 5.4.31-g8f42bed88-dirty`（gcc 9.2.1）+ 自编 `stm32mp157a-fsmp1a.dtb` 点火成功，借 eMMC 出厂根文件系统走进 `root@fsmp1a:~#` 命令行：双核识别、完整发行版目录、`/proc/version` 与本地编译信息一致。U-Boot/环境已恢复默认 bootcmd。**

---

## 一、实验目的

1. 用 TFTP 装弹**自己编译的**内核与设备树并 `bootm` 点火，验证实验十九~二十一的全部成果；
2. 借 eMMC 里的出厂根文件系统（`root=`）走进 Linux 命令行，完成"编译—点火—进系统"的完整闭环；
3. 排查"自编内核静默不启动"的问题（本次实验的最大收获，见问题与心得）。

## 二、实验环境

| 项目 | 内容 |
|---|---|
| 装弹来源 | TFTP `192.168.0.100`：`uImage`（9384512B，自编，含 eMMC 节点与 earlycon 调试补丁）+ `stm32mp157a-fsmp1a.dtb`（63584B，自编） |
| 根文件系统 | eMMC（mmcblk1）GPT 4 号分区 rootfs（出厂 ST OpenSTLinux，ext4） |
| bootargs | `console=ttySTM0,115200 root=/dev/mmcblk1p4 rootwait rw` |

## 三、实验原理

`bootm` 把 U-Boot 传递的 `bootargs` 写入设备树 chosen 节点后跳转内核。内核早期打印依赖**控制台注册**：`console=ttySTM0` 使 uart4 驱动注册的 console 生效；若串口驱动因时钟缺失而探测失败，内核进入**哑巴模式**——一切照常运行，串口上却一个字都看不见。FS-MP1A 的板级时钟树由 TF-A 侧的 **SCMI 时钟服务**（SMCCC 传输）提供，内核侧需要 `arm-scmi` 固件驱动 + `arm-smc-mbox` SMC 信箱传输驱动才能取到时钟——这就是"自编内核无声"问题的根源。

## 四、实验步骤（实际执行）

> 原始日志：`资料/serial_exp23_ownkernel.log`、`earlycon_boot.log`、`serial_exp23_scmi.log`、`serial_exp23_final2.log`、`serial_exp23_verify.log`、`ab_test.log`。

### 1. 装弹自编内核与设备树

```bash
tftp c2000000 uImage                        # Bytes transferred = 9384512 (8f3240 hex)
tftp c4000000 stm32mp157a-fsmp1a.dtb        # Bytes transferred = 63584 (f860 hex)
```

`Image Name: Linux-5.4.31-g8f42bed88-dirty`——带 git 哈希，是自己的产物（exp21 的 dtsi 改动未提交，`-dirty` 符合当时状态）。

### 2. 第一次点火：无声（排障起点）

`bootm c2000000 - c4000000` 后只有 `Starting kernel ...`，之后 25 秒零输出。变量分离实验定位：

| 组合 | 结果 | 结论 |
|---|---|---|
| 课程内核 + 我们的 dtb | **正常打印**（`Machine model: HQYJ STM32MP157 FSMP1A Discovery Board`） | dtb 没问题 |
| 我们的内核 + 课程 mipi050 dtb | 依然无声 | **内核的问题** |
| 反编译我们的 dtb | 28 个节点 status=okay，uart4/sdmmc 齐全 | dtb 内容完备 |

### 3. earlycon 透视：内核其实活着

给 `drivers/tty/serial/stm32-usart.c` 追加 15 行 earlycon 支持（`OF_EARLYCON_DECLARE(stm32h7uart, "st,stm32h7-uart", ...)`，写 TDR 轮询 TXE），重编后 bootargs 加 `earlycon`——内核瞬间"开口"：

```
[    0.000000] Booting Linux on physical CPU 0x0
[    0.000000] Linux version 5.4.31-g8f42bed88-dirty (cnu@cnu-virtual-machine) (gcc version 9.2.1 ...) #3 SMP
[    0.000000] OF: fdt: Machine model: HQYJ STM32MP157 FSMP1A Discovery Board
[    2.055573] Kernel panic - not syncing: VFS: Unable to mount root fs on unknown-block(0,0)
```

**内核从没死过——它一直在"哑巴模式"下正常运行到挂根！** 但 0~2s 之间没有任何设备探测行，且 `Warning: unable to open an initial console.`——uart4 驱动没有探测成功。

### 4. 锁定根因：时钟树无父

日志里 `stm32-cpufreq: Failed to get chip info: -517`（-517=EPROBE_DEFER，无限重试）与 `hctosys: unable to open rtc0`——**所有 SoC 设备探测全部无限延迟**。反编译 dtb 对比课程 dtb：RCC 节点的 `clocks = <&scmi 0..4>` 指向 **`firmware/scmi` 节点（SCMI 协议 0x14=clock，经 SMCC 信箱）**——板子的时钟树由 TF-A 的 SCMI 服务提供！而我们的内核配置里 **`CONFIG_ARM_SMC_MBOX` 没开**（fragment-04 只有 TEE/OPTEE 两项），`arm-scmi` 拿不到 SMC 信箱 → SCMI 时钟不注册 → RCC 挂不到父时钟 → 全部外设无限 defer → 哑巴内核 + `rootwait` 永挂。课程内核能点亮，是因为它的配置里有这一项。

### 5. 修复并点火成功

fragment 追加 `CONFIG_ARM_SMC_MBOX=y`，重编后点火，日志三连：

```
[    1.137985] arm-smc-mbox mailbox-0: ARM SMC mailbox enabled.
[    1.202231] arm-scmi firmware:scmi-0: SCMI Protocol v2.0 'ST:' Firmware version 0x0
[    2.561502] printk: console [ttySTM0] enabled
[    2.783048] mmc0: new high speed SDHC card at address 5048
[    2.874175] mmcblk1: mmc1:0001 004GA0 3.69 GiB
[    2.9?] VFS: Mounted root (ext4 filesystem) on device 179:4
```

串口控制台注册、SD 卡与 eMMC 双双探测（eMMC=mmcblk1，与 `root=` 一致）、**ext4 根文件系统挂载成功**。

### 6. 走进 Linux 命令行

systemd 全套服务启动后自动登录，在 `root@fsmp1a:~#` 验证：

```bash
uname -a        # Linux fsmp1a 5.4.31-g8f42bed88-dirty #5 SMP Sun Nov 1 20:56:05 CST 2026 armv7l GNU/Linux
ls /            # bin dev home lost+found mnt root sbin tmp var boot etc lib media proc run sys usr vendor
grep -c processor /proc/cpuinfo    # 2（双核）
cat /proc/version  # Linux version 5.4.31-g8f42bed88-dirty (cnu@cnu-virtual-machine) (gcc version 9.2.1 ...) #5 SMP
```

体验完 `reboot` 回 U-Boot（根是读写挂载，不拔电），恢复 `bootcmd='run bootcmd_stm32mp'` 并存盘。

## 五、实验结果

| 检查项 | 实测结果 |
|---|---|
| 自编内核装弹 | `Bytes transferred = 9384512`，`Image Name: Linux-5.4.31-g8f42bed88-dirty` |
| SCMI 时钟服务 | `SCMI Protocol v2.0 'ST:' Firmware version 0x0`（TF-A 提供） |
| 串口控制台 | `printk: console [ttySTM0] enabled` |
| 双存储探测 | `mmcblk0`（SD32G）+ `mmcblk1`（004GA0 3.69 GiB） |
| 根文件系统 | `VFS: Mounted root (ext4 filesystem)` |
| 命令行验证 | `uname -a`/`ls /`/双核计数全部符合，`/proc/version` 为本地编译信息 |

**结论**：自编内核真实走进 Linux 命令行——"编译内核 → 点火 → 进系统"完整闭环打通，第 5 章移植成果全部落地。

## 六、问题与心得

1. **"无声"不等于"死亡"**：内核可以在没有控制台的情况下正常运行到挂根——排障时"零输出"要先区分"死了"还是"聋了哑了"，earlycon 是区分二者的第一工具（multi_v7 内核没有 DEBUG_LL/earlyprintk，给串口驱动补一个 15 行的 `OF_EARLYCON_DECLARE` 是最快的透视手段）。
2. **时钟树是嵌入式内核的命根子**：所有外设探测都依赖时钟，时钟提供者（本板的 SCMI/TF-A）一旦缺席，全部探测无限 `-EPROBE_DEFER`，日志里只有零星 defer 线索（`stm32-cpufreq -517`、`hctosys: unable to open rtc0`）——读懂这两行就读懂了全局。
3. **设备树的" Compatible"会说话**：RCC 的 `clocks = <&scmi...>` 一行决定了时钟走 SCMI（TF-A 提供）还是传统 fixed-clock——对照课程 dtb 与自编 dtb 的反编译输出，一眼看出体系差异。
4. **A/B 变量分离是排障的捷径**：课程内核×我们的 dtb（通）与我们的内核×课程 dtb（不通）两次实验，把问题从"两者皆可疑"压缩到"内核独锅"，避免了大海捞针。
5. **Kconfig 符号名一字千金**：`ARM_SMC_MBOX` 写成 `ARM_SMC_MAILBOX` 会被 merge_config 静默丢弃（未知符号）——merge 之后必须 grep 验证符号真的进了 `.config`。
6. eMMC bootfs 里还有外借期间留下的 `/test_uImage`（实验十五已覆盖）——两次"考古"互相印证：板子外借时，对方不仅刷了卡，还在 eMMC 上做过同样的实验。
