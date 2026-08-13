"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, API_ENDPOINTS, getToken } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { FadeUp, Stagger, StaggerItem, Tilt } from "@/components/motion";
import { Magnetic } from "@/components/motion/primitives2";
import { cn } from "@/lib/utils";
import { Search, Sparkles, Mail, X, ArrowUpRight, GraduationCap } from "lucide-react";

interface Talent {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  university: string | null;
  major: string | null;
  graduationYear: number | null;
  skills: string[];
  matchScore: number;
  skillMatches: string[];
}

const QUICK_SKILLS = ["React", "TypeScript", "Figma", "Python", "Node.js", "UI/UX"];

function initials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function MatchRing({ score }: { score: number }) {
  const radius = 18;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? "#3C096C" : score >= 40 ? "#7B2CBF" : "#9CA3AF";
  return (
    <div className="relative h-12 w-12 shrink-0">
      <svg className="h-12 w-12 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={radius} fill="none" stroke="#ECECEA" strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-xs font-bold text-gray-900">
        {score}%
      </span>
    </div>
  );
}

export default function TalentSearchPage() {
  const router = useRouter();
  const token = getToken();

  const [loading, setLoading] = useState(true);
  const [talents, setTalents] = useState<Talent[]>([]);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [skill, setSkill] = useState("");
  const [selected, setSelected] = useState<Talent | null>(null);

  const load = async (search?: string, skillFilter?: string) => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest<{ students: Talent[] }>(
        API_ENDPOINTS.users.searchTalent,
        {
          method: "GET",
          token,
          query: {
            ...(search ? { q: search } : {}),
            ...(skillFilter ? { skills: skillFilter } : {}),
          },
        }
      );
      setTalents(data.students ?? []);
    } catch {
      setError("Failed to load talent");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Debounced client-side name filter for snappy typing; server handles skill/university.
  const filtered = useMemo(() => {
    if (!q) return talents;
    const needle = q.toLowerCase();
    return talents.filter(
      (t) =>
        t.name.toLowerCase().includes(needle) ||
        t.skills.some((s) => s.toLowerCase().includes(needle)) ||
        (t.university ?? "").toLowerCase().includes(needle)
    );
  }, [talents, q]);

  function onSkillFilter(s: string) {
    const next = skill === s ? "" : s;
    setSkill(next);
    load(q, next);
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Employer"
        title="Talent Search"
        subtitle="Proactively discover Cambodia's verified students — ranked by fit to your open roles."
      />

      {/* Search + filters */}
      <FadeUp>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, skill, or university…"
            className="w-full rounded-xl border border-gray-200 bg-white/70 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_SKILLS.map((s) => {
            const active = skill === s;
            return (
              <button
                key={s}
                onClick={() => onSkillFilter(s)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition",
                  active
                    ? "bg-primary text-white"
                    : "bg-white/70 text-gray-600 ring-1 ring-inset ring-gray-200 hover:ring-primary/30"
                )}
              >
                {s}
              </button>
            );
          })}
          {skill && (
            <button
              onClick={() => onSkillFilter(skill)}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-700"
            >
              Clear filter
            </button>
          )}
        </div>
      </FadeUp>

      {error && (
        <div className="p-3 border border-red-200 bg-red-50 rounded-md text-sm text-red-700">{error}</div>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-gray-500">
          No students match your search yet.
        </Card>
      ) : (
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <StaggerItem key={t.id} as="div">
              <Tilt intensity={4}>
                <Card className="group flex h-full flex-col p-5 shadow-soft transition-all duration-300 hover:shadow-soft-lg">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-display text-base font-bold text-primary">
                      {initials(t.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-lg font-bold text-gray-900">
                        {t.name}
                      </p>
                      <p className="flex items-center gap-1 truncate text-sm text-gray-500">
                        <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                        {t.university || "Student"}
                        {t.major ? ` · ${t.major}` : ""}
                      </p>
                    </div>
                    <MatchRing score={t.matchScore} />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {t.skills.slice(0, 4).map((s) => {
                      const matched = t.skillMatches.includes(s.toLowerCase());
                      return (
                        <Badge key={s} variant={matched ? "primary" : "secondary"} size="sm">
                          {matched ? "✓ " : ""}
                          {s}
                        </Badge>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                    <span className="text-xs text-gray-400">
                      {t.graduationYear ? `Class of ${t.graduationYear}` : "Student"}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push("/dashboard/employer/messages")}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setSelected(t)}>
                        View <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </Tilt>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {/* Profile drawer */}
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
                  {initials(selected.name)}
                </span>
                <div>
                  <h3 className="font-display text-xl font-bold text-gray-900">{selected.name}</h3>
                  <p className="text-sm text-gray-500">
                    {selected.university || "Student"}
                    {selected.major ? ` · ${selected.major}` : ""}
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

            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <MatchRing score={selected.matchScore} />
              <div>
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-semibold">{selected.matchScore}% Match</span>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {selected.skillMatches.length
                    ? `Strong on ${selected.skillMatches.join(", ")} for your open roles.`
                    : "No overlap with your current open roles yet."}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Skills
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selected.skills.map((s) => {
                  const matched = selected.skillMatches.includes(s.toLowerCase());
                  return (
                    <Badge key={s} variant={matched ? "primary" : "outline"} size="sm">
                      {matched ? "✓ " : ""}
                      {s}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push("/dashboard/employer/messages")}
              >
                <Mail className="h-4 w-4" /> Message
              </Button>
              <Magnetic>
                <Button
                  className="flex-1"
                  onClick={() => router.push("/dashboard/employer/projects/new")}
                >
                  Post a role
                </Button>
              </Magnetic>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
