---
title: "给 GRUB 换新衣：手绘 7 套开机主题"
date: 2026-10-06
description: "从赛博朋克到卡通熊猫：用 Pillow 一笔一笔程序化画出 7 套 2560×1440 的 GRUB2 开机主题，附一键安装脚本和生成器。"
category: "项目"
tags: ["Linux", "GRUB", "Manjaro", "美化", "开源"]
cover: "/images/posts/grub-themes/panda.jpg"
---

开机页面大概是每台电脑最容易被忽视的界面——每天都要看一眼，却常年顶着黑底白字。这阵子我给 grub-themes 项目画了 7 套 GRUB2 开机主题，全部按 2560×1440 原生分辨率设计，背景、字体、菜单面板都是程序化绘制加手工调校出来的。

## 七套主题

**neongrid · 赛博朋克**：霓虹城市天际线，青色透视网格地平线，品红×青双色辉光。

![neongrid](/images/posts/grub-themes/neongrid.jpg)

**retrowave · 复古合成波**：1984 年的落日带扫描线，山脉剪影加粉色网格。

![retrowave](/images/posts/grub-themes/retrowave.jpg)

**matrix · 黑客帝国**：满屏绿色代码雨，每列有随机的亮度衰减和"数字头"。

![matrix](/images/posts/grub-themes/matrix.jpg)

**nebula · 深空星野**：星云、星野和十字星芒，安静但不单调。

![nebula](/images/posts/grub-themes/nebula.jpg)

**panda · 卡通熊猫**：Q 版三头身小熊猫坐在山坡上，配竹丛、爪印小路和蝴蝶，标题是彩色圆胖字。

![panda](/images/posts/grub-themes/panda.jpg)

**clean · 极简**：薰衣草紫到蜜桃橙的柔焦极光渐变，发丝分割线加珊瑚橙点缀。

![clean](/images/posts/grub-themes/clean.jpg)

**blockterm · 终端方块**：灵感来自 opencode 的 logo——纯黑底、方块像素字双色 wordmark、细灰边框方角面板，等宽字体终端风。

![blockterm](/images/posts/grub-themes/blockterm.jpg)

## 几个实现细节

**背景全部是画出来的，不是找的图。** 每套主题的背景由 `gen.py`（Pillow）程序化生成：渐变天空、高斯模糊 + screen 混合做的辉光、九宫格切图做的半透明菜单面板和高亮条。想改配色或者标题文字，改几行配置重跑就行。

**GRUB 字体名是个坑。** `theme.txt` 里引用的字体名必须和 PF2 文件的内嵌名（家族 + 样式 + 字号，比如 `NGItem Regular 30`）完全一致，差一个字就静默回退到默认字体。生成器现在会用 `strings` 从 PF2 里读出真实内嵌名再写进 `theme.txt`，保证精确匹配。

**预览即所得。** 每个主题目录里的 `preview.png` 是用和 `theme.txt` 完全相同的几何参数渲染出来的，不用重启就能确认效果——上面这些截图就是预览图本身。

还有一个藏得最深的坑：GRUB 2.12 重写了主题解析器，`left = 50% - 630` 这种老教程里随处可见的百分比算术写法会让整个主题**静默失效**（连报错都一闪而过）。我是用 QEMU + OVMF 在本机模拟真实 GRUB 启动才抓到这条报错的，最后全部改成了纯像素坐标，七套主题逐一套真机渲染验证过。

## 安装与使用

**环境要求**：GRUB 2.06+（已在 Manjaro / GRUB 2.14 验证）、UEFI + gfxterm 启动。主题按 2560×1440 设计，安装脚本会设置 `GRUB_GFXMODE=2560x1440,1920x1080,auto`，不支持 1440p 的机器会自动降到 1080p。

**一键安装**：

```bash
git clone https://github.com/duruoxian/grub-themes.git
cd grub-themes
sudo ./install.sh            # 交互式选择主题
sudo ./install.sh blockterm  # 或直接指定主题名
```

脚本会自动：备份 `/etc/default/grub` → 复制主题到 `/boot/grub/themes/` → 设置 `GRUB_THEME` / `gfxterm` / `GRUB_GFXMODE` → 重新生成 `grub.cfg`。重启即可生效。

**切换主题**：再跑一次 `sudo ./install.sh <另一个主题名>` 就行。

**恢复安装前的配置**（脚本每次运行都会备份到 `/etc/default/grub.bak-时间戳`）：

```bash
sudo cp /etc/default/grub.bak-时间戳 /etc/default/grub
sudo grub-mkconfig -o /boot/grub/grub.cfg
```

**彻底卸载某个主题**：

```bash
sudo rm -rf /boot/grub/themes/主题名
sudo sed -i '/^GRUB_THEME=/d' /etc/default/grub
sudo grub-mkconfig -o /boot/grub/grub.cfg
```

**手动安装**（不想用脚本的话）：把主题目录复制到 `/boot/grub/themes/`，在 `/etc/default/grub` 里加上 `GRUB_THEME="/boot/grub/themes/主题名/theme.txt"`、`GRUB_TERMINAL_OUTPUT=gfxterm` 和 `GRUB_GFXMODE=2560x1440,1920x1080,auto`，然后 `sudo grub-mkconfig -o /boot/grub/grub.cfg`。

**自定义**：每套主题的背景都由仓库里的 `gen.py`（Pillow）生成，配色、标题、菜单位置都集中在 `THEMES` 配置里，改完 `python3 gen.py 主题名` 重新生成、复制回 `/boot/grub/themes/` 即可。

仓库地址：**[github.com/duruoxian/grub-themes](https://github.com/duruoxian/grub-themes)**（MIT 协议），欢迎 star 和提 issue。
