"use client";

import type { ReactNode } from "react";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { ProjectSwitcher } from "@/components/projects/project-switcher";
import { ProjectProvider } from "@/contexts/project-context";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ProjectProvider>
      <div className="mx-auto flex min-h-screen max-w-6xl gap-8 px-6 py-12">
        <div className="hidden w-72 shrink-0 space-y-4 lg:block">
          <ProjectSwitcher />
          <DashboardNav />
        </div>
        <div className="flex w-full flex-1 flex-col gap-6">
          <div className="space-y-4 lg:hidden">
            <ProjectSwitcher />
            <DashboardNav />
          </div>
          {children}
        </div>
      </div>
    </ProjectProvider>
  );
}
