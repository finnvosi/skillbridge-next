"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiRequest, API_ENDPOINTS, getToken, ApiError } from "@/lib/api-client";
import { Project, TYPE_LABELS, STATUS_LABELS, ApplicationStatus } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { FadeUp, WordReveal, CountUp } from "@/components/motion";
import { Magnetic } from "@/components/motion/primitives2";
import { ArrowLeft, MapPin, Wallet, CalendarClock, ShieldCheck, CheckCircle2, ArrowUpRight } from "lucide-react";

const COVER: Record<string, string> = {
  internship: "from-primary to-[#5A189A]",
  full_time: "from-[#5A189A] to-[#3C096C]",
  part_time: "from-primary-light to-primary",
  freelance: "from-[#7B2CBF] to-[#3C096C]",
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const token = getToken();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [applying, setApplying] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [proposedBudget, setProposedBudget] = useState("");
  const [existingApp, setExistingApp] = useState<ApplicationStatus | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    if (!token) return;
    try {
      const data = await apiRequest<{ project: Project }>(
        API_ENDPOINTS.projects.detail(id),
        { method: "GET", token }
      );
      setProject(data.project);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  const submit = async () => {
    if (!token || !project) return;
    setApplying(true);
    setError("");
    try {
      await apiRequest(API_ENDPOINTS.projects.apply(project.id), {
        method: "POST",
        token,
        body: {
          coverLetter: coverLetter || undefined,
          proposedBudget: proposedBudget ? Number(proposedBudget) : undefined,
        },
      });
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setExistingApp("pending");
      } else {
        setError(err instanceof ApiError ? err.message : "Application failed");
      }
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <EmptyState
        title="Opportunity not found"
        description="This opportunity may have been removed or is no longer available."
        actionLabel="Back to discover"
        onAction={() => router.push("/dashboard/student/discover")}
      />
    );
  }

  const company = project.employer?.companyName || project.employer?.user?.name || "Company";
  const cover = COVER[project.type] || "from-primary to-[#5A189A]";

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <FadeUp>
        <Link
          href="/dashboard/student/discover"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to discover
        </Link>
      </FadeUp>

      {/* ============ HERO ============ */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
        <FadeUp className="lg:col-span-8">
          <p className="label-mono">{TYPE_LABELS[project.type]} · Opportunity</p>
          <h1 className="display mt-4 text-4xl leading-[1.02] sm:text-5xl">
            <WordReveal text={project.title} />
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {project.employer?.companyName ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-primary">
                <ShieldCheck className="h-3.5 w-3.5" /> Attested
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                Unverified
              </span>
            )}
            <span className="text-sm text-gray-500">
              {company}
            </span>
          </div>
        </FadeUp>

        {/* Meta strip — Fiverr/Upwork style quick facts */}
        <FadeUp delay={0.05} className="lg:col-span-4">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-gray-200 bg-gray-200 shadow-soft">
            <div className="bg-white p-4">
              <div className="flex items-center gap-1.5 text-gray-400">
                <Wallet className="h-3.5 w-3.5" />
                <span className="font-mono text-[10px] uppercase tracking-[0.12em]">Budget</span>
              </div>
              <p className="mt-1 font-display text-xl font-extrabold text-gray-900">
                {project.budget ? (
                  <>
                    $<CountUp value={project.budget} />
                  </>
                ) : (
                  "Negotiable"
                )}
              </p>
            </div>
            <div className="bg-white p-4">
              <div className="flex items-center gap-1.5 text-gray-400">
                <MapPin className="h-3.5 w-3.5" />
                <span className="font-mono text-[10px] uppercase tracking-[0.12em]">Location</span>
              </div>
              <p className="mt-1 font-display text-base font-bold text-gray-900">
                {project.location || (project.remote ? "Remote" : "Onsite")}
              </p>
            </div>
            {(project.startDate || project.endDate) && (
              <div className="col-span-2 bg-white p-4">
                <div className="flex items-center gap-1.5 text-gray-400">
                  <CalendarClock className="h-3.5 w-3.5" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em]">Timeline</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {project.startDate
                    ? new Date(project.startDate).toLocaleDateString()
                    : "Flexible"}{" "}
                  —{" "}
                  {project.endDate
                    ? new Date(project.endDate).toLocaleDateString()
                    : "Open"}
                </p>
              </div>
            )}
          </div>
        </FadeUp>
      </section>

      {/* ============ BODY ============ */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
        <FadeUp className="lg:col-span-7">
          <Card className="border-gray-200 p-6 sm:p-8">
            <div className="bg-grain pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay" />
            <div className="relative">
              <h2 className="font-display text-xl font-bold text-gray-900">About the role</h2>
              <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-gray-600">
                {project.description}
              </p>

              <h3 className="mt-7 font-display text-sm font-bold uppercase tracking-wide text-gray-900">
                Skills you&apos;ll use
              </h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {project.skillsRequired.map((s) => (
                  <Badge key={s} variant="neutral" size="sm">
                    {s}
                  </Badge>
                ))}
              </div>

              <div className="mt-7 flex items-center gap-2 rounded-xl bg-primary/5 px-4 py-3 text-sm text-primary">
                <ShieldCheck className="h-4 w-4" />
                Posted by <span className="font-semibold">{company}</span> — real work, attested by the team.
              </div>
            </div>
          </Card>
        </FadeUp>

        {/* Sticky apply card */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <FadeUp>
              <Card className="border-gray-200 p-6 shadow-soft-lg">
                <div className="bg-grain pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay" />
                <div className="relative">
                  {submitted ? (
                    <div className="text-center">
                      <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
                      <h3 className="mt-3 font-display text-lg font-bold text-gray-900">
                        Application submitted
                      </h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Track its status in your applications.
                      </p>
                      <Button asChild className="mt-4 w-full">
                        <Link href="/dashboard/student/applications">View applications</Link>
                      </Button>
                    </div>
                  ) : existingApp ? (
                    <div className="rounded-xl bg-gray-50 p-4 text-center">
                      <p className="text-sm text-gray-600">
                        You&apos;ve already applied. Status:{" "}
                        <span className="font-semibold text-primary">
                          {STATUS_LABELS[existingApp]}
                        </span>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-display text-lg font-bold text-gray-900">Apply now</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Put your name forward — it takes a minute.
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Cover message (optional)
                        </label>
                        <Textarea
                          value={coverLetter}
                          onChange={(e) => setCoverLetter(e.target.value)}
                          placeholder="Tell the employer why you're a great fit..."
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Proposed budget (optional)
                        </label>
                        <input
                          type="number"
                          value={proposedBudget}
                          onChange={(e) => setProposedBudget(e.target.value)}
                          placeholder="e.g. 500"
                          className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                          {error}
                        </div>
                      )}
                      <Magnetic className="w-full">
                        <Button onClick={submit} disabled={applying} className="w-full">
                          {applying ? "Submitting..." : "Submit application"}
                          {!applying && <ArrowUpRight className="h-4 w-4" />}
                        </Button>
                      </Magnetic>
                    </div>
                  )}
                </div>
              </Card>
            </FadeUp>
          </div>
        </div>
      </section>
    </div>
  );
}
