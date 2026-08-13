"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiRequest, API_ENDPOINTS, getToken } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, SectionHeader } from "@/components/layout/page-header";
import { FadeUp, Stagger, StaggerItem, Tilt } from "@/components/motion";
import { STAGE_ORDER, STAGE_LABELS, ApplicationStage } from "@/lib/types";
import { Search, ArrowUpRight, Sparkles, Mail, Check, X } from "lucide-react";

interface Candidate {
  id: string;
  stage: ApplicationStage;
  status: string;
  coverLetter?: string | null;
  matchScore: number;
  skillMatches: string[];
  project: { id: string; title: string; skillsRequired: string[] };
  student: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    skills: string[];
    university?: string | null;
    major?: string | null;
  };
}

function initials(name?: string) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function EmployerCandidatesPage() {
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<ApplicationStage | null>(null);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const token = getToken();
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const s = params.get("stage") as ApplicationStage | null;
    if (s) setStage(s);
  }, [params]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const d = await apiRequest<{ applications: Candidate[] }>(
          API_ENDPOINTS.projects.employerCandidates,
          { method: "GET", token, query: { ...(stage ? { stage } : {}) } }
        );
        setCandidates(d.applications ?? []);
      } catch {
        // empty
      } finally {
        setLoading(false);
      }
    })();
  }, [token, stage]);

  const filtered = useMemo(() => {
    if (!search) return candidates;
    const q = search.toLowerCase();
    return candidates.filter(
      (c) =>
        c.student.name.toLowerCase().includes(q) ||
        c.project.title.toLowerCase().includes(q) ||
        c.student.skills.some((s) => s.toLowerCase().includes(q))
    );
  }, [candidates, search]);

  async function moveStage(c: Candidate, newStage: ApplicationStage) {
    setUpdating(c.id);
    try {
      await apiRequest(API_ENDPOINTS.projects.updateStage(c.project.id, c.id), {
        method: "PUT",
        token,
        body: { stage: newStage },
      });
      setCandidates((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, stage: newStage } : x))
      );
      if (selected?.id === c.id) setSelected({ ...selected, stage: newStage });
      setToast(`${c.student.name} → ${STAGE_LABELS[newStage]}`);
      setTimeout(() => setToast(null), 2500);
    } finally {
      setUpdating(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Candidates"
        title="All Applicants"
        subtitle="Every student who applied to your opportunities, with AI match and pipeline stage."
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, job, or skill..."
            className="w-full rounded-xl border border-gray-200 bg-white/70 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStage(null)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              stage === null
                ? "bg-primary text-white"
                : "bg-white/70 text-gray-600 ring-1 ring-inset ring-gray-200 hover:ring-primary/30"
            }`}
          >
            All
          </button>
          {STAGE_ORDER.map((s) => (
            <button
              key={s}
              onClick={() => setStage(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                stage === s
                  ? "bg-primary text-white"
                  : "bg-white/70 text-gray-600 ring-1 ring-inset ring-gray-200 hover:ring-primary/30"
              }`}
            >
              {STAGE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Candidate grid */}
      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-gray-500">No candidates match your filters.</Card>
      ) : (
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <StaggerItem key={c.id} as="div">
              <Tilt intensity={4}>
                <Card className="group flex h-full flex-col p-5 shadow-soft transition-all duration-300 hover:shadow-soft-lg">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-display text-base font-bold text-primary">
                      {initials(c.student.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <button
                        onClick={() => setSelected(c)}
                        className="block truncate text-left font-display text-lg font-bold text-gray-900 hover:text-primary"
                      >
                        {c.student.name}
                      </button>
                      <p className="truncate text-sm text-gray-500">{c.project.title}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-display text-lg font-bold text-primary">
                        {c.matchScore}%
                      </span>
                      <span className="text-[10px] uppercase tracking-wide text-gray-400">Match</span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.student.skills.slice(0, 4).map((s) => (
                      <Badge key={s} variant="secondary" size="sm">
                        {s}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                    <span
                      className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 capitalize"
                    >
                      {STAGE_LABELS[c.stage]}
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => setSelected(c)}>
                      View <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              </Tilt>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {/* Candidate profile drawer */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/30"
          onClick={() => setSelected(null)}
        >
          <div
            className="h-full w-full max-w-md overflow-y-auto bg-canvas p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 font-display text-xl font-bold text-primary">
                  {initials(selected.student.name)}
                </span>
                <div>
                  <h3 className="font-display text-xl font-bold text-gray-900">
                    {selected.student.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selected.student.university || "Student"}
                    {selected.student.major ? ` · ${selected.student.major}` : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* AI Match */}
            <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-semibold">{selected.matchScore}% Match</span>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                Strong on {selected.skillMatches.join(", ") || "core skills"} for{" "}
                {selected.project.title}.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {selected.project.skillsRequired.map((s) => {
                  const has = selected.skillMatches.includes(s);
                  return (
                    <Badge key={s} variant={has ? "primary" : "outline"} size="sm">
                      {has ? "✓ " : ""}
                      {s}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Stage controls */}
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Move to stage
              </p>
              <div className="flex flex-wrap gap-2">
                {STAGE_ORDER.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={selected.stage === s ? "primary" : "outline"}
                    disabled={updating === selected.id}
                    onClick={() => moveStage(selected, s)}
                  >
                    {STAGE_LABELS[s]}
                  </Button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-2">
              <Button variant="outline" className="flex-1" disabled={updating === selected.id}>
                <Mail className="h-4 w-4" /> Message
              </Button>
              <Button
                className="flex-1"
                disabled={updating === selected.id}
                onClick={() => moveStage(selected, "hired")}
              >
                <Check className="h-4 w-4" /> Hire
              </Button>
            </div>

            {selected.coverLetter && (
              <div className="mt-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Cover letter
                </p>
                <p className="rounded-xl bg-white/70 p-4 text-sm text-gray-700">
                  “{selected.coverLetter}”
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
