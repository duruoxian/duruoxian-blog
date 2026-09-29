import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug, getPostSlugs } from "@/lib/posts";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate } from "@/lib/format";
import { Toc } from "@/components/Toc";
import { TagBadge } from "@/components/TagBadge";
import { SeriesNav } from "@/components/SeriesNav";
import { site } from "@/lib/site";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "文章未找到" };
  return {
    title: post.title,
    description: post.description,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: `${site.url}/posts/${post.slug}`,
      publishedTime: post.date,
      images: post.cover ? [post.cover] : undefined,
    },
  };
}

export default async function PostPage({ params }: Params) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post || post.draft) notFound();

  const { html, toc } = await renderMarkdown(post.content);

  const all = getAllPosts();
  const i = all.findIndex((p) => p.slug === post.slug);
  const prev = i > 0 ? all[i - 1] : null; // 更新的文章
  const next = i >= 0 && i < all.length - 1 ? all[i + 1] : null; // 更旧的文章

  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_220px]">
      <article className="min-w-0">
        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
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
          <h1 className="mt-2 text-3xl font-bold leading-tight">{post.title}</h1>
          {post.description && (
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">{post.description}</p>
          )}
        </header>

        <div
          className="article-content prose prose-zinc max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {post.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        )}

        {post.series && <SeriesNav series={post.series} currentSlug={post.slug} />}

        <nav className="mt-8 grid gap-3 border-t border-zinc-200 pt-6 text-sm sm:grid-cols-2 dark:border-zinc-800">
          <div>
            {prev && (
              <Link href={`/posts/${prev.slug}`} className="text-blue-600 hover:underline dark:text-blue-400">
                ← 上一篇：{prev.title}
              </Link>
            )}
          </div>
          <div className="sm:text-right">
            {next && (
              <Link href={`/posts/${next.slug}`} className="text-blue-600 hover:underline dark:text-blue-400">
                下一篇：{next.title} →
              </Link>
            )}
          </div>
        </nav>
      </article>

      <aside className="hidden xl:block">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto no-scrollbar">
          <Toc items={toc} />
        </div>
      </aside>
    </div>
  );
}
