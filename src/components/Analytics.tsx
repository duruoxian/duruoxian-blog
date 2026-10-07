import Script from "next/script";
import { site } from "@/lib/site";

// Cloudflare Web Analytics（免费、匿名、无 Cookie）。
// 两种开启方式任选其一：
// 1. 在 src/data/site.json 的 analytics.cloudflareToken 里粘贴 Token；
// 2. 构建环境设置 NEXT_PUBLIC_CF_BEACON_TOKEN 环境变量；
// 3. 也可以直接在 Cloudflare 控制台为 Pages 项目一键开启 Web Analytics（无需改代码）。
// 都没配置则完全不输出任何东西。
export function Analytics() {
  const token = site.analytics?.cloudflareToken || process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;
  if (!token) return null;

  return (
    <Script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={JSON.stringify({ token })}
      strategy="afterInteractive"
    />
  );
}
