import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
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

  const contributions = await getContributions(site.author.githubUser);
  const notes = getNotes().slice(0, 3);

  return (
    <div className="space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 列宽必须 minmax(0,1fr):否则 truncate/nowrap 内容会把 auto 列撑到 615px,手机上整页横向溢出 */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <ProfileCard />
        </aside>

        <div className="min-w-0 space-y-8">
          <section>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="section-title text-lg font-bold">最新文章</h2>
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
                <h2 className="section-title text-lg font-bold">项目精选</h2>
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

          {notes.length > 0 && (
            <section>
              <div className="mb-4 flex items-end justify-between">
                <h2 className="section-title text-lg font-bold">想法</h2>
                <Link href="/notes" className="text-sm text-[var(--accent-1)] hover:underline">
                  全部想法 →
                </Link>
              </div>
              <div className="card-glow rounded-xl border border-zinc-200 bg-[var(--card)] p-5 backdrop-blur-xl dark:border-zinc-800">
                <ul className="space-y-2.5 text-sm">
                  {notes.map((n) => (
                    <li key={n.slug} className="flex min-w-0 items-baseline gap-3">
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
