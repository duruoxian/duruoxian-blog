---
title: "实验21|移植 eMMC 驱动——让内核\"看见\"板载硬盘"
date: 2026-11-01
description: "内核侧的 eMMC 支持:设备树节点与驱动配置,让 MMC 控制器在 Linux 下被正确识别。"
category: "技术"
tags: [嵌入式, Linux内核, eMMC]
series: "嵌入式Linux实验·内核移植"
draft: false
---

> 开发板：华清远见 FS-MP1A（STM32MP157A）　实验日期：2026-11-01
> **最终状态：板级 dtsi 新增 `&sdmmc2` eMMC 节点（+17 行），`CONFIG_MMC_STM32_SDMMC=y` 天生已勾，增量重编后 fsmp1a.dtb 63250 → 63584（+334B 即新节点），uImage 同步更新，已交付 TFTP 根目录。**

---

## 一、实验目的

1. 在内核板级设备树中为板载 eMMC（SDMMC2 控制器，8-bit）添加节点，让自编内核能探测到 eMMC；
2. 确认内核 MMC 控制器驱动配置（`CONFIG_MMC_STM32_SDMMC`）；
3. 增量重编内核与设备树，为实验二十三（自编内核 + eMMC 根文件系统）铺路。

## 二、实验环境

| 项目 | 内容 |
|---|---|
| 源码树 | 实验二十产物（`8f42bed88`），内核 5.4.31 + 23 补丁 |
| 目标文件 | `arch/arm/boot/dts/stm32mp15xx-fsmp1x.dtsi`（板级 dtsi，3662B） |
| eMMC | SDMMC2 控制器，8-bit，非可插拔（`non-removable`） |

## 三、实验原理

实验十四摸底已知：eMMC 挂在 **SDMMC2** 控制器上、8-bit 总线、不可热插拔。内核侧要让 `mmci`/STM32 SDMMC 驱动探测它，需要在板级 dtsi 里给 `&sdmmc2` 控制器节点补上引脚复用（4 数据线 + 47 数据线的 pinctrl 组）、总线属性（8-bit、DDR 3.3V）与供电（vmmc/vqmmc 固定稳压器），并把 `status` 打成 `okay`。SD 卡（sdmmc1）带 `cd-gpios` 卡检测，eMMC 焊死在板上用 `non-removable` + `no-sd`/`no-sdio` 声明身份。控制器驱动 `CONFIG_MMC_STM32_SDMMC` 在 multi_v7_defconfig + ST 补丁下天生已勾，无需改配置。

## 四、实验步骤（实际执行）

> 全部在 Ubuntu 终端、内核源码顶层执行（`arch/arm/boot/dts/` 下的这份 dtsi，不是 U-Boot 树的同名文件）。

### 1. 在 `stm32mp15xx-fsmp1x.dtsi` 的 `/*sdmmc1 TF 卡*/` 节点之后、`&sram` 之前插入整段

```c
/*sdmmc2 eMMC*/
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

实测插入后：`grep -A 5 "sdmmc2 eMMC"` 原样回显；`git diff --stat` = `1 file changed, 17 insertions(+)`，位置在 `&sdmmc1` 之后、`&sram` 之前。

### 2. 确认控制器驱动配置

```bash
grep MMC_STM32 .config
```

实测：`CONFIG_MMC_STM32_SDMMC=y`——multi_v7_defconfig + ST 补丁天生已勾，无需 menuconfig。（关键词是 `MMC_STM32`，不是 `SDMMC_STM32`。）

### 3. 增量重编内核与设备树

```bash
make -j4 uImage dtbs LOADADDR=0xC2000040
```

实测：`Kernel: arch/arm/boot/uImage is ready`；产物对账：

| 产物 | 重编前 | 重编后 | 变化 |
|---|---|---|---|
| `stm32mp157a-fsmp1a.dtb` | 63250B | **63584B** | +334B = sdmmc2 节点编入 |
| `uImage` | 9384512B | 9384512B | 内核本体未动（本篇只改设备树） |

### 4. 交付 TFTP 根目录

```bash
cp arch/arm/boot/uImage /home/cnu/tftpboot/uImage
cp arch/arm/boot/dts/stm32mp157a-fsmp1a.dtb /home/cnu/tftpboot/stm32mp157a-fsmp1a.dtb
```

（dtsi 与 `.config` 的未提交改动按课程安排留到实验二十二最后一步一起提交。）

## 五、实验结果

| 检查项 | 实测结果 |
|---|---|
| `&sdmmc2` 节点插入 | +17 行，位置正确，git diff 仅此一段 |
| 控制器驱动 | `CONFIG_MMC_STM32_SDMMC=y` |
| 增量重编 | uImage ready，dtb 63250 → 63584B |
| 交付 | uImage + dtb 已入 TFTP 根目录 |

**结论**：自编内核的设备树已具备 eMMC 探测能力，实验二十三可让自编内核挂载 eMMC。

## 六、问题与心得

1. **"看见"eMMC 只差一段节点**：控制器驱动（y）与总线协议都在内核里，缺的只是"这块板上 eMMC 接在 SDMMC2、8-bit、焊死"这句话——设备树就是硬件的"自我介绍"。
2. **`non-removable` 与 `cd-gpios` 的对比**就是 SD 卡与 eMMC 的本质区别：可插拔靠卡检测脚，焊死的靠声明。
3. **dtb 变大 334B = 节点的直接物化**：设备树改动在 dtb 体积上立竿见影，是比 `ls -l` 更硬的"编进去了"证据。
4. pinctrl 组合（b4 + d47）对应 8-bit 总线的全部数据线——SD 卡 4-bit 只用 b4 组，对比着看更容易记住。
