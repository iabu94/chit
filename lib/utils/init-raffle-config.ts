import { setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { raffleConfigDoc } from "../../firebase";
import type { RaffleConfig } from "../types";

/**
 * Default admin code (should be changed in production)
 * For MVP, using a simple default. In production, this should be:
 * - Set via environment variable
 * - Or hashed using a proper hashing algorithm
 */
const DEFAULT_ADMIN_CODE = "";

/**
 * Initialize the raffle_config document if it doesn't exist
 * This should be called once to set up the initial state
 * 
 * @param adminCode Optional admin code (defaults to DEFAULT_ADMIN_CODE)
 * @returns Promise that resolves when initialization is complete
 */
export async function initializeRaffleConfig(
  adminCode: string = DEFAULT_ADMIN_CODE
): Promise<void> {
  // Check if document already exists
  const docSnapshot = await getDoc(raffleConfigDoc);
  
  if (docSnapshot.exists()) {
    console.log("Raffle config already exists. Skipping initialization.");
    return;
  }

  // Create initial raffle config
  const initialConfig: Omit<RaffleConfig, "created_at" | "updated_at"> = {
    status: "waiting",
    available_ranks: [],
    admin_code: adminCode,
  };

  await setDoc(raffleConfigDoc, {
    ...initialConfig,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  console.log("Raffle config initialized successfully.");
}
