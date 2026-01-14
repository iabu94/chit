import { getDocs, query, where } from "firebase/firestore";
import { usersCollection } from "../../firebase";

/**
 * Generates a random 4-character alphanumeric code
 * Format: [A-Z0-9]{4}
 */
function generateRandomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Checks if a code already exists in Firestore
 */
async function codeExists(code: string): Promise<boolean> {
  const q = query(usersCollection, where("code", "==", code));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

/**
 * Generates a unique 4-character alphanumeric code
 * Ensures uniqueness by checking against Firestore
 * 
 * @param maxAttempts Maximum number of attempts to generate a unique code (default: 10)
 * @returns A unique code that doesn't exist in Firestore
 * @throws Error if unable to generate unique code after maxAttempts
 */
export async function generateUniqueCode(maxAttempts: number = 10): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateRandomCode();
    const exists = await codeExists(code);
    
    if (!exists) {
      return code;
    }
  }
  
  throw new Error(
    `Unable to generate unique code after ${maxAttempts} attempts. Please try again.`
  );
}
