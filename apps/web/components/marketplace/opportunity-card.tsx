"use client";

import Link from "next/link";
import { Project, MatchedProject } from "@/lib/types";
import { TYPE_LABELS } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, MapPin, ShieldCheck } from "lucide-react";

interface OpportunityCardProps {
  project: Project | MatchedProject;
  onApply?: (id: string) => void;
  showActions?: boolean;
}

// Deterministic cover gradient per opportunity type (Fiverr-style visual band,
// no external image needed). Keeps the titanium/charcoal/purple system.
const COVER: Record<string, string> = {
  internship: "from-primary to-[#5A189A]",
  full_time: "from-[#5A189A] to-[#3C096C]",
  part_time: "from-primary-light to-primary",
  freelance: "from-[#7B2CBF] to-[#3C096C]",
};

export function OpportunityCard({
  project,
  onApply,
  showActions = true,
}: OpportunityCardProps) {
  const isMatch = "matchScore" in project;
  const cover = COVER[project.type] || "from-primary to-[#5A189A]";
  const company =
    project.employer?.companyName || project.employer?.user?.name || "Company";

  return (
    <Card className="group relative flex flex-col overflow-hidden p-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg">
      {/* Hover glow sheen — a diagonal light sweep that travels across the card on hover */}
      <div className="pointer-events-none absolute inset-0 z-20 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent [transform:translateX(-120%)] transition-transform duration-700 ease-out group-hover:[transform:translateX(120%)]" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/10 to-accent/10" />
      </div>
      {/* Visual cover band — the "gig image" slot (Fiverr/Aceternity pattern) */}
      <div className={`relative h-28 overflow-hidden bg-gradient-to-br ${cover}`}>
        <div className="bg-grain pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay" />
        <div className="glow-purple pointer-events-none absolute inset-0 opacity-50" />
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/15 blur-2xl" />

        {/* type pill top-left */}
        <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
          {TYPE_LABELS[project.type]}
        </span>

        {/* match badge top-right (only on matched list) */}
        {isMatch && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-primary shadow-soft">
            {project.matchScore}% Match
          </span>
        )}

        {/* upfront price, bottom-left (Fiverr: show the number first) */}
        {project.budget ? (
          <div className="absolute bottom-3 left-3 text-white">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/70">
              Budget
            </p>
            <p className="font-display text-xl font-extrabold leading-none">
              ${project.budget}
            </p>
          </div>
        ) : (
          <div className="absolute bottom-3 left-3 text-white">
            <p className="font-display text-lg font-extrabold leading-none">
              Open
            </p>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-bold text-gray-900">
            {project.title}
          </h3>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-gray-400 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
        </div>

        <div className="mt-1.5 flex items-center gap-1.5 text-sm text-gray-500">
          {project.employer?.companyName ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-primary">
              <ShieldCheck className="h-3 w-3" /> Attested
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
              Unverified
            </span>
          )}
          <span className="flex items-center gap-1 truncate">
            <span className="truncate">{company}</span>
            <span className="text-gray-300">·</span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {project.location || (project.remote ? "Remote" : "Onsite")}
            </span>
          </span>
        </div>

        <p className="mt-3 line-clamp-2 flex-1 text-sm text-gray-600">
          {project.description}
        </p>

        {project.skillsRequired && project.skillsRequired.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {project.skillsRequired.slice(0, 3).map((skill) => (
              <Badge key={skill} variant="neutral" size="sm">
                {skill}
              </Badge>
            ))}
            {project.skillsRequired.length > 3 && (
              <Badge variant="neutral" size="sm">
                +{project.skillsRequired.length - 3}
              </Badge>
            )}
          </div>
        )}

        {showActions && (
          <div className="mt-4 flex gap-2">
            <Link
              href={`/dashboard/student/projects/${project.id}`}
              className="flex-1"
            >
              <span className="inline-flex h-9 w-full items-center justify-center rounded-xl border border-gray-200 text-sm font-medium text-gray-700 transition-colors hover:border-primary/40 hover:text-primary">
                View details
              </span>
            </Link>
            {onApply && (
              <button
                onClick={() => onApply(project.id)}
                className="flex-1 rounded-xl bg-primary text-sm font-medium text-primary-contrast shadow-soft transition-colors hover:bg-primary-hover"
              >
                Apply
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
