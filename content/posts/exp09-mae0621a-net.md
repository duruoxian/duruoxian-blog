---
title: "实验九　F-5 替换网卡驱动（MAE0621A）"
date: 2026-10-04
description: "整个移植系列最硬的一仗:FS-MP1A 的 MAE0621A 网卡没有现成驱动,移植驱动补丁、调通 PHY 自协商,直到 U-Boot 里 ping 通电脑。"
category: "技术"
tags: [嵌入式, U-Boot, 网卡驱动, 设备树]
series: "嵌入式Linux实验·U-Boot移植"
draft: false
---

> 开发板：华清远见 FS-MP1A（STM32MP157A）　实验日期：2026-10-04（编译）／2026-10-20（上板复验）
> **最终状态：全部完成并通过上板验证（`g05cefd75`、PHY 自协商成功、ping 通电脑）。之前"板子一直跑旧镜像"的卡点已定位并排除，详见第五、六节。**

---

## 〇、结论速览

| 项目 | 结果 |
|---|---|
| 编译产物 | `u-boot.img` 854042B（+600B）、`u-boot-spl.stm32` 98921B、提交 `05cefd75` |
| 烧写 | 三条 dd + 三重逐字节 `cmp` 全部 OK；`u-boot.img` md5 `950f3c445f39bc4b6316238e69af4dc1` |
| 上板版本 | `U-Boot 2020.01-stm32mp-r1-g05cefd75` ✅ |
| EQOS 报错 | `EQOS_DMA_MODE_SWR stuck` **完全消失** ✅ |
| PHY 自协商 | `Waiting for PHY auto negotiation to complete...... done` ✅ |
| ping 电脑 | `host 169.254.59.197 is alive` ✅ |
| 结论 | **F-5 全部达标** |

---

## 一、实验目的

1. 理解网卡报错（`EQOS_DMA_MODE_SWR stuck` / `Net:` 后无法工作）的根因：**FS-MP1A V3.0 改用国产网卡芯片 MAE0621A**，U-Boot 里有 EQOS MAC 控制器驱动但没有这颗 PHY 芯片的驱动；
2. 学会接入厂商驱动三件套（`phy.c` 框架改造版 / `maxio.c` 新增 PHY 驱动 / `dwc_eth_qos.c` MAC 驱动改造版）并完成四处接线（phy.h 声明、Makefile 编译项、Kconfig 配置项、menuconfig 勾选）；
3. 验证：启动日志中 `EQOS_DMA_MODE_SWR stuck` 消失、出现新驱动才有的 `Waiting for PHY auto negotiation` 等待；配置 MAC/IP 后 **ping 通电脑**。

## 二、实验环境与材料

| 项目 | 内容 |
|---|---|
| 驱动源码 | `u-boot-网卡-MAE0621A驱动.zip`（phy.c 24847B / maxio.c 3469B / dwc_eth_qos.c 53306B，已抽查 phy.c 第 482 行有 `phy_maxio_init();` 调用，确认是改造版） |
| 分支 | `exp9-f5`（从 exp8-f4 切出） |
| 网络 | 网线直连开发板与电脑（无路由器场景，使用链路本地地址 169.254.x.x/16） |

## 三、实验步骤（实际执行）

### 1. 切分支 + 三个驱动文件各就各位

```bash
git checkout -b exp9-f5 exp8-f4
cp ~/share/MAE0621A/phy.c         drivers/net/phy/phy.c         # 覆盖(PHY框架改造版)
cp ~/share/MAE0621A/maxio.c       drivers/net/phy/maxio.c       # 新增
cp ~/share/MAE0621A/dwc_eth_qos.c drivers/net/dwc_eth_qos.c     # 覆盖(MAC驱动改造版)
```

> 前两条 cp 是故意覆盖：厂商给的就是这两个文件的 FS-MP1A 改造版；两文件均被 git 跟踪，改动随时可查。自检 `grep -n "phy_maxio_init();" drivers/net/phy/phy.c` 实测命中 **482 行**（与原文一致）。

### 2. `include/phy.h` 加函数声明

在 `int phy_realtek_init(void);` 的下一行插入 `int phy_maxio_init(void);`。**实测落在第 395 行**（与原文完全一致）。

> 为什么要这行：PHY 框架初始化（`phy_init()`）逐个调用各厂商的 `phy_xxx_init()` 把驱动挂进链表；没有声明，改造版 phy.c 里调用 `phy_maxio_init()` 时编译器报"未声明的函数"。

### 3. `drivers/net/phy/Makefile` 加编译项

在 `obj-$(CONFIG_PHY_FIXED) += fixed.o` 之后新增。**实测落在第 34 行**（与原文一致）：

```make
obj-$(CONFIG_PHY_MAXIO) += maxio.o
```

> Makefile 只认 `.o` 不认 `.c`——没有这行 maxio.c 永远不参与编译；`$(CONFIG_PHY_MAXIO)` 表示配置开了这项这行才生效。

### 4. `drivers/net/phy/Kconfig` 加配置项

在 `config PHY_REALTEK` 段的上方插入（**实测落在 184~186 行**，原文 187~189 行）：

```kconfig
config PHY_MAXIO
	bool "supports the Maxio MAEXXXX PHY"
	default n
```

> 没有这三行，menuconfig 里根本找不到可勾选的项：菜单是各目录 Kconfig "拼"出来的。

### 5. 选中 Maxio 驱动（menuconfig 的等价脚本操作）

```bash
grep -q "^CONFIG_PHY_MAXIO=y" .config || echo "CONFIG_PHY_MAXIO=y" >> .config
make olddefconfig
grep "PHY_MAXIO" .config      # 实测: CONFIG_PHY_MAXIO=y
```

课件路径：`Device Drivers → Ethernet PHY (physical media interface) support → [*] supports the Maxio MAEXXXX PHY`。

### 6. 配置固化 + git 提交

```bash
cp .config configs/stm32mp15_fsmp1a_basic_defconfig
git add -A
git commit -m "exp9 F-5: 替换网卡驱动(接入 MAE0621A: phy.c/maxio.c/dwc_eth_qos.c + Kconfig/Makefile/phy.h)"
```

实测提交：`05cefd75`。

### 7. 重新编译（实测）

```
CC      drivers/net/dwc_eth_qos.o     ← 改造版 MAC 驱动参与编译
CC      drivers/net/phy/maxio.o       ← 新 PHY 驱动首次编译
MKIMAGE u-boot.img
```

**产物体积对账（与原文一致）**：u-boot.img 853442 → **854042 字节（恰好 +600 = 新驱动代码入镜，原文同为 +600）**；SPL 不含网卡驱动，98921 字节不变。

### 8. 烧写 SD 卡（三条 dd + 三重回读校验）

```
sdb1/sdb2: 各 98921 字节；sdb3: 854042 字节
回读校验: sdb3 md5 = 950f3c445f39bc4b6316238e69af4dc1 = u-boot.img ✓（共校验 3 次，均一致）
```

> 本轮烧写期间读卡器 USB 桥出现一次假死（写入速度异常 + 弹出后设备掉线），重新插拔后用「断开重连后的全新读取」再次确认卡上内容为 exp9——烧写数据最终确认无误。

## 四、上板验证（**已全部通过**）

按原文，上电后应观察到：

| 看什么 | 达标判据 | 实测结果 |
|---|---|---|
| `EQOS_DMA_MODE_SWR stuck` 不再出现 | 新 MAC 驱动顺利通过 DMA 软复位（F-5 里程碑第一半） | ✅ 整个启动日志中该报错**完全消失** |
| `Waiting for PHY auto negotiation to complete` + 长串点 | 新驱动第一次真正"摸到了 PHY"（老驱动走不到这步） | ✅ 出现 `ethernet@5800a000 Waiting for PHY auto negotiation to complete...... done` |
| 配置 MAC/IP 后 `ping` 通电脑 | F-5 里程碑第二半（网卡真正可用） | ✅ `host 169.254.59.197 is alive` |

### 4.1 上板复验的完整流程（2026-10-20 实测）

为保证每一步可追溯，本次复验**从实验八的镜像开始重做**，先确认基线，再烧实验九，避免"板上跑的到底是哪一版"说不清。

**第 1 步：烧 exp8 基线并确认**

物理循环：拔 **DC 5V 电源插头**断电 10 秒 → 取卡插读卡器 → VMware 把读卡器连给虚拟机 → 先 `lsblk` 认卡 → 三条 dd → 回读 `cmp` 校验 → `eject` → 卡插回板子 → **确认拨码 101** → 上电。

> 认卡这一步必须看 `lsblk` 的**容量和型号**，不要按惯例写死设备名：本次两次烧写中，SD 卡一次是 `/dev/sdc`（同时存在一个 36K 的 `microcontroller` 设备占用 `/dev/sdb`），一次是 `/dev/sdb`。写错一次就是毁一个设备。

实测设备表（第一次）：

```
NAME     SIZE MODEL                          TRAN
sda      100G VMware_Virtual_S               spi     ← 虚拟机系统盘
sdb       36K microcontroller                usb     ← 板载调试器，绝不能碰
sdc     29.8G Storage_Device                 usb     ← SD 卡
├─sdc1   256K   fsbl1
├─sdc2   256K   fsbl2
├─sdc3     2M   ssbl
├─sdc4    64M   bootfs
└─sdc5  29.7G   rootfs
```

烧写与校验脚本（三条 dd + 三重逐字节 cmp）：

```bash
D=/dev/sdb            # 本次实测卡是这个；务必先用 lsblk 确认
S=~/share/expN-uboot/u-boot-spl.stm32
I=~/share/expN-uboot/u-boot.img
sudo dd if=$S of=${D}1 conv=fdatasync bs=1M
sudo dd if=$S of=${D}2 conv=fdatasync bs=1M
sudo dd if=$I of=${D}3 conv=fdatasync bs=1M
sudo blockdev --flushbufs $D && sync
sudo cmp -n $(stat -c%s $S) $S ${D}1 && echo SPL1_OK
sudo cmp -n $(stat -c%s $S) $S ${D}2 && echo SPL2_OK
sudo cmp -n $(stat -c%s $I) $I ${D}3 && echo SSBL_OK
sudo eject $D
```

> 用 `cmp` 逐字节比对而不用 `md5sum 回读`：`cmp` 直接把镜像与块设备逐字节比，绕开了读卡器 USB 桥的缓存，比"先读出来再算摘要"可信度更高。

实测输出（exp8）：

```
SPL1_WRITTEN
SPL2_WRITTEN
SSBL_WRITTEN
SPL1_OK
SPL2_OK
SSBL_OK
0ca9d6b5d58bef9e6536746e9f9ae5ac  u-boot-spl.stm32
ce0079965756ec0c78e2ee28b73bc81e  u-boot.img
EJECTED_OK
```

exp8 上板实测启动日志关键行：

```
U-Boot SPL 2020.01-stm32mp-r1-g20685cec (Oct 04 2026 - 21:48:05 +0800)
Model: STMicroelectronics STM32MP157A-DK1 Discovery Board
Trying to boot from MMC1

U-Boot 2020.01-stm32mp-r1-g20685cec (Oct 04 2026 - 21:48:05 +0800)
CPU:   STM32MP157AAA Rev.Z
Board: stm32mp1 in basic mode (st,stm32mp157a-dk1)
DRAM:  512 MiB
NAND:  0 MiB
MMC:   STM32 SD/MMC: 0
Loading Environment from MMC... OK
In:    serial
Out:   serial
Err:   serial
Net:   eth0: ethernet@5800a000
Hit any key to stop autoboot:  0
EQOS_DMA_MODE_SWR stuckFAILED: -110
EQOS_DMA_MODE_SWR stuckFAILED: -110
ERROR: can't get kernel image!
STM32MP>
```

**这一屏就是"基线正确"的铁证**：版本 `g20685cec` = exp8，且 `EQOS_DMA_MODE_SWR stuck` 依旧在 → 说明**烧写链路、断电、拨码、串口全部正常**，之前"板子一直跑旧镜像"与本实验九的驱动改动无关。

**第 2 步：烧 exp9 并验证**

同样三条 dd + 三重 cmp，实测输出：

```
SPL1_WRITTEN / SPL2_WRITTEN / SSBL_WRITTEN
SPL1_OK / SPL2_OK / SSBL_OK
62ec5887c764c3d617ed0746360d683f  u-boot-spl.stm32
950f3c445f39bc4b6316238e69af4dc1  u-boot.img
EJECTED_OK
```

（`u-boot.img` md5 `950f3c44...` 与 10 月 4 日编译时记录的值完全一致，说明镜像就是当初那一版，未发生重建漂移。）

### 4.2 上板实测日志（达标记）

**启动段**（关键行，完整对应原文三条判据）：

```
U-Boot SPL 2020.01-stm32mp-r1-g05cefd75 (Oct 04 2026 - 21:49:38 +0800)
Model: STMicroelectronics STM32MP157A-DK1 Discovery Board
RAM:   DDR3-DDR3L 16bits 533000Khz
WDT:   Started with servicing (32s timeout)
Trying to boot from MMC1

U-Boot 2020.01-stm32mp-r1-g05cefd75 (Oct 04 2026 - 21:49:38 +0800)
CPU:   STM32MP157AAA Rev.Z
Board: stm32mp1 in basic mode (st,stm32mp157a-dk1)
DRAM:  512 MiB
NAND:  0 MiB
MMC:   STM32 SD/MMC: 0
Loading Environment from MMC... OK
In:    serial
Out:   serial
Err:   serial
Net:   eth0: ethernet@5800a000
Hit any key to stop autoboot:  0
ethernet@5800a000 Waiting for PHY auto negotiation to complete...... done
Using ethernet@5800a000 device
TFTP from server 192.168.0.100; our IP address is 169.254.59.198
Filename 'uImage'.
Load address: 0xc2000000
Loading: ## Warning: gatewayip needed but not set
...
ARP Retry count exceeded; starting again
```

**逐条对账**：

| 判据 | 实测证据 | 结果 |
|---|---|---|
| 版本是 exp9 | `U-Boot 2020.01-stm32mp-r1-g05cefd75` | ✅ |
| 网卡被识别 | `Net:   eth0: ethernet@5800a000` | ✅ |
| **`EQOS_DMA_MODE_SWR stuck` 消失** | 整个启动日志无该字符串（exp8 同位置有两行 `FAILED: -110`） | ✅ |
| **PHY 自协商成功** | `ethernet@5800a000 Waiting for PHY auto negotiation to complete...... done` | ✅ |
| 网络可发帧 | `Using ethernet@5800a000 device` + 发送 ARP 至 `TFTP from server 192.168.0.100` | ✅ |

> `ARP Retry count exceeded` 是**预期现象**：默认环境里 `serverip=192.168.0.100` 是课件的 TFTP 服务器地址，本机没有这台服务器，所以 bootcmd 的 TFTP 必然失败。它恰好证明了**板子能正常发出 ARP 请求**（链路已通），只是没人应答。

**ping 段**（核心判据）：

```
STM32MP> printenv ethaddr
ethaddr=1A:1F:DB:0E:69:FD
STM32MP> printenv ipaddr
ipaddr=169.254.59.198
STM32MP> ping 169.254.59.197
Using ethernet@5800a000 device
host 169.254.59.197 is alive
```

> 注意第二次 ping 时**没有再打印** `Waiting for PHY auto negotiation`，说明 PHY 链路在上电阶段就已协商完成并保持，直接进入了收发状态。

**电脑侧（Windows）交叉验证**：

```powershell
> Get-NetIPAddress -AddressFamily IPv4
InterfaceAlias   IPAddress       PrefixLength
以太网            169.254.59.197   16

> arp -a | Select-String "169.254.59.198"
  169.254.59.198        1a-1f-db-0e-69-fd     dynamic
```

ARP 表里出现了 `169.254.59.198 → 1a-1f-db-0e-69-fd`，**双向都认识对方**：这是"二层链路 + ARP 协议层"全部打通的硬证据，比单看板子侧 ping 更有说服力。

## 五、实验进度与遇到的问题（如实记录）

### 5.1 本次（2026-10-20）复验结论

**实验九全部步骤完成并通过上板验证。** 复验方法：从实验八镜像开始重做一遍（见 4.1），每一步都用"版本号 + 日志特征"双向确认。

### 5.2 遇到的问题一：板子一直启动 exp8 旧固件（已定位并解决）

**现象（10 月 4 日）**：读卡器侧对卡内容的三次独立校验（含 `blockdev --flushbufs` 后回读、以及从板子取出后直读）均为 exp9（`950f3c44`），但板子多次上电/`reset` 后 `version` 始终显示 `g20685cec`（exp8），且报老驱动特征的 `EQOS_DMA_MODE_SWR stuck`。

**本次定位过程**：

1. 先**不重烧**，直接按"断电 → 取卡重插 → 确认拨码 101 → 上电"操作，结果板子仍跑 exp8；
2. 于是改用**基线法**：烧 exp8 → 上板确认 `g20685cec` → 再烧 exp9 → 上板确认 `g05cefd75`。两次都一次成功。

**根因（两个，叠加作用）**：

| 根因 | 说明 | 证据 |
|---|---|---|
| **只拔 USB 线不算断电** | 板子有独立 DC 5V 插座，USB 只拔掉时主电仍在，芯片没有真正复位，**RAM 里的旧 U-Boot 一直没被覆盖** | 彻底拔 DC 电源、等 10 秒后，立刻就能启动新镜像 |
| **拨码开关被碰离 101** | 开关紧挨卡槽，取插卡时极易被碰动。最严重时被拨到 **000（USB/DFU 烧写模式）**，此时板子枚举成 Windows 设备 `USB DFU`，串口 COM3 也会整个消失 | Windows 设备管理器出现 `USB DFU`（VID_0483），且 `Ports` 下 COM3 状态为 Unknown/未连接 |

**顺带发现并解决的一个串口问题**：实验中一度 MobaXterm 里找不到 **COM3**。查 Windows 设备管理器发现 `USB 串行设备 (COM3)`（VID_0483&PID_374B，即 STM32MP1 的 ST-Link 虚拟串口）状态为 "Unknown"（未连接），同时系统里多出一个 `USB DFU` 设备——正是拨码处于 000 的表现。**把拨码拨回 101、重新上电后 COM3 立即恢复**（`Get-PnpDevice -Class Ports` 显示状态 OK，`[System.IO.Ports.SerialPort]::GetPortNames()` 返回 COM3）。

**经验**：串口"没有 COM3"不一定是驱动问题，先看两点——① 拨码是不是被碰离 101；② 设备管理器里是否出现了 `USB DFU`（出现即说明在烧写模式）。

### 5.3 遇到的问题二：`env default -a -f` 与 `version` 命令不可用

**现象**：

```
STM32MP> env default -a -f
Unknown command 'env' - try 'help'
STM32MP> version
Unknown command 'version' - try 'help'
```

**原因**：本 basic 版配置裁剪了这些命令。从 defconfig 与 `.config` 核对：

```
CONFIG_CMD_SAVEENV=y          ← saveenv 有
CONFIG_CMD_ENV_EXISTS=y       ← env exists 有
CONFIG_CMD_NVEDIT_INFO=y      ← env info 有
（CONFIG_CMD_NVEDIT 主开关未开）   ← env set/delete/default 没有
```

`version` 命令同样被裁掉（`printenv`、`setenv`、`saveenv`、`ping`、`mmc` 等仍可用）。

**解决**：绕过它。`env default -a -f` 的作用只是清掉卡上遗留的旧网络环境，而本板环境本来就是默认值，直接执行 `setenv` 系列即可，实测有效。至于"确认板子跑的哪个版本"，改用**启动日志第一行**：

```
U-Boot 2020.01-stm32mp-r1-g05cefd75 (Oct 04 2026 - 21:49:38 +0800)
```

这行比 `version` 命令更原始可靠（它在 banner 里，不依赖任何命令配置），做报告配图时也更有说服力。

### 5.4 遇到的问题三：`Can't overwrite "ethaddr"`

**现象**：

```
STM32MP> setenv ethaddr 1A:1F:DB:0E:69:FD
## Error: Can't overwrite "ethaddr"
## Error: inserting "ethaddr" variable, errno=1
```

**原因**：`ethaddr` 是 U-Boot 的**受保护环境变量**——一旦网卡被 `open` 过（启动时 bootcmd 的 TFTP 会用到网络），`ethaddr` 就被锁定，不允许再修改（防止误改 MAC）。

**解决**：先用 `printenv ethaddr` 确认当前值。本次实测发现**值已经是目标 MAC**（`1A:1F:DB:0E:69:FD`），说明之前某次 `setenv` 已经生效并保存进环境，报错只是"重复设置"的保护动作，不影响使用，直接 `ping` 即可。

```
STM32MP> printenv ethaddr
ethaddr=1A:1F:DB:0E:69:FD
STM32MP> printenv ipaddr
ipaddr=169.254.59.198
STM32MP> printenv netmask
netmask=255.255.0.0
```

**经验**：遇到 `Can't overwrite "ethaddr"` 不要反复重试，先 `printenv` 看值对不对；对就跳过，不对才需要清环境（本版无 `env` 命令，只能重烧或改 bootcmd 执行顺序）。

### 5.5 遇到的问题四：ping 不通（Windows 防火墙拦 ICMP）

**现象**：链路与 ARP 都正常，但板子侧报：

```
STM32MP> ping 169.254.59.197
Using ethernet@5800a000 device
ping failed; host 169.254.59.197 is not alive
```

**定位过程**：

1. 在 Windows 查 ARP 表：`arp -a` 中**已有** `169.254.59.198 → 1a-1f-db-0e-69-fd` → 说明二层链路和 ARP 应答都正常，排除了网线、PHY、MAC 地址问题；
2. 查防火墙：`Get-NetFirewallProfile` 显示 Domain/Private/Public 三个配置文件均 `Enabled=True`，入站默认动作 `NotConfigured`（即默认阻止）→ 判定为 ICMP 被拦。

**解决**（管理员 PowerShell）：

```powershell
netsh advfirewall firewall add rule name="Allow ICMPv4-In All" protocol=icmpv4:8,any dir=in action=allow profile=any
```

实测输出：`exit=0`，且 `netsh advfirewall firewall show rule name="Allow ICMPv4-In All"` 显示 `Enabled: Yes`。

**结果**：再次 ping 立即成功 → `host 169.254.59.197 is alive`。

**经验**：U-Boot 里 ping 不通，**先看 Windows 的 ARP 表**。ARP 有记录 = 链路通、问题在防火墙；ARP 没记录 = 问题在物理链路/驱动/网段。这一招比盲目重烧快得多。

### 5.6 本章排查手段总结（可复用）

| 现象 | 第一步查什么 | 命令 |
|---|---|---|
| 板子跑的是旧固件 | 断电是否彻底（拔 DC）+ 拨码是否 101 | 物理检查；启动日志第一行版本号 |
| 串口没有 COM3 | 设备管理器有无 `USB DFU`（=拨码 000） | `Get-PnpDevice -Class Ports` |
| 不确定卡上写的对不对 | 逐字节比对而非算摘要 | `sudo cmp -n <size> <file> <device>` |
| 不确定板子看到的是哪版 | 启动日志第一行（不依赖命令配置） | `U-Boot 2020.01-stm32mp-r1-gXXXXXXX` |
| ping 不通 | Windows ARP 表有无板子条目 | `arp -a` |
| `env`/`version` 报 Unknown command | 查 `.config` 里 `CONFIG_CMD_*` 是否开启 | `grep CONFIG_CMD_ .config` |

**环境变量配置方案**（针对本机"无路由器、网线直连电脑"的场景）：

```
env default -a -f                     ← 清掉卡上遗留的旧环境（192.168.0.x 旧配置）
setenv ethaddr 1A:1F:DB:0E:69:FD      ← 课件示例 MAC（本地管理地址段）
setenv ipaddr 169.254.59.198          ← 与电脑网卡(169.254.59.197/16)同链路网段
setenv netmask 255.255.0.0
saveenv
reset                                  ← 重启后网络生效
ping 169.254.59.197                   ← ping 电脑
```

> **ethaddr 的一次性规矩**：U-Boot 规定 ethaddr 在一次上电内一旦被网络操作"用过"就不许再改。旧环境变量的 bootcmd 会在启动时自动尝试 TFTP（用掉网络），所以必须先 `env default -a -f` 清环境、设好再保存重启，之后 ethaddr 从环境读入，ping 才不会报 `Can't overwrite "ethaddr"`（本实验实际踩到过这个报错，见下）。

## 六、问题与心得

1. **驱动接入是"接线"活**：三个 .c 文件只是原料，真正让它生效的是四处接线（声明、编译项、配置项、勾选）——漏一处都不报错、但驱动就是不存在，这类"静默失效"要靠产物体积差（+600B）和编译输出（`CC maxio.o`）来确认；
2. **产物体积是免费的验证手段**：+600 字节与原文完全一致，说明驱动编译进来的规模都对；
3. `Can't overwrite "ethaddr"` 这类 u-boot 保护规则要先查文档/原文再操作——先设 MAC 后用网络是有顺序讲究的；遇到报错先 `printenv` 确认现值，可能它早就是对的；
4. 排查"烧了没生效"要用**链路两端的独立证据**：读卡器侧 `cmp`（电脑看到的）+ 板子侧启动日志版本号（板子看到的）各自独立验证，才能定位是"没写进去"还是"没读出来"。本次最终结论是后者中的**第三种情况：写也写了、读也读了，但板子根本没断电重启**；
5. **"彻底断电"是嵌入式实验的第一条铁律**：只拔 USB 线时板子主电仍在，RAM 里的旧固件不会消失。本次卡了一整天的"板子不换镜像"，根因就是这一条；
6. **基线法比猜疑更省时间**：与其反复怀疑"卡写没写进去""读卡器坏没坏"，不如先烧一版**已知正确**的镜像（exp8）上板确认，一旦基线通过，问题范围立刻缩小到"新版镜像"这一端；
7. **诊断性证据要挑最原始的那个**：`version` 命令可能被裁掉，但启动日志第一行 banner 永远在；`ping` 可能被防火墙拦，但 ARP 表不会骗人；
8. 板子上跑的到底是哪一版，**只有启动日志能证明**——`printenv` 能证明环境，不能证明代码。
