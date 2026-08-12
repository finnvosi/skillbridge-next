'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest, API_ENDPOINTS, getToken } from '@/lib/api-client';
import { Project, TYPE_LABELS } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Tilt } from '@/components/motion';
import { Magnetic } from '@/components/motion/primitives2';

interface ProjectWithCount extends Project {
  _count?: { applications: number };
}

export default function EmployerProjectsPage() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectWithCount[]>([]);
  const token = getToken();

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const data = await apiRequest<{ projects: ProjectWithCount[] }>(
          API_ENDPOINTS.projects.employerProjects,
          { method: 'GET', token }
        );
        setProjects(data.projects ?? []);
      } catch {
        // empty
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold text-gray-900">
          Manage opportunities
        </h1>
        <Magnetic>
          <Button asChild>
            <Link href="/dashboard/employer/projects/new">Post opportunity</Link>
          </Button>
        </Magnetic>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="No opportunities posted yet"
          description="Create your first opportunity to attract candidates."
          actionLabel="Post opportunity"
          onAction={() => (window.location.href = '/dashboard/employer/projects/new')}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Tilt key={p.id} intensity={4}>
              <Card className="flex h-full flex-col">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-gray-900">{p.title}</h3>
                  <Badge variant="primary">{TYPE_LABELS[p.type]}</Badge>
                </div>
                <p className="mt-1 text-sm text-gray-500">{p.location || 'Remote'}</p>
                <p className="mt-3 text-sm text-gray-600">
                  {p._count?.applications ?? 0} applicants
                </p>
                <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                  <Link href={`/dashboard/employer/projects/${p.id}/applicants`}>
                    View applicants
                  </Link>
                </Button>
              </Card>
            </Tilt>
          ))}
        </div>
      )}
    </div>
  );
}
