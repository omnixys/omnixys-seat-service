import {
  LayoutRecognitionError,
  type DetectedShape,
  type PreparedLayoutSource,
} from './layout-recognizer.js';

export interface ShapeCandidate {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape?: DetectedShape;
  quality: number;
}

const MAX_PIXELS = 1_600 * 1_600;
const MAX_COMPONENTS = 20_000;
const MAX_CANDIDATES = 10_000;
const MAX_FIT_PIXELS = 10_000_000;

/** Otsu's between-class variance. A uniform bright image has no foreground. */
export function binaryThreshold(source: PreparedLayoutSource): number | null {
  if (
    !Number.isInteger(source.width) ||
    !Number.isInteger(source.height) ||
    source.width < 1 ||
    source.height < 1 ||
    Math.max(source.width, source.height) > 1_600 ||
    source.width * source.height > MAX_PIXELS ||
    source.channels !== 1 ||
    !(source.data instanceof Uint8Array) ||
    source.data.length !== source.width * source.height
  ) {
    throw new LayoutRecognitionError(
      'INVALID_RASTER',
      'Invalid prepared image dimensions or pixels.',
    );
  }
  const histogram = new Uint32Array(256);
  let sum = 0;
  let minimum = 255;
  let maximum = 0;
  for (const value of source.data) {
    histogram[value] = (histogram[value] ?? 0) + 1;
    sum += value;
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  if (maximum - minimum < 24) {
    if (minimum >= 224) {
      return null;
    }
    throw new LayoutRecognitionError(
      'UNSUPPORTED_CONTRAST',
      'Use a plan with dark symbols on a light background.',
    );
  }
  let weight = 0;
  let partialSum = 0;
  let bestVariance = -1;
  let threshold = minimum;
  for (let value = minimum; value < maximum; value++) {
    weight += histogram[value] ?? 0;
    partialSum += value * (histogram[value] ?? 0);
    const remaining = source.data.length - weight;
    if (weight === 0 || remaining === 0) {
      continue;
    }
    const difference = partialSum / weight - (sum - partialSum) / remaining;
    const variance = weight * remaining * difference * difference;
    if (variance > bestVariance) {
      bestVariance = variance;
      threshold = value;
    }
  }
  return threshold;
}

interface Component {
  id: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  size: number;
}

export function extractShapes(
  source: PreparedLayoutSource,
  threshold: number,
): ShapeCandidate[] {
  const { data, width, height } = source;
  const labels = new Int32Array(data.length);
  const queue = new Int32Array(data.length);
  const components: Component[] = [];
  let componentCount = 0;
  let darkCount = 0;
  for (let index = 0; index < data.length; index++) {
    if ((data[index] ?? 255) > threshold || labels[index] !== 0) {
      continue;
    }
    componentCount++;
    if (componentCount > MAX_COMPONENTS) {
      complexityError();
    }
    const component: Component = {
      id: componentCount,
      minX: index % width,
      maxX: index % width,
      minY: Math.floor(index / width),
      maxY: Math.floor(index / width),
      size: 0,
    };
    let head = 0;
    let tail = 1;
    queue[0] = index;
    labels[index] = componentCount;
    while (head < tail) {
      const current = queue[head++] ?? 0;
      const x = current % width;
      const y = Math.floor(current / width);
      component.size++;
      component.minX = Math.min(component.minX, x);
      component.maxX = Math.max(component.maxX, x);
      component.minY = Math.min(component.minY, y);
      component.maxY = Math.max(component.maxY, y);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            continue;
          }
          const next = ny * width + nx;
          if (labels[next] === 0 && (data[next] ?? 255) <= threshold) {
            labels[next] = componentCount;
            queue[tail++] = next;
          }
        }
      }
    }
    darkCount += component.size;
    const w = component.maxX - component.minX + 1;
    const h = component.maxY - component.minY + 1;
    if (
      w >= 6 &&
      h >= 6 &&
      component.size >= 12 &&
      Math.max(w / h, h / w) <= 20
    ) {
      components.push(component);
      if (components.length > MAX_CANDIDATES) {
        complexityError();
      }
    }
  }
  if (darkCount / data.length > 0.6) {
    throw new LayoutRecognitionError(
      'UNSUPPORTED_CONTRAST',
      'The image is too dark for geometric recognition. Use dark symbols on a light background.',
    );
  }
  let fitPixels = 0;
  return components.map((component, index) => {
    const w = component.maxX - component.minX + 1;
    const h = component.maxY - component.minY + 1;
    fitPixels += (w + 2) * (h + 2);
    if (fitPixels > MAX_FIT_PIXELS) {
      complexityError();
    }
    const fit = fitContour(component, labels, width);
    return {
      id: `detected-${index + 1}`,
      x: component.minX + w / 2,
      y: component.minY + h / 2,
      width: w,
      height: h,
      ...fit,
    };
  });
}

function complexityError(): never {
  throw new LayoutRecognitionError(
    'SOURCE_TOO_COMPLEX',
    'Too many symbols or contours. Crop the source to a smaller area and try again. No objects were imported.',
  );
}

/** Flood only this connected component's exterior; text inside an outline is not merged. */
function fitContour(
  component: Component,
  labels: Int32Array,
  imageWidth: number,
): { shape?: DetectedShape; quality: number } {
  const width = component.maxX - component.minX + 1;
  const height = component.maxY - component.minY + 1;
  const stride = width + 2;
  const mask = new Uint8Array(stride * (height + 2));
  const queue = new Int32Array(mask.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (
        labels[(y + component.minY) * imageWidth + x + component.minX] ===
        component.id
      ) {
        mask[(y + 1) * stride + x + 1] = 1;
      }
    }
  }
  let head = 0;
  let tail = 1;
  queue[0] = 0;
  mask[0] = 2;
  while (head < tail) {
    const index = queue[head++] ?? 0;
    const x = index % stride;
    const y = Math.floor(index / stride);
    for (const next of [
      x > 0 ? index - 1 : -1,
      x < stride - 1 ? index + 1 : -1,
      y > 0 ? index - stride : -1,
      y < height + 1 ? index + stride : -1,
    ]) {
      if (next >= 0 && mask[next] === 0) {
        mask[next] = 2;
        queue[tail++] = next;
      }
    }
  }
  let area = 0;
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumYY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[(y + 1) * stride + x + 1] !== 2) {
        area++;
        sumX += x + 0.5;
        sumY += y + 0.5;
        sumXX += (x + 0.5) ** 2;
        sumYY += (y + 0.5) ** 2;
      }
    }
  }
  // Fitting the filled silhouette's moments avoids a one-pixel bounding-box bias
  // for small symbols whose centers fall between pixels.
  const centerX = sumX / Math.max(1, area);
  const centerY = sumY / Math.max(1, area);
  const radiusX = Math.max(
    1,
    2 * Math.sqrt(Math.max(0, sumXX / Math.max(1, area) - centerX ** 2)),
  );
  const radiusY = Math.max(
    1,
    2 * Math.sqrt(Math.max(0, sumYY / Math.max(1, area) - centerY ** 2)),
  );
  let ellipseIntersection = 0;
  let ellipseUnion = 0;
  let momentIntersection = 0;
  let momentUnion = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const filled = mask[(y + 1) * stride + x + 1] !== 2;
      const ellipse =
        ((x + 0.5 - width / 2) / (width / 2)) ** 2 +
          ((y + 0.5 - height / 2) / (height / 2)) ** 2 <=
        1;
      const momentEllipse =
        ((x + 0.5 - centerX) / radiusX) ** 2 +
          ((y + 0.5 - centerY) / radiusY) ** 2 <=
        1;
      if (filled && ellipse) {
        ellipseIntersection++;
      }
      if (filled || ellipse) {
        ellipseUnion++;
      }
      if (filled && momentEllipse) {
        momentIntersection++;
      }
      if (filled || momentEllipse) {
        momentUnion++;
      }
    }
  }
  const rectangleFit = area / (width * height);
  const ellipseFit = Math.max(
    ellipseIntersection / Math.max(1, ellipseUnion),
    momentIntersection / Math.max(1, momentUnion),
  );
  const quality = Math.max(rectangleFit, ellipseFit);
  if (quality < 0.8 || Math.abs(rectangleFit - ellipseFit) < 0.06) {
    return { quality };
  }
  if (rectangleFit > ellipseFit) {
    return { shape: 'RECTANGLE', quality };
  }
  return {
    shape: width / height >= 0.85 && width / height <= 1.18 ? 'ROUND' : 'OVAL',
    quality,
  };
}
