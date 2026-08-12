"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest, API_ENDPOINTS, getToken } from "@/lib/api-client";
import { Project, Application, MatchedProject } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OpportunityCard } from "@/components/marketplace/opportunity-card";
import { FadeUp, Stagger, StaggerItem, CountUp, Tilt } from "@/components/motion";
import { ScaleOnScroll } from "@/components/motion/primitives2";
import { ArrowUpRight, Briefcase, CheckCircle2, Users, Sparkles, Compass, ClipboardList } from "lucide-react";

interface DashboardData {
  profile: {
    university?: string | null;
    major?: string | null;
    graduationYear?: number | null;
    skills?: string[];
    bio?: string | null;
    location?: string | null;
  };
  stats: {
    matchedOpportunities: number;
    totalApplications: number;
    skillsCount: number;
  };
  matchedProjects: MatchedProject[];
  applications: Application[];
}

export default function StudentDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    profile: {},
    stats: { matchedOpportunities: 0, totalApplications: 0, skillsCount: 0 },
    matchedProjects: [],
    applications: [],
  });

  useEffect(() => {
    (async () => {
      const token = getToken();
      if (!token) return;

      try {
        const [profileRes, matchRes, appsRes] = await Promise.all([
          apiRequest<{ user: { name: string; profile: DashboardData["profile"] } }>(
            API_ENDPOINTS.users.profile,
            { method: "GET", token }
          ),
          apiRequest<{ projects: MatchedProject[] }>(API_ENDPOINTS.projects.match, {
            method: "GET",
            token,
          }),
          apiRequest<{ applications: Application[] }>(
            API_ENDPOINTS.projects.myApplications,
            { method: "GET", token }
          ),
        ]);

        const profile = profileRes.user.profile || {};
        const skills = profile.skills || [];

        setData({
          profile,
          stats: {
            matchedOpportunities: matchRes.projects?.length || 0,
            totalApplications: appsRes.applications?.length || 0,
            skillsCount: skills.length,
          },
          matchedProjects: matchRes.projects || [],
          applications: appsRes.applications || [],
        });
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const profileCompletion = Math.min(100, (data.stats.skillsCount / 5) * 20 + 50);
  const featured = data.matchedProjects[0];
  const rest = data.matchedProjects.slice(1, 4);

  if (loading) {
    return (
      <div className="space-y-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <Skeleton className="h-64 lg:col-span-5" />
          <Skeleton className="h-64 lg:col-span-7" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-16 sm:space-y-20">
      {/* ============ HERO — asymmetric editorial split ============ */}
      <section className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
        {/* Left: profile-strength monument (the "ring" as an editorial stat) */}
        <FadeUp className="lg:col-span-5">
          <p className="label-mono">002 — Your bridge</p>
          <h1 className="display mt-4 text-4xl leading-[1.02] sm:text-5xl">
            Your strength,
            <br />
            <span className="text-primary">in one number.</span>
          </h1>

          <div className="mt-8 flex items-center gap-7">
            {/* large animated completion ring */}
            <div className="relative h-36 w-36 shrink-0 drop-shadow-lg">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(60,9,108,0.12)" strokeWidth="8" />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="327"
                  strokeDashoffset={327 * (1 - profileCompletion / 100)}
                  className="transition-[stroke-dashoffset] duration-1000 ease-out"
                />
              </svg>
              <span className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-3xl font-extrabold text-gray-900">
                  <CountUp value={profileCompletion} suffix="%" />
                </span>
              </span>
            </div>

            <div className="max-w-xs">
              <p className="text-lg leading-relaxed text-gray-700">
                Your verified skills are the bridge to real opportunities.
                {profileCompletion < 100 && (
                  <>
                    {" "}
                    <span className="font-medium text-primary">
                      {100 - profileCompletion}% to go
                    </span>{" "}
                    — add a few more to unlock stronger matches.
                  </>
                )}
              </p>
              <Link href="/dashboard/student/profile" className="mt-4 inline-block">
                <Button variant="outline" size="sm">
                  Edit profile <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </FadeUp>

        {/* Right: manifesto + stat strip */}
        <div className="lg:col-span-7">
          <FadeUp delay={0.05}>
            <div className="border-l-2 border-primary pl-6">
              <p className="text-2xl leading-relaxed text-gray-700 sm:text-3xl">
                A degree says you showed up.
                <span className="text-primary"> Verified work</span> says you can
                do it. Build the record, get discovered.
              </p>
            </div>

            {/* stat strip — hairline-divided, homepage style */}
            <div className="mt-10 grid grid-cols-3 divide-x divide-gray-200 border-y border-gray-200">
              <div className="px-1 py-5 first:pl-0">
                <p className="font-display text-3xl font-extrabold text-gray-900">
                  <CountUp value={data.stats.matchedOpportunities} />
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">
                  Matches
                </p>
              </div>
              <div className="px-4 py-5">
                <p className="font-display text-3xl font-extrabold text-gray-900">
                  <CountUp value={data.stats.skillsCount} />
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">
                  Skills verified
                </p>
              </div>
              <div className="px-4 py-5">
                <p className="font-display text-3xl font-extrabold text-gray-900">
                  <CountUp value={data.stats.totalApplications} />
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">
                  Applications
                </p>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ============ FEATURED MATCH — editorial 12-col spread ============ */}
      {featured ? (
        <section className="border-t border-gray-200 pt-14 sm:pt-16">
          <FadeUp>
            <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="label-mono-muted">003 — Best match</p>
                <ScaleOnScroll className="mt-3 inline-block" from={0.92} to={1.04}>
                  <h2 className="display text-4xl sm:text-5xl">Made for you</h2>
                </ScaleOnScroll>
                <p className="mt-2 text-sm text-gray-500">
                  Ranked by your skills, budget &amp; location.
                </p>
              </div>
              <Link
                href="/dashboard/student/discover"
                className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-primary hover:underline"
              >
                Browse all →
              </Link>
            </div>
          </FadeUp>

          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Featured — big, with Tilt + glow */}
            <FadeUp className="lg:col-span-7">
              <Tilt intensity={5}>
                <Link href={`/dashboard/student/projects/${featured.id}`}>
                  <Card className="group relative h-full overflow-hidden border-gray-200 p-0 shadow-soft transition-shadow duration-300 hover:shadow-soft-lg">
                    <div className="glow-purple pointer-events-none absolute inset-0 opacity-30" />
                    <div className="bg-grain pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay" />
                    <div className="relative flex h-full flex-col justify-between gap-8 p-8 sm:p-10">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="label-mono">{featured.employer?.companyName || featured.employer?.user?.name || "Company"}</p>
                          <h3 className="display mt-3 text-3xl font-extrabold text-gray-900 sm:text-4xl">
                            {featured.title}
                          </h3>
                        </div>
                        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-contrast">
                          <Sparkles className="h-3.5 w-3.5" />
                          {featured.matchScore}% Match
                        </span>
                      </div>

                      <p className="line-clamp-3 max-w-xl text-base leading-relaxed text-gray-600">
                        {featured.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1.5 text-primary">
                          <Briefcase className="h-4 w-4" />
                          {featured.skillsRequired?.slice(0, 2).join(" · ") || "Open to all"}
                        </span>
                        <span>{featured.location || (featured.remote ? "Remote" : "Onsite")}</span>
                        {featured.budget && (
                          <span className="font-medium text-gray-900">${featured.budget}</span>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              </Tilt>
            </FadeUp>

            {/* Rest as a tidy stack */}
            <Stagger className="space-y-4 lg:col-span-5">
              {rest.map((p) => (
                <StaggerItem key={p.id} as="div">
                  <Link href={`/dashboard/student/projects/${p.id}`}>
                    <Card className="group flex h-full items-start justify-between gap-4 border-gray-200 p-6 shadow-soft transition-all duration-300 hover:shadow-soft-lg">
                      <div>
                        <h3 className="font-display text-lg font-bold text-gray-900">{p.title}</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {p.employer?.companyName || p.employer?.user?.name || "Company"}
                        </p>
                        <p className="mt-3 text-xs uppercase tracking-wide text-gray-500">
                          {p.location || (p.remote ? "Remote" : "Onsite")}
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                        {p.matchScore}% Match
                      </span>
                    </Card>
                  </Link>
                </StaggerItem>
              ))}
              {rest.length === 0 && (
                <Card className="border-dashed border-gray-300 p-6 text-sm text-gray-500">
                  More matches appear as you verify skills.
                </Card>
              )}
            </Stagger>
          </div>
        </section>
      ) : (
        <section className="border-t border-gray-200 pt-14">
          <FadeUp>
            <div className="mx-auto max-w-2xl rounded-3xl border border-gray-200 bg-white/60 p-10 text-center shadow-soft backdrop-blur-xl">
              <Sparkles className="mx-auto h-8 w-8 text-primary/50" />
              <h2 className="display mt-4 text-3xl">No matches yet</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
                Complete your profile with verified skills to unlock AI-powered matches.
              </p>
              <Link href="/dashboard/student/profile" className="mt-5 inline-block">
                <Button variant="primary">Complete profile</Button>
              </Link>
            </div>
          </FadeUp>
        </section>
      )}

      {/* ============ NEXT STEPS — editorial "shortcuts" ============ */}
      <section className="border-t border-gray-200 pt-14 sm:pt-16">
        <FadeUp>
          <p className="label-mono-muted">004 — Jump back in</p>
          <h2 className="display mt-3 text-3xl sm:text-4xl">Where to next</h2>
        </FadeUp>

        <Stagger className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-gray-200 bg-gray-200 sm:grid-cols-2">
          {[
            {
              icon: ClipboardList,
              t: "My Applications",
              d: "Track the status of everything you've sent.",
              href: "/dashboard/student/applications",
            },
            {
              icon: Compass,
              t: "Discover",
              d: "Browse all opportunities and refine your matches.",
              href: "/dashboard/student/discover",
            },
            {
              icon: CheckCircle2,
              t: "Verified skills",
              d: "Add the work that proves what you can do.",
              href: "/dashboard/student/profile",
            },
            {
              icon: Users,
              t: "Get discovered",
              d: "Employers hiring on proof can find you.",
              href: "/dashboard/student/profile",
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <StaggerItem key={s.t} as="div">
                <Link
                  href={s.href}
                  className="group flex h-full items-start gap-4 bg-white p-7 transition-colors duration-200 hover:bg-gray-50"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-lg font-bold text-gray-900">{s.t}</h3>
                      <ArrowUpRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{s.d}</p>
                  </div>
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
      </section>

      {/* ============ CLOSING CTA — purple moment ============ */}
      <section className="relative overflow-hidden rounded-3xl bg-primary px-6 py-14 sm:px-10">
        <div className="glow-purple pointer-events-none absolute inset-0 opacity-40" />
        <div className="bg-grain pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative mx-auto flex max-w-4xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <h2 className="display max-w-xl text-3xl leading-tight text-primary-contrast sm:text-4xl">
            Ready to turn coursework into proof?
          </h2>
          <Link href="/dashboard/student/profile">
            <Button size="lg" className="bg-white text-primary shadow-soft hover:bg-gray-100">
              Build your bridge
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
