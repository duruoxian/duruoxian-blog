import Link from "next/link";
import type { Post } from "@/lib/posts";
import { formatDateShort } from "@/lib/format";

export function PostList({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return <p className="text-sm text-zinc-500">这里还没有文章。</p>;
  }
  return (
    <ul className="space-y-2">
      {posts.map((post) => (
        <li key={post.slug} className="rounded-lg border border-zinc-200 bg-[var(--card)] p-4 dark:border-zinc-800">
          <Link href={`/posts/${post.slug}`} className="group block">
            <div className="flex items-baseline gap-3">
              <time className="shrink-0 font-mono text-xs text-zinc-400" dateTime={post.date}>
                {formatDateShort(post.date)}
              </time>
              <h3 className="font-medium group-hover:underline">{post.title}</h3>
            </div>
            {post.description && (
              <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                {post.description}
              </p>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
