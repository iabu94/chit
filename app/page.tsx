"use client";

import { useState, useEffect } from "react";
import { getDocs, getDoc, query, where } from "firebase/firestore";
import { usersCollection, raffleConfigDoc } from "@/firebase";
import { userStorage } from "@/lib/utils/storage";
import { CodeEntry } from "@/components/client/CodeEntry";
import { WaitingScreen } from "@/components/client/WaitingScreen";
import { CardGrid } from "@/components/client/CardGrid";
import { ResultsDisplay } from "@/components/client/ResultsDisplay";
import type { User, RaffleConfig } from "@/lib/types";

type ClientState = "code_entry" | "waiting" | "card_selection" | "results";

export default function Home() {
  const [state, setState] = useState<ClientState>("code_entry");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for stored code on mount (auto-login)
  useEffect(() => {
    const checkStoredCode = async () => {
      const storedCode = userStorage.getCode();
      if (storedCode) {
        try {
          // Validate stored code
          const codeQuery = query(
            usersCollection,
            where("code", "==", storedCode)
          );
          const snapshot = await getDocs(codeQuery);

          if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            const userData = {
              id: userDoc.id,
              ...userDoc.data(),
            } as User;
            setUser(userData);

            // Determine state based on user rank and raffle status
            if (userData.rank !== null) {
              // User has already selected a card
              setState("results");
            } else {
              // Check raffle status
              const configDoc = await getDoc(raffleConfigDoc);
              if (configDoc.exists()) {
                const config = configDoc.data() as RaffleConfig;
                if (config.status === "active") {
                  setState("card_selection");
                } else {
                  setState("waiting");
                }
              } else {
                setState("waiting");
              }
            }
          } else {
            // Invalid stored code, clear it
            userStorage.clearCode();
          }
        } catch (err) {
          console.error("Error validating stored code:", err);
          userStorage.clearCode();
        }
      }
      setLoading(false);
    };

    checkStoredCode();
  }, []);

  const handleCodeValidated = async (validatedUser: User) => {
    setUser(validatedUser);
    
    // Determine state based on user rank and raffle status
    if (validatedUser.rank !== null) {
      setState("results");
    } else {
      // Check raffle status
      try {
        const configDoc = await getDoc(raffleConfigDoc);
        if (configDoc.exists()) {
          const config = configDoc.data() as RaffleConfig;
          if (config.status === "active") {
            setState("card_selection");
          } else {
            setState("waiting");
          }
        } else {
          setState("waiting");
        }
      } catch (err) {
        console.error("Error checking raffle status:", err);
        setState("waiting");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (state === "code_entry") {
    return <CodeEntry onCodeValidated={handleCodeValidated} />;
  }

  if (state === "waiting" && user) {
    return (
      <WaitingScreen
        userName={user.name}
        onRaffleStarted={() => setState("card_selection")}
        onSwitchUser={() => {
          setUser(null);
          setState("code_entry");
        }}
      />
    );
  }

  const handleCardSelected = async (rank: number) => {
    // Refresh user data to get updated rank
    if (user) {
      try {
        const codeQuery = query(
          usersCollection,
          where("code", "==", user.code)
        );
        const snapshot = await getDocs(codeQuery);
        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          const updatedUser = {
            id: userDoc.id,
            ...userDoc.data(),
          } as User;
          setUser(updatedUser);
          setState("results");
        }
      } catch (err) {
        console.error("Error refreshing user data:", err);
      }
    }
  };

  const handleCardError = (error: string) => {
    // Show error to user (could use toast notification in future)
    alert(error);
  };

  if (state === "card_selection" && user) {
    return (
      <CardGrid
        userName={user.name}
        userId={user.id}
        onCardSelected={handleCardSelected}
        onError={handleCardError}
      />
    );
  }

  if (state === "results" && user && user.rank !== null) {
    return (
      <ResultsDisplay
        userName={user.name}
        rank={user.rank}
        onSwitchUser={() => {
          setUser(null);
          setState("code_entry");
        }}
      />
    );
  }

  return null;
}
