---
title: "实验04|SD 卡分区烧写与首次启动"
date: 2026-10-04
description: "SD/TF 卡分区、dd 烧写、拨码开关启动模式:吃透 FS-MP1A 从 TF-A 到 U-Boot 的启动链路和串口输出读法。"
category: "技术"
tags: [嵌入式, U-Boot, Linux]
series: "嵌入式Linux实验·U-Boot移植"
draft: false
---

> 开发板：华清远见 FS-MP1A（STM32MP157A）
> 实验平台：VMware + Ubuntu 20.04（`192.168.56.103`，用户 `cnu`）
> 实验日期：2026-10-04

---

## 一、实验目的

1. 给 SD 卡建立 **GPT 分区表（5 个分区）**：fsbl1 / fsbl2 / ssbl / bootfs / rootfs——STM32MP1 的 ROM Code **按分区名**在 GPT 里找 FSBL；
2. 把实验三编译的 `u-boot-spl.stm32`（FSBL）和 `u-boot.img`（SSBL）按扇区**原样烧写**进对应分区；
3. 拨动拨码开关（101 = SD 卡启动），从 SD 卡启动自己编译的 U-Boot；
4. 预期结果：**启动失败并复位循环**（设备树还是 DK1 模板，描述了板上不存在的 STPMIC1 电源芯片）——能稳定失败在电源报错，恰恰证明编译、烧写、启动链条全部正确；修复留给实验五（F-1）。

## 二、实验环境

| 项目 | 内容 |
|---|---|
| 烧写镜像 | 实验三产物：`u-boot-spl.stm32`（101016 B）+ `u-boot.img`（867409 B），存于虚拟机 `~/share/exp3-uboot/` |
| SD 卡 + 读卡器 | USB 读卡器接入虚拟机（VMware「可移动设备」） |
| 串口 | 板载 ST-Link 虚拟串口（Windows COM 口），115200、8-N-1 |
| 工具 | `sgdisk`（gdisk 包）、`parted`（系统自带） |

## 三、实验步骤（实际执行）

### 1. 装 gdisk、确认产物

```bash
sudo apt install gdisk && sgdisk --version   # 实测 1.0.5-1
ls -la ~/share/exp3-uboot/
# u-boot.img 867409 字节 / u-boot-spl.stm32 101016 字节
```

本实验全程不编译，不需要激活工具链（dd 是宿主机操作）。

### 2. 摸清现有磁盘（基线）

```bash
ls /dev/sd*
# /dev/sda  /dev/sda1  /dev/sda2  /dev/sda5   ← 只有虚拟机系统盘
```

**基线实测**：只有 `/dev/sda`（100G VMware_Virtual_S 系统盘）。之后新增的必是 SD 卡。

### 3. 读卡器接入虚拟机，再认一遍设备

开发板断电 → 卡槽取卡（按压弹出式）→ 卡插读卡器 → VMware「可移动设备」连接到虚拟机 → 对比基线 + 容量双重确认：

```bash
ls /dev/sd*
lsblk -d -o NAME,SIZE,MODEL
```

**实测**：

```bash
$ ls /dev/sd*
/dev/sda  /dev/sda1  /dev/sda2  /dev/sda5  /dev/sdb  /dev/sdb1  /dev/sdb2  /dev/sdb3  /dev/sdb4  /dev/sdb5
$ lsblk -d -o NAME,SIZE,MODEL,TRAN
NAME    SIZE  MODEL                          TRAN
sda     100G  VMware_Virtual_S               spi
sdb     29.8G Storage_Device                 usb
sr0     1024M VMware_Virtual_SATA_CDRW_Drive sata
```

与基线对比新增 `/dev/sdb` 及其 5 个分区（传承卡上前人留下的），`lsblk` 确认 sdb 为 **29.8G 的 Storage_Device（USB）**，容量、型号、总线与系统盘 sda（100G VMware spi）完全不同——设备号锁定为 **/dev/sdb**。

### 4. 删除原有分区

先只读查看旧表，再清场：

```bash
sudo sgdisk -p /dev/sdb                  # 只读查看
sudo parted -s /dev/sdb mklabel msdos    # 写空 MBR 标签
sudo sgdisk -p /dev/sdb                  # 复查
sudo sgdisk -Z /dev/sdb                  # 彻底清场（GPT+MBR 一起摧毁）
sudo partprobe /dev/sdb                  # 内核刷新分区视图
ls /dev/sd*                              # sdb1~sdb5 消失，只剩 sdb
```

> 实测教训（原文同款）：`parted mklabel msdos` 只写空 MBR，**不清旧 GPT**——复查时分区表原样还在（连 GUID 都不变）。必须 `sgdisk -Z` 彻底清，再 `partprobe` 后分区节点才真正消失。

**实测**（清场全过程）：

```
=== 旧分区表（清场前 sgdisk -p 只读查看）===
Disk /dev/sdb: 62357504 sectors, 29.7 GiB
Model: Storage Device
Disk identifier (GUID): 61F659B8-5B3A-48F2-86DF-6BCBC906CBA2
Number  Start (sector)    End (sector)  Size       Code  Name
   1              34             545   256.0 KiB   8300  fsbl1
   2             546            1057   256.0 KiB   8300  fsbl2
   3            1058            5153   2.0 MiB     8300  ssbl
   4            5154          136225   64.0 MiB    8300  bootfs
   5          136226        62357470   29.7 GiB    8300  rootfs

=== 1) parted -s /dev/sdb mklabel msdos ===
（执行成功，一行输出都没有，直接回到提示符——-s 脚本模式成功即静默）

=== 2) sgdisk -Z 彻底清场 ===
Found invalid GPT and valid MBR; converting MBR to GPT format in memory.
GPT data structures destroyed! You may now partition the disk using fdisk or other utilities.

=== 3) partprobe 后确认分区节点已消失 ===
$ ls /dev/sd*
/dev/sda  /dev/sda1  /dev/sda2  /dev/sda5  /dev/sdb     ← sdb1~sdb5 消失，只剩整盘
```

### 5. 重新分区（GPT 5 分区）

```bash
sudo sgdisk --resize-table=128 -a 1 \
  -n 1:34:545    -c 1:fsbl1 \
  -n 2:546:1057  -c 2:fsbl2 \
  -n 3:1058:5153 -c 3:ssbl \
  -n 4:5154:136225 -c 4:bootfs \
  -n 5:136226    -c 5:rootfs \
  -A 4:set:2 -p /dev/sdb -g
```

**实测**（重建分区，命令末尾自动打印分区表）：

```
$ sudo sgdisk --resize-table=128 -a 1 -n 1:34:545 -c 1:fsbl1 -n 2:546:1057 -c 2:fsbl2 \
  -n 3:1058:5153 -c 3:ssbl -n 4:5154:136225 -c 4:bootfs -n 5:136226 -c 5:rootfs \
  -A 4:set:2 -p /dev/sdb -g
Creating new GPT entries in memory.
Setting name!
partNum is 0
Setting name!
partNum is 1
Setting name!
partNum is 2
Setting name!
partNum is 3
Setting name!
partNum is 4
Disk /dev/sdb: 62357504 sectors, 29.7 GiB
Model: Storage Device
Sector size (logical/physical): 512/512 bytes
Disk identifier (GUID): FB2690B5-F85E-452C-BDB8-EDAA74190149
Partition table holds up to 128 entries
Main partition table begins at sector 2 and ends at sector 33
First usable sector is 34, last usable sector is 62357470
Partitions will be aligned on 1-sector boundaries
Total free space is 0 sectors (0 bytes)

Number  Start (sector)    End (sector)  Size       Code  Name
   1              34             545   256.0 KiB   8300  fsbl1
   2             546            1057   256.0 KiB   8300  fsbl2
   3            1058            5153   2.0 MiB     8300  ssbl
   4            5154          136225   64.0 MiB    8300  bootfs
   5          136226        62357470   29.7 GiB    8300  rootfs
The operation has completed successfully.

$ ls /dev/sd*
/dev/sda  /dev/sda1  /dev/sda2  /dev/sda5  /dev/sdb  /dev/sdb1  /dev/sdb2  /dev/sdb3  /dev/sdb4  /dev/sdb5
```

5 个分区、名字 fsbl1 / fsbl2 / ssbl / bootfs / rootfs 一字不差，扇区范围与原文一致（`partNum is N` 是逐个命名的过程输出，末行即成功标志）。

### 6. dd 烧写三条

```bash
sudo dd if=u-boot-spl.stm32 of=/dev/sdb1 conv=fdatasync   # fsbl1
sudo dd if=u-boot-spl.stm32 of=/dev/sdb2 conv=fdatasync   # fsbl2（备份）
sudo dd if=u-boot.img     of=/dev/sdb3 conv=fdatasync     # ssbl
```

- SPL 烧两份：ROM Code 先加载 fsbl1，校验失败自动试 fsbl2（双备份）；
- `conv=fdatasync`：确保真正落盘；
- dd 到**分区**而非拷文件：分区里没有文件系统，ROM Code 按扇区裸读。

**实测**（三条 dd 全部成功 + 按镜像字节数回读校验）：

```bash
$ sudo dd if=u-boot-spl.stm32 of=/dev/sdb1 conv=fdatasync
197+1 records in
197+1 records out
101016 bytes (101 kB, 99 KiB) copied, 0.0599457 s, 1.7 MB/s
$ sudo dd if=u-boot-spl.stm32 of=/dev/sdb2 conv=fdatasync
197+1 records in
197+1 records out
101016 bytes (101 kB, 99 KiB) copied, 0.0863523 s, 1.2 MB/s
$ sudo dd if=u-boot.img of=/dev/sdb3 conv=fdatasync
1694+1 records in
1694+1 records out
867409 bytes (867 kB, 847 KiB) copied, 0.544008 s, 1.6 MB/s
```

**回读校验**（从卡里按镜像大小读回，与源镜像比对 md5）：

```
$ sudo dd if=/dev/sdb1 bs=101016 count=1 | md5sum
4cf4d83001747799497c9bd6143f8d93   ← 与 u-boot-spl.stm32 的 md5 完全一致 ✓
$ sudo dd if=/dev/sdb3 bs=867409 count=1 | md5sum
81d22def60a32afe7ccf8cc6e1074ce9   ← 与 u-boot.img 的 md5 完全一致 ✓
```

三条 dd 写入字节数与两个镜像大小一一对应，回读 md5 与源镜像一致——烧写内容逐字节正确。

### 7. 串口就位 + 上电

1. 读卡器断开归还 Windows → 卡插回开发板（断电状态）；
2. 拨码开关置 **101**（BOOT2=ON、BOOT1=OFF、BOOT0=ON，SD 卡启动）；
3. 串口监听就位（115200）→ 上电。

**实测串口日志**（COM 口 115200 实抓，共 30563 字节、完整循环 **85 轮**，以下转录前两轮，全程原样重复）：

```
U-Boot SPL 2020.01-stm32mp-r1-g25934cab (Oct 04 2026 - 19:40:28 +0800)
Model: STMicroelectronics STM32MP157A-DK1 Discovery Board
stpmic1_read: failed to read register x : 32board_init_f: probe failed clk=0 reset=0 pinctrl=0 power=-110
RAM: DDR3-DDR3L 16bits 533000Khz
stpmic1_read: failed to read register x : 39ddr power init failed

resetting ...

U-Boot SPL 2020.01-stm32mp-r1-g25934cab (Oct 04 2026 - 19:40:28 +0800)
Model: STMicroelectronics STM32MP157A-DK1 Discovery Board
stpmic1_read: failed to read register x : 32board_init_f: probe failed clk=0 reset=0 pinctrl=0 power=-110
RAM: DDR3-DDR3L 16bits 533000Khz
stpmic1_read: failed to read register x : 39ddr power init failed

resetting ...
（如此往复，共 85 轮）
```

> 说明两点：① `register x : 32` 与 `board_init_f:` 挤在同一行、`39` 与 `ddr power init failed` 挤在同一行，是 SPL 个别日志缺换行的原样输出，不是转写错误；② 版本串里的 **`g25934cab`（实验三的 git 提交号）与编译时间戳 `Oct 04 2026 - 19:40:28`（实验三的编译时间）** 双重证明板上跑的正是我们自己编译、刚刚烧写的镜像，而不是出厂固件（出厂固件由 TF-A 引导，开头是 `NOTICE: BL2`）。完整日志存档：`实验报告/资料/serial_exp4_reset_loop.log`。

## 四、实验结果（判读）

| 看到什么 | 说明什么 |
|---|---|
| `U-Boot SPL 2020.01-stm32mp-r1` + **自己的编译时间戳** | ROM Code → SPL 链条通了，跑的是我们实验三的镜像（出厂固件是 TF-A 引导，开头是 `NOTICE: BL2`） |
| `RAM: DDR3-DDR3L 16bits 533000Khz` | DDR 硬件与配置正常 |
| `stpmic1_read: failed ...` / `ddr power init failed` → `resetting ...` 循环 | **预期失败点**：SPL 按设备树找 DK1 的电源芯片 STPMIC1（I2C4 总线），FS-MP1A 是分立电源、没有这颗芯片，读寄存器超时后复位 |

## 五、注意事项

1. **设备号是生死线**：两次 `ls /dev/sd*` + `lsblk` 容量对照，`parted`/`sgdisk`/`dd of=` 指错盘会毁掉磁盘；
2. 读卡器转交虚拟机后 Windows 看不到卡，dd 完成前不要拔；
3. 插拔 SD 卡都在开发板断电状态进行；
4. **复位循环不是故障**；真正要警惕的是"串口毫无输出"（回查：卡插好没、拨码 101 没、串口设备对没）；
5. 分区只做一次，后续实验只重复第 6 步的三条 dd。
