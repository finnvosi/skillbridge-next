"use client";

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
} from "lucide-react";
import { clearToken } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { ApiUser } from "@/lib/api-client";

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

export function DashboardShell({
  user,
  children,
}: {
  user: ApiUser | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const items = navItems.filter((i) => !user || i.roles.includes(user.role));

  const logout = () => {
    clearToken();
    router.push("/auth/login");
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Editorial glass sidebar */}
      <aside className="relative hidden w-64 flex-col border-r border-white/70 bg-white/70 backdrop-blur-xl md:flex">
        <div className="bg-grain pointer-events-none absolute inset-0 opacity-[0.35] mix-blend-overlay" />
        <div className="relative flex h-16 items-center border-b border-white/70 px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/skillbridge-logo.svg"
              alt="SkillBridge"
              width={28}
              height={28}
              className="h-7 w-auto"
            />
            <span className="font-display text-lg font-extrabold text-primary">
              SkillBridge
            </span>
          </Link>
        </div>

        <nav className="relative flex-1 space-y-1 px-3 py-4">
          {items.length === 0 && (
            <p className="text-sm text-gray-500">No items</p>
          )}
          {items.map((item, idx) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            // Show section header above first item of each group
            const isFirstInSection = idx === 0 || items[idx - 1]?.section !== item.section;

            return (
              <div key={item.href}>
                {isFirstInSection && item.section !== "main" && (
                  <p className="text-xs font-semibold uppercase text-gray-400 px-3 pt-3 pb-1">
                    {item.section === "student" ? "Student" : item.section === "employer" ? "Employer" : "Admin"}
                  </p>
                )}
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-primary/10 text-primary shadow-soft"
                      : "text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-soft"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-colors",
                      active ? "text-primary" : "text-gray-400 group-hover:text-primary-light"
                    )}
                  />
                  {item.label}
                </Link>
              </div>
            );
          })}
        </nav>

        <div className="relative border-t border-white/70 p-4">
          {user && (
            <div className="mb-3">
              <p className="truncate text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">{user.role}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-white hover:text-gray-900"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-white/70 bg-white/70 px-4 backdrop-blur-xl md:hidden">
          <span className="font-display text-lg font-extrabold text-primary">
            SkillBridge
          </span>
          <button onClick={logout} className="text-sm text-gray-600">
            Log out
          </button>
        </header>

        <main className="relative flex-1 overflow-x-hidden p-4 sm:p-8">
          {/* titanium canvas grain so the dashboard belongs to the same world as auth/landing */}
          <div className="bg-grain pointer-events-none absolute inset-0 opacity-[0.5] mix-blend-multiply" />
          <div className="relative">{children}</div>
        </main>
      </div>
    </div>
  );
}