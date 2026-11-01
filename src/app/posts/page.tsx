import type { Metadata } from "next";
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

  // 成系列读:紧凑卡只带篇数与最新一篇,全目录在 /series 对应锚点
  const series: ArchiveSeries[] = getAllSeries()
    .filter((s) => s.count >= 2)
    .map((s) => {
      const posts = getPostsBySeries(s.name);
      const latest = posts[posts.length - 1];
      return {
        name: s.name,
        count: s.count,
        latest: { slug: latest.slug, title: latest.title, date: latest.date },
      };
    });

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

      <ArchiveList
        items={items}
        series={series}
        total={posts.length}
        tags={getAllTags().map((t) => ({ name: t.name, count: t.count }))}
      />
    </div>
  );
}
