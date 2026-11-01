---
title: "实验05|F-1 修改设备树电源配置——终结复位循环"
date: 2026-10-04
description: "复位循环的根因是 DK1 模板里的 STPMIC1 电源芯片与 FS-MP1A 的分立电源电路不符——「删、换、关」三步修改设备树,终结复位循环。"
category: "技术"
tags: [嵌入式, U-Boot, 设备树]
series: "嵌入式Linux实验·U-Boot移植"
draft: false
---

> 开发板：华清远见 FS-MP1A（STM32MP157A）
> 实验平台：VMware + Ubuntu 20.04（`192.168.56.103`，用户 `cnu`），4 GB 内存
> 实验日期：2026-10-04

---

## 一、实验目的

1. 理解复位循环的根因：实验三的设备树是从 **DK1 模板**抄来的，其中描述了 DK1 板上的 **STPMIC1 电源管理芯片**（挂在 I2C4 总线）；FS-MP1A 用**分立电源电路**、没有这颗芯片，SPL 读 PMIC 寄存器超时（-110）后复位；
2. 掌握"**删 → 换 → 关**"三步修复法：
   - **删**：删除 `&i2c4` 整段（内含 PMIC 与 Type-C 控制器）、所有引用被删节点的属性/子节点；
   - **换**：用 6 路 `regulator-fixed` 固定电源顶替原 PMIC 输出的电源路；
   - **关**：menuconfig 关闭 STPMIC1 驱动选项；
3. 重新编译、烧写、上电，验证电源报错消失（新的报错是下一关，属预期）。

## 二、实验环境

| 项目 | 内容 |
|---|---|
| 源码状态 | 实验三完成态（git 分支 `exp3-basic`，官方源码+ST补丁+三件套+两处注册） |
| 工作方式 | 从 `exp3-basic` 切出 `exp5-f1` 分支，只做 F-1 电源相关修改（F-2~F-6 留给后续实验） |
| 修改文件 | `arch/arm/dts/stm32mp15xx-fsmp1x.dtsi`（公共层）、`arch/arm/dts/stm32mp157a-fsmp1a-u-boot.dtsi`（U-Boot 覆盖层）、`.config` |
| 烧写 | SD 卡分区沿用实验四，只重烧三条 dd |

## 三、实验原理

- 设备树引用是**编译期检查**的：删节点必须"成片删"——连同所有引用它的属性一起删，否则 dtc 报 `Reference to non-existent node or label`；
- 原 `&i2c4` 段定义了 16 个电源标签，段外仍被引用的有 8 个：`vddcore`（被 &cpu0/&cpu1 引用）和 `con_usbotg_hs_ep`（被 &usbotg_hs 的 port 引用）**连引用一起删掉**；其余 6 个（v3v3、vdd、v1v8_audio、v3v3_hdmi、v1v2_hdmi、vdd_usb）**用固定电源顶替**——这就是"恰好 6 个"的由来；
- 删大段认"顶格 `};`"：内层节点收尾都带 Tab，只有节点自身的收尾顶格。

## 四、实验步骤（实际执行）

### 1. 激活工具链并切出实验分支

```bash
source /stm32env && echo $CC    # 确认 arm-ostl-linux-gnueabi-gcc
git checkout -b exp5-f1 exp3-basic
```

### 2. 删除 `&i2c4` 整段（约 180 行）

```bash
sed -i '/^&i2c4 {/,/^};/d' arch/arm/dts/stm32mp15xx-fsmp1x.dtsi
```

该节点内含 `stusb1600@28`（Type-C 控制器）和 `pmic: stpmic@33`（带 16 个 regulator 子节点及 onkey/watchdog）。本次实验通过脚本按"顶格 `};`"边界精确删除。

### 3. 删除引用电源节点的内容

删除以下两段（`vddcore` 标签已随 &i2c4 消失）：

```dts
&cpu0{
	cpu-supply = <&vddcore>;
};
&cpu1{
	cpu-supply = <&vddcore>;
};
```

### 4. 删除 `&usbotg_hs` 里引用 Type-C 的 port 子节点

删后整个节点保留为：

```dts
&usbotg_hs {
	phys = <&usbphyc_port1 0>;
	phy-names = "usb2-phy";
	usb-role-switch;
	status = "okay";
};
```

（`remote-endpoint = <&con_usbotg_hs_ep>` 正是对已删除的 Type-C 控制器端点的引用。）

### 5. 删除 U-Boot 覆盖层里的 `&pmic`

`arch/arm/dts/stm32mp157a-fsmp1a-u-boot.dtsi` 中删除：

```dts
&pmic {
	u-boot,dm-pre-reloc;
};
```

### 6. 根节点末尾添加 6 路固定电源

在 `stm32mp15xx-fsmp1x.dtsi` 根节点收尾 `};` 之前（原有 `vin` 之后）添加：

```dts
v3v3: regulator-3p3v {
	compatible = "regulator-fixed";
	regulator-name = "v3v3";
	regulator-min-microvolt = <3300000>;
	regulator-max-microvolt = <3300000>;
	regulator-always-on;
	regulator-boot-on;
};

vdd: regulator-vdd {
	compatible = "regulator-fixed";
	regulator-name = "vdd";
	regulator-min-microvolt = <3300000>;
	regulator-max-microvolt = <3300000>;
	regulator-always-on;
	regulator-boot-on;
};

v1v8_audio: regulator-v1v8-audio {	/* 1800000，其余同上 */
	regulator-name = "v1v8_audio";
};

v3v3_hdmi: regulator-v3v3-hdmi {	/* 3300000 */
	regulator-name = "v3v3_hdmi";
};

v1v2_hdmi: regulator-v1v2-hdmi {	/* 1200000 */
	regulator-name = "v1v2_hdmi";
};

vdd_usb: regulator-vdd-usb {		/* 3300000 */
	regulator-name = "vdd_usb";
};
```

（报告为省篇幅缩写；实际文件中 6 个节点均含完整 compatible / regulator-min-max / always-on / boot-on 属性。）

### 7. menuconfig 关闭 STPMIC1 驱动

路径：`Device Drivers → Power → Enable support for STMicroelectronics STPMIC1 PMIC` 取消。

本次通过配置脚本实现等价操作（结果与 menuconfig 相同）：

```bash
make stm32mp15_fsmp1a_basic_defconfig
sed -i 's/^CONFIG_PMIC_STPMIC1=y/# CONFIG_PMIC_STPMIC1 is not set/' .config
make olddefconfig
grep "STPMIC1" .config
```

**实测**（`DM_REGULATOR_STPMIC1` 因依赖 PMIC_STPMIC1 被 olddefconfig 自动关闭）：

```
--- STPMIC1 配置前状态:
CONFIG_PMIC_STPMIC1=y
CONFIG_DM_REGULATOR_STPMIC1=y
--- STPMIC1 配置后状态(应 not set):
# CONFIG_PMIC_STPMIC1 is not set
```

### 8. 修改自检（实测输出）

```
--- 自检1: i2c4/stpmic/stusb1600 残留(应只剩第9行include头文件):
9:#include <dt-bindings/mfd/st,stpmic1.h>
--- 自检2: vddcore 引用(应无):
（无输出）
--- 自检3: u-boot.dtsi 中 pmic 残留(应无):
（无输出）
--- 自检4: 固定电源节点数(应=7, 6新增+原有vin):
7
```

自检1 命中第 9 行的 `#include <dt-bindings/mfd/st,stpmic1.h>` 属正常——宏头文件不产生节点引用。

### 9. git 提交本阶段成果

```bash
git add -A arch/arm/dts
git commit -m "exp5 F-1: 修改设备树电源配置(删PMIC/I2C4/Type-C引用, 添加6路固定电源)"
```

实测提交：`9230cac6`。

### 10. 重新编译（实测）

```bash
make -j2 all DEVICE_TREE=stm32mp157a-fsmp1a
```

编译无 error，产物 dtc 校验通过：

```
--- 产物dtb中 regulator-fixed 节点数(应>=7):
7
```

产物大小对比（电源修复后 SPL 变小约 2 KB——PMIC 驱动被移除的直接体现）：

| 产物 | 实验三 | 实验五（F-1 后） |
|---|---|---|
| `u-boot-spl.stm32` | 101016 B | **98921 B** |
| `u-boot.img` | 867409 B | **860638 B** |

### 11. 烧写 SD 卡并上电验证

实验四已分区，只重烧三条 dd：

```bash
$ sudo dd if=u-boot-spl.stm32 of=/dev/sdb1 conv=fdatasync
193+1 records in
193+1 records out
98921 bytes (99 kB, 97 KiB) copied, 0.118502 s, 835 kB/s
$ sudo dd if=u-boot-spl.stm32 of=/dev/sdb2 conv=fdatasync
193+1 records in
193+1 records out
98921 bytes (99 kB, 97 KiB) copied, 0.194818 s, 508 kB/s
$ sudo dd if=u-boot.img of=/dev/sdb3 conv=fdatasync
1680+1 records in
1680+1 records out
860638 bytes (861 kB, 840 KiB) copied, 0.759568 s, 1.1 MB/s
```

回读校验（按镜像字节数读回比对 md5）：

```
sdb1 回读 6630cae0bb727a89444506ebaac8783f = u-boot-spl.stm32 的 md5 ✓
sdb3 回读 a2218f6fbab4beb4162f04bbb5c717ef = u-boot.img 的 md5 ✓
```

板子断电 → 插卡 → 拨码 101 → 上电。

**实测串口输出**（COM 口 115200 实抓，完整日志 384 字节，存档 `实验报告/资料/serial_exp5_f1_result.log`）：

```
U-Boot SPL 2020.01-stm32mp-r1-g9230cac6 (Oct 04 2026 - 19:44:53 +0800)
Model: STMicroelectronics STM32MP157A-DK1 Discovery Board
RAM: DDR3-DDR3L 16bits 533000Khz
WDT:   Started with servicing (32s timeout)
Trying to boot from MMC1
MMC: no card present
spl: mmc init failed with error: -123
SPL: failed to boot from all boot devices
### ERROR ### Please RESET the board ###
```

> 版本串 `g9230cac6` 即本次实验的 git 提交号、时间戳 `Oct 04 2026 - 19:44:53` 为本次编译时间——板上跑的正是 F-1 修复后的镜像。

**与实验四（F-1 修复前）的对照**：

| 实验四（DK1 模板） | 实验五（F-1 后） |
|---|---|
| `stpmic1_read: failed to read register` ×2 | **消失** |
| `board_init_f: probe failed ... power=-110` | **消失** |
| `ddr power init failed` | **消失**（DDR 正常：`RAM: DDR3-DDR3L 16bits 533000Khz`） |
| `resetting ...` **无限复位循环**（85 轮） | **不再复位**，停在新错误上 |
| — | `Trying to boot from MMC1` → `MMC: no card present` → **`error: -123`** |

**三条判据同时成立，F-1 达标**：电源报错消失、DDR 初始化通过、出现新错误 -123（SDMMC1 卡检测引脚与 DK1 不同：DK1 用 `gpiob7`，FS-MP1A 用 `gpioh3`，属下一篇文章 F-2 的修复对象）。

## 五、实验结果（判读）

预期看到：电源报错（stpmic1_read / ddr power init failed）**完全消失**，DDR 初始化通过，出现**新错误**：

```
Trying to boot from MMC1
MMC: no card present
spl: mmc init failed with error: -123
SPL: failed to boot from all boot devices
### ERROR ### Please RESET the board ###
```

-123 = SDMMC1 卡检测（CD）引脚与 DK1 不同（DK1 用 gpiob7，FS-MP1A 用 gpioh3），即 **F-2 的修复对象**。"看到新错误就是成功"——F-1 达标。

## 六、注意事项

1. 两个文件别混淆：`stm32mp15xx-fsmp1x.dtsi` 是公共层（删 i2c4/cpu 引用/port、加固定电源），`stm32mp157a-fsmp1a-u-boot.dtsi` 是 U-Boot 覆盖层（删 &pmic）；
2. 不要重复添加 `vin`（模板已有），否则节点重名编译失败；
3. 编译报引用错误按标签对号入座：vddcore→步骤3、pmic→步骤5、con_usbotg_hs_ep→步骤4、v3v3/vdd/vdd_usb→检查步骤6是否完整；
4. 配置改动必须存回 defconfig（`cp .config configs/..._defconfig`），否则下次 `make xxx_defconfig` 会被改回去；
5. 烧写前 lsblk 确认 /dev/sdb；插拔卡在断电状态进行。
