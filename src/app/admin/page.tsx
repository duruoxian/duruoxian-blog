import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/AdminApp";

export const metadata: Metadata = {
  title: "后台管理",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminApp />;
}
