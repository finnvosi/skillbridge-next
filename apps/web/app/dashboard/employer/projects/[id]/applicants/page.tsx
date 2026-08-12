'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiRequest, API_ENDPOINTS, getToken, ApiError } from '@/lib/api-client';
import { Application, ApplicationStatus, STATUS_LABELS } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ApplicantCard } from "@/components/marketplace/applicant-card";

export default function ApplicantsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const token = getToken();

  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    if (!token) return;
    try {
      const data = await apiRequest<{ applications: Application[] }>(
        API_ENDPOINTS.projects.detail(id) + '/applications',
        { method: 'GET', token }
      );
      setApps(data.applications ?? []);
    } catch {
      setError('Failed to load applicants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  const changeStatus = async (applicationId: string, status: 'accepted' | 'rejected') => {
    if (!token) return;
    setBusy(applicationId);
    setError('');
    try {
      await apiRequest(
        `${API_ENDPOINTS.projects.detail(id)}/applications/${applicationId}`,
        { method: 'PUT', token, body: { status } }
      );
      setApps((prev) =>
        prev.map((a) => (a.id === applicationId ? { ...a, status } : a))
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Update failed');
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/employer/projects"
          className="text-sm font-medium text-primary hover:text-primary-hover"
        >
          ← Back to opportunities
        </Link>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-gray-900">
          Applicants
        </h1>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

      {apps.length === 0 ? (
        <EmptyState
          title="Applicants will appear here once students apply"
          description="Share your opportunity to start receiving applications."
        />
      ) : (
        <div className="space-y-4">
          {apps.map((a) => (
            <ApplicantCard
              key={a.id}
              app={a}
              busy={busy === a.id}
              onStatusChange={(applicationId, status) =>
                changeStatus(applicationId, status)
              }
              onReview={() => router.push(`/dashboard/student/projects/${a.projectId}`)}
              onMessage={() => router.push(`/dashboard/employer/projects/${id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
