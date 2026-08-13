"use client";

import { useEffect, useState } from "react";
import { apiRequest, API_ENDPOINTS, getToken, ApiError } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { FadeUp, Stagger, StaggerItem } from "@/components/motion";
import { Magnetic } from "@/components/motion/primitives2";
import { cn } from "@/lib/utils";
import { Users2, UserPlus, Mail, Trash2, Crown, ShieldCheck, Briefcase, UserCog } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "recruiter" | "hiring_manager" | "admin";
  status: "invited" | "active";
  createdAt: string;
}

const ROLE_META: Record<TeamMember["role"], { label: string; icon: typeof Briefcase }> = {
  recruiter: { label: "Recruiter", icon: UserCog },
  hiring_manager: { label: "Hiring Manager", icon: Briefcase },
  admin: { label: "Admin", icon: ShieldCheck },
};

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export default function TeamPage() {
  const token = getToken();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamMember["role"]>("recruiter");

  const load = async () => {
    if (!token) return;
    try {
      const d = await apiRequest<{ members: TeamMember[] }>(API_ENDPOINTS.projects.teamList, {
        method: "GET",
        token,
      });
      setMembers(d.members ?? []);
    } catch {
      setError("Failed to load team");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const invite = async () => {
    if (!token || !name.trim() || !email.trim()) return;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const d = await apiRequest<{ member: TeamMember }>(API_ENDPOINTS.projects.teamInvite, {
        method: "POST",
        token,
        body: { name: name.trim(), email: email.trim(), role },
      });
      setMembers((m) => [...m, d.member]);
      setName("");
      setEmail("");
      setRole("recruiter");
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!token) return;
    try {
      await apiRequest(API_ENDPOINTS.projects.teamRemove(id), { method: "DELETE", token });
      setMembers((m) => m.filter((x) => x.id !== id));
    } catch {
      // ignore
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
        title="Team"
        subtitle="Invite teammates to collaborate on hiring — recruiters, hiring managers, and admins."
      />

      {error && (
        <div className="p-3 border border-red-200 bg-red-50 rounded-md text-sm text-red-700">{error}</div>
      )}

      {/* Owner + teammates */}
      <FadeUp>
        <Card className="relative overflow-hidden p-0 shadow-soft">
          <div className="bg-grain pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay" />
          <div className="relative p-6">
            <h3 className="display text-lg font-semibold text-gray-900 mb-4">People ({members.length + 1})</h3>
            <div className="space-y-2">
              {/* Owner row (current user) */}
              <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">
                    ME
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">You</p>
                    <p className="text-xs text-gray-500">Account owner</p>
                  </div>
                </div>
                <Badge variant="primary" size="sm">
                  <Crown className="h-3 w-3" /> Owner
                </Badge>
              </div>

              {members.map((m) => {
                const r = ROLE_META[m.role];
                const RoleIcon = r.icon;
                return (
                  <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 font-semibold text-primary">
                        {initials(m.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-medium text-gray-900">
                          {m.name}
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              m.status === "active"
                                ? "bg-green-50 text-green-600"
                                : "bg-amber-50 text-amber-600"
                            )}
                          >
                            {m.status}
                          </span>
                        </p>
                        <p className="flex items-center gap-1 truncate text-xs text-gray-500">
                          <Mail className="h-3 w-3" /> {m.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" size="sm">
                        <RoleIcon className="h-3 w-3" /> {r.label}
                      </Badge>
                      <button
                        onClick={() => remove(m.id)}
                        className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-[#FF0000]"
                        aria-label={`Remove ${m.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {members.length === 0 && (
                <p className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400">
                  No teammates yet. Invite your first recruiter below.
                </p>
              )}
            </div>
          </div>
        </Card>
      </FadeUp>

      {/* Invite form */}
      <Stagger className="grid gap-6 lg:grid-cols-2">
        <StaggerItem as="div">
          <Card className="h-full p-6">
            <h3 className="display text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" /> Invite a teammate
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="tm-name">Full name</Label>
                <Input
                  id="tm-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Chan Dara"
                />
              </div>
              <div>
                <Label htmlFor="tm-email">Email</Label>
                <Input
                  id="tm-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teammate@company.com"
                />
              </div>
              <div>
                <Label>Role</Label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {(Object.keys(ROLE_META) as TeamMember["role"][]).map((r) => {
                    const active = role === r;
                    const RIcon = ROLE_META[r].icon;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                          active
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-gray-200 text-gray-600 hover:bg-gray-100"
                        )}
                      >
                        <RIcon className="h-3.5 w-3.5" /> {ROLE_META[r].label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Magnetic>
                <Button onClick={invite} disabled={busy || !name.trim() || !email.trim()}>
                  <UserPlus className="h-4 w-4" /> {busy ? "Inviting…" : "Send invite"}
                </Button>
              </Magnetic>
              {saved && <span className="ml-3 text-sm font-medium text-green-600">Invited.</span>}
            </div>
          </Card>
        </StaggerItem>

        <StaggerItem as="div">
          <Card className="h-full p-6">
            <h3 className="display text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users2 className="h-5 w-5 text-primary" /> Roles & permissions
            </h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                <span><b className="text-gray-900">Admin</b> — full access: edit jobs, manage candidates, invite/remove teammates.</span>
              </li>
              <li className="flex items-start gap-3">
                <Briefcase className="mt-0.5 h-4 w-4 text-primary" />
                <span><b className="text-gray-900">Hiring Manager</b> — review candidates, move pipeline stages, schedule interviews.</span>
              </li>
              <li className="flex items-start gap-3">
                <UserCog className="mt-0.5 h-4 w-4 text-primary" />
                <span><b className="text-gray-900">Recruiter</b> — source talent, message candidates, submit applications for review.</span>
              </li>
            </ul>
          </Card>
        </StaggerItem>
      </Stagger>
    </div>
  );
}
