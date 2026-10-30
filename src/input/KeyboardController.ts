import { TouchController } from './TouchController.ts';

/**
 * KeyboardController maps desktop keys (WASD, SPACE, SHIFT, CTRL, E, F, R, Q, TAB, ESC)
 * directly into the unified input state and supports Pointer Lock.
 */
export class KeyboardController {
  private touchController: TouchController;
  private attached = false;

  constructor(touchController: TouchController) {
    this.touchController = touchController;
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.touchController.setLeftStick(this.touchController.getState().leftStickX, -1);
        this.touchController.setButton('accelerate', true);
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.touchController.setLeftStick(this.touchController.getState().leftStickX, 1);
        this.touchController.setButton('brake', true);
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.touchController.setLeftStick(-1, this.touchController.getState().leftStickY);
        this.touchController.setButton('steerLeft', true);
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.touchController.setLeftStick(1, this.touchController.getState().leftStickY);
        this.touchController.setButton('steerRight', true);
        break;
      case 'Space':
        this.touchController.setButton('handbrake', true);
        this.touchController.setButton('buttonX', true); // Jump
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.touchController.setButton('buttonA', true); // Sprint
        break;
      case 'ControlLeft':
      case 'ControlRight':
        this.touchController.setButton('buttonB', true); // Crouch/Stealth
        break;
      case 'KeyF':
        this.touchController.setButton('buttonY', true); // Enter vehicle
        break;
      case 'KeyE':
        this.touchController.setButton('lb', true); // Action/Horn
        break;
      case 'KeyR':
        this.touchController.setButton('rb', true); // Reload
        break;
      case 'KeyQ':
        this.touchController.setButton('lt', true); // Cover/Aim
        break;
      case 'Tab':
        e.preventDefault();
        this.touchController.setButton('select', true); // Weapon wheel
        break;
      case 'Escape':
        this.touchController.setButton('pause', true);
        break;
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.touchController.setLeftStick(this.touchController.getState().leftStickX, 0);
        this.touchController.setButton('accelerate', false);
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.touchController.setLeftStick(this.touchController.getState().leftStickX, 0);
        this.touchController.setButton('brake', false);
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.touchController.setLeftStick(0, this.touchController.getState().leftStickY);
        this.touchController.setButton('steerLeft', false);
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.touchController.setLeftStick(0, this.touchController.getState().leftStickY);
        this.touchController.setButton('steerRight', false);
        break;
      case 'Space':
        this.touchController.setButton('handbrake', false);
        this.touchController.setButton('buttonX', false);
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.touchController.setButton('buttonA', false);
        break;
      case 'ControlLeft':
      case 'ControlRight':
        this.touchController.setButton('buttonB', false);
        break;
      case 'KeyF':
        this.touchController.setButton('buttonY', false);
        break;
      case 'KeyE':
        this.touchController.setButton('lb', false);
        break;
      case 'KeyR':
        this.touchController.setButton('rb', false);
        break;
      case 'KeyQ':
        this.touchController.setButton('lt', false);
        break;
      case 'Tab':
        this.touchController.setButton('select', false);
        break;
      case 'Escape':
        this.touchController.setButton('pause', false);
        break;
    }
  };

  public attach(): void {
    if (this.attached || typeof window === 'undefined') return;
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.attached = true;
  }

  public detach(): void {
    if (!this.attached || typeof window === 'undefined') return;
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.attached = false;
  }
}
