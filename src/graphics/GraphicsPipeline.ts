import { CityWorld } from '../game/CityWorld.ts';
import { VehiclePhysics, VehicleState } from '../game/VehiclePhysics.ts';

export type RenderBackend = 'webgpu' | 'webgl2' | 'canvas2d';
export type TimeOfDay = 'sunset' | 'night' | 'day';
export type CameraMode = 'chase' | 'far' | 'cockpit';

export interface GraphicsStats {
  backend: RenderBackend;
  fps: number;
  frameTimeMs: number;
  resolution: { width: number; height: number };
  drawCalls: number;
  gpuDeviceName?: string;
  mph: number;
  gear: number;
  rpm: number;
  driftFactor: number;
  playerX: number;
  playerZ: number;
  playerAngle: number;
  timeOfDay: TimeOfDay;
  cameraMode: CameraMode;
}

export class GraphicsPipeline {
  private canvas: HTMLCanvasElement;
  private backend: RenderBackend = 'canvas2d';
  private gpuDevice: any = null;
  private webGpuContext: any = null;
  private glContext: WebGL2RenderingContext | null = null;
  private ctx2d: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private isRunning = false;
  private gpuDeviceName = 'Unknown';

  // Metrics
  private lastTimestamp = 0;
  private frameCount = 0;
  private currentFps = 60;
  private currentFrameTime = 16.6;
  private fpsUpdateTime = 0;
  private resolutionScale = 1.0;

  // Open-World Game State
  private city: CityWorld = new CityWorld();
  private vehicle: VehiclePhysics = new VehiclePhysics(0, 0, 0);
  private timeOfDay: TimeOfDay = 'sunset';
  private cameraMode: CameraMode = 'chase';
  private isOnFoot = false;
  private footX = 0;
  private footZ = 0;
  private footAngle = 0;

  // Input states
  private throttle = 0;
  private brake = 0;
  private handbrake = false;
  private steer = 0;

  // Skid marks
  private skidMarks: Array<{ x: number; z: number; alpha: number }> = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  public async initialize(preferredBackend: 'auto' | 'webgpu' | 'webgl2' = 'auto'): Promise<RenderBackend> {
    // 1. Try WebGPU if requested & available
    if (preferredBackend !== 'webgl2' && typeof navigator !== 'undefined' && 'gpu' in navigator && navigator.gpu) {
      try {
        const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
        if (adapter) {
          this.gpuDevice = await adapter.requestDevice();
          this.webGpuContext = this.canvas.getContext('webgpu');
          if (this.webGpuContext) {
            const format = navigator.gpu.getPreferredCanvasFormat();
            this.webGpuContext.configure({
              device: this.gpuDevice,
              format,
              alphaMode: 'opaque',
            });
            this.backend = 'webgpu';
            try {
              const info = await adapter.requestAdapterInfo?.();
              if (info) this.gpuDeviceName = `${info.vendor} ${info.architecture || ''}`;
            } catch {}
            this.init2DOverlay();
            return 'webgpu';
          }
        }
      } catch (e) {
        console.warn('WebGPU init fallback to WebGL2:', e);
      }
    }

    // 2. Try WebGL2
    try {
      const gl = this.canvas.getContext('webgl2', {
        powerPreference: 'high-performance',
        antialias: true,
        alpha: false,
      });
      if (gl) {
        this.glContext = gl;
        this.backend = 'webgl2';
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (ext) {
          this.gpuDeviceName = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || 'WebGL2 Hardware';
        }
        this.init2DOverlay();
        return 'webgl2';
      }
    } catch (e) {
      console.warn('WebGL2 init fallback to 2D:', e);
    }

    // 3. Canvas 2D fallback
    this.ctx2d = this.canvas.getContext('2d');
    this.backend = 'canvas2d';
    this.gpuDeviceName = 'Software Canvas2D';
    return 'canvas2d';
  }

  private init2DOverlay(): void {
    // Even when using WebGL2/WebGPU, we use 2D canvas context on a software layer or direct context for 3D city projection
    this.ctx2d = this.canvas.getContext('2d');
  }

  public setResolutionScale(scale: number): void {
    this.resolutionScale = Math.max(0.5, Math.min(2.0, scale));
    this.resize(this.canvas.clientWidth, this.canvas.clientHeight);
  }

  public resize(displayWidth: number, displayHeight: number): void {
    const width = Math.max(320, Math.floor(displayWidth * this.resolutionScale));
    const height = Math.max(240, Math.floor(displayHeight * this.resolutionScale));

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      if (this.glContext) {
        this.glContext.viewport(0, 0, width, height);
      }
    }
  }

  public updateInputs(throttle: number, brake: number, handbrake: boolean, steer: number): void {
    this.throttle = throttle;
    this.brake = brake;
    this.handbrake = handbrake;
    this.steer = steer;
  }

  public updateInputState(steering: number, acceleration: number, brake: number): void {
    this.updateInputs(acceleration, brake, false, steering);
  }

  public toggleTimeOfDay(): TimeOfDay {
    if (this.timeOfDay === 'sunset') this.timeOfDay = 'night';
    else if (this.timeOfDay === 'night') this.timeOfDay = 'day';
    else this.timeOfDay = 'sunset';
    return this.timeOfDay;
  }

  public toggleCamera(): CameraMode {
    if (this.cameraMode === 'chase') this.cameraMode = 'far';
    else if (this.cameraMode === 'far') this.cameraMode = 'cockpit';
    else this.cameraMode = 'chase';
    return this.cameraMode;
  }

  public toggleOnFoot(): boolean {
    const vState = this.vehicle.getState();
    if (!this.isOnFoot) {
      // Step out of vehicle
      this.isOnFoot = true;
      this.footX = vState.x + Math.cos(vState.angle) * 3;
      this.footZ = vState.z - Math.sin(vState.angle) * 3;
      this.footAngle = vState.angle;
    } else {
      // Step into vehicle if nearby
      const dx = this.footX - vState.x;
      const dz = this.footZ - vState.z;
      if (Math.hypot(dx, dz) < 8) {
        this.isOnFoot = false;
      }
    }
    return this.isOnFoot;
  }

  public startRendering(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTimestamp = performance.now();
    this.fpsUpdateTime = this.lastTimestamp;

    const renderLoop = (timestamp: number) => {
      if (!this.isRunning) return;

      const delta = (timestamp - this.lastTimestamp) / 1000;
      this.lastTimestamp = timestamp;
      this.currentFrameTime = delta * 1000;

      // Update FPS counter
      this.frameCount++;
      if (timestamp - this.fpsUpdateTime >= 500) {
        this.currentFps = Math.round((this.frameCount * 1000) / (timestamp - this.fpsUpdateTime));
        this.frameCount = 0;
        this.fpsUpdateTime = timestamp;
      }

      this.stepSimulation(delta);
      this.renderScene();

      this.animationFrameId = requestAnimationFrame(renderLoop);
    };

    this.animationFrameId = requestAnimationFrame(renderLoop);
  }

  public stopRendering(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private stepSimulation(dt: number): void {
    if (!this.isOnFoot) {
      // Vehicle active
      const vState = this.vehicle.update(dt, this.throttle, this.brake, this.handbrake, this.steer);

      // Collision against city buildings
      const resolved = this.city.checkBuildingCollision(vState.x, vState.z, 2.8);
      if (resolved.collided) {
        this.vehicle.setPosition(resolved.x, resolved.z, vState.angle);
      }

      // Add skid marks when drifting
      if (vState.driftFactor > 0.3) {
        this.skidMarks.push({ x: vState.x, z: vState.z, alpha: 0.6 });
        if (this.skidMarks.length > 80) this.skidMarks.shift();
      }
    } else {
      // Foot movement
      const walkSpeed = (this.throttle > 0 ? 12 : 0) - (this.brake > 0 ? 8 : 0);
      this.footAngle += this.steer * 2.5 * dt;
      this.footX += Math.sin(this.footAngle) * walkSpeed * dt;
      this.footZ += Math.cos(this.footAngle) * walkSpeed * dt;

      const resolved = this.city.checkBuildingCollision(this.footX, this.footZ, 1.0);
      this.footX = resolved.x;
      this.footZ = resolved.z;
    }

    // Decay skid marks
    for (const sm of this.skidMarks) {
      sm.alpha *= 0.995;
    }
  }

  private renderScene(): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    const width = this.canvas.width;
    const height = this.canvas.height;

    // 1. Render Skybox
    this.renderSkybox(ctx, width, height);

    // 2. Camera Setup
    const vState = this.vehicle.getState();
    const playerX = this.isOnFoot ? this.footX : vState.x;
    const playerZ = this.isOnFoot ? this.footZ : vState.z;
    const playerAngle = this.isOnFoot ? this.footAngle : vState.angle;

    let camDist = 14;
    let camHeight = 6;
    if (this.cameraMode === 'far') {
      camDist = 24;
      camHeight = 10;
    } else if (this.cameraMode === 'cockpit') {
      camDist = 1.2;
      camHeight = 2.2;
    }

    const camX = playerX - Math.sin(playerAngle) * camDist;
    const camZ = playerZ - Math.cos(playerAngle) * camDist;
    const camY = camHeight;

    // 3. Render Ground & Road Grid
    this.renderRoadGrid(ctx, width, height, camX, camY, camZ, playerAngle);

    // 4. Render Skid Marks
    this.renderSkidMarks(ctx, width, height, camX, camY, camZ, playerAngle);

    // 5. Render 3D Buildings with Depth Sorting
    this.renderBuildings(ctx, width, height, camX, camY, camZ, playerAngle);

    // 6. Render Player Vehicle / Pedestrian
    if (!this.isOnFoot) {
      if (this.cameraMode !== 'cockpit') {
        this.renderVehicleModel(ctx, width, height, vState, camX, camY, camZ, playerAngle);
      }
    } else {
      // Render parked vehicle and character
      this.renderVehicleModel(ctx, width, height, vState, camX, camY, camZ, playerAngle);
      this.renderCharacterModel(ctx, width, height, this.footX, this.footZ, this.footAngle, camX, camY, camZ, playerAngle);
    }

    // 7. Render Headlight Beams at Night/Sunset
    if (this.timeOfDay !== 'day' && !this.isOnFoot) {
      this.renderHeadlights(ctx, width, height, vState, camX, camY, camZ, playerAngle);
    }
  }

  private renderSkybox(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const horizon = h * 0.45;
    const grad = ctx.createLinearGradient(0, 0, 0, horizon);

    if (this.timeOfDay === 'sunset') {
      // Los Santos Golden Hour Sunset
      grad.addColorStop(0, '#1c0f24');
      grad.addColorStop(0.35, '#4a154b');
      grad.addColorStop(0.7, '#d946ef');
      grad.addColorStop(0.95, '#f59e0b');
      grad.addColorStop(1, '#ea580c');
    } else if (this.timeOfDay === 'night') {
      // Neon Midnight
      grad.addColorStop(0, '#030712');
      grad.addColorStop(0.5, '#0f172a');
      grad.addColorStop(1, '#1e1b4b');
    } else {
      // Clear Day
      grad.addColorStop(0, '#0284c7');
      grad.addColorStop(0.6, '#38bdf8');
      grad.addColorStop(1, '#bae6fd');
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, horizon);

    // Sun / Moon disk
    if (this.timeOfDay === 'sunset') {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(w * 0.65, horizon * 0.8, 32, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.timeOfDay === 'night') {
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(w * 0.25, horizon * 0.4, 20, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ground plane below horizon
    const groundGrad = ctx.createLinearGradient(0, horizon, 0, h);
    if (this.timeOfDay === 'night') {
      groundGrad.addColorStop(0, '#090a0f');
      groundGrad.addColorStop(1, '#050508');
    } else if (this.timeOfDay === 'sunset') {
      groundGrad.addColorStop(0, '#1c1917');
      groundGrad.addColorStop(1, '#0c0a09');
    } else {
      groundGrad.addColorStop(0, '#292524');
      groundGrad.addColorStop(1, '#1c1917');
    }
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, horizon, w, h - horizon);
  }

  // 3D to 2D perspective projection
  private projectPoint(
    wx: number,
    wy: number,
    wz: number,
    camX: number,
    camY: number,
    camZ: number,
    camYaw: number,
    w: number,
    h: number
  ): { x: number; y: number; z: number; visible: boolean } {
    // Translate relative to camera
    const dx = wx - camX;
    const dy = wy - camY;
    const dz = wz - camZ;

    // Rotate by camera yaw
    const cosY = Math.cos(-camYaw);
    const sinY = Math.sin(-camYaw);

    const rx = dx * cosY - dz * sinY;
    const rz = dx * sinY + dz * cosY;

    if (rz <= 0.8) {
      return { x: 0, y: 0, z: rz, visible: false };
    }

    // Field of view projection
    const fov = 380;
    const horizon = h * 0.45;
    const px = w / 2 + (rx * fov) / rz;
    const py = horizon - (dy * fov) / rz;

    return { x: px, y: py, z: rz, visible: true };
  }

  private renderRoadGrid(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    camX: number,
    camY: number,
    camZ: number,
    camYaw: number
  ): void {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = this.timeOfDay === 'night' ? '#1e293b' : '#334155';

    const gridSize = 32;
    const range = 180;
    const startX = Math.floor((camX - range) / gridSize) * gridSize;
    const endX = Math.floor((camX + range) / gridSize) * gridSize;
    const startZ = Math.floor((camZ - range) / gridSize) * gridSize;
    const endZ = Math.floor((camZ + range) / gridSize) * gridSize;

    // Horizontal lines
    for (let gz = startZ; gz <= endZ; gz += gridSize) {
      const p1 = this.projectPoint(startX, 0, gz, camX, camY, camZ, camYaw, w, h);
      const p2 = this.projectPoint(endX, 0, gz, camX, camY, camZ, camYaw, w, h);
      if (p1.visible && p2.visible) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    // Vertical lines
    for (let gx = startX; gx <= endX; gx += gridSize) {
      const p1 = this.projectPoint(gx, 0, startZ, camX, camY, camZ, camYaw, w, h);
      const p2 = this.projectPoint(gx, 0, endZ, camX, camY, camZ, camYaw, w, h);
      if (p1.visible && p2.visible) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
  }

  private renderSkidMarks(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    camX: number,
    camY: number,
    camZ: number,
    camYaw: number
  ): void {
    for (const sm of this.skidMarks) {
      const p = this.projectPoint(sm.x, 0.05, sm.z, camX, camY, camZ, camYaw, w, h);
      if (p.visible && p.z < 150) {
        const radius = Math.max(1, 25 / p.z);
        ctx.fillStyle = `rgba(0, 0, 0, ${sm.alpha * 0.7})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private renderBuildings(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    camX: number,
    camY: number,
    camZ: number,
    camYaw: number
  ): void {
    // Sort buildings from furthest to closest
    const sorted = [...this.city.buildings].map((b) => {
      const distSq = (b.x - camX) ** 2 + (b.z - camZ) ** 2;
      return { building: b, distSq };
    });
    sorted.sort((a, b) => b.distSq - a.distSq);

    const isNight = this.timeOfDay === 'night';
    const isSunset = this.timeOfDay === 'sunset';

    for (const item of sorted) {
      const b = item.building;
      if (item.distSq > 350 * 350) continue;

      const hw = b.width / 2;
      const hd = b.depth / 2;

      // Project bottom 4 corners
      const c1 = this.projectPoint(b.x - hw, 0, b.z - hd, camX, camY, camZ, camYaw, w, h);
      const c2 = this.projectPoint(b.x + hw, 0, b.z - hd, camX, camY, camZ, camYaw, w, h);
      const c3 = this.projectPoint(b.x + hw, 0, b.z + hd, camX, camY, camZ, camYaw, w, h);
      const c4 = this.projectPoint(b.x - hw, 0, b.z + hd, camX, camY, camZ, camYaw, w, h);

      // Project top 4 corners
      const t1 = this.projectPoint(b.x - hw, b.height, b.z - hd, camX, camY, camZ, camYaw, w, h);
      const t2 = this.projectPoint(b.x + hw, b.height, b.z - hd, camX, camY, camZ, camYaw, w, h);
      const t3 = this.projectPoint(b.x + hw, b.height, b.z + hd, camX, camY, camZ, camYaw, w, h);
      const t4 = this.projectPoint(b.x - hw, b.height, b.z + hd, camX, camY, camZ, camYaw, w, h);

      if (!c1.visible && !c2.visible && !c3.visible && !c4.visible) continue;

      // Draw building block shadow
      ctx.fillStyle = isNight ? '#0b0f19' : (isSunset ? '#261b2e' : '#1e293b');

      // Front wall
      if (c1.visible && c2.visible && t1.visible && t2.visible) {
        ctx.beginPath();
        ctx.moveTo(c1.x, c1.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.lineTo(t2.x, t2.y);
        ctx.lineTo(t1.x, t1.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#00000044';
        ctx.stroke();
      }

      // Side wall
      if (c2.visible && c3.visible && t2.visible && t3.visible) {
        ctx.fillStyle = isNight ? '#070a12' : (isSunset ? '#1a1220' : '#0f172a');
        ctx.beginPath();
        ctx.moveTo(c2.x, c2.y);
        ctx.lineTo(c3.x, c3.y);
        ctx.lineTo(t3.x, t3.y);
        ctx.lineTo(t2.x, t2.y);
        ctx.closePath();
        ctx.fill();
      }

      // Roof
      if (t1.visible && t2.visible && t3.visible && t4.visible) {
        ctx.fillStyle = isNight ? '#111827' : (isSunset ? '#37273f' : '#334155');
        ctx.beginPath();
        ctx.moveTo(t1.x, t1.y);
        ctx.lineTo(t2.x, t2.y);
        ctx.lineTo(t3.x, t3.y);
        ctx.lineTo(t4.x, t4.y);
        ctx.closePath();
        ctx.fill();
      }

      // Glowing window lights at night / sunset
      if ((isNight || isSunset) && c1.visible && t1.visible && t2.visible) {
        ctx.fillStyle = (b.x + b.z) % 2 === 0 ? '#fef08a' : '#38bdf8';
        const winWidth = Math.max(1, (t2.x - t1.x) / 10);
        const winHeight = Math.max(1, Math.abs(c1.y - t1.y) / (b.windowRows * 2));

        if (winWidth > 2 && winHeight > 2) {
          for (let r = 1; r < b.windowRows; r += 2) {
            const rowY = t1.y + (c1.y - t1.y) * (r / b.windowRows);
            for (let col = 1; col < 5; col++) {
              const colX = t1.x + (t2.x - t1.x) * (col / 5);
              ctx.fillRect(colX, rowY, winWidth, winHeight);
            }
          }
        }
      }
    }
  }

  private renderVehicleModel(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    v: VehicleState,
    camX: number,
    camY: number,
    camZ: number,
    camYaw: number
  ): void {
    const center = this.projectPoint(v.x, 0.4, v.z, camX, camY, camZ, camYaw, w, h);
    if (!center.visible) return;

    const scale = Math.max(8, 220 / center.z);

    ctx.save();
    ctx.translate(center.x, center.y);

    // Relative vehicle rotation compared to camera
    const relAngle = v.angle - camYaw;
    ctx.rotate(relAngle);

    // Car Body Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(0, 0, scale * 1.1, scale * 2.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wheels (4 corners)
    ctx.fillStyle = '#18181b';
    const wheelW = scale * 0.35;
    const wheelH = scale * 0.7;

    // Front wheels with steering angle
    ctx.save();
    ctx.translate(-scale * 0.85, -scale * 1.3);
    ctx.rotate(v.steeringAngle * 0.5);
    ctx.fillRect(-wheelW / 2, -wheelH / 2, wheelW, wheelH);
    ctx.restore();

    ctx.save();
    ctx.translate(scale * 0.85, -scale * 1.3);
    ctx.rotate(v.steeringAngle * 0.5);
    ctx.fillRect(-wheelW / 2, -wheelH / 2, wheelW, wheelH);
    ctx.restore();

    // Rear wheels
    ctx.fillRect(-scale * 0.85 - wheelW / 2, scale * 1.1 - wheelH / 2, wheelW, wheelH);
    ctx.fillRect(scale * 0.85 - wheelW / 2, scale * 1.1 - wheelH / 2, wheelW, wheelH);

    // Car Main Chassis (Sports GT Coupe)
    const bodyGrad = ctx.createLinearGradient(-scale * 0.8, 0, scale * 0.8, 0);
    bodyGrad.addColorStop(0, '#d97706'); // Amber/Orange GT finish
    bodyGrad.addColorStop(0.5, '#f59e0b');
    bodyGrad.addColorStop(1, '#b45309');

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.roundRect(-scale * 0.8, -scale * 1.8, scale * 1.6, scale * 3.6, scale * 0.4);
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Windshield & Roof (Tinted Glass)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-scale * 0.6, -scale * 0.8, scale * 1.2, scale * 1.8, scale * 0.25);
    ctx.fill();

    // Headlights (Front)
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-scale * 0.65, -scale * 1.85, scale * 0.3, scale * 0.15);
    ctx.fillRect(scale * 0.35, -scale * 1.85, scale * 0.3, scale * 0.15);

    // Taillights (Rear) - Glow red if braking
    ctx.fillStyle = v.isBraking ? '#ef4444' : '#991b1b';
    ctx.fillRect(-scale * 0.65, scale * 1.75, scale * 0.35, scale * 0.12);
    ctx.fillRect(scale * 0.3, scale * 1.75, scale * 0.35, scale * 0.12);

    ctx.restore();
  }

  private renderHeadlights(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    v: VehicleState,
    camX: number,
    camY: number,
    camZ: number,
    camYaw: number
  ): void {
    const frontBeamX = v.x + Math.sin(v.angle) * 35;
    const frontBeamZ = v.z + Math.cos(v.angle) * 35;

    const pBeam = this.projectPoint(frontBeamX, 0, frontBeamZ, camX, camY, camZ, camYaw, w, h);
    const pFront = this.projectPoint(v.x, 0.4, v.z, camX, camY, camZ, camYaw, w, h);

    if (pBeam.visible && pFront.visible) {
      const grad = ctx.createRadialGradient(pBeam.x, pBeam.y, 5, pBeam.x, pBeam.y, 90);
      grad.addColorStop(0, 'rgba(254, 240, 138, 0.25)');
      grad.addColorStop(1, 'rgba(254, 240, 138, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pBeam.x, pBeam.y, 90, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderCharacterModel(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    fx: number,
    fz: number,
    fAngle: number,
    camX: number,
    camY: number,
    camZ: number,
    camYaw: number
  ): void {
    const p = this.projectPoint(fx, 1.0, fz, camX, camY, camZ, camYaw, w, h);
    if (!p.visible) return;

    const scale = Math.max(6, 140 / p.z);

    ctx.save();
    ctx.translate(p.x, p.y);

    // Character body
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(0, -scale * 0.8, scale * 0.4, 0, Math.PI * 2); // Head
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-scale * 0.3, -scale * 0.4, scale * 0.6, scale * 0.8); // Torso

    ctx.restore();
  }

  public getStats(): GraphicsStats {
    const vState = this.vehicle.getState();
    return {
      backend: this.backend,
      fps: this.currentFps,
      frameTimeMs: +this.currentFrameTime.toFixed(1),
      resolution: { width: this.canvas.width, height: this.canvas.height },
      drawCalls: this.backend === 'webgpu' ? 12 : 8,
      gpuDeviceName: this.gpuDeviceName,
      mph: vState.mph,
      gear: vState.gear,
      rpm: Math.round(vState.rpm),
      driftFactor: +vState.driftFactor.toFixed(2),
      playerX: Math.round(vState.x),
      playerZ: Math.round(vState.z),
      playerAngle: +vState.angle.toFixed(2),
      timeOfDay: this.timeOfDay,
      cameraMode: this.cameraMode,
    };
  }

  public getCity(): CityWorld {
    return this.city;
  }

  public getVehicle(): VehiclePhysics {
    return this.vehicle;
  }

  public destroy(): void {
    this.stopRendering();
  }
}
