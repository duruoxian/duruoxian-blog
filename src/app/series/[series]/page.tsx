import type { Metadata } from "next";
import Link from "next/link";
import { getAllSeries, getPostsBySeries } from "@/lib/posts";
import { formatDateShort } from "@/lib/format";

type Params = { params: Promise<{ series: string }> };

function decode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function generateStaticParams() {
  return getAllSeries().map((s) => ({ series: s.name }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const series = decode((await params).series);
  return { title: `系列：${series}` };
}

export default async function SeriesDetailPage({ params }: Params) {
  const series = decode((await params).series);
  const posts = getPostsBySeries(series);

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <p className="text-sm text-zinc-400">系列</p>
        <h1 className="text-2xl font-bold">{series}</h1>
        <p className="mt-1 text-sm text-zinc-500">共 {posts.length} 篇，按阅读顺序排列</p>
      </header>

      <ol className="space-y-2">
        {posts.map((post, i) => (
          <li key={post.slug}>
            <Link
              href={`/posts/${post.slug}`}
              className="group flex items-start gap-3 rounded-lg border border-zinc-200 bg-[var(--card)] p-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
            >
              <span className="mt-0.5 font-mono text-sm text-zinc-400">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0">
                <span className="flex items-baseline gap-3">
                  <span className="font-medium group-hover:underline">{post.title}</span>
                  <time className="shrink-0 font-mono text-xs text-zinc-400" dateTime={post.date}>
                    {formatDateShort(post.date)}
                  </time>
                </span>
                {post.description && (
                  <span className="mt-1 block line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {post.description}
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
