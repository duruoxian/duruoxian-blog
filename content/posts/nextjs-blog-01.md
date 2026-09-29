---
title: "Next.js 建站（一）：项目结构与路由"
date: 2026-09-20
description: "从零开始理解 Next.js 的目录结构、页面路由与布局，这是搭建任意网站的第一步。"
category: "前端"
tags: ["Next.js", "React", "教程"]
series: "Next.js 建站系列"
cover: "/covers/nextjs-01.svg"
---

## 目录即路由

Next.js 的 App Router 有一个很舒服的设计：**文件夹结构就是网址结构**。

```
app/
  page.tsx            ->  /
  posts/page.tsx      ->  /posts
  posts/[slug]/page.tsx -> /posts/hello
  about/page.tsx      ->  /about
```

`page.tsx` 表示「这个路径下有一个页面」，`[slug]` 方括号表示动态参数。

## 布局 layout.tsx

`layout.tsx` 用来包裹一组页面，最外层的那份会应用到全站：

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
```

这样顶栏、页脚只写一次，所有页面共享。

## 小练习

1. 新建 `app/about/page.tsx`，写一个关于页
2. 访问 `/about` 看看效果
3. 把内容改成你自己的介绍

下一篇我们聊聊「怎么把 Markdown 变成文章」。
