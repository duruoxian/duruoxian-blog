import type { Metadata } from "next";
import { getAllCategories, getPostsByCategory } from "@/lib/posts";
import { PostList } from "@/components/PostList";

type Params = { params: Promise<{ category: string }> };

function decode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function generateStaticParams() {
  return getAllCategories().map((c) => ({ category: c.name }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const category = decode((await params).category);
  return { title: `分类：${category}` };
}

export default async function CategoryPage({ params }: Params) {
  const category = decode((await params).category);
  const posts = getPostsByCategory(category);

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <p className="text-sm text-zinc-400">分类</p>
        <h1 className="text-2xl font-bold">{category}</h1>
        <p className="mt-1 text-sm text-zinc-500">共 {posts.length} 篇</p>
      </header>
      <PostList posts={posts} />
    </div>
  );
}
