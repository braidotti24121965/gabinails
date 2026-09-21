import { test } from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parseArgs, validateBinaryMime } = require('../scripts/migrate-photos.js');

test('migrate parseArgs - requires --dry-run or --execute', () => {
  assert.throws(() => parseArgs([]), /Necessário especificar --dry-run ou --execute/);
});

test('migrate parseArgs - rejects conflicting flags', () => {
  assert.throws(() => parseArgs(['--dry-run', '--execute']), /Conflito/);
});

test('migrate parseArgs - accepts --dry-run', () => {
  const args = parseArgs(['--dry-run']);
  assert.strictEqual(args.isDryRun, true);
  assert.strictEqual(args.isExecute, false);
  assert.strictEqual(args.batchSize, 10); // default
});

test('migrate parseArgs - limits batch-size', () => {
  assert.throws(() => parseArgs(['--execute', '--batch-size', '500']), /Lote inválido/);
  assert.throws(() => parseArgs(['--execute', '--batch-size', '0']), /Lote inválido/);
  const args = parseArgs(['--execute', '--batch-size', '50']);
  assert.strictEqual(args.batchSize, 50);
});

test('migrate parseArgs - parses start-id', () => {
  const args = parseArgs(['--dry-run', '--start-id', 'test-uuid']);
  assert.strictEqual(args.startId, 'test-uuid');
});

test('migrate validateBinaryMime - correct signatures', () => {
  const jpeg = new Uint8Array([0xFF, 0xD8, 0xFF, 0x00]);
  assert.strictEqual(validateBinaryMime(jpeg)?.mime, 'image/jpeg');

  const png = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  assert.strictEqual(validateBinaryMime(png)?.mime, 'image/png');

  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
  assert.strictEqual(validateBinaryMime(webp)?.mime, 'image/webp');

  const invalid = new Uint8Array([0x00, 0x00, 0x00]);
  assert.strictEqual(validateBinaryMime(invalid), null);
});
