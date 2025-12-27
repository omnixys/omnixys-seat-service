// src/seat/utils/layout/compute-table-positions.ts
export function computeTablePositions(tableCount: number, opts: any = {}) {
  const radius = opts.radius ?? 300;
  const angleStep = (2 * Math.PI) / tableCount;

  return Array.from({ length: tableCount }).map((_, i) => {
    const angle = i * angleStep;

    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      angle,
    };
  });
}
