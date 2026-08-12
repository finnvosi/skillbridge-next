"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest, API_ENDPOINTS, getToken } from "@/lib/api-client";
import { Project, Application, ApplicationStatus, TYPE_LABELS, STATUS_LABELS } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader, StatCard } from "@/components/layout/page-header";
import { FadeUp } from "@/components/motion";
import { OpportunityCard } from "@/components/marketplace/opportunity-card";
import { Briefcase, Users, Clock, Star } from "lucide-react";

interface ProjectWithCount extends Project {
  _count?: { applications: number };
}

export default function EmployerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectWithCount[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const token = getToken();

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const [p, a] = await Promise.all([
          apiRequest<{ projects: ProjectWithCount[] }>(
            API_ENDPOINTS.projects.employerProjects,
            { method: "GET", token }
          ),
          apiRequest<{ applications: Application[] }>(
            API_ENDPOINTS.projects.employerApplications,
            { method: "GET", token }
          ),
        ]);
        setProjects(p.projects ?? []);
        setApps(a.applications ?? []);
      } catch {
        // empty
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const pendingApps = apps.filter((a) => a.status === "pending");
  const needsReview = pendingApps.length;

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Employer"
        title="Talent Pipeline"
        subtitle="Discover students and manage your opportunities."
        actions={
          <Button asChild>
            <Link href="/dashboard/employer/projects/new">
              Post opportunity
            </Link>
          </Button>
        }
      />

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard
          icon={Briefcase}
          label="Active opportunities"
          value={projects.length}
          accent="text-primary"
        />
        <StatCard
          icon={Users}
          label="Total applicants"
          value={apps.length}
          accent="text-gray-900"
        />
        <StatCard
          icon={Clock}
          label="Needs review"
          value={needsReview}
          accent="text-amber-600"
        />
        <StatCard
          icon={Star}
          label="Talent score"
          value="92"
          accent="text-purple-600"
        />
      </div>

      {/* Pending applicants (Talent Pipeline insight) */}
      {pendingApps.length > 0 && (
        <section>
          <SectionHeader
            eyebrow="Talent Pipeline"
            title="Awaiting your review"
            description={`${needsReview} candidate${needsReview !== 1 ? "s" : ""} awaiting review`}
            action={
              <Link
                href="/dashboard/employer/applicants"
                className="text-sm font-medium text-primary hover:text-primary-hover"
              >
                View all applicants
              </Link>
            }
          />

          <div className="divide-y divide-gray-100 rounded-2xl border border-card-border bg-white/70 shadow-soft backdrop-blur-xl">
            {pendingApps.map((app) => (
              <div key={app.id} className="flex items-center justify-between gap-4 p-4">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {app.student?.user?.name || "Candidate"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {app.project?.title || "Opportunity"}
                  </p>
                  <p className="text-xs text-gray-400">
                    Applied {new Date(app.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline">
                    Message
                  </Button>
                  <Button size="sm" variant="primary">
                    Review
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Opportunities grid */}
      <section>
        <SectionHeader
          eyebrow="Opportunities"
          title="Your opportunities"
          action={
            <Link
              href="/dashboard/employer/projects"
              className="text-sm font-medium text-primary hover:text-primary-hover"
            >
              Manage all
            </Link>
          }
        />

        {projects.length === 0 ? (
          <EmptyState
            title="No opportunities posted yet"
            description="Post your first opportunity to start receiving applications from talented students."
            actionLabel="Post opportunity"
            onAction={() => {
              window.location.href = "/dashboard/employer/projects/new";
            }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.slice(0, 6).map((p, i) => (
              <FadeUp key={p.id} delay={i * 0.05}>
                <OpportunityCard
                  project={p}
                  onApply={undefined}
                  showActions={false}
                />
              </FadeUp>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}