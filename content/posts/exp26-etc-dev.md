---
title: "实验二十六　构建 etc 与 dev 目录——给骨架装上\"灵魂\""
date: 2026-11-01
description: "inittab、passwd、group 与设备节点:让 init 真正跑起来的最小配置集合。"
category: "技术"
tags: [嵌入式, 根文件系统, Linux]
series: "嵌入式Linux实验·根文件系统"
draft: false
---

> 开发板：华清远见 FS-MP1A（STM32MP157A）　实验日期：2026-11-02
> **最终状态：`etc` 四件套（inittab / init.d/rcS / fstab / profile）+ `dev` 空目录（mdev 方案）+ 七个空目录全部就位，顶层十三样齐全；内核侧 SYSFS/TMPFS/DEVTMPFS 确认已开，`CONFIG_UEVENT_HELPER` 未开（课程预告的坑，实验二十七步骤 1 修复）。**

---

## 一、实验目的

1. 给实验二十五的骨架写上 init 三件套（inittab / rcS / fstab）与用户环境（profile）——让 busybox 的 init 知道"开机干什么"；
2. 用 mdev 方案解决 /dev 设备文件管理（对照 mdev.txt 官方七步流程）；
3. 补齐挂载点空目录，凑齐根文件系统的完整骨架。

## 二、实验环境

| 项目 | 内容 |
|---|---|
| 产物目录 | `~/share/rfs-busybox/`（实验二十五：bin/linuxrc/sbin/usr + lib 39 项） |
| 内核侧前提 | `CONFIG_SYSFS=y`、`CONFIG_TMPFS=y`、`CONFIG_DEVTMPFS=y`（multi_v7 基线自带，已查证）；`CONFIG_UEVENT_HELPER` 未开（已知，修复见实验二十七） |

## 三、实验原理

busybox 的 `init` 读 `/etc/inittab` 决定启动序列：`::sysinit:/etc/init.d/rcS` 指定开机脚本，`::askfirst:-/bin/sh` 在控制台开交互 shell。rcS 是 mdev.txt 官方七步流程的落地版：挂 tmpfs 到 /dev（可写）、devpts、proc、sysfs，设置热插拔代理（`/proc/sys/kernel/hotplug` 指向 mdev），最后 `mdev -s` 扫描 sysfs 生成全部设备文件。fstab 供 rcS 的 `mount -a` 使用；profile 是登录 shell 的环境脚本（PS1/PATH/LD_LIBRARY_PATH）。

## 四、实验步骤（实际执行）

> 全部在 `~/share/rfs-busybox/` 内执行。

### 1. 自检骨架

`ls` = bin/linuxrc/sbin/usr 四样；`ls lib | wc -l` = 39。

### 2. `/etc/inittab`（`::askfirst:-/bin/sh` 的前导减号不能丢——它表示"提供交互 shell"）

```
# /etc/inittab
#this is run first except when booting in single-user mode.
::sysinit:/etc/init.d/rcS
# /bin/sh invocations on selected ttys
# start an "askfirst" shell on the console (whatever that may be)
::askfirst:-/bin/sh
# stuff to do when restarting the init process
::restart:/sbin/init
# stuff to do before rebooting
::ctrlaltdel:/sbin/reboot
::shutdown:/bin/umount -a -r
::shutdown:/sbin/swapoff -a
```

### 3. `/etc/init.d/rcS`（mdev 七步落地版，chmod +x）

```sh
#!/bin/sh
# This is the first script called by init process
/bin/mount -a
# use mdev
mount -t tmpfs -o size=64k,mode=0755 tmpfs /dev
mkdir /dev/pts
mount -t devpts devpts /dev/pts
mount -t proc proc /proc
mount -t sysfs sysfs /sys
echo /sbin/mdev > /proc/sys/kernel/hotplug
mdev -s
```

### 4. `/etc/fstab`（供 rcS 的 `mount -a` 挂载）

```
# <device>  <mount point>  <type>  <options>  <dump>  <fsck order>
tmpfs       /tmp           tmpfs   defaults   0       0
```

### 5. `/etc/profile`（登录环境：提示符/PATH/库路径）

```sh
#!/bin/sh
export HOSTNAME=fsmp1a
export USER=root
export HOME=root
export PS1="[$USER@$HOSTNAME: \w]# "
PATH=/bin:/sbin:/usr/bin:/usr/sbin:$PATH
LD_LIBRARY_PATH=/lib:/usr/lib:$LD_LIBRARY_PATH
export PATH LD_LIBRARY_PATH
```

### 6. 内核侧前提核查

```bash
grep -E "CONFIG_SYSFS=y|CONFIG_TMPFS=y|CONFIG_DEVTMPFS=y" <内核源码>/.config
```

实测三行俱在；另确认 `CONFIG_UEVENT_HELPER` 未开——rcS 里 `echo ... > /proc/sys/kernel/hotplug` 在上板时会报"不存在该目录"（课程预告过的必然现象，修法 = 实验二十七步骤 1 勾 `Support for uevent helper` 后重编；且内核同时开着 DEVTMPFS_MOUNT，/dev 里本就有 devtmpfs 生成的设备文件，与 mdev 方案叠加不冲突）。

### 7. dev 目录与其他空目录

```bash
mkdir dev
mkdir proc mnt tmp sys root var usr/lib
```

### 8. 就地验证

`ls`：bin dev etc lib linuxrc mnt proc root sbin sys tmp usr var **十三样**；`find etc -type f | sort`：etc/fstab、etc/init.d/rcS、etc/inittab、etc/profile **恰四个**。

## 五、实验结果

| 检查项 | 实测结果 |
|---|---|
| 骨架自检 | 四样齐全 + lib 39 项 |
| etc 四件套 | inittab / init.d/rcS / fstab / profile 全部写入 |
| rcS | mdev 七步落地 + `chmod +x` |
| 内核前提 | SYSFS/TMPFS/DEVTMPFS =y；UEVENT_HELPER 未开（已知坑） |
| 目录 | dev + 7 空目录，顶层十三样 |

**结论**：根文件系统"灵魂"就位——init 序列、设备管理、用户环境齐备，等一块能挂载的存储或网络根（实验二十七 NFS）来点亮它。

## 六、问题与心得

1. **inittab 的减号**：`::askfirst:-/bin/sh` 的 `-` 让 busybox 把 sh 当登录 shell 跑（带 profile 环境）——丢了它进不了带环境的交互命令行。
2. **mdev 七步 vs devtmpfs**：内核同时开着 DEVTMPFS_MOUNT（multi_v7 默认），点火后 /dev 里会有内核自动生成的设备文件；rcS 的 tmpfs+mdev 是课件教学版——两者叠加不冲突，但要知道"谁干的"。
3. **`/proc/sys/kernel/hotplug` 的出口由 `CONFIG_UEVENT_HELPER` 提供**——我们的基线没开，这行 echo 上板必报错；开了它 mdev 才能收到热插拔事件。实验二十七点火前顺手勾上。
4. **fstab 的虚拟文件系统行**：proc/tmpfs 这类没有设备的挂载，device 字段任意值——字段规则记全了以后看任何 fstab 都不懵。
5. **看树别用 maxdepth 一刀切**：bin 里近百个符号连接会把 `find . -maxdepth 2` 的输出挤爆——顶层结构用 `ls`，etc 内容用 `find etc`，各看各的。
