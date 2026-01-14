"use client";

import { useState, useEffect, useRef } from "react";
import { userStorage } from "@/lib/utils/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface WheelProps {
  userName: string;
  userId: string;
  onCardSelected: (rank: number) => void;
  onError: (error: string) => void;
}

export function Wheel({ userName, userId, onCardSelected, onError }: WheelProps) {
  const [disabled, setDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedRank, setSelectedRank] = useState<number | null>(null);
  const animationRef = useRef<number | null>(null);
  const startRotationRef = useRef(0);
  const startTimeRef = useRef(0);

  // Get number of users to determine wheel sections (minimum 8 for visual appeal)
  const [totalUsers, setTotalUsers] = useState(12); // Default, will be updated
  const sections = Math.max(totalUsers, 8);

  useEffect(() => {
    // Fetch total user count for wheel sections
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

  // Continuous spinning animation
  useEffect(() => {
    if (isSpinning) {
      startTimeRef.current = Date.now();
      startRotationRef.current = rotation;
      
      const animate = () => {
        const elapsed = Date.now() - startTimeRef.current;
        const speed = 0.3; // degrees per millisecond
        const newRotation = startRotationRef.current + (elapsed * speed);
        setRotation(newRotation);
        if (isSpinning) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };
      
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSpinning]);

  const handleSpin = async () => {
    if (disabled || loading || isSpinning) return;

    setIsSpinning(true);
    setDisabled(true);
    setLoading(true);

    try {
      // Trigger the transaction to get the rank (wheel keeps spinning during this)
      const { selectCard } = await import("@/lib/utils/card-selection");
      const rankPromise = selectCard(userId);

      // Wait for minimum spin duration (3 seconds) for visual appeal
      const minSpinDuration = 3000;
      const [rank] = await Promise.all([
        rankPromise,
        new Promise(resolve => setTimeout(resolve, minSpinDuration))
      ]);

      // Stop continuous spinning
      setIsSpinning(false);

      // Calculate final rotation to land on the rank
      const sectionAngle = 360 / sections;
      const targetRotation = 90 - (rank - 1) * sectionAngle;
      
      // Get current rotation and calculate final position
      const currentRot = rotation % 360;
      // Normalize target rotation
      let normalizedTarget = targetRotation;
      while (normalizedTarget < currentRot) {
        normalizedTarget += 360;
      }
      // Add a few more full rotations for smooth landing
      const finalRotation = currentRot + Math.ceil((normalizedTarget - currentRot) / 360) * 360;

      // Smooth transition to final position
      setRotation(finalRotation);
      setSelectedRank(rank);

      // Wait for animation to complete, then notify parent
      await new Promise(resolve => setTimeout(resolve, 1000));
      onCardSelected(rank);
    } catch (err) {
      console.error("Card selection error:", err);
      setIsSpinning(false);
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

  // Generate colors for wheel sections
  const getSectionColor = (index: number) => {
    const colors = [
      "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A",
      "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E2",
      "#F8B739", "#EA7773", "#58D68D", "#5DADE2",
      "#F1948A", "#82E0AA", "#F4D03F", "#A569BD"
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Welcome, {userName}!</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Spin the wheel to reveal your rank
            </p>
          </div>
          <Button variant="outline" onClick={handleSwitchUser}>
            Switch User
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center space-y-8">
          {/* Wheel Container */}
          <div className="relative">
            {/* Pointer at top */}
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
              <div className="w-0 h-0 border-l-[20px] border-r-[20px] border-t-[30px] border-l-transparent border-r-transparent border-t-red-500"></div>
            </div>

            {/* Wheel */}
            <div
              className="relative w-80 h-80 rounded-full shadow-2xl border-4 border-white dark:border-gray-700"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning ? 'none' : 'transform 1s cubic-bezier(0.17, 0.67, 0.12, 0.99)',
                background: `conic-gradient(from -90deg, ${Array.from({ length: sections })
                  .map((_, i) => {
                    const color = getSectionColor(i);
                    const startPercent = (i / sections) * 100;
                    const endPercent = ((i + 1) / sections) * 100;
                    return `${color} ${startPercent}% ${endPercent}%`;
                  })
                  .join(', ')})`,
              }}
            >
              {/* Separator lines */}
              {Array.from({ length: sections }).map((_, index) => {
                const angle = (360 / sections) * index - 90; // Start from top
                return (
                  <div
                    key={index}
                    className="absolute w-1 bg-white opacity-80"
                    style={{
                      height: '50%',
                      left: '50%',
                      top: '50%',
                      transformOrigin: 'top',
                      transform: `translateX(-50%) rotate(${angle}deg)`,
                    }}
                  />
                );
              })}

              {/* Center circle with text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center border-4 border-gray-300 dark:border-gray-600">
                  {selectedRank && !isSpinning ? (
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gray-900 dark:text-white">
                        {selectedRank}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Rank
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      {isSpinning ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
                      ) : (
                        <>
                          <div className="text-2xl font-bold text-gray-400 dark:text-gray-500">
                            ?
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Spin
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Spin Button */}
          <div className="flex flex-col items-center space-y-4">
            <Button
              onClick={handleSpin}
              disabled={disabled || loading || isSpinning}
              size="lg"
              className="px-12 py-6 text-lg font-semibold"
            >
              {isSpinning
                ? "Spinning..."
                : loading
                ? "Processing..."
                : selectedRank
                ? "Rank Assigned!"
                : "Spin the Wheel"}
            </Button>

            {loading && !isSpinning && (
              <p className="text-sm text-gray-500">
                Please wait while your rank is being assigned...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
