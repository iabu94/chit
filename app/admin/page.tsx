"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDoc } from "firebase/firestore";
import { raffleConfigDoc } from "@/firebase";
import { adminStorage } from "@/lib/utils/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { initializeRaffleConfig } from "@/lib/utils/init-raffle-config";

export default function AdminLoginPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (adminStorage.isAuthenticated()) {
      router.push("/admin/dashboard");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validate admin code against Firestore
      const configDoc = await getDoc(raffleConfigDoc);
      
      if (!configDoc.exists()) {
        setError("Raffle configuration not found. Please initialize the system first.");
        setLoading(false);
        return;
      }

      const configData = configDoc.data();
      const adminCode = configData?.admin_code;

      if (!adminCode || adminCode !== code.trim()) {
        setError("Invalid admin code. Please try again.");
        setLoading(false);
        return;
      }

      // Store session in LocalStorage
      adminStorage.setSession();

      // Redirect to dashboard
      router.push("/admin/dashboard");
    } catch (err) {
      console.error("Admin login error:", err);
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
          <CardDescription>
            Enter your admin code to access the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="code" className="text-sm font-medium">
                Admin Code
              </label>
              <Input
                id="code"
                type="password"
                placeholder="Enter admin code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={loading}
                required
                autoFocus
              />
            </div>
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Validating..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
