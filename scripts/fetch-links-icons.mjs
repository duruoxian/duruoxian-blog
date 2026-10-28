// 构建前抓取 src/data/links.json 里各站的 favicon 到 public/links-icons/，
// 并生成 manifest.json（域名 → 图标路径）。任何失败都不阻塞构建（页面有字母降级）。
// 新增链接无需手动传图标：admin 保存后，下一次 CI 构建会自动补抓。

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const ICON_DIR = path.join(process.cwd(), "public/links-icons");
const MANIFEST = path.join(process.cwd(), "src/data/link-icons.json");
const LINKS = path.join(process.cwd(), "src/data/links.json");

async function main() {
  await mkdir(ICON_DIR, { recursive: true });
  let manifest = {};
  try {
    manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
  } catch {
    // 首次运行没有 manifest
  }

  const links = JSON.parse(await readFile(LINKS, "utf8"));
  let added = 0;

  for (const link of links) {
    let host;
    try {
      host = new URL(link.url).hostname;
    } catch {
      continue; // 非法 URL 交给页面降级
    }
    if (manifest[host]) continue; // 已有图标

    try {
      const res = await fetch(`https://${host}/favicon.ico`, {
        redirect: "follow",
        signal: AbortSignal.timeout(6000),
        headers: { "User-Agent": "Mozilla/5.0 (favicon fetcher)" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 100) throw new Error("too small");
      // 按魔数定扩展名
      const ext =
        buf[0] === 0x89 && buf[1] === 0x50 ? "png"
        : buf.slice(0, 3).toString("ascii") === "GIF" ? "gif"
        : buf[0] === 0xff && buf[1] === 0xd8 ? "jpg"
        : "ico";
      const file = `${host}.${ext}`;
      await writeFile(path.join(ICON_DIR, file), buf);
      manifest[host] = `/links-icons/${file}`;
      added++;
      console.log("[links-icon] ok:", host);
    } catch {
      console.log("[links-icon] skip（页面会用字母降级）:", host);
    }
  }

  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2));
  console.log(`[links-icon] 完成：新增 ${added}，共 ${Object.keys(manifest).length}`);
}

main().catch((err) => {
  console.log("[links-icon] 整体跳过：", err?.message ?? err);
});
// 刻意不 process.exit(非0)：图标失败绝不能挡部署
