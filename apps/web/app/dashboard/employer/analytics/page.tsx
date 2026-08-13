"use client";

import { useEffect, useState } from "react";
import { apiRequest, API_ENDPOINTS, getToken } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { FadeUp, Stagger, StaggerItem } from "@/components/motion";
import { STAGE_LABELS } from "@/lib/types";
import { Users, UserCheck, Briefcase, TrendingUp, Target, Star, MessageSquare, type LucideIcon } from "lucide-react";

interface Analytics {
  kpis: {
    activeJobs: number;
    totalApplicants: number;
    shortlisted: number;
    hired: number;
    conversion: number;
    avgPerJob: number;
    interviews: number;
  };
  funnel: { stage: string; count: number }[];
  trend: { date: string; count: number }[];
  topRoles: { title: string; count: number }[];
}

const FUNNEL_ICON: Record<string, LucideIcon> = {
  applied: Users,
  screening: Star,
  shortlisted: UserCheck,
  interview: MessageSquare,
  offer: Target,
  hired: Briefcase,
};

export default function AnalyticsPage() {
  const token = getToken();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const d = await apiRequest<Analytics>(API_ENDPOINTS.projects.analytics, {
          method: "GET",
          token,
        });
        setData(d);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) return null;

  const { kpis, funnel, trend, topRoles } = data;
  const top = funnel[0]?.count || 0;
  const maxTrend = Math.max(1, ...trend.map((t) => t.count));

  const kpiCards = [
    { label: "Active Jobs", value: kpis.activeJobs, icon: Briefcase, sub: "open roles" },
    { label: "Total Applicants", value: kpis.totalApplicants, icon: Users, sub: "all-time" },
    { label: "Shortlisted", value: kpis.shortlisted, icon: UserCheck, sub: "advanced" },
    { label: "Hired", value: kpis.hired, icon: Star, sub: `${kpis.conversion}% conversion` },
    { label: "Interviews", value: kpis.interviews, icon: MessageSquare, sub: "scheduled" },
    { label: "Avg / Job", value: kpis.avgPerJob, icon: TrendingUp, sub: "applicants" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Employer"
        title="Analytics"
        subtitle="Your hiring funnel — where candidates drop off and where to focus next."
      />

      {/* KPI grid */}
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpiCards.map((k) => {
          const Icon = k.icon;
          return (
            <StaggerItem key={k.label} as="div">
              <Card className="stat-soft flex h-full flex-col justify-between p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    {k.label}
                  </span>
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="mt-3">
                  <p className="font-display text-3xl font-bold text-gray-900">{k.value}</p>
                  <p className="text-xs text-gray-400">{k.sub}</p>
                </div>
              </Card>
            </StaggerItem>
          );
        })}
      </Stagger>

      {/* Funnel */}
      <FadeUp>
        <Card className="stat-soft p-6">
          <h3 className="font-display text-lg font-bold text-gray-900">Hiring Funnel</h3>
          <p className="mb-5 text-sm text-gray-500">Candidate volume at each stage.</p>
          <div className="space-y-3">
            {funnel.map((f, i) => {
              const Icon = FUNNEL_ICON[f.stage] ?? Users;
              const pct = top > 0 ? Math.round((f.count / top) * 100) : 0;
              const prev = i === 0 ? f.count : funnel[i - 1].count;
              const dropoff = prev > 0 ? 100 - Math.round((f.count / prev) * 100) : 0;
              return (
                <div key={f.stage} className="flex items-center gap-4">
                  <div className="flex w-36 shrink-0 items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-gray-700">
                      {STAGE_LABELS[f.stage as keyof typeof STAGE_LABELS] ?? f.stage}
                    </span>
                  </div>
                  <div className="relative h-8 flex-1 overflow-hidden rounded-lg bg-gray-100">
                    <div
                      className="flex h-full items-center rounded-lg bg-gradient-to-r from-primary/30 to-primary/70 transition-all duration-700"
                      style={{ width: `${Math.max(pct, 3)}%` }}
                    >
                      <span className="pl-3 text-xs font-semibold text-white">{f.count}</span>
                    </div>
                  </div>
                  <span className="w-14 shrink-0 text-right text-xs text-gray-400">
                    {pct}%
                  </span>
                  {i > 0 && (
                    <span className="w-20 shrink-0 text-right text-xs text-gray-400">
                      {dropoff > 0 ? `−${dropoff}%` : "—"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </FadeUp>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trend */}
        <FadeUp className="lg:col-span-2">
          <Card className="stat-soft h-full p-6">
            <h3 className="font-display text-lg font-bold text-gray-900">
              Applications · Last 14 Days
            </h3>
            <p className="mb-5 text-sm text-gray-500">Daily applicant volume.</p>
            <div className="flex h-40 items-end gap-1.5">
              {trend.map((t) => (
                <div key={t.date} className="group relative flex flex-1 flex-col items-center justify-end">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-primary/30 to-primary/80 transition-all duration-500 group-hover:to-primary"
                    style={{ height: `${(t.count / maxTrend) * 100}%`, minHeight: t.count ? 6 : 2 }}
                    title={`${t.date}: ${t.count}`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-gray-400">
              <span>{trend[0]?.date}</span>
              <span>{trend[trend.length - 1]?.date}</span>
            </div>
          </Card>
        </FadeUp>

        {/* Top roles */}
        <FadeUp>
          <Card className="stat-soft h-full p-6">
            <h3 className="font-display text-lg font-bold text-gray-900">Top Roles</h3>
            <p className="mb-5 text-sm text-gray-500">By applicant volume.</p>
            {topRoles.length === 0 ? (
              <p className="text-sm text-gray-400">No applications yet.</p>
            ) : (
              <div className="space-y-3">
                {topRoles.map((r, i) => (
                  <div key={r.title} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-display text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800">{r.title}</p>
                      <p className="text-xs text-gray-400">{r.count} applicants</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </FadeUp>
      </div>
    </div>
  );
}
