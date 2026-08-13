"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, API_ENDPOINTS, getToken } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, SectionHeader } from "@/components/layout/page-header";
import { FadeUp, Stagger, StaggerItem, Tilt } from "@/components/motion";
import { Magnetic } from "@/components/motion/primitives2";
import { Calendar, Clock, Video, Phone, MapPin, CheckCircle2, XCircle, Star, Send } from "lucide-react";

interface Interview {
  id: string;
  scheduledAt: string;
  durationMin: number;
  type: "online" | "phone" | "onsite";
  status: "scheduled" | "completed" | "cancelled" | "rescheduled";
  location?: string | null;
  meetingLink?: string | null;
  candidate: { id: string; name: string; email: string; avatar?: string | null };
  job: { id: string; title: string };
  rating?: number | null;
  recommendation?: string | null;
}

const TYPE_ICON = { online: Video, phone: Phone, onsite: MapPin };
const TYPE_LABEL = { online: "Online", phone: "Phone", onsite: "On-site" };

function initials(name?: string) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function EmployerInterviewsPage() {
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState<Interview[]>([]);
  const [past, setPast] = useState<Interview[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const token = getToken();
  const router = useRouter();

  async function load() {
    const d = await apiRequest<{ upcoming: Interview[]; past: Interview[] }>(
      API_ENDPOINTS.interviews.list,
      { method: "GET", token }
    );
    setUpcoming(d.upcoming ?? []);
    setPast(d.past ?? []);
  }

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        await load();
      } catch {
        // empty
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  function fmtDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }
  function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  function InterviewCard({ iv }: { iv: Interview }) {
    const Icon = TYPE_ICON[iv.type];
    const done = iv.status === "completed";
    const cancelled = iv.status === "cancelled";
    return (
      <Tilt intensity={3}>
        <Card className="flex h-full flex-col gap-3 p-5 stat-soft shadow-soft transition-all duration-300 hover:shadow-soft-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 font-display text-base font-bold text-primary">
                {initials(iv.candidate.name)}
              </span>
              <div>
                <p className="font-display text-lg font-bold text-gray-900">{iv.candidate.name}</p>
                <p className="text-sm text-gray-500">{iv.job.title}</p>
              </div>
            </div>
            {done ? (
              <Badge variant="primary" size="sm">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Done
              </Badge>
            ) : cancelled ? (
              <Badge variant="neutral" size="sm">
                <XCircle className="mr-1 h-3 w-3" /> Cancelled
              </Badge>
            ) : (
              <Badge variant="secondary" size="sm">
                {TYPE_LABEL[iv.type]}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-gray-400" /> {fmtDate(iv.scheduledAt)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-gray-400" /> {fmtTime(iv.scheduledAt)} · {iv.durationMin}m
            </span>
            <span className="flex items-center gap-1">
              <Icon className="h-4 w-4 text-gray-400" /> {TYPE_LABEL[iv.type]}
            </span>
          </div>

          {iv.meetingLink && !cancelled && (
            <a
              href={iv.meetingLink}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-primary hover:underline"
            >
              Join meeting →
            </a>
          )}

          {done && iv.rating && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <span className="flex">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={`h-3.5 w-3.5 ${n <= iv.rating! ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
                ))}
              </span>
              {iv.recommendation && (
                <span className="ml-1 capitalize text-gray-500">{iv.recommendation.replace("_", " ")}</span>
              )}
            </div>
          )}

          {!done && !cancelled && (
            <div className="mt-auto flex gap-2 border-t border-gray-100 pt-3">
              <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/employer/candidates`)}>
                Feedback
              </Button>
              {iv.meetingLink && (
                <Button size="sm" variant="ghost" asChild>
                  <a href={iv.meetingLink} target="_blank" rel="noreferrer">
                    <Video className="h-4 w-4" /> Start
                  </a>
                </Button>
              )}
            </div>
          )}
        </Card>
      </Tilt>
    );
  }

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
        eyebrow="Interviews"
        title="Interviews"
        subtitle="Schedule, run, and review candidate interviews."
        actions={
          <Magnetic>
            <Button onClick={() => setShowSchedule(true)}>
              <Calendar className="h-4 w-4" /> Schedule interview
            </Button>
          </Magnetic>
        }
      />

      {upcoming.length === 0 && past.length === 0 ? (
        <Card className="p-10 text-center text-gray-500">
        No interviews yet. Schedule one from a candidate&apos;s profile or the Candidates tab.
        </Card>
      ) : (
        <>
          <section>
            <SectionHeader
              eyebrow="Upcoming"
              title={`${upcoming.length} scheduled`}
              description="Interviews happening soon."
            />
            {upcoming.length === 0 ? (
              <Card className="p-6 text-sm text-gray-500">Nothing scheduled. You&apos;re clear.</Card>
            ) : (
              <Stagger className="grid gap-4 sm:grid-cols-2">
                {upcoming.map((iv, i) => (
                  <StaggerItem key={iv.id} as="div">
                    <InterviewCard iv={iv} />
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </section>

          {past.length > 0 && (
            <section>
              <SectionHeader eyebrow="Past" title="Interview history" />
              <Stagger className="grid gap-4 sm:grid-cols-2">
                {past.map((iv) => (
                  <StaggerItem key={iv.id} as="div">
                    <InterviewCard iv={iv} />
                  </StaggerItem>
                ))}
              </Stagger>
            </section>
          )}
        </>
      )}

      {showSchedule && (
        <ScheduleModal
          token={token}
          onClose={() => setShowSchedule(false)}
          onScheduled={async () => {
            setShowSchedule(false);
            setLoading(true);
            await load();
            setLoading(false);
          }}
        />
      )}
    </div>
  );
}

function ScheduleModal({
  token,
  onClose,
  onScheduled,
}: {
  token: string | null;
  onClose: () => void;
  onScheduled: () => void;
}) {
  const [candidates, setCandidates] = useState<{ id: string; name: string; email: string; project: { id: string; title: string } }[]>([]);
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);
  const [studentId, setStudentId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [when, setWhen] = useState("");
  const [duration, setDuration] = useState(45);
  const [type, setType] = useState<"online" | "phone" | "onsite">("online");
  const [meetingLink, setMeetingLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [c, p] = await Promise.all([
          apiRequest<{
            applications: {
              id: string;
              student: { name: string; email: string };
              project: { id: string; title: string };
            }[];
          }>(API_ENDPOINTS.projects.employerCandidates, { method: "GET", token }),
          apiRequest<{ projects: { id: string; title: string }[] }>(
            API_ENDPOINTS.projects.employerProjects,
            { method: "GET", token }
          ),
        ]);
        setCandidates(
          (c.applications ?? []).map((a) => ({
            id: a.id,
            name: a.student.name,
            email: a.student.email,
            project: a.project,
          }))
        );
        setProjects(p.projects ?? []);
      } catch {
        // empty
      }
    })();
  }, [token]);

  async function submit() {
    if (!studentId || !projectId || !when) {
      setError("Pick a candidate, a job, and a time.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest(API_ENDPOINTS.interviews.schedule, {
        method: "POST",
        token,
        body: {
          studentId,
          projectId,
          applicationId: applicationId || undefined,
          scheduledAt: new Date(when).toISOString(),
          durationMin: duration,
          type,
          meetingLink: meetingLink || undefined,
        },
      });
      onScheduled();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to schedule");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-canvas p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-xl font-bold text-gray-900">Schedule interview</h3>
        <div className="mt-4 space-y-3">
          <select
            value={studentId}
            onChange={(e) => {
              const sel = candidates.find((c) => c.id === e.target.value);
              setStudentId(e.target.value);
              setProjectId(sel?.project.id ?? "");
              setApplicationId(e.target.value);
            }}
            className="w-full rounded-xl border border-gray-200 bg-white/70 p-2.5 text-sm outline-none focus:border-primary/40"
          >
            <option value="">Select candidate…</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.project.title}
              </option>
            ))}
          </select>

          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white/70 p-2.5 text-sm outline-none focus:border-primary/40"
          >
            <option value="">Select job…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>

          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white/70 p-2.5 text-sm outline-none focus:border-primary/40"
          />

          <div className="flex gap-2">
            <input
              type="number"
              value={duration}
              min={15}
              max={240}
              step={15}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-24 rounded-xl border border-gray-200 bg-white/70 p-2.5 text-sm outline-none focus:border-primary/40"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "online" | "phone" | "onsite")}
              className="flex-1 rounded-xl border border-gray-200 bg-white/70 p-2.5 text-sm outline-none focus:border-primary/40"
            >
              <option value="online">Online</option>
              <option value="phone">Phone</option>
              <option value="onsite">On-site</option>
            </select>
          </div>

          <input
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
            placeholder="Meeting link (optional)"
            className="w-full rounded-xl border border-gray-200 bg-white/70 p-2.5 text-sm outline-none focus:border-primary/40"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            <Send className="h-4 w-4" /> {submitting ? "Scheduling…" : "Schedule"}
          </Button>
        </div>
      </div>
    </div>
  );
}
