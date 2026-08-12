"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { apiRequest, ApiError, AuthResponse, API_ENDPOINTS, storeToken } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { AuthField } from "@/components/auth/auth-field";
import { Stagger, StaggerItem } from "@/components/motion";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "employer">("student");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function validate() {
    if (!name.trim()) return "Name is required.";
    if (!email || !/\S+@\S+\.\S+/.test(email)) return "Enter a valid email.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password))
      return "Add an uppercase letter, a number, and a symbol.";
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest<AuthResponse>(API_ENDPOINTS.auth.register, {
        method: "POST",
        body: { email, password, name, role },
      });
      storeToken(data.token, data.refreshToken);

      const roleRedirects: Record<string, string> = {
        student: "/dashboard/student",
        employer: "/dashboard/employer",
        admin: "/dashboard/admin",
      };
      router.push(roleRedirects[data.user.role] || "/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-9">
      <Stagger className="space-y-6 sm:space-y-8">
        <StaggerItem>
          <AuthField
            id="name"
            label="Full Name"
            type="text"
            value={name}
            onChange={setName}
            placeholder="Sopanha Vosi"
            autoComplete="name"
            required
            error={error}
          />
        </StaggerItem>

        <StaggerItem>
          <AuthField
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@skillbridge.co"
            autoComplete="email"
            required
            error={error}
          />
        </StaggerItem>

        <StaggerItem>
          <AuthField
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            autoComplete="new-password"
            required
            showStrength
            error={error}
          />
        </StaggerItem>

        <StaggerItem>
          <fieldset className="flex gap-3" role="radiogroup">
            <legend className="mb-1.5 block text-sm font-medium text-gray-700">
              I am a…
            </legend>
            {(["student", "employer"] as const).map((r) => {
              const active = role === r;
              return (
                <label
                  key={r}
                  className={cn(
                    "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
                    active
                      ? "border-primary/40 bg-primary/5 text-primary"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  )}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    checked={active}
                    onChange={() => setRole(r)}
                    className="sr-only"
                  />
                  {r === "student" ? "Student" : "Employer"}
                </label>
              );
            })}
          </fieldset>
        </StaggerItem>

        <StaggerItem>
          <div className="pt-1 text-xs text-gray-500">
            Min 8 chars · 1 uppercase · 1 number · 1 symbol
          </div>
        </StaggerItem>

        <StaggerItem>
          <Button
            type="submit"
            disabled={loading}
            variant="primary"
            size="lg"
            className="relative isolate overflow-hidden w-full transition-transform active:scale-[0.985]"
          >
            {loading && (
              <motion.span
                className="absolute inset-0 -z-10"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, ease: EASE }}
              />
            )}
            <motion.span
              key={loading ? "loading" : "idle"}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              {loading ? "Creating account…" : "Sign Up"}
            </motion.span>
          </Button>
        </StaggerItem>

        <StaggerItem>
          <div className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <a
              href="/auth/login"
              className="inline font-medium text-gray-900 underline transition-colors hover:text-primary"
            >
              Sign in
            </a>
          </div>
        </StaggerItem>
      </Stagger>
    </form>
  );
}
