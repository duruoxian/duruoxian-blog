// 站点全局配置：所有「你的个人信息」都在这里改，改完全站生效。

export const site = {
  // 浏览器标签标题 / SEO 标题后缀
  title: "DuRuoxian 的博客",
  // 一句话简介，用于首页和 SEO 描述
  description: "DuRuoxian 的个人博客，记录学习与技术折腾。",
  // 部署后的正式网址（决定 RSS / sitemap / 分享链接）
  // 现在用 Cloudflare Pages 免费域名；以后绑定自己的域名时改这里即可
  url: "https://duruoxian-blog.pages.dev",
  // 建站年份，用于页脚版权
  since: 2026,

  author: {
    name: "DuRuoxian", // 昵称
    avatar: "/avatar.jpg", // 头像：public/avatar.jpg
    bio: "重庆师范大学软件工程在读。", // 一句话介绍
    email: "drx00112233@qq.com", // 邮箱
    school: "重庆师范大学", // 学校
    major: "软件工程", // 专业
    location: "中国重庆", // 所在地
    github: "https://github.com/duruoxian", // GitHub
    githubUser: "duruoxian", // GitHub 用户名（首页活跃度热力图用）
  },

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
} as const;

export type Site = typeof site;
