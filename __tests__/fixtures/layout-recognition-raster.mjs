/** Tiny in-memory plan fixtures drawn independently of production geometry. */
export function raster(width = 1200, height = 520, background = 255) {
  return { width, height, channels: 1, data: new Uint8Array(width * height).fill(background) };
}

export function drawShape(image, kind, cx, cy, width, height, options = {}) {
  const thickness = options.thickness ?? 3;
  const color = options.color ?? 0;
  const rx = width / 2;
  const ry = height / 2;
  for (let y = Math.max(0, Math.floor(cy - ry)); y < Math.min(image.height, cy + ry); y++) {
    for (let x = Math.max(0, Math.floor(cx - rx)); x < Math.min(image.width, cx + rx); x++) {
      const dx = Math.abs(x + 0.5 - cx);
      const dy = Math.abs(y + 0.5 - cy);
      const outside = kind === 'rectangle' ? dx <= rx && dy <= ry : (dx / rx) ** 2 + (dy / ry) ** 2 <= 1;
      const inside = kind === 'rectangle' ? dx < rx - thickness && dy < ry - thickness : (dx / Math.max(1, rx - thickness)) ** 2 + (dy / Math.max(1, ry - thickness)) ** 2 < 1;
      if (outside && (!inside || options.filled)) image.data[y * image.width + x] = color;
    }
  }
}

export function threeTablePlan(scale = 1, options = {}) {
  const image = raster(Math.round(1200 * scale), Math.round(520 * scale), options.background);
  const draw = (shape, x, y, width, height) => drawShape(image, shape, x * scale, y * scale, width * scale, height * scale, { thickness: 3 * scale, color: options.color });
  draw('rectangle', 600, 260, 1130, 450);
  draw('ellipse', 200, 260, 100, 100);
  for (let i = 0; i < 8; i++) {
    const angle = 2 * Math.PI * i / 8;
    draw('ellipse', 200 + 80 * Math.cos(angle), 260 + 80 * Math.sin(angle), 24, 24);
  }
  draw('rectangle', 590, 260, 160, 80);
  const perimeter = [
    [-110, -70], [-38, -70], [34, -70], [106, -70], [110, -2],
    [110, 70], [38, 70], [-34, 70], [-106, 70], [-110, 2],
  ];
  for (const [x, y] of perimeter) draw('ellipse', 590 + x, 260 + y, 24, 24);
  draw('ellipse', 990, 260, 160, 80);
  for (let i = 0; i < 12; i++) {
    const angle = 2 * Math.PI * i / 12;
    draw('ellipse', 990 + 112 * Math.cos(angle), 260 + 78 * Math.sin(angle), 24, 24);
  }
  return image;
}

export function rotate90(image) {
  const rotated = raster(image.height, image.width);
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      rotated.data[x * rotated.width + image.height - y - 1] = image.data[y * image.width + x];
    }
  }
  return rotated;
}

export function ambiguousTablePlan() {
  const image = raster(560, 320);
  for (const cx of [180, 380]) {
    drawShape(image, 'ellipse', cx, 160, 90, 90);
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2 + Math.PI / 4;
      drawShape(image, 'ellipse', cx + 75 * Math.cos(angle), 160 + 75 * Math.sin(angle), 24, 24);
    }
  }
  drawShape(image, 'ellipse', 280, 160, 24, 24);
  return image;
}
