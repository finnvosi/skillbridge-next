"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, API_ENDPOINTS, getToken } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, StatCard } from "@/components/layout/page-header";
import { FadeUp, Stagger, StaggerItem } from "@/components/motion";
import { Magnetic } from "@/components/motion/primitives2";
import { STAGE_ORDER, STAGE_LABELS, ApplicationStage } from "@/lib/types";
import {
  Briefcase,
  Users,
  Star,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  AlertCircle,
  Sparkles,
} from "lucide-react";

interface Overview {
  company: { name: string; industry?: string | null; verified: boolean };
  metrics: {
    activeJobs: number;
    totalApplications: number;
    shortlisted: number;
    hiresInProgress: number;
    needsReview: number;
  };
  pipeline: { stage: ApplicationStage; count: number }[];
  attention: {
    applicationId: string;
    candidate: string;
    email: string;
    job: string;
    projectId: string;
    stage: ApplicationStage;
    appliedAt: string;
  }[];
  activity: { type: string; text: string; at: string; projectId: string }[];
}

export default function EmployerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Overview | null>(null);
  const [activeStage, setActiveStage] = useState<ApplicationStage | null>(null);
  const token = getToken();
  const router = useRouter();

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const d = await apiRequest<Overview>(API_ENDPOINTS.projects.employerOverview, {
          method: "GET",
          token,
        });
        setData(d);
      } catch {
        // empty
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Employer" title="Talent Pipeline" subtitle="Manage your opportunities." />
        <Card className="p-8 text-center text-gray-500">No data available.</Card>
      </div>
    );
  }

  const { company, metrics, pipeline, attention, activity } = data;
  const totalPipeline = pipeline.reduce((s, p) => s + p.count, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`${company.name}${company.verified ? " · Verified" : ""}`}
        title="Talent Pipeline"
        subtitle="Your hiring command center — what's happening, what needs you, and what's next."
        actions={
          <Magnetic>
            <Button asChild>
              <Link href="/dashboard/employer/projects/new">Post opportunity</Link>
            </Button>
          </Magnetic>
        }
      />

      {/* Key metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Briefcase} label="Active Jobs" value={metrics.activeJobs} accent="text-primary" soft primary />
        <StatCard icon={Users} label="Total Applications" value={metrics.totalApplications} accent="text-gray-900" soft />
        <StatCard icon={Star} label="Shortlisted" value={metrics.shortlisted} accent="text-purple-600" soft />
        <StatCard icon={CheckCircle2} label="Hires in Progress" value={metrics.hiresInProgress} accent="text-green-600" soft />
      </div>

      {/* Hiring pipeline */}
      <section>
        <h2 className="display text-lg font-semibold text-gray-900 mb-3">Hiring Pipeline</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {STAGE_ORDER.map((stage) => {
            const count = pipeline.find((p) => p.stage === stage)?.count ?? 0;
            const isActive = activeStage === stage;
            const pct = totalPipeline ? Math.round((count / totalPipeline) * 100) : 0;
            return (
              <button
                key={stage}
                onClick={() => setActiveStage(isActive ? null : stage)}
                className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 ${
                  isActive
                    ? "border-primary/40 bg-primary/5 shadow-soft"
                    : "border-gray-200 bg-white/70 hover:border-primary/30 hover:shadow-soft"
                }`}
              >
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {STAGE_LABELS[stage]}
                </div>
                <div className="mt-1 font-display text-2xl font-bold text-gray-900">{count}</div>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-light to-primary transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
        {activeStage && (
          <p className="mt-2 text-sm text-gray-500">
            {pipeline.find((p) => p.stage === activeStage)?.count ?? 0} candidate(s) in{" "}
            <span className="font-medium text-gray-700">{STAGE_LABELS[activeStage]}</span>.{" "}
            <Link
              href={`/dashboard/employer/candidates?stage=${activeStage}`}
              className="text-primary hover:underline"
            >
              View them →
            </Link>
          </p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Needs your attention */}
        <section>
          <h2 className="display flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
            <AlertCircle className="h-5 w-5 text-amber-500" /> Needs Your Attention
          </h2>
          {attention.length === 0 ? (
            <Card className="flex items-center gap-3 p-5 text-gray-500">
              <CheckCircle2 className="h-5 w-5 text-green-600" /> All caught up — nothing needs your review.
            </Card>
          ) : (
            <Stagger className="space-y-3">
              {attention.map((a) => (
                <StaggerItem key={a.applicationId} as="div">
                  <Card
                    className="flex items-center justify-between gap-4 p-4 shadow-soft transition-all duration-300 hover:shadow-soft-lg"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">{a.candidate}</p>
                      <p className="truncate text-sm text-gray-500">
                        {a.job} · applied {new Date(a.appliedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        router.push(`/dashboard/employer/projects/${a.projectId}/applicants`)
                      }
                    >
                      Review <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </Card>
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </section>

        {/* Recent activity */}
        <section>
          <h2 className="display flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
            <Clock className="h-5 w-5 text-primary" /> Recent Activity
          </h2>
          <Card className="divide-y divide-gray-100 p-0">
            {activity.length === 0 ? (
              <div className="p-5 text-gray-500">No recent activity.</div>
            ) : (
              activity.map((ev, i) => (
                <div key={i} className="flex items-start gap-3 p-4">
                  <span
                    className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      ev.type === "application"
                        ? "bg-primary/10 text-primary"
                        : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {ev.type === "application" ? (
                      <Users className="h-3.5 w-3.5" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800">{ev.text}</p>
                    <p className="text-xs text-gray-400">{new Date(ev.at).toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
