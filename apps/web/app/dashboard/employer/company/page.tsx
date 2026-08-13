"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, API_ENDPOINTS, getToken, ApiError } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { FadeUp, Stagger, StaggerItem } from "@/components/motion";
import { Magnetic } from "@/components/motion/primitives2";
import { cn } from "@/lib/utils";
import { Building2, BadgeCheck, Save, Users2, Briefcase, ShieldCheck, ArrowUpRight } from "lucide-react";

interface EmployerProfile {
  companyName: string;
  industry?: string | null;
  companySize?: number;
  verified?: boolean;
}

const SIZE_OPTIONS = [1, 10, 50, 200, 500, 1000];

function sizeLabel(n?: number) {
  if (!n) return "Not set";
  if (n < 50) return `${n} · Small`;
  if (n < 200) return `${n} · Mid`;
  return `${n}+ · Large`;
}

export default function CompanyPage() {
  const router = useRouter();
  const token = getToken();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<EmployerProfile>({
    companyName: "",
    industry: "",
    companySize: 0,
  });

  const load = async () => {
    if (!token) return;
    try {
      const data = await apiRequest<{ user: { profile: EmployerProfile } }>(
        API_ENDPOINTS.users.profile,
        { method: "GET", token }
      );
      const p = data.user.profile;
      setForm({
        companyName: p.companyName ?? "",
        industry: p.industry ?? "",
        companySize: p.companySize ?? 0,
      });
    } catch {
      setError("Failed to load company profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const save = async () => {
    if (!token) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await apiRequest(API_ENDPOINTS.users.updateProfile, {
        method: "PUT",
        token,
        body: {
          companyName: form.companyName,
          industry: form.industry || null,
          companySize: form.companySize,
        },
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Employer"
        title="Company"
        subtitle="Your organization profile — shown to candidates and used across SkillBridge."
      />

      {error && (
        <div className="p-3 border border-red-200 bg-red-50 rounded-md text-sm text-red-700">{error}</div>
      )}

      {/* Identity card */}
      <FadeUp>
        <Card className="relative overflow-hidden p-0 shadow-soft">
          <div className="bg-grain pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay" />
          <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-white shadow-[0_8px_24px_-8px_rgba(60,9,108,0.6)]">
              {(form.companyName || "C").charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl font-extrabold text-gray-900">
                  {form.companyName || "Your Company"}
                </h2>
                {form.verified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500">
                    Unverified
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {form.industry || "Industry not set"} · {sizeLabel(form.companySize)}
              </p>
            </div>
          </div>
        </Card>
      </FadeUp>

      {/* Edit form */}
      <Stagger className="grid gap-6 lg:grid-cols-2">
        <StaggerItem as="div">
          <Card className="h-full p-6">
            <h3 className="display text-lg font-semibold text-gray-900 mb-4">Company details</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="companyName">Company name</Label>
                <Input
                  id="companyName"
                  value={form.companyName}
                  onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                  placeholder="e.g. Phnom Penh Labs"
                />
              </div>
              <div>
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={form.industry ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                  placeholder="e.g. Software · Education · Manufacturing"
                />
              </div>
              <div>
                <Label>Company size</Label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {SIZE_OPTIONS.map((n) => {
                    const active = form.companySize === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, companySize: n }))}
                        className={cn(
                          "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                          active
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-gray-200 text-gray-600 hover:bg-gray-100"
                        )}
                      >
                        {n === 1 ? "1–9" : n === 10 ? "10–49" : n === 50 ? "50–199" : n === 200 ? "200–499" : "500+"}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        </StaggerItem>

        <StaggerItem as="div">
          <Card className="h-full p-6">
            <h3 className="display text-lg font-semibold text-gray-900 mb-4">Trust & visibility</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-3">
                <BadgeCheck className="mt-0.5 h-4 w-4 text-primary" />
                Verified employers get a purple badge that boosts candidate trust.
              </li>
              <li className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                Only your company name, industry and size are shared publicly.
              </li>
              <li className="flex items-start gap-3">
                <Briefcase className="mt-0.5 h-4 w-4 text-primary" />
                Updates apply to every opportunity you post instantly.
              </li>
            </ul>
            <div className="mt-5 flex items-center gap-3">
              <Magnetic>
                <Button onClick={save} disabled={saving}>
                  <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
                </Button>
              </Magnetic>
              {saved && <span className="text-sm font-medium text-green-600">Saved.</span>}
            </div>
          </Card>
        </StaggerItem>
      </Stagger>

      {/* Quick links */}
      <FadeUp>
        <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Users2 className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-gray-900">Review your applicants</p>
              <p className="text-sm text-gray-500">All candidates across your opportunities.</p>
            </div>
          </div>
          <Button onClick={() => router.push("/dashboard/employer/applicants")} variant="outline">
            Go to Applicants <ArrowUpRight className="h-4 w-4" />
          </Button>
        </Card>
      </FadeUp>
    </div>
  );
}
