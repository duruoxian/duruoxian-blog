import type { TocItem } from "@/lib/markdown";

export function Toc({ items }: { items: TocItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="目录" className="text-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">目录</p>
      <ul className="space-y-1.5 border-l border-zinc-200 dark:border-zinc-800">
        {items.map((item) => (
          <li key={item.id} style={{ paddingLeft: Math.max(0, item.depth - 2) * 12 + 12 }}>
            <a
              href={`#${item.id}`}
              className="-ml-3 block truncate border-l border-transparent pl-3 text-zinc-500 hover:border-zinc-400 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
