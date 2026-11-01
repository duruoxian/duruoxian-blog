---
title: "实验一　安装交叉编译工具链"
date: 2026-10-04
description: "在 Ubuntu 20.04 虚拟机里安装 ST 官方 SDK 交叉工具链 arm-ostl-linux-gnueabi,搞懂 sysroot 与 /stm32env 激活脚本——整个移植系列的地基。"
category: "技术"
tags: [嵌入式, Linux, 交叉编译, U-Boot]
series: "嵌入式Linux实验·U-Boot移植"
draft: false
---

> 开发板：华清远见 FS-MP1A（STM32MP157A，Cortex-A7）
> 实验平台：VMware Workstation + Ubuntu 20.04 虚拟机（`192.168.56.103`，用户 `cnu`）
> 实验日期：2026-10-04

---

## 一、实验目的

1. 给 x86 的 Ubuntu 虚拟机安装 ST 官方 STM32MP1 交叉编译 SDK，使其能编译出在 ARM Cortex-A7 上运行的代码；
2. 掌握"软链接 + `source`"的工具链加载方式，并学会验证工具链是否生效；
3. 安装编译 U-Boot 所需的辅助工具（bison、flex、libncurses5-dev、libyaml-dev、libssl-dev），并安装配置 git（为实验二打补丁做准备）；
4. 为后续 U-Boot / 内核 / 驱动编译打好基础。

## 二、实验环境

| 项目 | 内容 |
|---|---|
| 主机 | Windows 11 |
| 虚拟机 | VMware Workstation 17 + Ubuntu 20.04（IP `192.168.56.103`） |
| 开发板 | FS-MP1A（STM32MP157A） |
| SDK | `en.SDK-x86_64-stm32mp1-openstlinux-5.4-dunfell-mp1-20-06-24`（ST 官方工具链，安装脚本位于其中 `sdk/` 目录） |

## 三、实验原理

开发板 CPU 是 ARM Cortex-A7 架构，PC 是 x86_64 架构。在 x86 PC 上编译出能在 ARM 上运行的程序，必须使用**交叉编译器**。ST 把 gcc（`arm-ostl-linux-gnueabi-gcc`）、目标库、sysroot 和环境脚本打包成 SDK（Yocto 工具链），安装后每次使用前用 `source` 导入环境变量即可。

## 四、实验步骤（实际执行）

### 1. 验证串口——先接好"眼睛"

**做什么**：串口工具连接板载 ST-Link 虚拟串口（COM3），波特率 **115200**、8 数据位、1 停止位、无校验，给开发板上电（或按 RESET），观察输出。

**为什么第一步不是装软件，而是看串口**：后面一系列实验里，板子上发生了什么、报了什么错，全要靠串口告诉我们——串口是整个移植过程的"眼睛"，必须最先确认它是通的。

**实测**（上电抓到的启动日志节选，完整存档见 `实验报告/资料/实验一_串口验证_启动日志.log`）：

```
NOTICE:  CPU: STM32MP157AAA Rev.Z
NOTICE:  Model: HQYJ FS-MP1A Discovery Board
INFO:    Reset reason (0x15):
INFO:      Power-on Reset (rst_por)
INFO:    Using SDMMC
INFO:      Instance 1
INFO:    Boot used partition fsbl1
NOTICE:  BL2: v2.2-r1.0(debug):a70053f              ← TF-A（trusted 模式的 FSBL）
INFO:    RAM: DDR3-DDR3L 16bits 533000Khz
INFO:    Memory size = 0x20000000 (512 MB)
INFO:    Cannot find st,stpmic1 node in DT           ← 板上没有 STPMIC1（FS-MP1A 分立电源）
...
U-Boot 2020.01-stm32mp-r1-g88f08870-dirty (Sep 19 2026 - 14:51:04 +0800)
CPU: STM32MP157AAA Rev.Z
Model: STMicroelectronics STM32MP157A-DK1 Discovery Board
Board: stm32mp1 in trusted mode (st,stm32mp157a-dk1)  ← trusted 模式
DRAM:  512 MiB
MMC:   STM32 SD/MMC: 0, STM32 SD/MMC: 1
```

**从日志读到的三条关键信息**：

1. **板子硬件正常、串口链路正常**——能完整输出 TF-A → U-Boot 的启动流程；
2. `Board: stm32mp1 in trusted mode`——现有固件跑的是 **trusted 模式**（TF-A 先跑）；本系列先移植 **basic 模式**（SPL 先跑），trusted 留到后面；
3. `Model: ... STM32MP157A-DK1`——设备树用的是 **ST 官方 DK1 板**。FS-MP1A 与 DK1 用同一颗 STM32MP157A，这正是实验三"复制 dk1 设备树做模板"的依据。

**结论**：硬件与串口链路就绪，可以放心往下走。

### 2. 把 SDK 传进虚拟机并解压

SDK 安装器通过 Samba 共享（Windows Y 盘 = 虚拟机 `~/share`）传入虚拟机并解压，得到 `stm32mp1-openstlinux-5.4-dunfell-mp1-20-06-24/sdk/` 目录。目录内 6 个长文件名文件中，**`.sh` 结尾的才是安装脚本**（没有 install.sh），另有 `.host.manifest`、`.target.manifest`、`.license`、`.testdata.json`。

### 3. 运行安装脚本

```bash
chmod +x st-image-weston-openstlinux-weston-stm32mp1-x86_64-toolchain-3.1-openstlinux-5.4-dunfell-mp1-20-06-24.sh
./st-image-weston-openstlinux-weston-stm32mp1-x86_64-toolchain-3.1-openstlinux-5.4-dunfell-mp1-20-06-24.sh
```

三次交互：安装目录**直接回车**（默认 `/opt/st/stm32mp1/3.1-openstlinux-5.4-dunfell-mp1-20-06-24`）→ `Proceed [Y/n]?` 输 `Y` → 输入 sudo 密码（无回显）。

### 4. 建立软链接并加载工具链

```bash
sudo ln -s /opt/st/stm32mp1/3.1-openstlinux-5.4-dunfell-mp1-20-06-24/environment-setup-cortexa7t2hf-neon-vfpv4-ostl-linux-gnueabi /stm32env
source /stm32env
```

> 注意：`source`（或 `.`）激活只对**当前终端窗口**有效，新开窗口必须重新执行；工具链必须装在虚拟机本地磁盘（如 /opt/st），不能放共享文件夹（不支持符号链接）。

### 5. 验证工具链（本机实测输出）

```
cnu@cnu-virtual-machine:~$ source /stm32env
cnu@cnu-virtual-machine:~$ echo $CC
arm-ostl-linux-gnueabi-gcc -mthumb -mfpu=neon-vfpv4 -mfloat-abi=hard -mcpu=cortex-a7 --sysroot=/opt/st/stm32mp1/3.1-openstlinux-5.4-dunfell-mp1-20-06-24/sysroots/cortexa7t2hf-neon-vfpv4-ostl-linux-gnueabi
cnu@cnu-virtual-machine:~$ $CC
arm-ostl-linux-gnueabi-gcc: fatal error: no input files
compilation terminated.
```

`echo $CC` 输出完整的交叉编译器命令行（含 `-mthumb -mfpu=neon-vfpv4 -mfloat-abi=hard -mcpu=cortex-a7 --sysroot=...`）；直接执行 `$CC` 报 `no input files` 属正常（没给输入文件），出现 `arm-ostl-linux-gnueabi-gcc` 字样即说明工具链已生效。

### 6. 安装编译依赖工具

编译 U-Boot（以及后续的内核、根文件系统）还需要一批主机端工具，按课件逐个安装：

```bash
sudo apt update
sudo apt install bison              # 语法分析器生成器：Kconfig（make menuconfig）解析配置用
sudo apt install flex               # 词法分析器生成器：与 bison 配套，Kconfig 需要
sudo apt install libncurses5-dev    # ncurses 开发库：支撑 menuconfig 图形化配置界面
sudo apt install libyaml-dev        # YAML 解析库：后续构建工具使用
sudo apt install libssl-dev         # OpenSSL 开发库：mkimage 等主机工具的加密/校验支持
```

**实测验证**（逐包确认 + 版本输出）：

```
$ bison --version
bison (GNU Bison) 3.5.3
$ flex --version
flex 2.6.4
$ dpkg -s libncurses5-dev libyaml-dev libssl-dev    # 均为 Status: install ok installed
```

### 7. 安装并配置 git（为实验二打补丁做准备）

实验二要用 `git am` 给 U-Boot 打 ST 的 6 个补丁——git 会把补丁还原成一条条提交，**创建提交必须知道作者是谁**，所以 git 不仅要装，还要配置全局用户名和邮箱（不配置的话 `git am` 会直接拒绝工作）：

```bash
sudo apt install git-core gitk      # git-core 在 Ubuntu 20.04 上等同于 git；gitk 是图形化历史查看器
git config --global user.name  "cnu"
git config --global user.email "drx00112233@qq.com"
```

**实测验证**：

```
$ git --version
git version 2.25.1
$ dpkg -s gitk                      # Status: install ok installed
```

> 说明：课件提供的另一个串口工具 minicom（Linux 端，设备 /dev/ttyACM0）为可选项——本系列实验在 Windows 端直接读板载 ST-Link 虚拟串口（COM 口），minicom 未安装也不影响任何实验。

## 五、实验结果

| 检查项 | 实测结果 |
|---|---|
| 工具链安装目录 `/opt/st/stm32mp1/3.1-openstlinux-5.4-dunfell-mp1-20-06-24/` | 存在，含 environment-setup 脚本 |
| 软链接 `/stm32env` | 建立成功（指向 environment-setup-cortexa7t2hf-neon-vfpv4-ostl-linux-gnueabi） |
| `echo $CC` | 输出 `arm-ostl-linux-gnueabi-gcc -mthumb -mfpu=neon-vfpv4 ...` |
| 执行 `$CC` | `fatal error: no input files`（正常，工具链生效） |
| bison / flex / git | 3.5.3 / 2.6.4 / 2.25.1 |
| libncurses5-dev / libyaml-dev / libssl-dev / gitk | dpkg 确认均为 install ok installed |

**结论**：交叉编译工具链安装、激活、验证全部通过，后续 U-Boot 编译环境就绪。

## 六、问题与心得

1. **为什么必须交叉编译**：宿主机与目标机架构不同（x86_64 → ARMv7），普通 gcc 编出的程序目标机无法运行。
2. **`source` 与 `./` 的区别**：`./xxx.sh` 在子进程中执行，环境变量随子进程退出而消失；`source` 在当前 shell 中执行，变量保留。所以每个新终端都要重新 `source /stm32env`。
3. 忘记激活工具链时编译的特征报错：`cc1: error: bad value ('generic-armv7-a') for '-mtune=' switch`（宿主 gcc 不认识 ARM 参数）。
4. SDK 很大（约 949 MB），用 Samba 共享盘（Y 盘）传输比 U 盘/拖拽方便；路径不能有中文和空格。
