---
title: "实验二十四　根文件系统全景——内核之外，系统还需要什么"
date: 2026-11-01
description: "认知篇:内核之外系统还需要什么?init 进程、/etc /dev /lib 各自的角色一次讲清。"
category: "技术"
tags: [嵌入式, 根文件系统, Linux]
series: "嵌入式Linux实验·根文件系统"
draft: false
---

> 开发板：华清远见 FS-MP1A（STM32MP157A）　实验日期：2026-11-02
> **本篇为认知篇，不上板、不编译。唯一准备动作：busybox 与 buildroot 两个源码包就位（见步骤 1），供实验二十五、二十八解压。**

---

## 一、实验目的

1. 建立"根文件系统"的完整概念：内核启动后 `mount root` 挂的就是它——没有它，内核点火只能停在 panic（实验十六/二十三都亲历过）；
2. 记住根文件系统的最小目录集与判据；
3. 认识嵌入式根文件系统的两大搭建路线：busybox（手工骨架）与 buildroot（自动化全套）——本系列两样都做（实验二十五~二十七手工，实验二十八~二十九 buildroot）。

## 二、内容要点

### 1. 根文件系统最小目录集（判据：挂载其他文件系统之前就要能用）

| 目录 | 作用 |
|---|---|
| `/bin`、`/sbin` | 用户/系统命令（busybox 提供） |
| `/dev` | 设备文件（嵌入式方案：busybox 的 **mdev** 自动管理；手工创建如 `mknod /dev/ttySTM0 c 4 64`——主设备号定位驱动、次设备号定位设备） |
| `/etc` | 配置（inittab、fstab、init 脚本） |
| `/lib` | 动态库（C 库——交叉工具链的同族 libc） |

实验二十三的验证清单里 `ls /` 看到的 bin/dev/etc/lib... 就是一套现成的答案（出厂 rootfs）。

### 2. 两条搭建路线

- **busybox 路线**（实验二十五~二十七）：busybox 把常用命令集成一个二进制，手工搭出骨架 + `etc` 配置 + 库文件——每一步都看得见，理解根文件系统的最小构成；
- **buildroot 路线**（实验二十八~二十九）：menuconfig 一条配置生成完整根文件系统（含 busybox、库、init 系统全套），"一条 menuconfig 造完整系统"。

## 三、准备动作（实际执行）

### 1. 源码包就位

课程要求本章目录备有两包，供实验二十五、二十八解压：

| 包 | 用途 | 获取 |
|---|---|---|
| `busybox-1.32.0.tar.bz2` | 实验二十五 busybox 构建 | busybox.net/downloads 官方下载（2.4MB） |
| `buildroot-2020.02.6.tar.bz2` | 实验二十八 buildroot | buildroot.org/downloads 官方下载（~124MB） |

实测：两包均已获取并放置到位（本地 `D:\win_drx\Downloads\` 与虚拟机 `~/share/`），字节数与官方发布一致。

## 四、心得

1. 实验十六与二十三两次 panic（`VFS: Unable to mount root fs`）就是"没有根文件系统"的现场教学——本篇之后，这个缺口开始被填补；
2. mdev 的"主设备号定位驱动、次设备号定位设备"与实验十四的字符设备模型（mmc 的 chardev 234:0）一脉相承；
3. 两条路线的关系：busybox 是"懂原理的搭法"，buildroot 是"工程化的搭法"——前者教学价值高，后者是实际工作流。
