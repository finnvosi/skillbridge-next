'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, denied } = useAuthGuard();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-canvas">
        <div className="sticky top-0 z-40 h-16 border-b border-white/70 bg-white/80 backdrop-blur-xl" />
        <div className="flex-1 space-y-4 px-4 py-8 sm:px-6 lg:px-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (denied) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="mt-2 text-gray-600">
            You don&apos;t have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
