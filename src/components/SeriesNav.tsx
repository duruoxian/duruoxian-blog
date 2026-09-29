import Link from "next/link";
import { getPostsBySeries } from "@/lib/posts";

export function SeriesNav({ series, currentSlug }: { series: string; currentSlug: string }) {
  const posts = getPostsBySeries(series);
  if (posts.length === 0) return null;
  const index = posts.findIndex((p) => p.slug === currentSlug);

  return (
    <section className="mt-10 rounded-xl border border-zinc-200 bg-[var(--card)] p-5 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          系列：{series}
          <span className="ml-2 font-normal text-zinc-400">
            {index >= 0 ? `第 ${index + 1} / ${posts.length} 篇` : `${posts.length} 篇`}
          </span>
        </h2>
        <Link
          href={`/series/${encodeURIComponent(series)}`}
          className="text-xs text-blue-600 hover:underline dark:text-blue-400"
        >
          查看全部
        </Link>
      </div>
      <ol className="mt-3 space-y-1.5 text-sm">
        {posts.map((p, i) => {
          const active = p.slug === currentSlug;
          return (
            <li key={p.slug} className="flex gap-2">
              <span className={active ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400"}>
                {String(i + 1).padStart(2, "0")}
              </span>
              {active ? (
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{p.title}（当前）</span>
              ) : (
                <Link href={`/posts/${p.slug}`} className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                  {p.title}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
