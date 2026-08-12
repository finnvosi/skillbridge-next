"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest, API_ENDPOINTS, getToken } from "@/lib/api-client";
import { Project, Application, MatchedProject } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, SectionHeader, StatCard } from "@/components/layout/page-header";
import { OpportunityCard } from "@/components/marketplace/opportunity-card";
import { FadeUp } from "@/components/motion";
import { Briefcase, Users, CheckCircle2 } from "lucide-react";

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

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Profile Strength Hero — premium purple anchor for the page */}
      <Card className="relative overflow-hidden border border-primary/20 bg-gradient-to-br from-primary to-[#5A189A] p-0 shadow-soft-lg">
        {/* aurora glow + grain for depth */}
        <div className="glow-purple pointer-events-none absolute inset-0 opacity-40" />
        <div className="bg-grain pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay" />
        {/* sheen hairline */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        {/* soft radial highlight, top-right */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex flex-col gap-8 p-7 sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div className="flex items-center gap-6">
            {/* large animated completion ring */}
            <div className="relative h-28 w-28 shrink-0 drop-shadow-lg">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="9" />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray="327"
                  strokeDashoffset={327 * (1 - profileCompletion / 100)}
                  className="transition-[stroke-dashoffset] duration-1000 ease-out"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-display text-2xl font-extrabold text-white">
                {profileCompletion}%
              </span>
            </div>

            <div className="max-w-md">
              <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-white/70">
                Your Bridge
              </p>
              <h1 className="display mt-2 text-3xl font-extrabold text-white sm:text-4xl">
                Profile strength
              </h1>
              <p className="mt-2 text-sm text-white/80 sm:text-base">
                Your verified skills are your bridge to real opportunities.
                {profileCompletion < 100 && (
                  <>
                    {" "}
                    <span className="font-medium text-white">
                      {100 - profileCompletion}% to go
                    </span>{" "}
                    — add a few more to unlock stronger matches.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="shrink-0 sm:text-right">
            <Link href="/dashboard/student/profile">
              <Button
                size="lg"
                variant="secondary"
                className="w-full bg-white text-primary hover:bg-white/90 sm:w-auto"
              >
                Edit profile
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Briefcase}
          label="Matched opportunities"
          value={data.stats.matchedOpportunities}
          accent="text-primary"
        />
        <StatCard
          icon={CheckCircle2}
          label="Skills verified"
          value={data.stats.skillsCount}
          accent="text-teal-600"
        />
        <StatCard
          icon={Users}
          label="Applications in progress"
          value={data.stats.totalApplications}
          accent="text-amber-600"
        />
      </div>

      {/* Matched opportunities with scores */}
      {data.matchedProjects.length > 0 ? (
        <section>
          <SectionHeader
            eyebrow="AI-matched"
            title="Recommended for you"
            description="Matched by your skills, budget & location"
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.matchedProjects.map((p, i) => (
              <FadeUp key={p.id} delay={i * 0.05}>
                <OpportunityCard project={p} />
              </FadeUp>
            ))}
          </div>
        </section>
      ) : (
        <FadeUp>
          <Card className="border-dashed border-card-border bg-white/50 p-10 text-center backdrop-blur-sm">
            <h3 className="display text-xl font-semibold text-gray-900">
              No matched opportunities yet
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
              Complete your profile with skills to get AI-powered matches.
            </p>
            <Link href="/dashboard/student/profile" className="mt-5 inline-block">
              <Button variant="outline">Complete profile</Button>
            </Link>
          </Card>
        </FadeUp>
      )}

      {/* Quick links */}
      <section>
        <SectionHeader eyebrow="Shortcuts" title="Jump back in" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FadeUp>
            <Card className="group h-full bg-white/70 p-6 shadow-soft backdrop-blur-xl transition-all duration-300 hover:shadow-soft-lg">
              <h3 className="display text-lg font-semibold text-gray-900">
                My Applications
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Track the status of your applications.
              </p>
              <Button asChild className="mt-4 w-full">
                <Link href="/dashboard/student/applications">View all</Link>
              </Button>
            </Card>
          </FadeUp>

          <FadeUp delay={0.05}>
            <Card className="group h-full bg-white/70 p-6 shadow-soft backdrop-blur-xl transition-all duration-300 hover:shadow-soft-lg">
              <h3 className="display text-lg font-semibold text-gray-900">
                Discover
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Browse all opportunities and refine your matches.
              </p>
              <Button asChild variant="outline" className="mt-4 w-full">
                <Link href="/dashboard/student/discover">Browse</Link>
              </Button>
            </Card>
          </FadeUp>
        </div>
      </section>
    </div>
  );
}
