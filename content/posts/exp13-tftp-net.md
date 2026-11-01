---
title: "实验13|网络操作命令——Ubuntu 里搭 TFTP 服务器，板子第一次从网络拉文件"
date: 2026-11-01
description: "Windows 侧搭 TFTP 服务器,U-Boot 里 tftpboot 拉文件:ipaddr/serverip/ethaddr 网络三件套实战。"
category: "技术"
tags: [嵌入式, U-Boot, TFTP, 网络]
series: "嵌入式Linux实验·U-Boot使用"
draft: false
---

> 开发板：华清远见 FS-MP1A（STM32MP157A）　实验日期：2026-11-01
> **最终状态：Ubuntu TFTP 服务器搭建完成（`tftpd-hpa`，UDP 69 监听，根目录 `/home/cnu/tftpboot`）；板子 `ping` 通服务器（`host 192.168.0.100 is alive`）；`tftpboot` 成功拉取 31B 测试文件与 241984B 的 TF-A 镜像（3 MiB/s）。**

---

## 一、实验目的

1. 在 Ubuntu 虚拟机里搭建 TFTP 服务器（`tftpd-hpa`），理解 TFTP 基于 UDP 69 端口的文件传输机制；
2. 给虚拟机增加一块**桥接网卡**，使板子（物理设备）与虚拟机处于同一二层网段；
3. 板子侧配置 `serverip` 并用 `ping` / `tftpboot` 完成网络连通性与文件拉取验证，为后续用 TFTP 加载内核（实验十六）打基础。

## 二、实验环境

| 项目 | 内容 |
|---|---|
| 虚拟机 | VMware + Ubuntu 20.04：ens33（NAT，上网用）、ens34（仅主机）、**ens38（桥接，新增，`192.168.0.100/24`）** |
| 开发板 | FS-MP1A，trusted 版 U-Boot `g392260b4`，`ipaddr=192.168.0.8`、`ethaddr=1A:1F:DB:0E:69:FD`（实验十二设置） |
| 物理链路 | 板子网口 ↔ 电脑板载网卡（Realtek Gaming GbE，`以太网`）网线直连 |
| 软件 | `tftpd-hpa`（服务器）+ `tftp-hpa`（客户端） |

## 三、实验原理

TFTP（简单文件传输协议）跑在 **UDP 69** 上，无认证、按块（512B）传输、停等确认——正因为足够"简单"，U-Boot 里只需要极小的协议栈就能拉文件，所以它成了裸机阶段加载内核的标准方式。

板子是物理设备，虚拟机里的 TFTP 服务器要收到它的包，必须让虚拟机的一块网卡**桥接**到板子所插的物理网卡上：桥接模式下 VMware 把虚拟网卡直接挂进物理网段的二层，板子（192.168.0.8）和虚拟机（192.168.0.100）像插在同一个交换机下一样通信。Windows 侧由 `VMware Bridge Protocol`（vmnetbridge）驱动承担这一角色，每张物理网卡桥接到哪个 vmnet 记录在注册表 `VMnetbridge\Parameters\Adapters\<网卡GUID>` 的 `VMnet` 值里，`0xffffffff` 表示"自动"。

## 四、实验步骤（实际执行）

> Ubuntu 侧命令均在虚拟机终端；板子侧命令在 `STM32MP>` 提示符。原始日志：`资料/serial_exp13_ping.log`、`资料/serial_exp13_tftp.log`。

### 1. 虚拟机关机，加第三块网卡（桥接）

`sudo poweroff` 后在虚拟机 `.vmx` 中追加：

```
ethernet2.present = "TRUE"
ethernet2.connectionType = "bridged"
ethernet2.virtualDev = "e1000"
ethernet2.addressType = "static"
ethernet2.address = "00:50:56:3C:12:34"
ethernet2.startConnected = "TRUE"
```

重新开机，`ip -o link` 可见新网卡 **ens38**（MAC 与 vmx 一致，靠静态 MAC 定位）。

### 2. Ubuntu：安装 TFTP 服务并配置根目录

```bash
sudo apt install tftpd-hpa tftp-hpa
mkdir -p /home/cnu/tftpboot
sudo chmod 777 /home/cnu/tftpboot
```

编辑 `/etc/default/tftpd-hpa`，把 `TFTP_DIRECTORY` 改为 `/home/cnu/tftpboot`，重启服务后 `ss -uln` 确认 **UDP 0.0.0.0:69 监听中**。放入测试文件：

```bash
echo "hello from ubuntu tftp (exp13)" > /home/cnu/tftpboot/exp13-test.txt
```

### 3. ens38 配置静态 IP

```bash
sudo ip addr add 192.168.0.100/24 dev ens38
sudo ip link set ens38 up
ip -4 addr show ens38      # inet 192.168.0.100/24
```

（重启丢失，持久化配置见"问题与心得"第 5 条。）

### 4. 板子侧设定 serverip 并保存

```bash
setenv serverip 192.168.0.100
saveenv
print serverip
```

实测：`saveenv` 回显 `Writing to MMC(0)... OK`；`print serverip` 回显 `serverip=192.168.0.100`（覆盖出厂默认的 `192.168.1.1`）。

### 5. 连通性验证：板子 ping 服务器

```bash
ping 192.168.0.100
```

实测回显 **`host 192.168.0.100 is alive`**。

### 6. TFTP 拉取文件：小文件 + 大文件各一次

```bash
tftpboot 0xc0000000 exp13-test.txt
tftpboot 0xc1000000 tf-a-stm32mp157a-fsmp1a-trusted.stm32
```

实测（大文件）：

```
TFTP from server 192.168.0.100; our IP address is 192.168.0.8
Filename 'tf-a-stm32mp157a-fsmp1a-trusted.stm32'.
Load address: 0xc1000000
Loading: #################
	 3 MiB/s
done
Bytes transferred = 241984 (3b140 hex)
```

小文件实测 `Bytes transferred = 31 (1f hex)`，与源文件字节数完全一致。

## 五、实验结果

| 检查项 | 实测结果 |
|---|---|
| tftpd-hpa 服务 | `ss -uln` 见 `0.0.0.0:69` 监听 |
| ens38 桥接网卡 | `192.168.0.100/24`，桥接至板子所插物理网卡 |
| 板子 `ping` | `host 192.168.0.100 is alive` |
| `serverip` | 已由 `192.168.1.1` 改为 `192.168.0.100` 并 `saveenv` |
| TFTP 小文件 | `Bytes transferred = 31 (1f hex)`，与源一致 |
| TFTP 大文件（TF-A） | `Bytes transferred = 241984 (3b140 hex)`，3 MiB/s |

**结论**：TFTP 服务器与板子-虚拟机网络链路全部打通，板子首次从网络成功拉取文件。

## 六、问题与心得

1. **VMnet0"自动桥接"是本次最大的坑**：桥接网卡加上后板子怎么都 ping 不通虚拟机。在虚拟机里 `tcpdump -i ens38 arp` 抓包——板子的 ARP 请求一个都进不来，而宿主机自己是通板子的（板子停在提示符时本就不应答网络包，判断依据必须是让板子主动 `ping`）。最终定位：vmnetbridge 的"自动"模式按优先级把桥落在了 WLAN 上，插板子的 Realtek 根本没被桥接。修复 = 在注册表 `VMnetbridge\Parameters\Adapters\{Realtek-GUID}` 下把 `VMnet` 值从 `0xffffffff`（自动）钉成 `0`（VMnet0），再 `netsh` 把网卡禁用/启用一次让桥重载——这正是虚拟网络编辑器"桥接至：手动指定"按钮在底层做的事。
2. **vnetlib64 在 Workstation 17 已不能独立运行**（`vminstlog` 明说 `not intended to be run as a standalone application`），网上"用 vnetlib 改桥接"的老教程在新版全部失效，只能走注册表或图形界面。
3. **U-Boot 停在提示符时不收网络包**：想用宿主机 ping 板子验证链路是行不通的，必须让板子自己发起 `ping`/`tftpboot`——"谁主动谁有流量"。
4. **`tftpboot` 的字节数回显就是校验**：`Bytes transferred = N` 与源文件大小一致即传输无损，无需额外 md5（实验二十拉内核时这行就是第一判据）。
5. `serverip` 出厂默认是 `192.168.1.1`，不改直接 tftp 会 ARP 超时——实验十二已把它改到 `192.168.0.100` 并存盘。
