import type { Metadata } from "next";
import Link from "next/link";
import { getAllSeries, getPostsBySeries } from "@/lib/posts";

export const metadata: Metadata = { title: "系列", description: "成体系的长篇教程" };

export default function SeriesPage() {
  const series = getAllSeries();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">系列</h1>

      {series.length === 0 && <p className="text-sm text-zinc-500">还没有系列。</p>}

      <div className="space-y-4">
        {series.map((s) => {
          const posts = getPostsBySeries(s.name);
          return (
            <div
              key={s.name}
              className="rounded-xl border border-zinc-200 bg-[var(--card)] p-5 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">
                  <Link href={`/series/${encodeURIComponent(s.name)}`} className="hover:underline">
                    {s.name}
                  </Link>
                </h2>
                <span className="text-sm text-zinc-400">{s.count} 篇</span>
              </div>
              <ol className="mt-3 space-y-1 text-sm">
                {posts.slice(0, 4).map((p, i) => (
                  <li key={p.slug} className="flex gap-2">
                    <span className="text-zinc-400">{String(i + 1).padStart(2, "0")}</span>
                    <Link
                      href={`/posts/${p.slug}`}
                      className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                      {p.title}
                    </Link>
                  </li>
                ))}
                {posts.length > 4 && (
                  <li className="pl-6 text-zinc-400">……共 {posts.length} 篇</li>
                )}
              </ol>
            </div>
          );
        })}
      </div>
    </div>
  );
}
