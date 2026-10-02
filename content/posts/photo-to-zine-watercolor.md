---
title: "把旅行照片变成水彩明信片：我写了一个 AI 技能"
date: 2026-10-02
description: "一个开源 skill，把旅行照片批量转成 zine 风格的水彩卡片。双模式、人像锁定、批量流程、白色水印修复，已在 17 张真实照片上完整跑通。"
category: "项目"
tags: ["开源", "AI", "摄影", "水彩"]
cover: "/images/posts/photo-to-zine-watercolor/lijiang-lake-postcard.jpg"
---

## 起因

九月底，朋友去了趟丽江，把照片打包发给我，让我帮他做成水彩明信片：蓝月谷的水、玉龙雪山的雾。十月一号凌晨，我又跟同学夜爬了缙云山，手机里也多了一批：凌晨山路上的路灯和古寺。

照片躺在相册里就是数据。我一直想要一种更"慢"的留存方式——像从前的人把风景画进明信片那样。于是花了一个晚上，把这套转换流程写成了一个可以给 AI 助手反复使用的 skill，开源在这里：

**[github.com/duruoxian/photo-to-zine-watercolor](https://github.com/duruoxian/photo-to-zine-watercolor)**

## 先看成品

![丽江蓝月谷 · 明信片模式](/images/posts/photo-to-zine-watercolor/lijiang-lake-postcard.jpg)

![缙云山古寺 · 纯水彩模式](/images/posts/photo-to-zine-watercolor/jinyun-temple-page.jpg)

![缙云山寺园 · 纯水彩模式](/images/posts/photo-to-zine-watercolor/jinyun-temple-garden.jpg)

![缙云山石佛 · 纯水彩模式](/images/posts/photo-to-zine-watercolor/jinyun-buddha-stairs.jpg)

![缙云山夜径 · 纯水彩模式](/images/posts/photo-to-zine-watercolor/jinyun-night-road-page.jpg)

竖版 2:3，暖白纸底，水彩主景带自然晕边，左下角打字机字体的日期和地名。做成一套挂在一起，比相册里的原图耐看。

## 两种模式

- **明信片正面**：上方保留原照片横幅（细线框装裱），下方是这张照片的水彩转写。照片是"证物"，水彩是"心情"。
- **纯水彩页**：整页只有米白纸和一幅水彩，不要照片部分。适合不想要纪实感、只要氛围的场景。

## 真正值钱的是四条规则

风格模板谁都能写，这个 skill 的主体其实是四条在 17 张真实照片上摔打出来的规则：

**1. 人像必须锁定身份特征。** 照片里有自拍时，AI 水彩化会把脸画丢。只写"不要画脸细节"是没用的——模型会把戴眼镜的近景自拍画成一个没戴眼镜的全身陌生人。正确做法是在提示词里逐项锁死：眼镜、连帽、近景构图、"必须是同一个人"。

**2. 批量要有批量纪律。** 13 张照片一起转：先做缩略拼图确认内容和问题照片，一次问清所有决策（人像怎么处理、文字写什么），然后并行生成，最后统一验收。逐张问会把人逼疯。

**3. 平台水印是白色的。** 生成图右下角的"AI生成"水印是半透明白字，按"找暗像素"的思路永远修不干净，而且"暗像素残留为零"会骗你说修好了。正确的检测是找"亮于纸面的低饱和像素"，修复后要裁出右下角放大 2.5 倍用眼睛验，不能只信扫描。

**4. 验收必须放大看。** 缩略图会骗人：340 像素宽的拼图里看不清人脸对错，也看不清水印残影。人像逐张放大核对身份特征，文字逐张放大核对拼写，水印逐张放大核对角落。

## 怎么用

把仓库里的 `SKILL.md` 丢给任意支持 skill 的 AI 助手（Claude Code、Codex、WorkBuddy 都行），再丢照片：

```
请读取这个仓库里的 SKILL.md，并把它作为唯一的设计规范。
把我上传的照片做成 Photo to Zine Watercolor 卡片（模式 A / 模式 B）。
日期写 2026.10.1，地点写 JINYUN。
```

风景照基本一张过；含人像的自拍建议先用小批试效果。

## 写在最后

这个 skill 的规范越写越像一份"质检手册"，这可能才是 AI 时代的真相：**生成早就不是瓶颈，验收才是。** 模型负责把画画出来，人负责告诉它什么叫"对"。

仓库地址再放一次：[photo-to-zine-watercolor](https://github.com/duruoxian/photo-to-zine-watercolor)，欢迎拿去改成你自己的版本。

顺带一提：不一定非要编程助手——把 SKILL.md 里的规范直接发给豆包，再上传照片，它也能照着做出这套水彩卡片。
