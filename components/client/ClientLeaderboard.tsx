"use client";

import { useEffect, useState } from "react";
import { onSnapshot, query } from "firebase/firestore";
import { usersCollection } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { User } from "@/lib/types";

export function ClientLeaderboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up real-time listener
    const q = query(usersCollection);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const usersWithRank: User[] = [];
        const usersWithoutRank: User[] = [];

        snapshot.forEach((doc) => {
          const user = {
            id: doc.id,
            ...doc.data(),
          } as User;

          if (user.rank !== null) {
            usersWithRank.push(user);
          } else {
            usersWithoutRank.push(user);
          }
        });

        // Sort users with rank by rank (ascending)
        usersWithRank.sort((a, b) => (a.rank || 0) - (b.rank || 0));
        // Sort users without rank by name
        usersWithoutRank.sort((a, b) => a.name.localeCompare(b.name));

        // Combine: users with rank first, then users without rank
        setUsers([...usersWithRank, ...usersWithoutRank]);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching leaderboard:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
        <CardDescription>Real-time raffle results</CardDescription>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-sm text-gray-500">No users yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left p-2 text-sm font-medium">Rank</th>
                  <th className="text-left p-2 text-sm font-medium">Name</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-100 dark:border-gray-900"
                  >
                    <td className="p-2">
                      {user.rank !== null ? (
                        <span className="font-semibold text-lg">
                          #{user.rank}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-2 font-medium">{user.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
