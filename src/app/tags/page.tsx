import type { Metadata } from "next";
import Link from "next/link";
import { getAllTags } from "@/lib/posts";

export const metadata: Metadata = { title: "标签", description: "按标签浏览文章" };

export default function TagsPage() {
  const tags = getAllTags();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">标签</h1>
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <Link
            key={t.name}
            href={`/tags/${encodeURIComponent(t.name)}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-[var(--card)] px-3 py-1 text-sm transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
          >
            <span>{t.name}</span>
            <span className="text-xs text-zinc-400">{t.count}</span>
          </Link>
        ))}
        {tags.length === 0 && <p className="text-sm text-zinc-500">还没有标签。</p>}
      </div>
    </div>
  );
}
