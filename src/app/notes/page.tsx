import type { Metadata } from "next";
import { getNotes } from "@/lib/notes";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "想法",
  description: "短想法:一句话的踩坑、灵感与碎碎念。",
};

export default function NotesPage() {
  const notes = getNotes();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">想法</h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        不够写成文章、但值得记一句的东西。
      </p>

      {notes.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          还没有想法。在 <code>content/notes/</code> 下新建一个 <code>.md</code>(front-matter 里写
          <code>date</code>)即可。
        </p>
      ) : (
        <ol className="mt-6 space-y-3">
          {notes.map((n) => (
            <li
              key={n.slug}
              className="card-glow rounded-xl border border-zinc-200 bg-[var(--card)] p-4 backdrop-blur-xl dark:border-zinc-800"
            >
              <time
                dateTime={n.date}
                className="font-mono text-xs text-zinc-400"
              >
                {formatDate(n.date)}
              </time>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {n.content}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
