"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import { formatDateShort } from "@/lib/format";

type Doc = {
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  date: string;
  excerpt: string;
};

export function SearchClient() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/search-index.json")
      .then((res) => res.json() as Promise<Doc[]>)
      .then((data) => {
        if (cancelled) return;
        setDocs(data);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fuse = useMemo(
    () =>
      new Fuse(docs, {
        keys: [
          { name: "title", weight: 2 },
          { name: "tags", weight: 1.5 },
          { name: "description", weight: 1 },
          { name: "excerpt", weight: 0.5 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [docs]
  );

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return docs.slice(0, 10);
    return fuse.search(q).map((r) => r.item);
  }, [query, docs, fuse]);

  return (
    <div>
      <div className="relative">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索文章标题、标签、内容…"
          autoFocus
          className="w-full rounded-xl border border-zinc-200 bg-[var(--card)] px-4 py-3 pl-11 pr-16 text-sm outline-none transition-colors focus:border-[var(--accent-1)]/70 dark:border-zinc-800"
        />
        <kbd className="pointer-events-none absolute right-3.5 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 sm:flex dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-500">
          Ctrl K
        </kbd>
      </div>

      <p className="mt-3 text-xs text-zinc-400">
        {loaded ? `共 ${docs.length} 篇文章` : "正在加载索引…"}
        {query.trim() && loaded ? ` · 找到 ${results.length} 条` : ""}
      </p>

      <ul className="mt-4 space-y-2">
        {results.map((doc) => (
          <li key={doc.slug}>
            <Link
              href={`/posts/${doc.slug}`}
              className="card-glow group block rounded-xl border border-zinc-200 bg-[var(--card)] p-4 dark:border-zinc-800"
            >
              <div className="flex items-baseline gap-3">
                <time className="shrink-0 font-mono text-xs text-zinc-400" dateTime={doc.date}>
                  {formatDateShort(doc.date)}
                </time>
                <h3 className="font-medium group-hover:underline">{doc.title}</h3>
              </div>
              {(doc.description || doc.excerpt) && (
                <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {doc.description || doc.excerpt}
                </p>
              )}
              {doc.tags.length > 0 && (
                <p className="mt-2 text-xs text-zinc-400"># {doc.tags.join("  # ")}</p>
              )}
            </Link>
          </li>
        ))}
      </ul>

      {loaded && query.trim() && results.length === 0 && (
        <p className="mt-6 text-center text-sm text-zinc-500">没有找到匹配的文章。</p>
      )}
    </div>
  );
}
