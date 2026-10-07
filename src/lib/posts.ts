import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

// 文章存放目录：content/posts/*.md
const POSTS_DIR = path.join(process.cwd(), "content", "posts");

export type Post = {
  slug: string;
  title: string;
  date: string; // ISO 字符串，如 2026-09-01T00:00:00.000Z
  description: string;
  tags: string[];
  category: string;
  series?: string;
  cover?: string;
  draft: boolean;
  content: string; // 正文 Markdown（不含 front-matter）
  readingTime: number; // 预计阅读分钟数
  wordCount: number; // 正文字数（中文按字、英文按词）
};

/** 把 YAML 里可能被解析成 Date 的日期统一成 ISO 字符串 */
function normalizeDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
    return value;
  }
  return new Date(0).toISOString();
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

/** 中英混排的阅读时长估算：中文按 400 字/分，英文按 200 词/分 */
function estimateReadingTime(content: string): number {
  const cjk = (content.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const words = (content.replace(/[\u4e00-\u9fff]/g, " ").match(/[A-Za-z0-9]+/g) ?? []).length;
  const minutes = cjk / 400 + words / 200;
  return Math.max(1, Math.round(minutes));
}

/** 中英混排的字数：中文字逐个计，英文数字按词计 */
function countWords(content: string): number {
  const cjk = (content.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const words = (content.replace(/[\u4e00-\u9fff]/g, " ").match(/[A-Za-z0-9]+/g) ?? []).length;
  return cjk + words;
}

export function getPostSlugs(): string[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".md") || f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx?$/, ""));
}

export function getPostBySlug(slug: string): Post | null {
  const mdPath = path.join(POSTS_DIR, `${slug}.md`);
  const mdxPath = path.join(POSTS_DIR, `${slug}.mdx`);
  const filePath = fs.existsSync(mdPath) ? mdPath : fs.existsSync(mdxPath) ? mdxPath : null;
  if (!filePath) return null;

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);

  return {
    slug,
    title: data.title ?? slug,
    date: normalizeDate(data.date),
    description: data.description ?? "",
    tags: toStringArray(data.tags),
    category: data.category ?? "未分类",
    series: data.series ? String(data.series) : undefined,
    cover: data.cover ? String(data.cover) : undefined,
    draft: Boolean(data.draft),
    content,
    readingTime: estimateReadingTime(content),
    wordCount: countWords(content),
  };
}

// 生产构建时把解析结果缓存起来：一次构建会多次调用 getAllPosts，
// 每次都读盘 + 解析 YAML 很浪费。开发模式不缓存，保证改文章即时生效。
const CACHE_ENABLED = process.env.NODE_ENV === "production";
let cachedPosts: Post[] | null = null;

/** 全部已发布文章，按日期倒序 */
export function getAllPosts(): Post[] {
  if (CACHE_ENABLED && cachedPosts) return cachedPosts;

  const posts = getPostSlugs()
    .map((slug) => getPostBySlug(slug))
    .filter((p): p is Post => p !== null && !p.draft)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  if (CACHE_ENABLED) cachedPosts = posts;
  return posts;
}

/** 把 Markdown 粗略转成纯文本，用于搜索索引与摘要 */
export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ") // 代码块
    .replace(/`[^`]*`/g, " ") // 行内代码
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // 链接保留文字
    .replace(/^#{1,6}\s+/gm, "") // 标题符号
    .replace(/^\s*>\s?/gm, "") // 引用
    .replace(/[*_~|-]{1,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getPostsByTag(tag: string): Post[] {
  return getAllPosts().filter((p) => p.tags.includes(tag));
}

export function getPostsByCategory(category: string): Post[] {
  return getAllPosts().filter((p) => p.category === category);
}

export function getPostsBySeries(series: string): Post[] {
  // 系列内部按时间正序，方便按教程顺序阅读
  return getAllPosts()
    .filter((p) => p.series === series)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export type CountItem = { name: string; count: number };

function tally(values: string[]): CountItem[] {
  const map = new Map<string, number>();
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function getAllTags(): CountItem[] {
  return tally(getAllPosts().flatMap((p) => p.tags));
}

export function getAllCategories(): CountItem[] {
  return tally(getAllPosts().map((p) => p.category));
}

export function getAllSeries(): CountItem[] {
  return tally(
    getAllPosts()
      .map((p) => p.series)
      .filter((s): s is string => Boolean(s))
  );
}

/** 归档：按年份分组 */
export function getPostsGroupedByYear(): { year: string; posts: Post[] }[] {
  const map = new Map<string, Post[]>();
  for (const post of getAllPosts()) {
    const year = post.date.slice(0, 4);
    if (!map.has(year)) map.set(year, []);
    map.get(year)!.push(post);
  }
  return [...map.entries()].map(([year, posts]) => ({ year, posts }));
}
