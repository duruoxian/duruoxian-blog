import type { Metadata } from "next";
import Link from "next/link";
import { getAllCategories } from "@/lib/posts";

export const metadata: Metadata = { title: "分类", description: "按分类浏览文章" };

export default function CategoriesPage() {
  const categories = getAllCategories();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">分类</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {categories.map((c) => (
          <Link
            key={c.name}
            href={`/categories/${encodeURIComponent(c.name)}`}
            className="flex items-center justify-between rounded-xl border border-zinc-200 bg-[var(--card)] px-4 py-3 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
          >
            <span className="font-medium">{c.name}</span>
            <span className="text-sm text-zinc-400">{c.count} 篇</span>
          </Link>
        ))}
        {categories.length === 0 && <p className="text-sm text-zinc-500">还没有分类。</p>}
      </div>
    </div>
  );
}
