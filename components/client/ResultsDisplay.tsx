"use client";

import { userStorage } from "@/lib/utils/storage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClientLeaderboard } from "./ClientLeaderboard";

interface ResultsDisplayProps {
  userName: string;
  rank: number;
  onSwitchUser: () => void;
}

export function ResultsDisplay({ userName, rank, onSwitchUser }: ResultsDisplayProps) {
  const handleSwitchUser = () => {
    userStorage.clearCode();
    onSwitchUser();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Congratulations, {userName}!</h1>
          <Button variant="outline" onClick={handleSwitchUser}>
            Switch User
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Results Card */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-3xl">Your Result</CardTitle>
              <CardDescription>Your rank has been assigned</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Name</p>
                  <p className="text-2xl font-bold">{userName}</p>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Your Rank</p>
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white text-5xl font-bold shadow-lg">
                    {rank}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leaderboard */}
          <div>
            <ClientLeaderboard />
          </div>
        </div>
      </div>
    </div>
  );
}
