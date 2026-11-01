---
title: "实验22|移植网卡驱动——四处齐动，把 MAE0621A 装进内核"
date: 2026-11-01
description: "把 U-Boot 阶段啃下的 MAE0621A 网卡经验带进内核:驱动移植与网络实测。"
category: "技术"
tags: [嵌入式, Linux内核, 网卡驱动]
series: "嵌入式Linux实验·内核移植"
draft: false
---

> 开发板：华清远见 FS-MP1A（STM32MP157A）　实验日期：2026-11-02（凌晨）
> **最终状态：MAE0621A 内核驱动（maxio.c 等价重构版）+ phy_device.c 三处修改 + Makefile/Kconfig/设备树四处齐动，重编点火后 `stm32-dwmac` 探测成功、`eth0: Link is Up - 1Gbps/Full`、板内 Linux `ping 192.168.0.100` 3 发 3 中 0% 丢包。git 提交 `f18027af2`（含实验二十一）。**

---

## 一、实验目的

1. 将 MAE0621A 千兆 PHY 的**内核版驱动**接入自编内核（区别于第 3 章 F-5 的 U-Boot 版——两套代码、两个世界）；
2. 掌握内核驱动的"四处齐动"集成法：驱动文件（maxio.c）+ 内核通用层修改（phy_device.c）+ Makefile 编译项 + Kconfig 配置项；
3. 设备树补 ethernet0 节点（RGMII + MDIO + PHY 地址 0），点亮网络，为 NFS 挂根（第 6 章）备路。

## 二、实验环境

| 项目 | 内容 |
|---|---|
| 源码树 | 实验二十产物（`8f42bed88`）+ 实验二十一的 sdmmc2 节点，WORKING 分支 |
| PHY | 板载 Maxio MAE0621A 千兆 PHY，MDIO 地址 0，PHY ID `0x7b744411`（mask 全匹配） |
| MAC | SoC 内置 stmmac/dwmac（`stm32-dwmac`，multi_v7 自带，设备树声明即可） |
| 驱动来源 | 课程原包 `kernel-网卡驱动.zip`（18,708B，md5 `d75517d6942d...`）**本机缺失**——驱动为等价重构：maxio.c 依 U-Boot 版逻辑（`u-boot-网卡-MAE0621A驱动/maxio.c`）按内核 phy_driver 框架重写；phy_device.c 按课程文档记载的三处修改逐条施加 |

## 三、实验原理

以太网是"MAC + PHY"两级结构：MAC（stmmac/dwmac，芯片内置，内核自带）+ PHY（MAE0621A，独立芯片，需要专门驱动）。PHY 驱动在内核里以 `phy_driver` 结构注册（PHY ID + 掩码匹配 MDIO 总线上扫到的设备）。此外 MAE0621A 有个怪脾气：**MDIO 读 ID 寄存器前必须先往 `MII_PHYSID2` 写一次 0**，否则报不出 ID——这需要改内核通用层 `phy_device.c` 的 `get_phy_id()`，且用 `#ifdef CONFIG_MAXIO_PHY` 与驱动开关咬合（同一开关管驱动编译与怪脾气补丁）。

## 四、实验步骤（实际执行）

> 全部在 Ubuntu 终端、内核源码树内执行。原课程包 `kernel-网卡驱动.zip` 缺失，本篇按等价重构执行（驱动功能以实板验证为准），特此说明。

### 1. 驱动文件：maxio.c（重构）+ phy_device.c 三处修改

**maxio.c**（`drivers/net/phy/maxio.c`，新文件）：phy_driver 框架注册，PHY ID `0x7b744411`（mask 0xffffffff），`probe` 做时钟源修正（soft reset → page 0xa43 读 workmode → page 0xd92 读 clkmode → 异常态按 BIT(5)/BIT(8) 选振荡器/晶振），`config_init` 关 EEE（MMD_AN 的 EEE_ADV 写 0）+ 设 LED（page 0xd04 reg 0x10 = 0x617f），收发状态走 genphy。

**phy_device.c 三处修改**（对照课程文档逐条施加）：

- ① `get_phy_id()`：读 `MII_PHYSID1` 之前插入写 `MII_PHYSID2=0` 的"先写后读"块，`#ifdef CONFIG_MAXIO_PHY` 包裹；
- ② 读 ID 失败返回 `-ENODEV`（不中断总线扫描）——**核查发现 ST 补丁版基线已自带此逻辑**（注释原文 `returning -ENODEV doesn't stop bus scanning` 与文档一字不差），无需重复施加；
- ③ `phy_device_create()` 的 `device_initialize` 时机提前到分配之后，失败路径由 `kfree` 改为 `put_device`（设备生命周期修正）。

### 2. Makefile 加编译项

`drivers/net/phy/Makefile` 在 `obj-$(CONFIG_MDIO_XGENE) += mdio-xgene.o` 之后加：

```makefile
obj-$(CONFIG_MAXIO_PHY)		+= maxio.o
```

### 3. Kconfig 加配置项

`drivers/net/phy/Kconfig` 在 `config REALTEK_PHY` 与 `config RENESAS_PHY` 之间加（`tristate`/`---help---` 用 Tab 缩进）：

```kconfig
config MAXIO_PHY
	tristate "MAXIO PHYS"
	---help---
	  Supports the Maxio MAEXXXX PHY.
```

### 4. 配置勾选（fragment 方式）

`fragment-99-scmi.config` 追加 `CONFIG_MAXIO_PHY=y`，`merge_config.sh -m -r` 合并后 `oldconfig` 落定。实测 `grep MAXIO .config` → `CONFIG_MAXIO_PHY=y`。

### 5. 设备树加 ethernet0 节点

`stm32mp15xx-fsmp1x.dtsi` 末尾（`&vrefbuf` 段之后）追加：

```c
/*网卡*/
&ethernet0 {
    status = "okay";
    pinctrl-0 = <&ethernet0_rgmii_pins_a>;
    pinctrl-1 = <&ethernet0_rgmii_pins_sleep_a>;
    pinctrl-names = "default", "sleep";
    phy-mode = "rgmii-id";
    max-speed = <1000>;
    phy-handle = <&phy0>;
    mdio0 {
        #address-cells = <1>;
        #size-cells = <0>;
        compatible = "snps,dwmac-mdio";
        phy0: ethernet-phy@0 {
            reg = <0>;
        };
    };
};
```

### 6. 重编译并提交（实验二十一 + 本篇一起）

```bash
make -j4 uImage dtbs LOADADDR=0xC2000040
git add drivers/net/phy/maxio.c drivers/net/phy/phy_device.c drivers/net/phy/Makefile drivers/net/phy/Kconfig arch/arm/boot/dts/stm32mp15xx-fsmp1x.dtsi
git commit -m "FS-MP1A eMMC 与网卡驱动（实验二十一/二十二）"
```

实测：编译 `Kernel: arch/arm/boot/uImage is ready`；提交 **`f18027af2`**（在其上 `8f42bed88` 实验二十、其下 `6959c5ed5` new kernel），产物已交付 TFTP 根目录。

### 7. 点火验证

`bootm`（bootargs 沿用 `console=ttySTM0,115200 root=/dev/mmcblk1p4 rootwait rw`）实测：

```
[    2.618126] stm32-dwmac 5800a000.ethernet: User ID: 0x40, Synopsys ID: 0x42
[    2.682978] libphy: stmmac: probed
[    3.016522] EXT4-fs (mmcblk1p4): mounted filesystem with ordered data mode.
...
[   24.879809] stm32-dwmac 5800a000.ethernet eth0: Link is Up - 1Gbps/Full - flow control rx/tx
```

进入 Linux 后实测：

```bash
ip -br addr show eth0        # eth0 UP
ip addr add 192.168.0.8/24 dev eth0
ping -c 3 192.168.0.100      # 3 发 3 中，0% packet loss（rtt 1.0~5.0 ms）
```

## 五、实验结果

| 检查项 | 实测结果 |
|---|---|
| 驱动文件 | maxio.c（重构版）入树，phy_device.c 三处修改施加（②基线已含） |
| Makefile/Kconfig | `CONFIG_MAXIO_PHY` 暗号对上，`=y` |
| 设备树 | ethernet0 节点在 dtsi 末尾 |
| git | `f18027af2`（实验二十一/二十二合一提交），工作区干净 |
| MAC 探测 | `stm32-dwmac 5800a000.ethernet: User ID: 0x40, Synopsys ID: 0x42` |
| 链路 | `eth0: Link is Up - 1Gbps/Full` |
| 端到端 | 板内 Linux `ping 192.168.0.100`：3/3 received，0% loss |

**结论**：MAE0621A 内核驱动集成完成且实板验证通过——"改一次文件不用烧盘"的网络开发模式自此可用。

## 六、问题与心得

1. **两套驱动、两个世界**：U-Boot 版 maxio.c（3469B，`phy_register` 体系）与内核版（phy_driver 体系）文件名相同、编译体系完全不同——拿错包的典型症状是"头文件/函数不存在"。
2. **课程包缺失时的等价重构方法**：功能逻辑抄同芯片的 U-Boot 版驱动（寄存器级操作原样翻译），注册框架按目标内核规范（phy_driver + module_phy_driver）——重构后必须实板验证（PHY 探测 + 链路 + ping 三级证据）。
3. **"华清三处修改"有一处已上游化**：文档记载的 `-ENODEV` 修改在 ST 补丁版基线里已经存在（逐字一致）——动手前先 diff 基线，能省一处工作量。
4. **CONFIG 开关的三重咬合**：Makefile 的 `obj-$(CONFIG_MAXIO_PHY)`、Kconfig 的 `config MAXIO_PHY`、phy_device.c 的 `#ifdef CONFIG_MAXIO_PHY` 三处靠同一名字咬合，一处拼错全盘哑火。
5. **出厂系统不自动配 IP**：ST starter 的网络配置等 DHCP，直连链路上没有 DHCP 服务器——`ip addr add` 手动配地址即可；这也是后续 NFS 挂根实验要用到的同一套网络。
