"use client";

import { useEffect, useState, useMemo } from "react";
import { apiRequest, API_ENDPOINTS, getToken } from "@/lib/api-client";
import { Project, ProjectType, TYPE_LABELS } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { OpportunityCard } from "@/components/marketplace/opportunity-card";
import { FadeUp, Stagger, StaggerItem } from "@/components/motion";
import { Search, SlidersHorizontal } from "lucide-react";

const TYPES: ProjectType[] = ["internship", "part_time", "freelance", "full_time"];
const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "budget_desc", label: "Budget: high to low" },
  { value: "budget_asc", label: "Budget: low to high" },
];

export default function DiscoverPage() {
  const [all, setAll] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<ProjectType | "">("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [sort, setSort] = useState("newest");

  const token = getToken();

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const data = await apiRequest<{ projects: Project[] }>(
          API_ENDPOINTS.projects.list,
          { method: "GET", token }
        );
        setAll(data.projects ?? []);
      } catch {
        // empty state handles errors
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const filtered = useMemo(() => {
    let list = all.filter((p) => {
      if (type && p.type !== type) return false;
      if (remoteOnly && !p.remote) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay =
          p.title +
          " " +
          (p.description || "") +
          " " +
          (p.location || "") +
          " " +
          p.skillsRequired.join(" ");
        if (!hay.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    if (sort === "budget_desc") list = [...list].sort((a, b) => (b.budget ?? 0) - (a.budget ?? 0));
    if (sort === "budget_asc") list = [...list].sort((a, b) => (a.budget ?? 0) - (b.budget ?? 0));
    return list;
  }, [all, type, remoteOnly, search, sort]);

  return (
    <div className="space-y-12 sm:space-y-16">
      {/* ============ HERO ============ */}
      <section className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
        <FadeUp className="lg:col-span-7">
          <p className="label-mono">005 — Discover</p>
          <h1 className="display mt-4 text-4xl leading-[1.02] sm:text-5xl">
            The board is
            <br />
            <span className="text-primary">open.</span>
          </h1>
        </FadeUp>
        <FadeUp delay={0.05} className="lg:col-span-5">
          <div className="border-l-2 border-primary pl-6">
            <p className="text-xl leading-relaxed text-gray-700 sm:text-2xl">
              Every role here is real work, attested by the people who post it.
              Filter by what you can do — and what you want next.
            </p>
          </div>
        </FadeUp>
      </section>

      {/* ============ FILTERS — frosted bar ============ */}
      <FadeUp>
        <Card className="border-gray-200 p-4 shadow-soft sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1 space-y-1.5">
              <label className="label-mono-muted flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5" /> Search
              </label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Title, skill, or company..."
              />
            </div>

            <div className="w-full space-y-1.5 sm:w-44">
              <label className="label-mono-muted">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ProjectType | "")}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">All types</option>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full space-y-1.5 sm:w-52">
              <label className="label-mono-muted">Sort</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-primary/40 hover:text-primary sm:w-auto">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={(e) => setRemoteOnly(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              Remote only
            </label>
          </div>
        </Card>
      </FadeUp>

      {/* ============ RESULTS ============ */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <FadeUp>
          <EmptyState
            title="No opportunities match your search"
            description="Try adjusting your filters or search terms."
          />
        </FadeUp>
      ) : (
        <>
          <p className="label-mono-muted">
            {filtered.length} {filtered.length === 1 ? "opportunity" : "opportunities"}
          </p>
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((o) => (
              <StaggerItem key={o.id} as="div" className="h-full">
                <OpportunityCard project={o} />
              </StaggerItem>
            ))}
          </Stagger>
        </>
      )}
    </div>
  );
}
