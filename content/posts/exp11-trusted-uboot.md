---
title: "实验十一　trusted 版 U-Boot 移植"
date: 2026-10-04
description: "进入 trusted 启动链:TF-A(BL2)→ SP_MIN → U-Boot 的完整信任链移植与上板验证。"
category: "技术"
tags: [嵌入式, U-Boot, TF-A, ARM]
series: "嵌入式Linux实验·U-Boot移植"
draft: false
---

> 开发板：华清远见 FS-MP1A（STM32MP157A）　实验日期：2026-10-04（编译）／2026-10-20（烧写与验证）／2026-11-01（重做：重建提交、重新编译、重新烧写验证）
> **最终状态：全部完成并通过上板验证（TF-A `v2.2-r1.0` + SP_MIN 正常引导，`U-Boot 2020.01-stm32mp-r1-g392260b4`，`Board: stm32mp1 in trusted mode`）。出厂 TF-A 文件已由老师提供。**
> **2026-11-01 重做记录**：首次完成后板子外借，归还时 SD 卡已被刷成他人镜像（`ge97b6818`，2026-10-27 构建，非本仓库产物），环境变量亦被改写。本次重做：两步提交重建 trusted 配置（`1979f987` → `392260b4`），重新编译（md5 `36ce98e1`，横幅 `Nov 01 2026 - 18:37:09`），原子烧写 + 三重校验 + 板端 CRC 复核后上电验证 `trusted mode` 通过；环境变量已恢复默认。

---

## 〇、结论速览

| 项目 | 结果 |
|---|---|
| 编译产物 | `u-boot.stm32` 855597B（无 SPL），提交 `1979f987` + `392260b4` |
| 出厂 TF-A | `tf-a-stm32mp157a-fsmp1a-trusted.stm32` 241984B，md5 `30503c507f095764728e4180ded04c8a`，文件头 `53 54 4D 32`（"STM2"） |
| 烧写 | fsbl1/fsbl2 烧 TF-A，ssbl 烧 u-boot.stm32；三重 `cmp` 全部 OK |
| 启动链 | `BL2(TF-A) → SP_MIN(BL32) → U-Boot` ✅ |
| **trusted 模式** | `Board: stm32mp1 in trusted mode (st,stm32mp157a-dk1)` ✅ |
| 结论 | **实验十一全部达标** |

---

## 一、实验目的

1. 理解 trusted 版与 basic 版的本质区别：trusted 版**只有 SSBL**，FSBL 由 **TF-A**（出厂提供，不移植）充当——它不能独立运行，但**能启动 Linux 内核**；
2. 掌握 trusted 版移植的"最小改动法"：设备树自动继承（F-2/F-4/F-6 是设备树改动，两种模式共用），只有 **`.config` 里的配置改动需要重做**（F-1 关 STPMIC1、F-3 关 ADC×2、F-5 选 MAE0621A）；
3. 编译出 trusted 版产物 **`u-boot.stm32`**（无 SPL），烧写时 fsbl1/fsbl2 烧出厂 TF-A、ssbl 烧 u-boot.stm32，上电验证 `Board: stm32mp1 in trusted mode`。

## 二、实验原理

- basic 版 SPL 自己初始化 DDR 并加载 SSBL；trusted 版由 TF-A 完成时钟树与 DDR 初始化，再把 u-boot.stm32 加载进 DDR；
- 设备树里大段时钟树与 PMIC 标记（`&rcc` 的 st,clksrc/st,clkdiv、`&pmic` 的 u-boot,dm-pre-reloc、`&sdmmc1` 的 u-boot,dm-spl 等）包在 `#ifndef CONFIG_STM32MP1_TRUSTED` 条件段里——trusted 编译时自动剔除：电源与时钟改由 TF-A 负责，这是两种模式在设备树层面的分水岭；
- ROM Code 对 fsbl1/fsbl2 的要求不变：里面烧的从 SPL 换成了 TF-A 的 .stm32 镜像。

## 三、实验步骤（实际执行）

### 1. 切出实验分支，确认 basic 配置已固化

```bash
git checkout -b exp11-trusted exp10-f6
ls configs/stm32mp15_fsmp1a_*    # 应有 basic 与 trusted 两个（trusted 为本次新增）
```

### 2. 清除构建产物，复制并加载 trusted 默认配置

```bash
make distclean
cp configs/stm32mp15_trusted_defconfig configs/stm32mp15_fsmp1a_trusted_defconfig
make stm32mp15_fsmp1a_trusted_defconfig
```

### 3. 把 basic 版的配置改动原样重做（三站四处）

| 改动 | 来自 | 本机实现 |
|---|---|---|
| 关 STPMIC1（Device Drivers → Power） | F-1 | sed + olddefconfig |
| 关 adc 命令（Command line interface → Device access commands） | F-3 | 同上 |
| 关 ADC 驱动（Device Drivers） | F-3 | 同上 |
| 勾选 `supports the Maxio MAEXXXX PHY` | F-5 | 同上 |

**实测三处自检全部命中**：

```
--- 自检1 STPMIC1(期望 not set):
# CONFIG_PMIC_STPMIC1 is not set
--- 自检2 ADC(期望恰好两行 not set):
# CONFIG_CMD_ADC is not set
# CONFIG_ADC is not set
--- 自检3 MAXIO(期望 =y):
CONFIG_PHY_MAXIO=y
```

（过程中出现一条无害警告：`warning: override: reassigning to symbol PHY_MAXIO`——先追加再 olddefconfig 的重复赋值，Kconfig 以最后一次为准，结果正确。）

> **F-2/F-4/F-6 为什么不用重做？** 那三站改的是设备树文件——basic、trusted 两种配置编译时读同一份设备树，天然继承；要重做的只有记录在 `.config` 里的配置改动。

### 4. 配置固化 + git 提交（两步提交，2026-11-01 重做采用）

```bash
# (1) 先复制 ST trusted 模板为 FS-MP1A 版，模板原样入库
cp configs/stm32mp15_trusted_defconfig configs/stm32mp15_fsmp1a_trusted_defconfig
git add configs/stm32mp15_fsmp1a_trusted_defconfig
git commit -m "exp11: 复制 ST trusted 模板为 fsmp1a trusted 默认配置"

# (2) 加载模板 → 三站四处平移（过程同上文步骤 2~3）→ 固化后提交
make stm32mp15_fsmp1a_trusted_defconfig
cp .config configs/stm32mp15_fsmp1a_trusted_defconfig
git add configs/stm32mp15_fsmp1a_trusted_defconfig
git commit -m "exp11: trusted 版三站四处配置平移(关STPMIC1/ADC, 开MAE0621A PHY)"
```

实测提交：`1979f987`（模板入库）→ `392260b4`（三站四处平移），2026-11-01 完成。

### 5. 编译，产出 u-boot.stm32（实测）

```bash
make -j2 all DEVICE_TREE=stm32mp157a-fsmp1a
```

```
COPY    u-boot.bin
MKIMAGE u-boot.stm32        ← trusted 版最终打包步骤
CFGCHK  u-boot.cfg
-rw-rw-r-- 1 cnu cnu 855597 u-boot.stm32
```

**两处与 basic 版编译的不同（均实测确认）**：
- **没有 `u-boot-spl.stm32`**：trusted 配置下 SPL 不参与构建（`ls u-boot-spl.stm32` → No such file）——FSBL 的活整个交给 TF-A；
- 产物 `u-boot.stm32` 855597 字节（原文参考值 855605，基本一致）。

产物已存至虚拟机 `~/share/exp11-uboot/u-boot.stm32`。

## 四、烧写与上板验证（**已全部通过**）

### 4.1 出厂 TF-A 文件的获取与校验

**来源**：老师提供的出厂软件包（`D:\study\Linux\嵌入式Linux\tf-a-stm32mp157a-fsmp1a-trusted.stm32`），已通过 `scp` 传入虚拟机 `~/share/exp11-uboot/`。

**校验（下发前必做，防止拷坏或拷错文件）**：

```powershell
# Windows 侧
> (Get-Item tf-a-stm32mp157a-fsmp1a-trusted.stm32).Length
241984
> (Get-FileHash tf-a-stm32mp157a-fsmp1a-trusted.stm32 -Algorithm MD5).Hash
30503C507F095764728E4180DED04C8A
> [System.IO.File]::ReadAllBytes("...stm32")[0..7] | % { $_.ToString('X2') }
53 54 4D 32 00 00 00 00
```

```bash
# 虚拟机侧（scp 之后核对一致性）
$ md5sum tf-a-stm32mp157a-fsmp1a-trusted.stm32 u-boot.stm32
30503c507f095764728e4180ded04c8a  tf-a-stm32mp157a-fsmp1a-trusted.stm32
36ce98e1501a60e965a24f5364b7d7f5  u-boot.stm32
$ xxd -l 16 u-boot.stm32
00000000: 5354 4d32 0000 0000 0000 0000 0000 0000  STM2............
```

> **文件头 `53 54 4D 32` = ASCII "STM2"**，这是 STM32 镜像的 Magic Number。ROM Code 只认这个头，拷坏了（比如用文本模式传输导致换行转换）ROM 会直接跳过该分区，表现是"上电零输出"——所以这一步校验不能省。md5 两侧一致 = 传输无损。

### 4.2 烧写（原理与前面几站的差别）

| 分区 | basic 版烧什么 | trusted 版烧什么 |
|---|---|---|
| fsbl1 | `u-boot-spl.stm32`（SPL，101K 级） | **`tf-a-...-trusted.stm32`（TF-A，241984B）** |
| fsbl2 | `u-boot-spl.stm32`（备份） | **同一份 TF-A（备份）** |
| ssbl | `u-boot.img`（SSBL，U-Boot 打包） | **`u-boot.stm32`（855597B，无 SPL 的裸 U-Boot 镜像）** |

> **关键差别**：basic 版的 FSBL 是我们自己编译的 SPL（`u-boot-spl.stm32`）；trusted 版的 FSBL 换成了**华清适配好的 TF-A**，格式和大小都不同（241984B vs 101016B），U-Boot 那边也从 `u-boot.img`（带 FIT 头）换成了 `u-boot.stm32`（STM32 镜像格式）。这就是"trusted 版没有 SPL"的物理体现——SPL 的活整个交给了 TF-A 的 BL2。

**实测烧写命令与输出**：

```bash
D=/dev/sdb                       # lsblk 认卡：29.8G Storage_Device
T=~/share/exp11-uboot/tf-a-stm32mp157a-fsmp1a-trusted.stm32
U=~/share/exp11-uboot/u-boot.stm32
sudo dd if=$T of=${D}1 conv=fdatasync bs=1M
sudo dd if=$T of=${D}2 conv=fdatasync bs=1M
sudo dd if=$U of=${D}3 conv=fdatasync bs=1M
sudo blockdev --flushbufs $D && sync
sudo cmp -n $(stat -c%s $T) $T ${D}1 && echo FSBL1_OK
sudo cmp -n $(stat -c%s $T) $T ${D}2 && echo FSBL2_OK
sudo cmp -n $(stat -c%s $U) $U ${D}3 && echo SSBL_OK
sudo eject $D
```

```
TF_A_TO_FSBL1
TF_A_TO_FSBL2
UB_TO_SSBL
FSBL1_OK
FSBL2_OK
SSBL_OK
30503c507f095764728e4180ded04c8a  tf-a-stm32mp157a-fsmp1a-trusted.stm32
36ce98e1501a60e965a24f5364b7d7f5  u-boot.stm32
EJECTED_OK
```

### 4.3 上板实测日志（核心证据）

**第一屏：TF-A 启动 + U-Boot 接管**

```
NOTICE:  CPU: STM32MP157AAA Rev.Z
NOTICE:  Model: HQYJ FS-MP1A Discovery Board
INFO:    Reset reason (0x15):
INFO:      Power-on Reset (rst_por)
INFO:    Using SDMMC
INFO:      Instance 1
INFO:    Boot used partition fsbl1
NOTICE:  BL2: v2.2-r1.0(debug):a70053f
NOTICE:  BL2: Built : 09:55:29, Nov  5 2020
INFO:    Using crypto library 'stm32_crypto_lib'
INFO:    BL2: Doing platform setup
INFO:    RAM: DDR3-DDR3L 16bits 533000Khz
INFO:    Memory size = 0x20000000 (512 MB)
INFO:    BL2 runs SP_MIN setup
INFO:    BL2: Loading image id 4
INFO:    Loading image id=4 at address 0x2ffed000
INFO:    Image id=4 loaded: 0x2ffed000 - 0x2ffff000
INFO:    BL2: Loading image id 5
INFO:    Loading image id=5 at address 0xc0100000
INFO:    STM32 Image size : 855341
INFO:    Image id=5 loaded: 0xc0100000 - 0xc01d0d2d
WARNING: Skip signature check (header option)
NOTICE:  ROTPK is not deployed on platform. Skipping ROTPK verification.
NOTICE:  BL2: Booting BL32
INFO:    Entry point address = 0x2ffed000
INFO:    SPSR = 0x3d3
INFO:    Cannot find st,stpmic1 node in DT
NOTICE:  SP_MIN: v2.2-r1.0(debug):a70053f
NOTICE:  SP_MIN: Built : 09:55:29, Nov  5 2020
INFO:    ARM GICv2 driver initialized
INFO:    stm32mp IWDG1 (12): Secure
INFO:    ETZPC: CRYP1 (9) could be non secure
INFO:    SP_MIN: Initializing runtime services
INFO:    SP_MIN: Preparing exit to normal world

U-Boot 2020.01-stm32mp-r1-g392260b4 (Nov 01 2026 - 18:37:09 +0800)

CPU:   STM32MP157AAA Rev.Z
Model: STMicroelectronics STM32MP157A-DK1 Discovery Board
Board: stm32mp1 in trusted mode (st,stm32mp157a-dk1)
DRAM:  512 MiB
Clocks:
- MPU : 650 MHz
- MCU : 208.878 MHz
- AXI : 266.500 MHz
- PER : 24 MHz
- DDR : 533 MHz
WDT:   Started with servicing (32s timeout)
NAND:  0 MiB
MMC:   STM32 SD/MMC: 0, STM32 SD/MMC: 1
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
Wrong Image Format for bootm command
ERROR: can't get kernel image!
STM32MP>
```

### 4.4 逐行解读（这条启动链是怎么跑起来的）

这段日志是**整个实验系列最有信息量的一屏**，它完整展示了 trusted 版的启动链路。按顺序解读：

**① ROM Code 找 FSBL，读到的是 TF-A**

```
INFO:    Using SDMMC
INFO:      Instance 1
INFO:    Boot used partition fsbl1
```

- `Using SDMMC / Instance 1`：ROM Code 从 SDMMC1（SD 卡接口）启动 —— 对应拨码 101；
- **`Boot used partition fsbl1`**：ROM Code 按 GPT 分区名找到 `fsbl1` 分区并加载了里面的内容。**这里加载的不再是我们编译的 SPL，而是华清出厂的 TF-A**——ROM Code 并不关心 FSBL 是什么，只要是合法的 STM32 镜像头（`STM2`）就能跑。

**② BL2（TF-A 第一阶段）初始化 DDR**

```
NOTICE:  BL2: v2.2-r1.0(debug):a70053f
NOTICE:  BL2: Built : 09:55:29, Nov  5 2020
INFO:    RAM: DDR3-DDR3L 16bits 533000Khz
INFO:    Memory size = 0x20000000 (512 MB)
```

- `BL2` 版本 `v2.2-r1.0(debug)`，编译时间 **2020 年 11 月 5 日** —— 这是**华清出厂时就编好的**，不是我们编的（对比我们自己的 U-Boot 是 `Oct 04 2026`）；
- **DDR 初始化在 BL2 里完成**：`RAM: DDR3-DDR3L 16bits 533000Khz`、`Memory size = 512 MB`。
- **这正是 basic 版里 SPL 干的活**（实验三我们看到 SPL 打印 `RAM: DDR3-DDR3L 16bits 533000Khz`）——trusted 版把这部分整体交给了 TF-A，"U-Boot 不含 SPL"就是这么来的。

**③ BL2 加载 SP_MIN 和 U-Boot**

```
INFO:    BL2: Loading image id 4
INFO:    Image id=4 loaded: 0x2ffed000 - 0x2ffff000
INFO:    BL2: Loading image id 5
INFO:    STM32 Image size : 855341
INFO:    Image id=5 loaded: 0xc0100000 - 0xc01d0d2d
```

| 映像 ID | 大小 | 加载地址 | 是什么 |
|---|---|---|---|
| **id=4** | `0x2ffff000 - 0x2ffed000` = **8192 字节** | `0x2ffed000`（在 SRAM 区） | **SP_MIN**（BL32，安全监控器） |
| **id=5** | **855341 字节** | `0xc0100000`（DDR 里） | **我们的 U-Boot** |

> **`STM32 Image size : 855341`** 这一行是**最好的对账证据**：我们编译的 `u-boot.stm32` 是 **855597 字节**，减去 STM32 镜像头（256 字节）= **855341 字节**，完全吻合。这说明 TF-A 加载的就是我们刚烧进去的那份 U-Boot，一个字节都不差。

**④ 安全相关（本实验是 debug 版，不校验签名）**

```
WARNING: Skip signature check (header option)
NOTICE:  ROTPK is not deployed on platform. Skipping ROTPK verification.
```

- `Skip signature check`：TF-A 镜像头里带了"跳过签名校验"选项；
- `ROTPK is not deployed`：**ROTPK** = Root of Trust Public Key（信任根公钥）。量产设备会把它熔丝烧进 OTP，用公钥验证 BL2 的签名，防止别人篡改。教学板是 debug 硅片 + 未烧公钥，所以直接跳过；
- **这两行是"为什么我们能随便烧自己编的 U-Boot"的答案**：如果 ROTPK 已部署，烧进去的未签名 U-Boot 会被拒绝执行。

**⑤ BL2 交棒给 SP_MIN**

```
NOTICE:  BL2: Booting BL32
INFO:    Entry point address = 0x2ffed000
INFO:    SPSR = 0x3d3
INFO:    Cannot find st,stpmic1 node in DT
NOTICE:  SP_MIN: v2.2-r1.0(debug):a70053f
```

- `Booting BL32`：**BL32 = SP_MIN（Secure Payload Minimal）**，ARM Trusted Firmware 里的一个精简 TEE（可信执行环境）；
- `Entry point address = 0x2ffed000`：跳到刚才 id=4 加载的地址；
- `SPSR = 0x3d3`：**SPSR** = Saved Program Status Register，保存"跳转出去时目标世界/模式/中断屏蔽状态"的快照。`0x3d3` 的实际含义是**进入非安全世界的 EL1（SVC 模式），且 IRQ/FIQ 处于屏蔽状态**——SP_MIN 用 `ERET` 恢复这个状态，从而把控制权安全地交给 U-Boot，同时保证在交接的那一瞬间不会被中断打断；
- **`Cannot find st,stpmic1 node in DT`（黄色警告）**：TF-A 的**内置设备树**里想找 STPMIC1 电源芯片节点，但 FS-MP1A 版 TF-A 的设备树里没配（或者我们板子用的是分立电源）。**这是预期警告，不影响功能**——它恰好说明华清版 TF-A 是按"无 PMIC"的 FS-MP1A 硬件配置的，与我们在实验五做的 F-1 改造（删 PMIC、改固定电源）的硬件事实一致。

**⑥ SP_MIN 初始化安全世界，然后"回到正常世界"**

```
NOTICE:  SP_MIN: v2.2-r1.0(debug):a70053f
NOTICE:  SP_MIN: Built : 09:55:29, Nov  5 2020
INFO:    ARM GICv2 driver initialized
INFO:    stm32mp IWDG1 (12): Secure
INFO:    ETZPC: CRYP1 (9) could be non secure
INFO:    SP_MIN: Initializing runtime services
INFO:    SP_MIN: Preparing exit to normal world
```

| 行 | 含义 |
|---|---|
| `ARM GICv2 driver initialized` | 中断控制器（Generic Interrupt Controller）初始化——**安全世界也要用中断** |
| `stm32mp IWDG1 (12): Secure` | 独立看门狗 IWDG1 被划为**安全世界独占**（ID=12 是外设编号）；非安全世界的 U-Boot 动不了它 |
| `ETZPC: CRYP1 (9) could be non secure` | **ETZPC** = Extended TrustZone Protection Controller，STM32MP1 特有的外设安全属性配置器。它把加密引擎 CRYP1（编号 9）标为"可被非安全世界访问"——非安全世界（我们的 U-Boot）要用硬件加密就得这样放行 |
| `SP_MIN: Initializing runtime services` | 初始化 SMC（Secure Monitor Call）服务：非安全世界通过 SMC 指令陷入安全世界请求服务 |
| **`SP_MIN: Preparing exit to normal world`** | **关键行**：SP_MIN 准备完毕，即将用 `ERET` 返回非安全世界执行 U-Boot |

> **`Preparing exit to normal world` 这一行是 trusted 模式最本质的体现**：U-Boot 运行在 ARM TrustZone 的 **Normal World**，而 TF-A 的 SP_MIN 在 **Secure World** 待命。basic 版里完全没有这一层——SPL 跑完直接跳 U-Boot，两个世界不分。这也是为什么 trusted 版**能启动 Linux 内核**（Linux 在 Non-secure EL1，需要 PSCI 电源管理服务由 SP_MIN 提供），而 basic 版不行。

**⑦ U-Boot 接管，模式标识改变**

```
U-Boot 2020.01-stm32mp-r1-g392260b4 (Nov 01 2026 - 18:37:09 +0800)
Board: stm32mp1 in trusted mode (st,stm32mp157a-dk1)
```

**对比 basic 版（实验十）的同一行**：

| | 日志行 |
|---|---|
| basic（exp10） | `Board: stm32mp1 in **basic** mode (st,stm32mp157a-dk1)` |
| trusted（exp11） | `Board: stm32mp1 in **trusted** mode (st,stm32mp157a-dk1)` |

这一行由 U-Boot 的 `board/st/stm32mp1/stm32mp1.c` 打印，判断依据是编译时的 `CONFIG_STM32MP1_TRUSTED`。**它是两种模式的分水岭，也是本站唯一的"专属判据"**。

**⑧ 与前面几站的改动全部继承**

```
MMC:   STM32 SD/MMC: 0, STM32 SD/MMC: 1        ← 实验十的 eMMC（F-6）还在
Net:   eth0: ethernet@5800a000                  ← 实验九的网卡驱动（F-5）还在
ethernet@5800a000 Waiting for PHY auto negotiation to complete...... done
Loading Environment from MMC... OK
```

**这一条是"设备树自动继承"最直接的证明**：实验十一只重做了 `.config` 里的三处配置（关 STPMIC1、关 ADC、选 MAXIO），**完全没有碰设备树**，但 F-2（SD 卡 CD 引脚 → 板子能认到 SD 卡）、F-4（关 LTDC）、F-6（eMMC → `SD/MMC: 1`）的改动全都生效了——因为 basic 与 trusted 两种配置编译时读的是**同一份设备树**。

> 补充说明 F-5 的特殊性：网卡驱动改动（`maxio.c` 等）是**代码 + `.config`** 两部分，代码自动继承，但 `CONFIG_PHY_MAXIO=y` 属于配置项，**必须在 trusted 配置里重做**（第 3 节已做）。这也是"只有 `.config` 改动需要重做"这条规律的最佳例证。

**⑨ 结尾的报错都是预期**

```
Wrong Image Format for bootm command
ERROR: can't get kernel image!
```

默认 bootcmd 想从网络 TFTP 拉 `uImage`（服务器 `192.168.0.100` 不存在），失败后回落到本地找内核镜像——而本实验只移植了 U-Boot，**SD 卡的 bootfs 分区里没有 Linux 内核**，所以报"拿不到 kernel image"。这属于"U-Boot 移植实验的正常收尾"，内核移植是后续课程（第 5 章）的内容。

## 五、常见疑问解答

**Q1：为什么 trusted 版的 U-Boot 反而"更大"？**

对比 `u-boot.img`（854420B，basic）与 `u-boot.stm32`（855597B，trusted）——**两者格式不同**，不能互换。`u-boot.img` 是 FIT 格式（内含 DTB，带 FIT 头），由 SPL 解析加载；`u-boot.stm32` 是 STM32 镜像格式（256B 头 + 裸 U-Boot），由 TF-A 的 BL2 加载。

**Q2：为什么 trusted 版启动日志里 DDR 初始化出现在 TF-A 段，而不是 U-Boot 段？**

basic 版里 DDR 由 **SPL** 初始化（实验三里 `RAM: DDR3-DDR3L 16bits 533000Khz` 是 SPL 打印的）；trusted 版里 SPL 不存在，这段由 **TF-A 的 BL2** 完成。U-Boot 启动时 DDR 已可用，所以它只报告 `DRAM: 512 MiB`（检测到的容量），不再做初始化。

**Q3：`WARNING: Skip signature check` 是不是实验没做对？**

不是，这是**教学板的正常状态**。量产设备会部署 ROTPK 并强制校验签名；开发板未烧 OTP 公钥，因此跳过。若真部署了签名校验，我们编译的未签名 U-Boot 会被 TF-A 拒绝加载——这反过来说明当前环境允许自由替换 U-Boot，是本实验得以进行的前提。

**Q4：`Cannot find st,stpmic1 node in DT` 影响功能吗？**

不影响。FS-MP1A 用分立电源方案（实验五 F-1 正是为此删掉 PMIC 节点、改用 6 路固定电源）。TF-A 在设备树里找不到 STPMIC1，于是不走 PMIC 调压路径——与硬件实际情况一致。

**Q5：为什么实验十一只改了 `.config`，前面几站的设备树改动却都还在？**

因为 basic 与 trusted 两种配置编译时读取**同一份设备树文件**。设备树里的时钟树、PMIC 标记等只在 `#ifndef CONFIG_STM32MP1_TRUSTED` 条件段内，trusted 编译时被预处理掉（时钟与电源改由 TF-A 负责）；而 F-2/F-4/F-6 的改动都在条件段之外，因此自动继承。实测日志里 `MMC: STM32 SD/MMC: 0, STM32 SD/MMC: 1` 与 `Net: eth0` + PHY 协商成功，就是继承生效的证据。

## 六、问题与心得

1. **trusted 版移植 = "换个 FSBL + 配置重做一遍"**：设备树自动继承是设计使然（#ifndef CONFIG_STM32MP1_TRUSTED 条件段），理解了这一点，"最小改动法"就不是技巧而是必然；
2. `warning: override: reassigning to symbol` 这类 Kconfig 警告无害，但要看清"以谁为准"；
3. 没有 SPL 的编译是 trusted 版最直观的标志——构建产物的"缺席"本身就是模式切换的证据；
4. 出厂 TF-A 的价值：华清已经替我们完成了 TF-A 的 FS-MP1A 适配（含"Cannot find st,stpmic1 node in DT"的分立电源处理），复用它 = 不重复造轮子；这也是"移植 U-Boot 而不移植 TF-A"这一课程安排的合理性所在；
5. **`STM32 Image size : 855341` 与 `855597 - 256 = 855341` 的对账，是本站最有价值的一处验证**：它证明 TF-A 加载的确实是"我们刚烧进去的那份 U-Boot"，而不是残留的旧镜像。做移植实验时，**在日志里找到"它加载的东西"与"我编译的东西"之间的定量对应关系**，比任何文字描述都可靠；
6. **两个世界（Secure / Non-secure）是 trusted 版的本质**：`SP_MIN: Preparing exit to normal world` 说明 U-Boot 跑在 Normal World，安全服务由 Secure World 的 SP_MIN 通过 SMC 提供。basic 版完全没有这一层，这也是 basic 版无法启动 Linux 的根本原因（Linux 在 Non-secure EL1 需要 PSCI 服务）；
7. **训练"分清预期信息与真实故障"的判断力**：本站日志里有 `WARNING: Skip signature check`、`Cannot find st,stpmic1 node in DT`、`ARP Retry count exceeded`、`can't get kernel image` 四类"看着像问题"的信息，实际上全部属于预期状态。判断标准是：**它们是否影响本站的判据**（`trusted mode` + 版本号 + 前面各站功能继承）；
8. **烧写前的文件头校验不可省**：`53 54 4D 32`（"STM2"）是 STM32 镜像的 Magic Number。头坏了 ROM Code 会直接跳过该分区，现象是"上电零输出"，极易误判成板子坏了或拨码错了。
