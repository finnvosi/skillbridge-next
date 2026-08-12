"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, API_ENDPOINTS, getToken } from "@/lib/api-client";
import { Application, ApplicationStatus, STATUS_LABELS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { FadeUp, Stagger, StaggerItem } from "@/components/motion";
import { Tilt } from "@/components/motion";
import { ClipboardList, ArrowUpRight, Briefcase } from "lucide-react";

const statusFilter: ApplicationStatus[] = ["pending", "accepted", "rejected", "withdrawn"];

export default function ApplicationsPage() {
  const router = useRouter();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<ApplicationStatus | "all">("all");
  const token = getToken();

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const data = await apiRequest<{ applications: Application[] }>(
          API_ENDPOINTS.projects.myApplications,
          { method: "GET", token }
        );
        setApps(data.applications ?? []);
      } catch {
        // empty
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const filtered = apps.filter(
    (a) => activeStatus === "all" || a.status === activeStatus
  );

  const countByStatus = statusFilter.reduce(
    (acc, s) => {
      acc[s] = apps.filter((a) => a.status === s).length;
      return acc;
    },
    {} as Record<ApplicationStatus, number>
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-12 sm:space-y-16">
      {/* ============ HERO ============ */}
      <section className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
        <FadeUp className="lg:col-span-7">
          <p className="label-mono">006 — Applications</p>
          <h1 className="display mt-4 text-4xl leading-[1.02] sm:text-5xl">
            Where you&apos;ve
            <br />
            <span className="text-primary">put yourself forward.</span>
          </h1>
        </FadeUp>
        <FadeUp delay={0.05} className="lg:col-span-5">
          <div className="border-l-2 border-primary pl-6">
            <p className="text-xl leading-relaxed text-gray-700 sm:text-2xl">
              Every application is a record of proof in motion. Track each one
              until it turns into a yes.
            </p>
          </div>
        </FadeUp>
      </section>

      {/* ============ STATUS FILTER ============ */}
      <FadeUp>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveStatus("all")}
            className={
              "rounded-full border px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] transition-colors " +
              (activeStatus === "all"
                ? "border-primary bg-primary text-primary-contrast"
                : "border-gray-200 bg-white text-gray-600 hover:border-primary/40 hover:text-primary")
            }
          >
            All ({apps.length})
          </button>
          {statusFilter.map((s) => (
            <button
              key={s}
              onClick={() => setActiveStatus(s)}
              className={
                "rounded-full border px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] transition-colors " +
                (activeStatus === s
                  ? "border-primary bg-primary text-primary-contrast"
                  : "border-gray-200 bg-white text-gray-600 hover:border-primary/40 hover:text-primary")
              }
            >
              {STATUS_LABELS[s]} ({countByStatus[s]})
            </button>
          ))}
        </div>
      </FadeUp>

      {/* ============ LIST ============ */}
      {filtered.length === 0 ? (
        <FadeUp>
          <EmptyState
            title="No applications here"
            description="When you apply to opportunities, they'll show up here."
            actionLabel="Find opportunities"
            onAction={() => router.push("/dashboard/student/discover")}
          />
        </FadeUp>
      ) : (
        <Stagger className="space-y-4">
          {filtered.map((app) => (
            <StaggerItem key={app.id} as="div">
              <Tilt intensity={4}>
                <Card className="group relative overflow-hidden border-gray-200 p-0 shadow-soft transition-all duration-300 hover:shadow-soft-lg">
                <div className="bg-grain pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay" />
                <button
                  onClick={() => router.push(`/dashboard/student/projects/${app.projectId}`)}
                  className="relative flex w-full items-center justify-between gap-4 p-5 text-left sm:p-6"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Briefcase className="h-4 w-4" />
                      </span>
                      <h3 className="truncate font-display text-lg font-bold text-gray-900">
                        {app.project?.title || "Opportunity"}
                      </h3>
                    </div>
                    <p className="mt-2 pl-11.5 text-sm text-gray-500">
                      {app.project?.employer?.companyName ||
                        app.project?.employer?.user?.name ||
                        "Company"}{" "}
                      · Applied {new Date(app.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={app.status} />
                    <ArrowUpRight className="h-4 w-4 text-gray-400 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                  </div>
                </button>
                </Card>
                </Tilt>
                </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
