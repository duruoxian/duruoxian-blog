---
title: "实验19|内核源码准备与配置——装编译器、打补丁、生成 FS-MP1A 的 defconfig"
date: 2026-11-01
description: "内核源码就位:defconfig 与 menuconfig 配置流程,内核裁剪从哪里下手。"
category: "技术"
tags: [嵌入式, Linux内核, 设备树]
series: "嵌入式Linux实验·内核移植"
draft: false
---

> 开发板：华清远见 FS-MP1A（STM32MP157A）　实验日期：2026-11-01
> **最终状态：交叉编译器就位（`/usr/local/arm`，PATH 生效）；vanilla `linux-5.4.31` + ST 官方 23 个补丁全部打上（0 残片）；源码 git 化（`new kernel`）并切出 `WORKING` 分支；`multi_v7_defconfig` + 4 个 fragment 合并后 `CONFIG_ARCH_STM32=y`，配置存档为 `stm32_fsmp1a_defconfig`。**

---

## 一、实验目的

1. 安装 ARM 官方交叉编译器 gcc-arm-9.2（arm-none-linux-gnueabihf-）并配置 PATH；
2. 获取内核源码并打上 ST 的 23 个 stm32mp1 补丁，得到与 OpenSTLinux `dunfell-mp1-20-06-24` 发布版等价的内核树；
3. 用 `multi_v7_defconfig` + ST 官方 fragment 合并出 FS-MP1A 可用配置，存档为自有 defconfig。

## 二、实验环境

| 项目 | 内容 |
|---|---|
| 虚拟机 | Ubuntu 20.04（4 vCPU / 4GB） |
| 编译器 | gcc-arm-9.2-2019.12（264181856 字节，清华镜像版） |
| 内核源码 | vanilla `linux-5.4.31.tar.xz`（109511080 字节，清华内核镜像）+ **ST 官方 23 个补丁**（GitHub `meta-st-stm32mp` 层 `openstlinux-5.4-dunfell-mp1-20-06-24` 标签，`recipes-kernel/linux/linux-stm32mp/5.4/5.4.31/0001~0023`，即 en.SOURCES 材料包补丁的上游源头） |
| 配置碎片 | ST 官方 4 个 fragment：03-systemd / 04-optee / 05-modules / 06-signature |
| 初始设备树 | `kernel-初始设备树.zip`：`stm32mp157a-fsmp1a.dts`（724B）+ `stm32mp15xx-fsmp1x.dtsi`（3662B） |

## 三、实验原理

课程原方案从 en.SOURCES 材料包取"内核源码包 + 23 个补丁"。en.SOURCES 本身由 Yocto 层构建而来——meta-st-stm32mp 层里 `recipes-kernel/linux/linux-stm32mp/5.4/5.4.31/` 下的 23 个补丁（0001-ARM-stm32mp1-r1-MACHINE → 0023-ARM-stm32mp1-r1-PERF）就是它的源头。因此"vanilla 内核 + meta 层补丁"与"材料包内源码 + 补丁"是**同一棵树的两条获取路径**，本实验采用前者（GitHub 公开可下，逐字节等价）。补丁按文件名序 0001→0023 依次 `patch -p1` 应用；fragment 配置在 `multi_v7_defconfig` 之上用 `merge_config.sh -m -r` 逐个合并，最后 `oldconfig` 落定新选项。

## 四、实验步骤（实际执行）

> 全部在 Ubuntu 终端执行。内核工作目录：`~/share/stm32mp1-openstlinux-5.4-dunfell-mp1-20-06-24/sources/arm-ostl-linux-gnueabi/linux-stm32mp-5.4.31-r0/`。

### 1. 编译器就位

清华镜像的 gcc-arm-9.2 包本地已留有同名副本，字节数核验一致（264181856）后直接使用；解压到 `/usr/local/arm/`（本地磁盘，**不能放共享文件夹**——不支持符号链接），`/etc/profile` 末尾追加 PATH 后新终端生效：

```bash
sudo tar xf gcc-arm-9.2-2019.12-x86_64-arm-none-linux-gnueabihf.tar.xz -C /usr/local/arm/
export PATH=$PATH:/usr/local/arm/gcc-arm-9.2-2019.12-x86_64-arm-none-linux-gnueabihf/bin
arm-none-linux-gnueabihf-gcc --version
```

### 2. 源码与补丁、fragment、初始设备树布局

按课程目录结构布置 `linux-stm32mp-5.4.31-r0/`：`linux-5.4.31.tar.xz` + `0001~0023` 补丁 + `fragment-03/04/05/06.config` 同级摆放；初始设备树解压至 `~/share/kernel-初始设备树/`。

### 3. 解压源码、打 23 个补丁

```bash
tar xfJ linux-5.4.31.tar.xz
cd linux-5.4.31
for p in ../0*.patch; do patch -p1 --silent < "$p"; done
```

实测：**23/23 全部 OK，`.rej` 残片 0 个**。

### 4. 源码 git 化 + WORKING 分支

```bash
git init
git add .
git commit -m "new kernel"
git checkout -b WORKING
```

实测：基线提交 `6959c5e new kernel`，当前分支 `WORKING`，工作区干净。

### 5. 配置：multi_v7_defconfig + fragment 合并 + oldconfig

```bash
make ARCH=arm multi_v7_defconfig
for f in ../fragment*.config; do scripts/kconfig/merge_config.sh -m -r .config "$f"; done
yes '' | make ARCH=arm oldconfig
```

（`yes ''` 对合并中出现的新选项全部回车取默认；两个单引号不能写成双引号，否则 oldconfig 卡住。）

### 6. 验证 ST 平台并存档 defconfig

```bash
grep CONFIG_ARCH_STM32 .config     # CONFIG_ARCH_STM32=y
cp .config arch/arm/configs/stm32_fsmp1a_defconfig
make ARCH=arm stm32_fsmp1a_defconfig   # # No change to .config #
```

实测：`CONFIG_ARCH_STM32=y`；存档后重载回 `# No change to .config #`——存档与当前配置一字不差。以后每次重编内核前 `make ARCH=arm stm32_fsmp1a_defconfig` 一条恢复。

## 五、实验结果

| 检查项 | 实测结果 |
|---|---|
| 编译器 | `/usr/local/arm/gcc-arm-9.2-.../bin`，版本 9.2.1，PATH 生效 |
| 补丁 | 23/23 OK，`.rej` 残片 0 |
| git | `6959c5e new kernel` + `WORKING` 分支，工作区干净 |
| 平台配置 | `CONFIG_ARCH_STM32=y` |
| defconfig 存档 | `arch/arm/configs/stm32_fsmp1a_defconfig`，重载 `# No change to .config #` |

**结论**：内核源码、补丁、配置三件事全部就位，可以进入编译（实验二十）。

## 六、问题与心得

1. **en.SOURCES 与 meta 层同源**：材料包里的补丁就是 Yocto layer 里的补丁。材料包缺失时，"vanilla 内核 + GitHub 层补丁"是完全等价的获取路径——关键是认准发布标签（`openstlinux-5.4-dunfell-mp1-20-06-24`），版本错一个字补丁就对不上底包。
2. **补丁顺序即文件名序**：0001~0023 按 `../0*.patch` 的字典序应用，任何一条 `FAILED` 都必须停下核对底包版本，硬打会把树搞成四不像。
3. **`merge_config.sh -m -r` 的意义**：`-m` 只合并不编译、`-r` 去掉冗余项——多份 fragment 叠加时保证"后合并的覆盖前面的"，顺序由文件名编号决定。
4. **`yes '' | make oldconfig`**：新选项全部回车取默认值；两个单引号不能写成双引号（双引号会把空串当字面参数，oldconfig 卡在交互）。
5. **defconfig 的价值**：存档 + `No change` 验证后，`.config` 从此有了"一键还原点"，编译实验（实验二十）改崩了随时一条命令回到起点。
