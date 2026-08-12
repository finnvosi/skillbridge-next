"use client";

import { Application, ApplicationStatus } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ArrowUpRight, Mail, Check, X } from "lucide-react";

interface ApplicantCardProps {
  app: Application;
  onStatusChange?: (applicationId: string, status: "accepted" | "rejected") => void;
  busy?: boolean;
  onReview?: (applicationId: string) => void;
  onMessage?: (applicationId: string) => void;
}

function initials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ApplicantCard({
  app,
  onStatusChange,
  busy,
  onReview,
  onMessage,
}: ApplicantCardProps) {
  const name = app.student?.user?.name || "Candidate";
  const email = app.student?.user?.email || "";
  const pending = app.status === "pending";

  return (
    <Card className="group relative overflow-hidden p-0 shadow-soft transition-all duration-300 hover:shadow-soft-lg">
      <div className="bg-grain pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay" />
      <div className="relative flex items-start justify-between gap-4 p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-display text-base font-bold text-primary">
            {initials(name)}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-display text-lg font-bold text-gray-900">
                {name}
              </h3>
              <StatusBadge status={app.status as ApplicationStatus} />
            </div>
            <p className="mt-0.5 truncate text-sm text-gray-500">{email}</p>
            <p className="mt-1 text-xs text-gray-400">
              Applied {new Date(app.createdAt).toLocaleDateString()} ·{" "}
              {app.project?.title || "Opportunity"}
            </p>
            {app.coverLetter && (
              <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                “{app.coverLetter}”
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="relative flex items-center gap-2 border-t border-gray-100 px-5 py-3">
        {pending ? (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onMessage?.(app.id)}
              className="flex-1"
            >
              <Mail className="h-3.5 w-3.5" /> Message
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onStatusChange?.(app.id, "rejected")}
              className="flex-1"
            >
              <X className="h-3.5 w-3.5" /> Reject
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={busy}
              onClick={() => onStatusChange?.(app.id, "accepted")}
              className="flex-1"
            >
              <Check className="h-3.5 w-3.5" /> Accept
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onMessage?.(app.id)}
            >
              <Mail className="h-3.5 w-3.5" /> Message
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => onReview?.(app.id)}
            >
              View <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
