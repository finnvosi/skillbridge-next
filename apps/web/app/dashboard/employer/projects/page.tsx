"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest, API_ENDPOINTS, getToken } from "@/lib/api-client";
import { Project, TYPE_LABELS } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, SectionHeader } from "@/components/layout/page-header";
import { FadeUp, Stagger, StaggerItem, Tilt } from "@/components/motion";
import { Magnetic } from "@/components/motion/primitives2";
import { STAGE_ORDER, STAGE_LABELS, ApplicationStage } from "@/lib/types";
import { MapPin, Plus, Users, ArrowUpRight, BarChart3, Kanban } from "lucide-react";

interface ProjectWithCount extends Project {
  applicationCount?: number;
}

interface CandidateRow {
  id: string;
  stage: ApplicationStage;
  project: { id: string };
}

export default function EmployerProjectsPage() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectWithCount[]>([]);
  const [stages, setStages] = useState<Record<string, Record<string, number>>>({});
  const token = getToken();

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const [p, c] = await Promise.all([
          apiRequest<{ projects: ProjectWithCount[] }>(API_ENDPOINTS.projects.employerProjects, {
            method: "GET",
            token,
          }),
          apiRequest<{ applications: CandidateRow[] }>(API_ENDPOINTS.projects.employerCandidates, {
            method: "GET",
            token,
          }),
        ]);
        setProjects(p.projects ?? []);
        const byProject: Record<string, Record<string, number>> = {};
        for (const a of c.applications ?? []) {
          byProject[a.project.id] = byProject[a.project.id] || {};
          byProject[a.project.id][a.stage] = (byProject[a.project.id][a.stage] || 0) + 1;
        }
        setStages(byProject);
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
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Jobs"
        title="Your Opportunities"
        subtitle="Create, manage, and monitor every job posting."
        actions={
          <Magnetic>
            <Button asChild>
              <Link href="/dashboard/employer/projects/new">
                <Plus className="h-4 w-4" /> Post opportunity
              </Link>
            </Button>
          </Magnetic>
        }
      />

      {projects.length === 0 ? (
        <Card className="p-10 text-center text-gray-500">
          No opportunities posted yet. Post your first role to start receiving applications.
        </Card>
      ) : (
        <Stagger className="grid gap-5 sm:grid-cols-2">
          {projects.map((p, i) => {
            const counts = stages[p.id] || {};
            const total = STAGE_ORDER.reduce((s, st) => s + (counts[st] || 0), 0);
            return (
              <StaggerItem key={p.id} as="div">
                <Tilt intensity={3}>
                  <Card className="flex h-full flex-col p-5 shadow-soft transition-all duration-300 hover:shadow-soft-lg">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-display text-lg font-bold text-gray-900">{p.title}</h3>
                        <p className="mt-0.5 flex items-center gap-1 text-sm text-gray-500">
                          <MapPin className="h-3.5 w-3.5" />
                          {p.location || "Remote"}
                          {p.remote ? " · Remote" : ""}
                        </p>
                      </div>
                      <Badge variant="secondary" size="sm">
                        {TYPE_LABELS[p.type]}
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium text-gray-900">${p.budget ?? 0}</span> budget
                      {p.status && (
                        <Badge variant={p.status === "open" ? "primary" : "neutral"} size="sm">
                          {p.status}
                        </Badge>
                      )}
                    </div>

                    {/* Pipeline mini-bar */}
                    <div className="mt-4">
                      <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> {total} applicants
                        </span>
                        <span>{counts["hired"] || 0} hired</span>
                      </div>
                      <div className="flex h-2 overflow-hidden rounded-full bg-gray-100">
                        {STAGE_ORDER.map((st) => {
                          const c = counts[st] || 0;
                          if (!c) return null;
                          const w = total ? (c / total) * 100 : 0;
                          const colors: Record<string, string> = {
                            applied: "bg-gray-400",
                            screening: "bg-blue-400",
                            shortlisted: "bg-primary-light",
                            interview: "bg-primary",
                            offer: "bg-purple-500",
                            hired: "bg-green-500",
                          };
                          return (
                            <div
                              key={st}
                              className={colors[st]}
                              style={{ width: `${w}%` }}
                              title={`${STAGE_LABELS[st]}: ${c}`}
                            />
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/dashboard/employer/candidates?stage=applied`}>
                          Candidates <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/dashboard/employer/projects/${p.id}/applicants`}>
                          <Kanban className="h-3.5 w-3.5" /> Pipeline
                        </Link>
                      </Button>
                      <Button size="sm" variant="ghost" disabled>
                        <BarChart3 className="h-3.5 w-3.5" /> Analytics
                      </Button>
                    </div>
                  </Card>
                </Tilt>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </div>
  );
}
