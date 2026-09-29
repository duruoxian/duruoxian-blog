import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    template: `%s · ${site.title}`,
  },
  description: site.description,
  authors: [{ name: site.author.name, url: site.url }],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: site.url,
    siteName: site.title,
    title: site.title,
    description: site.description,
  },
  // 网站图标由同目录的 src/app/icon.png 自动提供（哆啦A梦头像）
};

// 在页面渲染前同步设置主题，避免深色模式闪白
const themeScript = `(function(){try{var e=document.documentElement;var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;e.classList.toggle('dark',d);}catch(_){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col font-sans text-zinc-900 dark:text-zinc-100">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Header />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
