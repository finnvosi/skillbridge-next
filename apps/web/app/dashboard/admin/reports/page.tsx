"use client";

import { useEffect, useState } from "react";
import { apiRequest, getToken } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { FadeUp, Stagger, StaggerItem, Tilt } from "@/components/motion";
import { Magnetic } from "@/components/motion/primitives2";
import {
  AlertCircle,
  User,
  Globe2,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

interface Report {
  id: string;
  type: "student" | "employer" | "project" | "application";
  targetId: string;
  targetName: string;
  reporterType: "student" | "employer" | "admin";
  reason: string;
  description: string;
  status: "pending" | "reviewed" | "resolved" | "dismissed";
  createdAt: string;
}

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<"pending" | "reviewed" | "all">("pending");
  const token = getToken();

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const data = await apiRequest<{ reports: Report[] }>(
          "/admin/reports",
          { method: "GET", token }
        );
        setReports(data.reports || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const filteredReports = reports.filter((r) =>
    filter === "all" ? true : r.status === filter
  );

  const getIcon = (type: Report["type"]) => {
    switch (type) {
      case "student": return <User className="h-4 w-4" />;
      case "employer": return <Globe2 className="h-4 w-4" />;
      case "project": return <AlertCircle className="h-4 w-4" />;
      case "application": return <Shield className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: Report["status"]) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4 text-amber-500" />;
      case "reviewed": return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case "resolved": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "dismissed": return <XCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Report moderation"
        subtitle="Review and resolve user reports across the platform."
      />

      {/* Filter tabs */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={filter === "pending" ? "primary" : "outline"}
          onClick={() => setFilter("pending")}
        >
          Pending ({reports.filter(r => r.status === "pending").length})
        </Button>
        <Button
          size="sm"
          variant={filter === "reviewed" ? "primary" : "outline"}
          onClick={() => setFilter("reviewed")}
        >
          Reviewed ({reports.filter(r => r.status === "reviewed").length})
        </Button>
        <Button
          size="sm"
          variant={filter === "all" ? "primary" : "outline"}
          onClick={() => setFilter("all")}
        >
          All ({reports.length})
        </Button>
      </div>

      {/* Reports list */}
      {loading ? (
        <div className="grid gap-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : filteredReports.length === 0 ? (
        <Card className="p-6 text-center">
          <Shield className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">
            No {filter === "all" ? "reports" : filter + " reports"}found.
          </p>
        </Card>
      ) : (
        <Stagger className="space-y-3">
          {filteredReports.map((report) => (
            <StaggerItem key={report.id} as="div">
              <Tilt intensity={3}>
                <Card className="p-5 shadow-soft transition-all duration-300 hover:shadow-soft-lg">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getIcon(report.type)}
                        <h3 className="font-medium text-gray-900">
                          Report {report.type} #{report.targetId.slice(0, 8)}...
                        </h3>
                        <Badge variant="secondary" size="sm">
                          {getStatusIcon(report.status)}
                          <span className="ml-1">{report.status}</span>
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-900 mb-1">{report.reason}</p>
                      {report.description && (
                        <p className="text-sm text-gray-600 mb-2">{report.description}</p>
                      )}
                      <p className="text-xs text-gray-400">
                        Reported {report.targetName} on{" "}
                        {new Date(report.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {report.status === "pending" && (
                      <div className="flex shrink-0 gap-2">
                        <Magnetic>
                          <Button size="sm" variant="outline">
                            Review
                          </Button>
                        </Magnetic>
                        <Magnetic>
                          <Button size="sm" variant="secondary">
                            Dismiss
                          </Button>
                        </Magnetic>
                      </div>
                    )}
                  </div>
                </Card>
              </Tilt>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}