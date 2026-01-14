"use client";

import { useState } from "react";
import { getDocs, query, where } from "firebase/firestore";
import { usersCollection } from "@/firebase";
import { userStorage } from "@/lib/utils/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { User } from "@/lib/types";

interface CodeEntryProps {
  onCodeValidated: (user: User) => void;
}

export function CodeEntry({ onCodeValidated }: CodeEntryProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validate code against Firestore
      const codeQuery = query(
        usersCollection,
        where("code", "==", code.trim().toUpperCase())
      );
      const snapshot = await getDocs(codeQuery);

      if (snapshot.empty) {
        setError("Invalid code. Please check and try again.");
        setLoading(false);
        return;
      }

      // Get user data
      const userDoc = snapshot.docs[0];
      const userData = {
        id: userDoc.id,
        ...userDoc.data(),
      } as User;

      // Store code in LocalStorage
      userStorage.setCode(userData.code);

      // Notify parent component
      onCodeValidated(userData);
    } catch (err) {
      console.error("Code validation error:", err);
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Enter Your Code</CardTitle>
          <CardDescription>
            Enter your unique code to join the raffle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="code" className="text-sm font-medium">
                Access Code
              </label>
              <Input
                id="code"
                type="text"
                placeholder="Enter your code (e.g., A1B2)"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={loading}
                required
                autoFocus
                className="text-center text-lg font-mono tracking-wider"
                maxLength={4}
              />
            </div>
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Validating..." : "Join Raffle"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
