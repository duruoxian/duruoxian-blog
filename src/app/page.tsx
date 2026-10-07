import Link from "next/link";
import { getAllPosts, getAllTags } from "@/lib/posts";
import { getContributions } from "@/lib/github";
import { site } from "@/lib/site";
import { ProfileCard } from "@/components/ProfileCard";
import { PostCard } from "@/components/PostCard";
import { TagBadge } from "@/components/TagBadge";
import { GitHubActivity } from "@/components/GitHubActivity";

// 站点结构化数据，帮助搜索引擎理解这是谁的博客
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: site.title,
  url: site.url,
  description: site.description,
  author: { "@type": "Person", name: site.author.name, url: site.author.github },
};

export default async function Home() {
  const latest = getAllPosts().slice(0, 5);
  const tags = getAllTags().slice(0, 24);
  const contributions = await getContributions(site.author.githubUser);

  return (
    <div className="space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <ProfileCard />
        </aside>

        <div className="space-y-8">
          <section>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="text-lg font-bold">最新文章</h2>
              <Link href="/posts" className="text-sm text-[var(--accent-1)] hover:underline">
                全部文章 →
              </Link>
            </div>

            {latest.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
                还没有文章。在 <code>content/posts/</code> 下新建一个 <code>.md</code> 文件即可发布。
              </p>
            ) : (
              <div className="space-y-4">
                {latest.map((post) => (
                  <PostCard key={post.slug} post={post} compact />
                ))}
              </div>
            )}
          </section>

          {tags.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold">标签</h2>
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <TagBadge key={t.name} tag={t.name} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <GitHubActivity data={contributions} />
    </div>
  );
}
