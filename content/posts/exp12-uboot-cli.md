---
title: "实验十二　U-Boot 命令行与环境变量操作"
date: 2026-11-01
description: "U-Boot shell 初体验:printenv/setenv/saveenv 全套环境变量操作,bootdelay 调速,掉电对照实验搞清变量到底存在哪。"
category: "技术"
tags: [嵌入式, U-Boot, 命令行]
series: "嵌入式Linux实验·U-Boot使用"
draft: false
---

> 开发板：华清远见 FS-MP1A（STM32MP157A）　实验日期：2026-11-01
> **最终状态：全部完成（trusted 版 `U-Boot 2020.01-stm32mp-r1-g392260b4` 上运行）。`bootdelay` 已放宽到 5s 并存盘；`author`/`testvar` 新增、删除、掉电对照全部符合预期；网络三件套（ipaddr/netmask/ethaddr）已重新写入并保存。**

---

## 一、实验目的

1. 熟悉 U-Boot 命令行的使用方式：拦停 autoboot、帮助系统（`help` / `? cmd`）、三条信息查询命令（`bdinfo` / `print` / `version`）；
2. 掌握环境变量的增、删、改、查（`setenv` / `printenv`）与持久化（`saveenv`），理解"RAM 中的变量"与"掉电保存的变量"的区别；
3. 通过掉电对照实验，验证"不 `saveenv` 的改动重启即失"；
4. 恢复并固化后续实验（TFTP/网络）所需的网络三件套 `ipaddr` / `netmask` / `ethaddr`。

## 二、实验环境

| 项目 | 内容 |
|---|---|
| 虚拟机 | VMware + Ubuntu 20.04（`192.168.56.103`，用户 cnu） |
| 开发板 | FS-MP1A（STM32MP157A），trusted 版 U-Boot `g392260b4`（2026-11-01 重做版，见实验十一报告） |
| 串口 | 板载 ST-Link 虚拟串口（COM3），115200 8N1 |
| 启动介质 | SD 卡（拨码 101），实验十一烧写的镜像 |

## 三、实验原理

U-Boot 启动后维护一套环境变量：开机时从存储介质（本板为 SD 卡上的冗余环境区）读入 RAM，此后所有 `setenv` 只改 RAM 副本；`saveenv` 才把整份环境写回存储介质。因此"改了但没 save"的变量复位即失，"save 过"的变量跨掉电保留。`ethaddr` 这类 write-once 变量在运行期不允许覆盖，只能先删除（赋空值）再设置。环境区采用**双副本冗余**机制，两次 `saveenv` 交替写入主/备副本，防止写过程中掉电导致环境全毁。

## 四、实验步骤（实际执行）

> 本篇全部命令在板子串口（`STM32MP>` 提示符）执行。完整原始日志见 `资料/serial_exp12_commands.log`。
> 背景：2026-11-01 重做实验十一时环境变量曾 `env default -a` 恢复默认（见实验十一报告"重做记录"），因此本篇开头 `bootdelay` 为默认 1s、网络三件套不存在——这正好让本篇的"新增 + 保存"每一步都有清晰的前后对照。

### 1. 拦停 autoboot，把 `bootdelay` 放宽到 5s 并保存

上电后在倒计时内按 Enter 拦停（日志里记录为 `Hit any key to stop autoboot: 5 <INTERRUPT>`），然后：

```bash
setenv bootdelay 5
saveenv
```

实测：`saveenv` 回显 `Saving Environment to MMC... Writing to MMC(0)... OK`。

### 2. 复位验证倒计时窗口，复核变量值

```bash
reset
```

复位后在新一轮 5s 倒计时内再次按 Enter 拦停（`Hit any key to stop autoboot:  5 <INTERRUPT>`），复核：

```bash
print bootdelay
```

实测输出 `bootdelay=5`。注意：串口日志里倒计时行有时恒显示 0，不能拿它当判据，认 `print bootdelay` 的回显。

### 3. 帮助系统

```bash
help
? printenv
```

实测：`help` 列出全部命令（bootm、bootz、bdinfo、printenv、setenv、saveenv、mmc、tftpboot、crc32、reset 等百余条，每行一条带一句话说明）；`? printenv` 打出两条用法：

```
printenv [-a]
    - print values of all environment variables
printenv name ...
    - print value of environment variable 'name'
```

### 4. 三条信息查询命令

```bash
bdinfo
version
print
```

实测要点：

- `bdinfo`：`DRAM bank -> start = 0xc0000000`、`-> size = 0x20000000`（512 MB）、`baudrate = 115200 bps`、`relocaddr = 0xd9f39000`、`fdt_blob = 0xd7ded800`；
- `version`：`U-Boot 2020.01-stm32mp-r1-g392260b4 (Nov 01 2026 - 18:37:09 +0800)`，交叉编译器 `arm-ostl-linux-gnueabi-gcc (GCC) 9.3.0`——正是实验十一重做版的产物标识；
- `print`：整套环境 5537/8187 字节，可见 ST 出厂默认的 `serverip=192.168.1.1`（下一篇 TFTP 实验前必须改）、`bootcmd=run bootcmd_stm32mp`、`boot_targets=mmc1 ubifs0 mmc0 mmc2 pxe`、`serial#=002E003A...` 等。

### 5. 新增环境变量（值含空格整体加引号）

```bash
setenv author 'console=ttySTM0,115200 root=/dev/mmcblk2p2 rootwait rw'
saveenv
print author
```

实测：`setenv` 无回显（正常）；`saveenv` 回显 `Writing to MMC(0)... OK`；`print author` 原样打回：

```
author=console=ttySTM0,115200 root=/dev/mmcblk2p2 rootwait rw
```

### 6. 删除环境变量（赋空值即删除）

```bash
setenv author
saveenv
```

实测：`saveenv` 这次回显 `Writing to redundant MMC(0)... OK`——冗余机制在起作用，两次保存写的是主/备两个副本。

### 7. 掉电对照实验：不 save 的改动重启即失

先造一个**故意不保存**的变量：

```bash
setenv testvar hello
print testvar          # 实测：testvar=hello
reset                  # 复位（testvar 未 saveenv）
```

复位后在 5s 倒计时内拦停，查三个变量的状态：

```bash
print testvar          # ## Error: "testvar" not defined   ← 没保存，重启即失
print author           # ## Error: "author" not defined    ← 删除动作已存盘
print bootdelay        # bootdelay=5                       ← 保存过的修改幸存
```

三个结果与理论完全一致。

### 8. 网络三件套：恢复、保存、复核

`env default -a` 之后 `ipaddr/netmask/ethaddr` 均不存在（实测三条 `print` 全部 `## Error: "xxx" not defined`；且恢复默认后的那次启动日志里出现 `Error: ethernet@5800a000 address not set. / No ethernet found.`——没有 MAC 就没有网络）。按实验九沿用的取值重新写入并保存：

```bash
setenv ipaddr 192.168.0.8
setenv netmask 255.255.255.0
setenv ethaddr 1A:1F:DB:0E:69:FD
saveenv
print ipaddr netmask ethaddr
```

实测三行原样回显：`ipaddr=192.168.0.8`、`netmask=255.255.255.0`、`ethaddr=1A:1F:DB:0E:69:FD`。`env default` 后 `ethaddr` 可重新设置（write-once 只限制运行期覆盖，不限制删除后重设）。

## 五、实验结果

| 检查项 | 实测结果 |
|---|---|
| 拦停 autoboot | `Hit any key to stop autoboot: 5 <INTERRUPT>`，两次复位均成功拦停 |
| `bootdelay` 放宽 + 保存 | `print bootdelay` = `5`，掉电后仍为 5 |
| `help` / `? printenv` | 全命令清单 + 用法两行，符合预期 |
| `bdinfo` | DRAM `0xc0000000 / 0x20000000`（512MB）、`baudrate=115200` |
| `version` | `g392260b4 (Nov 01 2026 - 18:37:09 +0800)` + GCC 9.3.0 |
| 新增 `author` 并保存 | `print author` 原样回显，`Writing to MMC(0)... OK` |
| 删除 `author` 并保存 | 复位后 `## Error: "author" not defined` |
| `testvar` 不保存 | 复位后 `## Error: "testvar" not defined` |
| 网络三件套 | 重新写入后三行原样回显并已 `saveenv` |

**结论**：环境变量的增删改查、持久化机制、掉电对照全部符合预期，网络三件套已就位，可进入网络实验。

## 六、问题与心得

1. **RAM 副本 vs 掉电副本**：`setenv` 只改 RAM，`saveenv` 才落卡。本次 `testvar`（未保存，失）与 `bootdelay`（已保存，存）构成一组天然对照。
2. **冗余环境不是玄学**：两次 `saveenv` 一次写 `MMC(0)`、一次写 `redundant MMC(0)`——双副本交替写，任一副本损坏都能回退。
3. **`ethaddr` 的 write-once**：运行期 `setenv ethaddr` 会报 `Can't overwrite "ethaddr"`；要改必须先赋空删除。`env default -a` 之后它随整套环境一起消失，可以重新设置。
4. **长输出后立刻敲命令，开头字符会被吞**：`print` 这种几百行的命令输出期间，串口输入缓冲基本不收字符——本篇自动化时就出现了命令被截成 `setenv author 'co`、引号没闭合导致板子进入 `>` 续行模式的现场。人工操作同理：**看到 `STM32MP>` 提示符回来了再输入下一条**。
5. `env default -a` 不是"回到出厂"那么简单：它连网络三件套一起清掉，下次上电日志里会多出 `No ethernet found.`——遇到这个报错先想想环境是不是被恢复过默认。
