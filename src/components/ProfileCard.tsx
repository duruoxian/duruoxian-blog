import { site } from "@/lib/site";

export function ProfileCard() {
  const a = site.author;

  return (
    <div className="rounded-xl border border-zinc-200 bg-[var(--card)] p-6 dark:border-zinc-800">
      <div className="flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={a.avatar}
          alt={a.name}
          className="h-24 w-24 rounded-full border border-zinc-200 object-cover dark:border-zinc-700"
        />
        <h1 className="mt-4 text-xl font-bold">{a.name}</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{a.bio}</p>
      </div>

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
            <a href={`mailto:${a.email}`} className="text-blue-600 hover:underline dark:text-blue-400">
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
