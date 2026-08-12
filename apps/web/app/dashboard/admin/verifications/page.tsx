"use client";

import { useEffect, useState } from "react";
import { apiRequest, API_ENDPOINTS, getToken } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { FadeUp, Stagger, StaggerItem, Tilt } from "@/components/motion";
import { Magnetic } from "@/components/motion/primitives2";
import { ShieldCheck, User, Building2, GraduationCap } from "lucide-react";

type VerifiableType = "student" | "employer";

interface VerifiableItem {
  id: string;
  type: VerifiableType;
  name: string;
  email: string;
  major?: string | null;
  industry?: string | null;
  verified?: boolean;
  createdAt: string;
  university?: string | null;
}

interface VerificationResponse {
  students: VerifiableItem[];
  employers: VerifiableItem[];
}

interface VerifyResponse {
  message: string;
}

export default function AdminVerificationsPage() {
  const [loading, setLoading] = useState(true);
  const [verifications, setVerifications] = useState<VerificationResponse>({
    students: [],
    employers: [],
  });
  const [verifying, setVerifying] = useState<string | null>(null);
  const token = getToken();

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const data = await apiRequest<VerificationResponse>(
          API_ENDPOINTS.admin.verifications,
          { method: "GET", token }
        );
        setVerifications(data);
      } catch {
        // empty
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleVerify = async (type: VerifiableType, id: string) => {
    setVerifying(id);
    try {
      await apiRequest<VerifyResponse>(API_ENDPOINTS.admin.verifyUser(type, id), {
        method: "PUT",
        token,
      });
      // Update local state
      setVerifications((prev) => {
        if (type === "student") {
          return {
            ...prev,
            students: prev.students.filter((s) => s.id !== id).map((s) =>
              s.id === id
                ? { ...s, university: "Verified Student" }
                : s
            ),
          };
        } else {
          return {
            ...prev,
            employers: prev.employers.filter((e) => e.id !== id).map((e) =>
              e.id === id ? { ...e, verified: true } : e
            ),
          };
        }
      });
    } finally {
      setVerifying(null);
    }
  };

  const needsStudentVerification = verifications.students.filter(
    (s) => !s.university
  );
  const needsEmployerVerification = verifications.employers.filter(
    (e) => !e.verified
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Verify Identities"
        subtitle="Review and approve student and employer verifications."
      />

      {/* Student verifications */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap className="h-5 w-5 text-purple-600" />
          <h2 className="font-display text-2xl font-semibold text-gray-900">
            Student Verifications ({needsStudentVerification.length})
          </h2>
        </div>

        {needsStudentVerification.length === 0 ? (
          <Card className="p-6 text-center">
            <ShieldCheck className="h-8 w-8 text-teal-600 mx-auto mb-2" />
            <p className="text-gray-600">All students have completed their profiles.</p>
          </Card>
        ) : (
          <Stagger className="space-y-3">
            {needsStudentVerification.map((s) => (
              <StaggerItem key={s.id} as="div">
                <Tilt intensity={3}>
                  <Card className="flex items-center justify-between gap-4 p-5 shadow-soft transition-all duration-300 hover:shadow-soft-lg">
                    <div>
                      <p className="font-medium text-gray-900">{s.name}</p>
                      <p className="text-sm text-gray-500">{s.email}</p>
                      {s.major && <p className="text-xs text-gray-400">{s.major}</p>}
                    </div>
                    <Magnetic>
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={verifying === s.id}
                        onClick={() => handleVerify("student", s.id)}
                      >
                        {verifying === s.id ? "Verifying…" : "Verify student"}
                      </Button>
                    </Magnetic>
                  </Card>
                </Tilt>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>

      {/* Employer verifications */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-5 w-5 text-purple-600" />
          <h2 className="font-display text-2xl font-semibold text-gray-900">
            Employer Verifications ({needsEmployerVerification.length})
          </h2>
        </div>

        {needsEmployerVerification.length === 0 ? (
          <Card className="p-6 text-center">
            <ShieldCheck className="h-8 w-8 text-teal-600 mx-auto mb-2" />
            <p className="text-gray-600">All employers have been verified.</p>
          </Card>
        ) : (
          <Stagger className="space-y-3">
            {needsEmployerVerification.map((e) => (
              <StaggerItem key={e.id} as="div">
                <Tilt intensity={3}>
                  <Card className="flex items-center justify-between gap-4 p-5 shadow-soft transition-all duration-300 hover:shadow-soft-lg">
                    <div>
                      <p className="font-medium text-gray-900">{e.name}</p>
                      <p className="text-sm text-gray-500">{e.email}</p>
                      {e.industry && <p className="text-xs text-gray-400">{e.industry}</p>}
                    </div>
                    <Magnetic>
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={verifying === e.id}
                        onClick={() => handleVerify("employer", e.id)}
                      >
                        {verifying === e.id ? "Verifying…" : "Verify employer"}
                      </Button>
                    </Magnetic>
                  </Card>
                </Tilt>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>
    </div>
  );
}