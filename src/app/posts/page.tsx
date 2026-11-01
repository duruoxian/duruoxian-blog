import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts, getAllSeries, getPostsBySeries, getAllTags } from "@/lib/posts";
import { ArchiveList, type ArchiveItem, type ArchiveSeries } from "@/components/ArchiveList";

export const metadata: Metadata = {
  title: "文章",
  description: "全部文章归档:按系列、分类、标签或时间找到想读的。",
};

export default function PostsPage() {
  const posts = getAllPosts();

  // 给归档列表的序列化数据(不把正文塞进 props)
  const items: ArchiveItem[] = posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    date: p.date,
    category: p.category,
    readingTime: p.readingTime,
  }));

  // 成系列读:全部 ≥2 篇的系列,按篇数降序(与 getAllSeries 的顺序一致)
  const series: ArchiveSeries[] = getAllSeries()
    .filter((s) => s.count >= 2)
    .map((s) => ({
      name: s.name,
      posts: getPostsBySeries(s.name).map((p) => ({
        slug: p.slug,
        title: p.title,
        readingTime: p.readingTime,
      })),
    }));

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">全部文章</h1>
        <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          共 {posts.length} 篇 · 按下面的系列、分类找,或直接{" "}
          <a href="/search" className="text-[var(--accent-1)] hover:underline">
            搜索
          </a>
          。
        </p>
      </header>

      <ArchiveList items={items} series={series} total={posts.length} />

      {/* 标签云:分类/标签/系列三个维度收进这一页,导航只留六个词 */}
      <details className="mt-10 rounded-xl border border-zinc-200 bg-[var(--card)] p-5 backdrop-blur-xl dark:border-zinc-800">
        <summary className="cursor-pointer text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          按标签找({getAllTags().length} 个)
        </summary>
        <div className="mt-4 flex flex-wrap gap-2">
          {getAllTags().map((t) => (
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
    </div>
  );
}
