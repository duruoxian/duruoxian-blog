import type { Metadata } from "next";
import Link from "next/link";
import { getAllCategories } from "@/lib/posts";

export const metadata: Metadata = { title: "分类", description: "按分类浏览文章" };

// 每个分类的一句话导读:让访客在点进去之前就知道这里有什么
export const CATEGORY_DESC: Record<string, string> = {
  项目: "有仓库、有实现的完整折腾:每个项目从想法到踩坑到成品。",
  技术: "原理与实现细节,偏「它是怎么运作的」。",
  工具: "配置笔记与效率工具,跟着做就能上手。",
  生活: "随想与记录,代码之外的部分。",
};

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
            className="rounded-xl border border-zinc-200 bg-[var(--card)] px-4 py-3 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{c.name}</span>
              <span className="text-sm text-zinc-400">{c.count} 篇</span>
            </div>
            {CATEGORY_DESC[c.name] && (
              <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                {CATEGORY_DESC[c.name]}
              </p>
            )}
          </Link>
        ))}
        {categories.length === 0 && <p className="text-sm text-zinc-500">还没有分类。</p>}
      </div>
    </div>
  );
}
