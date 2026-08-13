"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, API_ENDPOINTS, getToken, ApiError } from "@/lib/api-client";
import { Application, ApplicationStatus } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { FadeUp, Stagger, StaggerItem } from "@/components/motion";
import { Magnetic } from "@/components/motion/primitives2";
import { ApplicantCard } from "@/components/marketplace/applicant-card";
import { Filter, ArrowUpRight } from "lucide-react";

const STATUS_TABS: { key: "all" | ApplicationStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Submitted" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Rejected" },
  { key: "withdrawn", label: "Withdrawn" },
];

export default function ApplicantsPage() {
  const router = useRouter();
  const token = getToken();

  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"all" | ApplicationStatus>("all");

  const load = async () => {
    if (!token) return;
    try {
      const data = await apiRequest<{ applications: Application[] }>(
        API_ENDPOINTS.projects.employerApplications,
        { method: "GET", token }
      );
      setApps(data.applications ?? []);
    } catch {
      setError("Failed to load applicants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const changeStatus = async (applicationId: string, status: "accepted" | "rejected") => {
    if (!token) return;
    const app = apps.find((a) => a.id === applicationId);
    if (!app) return;
    setBusy(applicationId);
    setError("");
    try {
      await apiRequest(
        API_ENDPOINTS.projects.updateApplication(app.projectId, applicationId),
        { method: "PUT", token, body: { status } }
      );
      setApps((prev) => prev.map((a) => (a.id === applicationId ? { ...a, status } : a)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setBusy(null);
    }
  };

  const filtered = useMemo(
    () => (tab === "all" ? apps : apps.filter((a) => a.status === tab)),
    [apps, tab]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: apps.length };
    for (const a of apps) c[a.status] = (c[a.status] ?? 0) + 1;
    return c;
  }, [apps]);

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-56" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Employer"
        title="Applicants"
        subtitle="Every candidate who applied across your opportunities."
        actions={
          <Magnetic>
            <Button asChild>
              <Link href="/dashboard/employer/projects/new">Post opportunity</Link>
            </Button>
          </Magnetic>
        }
      />

      {/* Status filter */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-gray-400" />
        {STATUS_TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.1em] transition-colors ${
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-1.5 text-[10px] ${
                  active ? "bg-primary text-white" : "bg-gray-100 text-gray-500"
                }`}
              >
                {counts[t.key] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-3 border border-red-200 bg-red-50 rounded-md text-sm text-red-700">{error}</div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title="No applicants in this view yet"
          description="When students apply to your opportunities, they'll show up here."
        />
      ) : (
        <Stagger className="space-y-4">
          {filtered.map((a) => (
            <StaggerItem key={a.id} as="div">
              <ApplicantCard
                app={a}
                busy={busy === a.id}
                onStatusChange={(applicationId, status) => changeStatus(applicationId, status)}
                onReview={() => router.push(`/dashboard/employer/projects/${a.projectId}/applicants`)}
                onMessage={() =>
                  router.push(`/dashboard/employer/messages`)
                }
              />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {apps.length > 0 && (
        <FadeUp>
          <Card className="flex items-center justify-between gap-4 p-5">
            <div>
              <p className="font-medium text-gray-900">Need a deeper dive per role?</p>
              <p className="text-sm text-gray-500">
                Open any opportunity to review applicants side-by-side in its pipeline.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard/employer/projects">
                View opportunities <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </Card>
        </FadeUp>
      )}
    </div>
  );
}
