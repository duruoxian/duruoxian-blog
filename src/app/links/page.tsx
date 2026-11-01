import type { Metadata } from "next";
import { site } from "@/lib/site";
import friendLinks from "@/data/friendLinks.json";

export const metadata: Metadata = {
  title: "友链",
  description: "朋友们的主页,以及和本站交换友链的方式。",
};

type FriendLink = { name: string; url: string; desc?: string; avatar?: string };

const links = friendLinks as FriendLink[];

/** 头像:有图用图,没图用首字母色块(强调色渐变) */
function Avatar({ name, src }: { name: string; src?: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`${name} 的头像`}
        loading="lazy"
        className="h-12 w-12 shrink-0 rounded-full border border-zinc-200 object-cover dark:border-zinc-700"
      />
    );
  }
  return (
    <div
      aria-hidden
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
      style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))" }}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function LinksPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">友链</h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        朋友们的主页,也是我平时逛的一部分。想交换友链的话,看页面底部的申请方式。
      </p>

      {links.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {links.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="card-glow flex items-center gap-4 rounded-xl border border-zinc-200 bg-[var(--card)] p-4 backdrop-blur-xl transition-colors hover:border-[var(--accent-1)]/40 dark:border-zinc-800"
            >
              <Avatar name={l.name} src={l.avatar} />
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1 font-semibold">
                  {l.name}
                  <span aria-hidden className="text-xs text-zinc-400">↗</span>
                </p>
                {l.desc && (
                  <p className="mt-0.5 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {l.desc}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          还没有友链。写博客的人不多,但值得互相认识——申请方式在下面。
        </p>
      )}

      {/* 申请友链:要求 + 本站信息 */}
      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-[var(--card)] p-5 backdrop-blur-xl dark:border-zinc-800">
          <h2 className="font-semibold">怎么申请</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
            <li>· 发邮件到 <a className="text-[var(--accent-1)] hover:underline" href={`mailto:${site.author.email}`}>{site.author.email}</a></li>
            <li>· 附上:站点名称、链接、一句话简介、头像地址</li>
            <li>· 希望:有原创内容、能正常访问、内容合法合规</li>
            <li>· 我会在看到邮件后尽快加上,也会回访你的站</li>
          </ul>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-[var(--card)] p-5 backdrop-blur-xl dark:border-zinc-800">
          <h2 className="font-semibold">本站信息</h2>
          <dl className="mt-3 space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
            <dt className="sr-only">名称</dt>
            <dd><strong className="text-zinc-800 dark:text-zinc-200">{site.title}</strong></dd>
            <dt className="sr-only">链接</dt>
            <dd className="break-all font-mono text-xs">{site.url}</dd>
            <dt className="sr-only">简介</dt>
            <dd>{site.description}</dd>
            <dt className="sr-only">头像</dt>
            <dd className="break-all font-mono text-xs">{site.url}/avatar.jpg</dd>
            <dt className="sr-only">RSS</dt>
            <dd className="break-all font-mono text-xs">{site.url}/rss.xml</dd>
          </dl>
        </div>
      </section>
    </div>
  );
}
