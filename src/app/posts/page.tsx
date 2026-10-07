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
      <header className="mb-10">
        <h1 className="text-2xl font-bold">全部文章</h1>
        <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          共 {total} 篇 · 记录学习与折腾的每一步
        </p>
      </header>

      {groups.length === 0 && (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          还没有文章。
        </p>
      )}

      <div className="space-y-10">
        {groups.map((group) => (
          <section key={group.year}>
            <h2 className="mb-3 flex items-center gap-3 text-sm font-semibold text-zinc-400 dark:text-zinc-500">
              <span className="font-mono text-base">{group.year}</span>
              <span className="h-px flex-1 bg-gradient-to-r from-zinc-200 to-transparent dark:from-zinc-700" />
              <span className="text-xs font-normal">{group.posts.length} 篇</span>
            </h2>
            <ul className="space-y-1">
              {group.posts.map((post) => (
                <li key={post.slug}>
                  <Link
                    href={`/posts/${post.slug}`}
                    className="group flex items-baseline gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60"
                  >
                    <time className="shrink-0 font-mono text-xs text-zinc-400" dateTime={post.date}>
                      {formatDateShort(post.date)}
                    </time>
                    <span className="min-w-0 truncate font-medium transition-colors group-hover:text-[var(--accent-1)]">
                      {post.title}
                    </span>
                    <span className="ml-auto flex shrink-0 items-center gap-2 text-xs text-zinc-400">
                      <span className="hidden sm:inline">{post.readingTime} 分钟</span>
                      <span className="rounded-full border border-zinc-200 px-2 py-0.5 transition-colors group-hover:border-[var(--accent-1)]/60 group-hover:text-[var(--accent-1)] dark:border-zinc-700">
                        {post.category}
                      </span>
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                        className="-translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </span>
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
