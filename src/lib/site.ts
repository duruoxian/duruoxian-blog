// 站点全局配置。
// 「你经常改的个人信息」在 src/data/site.json（后台可视化界面也能改这份文件）；
// 这里放的是网站结构性的配置（网址、导航菜单），平时不需要动。

import siteData from "@/data/site.json";

export const site = {
  ...siteData,

  // 部署后的正式网址（决定 RSS / sitemap / 分享链接）
  // 现在用 Cloudflare Pages 免费域名；以后绑定自己的域名时改这里即可
  url: "https://duruoxian-blog.pages.dev",

  // 顶部导航
  nav: [
    { label: "首页", href: "/" },
    { label: "文章", href: "/posts" },
    { label: "分类", href: "/categories" },
    { label: "标签", href: "/tags" },
    { label: "系列", href: "/series" },
    { label: "资源", href: "/resources" },
    { label: "关于", href: "/about" },
  ],
};

export type Site = typeof site;
