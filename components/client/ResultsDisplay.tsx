"use client";

import { userStorage } from "@/lib/utils/storage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Congratulations!</CardTitle>
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

          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleSwitchUser}
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
