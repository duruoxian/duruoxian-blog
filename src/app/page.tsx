import Link from "next/link";
import { getAllPosts, getAllSeries, getPostsBySeries } from "@/lib/posts";
import { getNotes } from "@/lib/notes";
import { getContributions } from "@/lib/github";
import { site } from "@/lib/site";
import { getFeaturedProjects } from "@/lib/projects";
import { ProfileCard } from "@/components/ProfileCard";
import { PostCard } from "@/components/PostCard";
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
  const featured = getFeaturedProjects();
  // 首页只展示成体系的系列(≥2 篇),最多 2 个,完整列表在 /series
  const series = getAllSeries()
    .filter((s) => s.count >= 2)
    .slice(0, 2);

  const contributions = await getContributions(site.author.githubUser);
  const notes = getNotes().slice(0, 3);

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

          {featured.length > 0 && (
            <section>
              <div className="mb-4 flex items-end justify-between">
                <h2 className="text-lg font-bold">项目精选</h2>
                <Link href="/projects" className="text-sm text-[var(--accent-1)] hover:underline">
                  全部项目 →
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-1">
                {featured.map((p) => (
                  <Link
                    key={p.name}
                    href={p.links[0]?.href ?? "/projects"}
                    {...(p.links[0]?.href.startsWith("http")
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className="card-glow group rounded-xl border border-zinc-200 bg-[var(--card)] p-4 backdrop-blur-xl transition-colors hover:border-[var(--accent-1)]/40 dark:border-zinc-800"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold">{p.name}</h3>
                      <span
                        aria-hidden
                        className="shrink-0 text-xs text-zinc-400 transition-transform group-hover:translate-x-0.5"
                      >
                        →
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {p.tagline}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {series.map((s) => {
            const posts = getPostsBySeries(s.name);
            return (
              <section key={s.name}>
                <div className="mb-4 flex items-end justify-between">
                  <h2 className="text-lg font-bold">{s.name}</h2>
                  <Link href="/series" className="text-sm text-[var(--accent-1)] hover:underline">
                    全部系列 →
                  </Link>
                </div>
                <div className="card-glow rounded-xl border border-zinc-200 bg-[var(--card)] p-5 backdrop-blur-xl dark:border-zinc-800">
                  <ol className="space-y-1.5 text-sm">
                    {posts.map((p, i) => (
                      <li key={p.slug} className="flex items-baseline gap-2">
                        <span className="text-zinc-400">{String(i + 1).padStart(2, "0")}</span>
                        <Link
                          href={`/posts/${p.slug}`}
                          className="min-w-0 flex-1 truncate text-zinc-600 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
                        >
                          {p.title}
                        </Link>
                        <span className="shrink-0 text-xs text-zinc-400">{p.readingTime} 分钟</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </section>
            );
          })}

          {notes.length > 0 && (
            <section>
              <div className="mb-4 flex items-end justify-between">
                <h2 className="text-lg font-bold">想法</h2>
                <Link href="/notes" className="text-sm text-[var(--accent-1)] hover:underline">
                  全部想法 →
                </Link>
              </div>
              <div className="card-glow rounded-xl border border-zinc-200 bg-[var(--card)] p-5 backdrop-blur-xl dark:border-zinc-800">
                <ul className="space-y-2.5 text-sm">
                  {notes.map((n) => (
                    <li key={n.slug} className="flex items-baseline gap-3">
                      <time
                        dateTime={n.date}
                        className="shrink-0 font-mono text-xs text-zinc-400"
                      >
                        {n.date.slice(5, 10).replace("-", "/")}
                      </time>
                      <p className="min-w-0 flex-1 truncate text-zinc-600 dark:text-zinc-400">
                        {n.content}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>
      </div>

      <GitHubActivity data={contributions} />
    </div>
  );
}
