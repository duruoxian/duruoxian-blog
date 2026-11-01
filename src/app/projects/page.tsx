import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import { projects, getFeaturedProjects, type Project } from "@/lib/projects";

export const metadata: Metadata = {
  title: "项目",
  description: "我做过的开源工具、课程设计与站内子系统,附仓库地址与相关文章。",
};

/** 项目卡片的动作区:站内链接用 <Link>,外链新窗口打开并加 ↗ */
function ProjectLinks({ project }: { project: Project }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
      {project.links.map((l) =>
        l.href.startsWith("http") ? (
          <a
            key={l.href}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[var(--accent-1)] hover:underline"
          >
            {l.label}
            <span aria-hidden className="text-xs">
              ↗
            </span>
          </a>
        ) : (
          <Link
            key={l.href}
            href={l.href}
            className="inline-flex items-center gap-1 text-[var(--accent-1)] hover:underline"
          >
            {l.label}
          </Link>
        )
      )}
    </div>
  );
}

/** 状态徽标:活跃维护/站内服务 用强调色描边,其余用灰色 */
function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const live = status === "活跃维护" || status === "站内服务" || status === "持续迭代";
  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${
        live
          ? "border-[var(--accent-1)]/40 text-[var(--accent-1)]"
          : "border-zinc-300 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
      }`}
    >
      {status}
    </span>
  );
}

/** 相关文章小链接,标题从 posts.ts 按 slug 解析(JSON 里不重复存标题) */
function RelatedPosts({ slugs, bySlug }: { slugs: string[]; bySlug: Map<string, ReturnType<typeof getAllPosts>[number]> }) {
  const items = slugs.map((s) => bySlug.get(s)).filter((p) => p !== undefined);
  if (items.length === 0) return null;

  return (
    <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
      {items.map((p) => (
        <li key={p.slug} className="flex items-baseline gap-2">
          <span aria-hidden className="text-zinc-400">
            ·
          </span>
          <Link
            href={`/posts/${p.slug}`}
            className="hover:text-zinc-900 hover:underline dark:hover:text-zinc-100"
          >
            {p.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function ProjectsPage() {
  const featured = getFeaturedProjects();
  const normal = projects.filter((p) => !p.featured);
  const bySlug = new Map(getAllPosts().map((p) => [p.slug, p]));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">项目</h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        我做过和正在维护的东西:开源工具、课程设计与站内子系统。每个项目附仓库地址与相关文章。
      </p>

      {/* 精选项目:大卡片 */}
      <section className="mt-6 space-y-4">
        {featured.map((p) => (
          <article
            key={p.name}
            id={p.name}
            className="card-glow scroll-mt-24 rounded-xl border border-zinc-200 bg-[var(--card)] p-5 backdrop-blur-xl dark:border-zinc-800"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{p.name}</h2>
              <StatusBadge status={p.status} />
              {p.year && <span className="ml-auto font-mono text-xs text-zinc-400">{p.year}</span>}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{p.tagline}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {p.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                >
                  {t}
                </span>
              ))}
            </div>

            <div className="mt-4 border-t border-zinc-200/80 pt-3 dark:border-zinc-800/80">
              <ProjectLinks project={p} />
            </div>

            {p.posts.length > 0 && (
              <div className="mt-3">
                <RelatedPosts slugs={p.posts} bySlug={bySlug} />
              </div>
            )}
          </article>
        ))}
      </section>

      {/* 其余项目:双列小卡片(手机上单列) */}
      {normal.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-bold">更多项目</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {normal.map((p) => (
              <article
                key={p.name}
                id={p.name}
                className="card-glow flex scroll-mt-24 flex-col rounded-xl border border-zinc-200 bg-[var(--card)] p-5 backdrop-blur-xl dark:border-zinc-800"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{p.name}</h3>
                  <StatusBadge status={p.status} />
                </div>
                <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {p.tagline}
                </p>
                <div className="mt-3 border-t border-zinc-200/80 pt-3 dark:border-zinc-800/80">
                  <ProjectLinks project={p} />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
