import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug, getPostSlugs } from "@/lib/posts";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate } from "@/lib/format";
import { Toc } from "@/components/Toc";
import { TagBadge } from "@/components/TagBadge";
import { SeriesNav } from "@/components/SeriesNav";
import { CodeCopy } from "@/components/CodeCopy";
import { ReadingProgress } from "@/components/ReadingProgress";
import { ShareLink } from "@/components/ShareLink";
import { PostList } from "@/components/PostList";
import { PrevNextNav } from "@/components/PrevNextNav";
import { AuthorCard } from "@/components/AuthorCard";
import { ImageZoom } from "@/components/ImageZoom";
import { site } from "@/lib/site";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

/** 相关文章：共享标签数 ×2 + 同分类 ×1 打分，取前几篇 */
function getRelatedPosts(currentSlug: string, tags: string[], category: string, limit = 3) {
  return getAllPosts()
    .filter((p) => p.slug !== currentSlug)
    .map((p) => ({
      post: p,
      score:
        p.tags.filter((t) => tags.includes(t)).length * 2 + (p.category === category ? 1 : 0),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || (a.post.date < b.post.date ? 1 : -1))
    .slice(0, limit)
    .map((x) => x.post);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "文章未找到" };
  const url = `${site.url}/posts/${post.slug}`;
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/posts/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url,
      publishedTime: post.date,
      images: post.cover ? [post.cover] : undefined,
    },
    twitter: {
      card: post.cover ? "summary_large_image" : "summary",
      title: post.title,
      description: post.description,
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
  const related = getRelatedPosts(post.slug, post.tags, post.category);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    url: `${site.url}/posts/${post.slug}`,
    author: { "@type": "Person", name: site.author.name, url: site.author.github },
    keywords: post.tags.join(", "),
    image: post.cover ? `${site.url}${post.cover}` : undefined,
  };

  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_220px]">
      <ReadingProgress />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
            <span aria-hidden>·</span>
            <span>约 {post.wordCount.toLocaleString("zh-CN")} 字</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold leading-tight">{post.title}</h1>
          {post.description && (
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">{post.description}</p>
          )}
        </header>

        {post.cover && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={post.cover}
            alt={post.title}
            className="mb-8 w-full rounded-xl border border-zinc-200 object-cover shadow-lg shadow-[var(--accent-1)]/5 dark:border-zinc-800"
          />
        )}

        {toc.length > 0 && (
          <details className="mb-8 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800 xl:hidden">
            <summary className="cursor-pointer text-sm font-medium">目录</summary>
            <div className="mt-3">
              <Toc items={toc} />
            </div>
          </details>
        )}

        <div
          className="article-content prose prose-zinc max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <CodeCopy />
        <ImageZoom />

        {post.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        )}

        {post.series && <SeriesNav series={post.series} currentSlug={post.slug} />}

        <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <ShareLink title={post.title} />
        </div>

        <AuthorCard />

        {related.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400">相关文章</h2>
            <PostList posts={related} />
          </section>
        )}

        <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <PrevNextNav prev={prev} next={next} />
        </div>
      </article>

      <aside className="hidden xl:block">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto no-scrollbar">
          <Toc items={toc} />
        </div>
      </aside>
    </div>
  );
}
