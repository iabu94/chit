"use client";

import { useState, useEffect } from "react";
import { getDocs, updateDoc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { usersCollection, raffleConfigDoc, db } from "@/firebase";
import { shuffleArray } from "@/lib/utils/shuffle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RaffleConfig } from "@/lib/types";

export function RaffleControl() {
  const [status, setStatus] = useState<RaffleConfig["status"] | null>(null);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch current status and user count
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const configDoc = await getDoc(raffleConfigDoc);
        if (configDoc.exists()) {
          const config = configDoc.data() as RaffleConfig;
          setStatus(config.status);
        }

        // Get user count
        const usersSnapshot = await getDocs(usersCollection);
        setUserCount(usersSnapshot.size);
      } catch (err) {
        console.error("Error fetching status:", err);
      }
    };

    fetchStatus();
    // Refresh every 2 seconds to get latest status
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleStartRaffle = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // Check current status
      const configDoc = await getDoc(raffleConfigDoc);
      if (!configDoc.exists()) {
        setError("Raffle configuration not found. Please initialize the system first.");
        setLoading(false);
        return;
      }

      const config = configDoc.data() as RaffleConfig;
      if (config.status === "active") {
        setError("Raffle is already active. Please wait for it to complete.");
        setLoading(false);
        return;
      }

      // Get all users
      const usersSnapshot = await getDocs(usersCollection);
      const userCount = usersSnapshot.size;

      if (userCount === 0) {
        setError("No users added yet. Please add users before starting the raffle.");
        setLoading(false);
        return;
      }

      // Generate shuffled ranks [1, 2, ..., N]
      const ranks = Array.from({ length: userCount }, (_, i) => i + 1);
      const shuffledRanks = shuffleArray(ranks);

      // Update raffle config
      await updateDoc(raffleConfigDoc, {
        status: "active",
        available_ranks: shuffledRanks,
        updated_at: serverTimestamp(),
      });

      setSuccess("Raffle started successfully! Users can now select cards.");
      setStatus("active");
    } catch (err) {
      console.error("Error starting raffle:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to start raffle. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetRaffle = async () => {
    if (!confirm("Are you sure you want to reset the raffle? This will clear all user ranks and reset the raffle to waiting state.")) {
      return;
    }

    setError("");
    setSuccess("");
    setResetting(true);

    try {
      // 1. Reset raffle_config
      await updateDoc(raffleConfigDoc, {
        status: "waiting",
        available_ranks: [],
        updated_at: serverTimestamp(),
      });

      // 2. Reset all users (rank and has_participated)
      const usersSnapshot = await getDocs(usersCollection);
      
      // Use batch writes for efficiency (max 500 operations per batch)
      const batch = writeBatch(db);
      let operationCount = 0;

      usersSnapshot.forEach((doc) => {
        if (operationCount < 500) {
          batch.update(doc.ref, {
            rank: null,
            has_participated: false,
            updated_at: serverTimestamp(),
          });
          operationCount++;
        }
      });

      if (operationCount > 0) {
        await batch.commit();
      }

      // If more than 500 users, handle remaining in additional batches
      // (For MVP, assuming < 500 users, but this handles edge cases)
      if (usersSnapshot.size > 500) {
        const remainingDocs = usersSnapshot.docs.slice(500);
        for (const doc of remainingDocs) {
          await updateDoc(doc.ref, {
            rank: null,
            has_participated: false,
            updated_at: serverTimestamp(),
          });
        }
      }

      setSuccess("Raffle reset successfully! All user ranks have been cleared.");
      setStatus("waiting");
    } catch (err) {
      console.error("Error resetting raffle:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to reset raffle. Please try again."
      );
    } finally {
      setResetting(false);
    }
  };

  const isDisabled = loading || status === "active" || userCount === 0;
  const canReset = status === "active" || status === "completed";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Raffle Control</CardTitle>
        <CardDescription>Start and manage the raffle</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status:</span>
            <span
              className={`text-sm font-semibold ${
                status === "active"
                  ? "text-green-600 dark:text-green-400"
                  : status === "completed"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {status ? status.toUpperCase() : "Loading..."}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Users:</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {userCount}
            </span>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
        )}
        {success && (
          <div className="text-sm text-green-600 dark:text-green-400">
            {success}
          </div>
        )}

        <div className="space-y-2">
          <Button
            onClick={handleStartRaffle}
            disabled={isDisabled}
            className="w-full"
          >
            {loading
              ? "Starting..."
              : status === "active"
              ? "Raffle Active"
              : userCount === 0
              ? "No Users"
              : "Start Raffle"}
          </Button>

          {canReset && (
            <Button
              onClick={handleResetRaffle}
              disabled={resetting}
              variant="outline"
              className="w-full"
            >
              {resetting ? "Resetting..." : "Reset Raffle"}
            </Button>
          )}
        </div>

        {userCount === 0 && (
          <p className="text-xs text-gray-500 text-center">
            Add at least one user to start the raffle
          </p>
        )}
      </CardContent>
    </Card>
  );
}
