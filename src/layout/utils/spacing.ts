/* Automatic spacing and radius optimizers */

export function computeRadiusForSeats(seatCount: number): number {
  if (seatCount <= 8) {
    return 120;
  }
  if (seatCount <= 12) {
    return 160;
  }
  if (seatCount <= 20) {
    return 200;
  }
  return 260;
}

export function computeTableSpacing(seatCount: number): number {
  if (seatCount <= 10) {
    return 140;
  }
  if (seatCount <= 20) {
    return 180;
  }
  return 240;
}
