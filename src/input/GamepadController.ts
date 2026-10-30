import { TouchController } from './TouchController.ts';

/**
 * GamepadController interfaces directly with the Gamepad API to capture
 * physical controller inputs (Xbox, DualShock/DualSense, generic Bluetooth).
 */
export class GamepadController {
  private touchController: TouchController;
  private animId: number | null = null;
  private isPolling = false;
  private connectedGamepadName = '';

  constructor(touchController: TouchController) {
    this.touchController = touchController;
  }

  public start(): void {
    if (this.isPolling || typeof window === 'undefined') return;
    this.isPolling = true;

    window.addEventListener('gamepadconnected', (e: any) => {
      this.connectedGamepadName = e.gamepad.id || 'Connected Gamepad';
    });

    const poll = () => {
      if (!this.isPolling) return;
      this.pollGamepads();
      this.animId = requestAnimationFrame(poll);
    };

    this.animId = requestAnimationFrame(poll);
  }

  public stop(): void {
    this.isPolling = false;
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  public getConnectedGamepadName(): string {
    return this.connectedGamepadName;
  }

  private pollGamepads(): void {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();
    if (!gamepads) return;

    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (!gp || !gp.connected) continue;

      this.connectedGamepadName = gp.id;

      // Analog sticks (deadzone 0.15)
      const lx = Math.abs(gp.axes[0]) > 0.15 ? gp.axes[0] : 0;
      const ly = Math.abs(gp.axes[1]) > 0.15 ? gp.axes[1] : 0;
      this.touchController.setLeftStick(lx, ly);

      if (gp.axes.length >= 4) {
        const rx = Math.abs(gp.axes[2]) > 0.15 ? gp.axes[2] : 0;
        const ry = Math.abs(gp.axes[3]) > 0.15 ? gp.axes[3] : 0;
        this.touchController.setRightStick(rx, ry);
      }

      // Buttons (Standard Gamepad Mapping)
      // 0: A/Cross, 1: B/Circle, 2: X/Square, 3: Y/Triangle
      if (gp.buttons[0]) this.touchController.setButton('buttonA', gp.buttons[0].pressed);
      if (gp.buttons[1]) this.touchController.setButton('buttonB', gp.buttons[1].pressed);
      if (gp.buttons[2]) this.touchController.setButton('buttonX', gp.buttons[2].pressed);
      if (gp.buttons[3]) this.touchController.setButton('buttonY', gp.buttons[3].pressed);

      // Shoulders & Triggers
      // 4: LB/L1, 5: RB/R1, 6: LT/L2, 7: RT/R2
      if (gp.buttons[4]) this.touchController.setButton('lb', gp.buttons[4].pressed);
      if (gp.buttons[5]) this.touchController.setButton('rb', gp.buttons[5].pressed);
      if (gp.buttons[6]) {
        this.touchController.setButton('lt', gp.buttons[6].pressed);
        this.touchController.setButton('brake', gp.buttons[6].pressed);
      }
      if (gp.buttons[7]) {
        this.touchController.setButton('rt', gp.buttons[7].pressed);
        this.touchController.setButton('accelerate', gp.buttons[7].pressed);
      }

      // 8: Select/Back, 9: Start, 16: Guide
      if (gp.buttons[8]) this.touchController.setButton('select', gp.buttons[8].pressed);
      if (gp.buttons[9]) this.touchController.setButton('start', gp.buttons[9].pressed);

      break; // Map primary controller
    }
  }
}
