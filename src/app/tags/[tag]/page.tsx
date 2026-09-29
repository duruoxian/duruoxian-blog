import type { Metadata } from "next";
import { getAllTags, getPostsByTag } from "@/lib/posts";
import { PostList } from "@/components/PostList";

type Params = { params: Promise<{ tag: string }> };

function decode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function generateStaticParams() {
  return getAllTags().map((t) => ({ tag: t.name }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const tag = decode((await params).tag);
  return { title: `标签：${tag}` };
}

export default async function TagPage({ params }: Params) {
  const tag = decode((await params).tag);
  const posts = getPostsByTag(tag);

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <p className="text-sm text-zinc-400">标签</p>
        <h1 className="text-2xl font-bold"># {tag}</h1>
        <p className="mt-1 text-sm text-zinc-500">共 {posts.length} 篇</p>
      </header>
      <PostList posts={posts} />
    </div>
  );
}
