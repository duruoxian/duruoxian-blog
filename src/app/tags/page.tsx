import type { Metadata } from "next";
import Link from "next/link";
import { getAllTags, type CountItem } from "@/lib/posts";
import { TAG_GROUPS } from "@/lib/tags";

export const metadata: Metadata = { title: "标签", description: "按标签浏览文章" };

/** 药丸按热度加权:>=10 大号强调色,>=3 标准,其余小号灰 */
function TagPill({ tag, count }: { tag: CountItem; count: number }) {
  const size =
    count >= 10
      ? "px-3.5 py-1.5 text-base font-semibold border-[var(--accent-1)]/50 text-[var(--accent-1)]"
      : count >= 3
        ? "px-3 py-1 text-sm border-zinc-200 dark:border-zinc-800"
        : "px-2.5 py-0.5 text-xs text-zinc-500 border-zinc-200 dark:border-zinc-800 dark:text-zinc-400";
  return (
    <Link
      href={`/tags/${encodeURIComponent(tag.name)}`}
      className={`inline-flex items-baseline gap-1.5 rounded-full border bg-[var(--card)] transition-colors hover:border-[var(--accent-1)]/60 hover:text-[var(--accent-1)] dark:hover:border-[var(--accent-1)]/60 ${size}`}
    >
      <span>{tag.name}</span>
      <span className="font-mono text-[10px] opacity-60">{count}</span>
    </Link>
  );
}

export default function TagsPage() {
  const byName = new Map(getAllTags().map((t) => [t.name, t]));
  const grouped = new Set(TAG_GROUPS.flatMap((g) => g.tags));

  // 未归组的标签自动落「其他」,避免新标签在页面上消失
  const others = getAllTags().filter((t) => !grouped.has(t.name));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">标签</h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        共 {getAllTags().length} 个标签,按内容域分成 {TAG_GROUPS.length + (others.length > 0 ? 1 : 0)} 组;字号越大,文章越多。
      </p>

      <div className="mt-8 space-y-8">
        {TAG_GROUPS.map((g) => {
          const items = g.tags.map((n) => byName.get(n)).filter((t): t is CountItem => Boolean(t));
          if (items.length === 0) return null;
          return (
            <section key={g.name}>
              <h2 className="mb-3 text-sm font-semibold text-zinc-400 dark:text-zinc-500">{g.name}</h2>
              <div className="flex flex-wrap gap-2">
                {items.map((t) => (
                  <TagPill key={t.name} tag={t} count={t.count} />
                ))}
              </div>
            </section>
          );
        })}

        {others.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-zinc-400 dark:text-zinc-500">其他</h2>
            <div className="flex flex-wrap gap-2">
              {others.map((t) => (
                <TagPill key={t.name} tag={t} count={t.count} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
