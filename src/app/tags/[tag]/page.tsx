import type { Metadata } from "next";
import Link from "next/link";
import { getAllTags, getPostsByTag } from "@/lib/posts";
import { PostList } from "@/components/PostList";
import { getTagGroup } from "@/lib/tags";

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
  const group = getTagGroup(tag);

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <p className="text-sm text-zinc-400">
          标签{group ? ` · ${group.name}` : ""}
        </p>
        <h1 className="text-2xl font-bold"># {tag}</h1>
        <p className="mt-1 text-sm text-zinc-500">共 {posts.length} 篇</p>
      </header>

      {/* 同组标签横向切换:看完一个相关的顺手点下一个 */}
      {group && (
        <nav aria-label="同组标签" className="mb-6 flex flex-wrap gap-2">
          {group.siblings.map((s) => (
            <Link
              key={s}
              href={`/tags/${encodeURIComponent(s)}`}
              aria-current={s === tag ? "page" : undefined}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                s === tag
                  ? "accent-fill border-transparent text-white"
                  : "border-zinc-200 bg-[var(--card)] text-zinc-600 hover:border-zinc-400 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600"
              }`}
            >
              {s}
            </Link>
          ))}
        </nav>
      )}

      <PostList posts={posts} />
    </div>
  );
}
