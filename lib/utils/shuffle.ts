/**
 * Fisher-Yates shuffle algorithm
 * Randomly shuffles an array in-place and returns it
 * 
 * @param array The array to shuffle
 * @returns The shuffled array (same reference, mutated)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]; // Create a copy to avoid mutating the original
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
