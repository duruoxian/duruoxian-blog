// 文章文件（front-matter + Markdown 正文）在浏览器里的解析与序列化。
// 用 js-yaml 保持与构建端 gray-matter 兼容；不认识的键原样保留，避免保存时丢字段。

// js-yaml 在 Turbopack 下必须用具名导入（default 导出解析会失败）
import { dump as yamlDump, load as yamlLoad } from "js-yaml";

export type PostMeta = {
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD 或 ISO 字符串
  description: string;
  category: string;
  tags: string[];
  series?: string;
  cover?: string;
  draft: boolean;
  body: string;
  extra: Record<string, unknown>; // 文件里我们不编辑的键，保存时原样带回
};

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const KNOWN_KEYS = ["title", "date", "description", "category", "tags", "series", "cover", "draft"];

/** 拆出 front-matter：有的返回 { data, body }，没有的返回 null（导入本地 .md 时用） */
export function splitFrontMatter(raw: string): {
  data: Record<string, unknown>;
  body: string;
} | null {
  const match = FRONT_MATTER.exec(raw);
  if (!match) return null;
  return { data: (yamlLoad(match[1]) as Record<string, unknown>) ?? {}, body: match[2] };
}

function toDateString(value: unknown): string {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return value == null ? "" : String(value);
}

export function parsePost(raw: string, slug: string): PostMeta {
  const match = FRONT_MATTER.exec(raw);
  const data = (match ? (yamlLoad(match[1]) as Record<string, unknown>) : {}) ?? {};
  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!KNOWN_KEYS.includes(key)) extra[key] = value;
  }
  return {
    slug,
    title: String(data.title ?? slug),
    date: toDateString(data.date),
    description: String(data.description ?? ""),
    category: String(data.category ?? "未分类"),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    series: data.series ? String(data.series) : undefined,
    cover: data.cover ? String(data.cover) : undefined,
    draft: Boolean(data.draft),
    body: match ? match[2] : raw,
    extra,
  };
}

export function serializePost(post: PostMeta): string {
  const data: Record<string, unknown> = { title: post.title, date: post.date };
  if (post.description) data.description = post.description;
  if (post.category) data.category = post.category;
  if (post.tags.length > 0) data.tags = post.tags;
  if (post.series) data.series = post.series;
  if (post.cover) data.cover = post.cover;
  if (post.draft) data.draft = true;
  for (const [key, value] of Object.entries(post.extra)) data[key] = value;

  const yamlText = yamlDump(data, { lineWidth: -1 });
  return `---\n${yamlText}---\n\n${post.body}`;
}
