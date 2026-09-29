export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-live="polite">
      <div className="h-7 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-24 rounded-xl bg-zinc-100 dark:bg-zinc-800/60" />
      <div className="h-24 rounded-xl bg-zinc-100 dark:bg-zinc-800/60" />
      <div className="h-24 rounded-xl bg-zinc-100 dark:bg-zinc-800/60" />
    </div>
  );
}
