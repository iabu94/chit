"use client";

import { useEffect, useState } from "react";
import { onSnapshot, query, orderBy, deleteDoc, getDoc, doc } from "firebase/firestore";
import { usersCollection, raffleConfigDoc, getUserDoc } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { User, RaffleConfig } from "@/lib/types";

export function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [raffleStatus, setRaffleStatus] = useState<RaffleConfig["status"] | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

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

  const handleDeleteUser = async (userId: string, userName: string) => {
    // Check if raffle is active
    if (raffleStatus === "active") {
      alert("Cannot delete users while raffle is active. Please reset the raffle first.");
      return;
    }

    if (!confirm(`Are you sure you want to delete "${userName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingUserId(userId);

    try {
      const userRef = getUserDoc(userId);
      await deleteDoc(userRef);
    } catch (err) {
      console.error("Error deleting user:", err);
      alert("Failed to delete user. Please try again.");
    } finally {
      setDeletingUserId(null);
    }
  };

  useEffect(() => {
    // Set up real-time listener for users
    const q = query(usersCollection, orderBy("created_at", "desc"));
    
    const unsubscribeUsers = onSnapshot(
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

    // Set up listener for raffle status
    const unsubscribeStatus = onSnapshot(
      raffleConfigDoc,
      (doc) => {
        if (doc.exists()) {
          const config = doc.data() as RaffleConfig;
          setRaffleStatus(config.status);
        }
      },
      (error) => {
        console.error("Error fetching raffle status:", error);
      }
    );

    return () => {
      unsubscribeUsers();
      unsubscribeStatus();
    };
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
                className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
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
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-sm">
                      {user.has_joined ? (
                        <span className="text-green-600 dark:text-green-400 font-medium">✓ Joined</span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">Not Joined</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {user.rank !== null ? `Rank: ${user.rank}` : "Waiting"}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteUser(user.id, user.name)}
                    disabled={raffleStatus === "active" || deletingUserId === user.id}
                    className="h-8 px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                    title={raffleStatus === "active" ? "Cannot delete while raffle is active" : "Delete user"}
                  >
                    {deletingUserId === user.id ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
