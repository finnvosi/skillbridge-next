"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Compass,
  ClipboardList,
  User,
  Briefcase,
  Users,
  Building2,
  ShieldCheck,
  ListChecks,
  FileCheck2,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import { clearToken } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { ApiUser } from "@/lib/api-client";
import { Footer } from "@/components/layout/footer";
import { AnimatePresence, motion } from "framer-motion";

interface NavItem {
  label: string;
  href: string;
  roles: string[];
  icon: React.ComponentType<{ className?: string }>;
  section: "main" | "student" | "employer" | "admin";
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", roles: ["student", "employer", "admin"], icon: LayoutDashboard, section: "main" },
  { label: "Discover", href: "/dashboard/student/discover", roles: ["student"], icon: Compass, section: "student" },
  { label: "My Applications", href: "/dashboard/student/applications", roles: ["student"], icon: ClipboardList, section: "student" },
  { label: "Profile", href: "/dashboard/student/profile", roles: ["student"], icon: User, section: "student" },
  { label: "Opportunities", href: "/dashboard/employer", roles: ["employer"], icon: Briefcase, section: "employer" },
  { label: "Applicants", href: "/dashboard/employer/applicants", roles: ["employer"], icon: Users, section: "employer" },
  { label: "Company", href: "/dashboard/employer/company", roles: ["employer"], icon: Building2, section: "employer" },
  { label: "Overview", href: "/dashboard/admin", roles: ["admin"], icon: ShieldCheck, section: "admin" },
  { label: "Users", href: "/dashboard/admin/users", roles: ["admin"], icon: Users, section: "admin" },
  { label: "Opportunities", href: "/dashboard/admin/opportunities", roles: ["admin"], icon: ListChecks, section: "admin" },
  { label: "Applications", href: "/dashboard/admin/applications", roles: ["admin"], icon: FileCheck2, section: "admin" },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function DashboardShell({
  user,
  children,
}: {
  user: ApiUser | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const items = navItems.filter((i) => !user || i.roles.includes(user.role));
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const logout = () => {
    clearToken();
    router.push("/auth/login");
  };

  // Close profile dropdown on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const RoleSectionLabel: Record<string, string> = {
    student: "Student",
    employer: "Employer",
    admin: "Admin",
  };

  return (
    <div className="flex min-h-0 flex-col bg-canvas">
      {/* ============ TOP MENU BAR ============ */}
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/80 backdrop-blur-xl">
        <div className="bg-grain pointer-events-none absolute inset-0 opacity-[0.4] mix-blend-overlay" />
        <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Brand */}
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="SkillBridge home">
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-primary shadow-[0_6px_18px_-6px_rgba(60,9,108,0.6)]">
              <Image src="/skillbridge-logo.svg" alt="" width={20} height={20} className="h-5 w-5 invert" priority />
            </span>
            <span className="font-display text-lg font-extrabold tracking-tight text-gray-900">
              Skill<span className="text-primary">Bridge</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: profile + mobile toggle */}
          <div className="flex shrink-0 items-center gap-2">
            {user && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex items-center gap-2 rounded-full border border-white/70 bg-white/60 py-1 pl-1 pr-2.5 transition-colors hover:bg-white"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-light text-xs font-semibold text-white">
                    {initials(user.name || user.email || "U")}
                  </span>
                  <span className="hidden text-left sm:block">
                    <span className="block text-xs font-semibold leading-tight text-gray-900">
                      {user.name}
                    </span>
                    <span className="block text-[10px] uppercase tracking-wide leading-tight text-gray-500">
                      {user.role}
                    </span>
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                </button>

                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ y: -8, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -8, opacity: 0 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl border border-card-border bg-white p-1.5 shadow-soft-lg"
                    >
                      <div className="border-b border-gray-100 px-3 py-2.5">
                        <p className="truncate text-sm font-semibold text-gray-900">{user.name}</p>
                        <p className="truncate text-xs text-gray-500">{user.email}</p>
                      </div>
                      <Link
                        href="/dashboard/student/profile"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-primary/5 hover:text-primary"
                      >
                        <User className="h-4 w-4" />
                        Profile
                      </Link>
                      <button
                        onClick={logout}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-red-50 hover:text-[#FF0000]"
                      >
                        <LogOut className="h-4 w-4" />
                        Log out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/60 bg-white/60 text-gray-700 transition-colors hover:bg-white hover:text-primary md:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile sheet */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ y: -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="relative mx-3 mb-3 overflow-hidden rounded-2xl border border-white/60 bg-white/95 p-2 shadow-soft-lg backdrop-blur-xl md:hidden"
            >
              {(["student", "employer", "admin"] as const).map((sec) => {
                const secItems = items.filter((i) => i.section === sec);
                if (secItems.length === 0) return null;
                return (
                  <div key={sec} className="py-1">
                    <p className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {RoleSectionLabel[sec]}
                    </p>
                    {secItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-3 py-2.5 font-mono text-xs font-medium uppercase tracking-[0.12em] transition-colors",
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-gray-600 hover:bg-primary/5 hover:text-primary"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
              <button
                onClick={() => {
                  setMobileOpen(false);
                  logout();
                }}
                className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-mono text-xs font-medium uppercase tracking-[0.12em] text-gray-600 transition-colors hover:bg-red-50 hover:text-[#FF0000]"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ============ CONTENT ============ */}
      <main className="relative overflow-x-clip">
        {/* titanium canvas grain so the dashboard belongs to the same world as auth/landing */}
        <div className="bg-grain pointer-events-none absolute inset-0 opacity-[0.45] mix-blend-multiply" />
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          {children}
        </div>
      </main>

      {/* ============ FOOTER ============ */}
      <Footer />
    </div>
  );
}
