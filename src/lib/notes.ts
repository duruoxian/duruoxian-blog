import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

// 短想法(Notes):content/notes/*.md,每篇 = 一段话 + 日期。
// 与文章不同:没有标题/标签/分类,不进 RSS 与搜索,只求「想记一句时没有负担」。
const NOTES_DIR = path.join(process.cwd(), "content", "notes");

export type Note = {
  slug: string;
  date: string; // ISO 字符串
  content: string; // 正文(不含 front-matter),一段话
};

export function getNotes(): Note[] {
  if (!fs.existsSync(NOTES_DIR)) return [];
  return fs
    .readdirSync(NOTES_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(NOTES_DIR, f), "utf8");
      const { data, content } = matter(raw);
      const date =
        data.date instanceof Date
          ? data.date.toISOString()
          : new Date(String(data.date ?? f)).toISOString();
      return { slug: f.replace(/\.md$/, ""), date, content: content.trim() };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}
