---
title: "实验06|F-2 修改 SD 卡驱动"
date: 2026-10-04
description: "设备树里修正 SD 卡检测引脚配置:让 U-Boot 稳定识别 TF 卡,MMC 相关报错就此消失。"
category: "技术"
tags: [嵌入式, U-Boot, 设备树]
series: "嵌入式Linux实验·U-Boot移植"
draft: false
---

> 开发板：华清远见 FS-MP1A（STM32MP157A）　实验日期：2026-10-04
> 实验平台：VMware + Ubuntu 20.04（192.168.56.103）；串口 115200（Windows COM3）

---

## 一、实验目的

1. 理解实验五结束时 `-123` 错误的根因：**SDMMC1 的卡检测（CD）引脚与 DK1 不同**——DK1 用 `gpiob7`，FS-MP1A 用 `gpioh3`（原理图 PH3 → 网络 SD1_CD）；
2. 学会只改设备树一行解决驱动问题：`cd-gpios = <&gpioh 3 (GPIO_ACTIVE_LOW | GPIO_PULL_UP)>;`；
3. 重新编译、烧写（SPL 需烧两份——CD 引脚在 SPL 阶段就要用），上电验证 **U-Boot 第一次完整跑起来，进入 `STM32MP>` 命令行**。

## 二、实验原理

- SPL 启动时要先判断"卡在不在"才去读卡：CD 引脚就是干这个的。设备树里 `cd-gpios` 描述的是"哪个引脚、低电平有效、内部上拉"；
- DK1 模板里的 CD 引脚（gpiob7）在 FS-MP1A 上没有接线，真正的卡检测脚是 PH3，所以 SPL 永远等不到"卡插入"，报 `-123`；
- 修改只涉及设备树一处一行，`(GPIO_ACTIVE_LOW | GPIO_PULL_UP)` 描述的是电气特性，与引脚无关，**原样保留**。

## 三、实验步骤（实际执行）

### 1. 激活工具链，切出实验分支

```bash
source /stm32env && echo $CC          # arm-ostl-linux-gnueabi-gcc ... 生效
git checkout -b exp6-f2 exp5-f1       # 从实验五完成态切出
```

### 2. 定位并修改 CD 引脚

修改前定位（脚本 `fix_exp6.py`，等价于课件的一行 sed）：

```bash
grep -n "cd-gpios" arch/arm/dts/stm32mp15xx-fsmp1x.dtsi
```

把 `cd-gpios = <&gpiob 7 ...>` 改为 `cd-gpios = <&gpioh 3 ...>`。

**修改后自检（实测）**：

```
--- 自检: cd-gpios 现值(应为 gpioh 3):
434:	cd-gpios = <&gpioh 3 (GPIO_ACTIVE_LOW | GPIO_PULL_UP)>;
--- 自检: gpiob 7 残留(应为0):
0
```

（落在第 434 行，与原文预测的"第 440 行附近"一致。）

### 3. git 提交

```bash
git add arch/arm/dts/stm32mp15xx-fsmp1x.dtsi
git commit -m "exp6 F-2: SDMMC1 卡检测引脚改为 gpioh3(FS-MP1A SD1_CD=PH3)"
```

实测提交：`c8160a3c`。

### 4. 增量编译

```bash
make -j2 all DEVICE_TREE=stm32mp157a-fsmp1a
```

实测以 `COPY spl/u-boot-spl.bin → MKIMAGE spl/u-boot-spl.stm32 → COPY u-boot-spl.stm32 → CFGCHK u-boot.cfg` 收尾（与原文一致），产物大小不变（98921 / 860638 字节——只改了设备树内容）。

### 5. 烧写 SD 卡（三条 dd，SPL 烧两份）

```
sdb1: 193+1 records out, 98921 bytes
sdb2: 193+1 records out, 98921 bytes
sdb3: 1680+1 records out, 860638 bytes
回读校验: sdb3 md5 = b4fc7834df870eb933b3ef9f8ddc8b25 = u-boot.img ✓
```

### 6. 上电验证（实测串口日志，经 u-boot `reset` 抓取完整启动）

```
U-Boot SPL 2020.01-stm32mp-r1-gc8160a3c (Oct 04 2026 - 19:40:28 +0800)
Model: STMicroelectronics STM32MP157A-DK1 Discovery Board
RAM: DDR3-DDR3L 16bits 533000Khz
WDT:   Started with servicing (32s timeout)
Trying to boot from MMC1

U-Boot 2020.01-stm32mp-r1-gc8160a3c (Oct 04 2026 - 19:40:28 +0800)
CPU: STM32MP157AAA Rev.Z
Model: STMicroelectronics STM32MP157A-DK1 Discovery Board
Board: stm32mp1 in basic mode (st,stm32mp157a-dk1)
DRAM:  512 MiB
Clocks:
- MPU : 650 MHz  - MCU : 208.878 MHz  - AXI : 266.500 MHz
- PER : 24 MHz   - DDR : 533 MHz
WDT:   Started with servicing (32s timeout)
NAND:  0 MiB
MMC:   STM32 SD/MMC: 0
Loading Environment from MMC... OK
In:    serial
Out:   serial
Err:   serial
stm32 vrefbuf timed out: -110
adc@0: can't enable vdd-supply!board_check_usb_power: single shot failed for adc@0[18]!
Net:   eth0: ethernet@5800a000
Hit any key to stop autoboot:  5 4 3 2 1 0
EQOS_DMA_MODE_SWR stuckFAILED: -110EQOS_DMA_MODE_SWR stuckFAILED: -110Wrong Image Format for bootm command
ERROR: can't get kernel image!
STM32MP>
```

## 四、实验结果

| 判据 | 结果 |
|---|---|
| `Trying to boot from MMC1` 后不再出现 `-123` | ✅ CD 引脚改对了，SPL 认出 SD 卡并成功加载 SSBL |
| 停在 `STM32MP>` 命令行 | ✅ **basic 版 U-Boot 第一次完整跑起来** |
| 版本串 `gc8160a3c` | ✅ 正是本实验提交号，跑的是自己的镜像 |
| `Loading Environment from MMC... OK` | ✅ 读到卡数据区遗留的有效环境变量（无害） |
| ADC 三条报错、`Net:` 后网卡报错仍存在 | 属预期——分别是实验七（F-3）、实验九（F-5）的处理对象 |

**附加验证**（在 `STM32MP>` 下执行）：

```
[CMD> mmc list]
STM32 SD/MMC: 0 (SD)          ← 只有 SD（eMMC 要等 F-6）
[CMD> mmc part]
Partition Map for MMC device 0 -- Partition Type: EFI
  1 "fsbl1"  2 "fsbl2"  3 "ssbl"  4 "bootfs"(attrs 0x4 可引导)  5 "rootfs"
[CMD> version]
U-Boot 2020.01-stm32mp-r1-gc8160a3c (Oct 04 2026 - 21:41:16 +0800)
```

命令行、Tab 补全、mmc 一族命令全部可用——U-Boot 移植的第一个里程碑达成。

## 五、问题与心得

1. "每修一个错误，串口就把下一个错误指给你看"——本站修好了 -123，ADC 和网卡报错浮出水面，这正是移植的推进方式；
2. 改设备树一行的背后是原理图对照：CD 引脚差异只有看原理图才能知道（PH3 = SD1_CD）；
3. SPL 烧两份不是仪式：CD 引脚在 SPL 阶段就要用，只烧一份等于没改；
4. 版本串里的 git 提交号（gc8160a3c）是最好的"身份证明"，每次验证都能确认跑的是哪一版的镜像。
