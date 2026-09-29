import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-10 border-t border-zinc-200 py-8 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 px-4 sm:flex-row">
        <p>
          © {site.since}–{new Date().getFullYear()} {site.author.name} · 保留所有权利
        </p>
        <div className="flex items-center gap-4">
          <a href="/rss.xml" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            RSS
          </a>
          <a
            href={site.author.github}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            GitHub
          </a>
          <a
            href={`mailto:${site.author.email}`}
            className="hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            邮箱
          </a>
        </div>
      </div>
    </footer>
  );
}
