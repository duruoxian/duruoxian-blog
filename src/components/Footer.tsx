import { site } from "@/lib/site";

export function Footer() {
  const year = new Date().getFullYear();
  const navGroups = [
    {
      title: "浏览",
      links: [
        { label: "全部文章", href: "/posts" },
        { label: "分类", href: "/categories" },
        { label: "标签", href: "/tags" },
        { label: "系列", href: "/series" },
      ],
    },
    {
      title: "更多",
      links: [
        { label: "资源收藏", href: "/resources" },
        { label: "关于我", href: "/about" },
        { label: "搜索", href: "/search" },
      ],
    },
  ];

  return (
    <footer className="mt-14 border-t border-zinc-200/80 py-10 text-sm text-zinc-500 dark:border-zinc-800/80 dark:text-zinc-400">
      <div className="mx-auto w-full max-w-5xl px-4">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          {/* 品牌区 */}
          <div className="max-w-xs">
            <p className="gradient-text text-base font-bold">{site.author.name}</p>
            <p className="mt-2 text-xs leading-relaxed">{site.description}</p>
            <div className="mt-3 flex gap-2">
              <a
                href={site.author.github}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                title="GitHub"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:border-[var(--accent-1)]/50 hover:text-[var(--accent-1)] dark:border-zinc-700 dark:text-zinc-400"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.35.95.1-.74.4-1.25.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.78 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.35.78 1.05.78 2.12 0 1.53-.01 2.76-.01 3.14 0 .3.2.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
                </svg>
              </a>
              <a
                href="/rss.xml"
                aria-label="RSS 订阅"
                title="RSS 订阅"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:border-[var(--accent-1)]/50 hover:text-[var(--accent-1)] dark:border-zinc-700 dark:text-zinc-400"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16" />
                  <circle cx="5" cy="19" r="1" fill="currentColor" stroke="none" />
                </svg>
              </a>
              <a
                href={`mailto:${site.author.email}`}
                aria-label="邮箱"
                title="邮箱"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:border-[var(--accent-1)]/50 hover:text-[var(--accent-1)] dark:border-zinc-700 dark:text-zinc-400"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </a>
            </div>
          </div>

          {/* 导航列 */}
          <nav aria-label="页脚导航" className="grid grid-cols-2 gap-10">
            {navGroups.map((g) => (
              <div key={g.title}>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  {g.title}
                </p>
                <ul className="mt-3 space-y-2 text-xs">
                  {g.links.map((l) => (
                    <li key={l.href}>
                      <a href={l.href} className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100">
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-zinc-200/70 pt-5 text-xs sm:flex-row dark:border-zinc-800/70">
          <p>
            © {site.since}–{year} {site.author.name} · 保留所有权利
          </p>
          <p>由 Next.js 构建 · 托管于 Cloudflare Pages</p>
        </div>
      </div>
    </footer>
  );
}
