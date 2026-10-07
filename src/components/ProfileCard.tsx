import { site } from "@/lib/site";
import { getAllPosts, getAllTags } from "@/lib/posts";

export function ProfileCard() {
  const a = site.author;
  const posts = getAllPosts();
  const totalWords = posts.reduce((n, p) => n + p.wordCount, 0);
  const stats = [
    { label: "文章", value: String(posts.length) },
    { label: "总字数", value: totalWords >= 10000 ? `${(totalWords / 10000).toFixed(1)}w` : String(totalWords) },
    { label: "标签", value: String(getAllTags().length) },
  ];

  return (
    <div className="gradient-border rounded-xl p-6 shadow-lg shadow-[var(--accent-1)]/5 backdrop-blur-xl">
      <div className="flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={a.avatar}
          alt={a.name}
          className="h-24 w-24 rounded-full object-cover ring-2 ring-[var(--accent-1)]/30"
        />
        <h1 className="gradient-text mt-4 text-xl font-bold">{a.name}</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{a.bio}</p>
      </div>

      {/* 写作统计 */}
      <dl className="mt-5 grid grid-cols-3 divide-x divide-zinc-100 rounded-lg border border-zinc-100 py-3 text-center dark:divide-zinc-800 dark:border-zinc-800">
        {stats.map((s) => (
          <div key={s.label}>
            <dd className="text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {s.value}
            </dd>
            <dt className="mt-0.5 text-xs text-zinc-400">{s.label}</dt>
          </div>
        ))}
      </dl>

      <dl className="mt-5 space-y-2 border-t border-zinc-100 pt-5 text-sm dark:border-zinc-800">
        <div className="flex gap-2">
          <dt className="w-14 shrink-0 text-zinc-400">学校</dt>
          <dd>{a.school}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-14 shrink-0 text-zinc-400">专业</dt>
          <dd>{a.major}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-14 shrink-0 text-zinc-400">地区</dt>
          <dd>{a.location}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-14 shrink-0 text-zinc-400">邮箱</dt>
          <dd className="truncate">
            <a href={`mailto:${a.email}`} className="text-[var(--accent-1)] hover:underline">
              {a.email}
            </a>
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex justify-center gap-3">
        <a
          href={a.github}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          GitHub
        </a>
        <a
          href="/about"
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          关于我
        </a>
      </div>
    </div>
  );
}
