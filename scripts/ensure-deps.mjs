// 跨平台自检：node_modules 里的原生依赖是「分系统」的。
// 当 Windows 和 Linux 共用同一个文件夹（同一个 node_modules）时，
// 后安装的一方会覆盖另一方的原生二进制，导致 lightningcss 等加载失败。
//
// 这个脚本在 dev / build / deploy 之前自动运行：
// 检测当前系统下的原生模块是否可加载，不行就自动 npm install 重装。
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

const require = createRequire(import.meta.url);

function canLoad(name) {
  try {
    require(name);
    return true;
  } catch {
    return false;
  }
}

// lightningcss 是被 Tailwind v4 依赖的原生模块，也是跨系统冲突时最先报错的。
if (canLoad("lightningcss")) {
  process.exit(0);
}

console.warn(
  "\n[ensure-deps] 检测到本地原生依赖与当前系统不匹配（常见于 Windows/Linux 共用同一 node_modules）。\n" +
    "[ensure-deps] 正在自动执行 npm install 重装当前系统的依赖…\n"
);

try {
  execSync("npm install", { stdio: "inherit" });
} catch {
  console.error("\n[ensure-deps] 自动重装失败，请手动执行： npm install\n");
  process.exit(1);
}

if (!canLoad("lightningcss")) {
  console.error(
    "\n[ensure-deps] 重装后仍无法加载原生依赖，请检查 Node 版本或手动执行 npm ci。\n"
  );
  process.exit(1);
}
