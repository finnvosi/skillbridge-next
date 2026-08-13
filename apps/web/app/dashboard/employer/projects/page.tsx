"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiRequest, API_ENDPOINTS, getToken } from "@/lib/api-client";
import { Project, TYPE_LABELS, ProjectStatus, PROJECT_STATUS_LABELS, PROJECT_STATUS_VARIANT, PROJECT_STATUS_TRANSITIONS } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, SectionHeader } from "@/components/layout/page-header";
import { FadeUp, Stagger, StaggerItem, Tilt } from "@/components/motion";
import { Magnetic } from "@/components/motion/primitives2";
import { STAGE_ORDER, STAGE_LABELS, ApplicationStage } from "@/lib/types";
import { MapPin, Plus, Users, ArrowUpRight, BarChart3, Kanban, MoreVertical, Check, Pause, Play, Archive, FileEdit, CircleDot, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectWithCount extends Project {
  applicationCount?: number;
}

interface CandidateRow {
  id: string;
  stage: ApplicationStage;
  project: { id: string };
}

type FilterKey = "all" | ProjectStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Published" },
  { key: "draft", label: "Drafts" },
  { key: "paused", label: "Paused" },
  { key: "completed", label: "Closed" },
  { key: "expired", label: "Expired" },
];

const ACTION_META: Record<ProjectStatus, { label: string; icon: typeof Check; next: ProjectStatus }> = {
  open: { label: "Pause", icon: Pause, next: "paused" },
  draft: { label: "Publish", icon: Check, next: "open" },
  paused: { label: "Resume", icon: Play, next: "open" },
  completed: { label: "Reopen", icon: Play, next: "open" },
  cancelled: { label: "Reopen", icon: Play, next: "open" },
  expired: { label: "Renew", icon: Play, next: "open" },
};

export default function EmployerProjectsPage() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectWithCount[]>([]);
  const [stages, setStages] = useState<Record<string, Record<string, number>>>({});
  const [filter, setFilter] = useState<FilterKey>("all");
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
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

  async function changeStatus(p: ProjectWithCount, next: ProjectStatus) {
    setBusy(p.id);
    setMenuFor(null);
    try {
      const res = await apiRequest<{ project: ProjectWithCount }>(
        API_ENDPOINTS.projects.updateProjectStatus(p.id),
        { method: "PATCH", token, body: { status: next } }
      );
      setProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...res.project } : x)));
    } catch {
      // ignore
    } finally {
      setBusy(null);
    }
  }

  const filtered = useMemo(() => {
    if (filter === "all") return projects;
    return projects.filter((p) => (p.status as ProjectStatus) === filter);
  }, [projects, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: projects.length };
    for (const p of projects) c[p.status as string] = (c[p.status as string] || 0) + 1;
    return c;
  }, [projects]);

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
        subtitle="Create, manage, and monitor every job posting through its lifecycle."
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

      {/* Status filter tabs */}
      <div className="hide-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const n = counts[f.key] ?? 0;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "group relative shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition",
                active ? "text-primary" : "text-gray-500 hover:text-gray-900"
              )}
            >
              {f.label}
              <span className={cn("ml-1.5 text-xs", active ? "text-primary/70" : "text-gray-400")}>{n}</span>
              {active && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {projects.length === 0 ? (
        <Card className="p-10 text-center text-gray-500">
          No opportunities posted yet. Post your first role to start receiving applications.
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-gray-500">
          No jobs in this state.
        </Card>
      ) : (
        <Stagger className="grid gap-5 sm:grid-cols-2">
          {filtered.map((p, i) => {
            const status = p.status as ProjectStatus;
            const counts2 = stages[p.id] || {};
            const total = STAGE_ORDER.reduce((s, st) => s + (counts2[st] || 0), 0);
            const meta = ACTION_META[status];
            const transitions = PROJECT_STATUS_TRANSITIONS[status] ?? [];
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
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={PROJECT_STATUS_VARIANT[status] ?? "neutral"}
                          size="sm"
                        >
                          {PROJECT_STATUS_LABELS[status]}
                        </Badge>
                        <div className="relative">
                          <button
                            onClick={() => setMenuFor(menuFor === p.id ? null : p.id)}
                            className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                            aria-label="Job actions"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {menuFor === p.id && (
                            <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                              {transitions.map((next) => {
                                const m = ACTION_META[next];
                                const Icon = next === "draft" ? FileEdit : next === "cancelled" ? X : next === "completed" ? Archive : m?.icon ?? CircleDot;
                                const label =
                                  next === "draft"
                                    ? "Move to draft"
                                    : next === "cancelled"
                                    ? "Cancel"
                                    : next === "completed"
                                    ? "Close"
                                    : next === "paused"
                                    ? "Pause"
                                    : next === "expired"
                                    ? "Expire"
                                    : PROJECT_STATUS_LABELS[next];
                                return (
                                  <button
                                    key={next}
                                    disabled={busy === p.id}
                                    onClick={() => changeStatus(p, next)}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50"
                                  >
                                    <Icon className="h-3.5 w-3.5" />
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium text-gray-900">${p.budget ?? 0}</span> budget
                      <Badge variant="secondary" size="sm">
                        {TYPE_LABELS[p.type]}
                      </Badge>
                    </div>

                    {/* Pipeline mini-bar */}
                    <div className="mt-4">
                      <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> {total} applicants
                        </span>
                        <span>{counts2["hired"] || 0} hired</span>
                      </div>
                      <div className="flex h-2 overflow-hidden rounded-full bg-gray-100">
                        {STAGE_ORDER.map((st) => {
                          const c = counts2[st] || 0;
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
                      {meta && status !== "open" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === p.id}
                          onClick={() => changeStatus(p, meta.next)}
                        >
                          <meta.icon className="h-3.5 w-3.5" />
                          {meta.label}
                        </Button>
                      )}
                      {status === "open" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy === p.id}
                          onClick={() => changeStatus(p, "paused")}
                        >
                          <Pause className="h-3.5 w-3.5" /> Pause
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/dashboard/employer/candidates?stage=applied`}>
                          Candidates <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/dashboard/employer/projects/${p.id}/applicants`}>
                          <Kanban className="h-3.5 w-3.5" /> Pipeline
                        </Link>
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
