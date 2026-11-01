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
  // 分类/标签/系列不再各占一格:它们全部并入「文章」页(系列置顶卡+分类筛选+标签云),
  // 页面本身仍在(/categories /tags /series,footer 有入口),只是不让导航背 9 个词。
  nav: [
    { label: "首页", href: "/" },
    { label: "文章", href: "/posts" },
    { label: "项目", href: "/projects" },
    { label: "资源", href: "/resources" },
    { label: "刷题", href: "/quiz/" },
    { label: "关于", href: "/about" },
  ],
};

export type Site = typeof site;
