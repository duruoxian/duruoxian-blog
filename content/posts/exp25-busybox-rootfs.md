---
title: "实验25|busybox 构建根文件系统——骨架一次成型"
date: 2026-11-01
description: "用 busybox 构建最小根文件系统:编译、安装、目录骨架一次成型。"
category: "技术"
tags: [嵌入式, 根文件系统, busybox]
series: "嵌入式Linux实验·根文件系统"
draft: false
---

> 开发板：华清远见 FS-MP1A（STM32MP157A）　实验日期：2026-11-02
> **最终状态：busybox-1.32.0 交叉编译成功（`Final link with: m resolv`），安装出 `rfs-busybox` 四样骨架（bin/linuxrc/sbin/usr），glibc 库 39 项就位，`readelf` 对账三条 NEEDED 全部满足。**

---

## 一、实验目的

1. 交叉编译 busybox，理解"一个二进制集成所有命令"的原理（符号连接方案）；
2. 用 `make install CONFIG_PREFIX=` 生成根文件系统骨架（bin/sbin/usr/linuxrc）；
3. 定位并拷贝交叉工具链的 glibc 动态库，用 `readelf` 对账 busybox 的库依赖。

## 二、实验环境

| 项目 | 内容 |
|---|---|
| 源码 | `busybox-1.32.0.tar.bz2`（2439463B，busybox.net 官方） |
| 工具链 | arm-none-linux-gnueabihf-（实验十九就位），glibc 2.30（libc/lib 随包） |
| 产物目录 | `~/share/rfs-busybox/` |

## 三、实验原理

busybox 把 ls/cd/insmod 等上百个命令集成为一个二进制，安装时在 bin/sbin 下铺满**指向 busybox 本体的符号连接**（`ls -> busybox`）——体积省、行为统一。本篇编译的是**动态链接版**（静态编译会让 DNS 域名解析失灵，见配置①），因此还需要把交叉工具链的 glibc 库一并拷进 lib，并用 `readelf` 对账 busybox 的 NEEDED 依赖。

## 四、实验步骤（实际执行）

> 全部在 Ubuntu 终端。menuconfig 的四处配置以"defconfig + 定向符号修改 + oldconfig"脚本化等价执行，效果与课程菜单逐项勾选一致。

### 1. 工具链自检与解压

```bash
source /stm32env
arm-none-linux-gnueabihf-gcc        # 报"没有输入文件"=正常
cd ~/share
tar xf busybox-1.32.0.tar.bz2
cd busybox-1.32.0
```

### 2. 顶层 Makefile 指定交叉前缀

`CROSS_COMPILE ?=` 行（约 164 行，认准不带 # 的那行）改为：

```makefile
CROSS_COMPILE ?= arm-none-linux-gnueabihf-
```

实测：`grep -n "^CROSS_COMPILE ?= arm-none" Makefile` 打出该行。（**别用 SDK 那套 `arm-ostl-linux-gnueabi-`**——缺库编不了。）

### 3. menuconfig 四处配置

`make menuconfig` 下的操作与脚本化等价：

| # | 菜单操作 | 脚本化符号 | 状态 |
|---|---|---|---|
| ① | Settings → Build static binary (no shared libs) | `CONFIG_STATIC` | **保持不选**（静态版 DNS 失灵） |
| ② | Linux Module Utilities → Simplified modutils | `CONFIG_FEATURE_SH_STANDALONE`等 | 保持不选 |
| ③ | Linux Module Utilities → **depmod** | `CONFIG_DEPMOD=y` | 选中 |
| ④ | Linux System Utilities → **mdev** 及其子项 | `CONFIG_MDEV=y` + `FEATURE_MDEV_*` | 全选 |

实测验证：`grep -c "CONFIG_STATIC=y" .config` = **0**；`grep` 打出 `CONFIG_DEPMOD=y`、`CONFIG_MDEV=y`。

### 4. 编译与安装

```bash
make -j4
make install CONFIG_PREFIX=../rfs-busybox
```

实测：编译收尾打出 **`Final link with: m resolv`**（成功标志）；安装收尾的 setuid 三行横幅是固定提醒（非报错）。`ls ../rfs-busybox` = **bin、linuxrc、sbin、usr 四样**；`bin/ls -> busybox` 符号连接；`sbin` 里有 depmod、insmod、modprobe。

### 5. 拷贝 glibc 库

```bash
cd /usr/local/arm/gcc-arm-9.2-2019.12-x86_64-arm-none-linux-gnueabihf
find -name "ld-linux*.so*"        # ./arm-none-linux-gnueabihf/libc/lib/ld-linux-armhf.so.3
mkdir -p ~/share/rfs-busybox/lib
cp arm-none-linux-gnueabihf/libc/lib/*.so* ~/share/rfs-busybox/lib/ -d
```

实测：lib 下 39 项；`ld-linux-armhf.so.3`（连接）+ `ld-2.30.so`（实体）俱在。

### 6. readelf 对账依赖

```bash
arm-none-linux-gnueabihf-readelf ~/share/rfs-busybox/bin/busybox -a | grep "Shared"
```

实测三条 NEEDED：`libm.so.6`、`libresolv.so.2`、`libc.so.6`——全部能在上一步的 lib 里找到。

## 五、实验结果

| 检查项 | 实测结果 |
|---|---|
| 静态编译 | `CONFIG_STATIC=y` 出现 0 次（动态链接 ✓） |
| depmod/mdev | 两者 `=y` |
| 编译收尾 | `Final link with: m resolv` |
| 骨架 | bin / linuxrc / sbin / usr 四样 |
| 符号连接 | `bin/ls -> busybox` |
| lib | 39 项（含 ld-linux-armhf.so.3 + ld-2.30.so） |
| NEEDED 对账 | libm.so.6 / libresolv.so.2 / libc.so.6 全部满足 |

**结论**：根文件系统骨架成型，库依赖闭环。etc/dev 等"灵魂"目录在实验二十六补齐。

## 六、问题与心得

1. **静态编译的取舍**：静态版单文件好部署，但 glibc 的 NSS/DNS 在静态下失灵——本系列选动态版，代价是多拷一份 lib（39 项）。
2. **符号连接方案**：`ls -> busybox` 这类连接让"一个二进制装下所有命令"，_busybox 通过 argv[0] 分辨该扮演谁_——这也是它叫"瑞士军刀"的原因。
3. **`-d` 参数不能丢**：`cp *.so* -d` 保留符号连接；丢了它，`libc.so.6` 会被展开成实体（几 MB），lib 瞬间大出几倍。
4. **库依赖对账**：`readelf -a` 的 NEEDED 列表是"这个二进制需要哪些库"的官方答案——嵌入式排障（板上报 `not found`）第一步就是对这张表。
