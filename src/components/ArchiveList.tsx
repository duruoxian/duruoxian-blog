"use client";

// 归档列表:系列置顶卡 + 分类 chips 即时筛选 + 年份分组。
// 数据由服务端序列化传入;筛选纯客户端,内容仍在静态 HTML 里(SEO 无损)。
import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDateShort } from "@/lib/format";

export type ArchiveItem = {
  slug: string;
  title: string;
  date: string;
  category: string;
  readingTime: number;
};

export type ArchiveSeries = {
  name: string;
  posts: { slug: string; title: string; readingTime: number }[];
};

export function ArchiveList({
  items,
  series,
  total,
}: {
  items: ArchiveItem[];
  series: ArchiveSeries[];
  total: number;
}) {
  const [cat, setCat] = useState<string | null>(null);

  // 分类 chips(带数量,按篇数倒序)
  const cats = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) m.set(it.category, (m.get(it.category) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);

  const filtered = cat ? items.filter((it) => it.category === cat) : items;

  const groups = useMemo(() => {
    const m = new Map<string, ArchiveItem[]>();
    for (const it of filtered) {
      const y = it.date.slice(0, 4);
      if (!m.has(y)) m.set(y, []);
      m.get(y)!.push(it);
    }
    return [...m.entries()];
  }, [filtered]);

  return (
    <div className="space-y-8">
      {/* 成系列读:先把最成体系的内容顶到最上面 */}
      {series.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-400 dark:text-zinc-500">成系列读</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {series.map((s) => (
              <div
                key={s.name}
                className="card-glow rounded-xl border border-zinc-200 bg-[var(--card)] p-4 backdrop-blur-xl dark:border-zinc-800"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{s.name}</h3>
                  <span className="text-xs text-zinc-400">{s.posts.length} 篇</span>
                </div>
                <ol className="mt-2 space-y-1 text-sm">
                  {s.posts.map((p, i) => (
                    <li key={p.slug} className="flex items-baseline gap-2">
                      <span className="text-zinc-400">{String(i + 1).padStart(2, "0")}</span>
                      <Link
                        href={`/posts/${p.slug}`}
                        className="min-w-0 flex-1 truncate text-zinc-600 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
                      >
                        {p.title}
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 分类筛选 chips */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="按分类筛选">
        <button
          type="button"
          onClick={() => setCat(null)}
          aria-pressed={cat === null}
          className={`rounded-full border px-3 py-1 text-sm transition-colors ${
            cat === null
              ? "accent-fill border-transparent text-white"
              : "border-zinc-200 bg-[var(--card)] text-zinc-600 hover:border-zinc-400 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600"
          }`}
        >
          全部 <span className="text-xs opacity-70">{total}</span>
        </button>
        {cats.map(([name, count]) => (
          <button
            key={name}
            type="button"
            onClick={() => setCat(cat === name ? null : name)}
            aria-pressed={cat === name}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              cat === name
                ? "accent-fill border-transparent text-white"
                : "border-zinc-200 bg-[var(--card)] text-zinc-600 hover:border-zinc-400 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600"
            }`}
          >
            {name} <span className="text-xs opacity-70">{count}</span>
          </button>
        ))}
      </div>

      {/* 年份分组列表 */}
      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          这个分类下还没有文章。
        </p>
      ) : (
        <div className="space-y-10">
          {groups.map(([year, posts]) => (
            <section key={year}>
              <h2 className="mb-3 flex items-center gap-3 text-sm font-semibold text-zinc-400 dark:text-zinc-500">
                <span className="font-mono text-base">{year}</span>
                <span className="h-px flex-1 bg-gradient-to-r from-zinc-200 to-transparent dark:from-zinc-700" />
                <span className="text-xs font-normal">{posts.length} 篇</span>
              </h2>
              <ul className="space-y-1">
                {posts.map((post) => (
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
      )}
    </div>
  );
}
