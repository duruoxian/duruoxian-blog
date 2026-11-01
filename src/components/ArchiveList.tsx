"use client";

// 归档列表:紧凑系列卡 + 分类 chips 即时筛选 + 年份分组(默认只展开最近 15 条)。
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
  count: number;
  latest: { slug: string; title: string; date: string };
};

const LIMIT = 15; // 默认展开的列表条数,其余收进「展开其余 N 篇」

export function ArchiveList({
  items,
  series,
  total,
  tags,
}: {
  items: ArchiveItem[];
  series: ArchiveSeries[];
  total: number;
  tags: { name: string; count: number }[];
}) {
  const [cat, setCat] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // 分类 chips(带数量,按篇数倒序)
  const cats = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) m.set(it.category, (m.get(it.category) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);

  const filtered = cat ? items.filter((it) => it.category === cat) : items;

  const groups = useMemo(() => {
    const m = new Map<string, { post: ArchiveItem; gi: number }[]>();
    filtered.forEach((post, gi) => {
      const y = post.date.slice(0, 4);
      if (!m.has(y)) m.set(y, []);
      m.get(y)!.push({ post, gi });
    });
    return [...m.entries()];
  }, [filtered]);

  const overflow = filtered.length - LIMIT;

  return (
    <div className="space-y-8">
      {/* 成系列读:紧凑卡,全目录点卡片进系列页对应锚点 */}
      {series.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-400 dark:text-zinc-500">
            成系列读 · {series.length} 个
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {series.map((s) => (
              <Link
                key={s.name}
                href={`/series#${encodeURIComponent(s.name)}`}
                className="card-glow group rounded-xl border border-zinc-200 bg-[var(--card)] p-4 backdrop-blur-xl transition-colors hover:border-[var(--accent-1)]/40 dark:border-zinc-800"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="truncate font-semibold">{s.name}</h3>
                  <span className="shrink-0 text-xs text-zinc-400">{s.count} 篇</span>
                </div>
                <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">
                  最新:{s.latest.title}
                </p>
              </Link>
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

      {/* 按标签找:折叠放在筛选区,列表之前,一眼能看到 */}
      <details className="rounded-xl border border-zinc-200 bg-[var(--card)] p-4 backdrop-blur-xl dark:border-zinc-800">
        <summary className="cursor-pointer text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          按标签找({tags.length} 个)
        </summary>
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((t) => (
            <Link
              key={t.name}
              href={`/tags/${encodeURIComponent(t.name)}`}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
            >
              {t.name}
              <span className="text-zinc-400">{t.count}</span>
            </Link>
          ))}
        </div>
      </details>

      {/* 年份分组列表:默认只展开最近 LIMIT 条 */}
      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          这个分类下还没有文章。
        </p>
      ) : (
        <div className="space-y-10">
          {groups.map(([year, rows]) => (
            <section key={year}>
              <h2 className="mb-3 flex items-center gap-3 text-sm font-semibold text-zinc-400 dark:text-zinc-500">
                <span className="font-mono text-base">{year}</span>
                <span className="h-px flex-1 bg-gradient-to-r from-zinc-200 to-transparent dark:from-zinc-700" />
                <span className="text-xs font-normal">{rows.length} 篇</span>
              </h2>
              <ul className="space-y-1">
                {rows.map(({ post, gi }) => (
                  <li key={post.slug} hidden={!expanded && gi >= LIMIT}>
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

          {overflow > 0 && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className="rounded-full border border-zinc-200 bg-[var(--card)] px-5 py-2 text-sm text-zinc-600 transition-colors hover:border-[var(--accent-1)]/50 hover:text-[var(--accent-1)] dark:border-zinc-800 dark:text-zinc-400"
              >
                {expanded ? "收起列表" : `展开其余 ${overflow} 篇`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
