"use client";

import { useState, useEffect } from "react";
import { userStorage } from "@/lib/utils/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientLeaderboard } from "./ClientLeaderboard";
import { PaperChitScene } from "./PaperChitScene";

interface WheelProps {
  userName: string;
  userId: string;
  onCardSelected: (rank: number) => void;
  onError: (error: string) => void;
}

export function Wheel({ userName, userId, onCardSelected, onError }: WheelProps) {
  const [disabled, setDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRank, setSelectedRank] = useState<number | null>(null);

  // Get number of users to determine number of chits
  const [totalUsers, setTotalUsers] = useState(12); // Default, will be updated

  useEffect(() => {
    // Fetch total user count for number of chits
    const fetchUserCount = async () => {
      try {
        const { getDocs } = await import("firebase/firestore");
        const { usersCollection } = await import("@/firebase");
        const snapshot = await getDocs(usersCollection);
        setTotalUsers(snapshot.size || 12);
      } catch (err) {
        console.error("Error fetching user count:", err);
      }
    };
    fetchUserCount();
  }, []);

  const handleChitClick = async () => {
    if (disabled || loading) return;

    setDisabled(true);
    setLoading(true);

    try {
      // Trigger the transaction to get the rank
      const { selectCard } = await import("@/lib/utils/card-selection");

      // Wait for minimum animation duration (2 seconds) for visual appeal
      const minAnimationDuration = 2000;
      const [rank] = await Promise.all([
        selectCard(userId),
        new Promise(resolve => setTimeout(resolve, minAnimationDuration))
      ]);

      setSelectedRank(rank);

      // Wait for unfold animation to complete, then notify parent
      await new Promise(resolve => setTimeout(resolve, 2000));
      onCardSelected(rank);
    } catch (err) {
      console.error("Card selection error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to select card. Please try again.";
      onError(errorMessage);
      setDisabled(false);
      setLoading(false);
    }
  };

  const handleSwitchUser = () => {
    userStorage.clearCode();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Welcome, {userName}!</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {selectedRank ? "Your rank has been assigned!" : "Click on any paper chit to reveal your rank"}
            </p>
          </div>
          <Button variant="outline" onClick={handleSwitchUser}>
            Switch User
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 3D Paper Chit Scene */}
          <div className="flex flex-col items-center justify-center space-y-8">
            <PaperChitScene
              numberOfChits={Math.min(totalUsers, 20)} // Cap at 20 for performance
              onChitClick={handleChitClick}
              isLoading={loading}
              selectedRank={selectedRank}
            />

            {loading && (
              <p className="text-sm text-gray-500 animate-pulse">
                {selectedRank
                  ? "Unfolding your chit..."
                  : "Assigning your rank..."}
              </p>
            )}
          </div>

          {/* Leaderboard Section */}
          <div className="lg:col-span-1">
            <ClientLeaderboard />
          </div>
        </div>
      </div>
    </div>
  );
}
