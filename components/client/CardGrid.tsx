"use client";

import { useState } from "react";
import { userStorage } from "@/lib/utils/storage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface CardGridProps {
  userName: string;
  userId: string;
  onCardSelected: (rank: number) => void;
  onError: (error: string) => void;
}

export function CardGrid({ userName, userId, onCardSelected, onError }: CardGridProps) {
  const [disabled, setDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Number of cards to display (can be configurable, using 12 as default)
  const numberOfCards = 12;

  const handleCardClick = async () => {
    if (disabled || loading) return;

    setDisabled(true);
    setLoading(true);

    try {
      // Import dynamically to avoid SSR issues
      const { selectCard } = await import("@/lib/utils/card-selection");
      const rank = await selectCard(userId);
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
    window.location.reload(); // Reload to reset state
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {userName}!</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Click any card to reveal your rank
            </p>
          </div>
          <Button variant="outline" onClick={handleSwitchUser}>
            Switch User
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: numberOfCards }).map((_, index) => (
            <button
              key={index}
              onClick={handleCardClick}
              disabled={disabled || loading}
              className="group relative"
            >
              <Card
                className={`
                  h-32 w-full transition-all duration-200
                  ${disabled 
                    ? "opacity-50 cursor-not-allowed" 
                    : "hover:scale-105 hover:shadow-lg cursor-pointer active:scale-95"
                  }
                  ${disabled ? "" : "hover:bg-gray-100 dark:hover:bg-gray-800"}
                `}
              >
                <CardContent className="flex items-center justify-center h-full p-0">
                  <div className="text-4xl font-bold text-gray-400 dark:text-gray-600">
                    ?
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>

        {loading && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Please wait while your rank is being assigned...
          </div>
        )}
      </div>
    </div>
  );
}
