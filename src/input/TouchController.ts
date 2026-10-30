/**
 * TouchController manages multi-touch input states for dual analog sticks
 * and gaming action buttons with vehicle mode support.
 */

export interface TouchState {
  // Left stick: -1.0 to 1.0
  leftStickX: number;
  leftStickY: number;

  // Right stick (camera): -1.0 to 1.0
  rightStickX: number;
  rightStickY: number;

  // Action buttons
  buttonA: boolean;
  buttonB: boolean;
  buttonX: boolean;
  buttonY: boolean;

  // Triggers & Bumpers
  lb: boolean;
  rb: boolean;
  lt: boolean;
  rt: boolean;

  // System
  start: boolean;
  select: boolean;
  pause: boolean;

  // Vehicle mode inputs
  accelerate: boolean;
  brake: boolean;
  handbrake: boolean;
  steerLeft: boolean;
  steerRight: boolean;
}

export type InputChangeCallback = (state: TouchState) => void;

export class TouchController {
  private state: TouchState = {
    leftStickX: 0,
    leftStickY: 0,
    rightStickX: 0,
    rightStickY: 0,
    buttonA: false,
    buttonB: false,
    buttonX: false,
    buttonY: false,
    lb: false,
    rb: false,
    lt: false,
    rt: false,
    start: false,
    select: false,
    pause: false,
    accelerate: false,
    brake: false,
    handbrake: false,
    steerLeft: false,
    steerRight: false,
  };

  private listeners: InputChangeCallback[] = [];

  public getState(): TouchState {
    return { ...this.state };
  }

  public setButton(btn: keyof TouchState, pressed: boolean): void {
    if ((this.state as any)[btn] !== pressed) {
      (this.state as any)[btn] = pressed;
      this.notify();
    }
  }

  public setLeftStick(x: number, y: number): void {
    // Clamp to -1..1
    this.state.leftStickX = Math.max(-1, Math.min(1, x));
    this.state.leftStickY = Math.max(-1, Math.min(1, y));
    this.notify();
  }

  public setRightStick(x: number, y: number): void {
    this.state.rightStickX = Math.max(-1, Math.min(1, x));
    this.state.rightStickY = Math.max(-1, Math.min(1, y));
    this.notify();
  }

  public resetAll(): void {
    for (const key in this.state) {
      if (typeof (this.state as any)[key] === 'boolean') {
        (this.state as any)[key] = false;
      } else {
        (this.state as any)[key] = 0;
      }
    }
    this.notify();
  }

  public subscribe(cb: InputChangeCallback): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notify(): void {
    const copy = { ...this.state };
    for (const cb of this.listeners) {
      cb(copy);
    }
  }
}
