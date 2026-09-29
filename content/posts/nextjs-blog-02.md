---
title: "Next.js 建站（二）：把 Markdown 变成文章"
date: 2026-09-22
description: "用 gray-matter 解析 front-matter，再用 remark / rehype 管线把 Markdown 渲染成带代码高亮的 HTML。"
category: "前端"
tags: ["Next.js", "Markdown", "教程"]
series: "Next.js 建站系列"
cover: "/covers/nextjs-02.svg"
---

## 整体思路

一段 Markdown 要变成网页，大致分两步：

1. 用 `gray-matter` 分离出开头的 **front-matter**（标题、日期、标签……）
2. 用 `remark` / `rehype` 把正文转成 HTML

## 读取文章

```ts
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export function getPostBySlug(slug: string) {
  const file = path.join(process.cwd(), "content", "posts", `${slug}.md`);
  const { data, content } = matter(fs.readFileSync(file, "utf8"));
  return { slug, title: data.title, date: data.date, content };
}
```

## 渲染正文

`unified` 这套管线，把插件像管道一样串起来：

```ts
const html = String(
  await unified()
    .use(remarkParse)       // Markdown -> mdast
    .use(remarkGfm)         // 支持表格、任务列表
    .use(remarkRehype)      // mdast -> hast
    .use(rehypeSlug)        // 给标题加 id
    .use(rehypeHighlight)   // 代码高亮
    .use(rehypeStringify)   // hast -> HTML
    .process(markdown)
);
```

## 为什么要分这么多步

因为每一步只做一件事，插件之间可以自由组合。
想加目录？多插一个插件收集标题即可；想支持数学公式？再加一个。

> 这种「管道式」设计是前端工具链里非常经典的思路。

到这，你已经有了一套完整的写作发布流程了。
