---
title: "实验10|F-6 支持 eMMC"
date: 2026-10-04
description: "给 U-Boot 加上 eMMC 支持:MMC 0/1 双设备同时识别,3.7GiB eMMC 跑通 8-bit 总线。"
category: "技术"
tags: [嵌入式, U-Boot, eMMC]
series: "嵌入式Linux实验·U-Boot移植"
draft: false
---

> 开发板：华清远见 FS-MP1A（STM32MP157A）　实验日期：2026-10-04（编译）／2026-10-20（上板验证）
> **最终状态：全部完成并通过上板验证（`g589ad327`，`MMC: STM32 SD/MMC: 0, STM32 SD/MMC: 1`，eMMC 实测 3.7GiB / 8-bit）。**

---

## 〇、结论速览

| 项目 | 结果 |
|---|---|
| 编译产物 | `u-boot-spl.stm32` 99460B（+539B）、`u-boot.img` 854420B、提交 `589ad327` |
| 烧写 | 三条 dd + 三重逐字节 `cmp` 全部 OK；SPL md5 `14399946d63174fd5746e4fafd620ea0`、IMG md5 `dbff551ba405bcfc874068e0bf4dfed5` |
| 上板版本 | `U-Boot 2020.01-stm32mp-r1-g589ad327` ✅ |
| 双设备识别 | `MMC: STM32 SD/MMC: 0, STM32 SD/MMC: 1` ✅ |
| eMMC 详情 | `004GA`、`Capacity: 3.7 GiB`、`Bus Width: 8-bit`、`MMC version 5.0` ✅ |
| 回归检查 | 实验九的网卡改动仍正常（`PHY auto negotiation ... done`）✅ |
| 结论 | **F-6 全部达标** |

---

## 一、实验目的

1. 理解 eMMC 与 SD 卡在 U-Boot 中的差异：eMMC **焊在板上**（无 CD 检测脚，`non-removable`），走 SDMMC2 控制器、8 位总线；
2. 学会"驱动代码已有、设备树没配"这类问题的解法：新增 `&sdmmc2` 节点 + U-Boot 覆盖层的 `mmc1` 别名与 `dm-spl` 标记；
3. 验证 `MMC: STM32 SD/MMC: 0  STM32 SD/MMC: 1`（SD + eMMC 双设备）；eMMC 支持的另一个目的：**后续实验可从 eMMC 里的出厂固件提取材料**（如实验十一要用的出厂 TF-A）。

## 二、实验原理

- U-Boot 里**已有 eMMC 控制器驱动**，缺的只是设备树配置——这是"硬件在、配置缺"的典型；
- 引脚核对：SDMMC2 的 10 根信号（D0-D7/CLK/CMD）与处理器 PB14/PB15/PB3/PB4/PA8/PA9/PE5/PD3/PE3/PG6 的 AF9/AF10 复用定义，已确认与 `stm32mp15-pinctrl.dtsi` 中 `sdmmc2_b4_pins_a`、`sdmmc2_d47_pins_a` 一致，无需新写引脚；
- `u-boot,dm-spl`：让 sdmmc2 在 SPL 阶段也可用（SPL 需要具备从 eMMC 启动的能力）；`mmc1 = &sdmmc2` 别名让 eMMC 成为 1 号 MMC 设备；
- 电气属性：8 位总线（bus-width=8）、不可热插拔（non-removable）、eMMC 3.3V DDR（mmc-ddr-3_3v）、供电来自 F-1 新建的固定电源（vmmc=v3v3、vqmmc=vdd）。

## 三、实验步骤（实际执行）

### 1. 切出实验分支

```bash
git checkout -b exp10-f6 exp9-f5
```

### 2. 新增 &sdmmc2 节点（`stm32mp15xx-fsmp1x.dtsi`，插在 &sdmmc3 之前）

```dts
&sdmmc2 {
	pinctrl-names = "default", "opendrain", "sleep";
	pinctrl-0 = <&sdmmc2_b4_pins_a &sdmmc2_d47_pins_a>;
	pinctrl-1 = <&sdmmc2_b4_od_pins_a &sdmmc2_d47_pins_a>;
	pinctrl-2 = <&sdmmc2_b4_sleep_pins_a &sdmmc2_d47_sleep_pins_a>;
	non-removable;
	no-sd;
	no-sdio;
	st,neg-edge;
	bus-width = <8>;
	vmmc-supply = <&v3v3>;
	vqmmc-supply = <&vdd>;
	mmc-ddr-3_3v;
	status = "okay";
};
```

**实测**：节点落在 **442~456 行**（与原文"约 442~457 行"一致）。

### 3. U-Boot 覆盖层两处新增（`stm32mp157a-fsmp1a-u-boot.dtsi`）

```dts
aliases {
	i2c3 = &i2c4;
	mmc0 = &sdmmc1;
	mmc1 = &sdmmc2;        /* ← 新增：eMMC 启动通道 */
	usb0 = &usbotg_hs;
};

&sdmmc2 {
	u-boot,dm-spl;         /* ← 新增：SPL 阶段可用 */
};
```

**实测**：`mmc1 = &sdmmc2` 落在第 14 行、`&sdmmc2 dm-spl` 落在 160~162 行。

### 4. git 提交

```bash
git add -A arch/arm/dts
git commit -m "exp10 F-6: 支持 eMMC(新增 &sdmmc2 节点 + aliases mmc1 + dm-spl)"
```

实测提交：`589ad327`。

### 5. 重新编译（实测）

```
MKIMAGE spl/u-boot-spl.stm32 → COPY → CFGCHK u-boot.cfg
```

**产物体积对账**：SPL 98921 → **99460 字节（+539 = eMMC 的 SPL 支持编入）**；u-boot.img 854042 → 854420 字节（设备树变大）。

### 6. 烧写（实测，2026-10-20）

物理循环同前：拔 **DC 5V 电源插头**断电 10 秒 → 取卡插读卡器 → VMware 连给虚拟机 → `lsblk` 认卡（本次 `/dev/sdb`，29.8G，五分区齐全）→ 三条 dd → 三重 `cmp` → `eject` → 卡插回板子 → **确认拨码 101** → 上电。

实测输出：

```
SPL1_WRITTEN
SPL2_WRITTEN
SSBL_WRITTEN
SPL1_OK
SPL2_OK
SSBL_OK
14399946d63174fd5746e4fafd620ea0  u-boot-spl.stm32
dbff551ba405bcfc874068e0bf4dfed5  u-boot.img
EJECTED_OK
```

## 四、上板验证（**全部通过**）

### 4.1 启动日志（达标记）

```
U-Boot 2020.01-stm32mp-r1-g589ad327 (Oct 04 2026 - 21:49:56 +0800)

CPU:   STM32MP157AAA Rev.Z
Model: STMicroelectronics STM32MP157A-DK1 Discovery Board
Board: stm32mp1 in basic mode (st,stm32mp157a-dk1)
DRAM:  512 MiB
Clocks:
- MPU : 650 MHz
- MCU : 208.878 MHz
- AXI : 266.500 MHz
- PER : 24 MHz
- DDR : 533 MHz
WDT:   Started with servicing (32s timeout)
NAND:  0 MiB
MMC:   STM32 SD/MMC: 0, STM32 SD/MMC: 1
Loading Environment from MMC... OK
In:    serial
Out:   serial
Err:   serial
Net:   eth0: ethernet@5800a000
Hit any key to stop autoboot:  0
ethernet@5800a000 Waiting for PHY auto negotiation to complete...... done
Using ethernet@5800a000 device
TFTP from server 192.168.0.100; our IP address is 169.254.59.198
...
ARP Retry count exceeded; starting again
Wrong Image Format for bootm command
ERROR: can't get kernel image!
STM32MP>
```

**逐条对账**：

| 判据 | 实测证据 | 结果 |
|---|---|---|
| 版本是 exp10 | `U-Boot 2020.01-stm32mp-r1-g589ad327` | ✅ |
| **双 MMC 设备** | `MMC:   STM32 SD/MMC: 0, STM32 SD/MMC: 1` | ✅ 0=SD 卡，1=板载 eMMC |
| 环境加载正常 | `Loading Environment from MMC... OK` | ✅ |
| 与实验九的写法差异 | 上一站是 `STM32 SD/MMC: 0`（单个）；本站变成 `STM32 SD/MMC: 0, STM32 SD/MMC: 1`（逗号分隔的两个） | ✅ 说明多注册了一个 MMC 设备 |
| 无回归（网卡） | `Net: eth0` + `PHY auto negotiation ... done`，无 `EQOS_DMA_MODE_SWR stuck` | ✅ F-5 改动未被破坏 |

### 4.2 eMMC 设备详情（实测命令与输出）

启动日志只能证明"多认了一个设备"，要证明它是**真的可用的 eMMC**，还要继续查。

**命令 1：列出现有 MMC 设备**

```
STM32MP> mmc list
STM32 SD/MMC: 0 (SD)
STM32 SD/MMC: 1
STM32MP>
```

> 设备 0 后面带 `(SD)` 标注（SD 卡，有卡检测脚），设备 1 没有标注——这正是设备树里 `no-sd;` / `no-sdio;` / `non-removable;` 的体现：它不是可插拔的 SD 卡，而是焊在板上的 eMMC。

**命令 2：切换当前设备到 eMMC**

```
STM32MP> mmc dev 1
switch to partitions #0, OK
mmc1(part 0) is current device
STM32MP>
```

> `switch to partitions #0, OK` 说明 eMMC 的**分区 0（用户数据区）**成功切换；这部分对应实验四分区表里的 `rootfs` 角色，后续可以从 eMMC 启动系统。

**命令 3：查询 eMMC 详细信息**

```
STM32MP> mmc info
Device: STM32 SD/MMC
Manufacturer ID: 11
OEM: 100
Name: 004GA
Bus Speed: 52000000
Mode: MMC High Speed (52MHz)
Rd Block Len: 512
MMC version 5.0
High Capacity: Yes
Capacity: 3.7 GiB
Bus Width: 8-bit
Erase Group Size: 512 KiB
HC WP Group Size: 4 MiB
User Capacity: 3.7 GiB WRREL
Boot Capacity: 2 MiB ENH
RPMB Capacity: 512 KiB ENH
STM32MP>
```

**逐字段解读（这就是 F-6 的"成果验收单"）**：

| 字段 | 实测值 | 说明 |
|---|---|---|
| `Name: 004GA` | 004GA | eMMC 型号标识，**4GB 级**器件 |
| `MMC version 5.0` | 5.0 | 支持 eMMC 5.0 协议 |
| `Capacity: 3.7 GiB` | 3.7 GiB | 用户可用容量（4GB 标称值的二进制换算正常差额） |
| **`Bus Width: 8-bit`** | 8-bit | **关键**：直接印证 F-6 设备树里的 `bus-width = <8>` 生效——SD 卡一般是 4-bit，8-bit 是 eMMC 的专属优势（带宽翻倍） |
| `Mode: MMC High Speed (52MHz)` | HS 52MHz | 与设备树 `mmc-ddr-3_3v` / HS 时序设置相符 |
| `High Capacity: Yes` | Yes | 大容量设备（>2GB），走块寻址而非字节寻址 |
| `Boot Capacity: 2 MiB ENH` | 2 MiB | **eMMC 有两个硬件启动分区**，各 2MB，出厂固件通常放在这里——这正好印证实验原理中"eMMC 可作为启动和固件提取通道"的说法 |
| `RPMB Capacity: 512 KiB ENH` | 512 KiB | 受保护的重放存储区（安全特性），U-Boot 只读取不修改 |
| `Erase Group Size: 512 KiB` | 512 KiB | 擦除粒度，重写 eMMC 时要按此对齐 |

> **`bus-width = <8>` 是怎么验证的？** 设备树写 `bus-width = <8>` 只是"申请"，真正协商成功才会在 `mmc info` 里显示 `8-bit`。如果引脚复用（pinctrl）配错、或只接了 4 根数据线，这里会显示 `4-bit`。所以这一项是 F-6 最硬的证据。

### 4.3 对实验十一的铺垫

`mmc info` 里的 **`Boot Capacity: 2 MiB ENH`** 说明 eMMC 有独立的硬件启动分区，出厂固件（含华清适配的 TF-A）很可能就在里面。这为实验十一"缺 TF-A 文件"提供了第二条获取途径（不过本次实验十一已通过老师提供的文件解决，未走提取路线）。

## 五、问题与心得

1. **"驱动已有、配置缺失"是嵌入式移植的常见形态**：先确认代码在不在（drivers/mmc/），再补设备树——方向反了就会去写不必要的驱动；
2. `dm-spl` 标记是 U-Boot 驱动模型特有的：SPL 是精简版，设备树节点必须显式标记才会被 SPL 阶段实例化；
3. 供电引用直接复用 F-1 建立的固定电源（v3v3/vdd）——前面的电源改造在这里"回本"了；
4. eMMC 支持不只是"多认一个设备"：它是后续从板载存储启动、以及提取出厂固件的通道；
5. **设备树写的是"期望"，`mmc info` 显示的才是"实际"**：`bus-width = <8>` 写在设备树里不代表总线真的跑起来了，必须用 `mmc info` 的 `Bus Width: 8-bit` 反向确认——这类"配置 → 运行态"的验证思路在整个移植过程中通用（对照实验九的"驱动编进去了"要用 `Net: eth0` + PHY 协商来确认）；
6. **变更日志要看"变化本身"**：本站与实验九的启动日志几乎一字不差，唯独 `MMC: STM32 SD/MMC: 0` 变成了 `MMC: STM32 SD/MMC: 0, STM32 SD/MMC: 1`。做这类实验时，**把上一站的日志留在手边逐行对比**，比凭记忆判断"有变化没有"可靠得多；
7. `mmc list` 里设备 1 **不带 `(SD)` 标注** 这个细节很小，但恰好是 `no-sd` / `non-removable` 两个设备树属性在运行态的可见证据。
