"use client";

import { useEffect } from "react";
import { onSnapshot } from "firebase/firestore";
import { raffleConfigDoc } from "@/firebase";
import { userStorage } from "@/lib/utils/storage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { RaffleConfig } from "@/lib/types";

interface WaitingScreenProps {
  userName: string;
  onRaffleStarted: () => void;
  onSwitchUser: () => void;
}

export function WaitingScreen({ userName, onRaffleStarted, onSwitchUser }: WaitingScreenProps) {
  useEffect(() => {
    // Set up real-time listener on raffle status
    const unsubscribe = onSnapshot(
      raffleConfigDoc,
      (doc) => {
        if (doc.exists()) {
          const config = doc.data() as RaffleConfig;
          if (config.status === "active") {
            // Raffle has started, notify parent to transition to card selection
            onRaffleStarted();
          }
        }
      },
      (error) => {
        console.error("Error listening to raffle status:", error);
      }
    );

    return () => unsubscribe();
  }, [onRaffleStarted]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome, {userName}!</CardTitle>
          <CardDescription>You're all set to participate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mb-4"></div>
            <p className="text-center text-gray-600 dark:text-gray-400">
              Waiting for Admin to start the raffle...
            </p>
            <p className="text-center text-sm text-gray-500 mt-2">
              Please stay on this page. You'll be able to select a card once the raffle begins.
            </p>
          </div>
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                userStorage.clearCode();
                onSwitchUser();
              }}
              className="w-full"
            >
              Switch User
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
