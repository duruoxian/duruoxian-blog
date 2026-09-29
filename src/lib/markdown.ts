import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";
import GithubSlugger from "github-slugger";

export type TocItem = { id: string; text: string; depth: number };

// 极简的 mdast 节点类型，够用即可
type MdNode = { type: string; value?: string; children?: MdNode[]; depth?: number };

function nodeText(node: MdNode): string {
  if (node.type === "text") return node.value ?? "";
  if (Array.isArray(node.children)) return node.children.map(nodeText).join("");
  return "";
}

/**
 * Markdown -> HTML，并顺带生成目录(TOC)。
 * - remark-gfm：支持表格、任务列表、删除线等 GitHub 扩展语法
 * - rehype-slug / rehype-autolink-headings：给标题加 id 和锚点链接
 * - rehype-highlight：代码高亮（highlight.js）
 */
export async function renderMarkdown(
  markdown: string
): Promise<{ html: string; toc: TocItem[] }> {
  const html = String(
    await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
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
