"use client";

import { useState } from "react";
import { addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { usersCollection } from "@/firebase";
import { generateUniqueCode } from "@/lib/utils/code-generator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserData } from "@/lib/types";

export function UserManagement() {
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // Validate input
      const trimmedName = userName.trim();
      if (!trimmedName) {
        setError("Please enter a user name");
        setLoading(false);
        return;
      }

      // Check for duplicate user names
      const duplicateQuery = query(
        usersCollection,
        where("name", "==", trimmedName)
      );
      const duplicateSnapshot = await getDocs(duplicateQuery);
      
      if (!duplicateSnapshot.empty) {
        setError(`User "${trimmedName}" already exists. Please use a different name.`);
        setLoading(false);
        return;
      }

      // Generate unique code
      const code = await generateUniqueCode();

      // Create user document
      const userData: Omit<UserData, "created_at" | "updated_at"> = {
        name: trimmedName,
        code: code,
        rank: null,
        has_participated: false,
      };

      await addDoc(usersCollection, {
        ...userData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      // Success feedback
      setSuccess(`User "${trimmedName}" added successfully with code: ${code}`);
      setUserName(""); // Clear form
    } catch (err) {
      console.error("Error adding user:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to add user. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add User</CardTitle>
        <CardDescription>
          Add a new user to the raffle. A unique code will be generated.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="userName" className="text-sm font-medium">
              User Name
            </label>
            <Input
              id="userName"
              type="text"
              placeholder="Enter user name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="text-sm text-green-600 dark:text-green-400">
              {success}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Adding..." : "Add User"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
