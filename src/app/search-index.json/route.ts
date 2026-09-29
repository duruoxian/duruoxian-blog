import { getAllPosts, stripMarkdown } from "@/lib/posts";

// 静态导出模式下生成一个静态的 search-index.json，供前端搜索使用
export const dynamic = "force-static";

export function GET() {
  const docs = getAllPosts().map((post) => ({
    slug: post.slug,
    title: post.title,
    description: post.description,
    category: post.category,
    tags: post.tags,
    date: post.date,
    excerpt: stripMarkdown(post.content).slice(0, 800),
  }));

  return Response.json(docs);
}
