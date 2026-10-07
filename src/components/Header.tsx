"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { site } from "@/lib/site";
import { ThemeToggle } from "./ThemeToggle";
import { BgPicker } from "./BgPicker";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // 液态滑动药丸：一枚高亮背景在导航项之间滑动，而不是各自出现
  const navRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef(new Map<string, HTMLAnchorElement>());
  const [pill, setPill] = useState({ left: 0, width: 0, visible: false });
  const [pillReady, setPillReady] = useState(false);

  const activeHref = site.nav.find((item) => isActive(pathname, item.href))?.href;

  const measure = useCallback(() => {
    const nav = navRef.current;
    const el = activeHref ? itemRefs.current.get(activeHref) : undefined;
    if (!nav || !el) {
      setPill((p) => ({ ...p, visible: false }));
      return;
    }
    const navRect = nav.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    setPill({ left: rect.left - navRect.left, width: rect.width, visible: true });
  }, [activeHref]);

  useEffect(() => {
    measure();
    // 首次量完再开启过渡，避免打开页面时药丸从 0 位置飞过来
    const raf = requestAnimationFrame(() => setPillReady(true));
    // 字体加载完成后字宽会变，再量一次
    document.fonts?.ready.then(measure).catch(() => {});
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  function setItemRef(href: string) {
    return (el: HTMLAnchorElement | null) => {
      if (el) itemRefs.current.set(href, el);
      else itemRefs.current.delete(href);
    };
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-[var(--page)]/60 backdrop-blur-xl dark:border-zinc-800/70">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3">
        <Link href="/" className="gradient-text shrink-0 text-base font-bold tracking-tight">
          {site.author.name}
        </Link>

        {/* 桌面端导航：液态滑动药丸 */}
        <nav ref={navRef} className="relative hidden flex-1 items-center gap-1 text-sm sm:flex">
          <span
            aria-hidden
            className={`nav-pill accent-fill absolute top-1/2 -translate-y-1/2 h-[calc(100%-8px)] rounded-full ${
              pill.visible ? "opacity-100" : "opacity-0"
            } ${pillReady ? "" : "no-anim"}`}
            style={{ left: pill.left, width: pill.width }}
          />
          {site.nav.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                ref={setItemRef(item.href)}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative z-10 whitespace-nowrap rounded-lg px-2.5 py-1.5 transition-colors ${
                  active
                    ? "text-white"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <Link
            href="/search"
            aria-label="搜索"
            title="搜索"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </Link>

          <BgPicker />

          <ThemeToggle />

          {/* 移动端菜单按钮 */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="打开菜单"
            aria-expanded={open}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-100 sm:hidden dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              {open ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
            </svg>
          </button>
        </div>
      </div>

      {/* 移动端下拉导航 */}
      {open && (
        <nav className="border-t border-zinc-200 px-4 py-3 sm:hidden dark:border-zinc-800">
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {site.nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`block rounded-lg px-3 py-2 transition-colors ${
                    isActive(pathname, item.href)
                      ? "accent-fill text-white"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
