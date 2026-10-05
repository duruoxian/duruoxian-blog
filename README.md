# DuRuoxian 的博客

我的个人博客源码 —— 记录技术笔记、项目与生活随笔。

**在线地址：<https://duruoxian-blog.pages.dev>**

📖 **使用与维护手册**：[docs/使用与维护手册.md](docs/使用与维护手册.md)

## 技术栈

- **Next.js 16**（App Router）+ **React 19** + **TypeScript**
- **Tailwind CSS v4** + `@tailwindcss/typography`
- **Markdown** 文章（`gray-matter` + `remark` / `rehype` 管线，`highlight.js` 代码高亮）
- 静态导出（`output: "export"`），部署在 **Cloudflare Pages**
- 推送到 `main` 由 **GitHub Actions** 自动构建并发布

## 功能

- 首页资料卡 + 最新文章 + 标签云 + GitHub 活跃度热力图（构建时抓取）
- 文章：目录（滚动高亮）、代码块一键复制、上/下篇、系列导航
- 分类 / 标签 / 系列 / 归档 / 资源 / 关于
- 站内搜索（`fuse.js`）
- 主题三态（跟随系统 / 亮 / 暗）、移动端适配
- SEO：结构化数据（JSON-LD）、`sitemap.xml`、`rss.xml`、`robots.txt`
- 安全响应头（`public/_headers`）

## 目录结构

```
content/posts/       文章（Markdown，文件名即网址）
public/images/posts/ 文章配图（按 slug 分目录）
src/app/             页面与路由
src/components/      组件
src/lib/             站点配置与内容处理
```

## 本地开发

```bash
npm install
npm run dev      # http://localhost:3000
```

## 写一篇新文章

在 `content/posts/` 新建 `<slug>.md`：

```markdown
---
title: "文章标题"
date: 2026-10-02
description: "一句话摘要"
category: "技术"
tags: ["标签1", "标签2"]
---

正文……
```

## 构建与部署

```bash
npm run lint     # 代码检查
npm run build    # 静态导出到 out/
npm run deploy   # 构建并部署到 Cloudflare Pages（手动备用）
```

平时发布只需：

```bash
git push         # GitHub Actions 自动构建并上线
```

## License

内容版权归作者所有；代码可参考学习。
