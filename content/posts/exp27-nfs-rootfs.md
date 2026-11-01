---
title: "实验27|NFS 挂载根文件系统——改根不烧卡"
date: 2026-11-01
description: "告别反复烧卡:内核通过 NFS 直接挂载 PC 上的根文件系统,改文件即时生效,开发效率起飞。"
category: "技术"
tags: [嵌入式, 根文件系统, NFS]
series: "嵌入式Linux实验·根文件系统"
draft: false
---

> 开发板：华清远见 FS-MP1A（STM32MP157A）　实验日期：2026-11-02（凌晨）
> **最终状态：自编内核（纯净版 `5.4.31`，已开 uevent helper/SCMI/SMC mailbox）通过 NFS 挂载自建 busybox 根文件系统，启动至 `[root@fsmp1a: /]#`；`mount` 头行 `192.168.0.100:/home/cnu/nfsboot/rfs on / type nfs (rw,vers=2...)`，双核验证通过。"改根不烧卡"达成。**

---

## 一、实验目的

1. 内核开启 uevent helper（修复实验二十六预告的 hotplug 报错）并重编；
2. Ubuntu 搭建 NFS 服务器，把 busybox 根文件系统导出给板子；
3. 板子以 `root=/dev/nfs` 点火，**根文件系统通过网络挂载**——之后改根上的任何文件都无需烧写 SD 卡。

## 二、实验环境

| 项目 | 内容 |
|---|---|
| NFS 服务器 | Ubuntu `192.168.0.100`（nfs-kernel-server，`/home/cnu/nfsboot` 导出，nfsd 版本 `+2 +3 +4`） |
| 内核 | 自编 `5.4.31`（纯净版本串，`.scmversion` 技巧；`CONFIG_UEVENT_HELPER=y`、`CONFIG_ARM_SMC_MBOX=y`、`CONFIG_ARM_SCMI_PROTOCOL=y`、`CONFIG_COMMON_CLK_SCMI=y`、`CONFIG_ROOT_NFS=y`） |
| 根文件系统 | `~/share/rfs-busybox`（实验二十六产物）→ `/home/cnu/nfsboot/rfs` |

## 三、实验原理

`root=/dev/nfs` + `nfsroot=<server>:<dir>` + `ip=<client>:<server>:<gw>:<mask>::eth0:off` 让内核在挂根阶段用自己的 TCP/IP 栈把服务器导出的目录挂为根——根文件系统留在服务器磁盘上，板子每次启动都是"最新版"。板子侧时钟树由 TF-A 的 SCMI 服务提供（SMC 传输），内核需要 `arm-scmi` + `arm-smc-mbox` 驱动才能取到时钟；U-Boot 传给内核的 NFS 根挂载默认走 **NFSv2**，服务器端必须显式使能 v2。

## 四、实验步骤（实际执行）

> Ubuntu 侧命令在虚拟机终端；板子侧在 `STM32MP>` 提示符。原始日志：`资料/serial_exp27_*.log`。

### 1. 内核开启 uevent helper + 版本串去哈希 + 重编

`fragment-99-scmi.config` 追加 `CONFIG_UEVENT_HELPER=y`，合并后确认 `CONFIG_UEVENT_HELPER=y`；随后：

```bash
cp arch/arm/boot/uImage /tmp/uImage-with-hash.bak   # 带哈希版存档
echo "" > .scmversion                               # 版本串去 git 哈希
make -j4 uImage dtbs LOADADDR=0xC2000040
cp arch/arm/boot/uImage /home/cnu/tftpboot/my_uImage
```

实测：`cat include/config/kernel.release` = **`5.4.31`**（纯净）；`CONFIG_ROOT_NFS=y`/`CONFIG_NFS_FS=y` 基线已具备。

### 2. NFS 服务器

```bash
sudo apt install nfs-kernel-server nfs-common
mkdir -p /home/cnu/nfsboot
cp -a /home/cnu/share/rfs-busybox /home/cnu/nfsboot/rfs
```

`/etc/exports` 末尾追加（`no_root_squash` 不能漏，漏了远程 root 被压权）：

```
/home/cnu/nfsboot  *(rw,sync,no_root_squash,no_subtree_check)
```

`/etc/default/nfs-kernel-server` 追加（U-Boot/内核的 NFS root 客户端走 **v2**，Ubuntu 20.04 默认禁用 v2，必须显式使能）：

```
RPCNFSDOPTS="--nfs-version 2,3,4 --debug --syslog"
```

重启服务后核验：`cat /proc/fs/nfsd/versions` = **`+2 +3 +4 +4.1 +4.2`**；本机 `mount -t nfs -o vers=2 localhost:/home/cnu/nfsboot/rfs /mnt` 挂载测试通过。

### 3. 板子侧：网络复核 + NFS bootargs + 点火

```bash
print ipaddr netmask serverip ethaddr    # 四项复核（实验十二/十三就位）
ping 192.168.0.100                       # host 192.168.0.100 is alive
setenv bootargs 'console=ttySTM0,115200 root=/dev/nfs nfsroot=192.168.0.100:/home/cnu/nfsboot/rfs,proto=tcp rw ip=192.168.0.8:192.168.0.100:192.168.0.1:255.255.255.0::eth0:off'
saveenv
tftp c2000000 my_uImage                  # Bytes transferred = 9396800
tftp c4000000 stm32mp157a-fsmp1a.dtb     # Bytes transferred = 63890
bootm c2000000 - c4000000
```

实测启动日志关键行：

```
[    1.202231] arm-scmi firmware:scmi-0: SCMI Protocol v2.0 'ST:' Firmware version 0x0
[    2.581815] printk: console [ttySTM0] enabled
[    2.967650] mmcblk1: mmc1:0001 004GA0 3.69 GiB
[    8.080242] eth0: Link is Up - 1Gbps/Full - flow control rx/tx
[    8.138412] IP-Config: Complete:  device=eth0, ipaddr=192.168.0.8, bootserver=192.168.0.100
[    8.176927] VFS: Mounted root (nfs filesystem) on device 0:15.
[    8.218778] Run /sbin/init as init process
Please press Enter to activate this console.
```

### 4. 进入控制台并验收

回车后进入 `[root@fsmp1a: /]#`：

```bash
ls /                                  # bin dev etc lib linuxrc mnt proc root sbin sys tmp usr var（十三样）
mount | head -2                       # 192.168.0.100:/home/cnu/nfsboot/rfs on / type nfs (rw,vers=2,...)
uname -a                              # Linux ... 5.4.31 #8 SMP ...（纯净版本串）
grep -c processor /proc/cpuinfo       # 2
```

## 五、实验结果

| 检查项 | 实测结果 |
|---|---|
| uevent helper | `CONFIG_UEVENT_HELPER=y`，重编后 rcS 的 hotplug 写入不再报错 |
| 版本串 | `5.4.31`（纯净，`.scmversion`） |
| NFS 服务 | nfsd `+2 +3 +4`，exports 生效，本机 v2 挂载测试通过 |
| 板子网络 | IP-Config Complete（ipaddr=.8 / bootserver=.100） |
| NFS 根挂载 | `VFS: Mounted root (nfs filesystem) on device 0:15.`（**vers=2**） |
| init | `Run /sbin/init as init process` → 控制台激活 |
| 根目录 | 十三样齐全（busybox 骨架 + etc 四件套生效） |
| 提示符 | `[root@fsmp1a: /]#` |

**结论**：根文件系统完整走通网络——从此改根上文件无需烧卡，实验二十八的 buildroot 产物也可以走同一条路。

## 六、问题与心得

1. **三连坑依次排掉**：① `CONFIG_UEVENT_HELPER` 未开 → hotplug 写入报错（实验二十六已预告）；② 内核缺 `ARM_SMC_MBOX`/SCMI 栈 → 时钟树挂不上、**全部外设探测无限延迟、内核"哑巴运行"**（实验二十三深夜排障的主战场）；③ 服务器端 NFSv2 默认禁用 → 板子挂根静默失败。三关全过，NFS 根一气呵成。
2. **"哑巴运行"的判别法**：内核是否还活着，看 IWDG2 的 32 秒复位节律与 `IP-Config: Complete` 这样的关键行；earlycon（给串口驱动补 `OF_EARLYCON_DECLARE`）是透视哑巴内核的标准手段。
3. **RPCNFSDOPTS 的引号陷阱**：`/etc/default/nfs-kernel-server` 里的行要用 `RPCNFSDOPTS="--nfs-version 2,3,4"` 的完整引号形式；写坏一个引号，`/proc/fs/nfsd/versions` 里就少 `+2`。
4. **`ip=` 七字段冒号数不能错**：client:server:gw:netmask:host:device:autoconf——本板 host 字段被内核用作 hostname（`uname` 显示 `192.168.0.8` 的原因），要改主机名改这个字段。
5. **`.scmversion` 技巧**：内核根目录放一个空的 `.scmversion` 文件，版本串就去掉 git 哈希后缀——模块版本对账（第 7 章 insmod）从此以纯净 `5.4.31` 为准。
6. **改根不烧卡的日常**：NFS 根下 `rm`/`cp` 直接生效，重启即见——第 6 章的驱动模块、第 7 章的应用全都走这条流水线。
