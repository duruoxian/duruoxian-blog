import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 静态导出：npm run build 会生成 out/ 目录，可直接部署到任意静态托管
  output: "export",
  // 静态导出下不支持 Next 默认图片优化；本项目用原生 <img>，这里只是保险
  images: { unoptimized: true },
};

export default nextConfig;
