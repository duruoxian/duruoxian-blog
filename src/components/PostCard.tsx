import Link from "next/link";
import type { Post } from "@/lib/posts";
import { formatDate } from "@/lib/format";
import { TagBadge } from "./TagBadge";

export function PostCard({ post, compact = false }: { post: Post; compact?: boolean }) {
  return (
    <article className="group rounded-xl border border-zinc-200 bg-[var(--card)] p-5 transition-shadow hover:shadow-md dark:border-zinc-800">
      {!compact && post.cover && (
        <Link href={`/posts/${post.slug}`} className="mb-4 block overflow-hidden rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.cover}
            alt={post.title}
            className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </Link>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
        <time dateTime={post.date}>{formatDate(post.date)}</time>
        <span aria-hidden>·</span>
        <Link
          href={`/categories/${encodeURIComponent(post.category)}`}
          className="hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          {post.category}
        </Link>
        <span aria-hidden>·</span>
        <span>{post.readingTime} 分钟</span>
      </div>

      <h2 className="mt-2 text-lg font-semibold leading-snug">
        <Link href={`/posts/${post.slug}`} className="hover:underline">
          {post.title}
        </Link>
      </h2>

      {post.description && (
        <p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
          {post.description}
        </p>
      )}

      {post.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
      )}
    </article>
  );
}
