"use client";

import { useEffect, useState } from "react";
import { apiRequest, API_ENDPOINTS, getToken } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { FadeUp, Stagger, StaggerItem, Tilt } from "@/components/motion";
import { Magnetic } from "@/components/motion/primitives2";
import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  BadgeCheck,
  FileText,
  GraduationCap,
  Check,
  Plus,
  X,
} from "lucide-react";

interface Candidate {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  university: string | null;
  major: string | null;
  skills: string[];
  skillMatches: string[];
  certificates: { id: string; title: string; verified: boolean; fileUrl: string }[];
  attestedSkills: { skill: string; note: string | null; createdAt: string }[];
}

interface VerificationData {
  candidates: Candidate[];
  openSkills: string[];
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

export default function VerificationCenterPage() {
  const token = getToken();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VerificationData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    try {
      const d = await apiRequest<VerificationData>(API_ENDPOINTS.projects.verification, {
        method: "GET",
        token,
      });
      setData(d);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function toggleAttest(c: Candidate, skill: string) {
    const key = `${c.id}:${skill}`;
    setBusy(key);
    const already = c.attestedSkills.some((a) => a.skill === skill);
    try {
      if (already) {
        await apiRequest(API_ENDPOINTS.projects.revokeAttest, {
          method: "DELETE",
          token,
          query: { studentId: c.id, skill },
        });
      } else {
        await apiRequest(API_ENDPOINTS.projects.attestSkill, {
          method: "POST",
          token,
          body: { studentId: c.id, skill },
        });
      }
      setToast(already ? `Revoked attestation: ${skill}` : `Attested ${skill} ✓`);
      setTimeout(() => setToast(null), 2500);
      await load();
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const candidates = data?.candidates ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Employer"
        title="Verification Center"
        subtitle="Review candidate proof and attest skills — portable, employer-signed proof that travels with the student."
      />

      {candidates.length === 0 ? (
        <Card className="stat-soft p-10 text-center text-gray-500">
          No candidates have applied yet. Attest skills once students start applying.
        </Card>
      ) : (
        <Stagger className="grid gap-4 sm:grid-cols-2">
          {candidates.map((c) => (
            <StaggerItem key={c.id} as="div">
              <Tilt intensity={3}>
                <Card className="stat-soft flex h-full flex-col p-5 shadow-soft">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-display text-base font-bold text-primary">
                      {initials(c.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-lg font-bold text-gray-900">{c.name}</p>
                      <p className="flex items-center gap-1 truncate text-sm text-gray-500">
                        <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                        {c.university || "Student"}
                        {c.major ? ` · ${c.major}` : ""}
                      </p>
                    </div>
                    <ShieldCheck className="h-5 w-5 text-primary/60" />
                  </div>

                  {/* Skills + attest */}
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Skills · tap to attest
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {c.skills.length === 0 && (
                        <span className="text-sm text-gray-400">No skills listed</span>
                      )}
                      {c.skills.map((s) => {
                        const matched = c.skillMatches.includes(s.toLowerCase());
                        const attested = c.attestedSkills.some((a) => a.skill === s);
                        const key = `${c.id}:${s}`;
                        return (
                          <button
                            key={s}
                            disabled={busy === key}
                            onClick={() => toggleAttest(c, s)}
                            title={attested ? "Click to revoke attestation" : "Attest this skill"}
                            className={cn(
                              "group inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition",
                              attested
                                ? "bg-primary text-white ring-1 ring-primary"
                                : matched
                                ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 hover:bg-primary/20"
                                : "bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-200 hover:ring-primary/30"
                            )}
                          >
                            {attested ? <Check className="h-3 w-3" /> : matched ? null : null}
                            {s}
                            {attested ? null : <Plus className="h-3 w-3 opacity-50 group-hover:opacity-100" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Certificates */}
                  <div className="mt-4 border-t border-gray-100 pt-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Certificates
                    </p>
                    {c.certificates.length === 0 ? (
                      <p className="text-sm text-gray-400">No certificates uploaded</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {c.certificates.map((cert) => (
                          <a
                            key={cert.id}
                            href={cert.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ring-1 ring-inset transition",
                              cert.verified
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                : "bg-gray-50 text-gray-600 ring-gray-200"
                            )}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            {cert.title}
                            {cert.verified && <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Attested proof strip */}
                  {c.attestedSkills.length > 0 && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-primary">
                      <BadgeCheck className="h-4 w-4" />
                      {c.attestedSkills.length} skill{c.attestedSkills.length > 1 ? "s" : ""} attested by you
                    </div>
                  )}
                </Card>
              </Tilt>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
