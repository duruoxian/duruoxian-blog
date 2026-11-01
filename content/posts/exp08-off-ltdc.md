---
title: "实验八　F-4 关闭 LTDC 显示"
date: 2026-10-04
description: "关闭用不到的 LTDC LCD 控制器驱动,清掉启动日志里的显示相关报错——按板子实际情况做减法。"
category: "技术"
tags: [嵌入式, U-Boot, Linux]
series: "嵌入式Linux实验·U-Boot移植"
draft: false
---

> 开发板：华清远见 FS-MP1A（STM32MP157A）　实验日期：2026-10-04

---

## 一、实验目的

1. 理解 LTDC（LCD-TFT 显示控制器）在 U-Boot 阶段的作用：DK1 用它点亮屏幕，FS-MP1A 的显示驱动尚不适配——**U-Boot 阶段不需要屏幕，直接关闭**；
2. 学会"设备树使能/禁用"的最小改动：`&ltdc` 节点 `status = "okay"` → `"disabled"`；
3. 完成一次"串口零变化"实验的验证方法：**启动行为与上一站完全一致**即为达标（改动只影响不在串口上体现的显示通路）。

## 二、实验原理

- 设备树节点的 `status` 属性控制驱动是否 probe：`"okay"` = 启用，`"disabled"` = 禁用；
- LTDC 的显示输出不影响串口日志——本实验的改动在设备树层面，编译产物只差几个字节（dts 内容变化）；
- 这一站的意义在于保持移植节奏：每站解决一类硬件差异，显示通路留给后续（内核/驱动阶段）再适配。

## 三、实验步骤（实际执行）

### 1. 切出实验分支

```bash
git checkout -b exp8-f4 exp7-f3
```

### 2. 定位并修改 &ltdc 节点

修改前定位（实测）：

```
343:&ltdc {
344-	pinctrl-names = "default", "sleep";
345-	pinctrl-0 = <&ltdc_pins_a>;
346-	pinctrl-1 = <&ltdc_pins_sleep_a>;
347-	status = "okay";
```

用脚本只改 `&ltdc` 节点内的 `status`（正则锚定 `&ltdc {` 到第一个 `}` 之间，不碰其它节点的 okay）：

```python
new, n = re.subn(r'(&ltdc \{[^}]*?)status = "okay";', r'\1status = "disabled";', s, count=1)
```

**修改后实测**：

```
343:&ltdc {
344-	pinctrl-names = "default", "sleep";
345-	pinctrl-0 = <&ltdc_pins_a>;
346-	pinctrl-1 = <&ltdc_pins_sleep_a>;
347-	status = "disabled";
```

### 3. git 提交

```bash
git add arch/arm/dts/stm32mp15xx-fsmp1x.dtsi
git commit -m "exp8 F-4: 关闭 LTDC 显示(&ltdc status=disabled)"
```

实测提交：`20685cec`。

### 4. 重新编译

```bash
make -j2 all DEVICE_TREE=stm32mp157a-fsmp1a
```

实测产物 **853438 → 853442 字节（+4）**——纯设备树内容变化的典型体积差；SPL 不变（98921）。

### 5. 烧写 + 上电验证

```
sdb1/sdb2: 各 98921 字节；sdb3: 853442 字节；回读 md5 一致 ✓
```

**实测串口日志**（`version` + `reset` 抓取，存档 `serial_exp8_boot.log`）：

```
version
U-Boot 2020.01-stm32mp-r1-g20685cec (Oct 04 2026 - 21:48:05 +0800)
...
resetting ...
U-Boot SPL 2020.01-stm32mp-r1-g20685cec (Oct 04 2026 - 21:48:05 +0800)
...
Trying to boot from MMC1

U-Boot 2020.01-stm32mp-r1-g20685cec (Oct 04 2026 - 21:48:05 +0800)
Board: stm32mp1 in basic mode (st,stm32mp157a-dk1)
MMC:   STM32 SD/MMC: 0
Loading Environment from MMC... OK
Err:   serial
Net:   eth0: ethernet@5800a000
Hit any key to stop autoboot:  5 4 3 2 1 0
EQOS_DMA_MODE_SWR stuckFAILED: -110（×2）
Wrong Image Format for bootm command
STM32MP>
```

## 四、实验结果

| 判据 | 结果 |
|---|---|
| 启动日志与实验七**逐行一致**（无新增报错、无行为变化） | ✅ LTDC 关闭不影响串口可见的任何行为——符合预期 |
| 版本串 `g20685cec` | ✅ 跑的正是 F-4 提交的镜像 |
| 产物 +4 字节 | ✅ 纯 dts 内容变化的体积特征 |
| 仍停 `STM32MP>` 命令行 | ✅ |

## 五、问题与心得

1. **"没有变化"也是实验结果**：本站验证的核心是"启动行为不变 + 改动确实进了镜像"（版本串、体积差、dts 内容三重证据）；
2. 改 `status` 属性是设备树使能/禁用硬件的标准手法，后面内核阶段的驱动调试还会大量用到；
3. 一个节点 `status` 的取舍标准：U-Boot 阶段用不到、且驱动与硬件不匹配的，先关掉——让启动日志尽量干净，把真正的问题暴露出来；
4. 至此 F-1~F-4 全部完成：电源（F-1）→ SD 卡检测（F-2）→ ADC（F-3）→ LTDC（F-4），剩余网卡（F-5）与 eMMC（F-6）。
