"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  apiRequest,
  API_ENDPOINTS,
  getToken,
  ApiError,
} from "@/lib/api-client";
import { ProjectType, TYPE_LABELS } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FadeUp, Stagger, StaggerItem } from "@/components/motion";
import { Magnetic } from "@/components/motion/primitives2";
import { cn } from "@/lib/utils";
import { useAuthGuard } from "@/lib/use-auth-guard";
import {
  Briefcase,
  Layers,
  MapPin,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

const TYPES: ProjectType[] = ["internship", "part_time", "freelance", "full_time"];
const TYPE_ICON: Record<ProjectType, string> = {
  internship: "🎓",
  part_time: "⏳",
  freelance: "💼",
  full_time: "🏢",
};
const STEPS = ["Role", "Type & Skills", "Logistics"];

const SUGGESTED_SKILLS = [
  "React",
  "TypeScript",
  "Figma",
  "Node.js",
  "UI/UX",
  "Python",
  "Marketing",
  "Data Analysis",
];

export default function NewProjectPage() {
  const { loading, denied } = useAuthGuard(["employer"]);
  const router = useRouter();
  const token = getToken();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "internship" as ProjectType,
    location: "",
    budget: "",
    startDate: "",
    endDate: "",
    skillsRequired: [] as string[],
    remote: false,
  });
  const [skillInput, setSkillInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form, v: string | boolean | string[] | ProjectType) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Per-step validation
  const stepValid =
    step === 0
      ? form.title.trim().length >= 5 && form.description.trim().length >= 20
      : step === 1
      ? form.skillsRequired.length >= 1
      : true;

  const addSkill = (raw: string) => {
    const s = raw.trim();
    if (!s || form.skillsRequired.includes(s)) return;
    set("skillsRequired", [...form.skillsRequired, s]);
    setSkillInput("");
  };
  const removeSkill = (s: string) =>
    set("skillsRequired", form.skillsRequired.filter((x) => x !== s));

  const next = () => {
    if (!stepValid) {
      setError("Please complete the required fields before continuing.");
      return;
    }
    setError("");
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const back = () => {
    setError("");
    setStep((s) => Math.max(0, s - 1));
  };

  const submit = async () => {
    if (!token) return;
    setSaving(true);
    setError("");
    try {
      const res = await apiRequest<{ project: { id: string } }>(
        API_ENDPOINTS.projects.createProject,
        {
          method: "POST",
          token,
          body: {
            title: form.title.trim(),
            description: form.description.trim(),
            type: form.type,
            location: form.location.trim() || undefined,
            budget: form.budget ? Number(form.budget) : undefined,
            startDate: form.startDate || undefined,
            endDate: form.endDate || undefined,
            skillsRequired: form.skillsRequired,
            remote: form.remote,
            status: "draft",
          },
        }
      );
      router.push(`/dashboard/employer/projects?new=${res.project.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="h-10 w-64 animate-pulse rounded bg-gray-200" />
        <div className="h-72 w-full animate-pulse rounded-2xl bg-gray-200" />
      </div>
    );
  }
  if (denied) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="p-8 text-center text-gray-500">
          Only employers can post opportunities.
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-7">
      <FadeUp>
        <p className="label-mono">EMPLOYER</p>
        <h1 className="display mt-2 text-3xl sm:text-4xl">Post an opportunity</h1>
        <p className="mt-2 text-gray-600">
          A few steps to put your role in front of Cambodia&apos;s verified talent.
        </p>
      </FadeUp>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                  done && "border-primary bg-primary text-white",
                  active && "border-primary/40 bg-primary/10 text-primary",
                  !done && !active && "border-gray-200 text-gray-400"
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-sm font-medium",
                  active ? "text-gray-900" : "text-gray-400"
                )}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className="ml-1 hidden h-px flex-1 bg-gray-200 sm:block" />
              )}
            </div>
          );
        })}
      </div>

      <Card className="relative overflow-hidden p-6 sm:p-8">
        <div className="bg-grain pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay" />

        {/* STEP 0 — Role */}
        {step === 0 && (
          <Stagger className="space-y-5">
            <StaggerItem as="div">
              <div>
                <Label htmlFor="title">Opportunity title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="e.g. Frontend Developer Intern"
                />
                <p className="mt-1 text-xs text-gray-400">At least 5 characters.</p>
              </div>
            </StaggerItem>
            <StaggerItem as="div">
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  className="min-h-[140px]"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Describe the role, responsibilities, and what you're looking for…"
                />
                <p className="mt-1 text-xs text-gray-400">
                  {form.description.trim().length}/20 min.
                </p>
              </div>
            </StaggerItem>
          </Stagger>
        )}

        {/* STEP 1 — Type & Skills */}
        {step === 1 && (
          <Stagger className="space-y-5">
            <StaggerItem as="div">
              <Label>Opportunity type</Label>
              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {TYPES.map((t) => {
                  const active = form.type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => set("type", t)}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all",
                        active
                          ? "border-primary/40 bg-primary/5 shadow-soft"
                          : "border-gray-200 hover:border-primary/30"
                      )}
                    >
                      <span className="text-lg">{TYPE_ICON[t]}</span>
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          active ? "text-primary" : "text-gray-600"
                        )}
                      >
                        {TYPE_LABELS[t]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </StaggerItem>

            <StaggerItem as="div">
              <Label htmlFor="skills">Skills required</Label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {form.skillsRequired.map((s) => (
                  <span
                    key={s}
                    className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => removeSkill(s)}
                      className="text-primary/60 hover:text-primary"
                      aria-label={`Remove ${s}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <Input
                id="skills"
                className="mt-2"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addSkill(skillInput);
                  }
                }}
                placeholder="Type a skill and press Enter"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SUGGESTED_SKILLS.filter((s) => !form.skillsRequired.includes(s)).map(
                  (s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addSkill(s)}
                      className="rounded-full border border-gray-200 px-2.5 py-0.5 text-xs text-gray-500 transition-colors hover:border-primary/30 hover:text-primary"
                    >
                      + {s}
                    </button>
                  )
                )}
              </div>
              <p className="mt-1 text-xs text-gray-400">At least 1 skill.</p>
            </StaggerItem>
          </Stagger>
        )}

        {/* STEP 2 — Logistics */}
        {step === 2 && (
          <Stagger className="space-y-5">
            <StaggerItem as="div">
              <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Remote role</p>
                    <p className="text-xs text-gray-500">
                      Candidates can work from anywhere.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => set("remote", !form.remote)}
                  className={cn(
                    "relative h-6 w-11 rounded-full transition-colors",
                    form.remote ? "bg-primary" : "bg-gray-300"
                  )}
                  aria-pressed={form.remote}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                      form.remote ? "translate-x-[22px]" : "translate-x-0.5"
                    )}
                  />
                </button>
              </div>
            </StaggerItem>

            <StaggerItem as="div" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder="Phnom Penh"
                />
              </div>
              <div>
                <Label htmlFor="budget">Budget ($)</Label>
                <Input
                  id="budget"
                  type="number"
                  value={form.budget}
                  onChange={(e) => set("budget", e.target.value)}
                  placeholder="500"
                />
              </div>
              <div>
                <Label htmlFor="startDate">Start date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => set("startDate", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => set("endDate", e.target.value)}
                />
              </div>
            </StaggerItem>

            <StaggerItem as="div" className="rounded-xl bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
                <div className="text-sm text-gray-600">
                  <p className="font-medium text-gray-900">Ready to publish</p>
                  <p className="mt-0.5">
                    <span className="text-primary">{form.title || "Untitled"}</span> ·{" "}
                    {TYPE_LABELS[form.type]} ·{" "}
                    {form.skillsRequired.length} skill
                    {form.skillsRequired.length === 1 ? "" : "s"}
                    {form.remote ? " · Remote" : ""}
                  </p>
                </div>
              </div>
            </StaggerItem>
          </Stagger>
        )}

        {error && (
          <div className="mt-5 p-3 border border-red-200 bg-red-50 rounded-md text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Controls */}
        <div className="mt-7 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={step === 0 ? () => router.push("/dashboard/employer/projects") : back}
          >
            <ArrowLeft className="h-4 w-4" /> {step === 0 ? "Cancel" : "Back"}
          </Button>

          {step < STEPS.length - 1 ? (
            <Magnetic>
              <Button type="button" onClick={next} disabled={!stepValid}>
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </Magnetic>
          ) : (
            <Magnetic>
              <Button type="button" onClick={submit} disabled={saving}>
                {saving ? "Publishing…" : "Publish opportunity"}
              </Button>
            </Magnetic>
          )}
        </div>
      </Card>

      <p className="flex items-center justify-center gap-2 text-xs text-gray-400">
        <Briefcase className="h-3.5 w-3.5" /> Your post goes live instantly to matched
        students.
      </p>
    </div>
  );
}
