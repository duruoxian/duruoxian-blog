import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Analytics } from "@/components/Analytics";
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
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
  },
  alternates: { canonical: "/" },
  // 网站图标由同目录的 src/app/icon.png / favicon.ico 自动提供（哆啦A梦头像）
};

// 在页面渲染前同步设置主题，避免深色模式闪白。
// 三态：localStorage 里没有值 = 跟随系统；有 'light'/'dark' 则用固定值。
const themeScript = `(function(){try{var e=document.documentElement;var mq=window.matchMedia('(prefers-color-scheme: dark)');var s=localStorage.getItem('theme');if(s){e.dataset.theme=s;}e.classList.toggle('dark',s?s==='dark':mq.matches);mq.addEventListener('change',function(){if(!localStorage.getItem('theme')){e.classList.toggle('dark',mq.matches);}});}catch(_){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col font-sans text-zinc-900 dark:text-zinc-100">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Header />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
