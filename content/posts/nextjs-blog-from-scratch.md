---

title: 从零到上线：用 Next.js 建一个自己的博客

date: 2026-10-06

description: "装 Node、create-next-app、理解 App Router 与静态导出，再到 Cloudflare Pages 免费上线——一篇可以照着做的建站笔记，也是你现在看到的这个博客的全部来历。"

category: 技术

tags: ["Next.js", "建站", "前端"]

cover: /images/posts/nextjs-blog-from-scratch/cover.svg

---

[开站那篇文章](/posts/hello-world)说过，我想要一个完全由自己掌控的地方。这篇就兑现承诺，把**这个博客是怎么从一行代码都没有到现在你看到的这个样子**完整记录下来。照着做，一个晚上就能有自己的站。

## 技术选型：为什么是 Next.js + Tailwind + Markdown

先说结论：**Next.js（App Router）+ React 19 + TypeScript + Tailwind CSS v4 + Markdown 文件**，静态导出后扔到 Cloudflare Pages。

- **文章就是 `.md` 文件**：不需要数据库、不需要后台服务，写完 push 就上线。内容永远在自己手里，任何编辑器都能写。
- **Next.js 负责「框架该管的事」**：路由、SEO、图片、构建。SSG（静态生成）让每篇文章在构建期就变成 HTML，访问快、抗并发、随便托管。
- **Tailwind 管样式**：写 class 就有样式，不用在 CSS 文件之间跳来跳去。
- **全免费**：GitHub 存代码 + Actions 构建 + Cloudflare Pages 托管，一分钱不花。

## 第 1 步：装 Node.js

```powershell
winget install -e --id OpenJS.NodeJS.LTS --silent
node -v   # v24.19.0
npm -v    # 11.17.0
```

几个词一句话解释：**npm** 是包管理器（手机应用商店）；**LTS** 是长期支持版（生产环境首选）；**PATH** 是系统找程序的路径列表（装完重启终端才能敲 `node`）。

## 第 2 步：脚手架生成项目

```powershell
npx --yes create-next-app@latest my-blog `
  --ts --tailwind --eslint --app --src-dir `
  --import-alias "@/*" --use-npm --yes
```

`npx` 临时下载并运行脚手架，用完即走；参数里最关键的是 `--app`（用 App Router）和 `--ts`（TypeScript，写错类型立刻报错）。生成完的项目自带四个命令：`dev`（本地预览）、`build`（生产构建）、`start`、`lint`。

## 第 3 步：理解 Next.js 的四个核心概念

**① 目录即路由。** `src/app/posts/page.tsx` 就是 `/posts`；`[slug]` 方括号是动态路由，一个文件匹配无数个网址——文章详情页就是靠它。

**② 服务器组件是默认，客户端组件要声明。** 默认的组件在构建时渲染成 HTML，可以直接读文件系统（读 Markdown 正是在这里做的）；需要交互的组件在第一行写 `"use client"`，比如主题切换按钮。

**③ SSG：构建期生成所有页面。**

```ts
export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}
```

**④ Next.js 16 里 `params` 是 Promise，必须 `await`。** 网上老教程的 `params.slug` 直接取值已经失效，这是最容易踩的坑：

```ts
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // ...
}
```

## 第 4 步：Markdown 内容管线（本站的灵魂）

每篇文章开头一段用 `---` 包起来的 YAML 叫 **front-matter**，存标题、日期、分类、标签这些元数据。

渲染分两步：**gray-matter** 拆出元数据和正文，然后 **unified 管线**把正文变成 HTML：

```ts
const html = String(
  await unified()
    .use(remarkParse)            // Markdown → mdast（语法树）
    .use(remarkGfm)              // 表格、删除线等 GitHub 扩展
    .use(remarkRehype)           // mdast → hast（HTML 树）
    .use(rehypeSlug)             // 给标题加 id（锚点）
    .use(rehypeAutolinkHeadings) // 标题可点击
    .use(rehypeHighlight)        // 代码高亮
    .use(rehypeStringify)        // hast → HTML
    .process(markdown)
);
```

两个细节值得记住：

- **目录锚点两边必须用同一套算法**。`rehype-slug` 用 `github-slugger` 把「你好 世界」变成 id `你好-世界`；我自己的目录组件也用 `github-slugger` 算 id，否则点击目录不跳转。
- 阅读时长按「中文 400 字/分钟」估算就够用了。

## 第 5 步：深色模式不闪屏

主题三态（跟随系统 / 亮 / 暗）靠 `<html>` 上的 `.dark` 类。关键是在**浏览器绘制之前**就定好主题——一段内联脚本抢在渲染前执行：

```html
<script>(function(){try{var e=document.documentElement;
var t=localStorage.getItem('theme');
var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;
e.classList.toggle('dark',d);}catch(_){}})();</script>
```

等 React 挂载后再切主题，用户会看到一瞬间的白屏闪光（FOUC），体验立减一半。

## 第 6 步：上线（0 元）

**静态导出**：`next.config.ts` 里配 `output: "export"`，构建产物变成纯 `out/` 目录，从此不需要任何服务器。

**托管**：仓库推到 GitHub，Cloudflare Pages 导入项目，再配一个 GitHub Actions（push 到 `main` 自动 `npm ci → build → pages deploy`）：

```yaml
on:
  push:
    branches: [main]
```

之后日常发布就一句话：

```bash
git add -A && git commit -m "更新" && git push
```

大约两分钟后线上生效。需要的两个密钥 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID` 配在仓库的 Actions Secrets 里。

## 最后

现在这个博客已经有的东西：文章目录（滚动高亮）、代码块一键复制、分类 / 标签 / 系列、站内搜索（fuse.js）、RSS 全文输出、GitHub 活跃度热力图（构建时抓取烘焙进静态页）、深浅色三态、PWA。共 26 个静态页面，`lint` 和 `build` 全绿。

源码完全公开：[github.com/duruoxian/duruoxian-blog](https://github.com/duruoxian/duruoxian-blog)，想搭一个的直接抄作业。评论系统（Giscus）和自定义域名在待办清单上，等有空再补。
