import assert from 'node:assert/strict';
import test from 'node:test';
import { GeometryLayoutRecognizer } from '../../dist/layout-import/recognizers/geometry-layout.recognizer.js';
import { LayoutRecognitionError } from '../../dist/layout-import/recognizers/layout-recognizer.js';
import { ambiguousTablePlan, drawShape, raster, rotate90, threeTablePlan } from '../fixtures/layout-recognition-raster.mjs';

const recognizer = new GeometryLayoutRecognizer();

function assertThreeTables(result) {
  const tables = result.elements.filter((element) => element.kind === 'TABLE');
  assert.deepEqual(tables.map((table) => [table.shape, table.seatCount]).sort(), [['OVAL', 12], ['RECTANGLE', 10], ['ROUND', 8]]);
  const seats = result.elements.filter((element) => element.kind === 'SEAT');
  assert.equal(seats.length, 30);
  assert.equal(result.elements.filter((element) => element.kind === 'SECTION').length, 1);
  assert.equal(result.elements.filter((element) => element.kind === 'UNKNOWN').length, 0);
  assert.equal(new Set(result.elements.map((element) => element.id)).size, result.elements.length);
  for (const seat of seats) assert.ok(tables.some((table) => table.id === seat.parentCandidateId));
  for (const element of result.elements) {
    const { x, y, width, height, rotation } = element.geometry;
    assert.ok([x, y, width, height, rotation].every(Number.isFinite));
    assert.ok(x - width / 2 >= 0 && x + width / 2 <= 1);
    assert.ok(y - height / 2 >= 0 && y + height / 2 <= 1);
  }
}

test('recognizes actual pixels: round/8, rectangle/10, oval/12 and enclosing section', async () => {
  const result = await recognizer.analyze(threeTablePlan());
  assertThreeTables(result);
  assert.equal(result.recognizer, 'geometry-v1');
  assert.equal(result.analysis.threshold, 0);
  assert.equal(result.warnings.some((warning) => warning.code === 'AMBIGUOUS_PARENT'), false);
});

test('normalization is stable across raster resolution and contrast', async () => {
  const original = await recognizer.analyze(threeTablePlan());
  const smaller = await recognizer.analyze(threeTablePlan(0.5, { color: 35, background: 240 }));
  assertThreeTables(smaller);
  for (const table of original.elements.filter((element) => element.kind === 'TABLE')) {
    const other = smaller.elements.find((element) => element.kind === 'TABLE' && element.shape === table.shape);
    assert.ok(other);
    for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(table.geometry[key] - other.geometry[key]) <= 2 / smaller.analysis.width);
  }
});

test('upright and quarter-turned prepared rasters preserve shapes, counts and parents', async () => {
  assertThreeTables(await recognizer.analyze(rotate90(threeTablePlan())));
});

test('repeated seats outside tables remain free and retain their detected coordinates', async () => {
  const image = raster(400, 200);
  for (const x of [60, 110, 160, 210]) drawShape(image, 'rectangle', x, 100, 20, 20);
  const result = await recognizer.analyze(image);
  assert.equal(result.elements.length, 4);
  assert.ok(result.elements.every((element) => element.kind === 'SEAT' && !element.parentCandidateId));
  assert.deepEqual(result.elements.map((element) => element.geometry.x), [0.15, 0.275, 0.4, 0.525]);
});

test('a seat between two tables is explicitly ambiguous and counted by neither', async () => {
  const result = await recognizer.analyze(ambiguousTablePlan());
  const tables = result.elements.filter((element) => element.kind === 'TABLE');
  assert.equal(tables.length, 2);
  assert.deepEqual(tables.map((table) => table.seatCount), [4, 4]);
  const warning = result.warnings.find((item) => item.code === 'AMBIGUOUS_PARENT');
  assert.ok(warning);
  const seat = result.elements.find((element) => element.id === warning.elementIds[0]);
  assert.equal(seat.kind, 'SEAT');
  assert.equal(seat.parentCandidateId, undefined);
  assert.equal(seat.needsReview, true);
});

test('unclassified and open contours stay uncertain; tiny specks and thin lines are ignored', async () => {
  const image = raster(240, 200);
  drawShape(image, 'rectangle', 120, 90, 80, 60);
  for (let x = 110; x < 130; x++) for (let y = 59; y < 65; y++) image.data[y * image.width + x] = 255;
  image.data[20 * image.width + 20] = 0;
  for (let x = 5; x < 80; x++) image.data[180 * image.width + x] = 0;
  const result = await recognizer.analyze(image);
  assert.equal(result.elements.length, 1);
  assert.equal(result.elements[0].kind, 'UNKNOWN');
  assert.equal(result.elements[0].shape, undefined);
  assert.equal(result.elements[0].needsReview, true);
  assert.ok(result.warnings.some((warning) => warning.code === 'UNKNOWN_OBJECT'));
});

test('blank source is an empty result with the manual-background fallback', async () => {
  const result = await recognizer.analyze(raster(100, 100));
  assert.deepEqual(result.elements, []);
  assert.equal(result.analysis.threshold, null);
  assert.ok(result.warnings.some((warning) => warning.code === 'NO_OBJECTS'));
});

test('invalid pixels, non-finite dimensions and excessive dimensions are rejected', async () => {
  for (const source of [
    { ...raster(8, 8), width: NaN },
    { ...raster(8, 8), height: Infinity },
    { ...raster(8, 8), channels: 3 },
    { ...raster(8, 8), data: new Uint8Array(1) },
    raster(1601, 1),
  ]) await assert.rejects(recognizer.analyze(source), (error) => error instanceof LayoutRecognitionError && error.code === 'INVALID_RASTER');
});

test('dark low-contrast images fail without inventing recognized objects', async () => {
  await assert.rejects(recognizer.analyze(raster(200, 200, 40)), (error) => error.code === 'UNSUPPORTED_CONTRAST');
});

test('excessive separate components fail without silently truncating the result', async () => {
  const image = raster(300, 300);
  for (let y = 0; y < 300; y += 2) for (let x = 0; x < 300; x += 2) image.data[y * image.width + x] = 0;
  await assert.rejects(recognizer.analyze(image), (error) => error.code === 'SOURCE_TOO_COMPLEX');
});

test('excessive plausible symbols and nested contour work are bounded', async () => {
  const many = raster(640, 640);
  for (let y = 8; y < 640; y += 16) for (let x = 8; x < 640; x += 16) drawShape(many, 'rectangle', x, y, 8, 8);
  await assert.rejects(recognizer.analyze(many), (error) => error.code === 'SOURCE_TOO_COMPLEX');
  const nested = raster(1600, 1600);
  for (let offset = 10; offset < 110; offset += 15) drawShape(nested, 'rectangle', 800, 800, 1600 - offset * 2, 1600 - offset * 2);
  await assert.rejects(recognizer.analyze(nested), (error) => error.code === 'SOURCE_TOO_COMPLEX');
});
