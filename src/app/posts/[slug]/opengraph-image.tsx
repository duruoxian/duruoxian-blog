import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import { getPostBySlug, getPostSlugs } from "@/lib/posts";
import { site } from "@/lib/site";

export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = site.title;
export const dynamic = "force-static";
export const revalidate = false;

/** 把标题按显示宽度折行：CJK 算 1 格，拉丁单词不拆断；最多 3 行，超出加省略号 */
function wrapTitle(t: string, width = 16, maxLines = 3) {
  const isCJK = (ch: string) => /[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/.test(ch);
  const cw = (s: string) => [...s].reduce((a, ch) => a + (isCJK(ch) ? 1 : 0.55), 0);
  // 切分成不可再拆的单元：CJK 单字、空格、连续拉丁串
  const tokens: string[] = [];
  let buf = "";
  for (const ch of t) {
    if (isCJK(ch)) {
      if (buf) { tokens.push(buf); buf = ""; }
      tokens.push(ch);
    } else if (ch === " ") {
      if (buf) { tokens.push(buf); buf = ""; }
      tokens.push(" ");
    } else buf += ch;
  }
  if (buf) tokens.push(buf);

  const lines: string[] = [];
  let cur = "";
  let w = 0;
  let truncated = false;
  for (const tk of tokens) {
    const tw = cw(tk);
    if (w + tw > width && cur) {
      lines.push(cur.trimEnd());
      cur = "";
      w = 0;
      if (lines.length === maxLines) { truncated = true; break; }
      if (tk === " ") continue;
    }
    cur += tk;
    w += tw;
  }
  if (!truncated && cur) lines.push(cur.trimEnd());
  else truncated = truncated || Boolean(cur);
  if (truncated) lines[maxLines - 1] = (lines[maxLines - 1] ?? "").trimEnd() + "…";
  return lines.filter(Boolean).slice(0, maxLines);
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  const title = post ? post.title : site.title;
  const meta = post ? `${post.category} · ${post.date.slice(0, 10)}` : "个人博客";
  const lines = wrapTitle(title);

  const fontDir = path.join(process.cwd(), "src/assets/fonts");
  const cjk = fs.readFileSync(path.join(fontDir, "noto-sans-sc-chinese-simplified-700-normal.woff"));
  const latin = fs.readFileSync(path.join(fontDir, "noto-sans-sc-latin-700-normal.woff"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: "linear-gradient(135deg, #0b1020 0%, #12203f 48%, #0e2a3a 100%)",
          color: "#eaf1fb",
          fontFamily: "Noto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 30, color: "#7fb0ee", letterSpacing: 2 }}>
            {site.author.name ?? site.title}
          </div>
          <div
            style={{
              display: "flex",
              padding: "8px 20px",
              border: "1px solid rgba(127,176,238,0.45)",
              borderRadius: 999,
              fontSize: 22,
              color: "#9db8d8",
            }}
          >
            {meta}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {lines.map((l, i) => (
            <div
              key={i}
              style={{ display: "flex", fontSize: 62, fontWeight: 700, lineHeight: 1.25 }}
            >
              {l}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 24,
            color: "#8ea6c8",
          }}
        >
          <div style={{ display: "flex", color: "#c9dcf5" }}>{site.title}</div>
          <div style={{ display: "flex" }}>{site.url.replace("https://", "")}</div>
        </div>
      </div>
    ),
    { ...size, fonts: [
      { name: "Noto", data: cjk, weight: 700, style: "normal" },
      { name: "Noto", data: latin, weight: 700, style: "normal" },
    ] },
  );
}
