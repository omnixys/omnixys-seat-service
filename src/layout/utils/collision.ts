/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* Seat collision detection */

export function detectSeatCollision(
  seats: Array<{ x: number; y: number }>,
  minDistance = 30,
): boolean {
  if (!seats || seats.length < 2) {
    return false;
  } // TS-safe

  for (let i = 0; i < seats.length; i++) {
    const a = seats[i]!; // non-null assertion

    for (let j = i + 1; j < seats.length; j++) {
      const b = seats[j]!;
      const dx = a.x - b.x;
      const dy = a.y - b.y;

      if (Math.sqrt(dx * dx + dy * dy) < minDistance) {
        return true;
      }
    }
  }

  return false;
}
