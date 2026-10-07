import Link from "next/link";
import { site } from "@/lib/site";

// 文章末尾的作者卡片：头像 + 一句话简介 + 关注入口
export function AuthorCard() {
  const a = site.author;
  return (
    <aside className="gradient-border mt-10 flex items-center gap-4 rounded-xl p-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={a.avatar}
        alt={a.name}
        loading="lazy"
        className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-indigo-500/25"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          <span className="gradient-text">{a.name}</span>
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          {a.bio}
        </p>
      </div>
      <div className="hidden shrink-0 gap-2 sm:flex">
        <a
          href={a.github}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs transition-colors hover:border-indigo-500/50 hover:text-indigo-600 dark:border-zinc-700 dark:hover:border-indigo-400/50 dark:hover:text-indigo-300"
        >
          GitHub
        </a>
        <Link
          href="/about"
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          关于我
        </Link>
      </div>
    </aside>
  );
}
