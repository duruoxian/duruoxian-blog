import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";
import GithubSlugger from "github-slugger";
import { site } from "@/lib/site";

export type TocItem = { id: string; text: string; depth: number };

// 极简的 mdast 节点类型，够用即可
type MdNode = { type: string; value?: string; children?: MdNode[]; depth?: number };

function nodeText(node: MdNode): string {
  if (node.type === "text") return node.value ?? "";
  if (Array.isArray(node.children)) return node.children.map(nodeText).join("");
  return "";
}

// 极简的 hast 节点类型（rehype 的 HTML AST）
type HastNode = {
  type?: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

// 站外链接统一「新窗口打开 + 防劫持 + ↗ 标记」；本站链接与锚点不受影响。
function rehypeExternalLinks() {
  const walk = (node: HastNode) => {
    if (node.children) node.children.forEach(walk);
    if (node.tagName !== "a") return;
    const href = String(node.properties?.href ?? "");
    if (!/^https?:\/\//i.test(href) || href.startsWith(site.url)) return;
    const props = (node.properties ??= {});
    props.target = "_blank";
    props.rel = "noopener noreferrer";
    const className = Array.isArray(props.className) ? props.className : [];
    props.className = [...className, "external-link"];
  };
  return (tree: HastNode) => walk(tree);
}

// 正文图片懒加载：文章通常配多图，全部立即加载会拖慢首屏。
// loading=lazy 让浏览器只加载视口附近的图；decoding=async 避免解码阻塞主线程。
function rehypeLazyImages() {
  const walk = (node: HastNode) => {
    if (node.children) node.children.forEach(walk);
    if (node.tagName !== "img") return;
    const props = (node.properties ??= {});
    if (!props.loading) props.loading = "lazy";
    if (!props.decoding) props.decoding = "async";
  };
  return (tree: HastNode) => walk(tree);
}

function hastText(node?: HastNode): string {
  if (typeof node?.value === "string") return node.value;
  return (node?.children ?? []).map(hastText).join("");
}

// math:"text" 模式（RSS 用）：不走 KaTeX。remark-rehype 对 math 节点的默认输出
// 就是 `<code class="language-math math-inline/display">LaTeX 源码</code>`，
// 订阅器里显示干净的源码文本，故这里什么都不做。
function rehypeMathPassthrough() {
  return () => {};
}

// mermaid 代码块 → 占位结构，客户端组件 Mermaid.tsx 挂载后渲染成 SVG。
// 源码存进 .mermaid-src（hidden），渲染失败时可回退为普通代码块展示；
// 放在 rehype-highlight 之前，避免高亮器去碰 mermaid 语法。
function rehypeMermaidBlocks() {
  const walk = (node: HastNode) => {
    const children = node.children ?? [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      walk(child);
      if (child.tagName !== "pre") continue;
      const code = child.children?.find((c) => c.tagName === "code");
      const cls = Array.isArray(code?.properties?.className)
        ? (code?.properties?.className as string[])
        : [];
      if (!cls.includes("language-mermaid")) continue;
      children[i] = {
        type: "element",
        tagName: "div",
        properties: { className: ["mermaid-block"] },
        children: [
          {
            type: "element",
            tagName: "div",
            properties: { className: ["mermaid-fallback"] },
            children: [{ type: "text", value: "图表渲染中…" }],
          },
          {
            type: "element",
            tagName: "div",
            properties: { className: ["mermaid-src"], hidden: true },
            children: [{ type: "text", value: hastText(code) }],
          },
        ],
      };
    }
  };
  return (tree: HastNode) => walk(tree);
}

/**
 * Markdown -> HTML，并顺带生成目录(TOC)。
 * - remark-gfm：支持表格、任务列表、删除线等 GitHub 扩展语法
 * - remark-math + rehype-katex：数学公式（$行内$ 与 $$块级$$；math:"text" 时保留 LaTeX 源码，给 RSS 用）
 * - rehypeMermaidBlocks：mermaid 代码块交给客户端渲染
 * - rehype-slug / rehype-autolink-headings：给标题加 id 和锚点链接
 * - rehype-highlight：代码高亮（highlight.js）
 * - rehypeExternalLinks：站外链接新窗口打开并加 ↗ 标记
 */
export async function renderMarkdown(
  markdown: string,
  opts: { math?: "katex" | "text" } = {}
): Promise<{ html: string; toc: TocItem[] }> {
  const html = String(
    await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkRehype)
      .use(rehypeMermaidBlocks)
      .use(opts.math === "text" ? rehypeMathPassthrough : rehypeKatex, {
        throwOnError: false,
        strict: false,
      })
      .use(rehypeExternalLinks)
      .use(rehypeLazyImages)
      .use(rehypeSlug)
      .use(rehypeAutolinkHeadings, {
        behavior: "wrap",
        properties: { className: ["heading-anchor"], ariaLabel: "本节链接" },
      })
      .use(rehypeHighlight, { detect: true, ignoreMissing: true })
      .use(rehypeStringify)
      .process(markdown)
  );

  // 用同一套 github-slugger 规则算出 id，保证和 rehype-slug 生成的锚点一致
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown) as unknown as MdNode;
  const slugger = new GithubSlugger();
  const toc: TocItem[] = [];
  const walk = (node: MdNode) => {
    if (node.type === "heading" && typeof node.depth === "number") {
      const text = nodeText(node);
      if (text.trim()) toc.push({ id: slugger.slug(text), text, depth: node.depth });
    }
    if (node.children) node.children.forEach(walk);
  };
  walk(tree);

  return { html, toc };
}
