// 构建前校验 content/posts/*.md 的 front-matter:
// 必填字段缺失直接报错拦下构建,防止「漏了 description 静默上线」。
// 用法:node scripts/check-content.mjs(prebuild 自动执行)
import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "content", "posts");
const REQUIRED = ["title", "date", "description", "category"];
let errors = 0;
let warnings = 0;

function fail(msg) {
  console.error(`  ✗ ${msg}`);
  errors++;
}

function warn(msg) {
  console.warn(`  ⚠ ${msg}`);
  warnings++;
}

for (const f of fs.readdirSync(DIR).filter((f) => f.endsWith(".md") || f.endsWith(".mdx"))) {
  const raw = fs.readFileSync(path.join(DIR, f), "utf8");
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) {
    fail(`${f}: 缺 front-matter`);
    continue;
  }
  const fm = m[1];
  const has = (k) => new RegExp(`^${k}:`, "m").test(fm);

  for (const k of REQUIRED) {
    if (!has(k)) fail(`${f}: 缺必填字段 ${k}`);
  }
  if (!has("tags")) warn(`${f}: 没有 tags(标签页和搜索会少一条入口)`);
  if (!has("cover")) warn(`${f}: 没有 cover(列表页无缩略图)`);

  const desc = fm.match(/^description:\s*"?(.*?)"?\s*$/m)?.[1] ?? "";
  if (desc.length > 120) warn(`${f}: description ${desc.length} 字偏长,卡片里会被截断`);
}

console.log(`front-matter 校验完成:${errors} 个错误,${warnings} 个提醒`);
process.exit(errors > 0 ? 1 : 0);
