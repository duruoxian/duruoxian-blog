import Script from "next/script";

// Cloudflare Web Analytics（免费、匿名、无 Cookie）。
// 在构建环境里设置 NEXT_PUBLIC_CF_BEACON_TOKEN 即会自动注入统计脚本；
// 没设置则完全不输出任何东西。
// 也可以直接在 Cloudflare 控制台为 Pages 项目一键开启 Web Analytics（无需改代码）。
export function Analytics() {
  const token = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;
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
