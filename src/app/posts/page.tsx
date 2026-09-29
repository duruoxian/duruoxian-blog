import type { Metadata } from "next";
import Link from "next/link";
import { getPostsGroupedByYear } from "@/lib/posts";
import { formatDateShort } from "@/lib/format";

export const metadata: Metadata = {
  title: "文章",
  description: "全部文章归档",
};

export default function PostsPage() {
  const groups = getPostsGroupedByYear();
  const total = groups.reduce((n, g) => n + g.posts.length, 0);

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">全部文章</h1>
        <p className="mt-1 text-sm text-zinc-500">共 {total} 篇</p>
      </header>

      {groups.length === 0 && (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          还没有文章。
        </p>
      )}

      <div className="space-y-10">
        {groups.map((group) => (
          <section key={group.year}>
            <h2 className="mb-3 text-sm font-semibold text-zinc-400">{group.year}</h2>
            <ul className="space-y-1">
              {group.posts.map((post) => (
                <li key={post.slug}>
                  <Link
                    href={`/posts/${post.slug}`}
                    className="group flex items-baseline gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                  >
                    <time className="shrink-0 font-mono text-xs text-zinc-400" dateTime={post.date}>
                      {formatDateShort(post.date)}
                    </time>
                    <span className="font-medium group-hover:underline">{post.title}</span>
                    <span className="ml-auto shrink-0 text-xs text-zinc-400">{post.category}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
