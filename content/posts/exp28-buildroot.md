---
title: "实验二十八　buildroot 配置与编译——一条 menuconfig 造完整根文件系统"
date: 2026-11-01
description: "从手工拼装到工业流水线:buildroot 一键生成交叉工具链、内核与根文件系统的完整嵌入式系统。"
category: "技术"
tags: [嵌入式, 根文件系统, buildroot]
series: "嵌入式Linux实验·根文件系统"
draft: false
---

> 开发板：华清远见 FS-MP1A（STM32MP157A）　实验日期：2026-11-02
> **最终状态：buildroot-2020.02.6 配置直灌（fragment defconfig）十项验证全过，`make source` 预下载完成，全量编译完成，`rootfs.tar` 产出并部署至 `/home/cnu/nfsboot/rfs-buildroot`（NFS 待挂）。**

---

## 一、实验目的

1. 用 buildroot 一条配置生成完整根文件系统（对照实验二十五的手工 busybox 路线）；
2. 掌握外置工具链（Custom toolchain）接入方法——复用实验十九的 arm-9.2 交叉编译器，**不让 buildroot 自编工具链**（省最大头）；
3. 产物 rootfs.tar 部署到 NFS 目录，与实验二十七的网络根流程衔接。

## 二、实验环境

| 项目 | 内容 |
|---|---|
| buildroot | 2020.02.6（官方源码包，5568633B） |
| 外置工具链 | `/usr/local/arm/gcc-arm-9.2-...`（gcc 9.2.1，glibc，内核头 4.20.x——`LINUX_VERSION_CODE 267277` 核验） |
| 编译机 | Ubuntu 20.04（4 vCPU，磁盘 72G 空闲） |

## 三、实验原理

buildroot 用 Kconfig 管理配置、按包（package）组织构建：本篇配置=目标架构（cortex-A7）+ 外置工具链声明 + 系统骨架选项（hostname/banner/init/dev 管理/root 密码）+ 文件系统镜像格式（tar）+ 两禁（内核与 U-Boot 不让 buildroot 碰——无板级适配必失败）+ 一勾（kmod，模块工具）。课程用 menuconfig 逐项配置，本篇以 **defconfig fragment 直灌**等价执行（`make BR2_DEFCONFIG=fragment defconfig`，秒级完成），验证标准与课程逐条对应。

## 四、实验步骤（实际执行）

> 全部在 Ubuntu 终端、`~/share/buildroot-2020.02.6/` 内执行。

### 1. 自检与解压

```bash
arm-none-linux-gnueabihf-gcc -v 2>&1 | tail -1   # gcc version 9.2.1
df -h                                            # 磁盘余 10GB 以上
cd ~/share && tar xf buildroot-2020.02.6.tar.bz2 && cd buildroot-2020.02.6
```

### 2. 工具链内核头版本（菜单里选 4.20.x 的依据）

```bash
grep LINUX_VERSION_CODE <工具链>/arm-none-linux-gnueabihf/libc/usr/include/linux/version.h
```

实测：`#define LINUX_VERSION_CODE 267277` → 4.20.13 → 选 `4.20.x`。

### 3. 配置（menuconfig 选项 → fragment 直灌）

课程菜单的全部选项翻译为 buildroot fragment（`br28.fragment`），核心内容：

```
BR2_arm=y
BR2_cortex_a7=y
BR2_ARM_EABIHF=y
BR2_ARM_FPU_NEON_VFPV4=y
BR2_ARM_INSTRUCTIONS_ARM=y
BR2_TOOLCHAIN_EXTERNAL=y
BR2_TOOLCHAIN_EXTERNAL_CUSTOM=y
BR2_TOOLCHAIN_EXTERNAL_PREINSTALLED=y
BR2_TOOLCHAIN_EXTERNAL_PATH="/usr/local/arm/gcc-arm-9.2-2019.12-x86_64-arm-none-linux-gnueabihf"
BR2_TOOLCHAIN_EXTERNAL_PREFIX="$(ARCH)-none-linux-gnueabihf"
BR2_TOOLCHAIN_EXTERNAL_GCC_9=y
BR2_TOOLCHAIN_EXTERNAL_HEADERS_4_20=y
BR2_TOOLCHAIN_EXTERNAL_GLIBC=y
BR2_TOOLCHAIN_EXTERNAL_HAS_SSP=y
BR2_TOOLCHAIN_EXTERNAL_HAS_RPC=y
BR2_INSTALL_LIBSTDCPP=y
BR2_USE_MMU=y
BR2_TARGET_GENERIC_HOSTNAME="ATK-stm32mp1"
BR2_TARGET_GENERIC_ISSUE="Welcome to alientek STM32MP157"
BR2_INIT_BUSYBOX=y
BR2_ROOTFS_DEVICE_CREATION_DYNAMIC_MDEV=y
BR2_TARGET_ENABLE_ROOT_LOGIN=y
BR2_TARGET_GENERIC_ROOT_PASSWD="123"
BR2_PACKAGE_KMOD=y
# BR2_LINUX_KERNEL is not set
# BR2_TARGET_UBOOT is not set
BR2_TARGET_ROOTFS_TAR=y
```

```bash
make BR2_DEFCONFIG=br28.fragment defconfig
```

（对应课程菜单：Target options 六项 → Toolchain 十二项 → System configuration 六项 → Filesystem images 保 tar 默认 → 两禁一勾。）

### 4. 配置验证（课程十连，全部通过）

```bash
grep -cE "BR2_arm=y|BR2_cortex_a7=y|BR2_ARM_EABIHF=y|BR2_ARM_FPU_NEON_VFPV4=y|BR2_ARM_INSTRUCTIONS_ARM=y" .config   # 5
grep -E "^BR2_ARCH=|^BR2_ENDIAN=" .config        # BR2_ARCH="arm" / BR2_ENDIAN="LITTLE"
grep -E "BR2_TOOLCHAIN_EXTERNAL_CUSTOM=y|BR2_PACKAGE_KMOD=y" .config    # 两行
grep -E "BR2_LINUX_KERNEL=|BR2_TARGET_UBOOT=" .config                   # 无输出（两禁生效）
grep BR2_TARGET_GENERIC_ROOT_PASSWD .config                              # "123"
```

### 5. 预下载源码包 + 编译

```bash
make source      # 全部包预下载（fakeroot 等逐个 sha256 校验 OK）
make             # buildroot 自调度并行（不带 -j）
```

实测：编译完成（详见 `资料/exp28_build.log`），产物在 `output/images/`。

### 6. 取产物并部署到 NFS

```bash
ls output/images/        # rootfs.tar 为本篇交付物
cp output/images/rootfs.tar /home/cnu/nfsboot/
cd /home/cnu/nfsboot && mkdir rfs-buildroot && tar xf rootfs.tar -C rfs-buildroot
ls rfs-buildroot         # 完整目录树（比 busybox 版多 lib32 media opt run 等）
```

## 五、实验结果

| 检查项 | 实测结果 |
|---|---|
| 配置十连验证 | 5 行架构 + arm/LITTLE + CUSTOM/KMOD + 两禁 + 密码，全部通过 |
| 源码包下载 | `make source` 全部校验 OK |
| 编译 | 完成无错误（日志 `资料/exp28_build.log`） |
| 产物 | `output/images/rootfs.tar` → `/home/cnu/nfsboot/rfs-buildroot`（NFS 待挂） |

**结论**：buildroot 根文件系统一次成型，实验二十九切 bootargs 即可点火验证。

## 六、问题与心得

1. **menuconfig 的脚本化等价**：buildroot 的配置就是 Kconfig——fragment + `make BR2_DEFCONFIG=... defconfig` 与逐项菜单点选完全等价，且可复现、可进 git。菜单里"先选前三项单选，后面的子项才会出现"的依赖关系，Kconfig 解析器自动处理。
2. **两禁是保命项**：buildroot 默认会去编 mainline 内核/U-Boot——无板级适配（设备树/补丁）必失败。我们的内核（实验二十）与 U-Boot（实验十一）都是自己树的产物，绝不让 buildroot 碰。
3. **外置工具链的三个对账点**：gcc 版本（9.x）、内核头系列（4.20.x，来自 `LINUX_VERSION_CODE 267277`）、C 库（glibc）——与实验十九装的 arm-9.2 工具链一一对应。
4. `make source` 预下载把网络因素从编译中剥离——编译中途卡下载的坑提前填掉。
