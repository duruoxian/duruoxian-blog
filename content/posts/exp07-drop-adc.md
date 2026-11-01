---
title: "实验七　F-3 去掉 ADC 功能"
date: 2026-10-04
description: "FS-MP1A 没有对应的 ADC 外接电路:menuconfig 里关掉 ADC 支持并重新编译,让 U-Boot 更干净。"
category: "技术"
tags: [嵌入式, U-Boot, Linux]
series: "嵌入式Linux实验·U-Boot移植"
draft: false
---

> 开发板：华清远见 FS-MP1A（STM32MP157A）　实验日期：2026-10-04

---

## 一、实验目的

1. 理解实验六日志中 ADC 报错的根因：DK1 通过 **ADC 检测开机电流**（vrefbuf 供基准电压 → 开 ADC → 采样），FS-MP1A **没有这条电路**；
2. 掌握 menuconfig 关闭功能项的方法（等价于修改 `.config`）：关闭 `CONFIG_CMD_ADC`（adc 命令）与 `CONFIG_ADC`（ADC 驱动）两项；
3. 重新编译烧写，验证三条 ADC 报错消失、其余行为不变。

## 二、实验原理

- `stm32 vrefbuf timed out: -110`：vrefbuf（基准电压缓冲）为 ADC 供电；`adc@0: can't enable vdd-supply!` / `single shot failed`：ADC 采样失败。整条"供基准 → 开 ADC → 采样"检测链都是 DK1 的开机电流检测，FS-MP1A 上硬件缺失，每条都超时报 -110；
- U-Boot 的功能开关有两层：`CONFIG_CMD_ADC`（命令行有没有 `adc` 命令）与 `CONFIG_ADC`（驱动模型里的 ADC 驱动），**两项都要关**；
- 关驱动是 C 代码级的增删，比重编设备树（实验六）要重编、重链更多东西。

## 三、实验步骤（实际执行）

### 1. 切出实验分支，确认当前 ADC 是开的

```bash
git checkout -b exp7-f3 exp6-f2
grep -E "^CONFIG_(CMD_)?ADC=y" .config
```

实测：

```
CONFIG_CMD_ADC=y
CONFIG_ADC=y
```

两行都在——现在的镜像带着完整 ADC 功能，正是报错来源。

### 2. 关闭两个 ADC 开关（menuconfig 的脚本化等价操作）

课件路径：`Command line interface → Device access commands → [ ] adc` 与 `Device Drivers → [ ] Enable ADC drivers using Driver Model`。本实验通过修改 `.config` + `olddefconfig` 实现等价操作：

```bash
sed -i 's/^CONFIG_ADC=y/# CONFIG_ADC is not set/' .config
sed -i 's/^CONFIG_CMD_ADC=y/# CONFIG_CMD_ADC is not set/' .config
make olddefconfig
```

**实测自检**：

```
--- 关闭后 ADC 配置(应恰好两行 not set):
# CONFIG_CMD_ADC is not set
# CONFIG_ADC is not set
--- 确认已无 =y:
(无输出=已关干净)
```

### 3. 配置固化 + git 提交

按实验五定下的规矩，`.config` 的改动必须固化回 defconfig：

```bash
cp .config configs/stm32mp15_fsmp1a_basic_defconfig
git add configs/stm32mp15_fsmp1a_basic_defconfig
git commit -m "exp7 F-3: 去掉 ADC 功能(关闭 CMD_ADC 与 DM ADC)"
```

实测提交：`84ac5189`。

### 4. 重新编译

```bash
make -j2 all DEVICE_TREE=stm32mp157a-fsmp1a
```

实测以 `MKIMAGE spl/u-boot-spl.stm32 → COPY u-boot-spl.stm32 → CFGCHK u-boot.cfg` 收尾。**u-boot.img 从 860638 缩到 853438 字节（-7200）**——ADC 驱动代码被移出的直接体现；SPL 不含 ADC，大小不变（98921）。

### 5. 烧写（三条 dd 全烧）+ 上电验证

```
sdb1/sdb2: 各 98921 字节；sdb3: 853438 字节
回读校验: md5 一致 ✓
```

**实测串口日志**（经 `version` + `reset` 抓取完整启动，存档 `serial_exp7_boot.log`）：

```
[CMD> version]
version
U-Boot 2020.01-stm32mp-r1-g84ac5189 (Oct 04 2026 - 21:47:47 +0800)
...
[CMD> reset]
resetting ...
U-Boot SPL 2020.01-stm32mp-r1-g84ac5189 (Oct 04 2026 - 21:47:47 +0800)
...
Trying to boot from MMC1

U-Boot 2020.01-stm32mp-r1-g84ac5189 (Oct 04 2026 - 21:47:47 +0800)
CPU: STM32MP157AAA Rev.Z
Board: stm32mp1 in basic mode (st,stm32mp157a-dk1)
DRAM:  512 MiB
MMC:   STM32 SD/MMC: 0
Loading Environment from MMC... OK
In:    serial
Out:   serial
Err:   serial
Net:   eth0: ethernet@5800a000        ← Err 之后直接就是 Net！
Hit any key to stop autoboot:  5 4 3 2 1 0
EQOS_DMA_MODE_SWR stuckFAILED: -110（×2）
Wrong Image Format for bootm command
STM32MP>
```

## 四、实验结果

| 判据 | 结果 |
|---|---|
| `Err: serial` 与 `Net:` 之间的三条 ADC 报错 | ✅ **全部消失**（连 vrefbuf 也没了——ADC 一关，检测链不执行） |
| 其余行为 | ✅ 完全不变（网卡报错=F-5 对象、停 `STM32MP>` 命令行） |
| 版本串 `g84ac5189` 且无 `-dirty` 后缀 | ✅ 配置改动已入库，跑的正是 F-3 提交的镜像 |
| 产物体积 | ✅ u-boot.img -7200 字节（ADC 驱动移除） |

## 五、问题与心得

1. **menuconfig 与直接改 .config 是等价的**：menuconfig 的本质就是编辑 .config，脚本化修改 + `olddefconfig` 适合自动化场景，手工场景用 menuconfig 更直观（按 `/` 可搜索配置项）；
2. **.config 是构建产物不入 git**（被 .gitignore 忽略），改动必须 `cp .config configs/xxx_defconfig` 固化，否则下次 `make xxx_defconfig` 全部冲掉；
3. 版本串无 `-dirty` 后缀说明工作区干净——这也是提交完成的旁证；
4. 报错"消失"类实验的验证点在于**对照**：只有把实验六的日志留着对比，才能确认"少的三行"确实是被本实验修掉的。
