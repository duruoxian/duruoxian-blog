---
title: "实验三　basic 版 U-Boot 配置与首次编译"
date: 2026-10-04
description: "用 fsmp1a_defconfig 配置并编译出第一版 U-Boot,烧写上板——它没能启动,复位循环成了下一关的入口。"
category: "技术"
tags: [嵌入式, U-Boot, Linux]
series: "嵌入式Linux实验·U-Boot移植"
draft: false
---

> 开发板：华清远见 FS-MP1A（STM32MP157A）
> 实验平台：VMware + Ubuntu 20.04（`192.168.56.103`，用户 `cnu`），4 GB 内存
> 实验日期：2026-10-04

---

## 一、实验目的

以 ST 官方 DK1 板为模板，为 FS-MP1A 创建自己的 defconfig 和设备树，完成 basic 版 U-Boot 的首次编译。移植的本质是两件事：

- **defconfig**（编译期）：决定哪些代码参与编译；
- **设备树**（运行期）：描述板子上的硬件。

## 二、实验环境

| 项目 | 内容 |
|---|---|
| 源码 | 实验二的 `u-boot-stm32mp-2020.01`（官方源码 + 6 个 ST 补丁），工具链 `/stm32env` |
| 工作方式 | 全程 git 分支管理：在"三件套已复制"的中间状态上切出 `exp3-basic` 分支，完成后提交 |

## 三、实验原理

- **defconfig**：U-Boot 用 Kconfig 管理配置，`make xxx_defconfig` 生成 `.config`；ST 已提供 DK1/DK2/ED1/EV1 等板的 defconfig，FS-MP1A 与 `stm32mp157a-dk1` 同源，所以从 `stm32mp15_basic_defconfig` 复制一份作为自己的默认配置。
- **设备树三层结构**：板级入口 `.dts`（哪块板）→ 公共包含层 `.dtsi`（板级硬件描述）→ U-Boot 专属覆盖层 `-u-boot.dtsi`（U-Boot 特有的 dm-pre-reloc 等标记）。
- **两处必须同步的修改**：`.dts` 的 `#include` 要指向改名后的 `.dtsi`；`arch/arm/dts/Makefile` 的 `dtb-$(CONFIG_STM32MP15x)` 列表要注册新的 `.dtb`，否则设备树不会被编译。缺前者报"找不到文件"，缺后者不生成 dtb。
- 编译命令 `make all DEVICE_TREE=stm32mp157a-fsmp1a` 中的 `DEVICE_TREE` 变量能用，正是实验二 0099 号补丁开的口子。

## 四、实验步骤（实际执行）

### 1. 激活交叉编译工具链

```bash
source /stm32env
echo $CC    # 输出 arm-ostl-linux-gnueabi-gcc -mthumb -mfpu=neon-vfpv4 ...，确认生效
```

### 2. 创建并加载 FS-MP1A 的 defconfig

```bash
cp configs/stm32mp15_basic_defconfig configs/stm32mp15_fsmp1a_basic_defconfig
make stm32mp15_fsmp1a_basic_defconfig
```

实测末尾输出 `# configuration written to .config`。本实验首次编译**不改任何配置项**（保持 DK1 原始配置，故意的——实验四的"预期失败"就来自它）。

### 3. 复制设备树"三件套"

```bash
cp arch/arm/dts/stm32mp157a-dk1.dts         arch/arm/dts/stm32mp157a-fsmp1a.dts
cp arch/arm/dts/stm32mp15xx-dkx.dtsi        arch/arm/dts/stm32mp15xx-fsmp1x.dtsi
cp arch/arm/dts/stm32mp157a-dk1-u-boot.dtsi arch/arm/dts/stm32mp157a-fsmp1a-u-boot.dtsi
```

### 4. 两处同步修改

**4.1 `arch/arm/dts/stm32mp157a-fsmp1a.dts` 第 13 行**，include 指向改名后的文件：

```c
#include "stm32mp157.dtsi"
#include "stm32mp15xa.dtsi"
#include "stm32mp15-pinctrl.dtsi"
#include "stm32mp15xxac-pinctrl.dtsi"
#include "stm32mp15xx-fsmp1x.dtsi"     /* ← 第13行：原来是 stm32mp15xx-dkx.dtsi */
```

实测确认第 13 行已改为 `#include "stm32mp15xx-fsmp1x.dtsi"`。

**4.2 `arch/arm/dts/Makefile` 第 832 行附近**，在 `dtb-$(CONFIG_STM32MP15x) += \` 列表中 `stm32mp157a-dk1.dtb \` 之后注册新板：

```make
dtb-$(CONFIG_STM32MP15x) += \
	stm32mp157a-avenger96.dtb \
	stm32mp157a-dk1.dtb \
	stm32mp157a-fsmp1a.dtb \
	stm32mp157a-ed1.dtb \
	...
```

实测 `grep -n fsmp1a.dtb arch/arm/dts/Makefile` → `834:	stm32mp157a-fsmp1a.dtb \`。

### 5. git 提交本阶段成果

```bash
git add arch/arm/dts/Makefile arch/arm/dts/stm32mp157a-fsmp1a.dts
git commit -m "exp3: register stm32mp157a-fsmp1a.dtb and switch include to fsmp1x"
```

（实测提交为 `25934cab`；连同三件套复制、defconfig 建立均已在 git 中可追溯。）

### 6. 首次编译

```bash
make -j2 all DEVICE_TREE=stm32mp157a-fsmp1a
```

4 GB 内存虚拟机 `-j2` 是安全上限。全新编译约 10~20 分钟，实际编译无 error。

### 7. 检查编译产物（实测）

```
$ ls -la u-boot-spl.stm32 u-boot.img
-rw-rw-r-- 1 cnu cnu 867409 10月  4 19:40 u-boot.img
-rw-rw-r-- 1 cnu cnu 101016 10月  4 19:41 u-boot-spl.stm32
```

| 产物 | 大小 | 角色 |
|---|---|---|
| `u-boot-spl.stm32` | 101016 B（约 101 KB） | **FSBL**（SPL），负责初始化时钟树与 DDR，并加载 SSBL |
| `u-boot.img` | 867409 B（约 867 KB） | **SSBL**（U-Boot 本体） |

与原文参考值（101016 / 867417 字节）一致（`.img` 差几十字节属编译时间戳等元数据差异）。`.stm32` 后缀表示带 ST 专用签名头（256 字节 STM32 Header），ROM Code 只认带此头的镜像。

## 五、实验结果

defconfig 创建并加载成功、三件套复制完成、两处同步修改完成、编译无 error、顶层目录生成 `u-boot-spl.stm32` 与 `u-boot.img` 两个镜像。**basic 版 U-Boot 已具备烧写上板条件**（实验四）。

## 六、问题与心得

1. 新终端必须重新 `source /stm32env`；忘激活的特征报错：`cc1: error: bad value ('generic-armv7-a') for '-mtune=' switch`，且错误里出现一排 Intel/AMD CPU 名。
2. `make xxx_defconfig` 前先 `echo $CC` 确认工具链，能省掉很多"莫名"报错。
3. 设备树修改必须**两处同步**（`.dts` 的 include + `dts/Makefile` 的 dtb 注册），缺前者报找不到文件，缺后者不生成 dtb。
4. 编译报错先看**第一条 error**，那才是病根；后面的错误多半是它的连锁反应。
5. 编译产物不要提交进 git（U-Boot 的 .gitignore 已忽略），要保存的配置用 `cp .config configs/xxx_defconfig` 变成被跟踪的文件。
