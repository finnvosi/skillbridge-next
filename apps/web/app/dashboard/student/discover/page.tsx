"use client";

import { useEffect, useState, useMemo } from "react";
import { apiRequest, API_ENDPOINTS, getToken } from "@/lib/api-client";
import { Project, ProjectType, TYPE_LABELS } from "@/lib/types";
import { Card } from "@/components/ui/card";
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

      {/* ============ FILTERS — Upwork-style rail ============ */}
      <FadeUp>
        <Card className="border-gray-200 p-4 shadow-soft sm:p-5">
          {/* Type quick-filter rail */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setType("")}
              className={
                "rounded-full border px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] transition-colors " +
                (type === ""
                  ? "border-primary bg-primary text-primary-contrast"
                  : "border-gray-200 bg-white text-gray-600 hover:border-primary/40 hover:text-primary")
              }
            >
              All
            </button>
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={
                  "rounded-full border px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] transition-colors " +
                  (type === t
                    ? "border-primary bg-primary text-primary-contrast"
                    : "border-gray-200 bg-white text-gray-600 hover:border-primary/40 hover:text-primary")
                }
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
            <label className="ml-auto flex items-center gap-2.5 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-primary/40 hover:text-primary">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={(e) => setRemoteOnly(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              Remote only
            </label>
          </div>

          {/* Search + sort row */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, skill, or company..."
                className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="text-xs font-medium text-gray-400 hover:text-primary"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="label-mono-muted hidden sm:block">Sort</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      </FadeUp>

      {/* Active filters + count */}
      {(type || search || remoteOnly) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="label-mono-muted">Active:</span>
          {type && (
            <button
              onClick={() => setType("")}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              {TYPE_LABELS[type]} ✕
            </button>
          )}
          {remoteOnly && (
            <button
              onClick={() => setRemoteOnly(false)}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              Remote only ✕
            </button>
          )}
          {search && (
            <button
              onClick={() => setSearch("")}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              “{search}” ✕
            </button>
          )}
          <button
            onClick={() => {
              setType("");
              setSearch("");
              setRemoteOnly(false);
            }}
            className="text-xs font-medium text-gray-500 underline hover:text-primary"
          >
            Reset all
          </button>
        </div>
      )}

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
