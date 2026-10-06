---

title: "SysMonitor：用纯 C 写一个钉在桌面上的系统监视器"

date: 2026-10-06

description: "737 行 C + X11 + FreeType：常驻内存 8.7MB、二进制 38KB 的透明桌面组件，CPU/内存/磁盘/网络每秒刷新，U 盘插拔自动增减行数。"

category: 项目

tags: ["C", "Linux", "X11", "开源"]

cover: /images/posts/sysmonitor-c-x11/cover.svg

---

我想要一个常驻桌面角落的系统监视器：CPU、内存、磁盘、网络一屏全览，但不想要一个吃 200MB 内存的「监视器」。现有的桌面组件要么功能堆叠太重，要么定制起来比手写还累。

于是有了 **SysMonitor**：**737 行纯 C，只依赖 X11 和 FreeType**，本机实测常驻内存 **8.7MB**，二进制 **38KB**。没有 GTK、没有 Qt、没有 Cairo，连 PNG 图标都没有。

## 它长什么样、能干什么

钉在桌面上的一块半透明文字板，每秒刷新：

- **CPU、内存、交换分区**，所有磁盘分区（自动枚举，`/boot/efi` 这类引导分区自动跳过）、**网络上下行、开机时长、时钟**；
- **桌面组件模式**（默认）：钉在桌面层、所有工作区可见、不进任务栏，普通窗口可以正常盖住它——是「桌面的一部分」而不是「一个弹窗」；
- **左键按住拖动**，位置自动记忆，重启后回到原地；
- **U 盘插拔**：磁盘行数自动增减，窗口高度跟着变；
- 右键菜单：暂停刷新 / 退出；开机自启动（`~/.config/autostart/`）。

背景是 ARGB 半透明（合成器合成），只有一层极淡的深蓝背板保证可读性；全套蓝色字体。

## 几个实现要点

### 透明：32 位 ARGB 视觉

X11 里想要「真透明」不能只画背景色，要选一块 **32 位 ARGB 视觉**并让合成器参与合成：

```c
int have32 = (XMatchVisualInfo(dpy, scr, 32, TrueColor, &vi) != 0);
if (have32) { depth = 32; vis = vi.visual; }
```

整个渲染是自己维护的一块 `uint32` 帧缓冲（每像素 ARGB），最后用 `XCreateImage(..., ZPixmap, ...)` 一次性推给 X 服务端。没有 32 位视觉的场合（比如无合成器的纯 TWM）会退化为深色底，功能不受影响。

### 文字：FreeType 直接混合

没有 Xft，FreeType 渲染出的字形位图直接**按 alpha 混合进自己的帧缓冲**。顺带做了两个健壮性细节：

- 启动时用 `FT_Get_Char_Index(face, 0x4E2D)`（「中」字）检测字体是否有 CJK 字形，没有就换候选字体；
- 检测 ↑↓ 箭头字形，缺字形就退化成 `^` `v`，避免显示成方框。

### 「钉在桌面上」：EWMH 状态组合

桌面组件模式 = 一组 EWMH 窗口状态的组合拳：

```
_NET_WM_STATE_BELOW      （压在普通窗口下面）
_NET_WM_STATE_STICKY     （所有工作区可见）
_NET_WM_STATE_SKIP_TASKBAR / SKIP_PAGER（不进任务栏和分页器）
```

想要「永远置顶」风格，把源码顶部 `ALWAYS_ON_TOP` 改成 `1`，换成 `_NET_WM_STATE_ABOVE` 重编译即可。

### 事件循环：select 定时器

主循环就是 `select()` 带超时：1 秒醒一次刷数据，X 事件随时处理（拖动、右键菜单）。不搞多线程——一个监视器而已，够用就好。

### 数据来源：全是 /proc

`/proc/stat`（CPU）、`/proc/meminfo`（内存）、`/proc/net/dev`（网络）、`/proc/uptime`（开机时长）、`/proc/mounts`（磁盘枚举，配合 `statvfs` 取用量）。Linux 的一切都在 /proc 里，这是纯 C 能做到这么小的根本原因。

## 构建与安装（Manjaro/Arch）

```bash
sudo pacman -S --needed gcc libx11 fontconfig pkgconf
make
sudo make install autostart   # 装到 /usr/local/bin 并创建自启动项
sysmonitor &                  # 立即运行，无需重启
```

## 写在最后

这个项目的乐趣在于「**用最少的依赖做一件完整的事**」：没有框架，每一字节内存、每一个窗口属性都是自己显式管理的。如果你也想写一个，从读 `/proc` 和 `XCreateSimpleWindow` 开始就行，剩下的都是体力活。

源码：[github.com/duruoxian/SysMonitor](https://github.com/duruoxian/SysMonitor)（MIT）
