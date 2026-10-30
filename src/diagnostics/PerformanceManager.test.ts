import test from 'node:test';
import assert from 'node:assert/strict';
import { PerformanceManager } from './PerformanceManager.ts';
import { DEFAULT_SETTINGS } from '../storage/IndexedDBStorage.ts';

test('PerformanceManager correctly calculates frame rates and adaptive profiles', () => {
  const pm = new PerformanceManager('low');
  const adaptive = pm.getAdaptiveSettings(DEFAULT_SETTINGS);
  assert.equal(adaptive.resolutionScale, 0.75);
  assert.equal(adaptive.textureQuality, 'low');
  assert.equal(adaptive.shadowQuality, 'off');
});

test('PerformanceManager high profile maintains resolution and high shadows', () => {
  const pm = new PerformanceManager('high');
  const adaptive = pm.getAdaptiveSettings(DEFAULT_SETTINGS);
  assert.equal(adaptive.resolutionScale, 1.25);
  assert.equal(adaptive.textureQuality, 'high');
  assert.equal(adaptive.shadowQuality, 'high');
});
