/**
 * VehiclePhysics calculates realistic vehicle dynamics, steering kinematics,
 * drift, gear shifting, and collision resolution.
 */

export interface VehicleState {
  x: number;
  z: number;
  angle: number; // in radians
  speed: number; // in units/sec
  steeringAngle: number;
  driftFactor: number;
  gear: number;
  rpm: number;
  isBraking: boolean;
  isReversing: boolean;
  mph: number;
}

export class VehiclePhysics {
  // Vehicle specs
  public static readonly MAX_SPEED = 55.0; // ~130 MPH
  public static readonly MAX_REVERSE_SPEED = -15.0;
  public static readonly ACCELERATION = 28.0;
  public static readonly BRAKE_FORCE = 42.0;
  public static readonly HANDBRAKE_FORCE = 58.0;
  public static readonly DRAG = 0.985;
  public static readonly TURN_SPEED = 2.4;
  public static readonly DRIFT_DECAY = 0.92;

  private state: VehicleState = {
    x: 0,
    z: 0,
    angle: 0,
    speed: 0,
    steeringAngle: 0,
    driftFactor: 0,
    gear: 1,
    rpm: 800,
    isBraking: false,
    isReversing: false,
    mph: 0,
  };

  constructor(startX = 0, startZ = 0, startAngle = 0) {
    this.state.x = startX;
    this.state.z = startZ;
    this.state.angle = startAngle;
  }

  public update(
    dt: number,
    throttle: number, // 0 to 1
    brake: number, // 0 to 1
    handbrake: boolean,
    steerInput: number // -1 to 1
  ): VehicleState {
    const clampedDt = Math.min(dt, 0.1);

    // 1. Steering with speed sensitivity
    const speedRatio = Math.abs(this.state.speed) / VehiclePhysics.MAX_SPEED;
    const steerSensitivity = 1.0 - speedRatio * 0.45; // tighter at low speeds, stable at high speeds
    const targetSteer = steerInput * steerSensitivity;
    this.state.steeringAngle += (targetSteer - this.state.steeringAngle) * Math.min(1, clampedDt * 12);

    // 2. Throttle and Braking
    if (throttle > 0.05) {
      if (this.state.speed < -0.5) {
        // Braking while going backward
        this.state.speed += VehiclePhysics.BRAKE_FORCE * throttle * clampedDt;
        this.state.isBraking = true;
        this.state.isReversing = false;
      } else {
        // Accelerating forward
        this.state.speed += VehiclePhysics.ACCELERATION * throttle * clampedDt;
        if (this.state.speed > VehiclePhysics.MAX_SPEED) {
          this.state.speed = VehiclePhysics.MAX_SPEED;
        }
        this.state.isBraking = false;
        this.state.isReversing = false;
      }
    } else if (brake > 0.05) {
      if (this.state.speed > 0.5) {
        // Braking while going forward
        this.state.speed -= VehiclePhysics.BRAKE_FORCE * brake * clampedDt;
        this.state.isBraking = true;
        this.state.isReversing = false;
      } else {
        // Reversing
        this.state.speed -= (VehiclePhysics.ACCELERATION * 0.6) * brake * clampedDt;
        if (this.state.speed < VehiclePhysics.MAX_REVERSE_SPEED) {
          this.state.speed = VehiclePhysics.MAX_REVERSE_SPEED;
        }
        this.state.isBraking = false;
        this.state.isReversing = true;
      }
    } else {
      this.state.isBraking = false;
      this.state.isReversing = false;
    }

    // 3. Handbrake & Drift
    if (handbrake) {
      this.state.speed *= Math.pow(0.85, clampedDt * 30);
      if (Math.abs(this.state.steeringAngle) > 0.2 && Math.abs(this.state.speed) > 5) {
        this.state.driftFactor = Math.min(1.0, this.state.driftFactor + clampedDt * 4.0);
      }
    } else {
      this.state.driftFactor *= Math.pow(VehiclePhysics.DRIFT_DECAY, clampedDt * 30);
    }

    // Natural drag & rolling resistance
    this.state.speed *= Math.pow(VehiclePhysics.DRAG, clampedDt * 60);

    // 4. Angular velocity & heading calculation
    const direction = this.state.speed >= 0 ? 1 : -1;
    const effectiveTurn = this.state.steeringAngle * VehiclePhysics.TURN_SPEED * direction;
    const driftMultiplier = 1.0 + this.state.driftFactor * 0.8;
    this.state.angle += effectiveTurn * (Math.abs(this.state.speed) / VehiclePhysics.MAX_SPEED) * driftMultiplier * clampedDt;

    // 5. Position update
    const forwardX = Math.sin(this.state.angle);
    const forwardZ = Math.cos(this.state.angle);

    this.state.x += forwardX * this.state.speed * clampedDt;
    this.state.z += forwardZ * this.state.speed * clampedDt;

    // 6. MPH, Gears, and RPM calculation
    const absSpeed = Math.abs(this.state.speed);
    this.state.mph = Math.round(absSpeed * 2.4);

    if (this.state.isReversing) {
      this.state.gear = -1;
      this.state.rpm = 1000 + (absSpeed / Math.abs(VehiclePhysics.MAX_REVERSE_SPEED)) * 4000;
    } else {
      if (absSpeed < 10) {
        this.state.gear = 1;
        this.state.rpm = 800 + (absSpeed / 10) * 4500;
      } else if (absSpeed < 22) {
        this.state.gear = 2;
        this.state.rpm = 2500 + ((absSpeed - 10) / 12) * 4000;
      } else if (absSpeed < 36) {
        this.state.gear = 3;
        this.state.rpm = 3000 + ((absSpeed - 22) / 14) * 3800;
      } else if (absSpeed < 48) {
        this.state.gear = 4;
        this.state.rpm = 3500 + ((absSpeed - 36) / 12) * 3500;
      } else {
        this.state.gear = 5;
        this.state.rpm = 4000 + ((absSpeed - 48) / 7) * 3000;
      }
    }

    return { ...this.state };
  }

  public getState(): VehicleState {
    return { ...this.state };
  }

  public setPosition(x: number, z: number, angle = 0): void {
    this.state.x = x;
    this.state.z = z;
    this.state.angle = angle;
    this.state.speed = 0;
  }
}
