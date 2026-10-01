import type { Metadata } from "next";
import Link from "next/link";
import { getAllSeries, getPostsBySeries } from "@/lib/posts";
import { formatDateShort } from "@/lib/format";

export const metadata: Metadata = { title: "系列", description: "成体系的长篇教程" };

export default function SeriesPage() {
  const series = getAllSeries();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">系列</h1>

      {series.length === 0 && (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          还没有系列。给文章的 front-matter 加上 <code>series</code> 字段即可归入系列。
        </p>
      )}

      <div className="space-y-6">
        {series.map((s) => {
          const posts = getPostsBySeries(s.name);
          return (
            <section
              key={s.name}
              id={s.name}
              className="scroll-mt-24 rounded-xl border border-zinc-200 bg-[var(--card)] p-5 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{s.name}</h2>
                <span className="text-sm text-zinc-400">{s.count} 篇</span>
              </div>
              <ol className="mt-3 space-y-1.5 text-sm">
                {posts.map((p, i) => (
                  <li key={p.slug} className="flex items-baseline gap-2">
                    <span className="text-zinc-400">{String(i + 1).padStart(2, "0")}</span>
                    <Link
                      href={`/posts/${p.slug}`}
                      className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                      {p.title}
                    </Link>
                    <time className="ml-auto shrink-0 font-mono text-xs text-zinc-400" dateTime={p.date}>
                      {formatDateShort(p.date)}
                    </time>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}
