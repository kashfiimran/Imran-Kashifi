import test from 'node:test';
import assert from 'node:assert/strict';
import { VehiclePhysics } from './VehiclePhysics.ts';

test('VehiclePhysics accelerates from rest when throttle applied', () => {
  const vp = new VehiclePhysics(0, 0, 0);
  const state = vp.update(0.1, 1.0, 0, false, 0);
  assert.ok(state.speed > 0, 'Vehicle speed should increase with throttle');
  assert.ok(state.mph > 0, 'MPH should be positive');
  assert.equal(state.gear, 1, 'Initial forward gear is 1');
});

test('VehiclePhysics steers and updates heading', () => {
  const vp = new VehiclePhysics(0, 0, 0);
  // Give initial speed
  vp.update(0.5, 1.0, 0, false, 0);
  const stateBefore = vp.getState();
  // Steer right
  const stateAfter = vp.update(0.5, 1.0, 0, false, 1.0);
  assert.notEqual(stateBefore.angle, stateAfter.angle, 'Heading angle should change when steering');
});

test('VehiclePhysics brakes and enters reverse', () => {
  const vp = new VehiclePhysics(0, 0, 0);
  // Reverse from standstill
  const state = vp.update(0.5, 0, 1.0, false, 0);
  assert.ok(state.speed < 0, 'Speed should be negative in reverse');
  assert.equal(state.gear, -1, 'Gear should be -1 (Reverse)');
  assert.equal(state.isReversing, true);
});
