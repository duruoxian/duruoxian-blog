import { getAllPosts } from "@/lib/posts";
import { renderMarkdown } from "@/lib/markdown";
import { site } from "@/lib/site";

export const dynamic = "force-static";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cdata(value: string): string {
  // CDATA 里唯一不能出现的是 "]]>"，把它拆开写即可
  return `<![CDATA[${value.replace(/\]\]>/g, "]]]]><![CDATA[>")}]]>`;
}

export async function GET() {
  const posts = getAllPosts();
  const items = await Promise.all(
    posts.map(async (post) => {
      const url = `${site.url}/posts/${post.slug}`;
      // 全文输出：把正文渲染成 HTML 并把站内相对链接/图片补成绝对地址，
      // 这样订阅器（Feedly、Inoreader 等）里可以直接读完整文章。
      const { html } = await renderMarkdown(post.content);
      const full = html.replace(/(src|href)="\/(?!\/)/g, `$1="${site.url}/`);
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <description>${escapeXml(post.description)}</description>
      <content:encoded>${cdata(full)}</content:encoded>
    </item>`;
    })
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(site.title)}</title>
    <link>${site.url}</link>
    <description>${escapeXml(site.description)}</description>
    <language>zh-CN</language>
    <atom:link href="${site.url}/rss.xml" rel="self" type="application/rss+xml" />
${items.join("\n")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
