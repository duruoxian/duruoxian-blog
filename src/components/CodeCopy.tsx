"use client";

import { useEffect } from "react";

// 给文章里每个代码块注入一个「复制」按钮。
// 因为正文是用 dangerouslySetInnerHTML 渲染的静态 HTML，
// 这里在挂载后直接操作 DOM 包一层容器并加按钮。
export function CodeCopy() {
  useEffect(() => {
    const blocks = Array.from(document.querySelectorAll<HTMLPreElement>(".article-content pre"));
    const cleanups: Array<() => void> = [];

    for (const pre of blocks) {
      if (pre.parentElement?.classList.contains("code-block")) continue;

      const wrapper = document.createElement("div");
      wrapper.className = "code-block";
      pre.parentNode?.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "code-copy";
      btn.textContent = "复制";
      btn.setAttribute("aria-label", "复制代码");

      const onClick = async () => {
        const code = pre.querySelector("code");
        const text = code?.innerText ?? pre.innerText;
        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = "已复制";
          btn.classList.add("copied");
          window.setTimeout(() => {
            btn.textContent = "复制";
            btn.classList.remove("copied");
          }, 1600);
        } catch {
          btn.textContent = "复制失败";
          window.setTimeout(() => {
            btn.textContent = "复制";
          }, 1600);
        }
      };

      btn.addEventListener("click", onClick);
      wrapper.appendChild(btn);
      cleanups.push(() => btn.removeEventListener("click", onClick));
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}
