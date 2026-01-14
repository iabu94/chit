"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminStorage } from "@/lib/utils/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserManagement } from "@/components/admin/UserManagement";
import { UserList } from "@/components/admin/UserList";
import { RaffleControl } from "@/components/admin/RaffleControl";
import { Leaderboard } from "@/components/admin/Leaderboard";

export default function AdminDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if admin is authenticated
    if (!adminStorage.isAuthenticated()) {
      router.push("/admin");
    }
  }, [router]);

  const handleLogout = () => {
    adminStorage.clearSession();
    router.push("/admin");
  };

  // Show nothing while checking authentication
  if (!adminStorage.isAuthenticated()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <UserManagement />
          <UserList />
          <RaffleControl />
        </div>

        <div className="mt-6">
          <Leaderboard />
        </div>
      </div>
    </div>
  );
}
