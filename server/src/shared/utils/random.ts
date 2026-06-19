/**
 * Generates a random lowercase alphanumeric string of exactly `n` characters.
 * Uses base-36 encoding (digits 0-9 + letters a-z).
 *
 * @param n - Desired output length (must be > 0)
 * @returns A lowercase alphanumeric string of length `n`
 */
export function generateRandomAlphanumeric(n: number): string {
  let result = "";
  while (result.length < n) {
    // Math.random().toString(36) yields "0.xxxxxxxx" in base-36; strip the "0." prefix
    result += Math.random().toString(36).slice(2);
  }
  return result.slice(0, n);
}
