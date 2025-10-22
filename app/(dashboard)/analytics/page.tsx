"use client";

import { useEffect, useState } from "react";
import { Loader2Icon, TrendingUpIcon, ZapIcon, CheckCircle2Icon, AlertCircleIcon, FolderIcon } from "lucide-react";
import clsx from "clsx";

type AnalyticsData = {
  user: {
    currentCredits: number;
    plan: string;
    memberSince: string;
  };
  summary: {
    totalRenders: number;
    successfulRenders: number;
    successRate: number;
    totalCreditsSpent: number;
  };
  renderStats: Array<{
    type: string;
    status: string;
    _count: number;
  }>;
  creditsByDay: Array<{
    date: string;
    spent: number;
    earned: number;
  }>;
  rendersByDay: Array<{
    date: string;
    count: number;
  }>;
  topProjects: Array<{
    id: string;
    name: string;
    renderCount: number;
  }>;
  usageEvents: Array<{
    type: string;
    count: number;
  }>;
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(30);

  const fetchAnalytics = async (days: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/analytics?days=${days}`);
      if (!response.ok) throw new Error("Failed to fetch analytics");

      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
      console.error("Analytics fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(timeRange);
  }, [timeRange]);

  if (isLoading) {
    return (
      <main className="space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Analytics</p>
          <h1 className="text-3xl font-semibold text-white">Usage Analytics</h1>
        </header>
        <div className="flex items-center justify-center py-12">
          <Loader2Icon className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Analytics</p>
          <h1 className="text-3xl font-semibold text-white">Usage Analytics</h1>
        </header>
        <div className="rounded-2xl border border-red-800 bg-red-900/20 p-6 text-center">
          <p className="text-sm text-red-200">{error || "Failed to load analytics"}</p>
          <button
            onClick={() => fetchAnalytics(timeRange)}
            className="mt-3 text-xs text-red-300 underline hover:text-red-100"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  const { user, summary, renderStats, creditsByDay, rendersByDay, topProjects } = data;

  // Calculate totals by type
  const imageCount = renderStats
    .filter(s => s.type === "IMAGE")
    .reduce((sum, s) => sum + s._count, 0);

  const videoCount = renderStats
    .filter(s => s.type === "VIDEO_PREVIEW" || s.type === "VIDEO_FINAL")
    .reduce((sum, s) => sum + s._count, 0);

  return (
    <main className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Analytics</p>
        <h1 className="text-3xl font-semibold text-white">Usage Analytics</h1>
        <p className="max-w-3xl text-sm text-slate-400">
          Track your AI generation activity, credit usage, and performance metrics.
        </p>
      </header>

      {/* Time Range Selector */}
      <div className="flex flex-wrap gap-2">
        {[7, 30, 90].map((days) => (
          <button
            key={days}
            type="button"
            onClick={() => setTimeRange(days)}
            className={clsx(
              "rounded-full border px-4 py-2 text-sm transition",
              timeRange === days
                ? "border-brand-500 bg-brand-500/20 text-brand-100"
                : "border-slate-700 text-slate-300 hover:border-slate-600"
            )}
          >
            Last {days} days
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="flex items-center justify-between">
            <ZapIcon className="h-5 w-5 text-brand-500" />
            <span className="text-xs text-slate-400">{user.plan}</span>
          </div>
          <p className="mt-4 text-3xl font-bold text-white">{user.currentCredits}</p>
          <p className="mt-1 text-sm text-slate-400">Credits Available</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="flex items-center justify-between">
            <TrendingUpIcon className="h-5 w-5 text-blue-500" />
          </div>
          <p className="mt-4 text-3xl font-bold text-white">{summary.totalRenders}</p>
          <p className="mt-1 text-sm text-slate-400">Total Renders</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="flex items-center justify-between">
            <CheckCircle2Icon className="h-5 w-5 text-green-500" />
          </div>
          <p className="mt-4 text-3xl font-bold text-white">{summary.successRate}%</p>
          <p className="mt-1 text-sm text-slate-400">Success Rate</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="flex items-center justify-between">
            <AlertCircleIcon className="h-5 w-5 text-orange-500" />
          </div>
          <p className="mt-4 text-3xl font-bold text-white">{summary.totalCreditsSpent}</p>
          <p className="mt-1 text-sm text-slate-400">Credits Spent</p>
        </div>
      </div>

      {/* Render Activity by Type */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="text-xl font-semibold text-white">Render Activity</h2>
        <p className="mt-1 text-sm text-slate-400">Breakdown by content type</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-sm font-medium text-slate-300">Images</p>
            <p className="mt-2 text-2xl font-bold text-white">{imageCount}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-brand-500"
                style={{
                  width: `${Math.min(100, (imageCount / Math.max(summary.totalRenders, 1)) * 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-sm font-medium text-slate-300">Videos</p>
            <p className="mt-2 text-2xl font-bold text-white">{videoCount}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-purple-500"
                style={{
                  width: `${Math.min(100, (videoCount / Math.max(summary.totalRenders, 1)) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Renders Over Time */}
      {rendersByDay.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-xl font-semibold text-white">Render Activity Timeline</h2>
          <p className="mt-1 text-sm text-slate-400">Daily render count</p>

          <div className="mt-6 flex items-end gap-2 overflow-x-auto">
            {rendersByDay.slice(-14).map((day) => {
              const maxCount = Math.max(...rendersByDay.map(d => d.count), 1);
              const height = (day.count / maxCount) * 100;

              return (
                <div key={day.date} className="flex min-w-[40px] flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t bg-brand-500 transition-all hover:bg-brand-400"
                    style={{ height: `${Math.max(height, 10)}px` }}
                    title={`${day.date}: ${day.count} renders`}
                  />
                  <p className="text-xs text-slate-500">
                    {new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Credits Usage */}
      {creditsByDay.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-xl font-semibold text-white">Credit Usage</h2>
          <p className="mt-1 text-sm text-slate-400">Daily credits spent vs earned</p>

          <div className="mt-6 space-y-3">
            {creditsByDay.slice(-10).map((day) => (
              <div key={day.date} className="flex items-center gap-4">
                <p className="w-24 text-xs text-slate-500">
                  {new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full bg-red-500"
                        style={{ width: `${Math.min(100, (day.spent / 20) * 100)}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-xs text-red-400">-{day.spent}</span>
                  </div>
                  {day.earned > 0 && (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${Math.min(100, (day.earned / 20) * 100)}%` }}
                        />
                      </div>
                      <span className="w-16 text-right text-xs text-green-400">+{day.earned}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Projects */}
      {topProjects.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-xl font-semibold text-white">Most Active Projects</h2>
          <p className="mt-1 text-sm text-slate-400">Projects ranked by render count</p>

          <div className="mt-6 space-y-3">
            {topProjects.map((project, index) => (
              <div
                key={project.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/20 text-sm font-semibold text-brand-400">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-white">{project.name}</p>
                    <p className="text-xs text-slate-400">{project.renderCount} renders</p>
                  </div>
                </div>
                <FolderIcon className="h-5 w-5 text-slate-500" />
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
