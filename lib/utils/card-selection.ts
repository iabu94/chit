import { runTransaction, serverTimestamp } from "firebase/firestore";
import { db, raffleConfigDoc, getUserDoc } from "@/firebase";
import type { User } from "@/lib/types";

/**
 * Selects a card and assigns a rank to the user using a Firestore transaction
 * This ensures collision-free rank assignment even with concurrent clicks
 * 
 * @param userId The user's document ID
 * @returns The assigned rank number
 * @throws Error if transaction fails (raffle not active, no ranks available, user already participated)
 */
export async function selectCard(userId: string): Promise<number> {
  return await runTransaction(db, async (transaction) => {
    // 1. Read raffle_config
    const configRef = raffleConfigDoc;
    const configDoc = await transaction.get(configRef);
    
    if (!configDoc.exists()) {
      throw new Error("Raffle configuration not found");
    }
    
    const config = configDoc.data();
    
    if (config.status !== "active") {
      throw new Error("Raffle is not active");
    }
    
    if (!config.available_ranks || config.available_ranks.length === 0) {
      throw new Error("No ranks available");
    }
    
    // 2. Read user document
    const userRef = getUserDoc(userId);
    const userDoc = await transaction.get(userRef);
    
    if (!userDoc.exists()) {
      throw new Error("User not found");
    }
    
    const user = userDoc.data();
    
    if (user.has_participated || user.rank !== null) {
      throw new Error("User has already participated");
    }
    
    // 3. Pop last rank from array (LIFO - Last In First Out)
    const ranks = [...config.available_ranks];
    const assignedRank = ranks.pop()!;
    
    // 4. Update user document
    transaction.update(userRef, {
      rank: assignedRank,
      has_participated: true,
      updated_at: serverTimestamp(),
    });
    
    // 5. Update raffle_config
    transaction.update(configRef, {
      available_ranks: ranks,
      updated_at: serverTimestamp(),
    });
    
    return assignedRank;
  });
}
