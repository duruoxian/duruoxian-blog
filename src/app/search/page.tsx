import type { Metadata } from "next";
import { SearchClient } from "@/components/SearchClient";

export const metadata: Metadata = { title: "搜索", description: "站内搜索" };

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">搜索</h1>
      <SearchClient />
    </div>
  );
}
