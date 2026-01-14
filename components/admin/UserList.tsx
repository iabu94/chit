"use client";

import { useEffect, useState } from "react";
import { onSnapshot, query, orderBy } from "firebase/firestore";
import { usersCollection } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { User } from "@/lib/types";

export function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      // Reset after 2 seconds
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  useEffect(() => {
    // Set up real-time listener
    const q = query(usersCollection, orderBy("created_at", "desc"));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const usersList: User[] = [];
        snapshot.forEach((doc) => {
          usersList.push({
            id: doc.id,
            ...doc.data(),
          } as User);
        });
        setUsers(usersList);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching users:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>List of all registered users</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Loading users...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users ({users.length})</CardTitle>
        <CardDescription>List of all registered users</CardDescription>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-sm text-gray-500">No users added yet.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-md"
              >
                <div className="flex-1">
                  <p className="font-medium">{user.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-gray-500">Code: {user.code}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyCode(user.code)}
                      className="h-6 px-2 text-xs"
                    >
                      {copiedCode === user.code ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {user.rank !== null ? `Rank: ${user.rank}` : "Waiting"}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
