"use client";

import { useEffect, useState } from "react";
import { apiRequest, getToken } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { FadeUp, Stagger, StaggerItem, Tilt } from "@/components/motion";
import { Magnetic } from "@/components/motion/primitives2";
import { Search, User, Shield, Briefcase, GraduationCap, Filter } from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string;
  role: "student" | "employer" | "admin";
  createdAt: string;
  avatar?: string | null;
  suspended?: boolean;
}

interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<"all" | "student" | "employer" | "admin">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const token = getToken();

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
          ...(filter !== "all" && { role: filter }),
          ...(search && { search })
        });
        
        const data = await apiRequest<UsersResponse>(
          `/api/v1/users?${params}`,
          { method: "GET", token }
        );
        setUsers(data.users);
      } finally {
        setLoading(false);
      }
    })();
  }, [token, page, filter, search]);

  const getRoleIcon = (role: User["role"]) => {
    switch (role) {
      case "student": return <GraduationCap className="h-4 w-4" />;
      case "employer": return <Briefcase className="h-4 w-4" />;
      case "admin": return <Shield className="h-4 w-4" />;
    }
  };

  const getRoleVariant = (role: User["role"]) => {
    switch (role) {
      case "admin": return "primary";
      case "student": return "secondary";
      case "employer": return "outline";
    }
  };

  const filteredUsers = users.filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="User Management"
        subtitle="View and manage all user accounts across the platform."
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filter === "all" ? "primary" : "outline"}
            onClick={() => setFilter("all")}
          >
            <Filter className="h-4 w-4 mr-2" />
            All ({users.length})
          </Button>
          <Button
            size="sm"
            variant={filter === "student" ? "primary" : "outline"}
            onClick={() => setFilter("student")}
          >
            Student
          </Button>
          <Button
            size="sm"
            variant={filter === "employer" ? "primary" : "outline"}
            onClick={() => setFilter("employer")}
          >
            Employer
          </Button>
          <Button
            size="sm"
            variant={filter === "admin" ? "primary" : "outline"}
            onClick={() => setFilter("admin")}
          >
            Admin
          </Button>
        </div>
      </div>

      {/* Users list */}
      {loading ? (
        <div className="grid gap-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : (
        <Stagger className="space-y-3">
          {filteredUsers.map((user) => (
            <StaggerItem key={user.id} as="div">
              <Tilt intensity={3}>
                <Card className="p-4 shadow-soft transition-all duration-300 hover:shadow-soft-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <User className="h-5 w-5 text-gray-500" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{user.name}</h3>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <p className="text-xs text-gray-400">
                          Joined {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getRoleVariant(user.role)} size="sm">
                        {getRoleIcon(user.role)}
                        <span className="ml-1">{user.role}</span>
                      </Badge>
                      {user.role !== "admin" && (
                        <Magnetic>
                          <Button size="sm" variant="ghost">
                            Change Role
                          </Button>
                        </Magnetic>
                      )}
                    </div>
                  </div>
                </Card>
              </Tilt>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {filteredUsers.length === 0 && !loading && (
        <Card className="p-6 text-center">
          <User className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">No users found matching your filters.</p>
        </Card>
      )}

      {/* Pagination */}
      {users.length > 0 && (
        <div className="flex justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-500 flex items-center">
            Page {page}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= 100}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}