import type { Metadata } from "next";
import { getAllPosts, getAllSeries, getPostsBySeries } from "@/lib/posts";
import { ArchiveList, type ArchiveItem, type ArchiveSeries } from "@/components/ArchiveList";

export const metadata: Metadata = {
  title: "文章",
  description: "全部文章归档:按系列、分类或时间找到想读的。",
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

  // 置顶系列:≥2 篇的成体系内容,按篇数取前 2
  const series: ArchiveSeries[] = getAllSeries()
    .filter((s) => s.count >= 2)
    .slice(0, 2)
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
          共 {posts.length} 篇 · 可以按下面的系列、分类找,也可以直接{" "}
          <a href="/search" className="text-[var(--accent-1)] hover:underline">
            搜索
          </a>
          。
        </p>
      </header>

      <ArchiveList items={items} series={series} total={posts.length} />
    </div>
  );
}
