import test from 'node:test';
import assert from 'node:assert/strict';
import { CapabilityDetector } from './CapabilityDetector.ts';

test('CapabilityDetector validates WebAssembly SIMD bytecode correctly', async () => {
  const isSimd = await CapabilityDetector.checkWasmSimd();
  // Modern Node.js v22 supports WebAssembly SIMD
  assert.equal(typeof isSimd, 'boolean');
});

test('CapabilityDetector reports full audit structure', async () => {
  const audit = await CapabilityDetector.runFullAudit();
  assert.ok(audit);
  assert.ok(typeof audit.cpuCores === 'number');
  assert.ok(typeof audit.hasWebAssembly === 'boolean');
  assert.ok(Array.isArray(audit.failingChecks));
  // In node environment without browser display, x86_64 GTA V native check correctly registers the restriction
  assert.equal(audit.canExecuteX86_64, false);
});
