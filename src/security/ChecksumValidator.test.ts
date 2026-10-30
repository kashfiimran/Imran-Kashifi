import test from 'node:test';
import assert from 'node:assert/strict';
import { ChecksumValidator } from './ChecksumValidator.ts';

test('ChecksumValidator computes accurate SHA-256 string for empty payload', async () => {
  const empty = new Uint8Array(0);
  const hash = await ChecksumValidator.computeSha256(empty);
  // Known SHA-256 for empty input
  assert.equal(hash, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
});

test('ChecksumValidator verifies matched and unmatched hashes', async () => {
  const data = new TextEncoder().encode('GTAV_WEB_PLAYER_TEST');
  const hash = await ChecksumValidator.computeSha256(data);

  const matched = await ChecksumValidator.verify(data, hash);
  assert.equal(matched, true);

  const unmatched = await ChecksumValidator.verify(data, '0000000000000000000000000000000000000000000000000000000000000000');
  assert.equal(unmatched, false);
});
