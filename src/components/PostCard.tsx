import Link from "next/link";
import type { Post } from "@/lib/posts";
import { formatDate } from "@/lib/format";
import { TagBadge } from "./TagBadge";

export function PostCard({ post, compact = false }: { post: Post; compact?: boolean }) {
  // 首页紧凑模式：文字在左、小缩略图在右；列表页（非 compact）：大封面在上
  const showSideThumb = compact && post.cover;

  const meta = (
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
  );

  const title = (
    <h2 className="mt-2 text-lg font-semibold leading-snug">
      <Link href={`/posts/${post.slug}`} className="hover:underline">
        {post.title}
      </Link>
    </h2>
  );

  const description = post.description && (
    <p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{post.description}</p>
  );

  const tags = post.tags.length > 0 && (
    <div className="mt-3 flex flex-wrap gap-2">
      {post.tags.map((tag) => (
        <TagBadge key={tag} tag={tag} />
      ))}
    </div>
  );

  return (
    <article className="card-glow group rounded-xl border border-zinc-200 bg-[var(--card)] p-5 backdrop-blur-xl dark:border-zinc-800">
      {!compact && post.cover && (
        <Link href={`/posts/${post.slug}`} className="mb-4 block overflow-hidden rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.cover}
            alt={post.title}
            loading="lazy"
            decoding="async"
            className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </Link>
      )}

      {showSideThumb ? (
        <div className="flex gap-5">
          <div className="min-w-0 flex-1">
            {meta}
            {title}
            {description}
            {tags}
          </div>
          <Link
            href={`/posts/${post.slug}`}
            aria-hidden
            tabIndex={-1}
            className="block shrink-0 self-start overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.cover}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-16 w-24 object-cover transition-transform duration-300 group-hover:scale-[1.04] sm:h-20 sm:w-28"
            />
          </Link>
        </div>
      ) : (
        <>
          {meta}
          {title}
          {description}
          {tags}
        </>
      )}
    </article>
  );
}
