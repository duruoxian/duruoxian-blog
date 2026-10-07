import Link from "next/link";
import type { Post } from "@/lib/posts";

// 文章底部「上一篇 / 下一篇」卡片导航：两栏对称，空位在另一侧留白
function NavCard({
  post,
  direction,
}: {
  post: Post;
  direction: "prev" | "next";
}) {
  const isPrev = direction === "prev";
  return (
    <Link
      href={`/posts/${post.slug}`}
      className={`card-glow group flex min-w-0 flex-col gap-1.5 rounded-xl border border-zinc-200 bg-[var(--card)] p-4 backdrop-blur-xl dark:border-zinc-800 ${
        isPrev ? "items-start sm:col-start-1" : "items-end text-right sm:col-start-2"
      }`}
    >
      <span className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
        {isPrev && (
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
            className="transition-transform duration-200 group-hover:-translate-x-0.5"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        )}
        {isPrev ? "上一篇（更新的）" : "下一篇（更早的）"}
        {!isPrev && (
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
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        )}
      </span>
      <span className="line-clamp-2 text-sm font-medium leading-snug text-zinc-800 transition-colors group-hover:text-indigo-600 dark:text-zinc-200 dark:group-hover:text-indigo-300">
        {post.title}
      </span>
    </Link>
  );
}

export function PrevNextNav({ prev, next }: { prev: Post | null; next: Post | null }) {
  if (!prev && !next) return null;
  return (
    <nav aria-label="相邻文章" className="mt-8 grid gap-3 sm:grid-cols-2">
      {prev ? <NavCard post={prev} direction="prev" /> : <span aria-hidden className="hidden sm:block" />}
      {next ? <NavCard post={next} direction="next" /> : <span aria-hidden className="hidden sm:block" />}
    </nav>
  );
}
