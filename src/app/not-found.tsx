import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export default function NotFound() {
  // 404 也给出口:返回首页/搜索之外,再放最新 3 篇,断链变新访客
  const latest = getAllPosts().slice(0, 3);

  return (
    <div className="mx-auto max-w-2xl py-20 text-center">
      <p className="text-6xl font-bold text-zinc-300 dark:text-zinc-700">404</p>
      <h1 className="mt-4 text-xl font-semibold">页面不存在</h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        你要找的页面可能已被移动或删除——不妨从下面的入口再试试。
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          返回首页
        </Link>
        <Link
          href="/search"
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          搜索站内
        </Link>
        <Link
          href="/posts"
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          全部文章
        </Link>
      </div>

      {latest.length > 0 && (
        <div className="mt-10 text-left">
          <h2 className="section-title text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            也许你在找
          </h2>
          <ul className="mt-3 space-y-2">
            {latest.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/posts/${p.slug}`}
                  className="card-glow block rounded-xl border border-zinc-200 bg-[var(--card)] p-4 transition-colors hover:border-[var(--accent-1)]/40 dark:border-zinc-800"
                >
                  <p className="truncate font-medium">{p.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {p.date.slice(0, 10)} · {p.category}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
