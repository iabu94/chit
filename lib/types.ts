import { Timestamp } from "firebase/firestore";

/**
 * Raffle configuration document structure
 * Stored as a singleton document at `raffle_config/active`
 */
export interface RaffleConfig {
  status: "waiting" | "active" | "completed";
  available_ranks: number[]; // Shuffled array [1, 2, ..., N]
  admin_code: string; // Hashed secret (or plain text for MVP)
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * User document structure
 * Stored in the `users` collection
 */
export interface User {
  id: string; // Firestore document ID (redundant but useful)
  name: string; // User's display name
  code: string; // Unique access code (e.g., "A1B2")
  rank: number | null; // Assigned rank (1 to N) or null
  has_participated: boolean; // Flag to prevent duplicate selections
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * User document as stored in Firestore (without id field)
 * The id is the document ID itself
 */
export interface UserData {
  name: string;
  code: string;
  rank: number | null;
  has_participated: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}
