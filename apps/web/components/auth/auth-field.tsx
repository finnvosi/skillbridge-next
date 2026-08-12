"use client";

import { useState } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface AuthFieldProps {
  id: string;
  label: string;
  type?: "text" | "email" | "password";
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  /** Show a live password-strength meter (only for type="password"). */
  showStrength?: boolean;
}

// Lightweight strength signal — drives the 4-segment meter.
function scorePassword(pw: string): { score: number; label: string } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (pw.length >= 12) s++; // bonus length
  const label = ["", "Weak", "Fair", "Good", "Strong", "Excellent"][Math.min(s, 5)];
  return { score: Math.min(s, 4), label };
}

export function AuthField({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  error,
  hint,
  showStrength,
}: AuthFieldProps) {
  const [reveal, setReveal] = useState(false);
  const isPw = type === "password";
  const inputType = isPw && reveal ? "text" : type;
  const { score, label: strengthLabel } = showStrength && value ? scorePassword(value) : { score: 0, label: "" };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="ml-0.5 text-primary">*</span>}
        </label>
        {hint && !error && <span className="text-xs text-gray-400">{hint}</span>}
      </div>

      <div className="relative">
        <Input
          id={id}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={!!error}
          className={cn(
            "h-14 rounded-xl border-gray-200 bg-white/70 px-3.5 text-[15px] text-gray-900",
            "transition-colors placeholder:text-gray-400",
            "focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/15",
            isPw && "pr-11",
            error && "border-red-300 focus-visible:border-red-400 focus-visible:ring-red-200"
          )}
        />

        {isPw && (
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            aria-label={reveal ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>

      {showStrength && value && (
        <div className="flex items-center gap-2 pt-0.5">
          <div className="flex flex-1 gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  i < score
                    ? score <= 1
                      ? "bg-red-400"
                      : score <= 2
                        ? "bg-amber-400"
                        : score <= 3
                          ? "bg-primary-light"
                          : "bg-primary"
                    : "bg-gray-200"
                )}
              />
            ))}
          </div>
          <span
            className={cn(
              "w-16 text-right text-[11px] font-medium uppercase tracking-wide",
              score <= 1 ? "text-red-500" : score <= 2 ? "text-amber-500" : "text-primary"
            )}
          >
            {strengthLabel}
          </span>
        </div>
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-red-600">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}
