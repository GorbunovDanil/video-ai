import type { ReactNode } from "react";
import { DashboardNav } from "@/components/layout/dashboard-nav";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl gap-8 px-6 py-12">
      <div className="hidden w-72 shrink-0 lg:block">
        <DashboardNav />
      </div>
      <div className="flex w-full flex-1 flex-col gap-6">
        <div className="lg:hidden">
          <DashboardNav />
        </div>
        {children}
      </div>
    </div>
  );
}
