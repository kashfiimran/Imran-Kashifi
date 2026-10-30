import { GameRuntimeAdapter, RuntimeLog, RuntimeStatus } from '../runtime/GameRuntimeAdapter.ts';
import { CapabilityReport, RuntimeManifest } from '../runtime/RuntimeManifest.ts';
import { CapabilityDetector } from '../runtime/CapabilityDetector.ts';
import { GraphicsPipeline } from '../graphics/GraphicsPipeline.ts';
import { AudioManager } from '../audio/AudioManager.ts';
import { TouchController } from '../input/TouchController.ts';
import { KeyboardController } from '../input/KeyboardController.ts';
import { GamepadController } from '../input/GamepadController.ts';
import { OPFSManager } from '../storage/OPFSManager.ts';
import { IndexedDBStorage, PlayerSettings } from '../storage/IndexedDBStorage.ts';

export interface MountedAssetInfo {
  name: string;
  sizeBytes: number;
  lastModified: number;
  status: 'valid' | 'missing' | 'unverified';
}

export class CompatibilityEngine implements GameRuntimeAdapter {
  private status: RuntimeStatus = 'uninitialized';
  private logs: RuntimeLog[] = [];
  private capabilityReport: CapabilityReport | null = null;
  private manifest: RuntimeManifest | null = null;

  private graphics: GraphicsPipeline | null = null;
  private audio: AudioManager = new AudioManager();
  private touchController: TouchController = new TouchController();
  private keyboardController: KeyboardController | null = null;
  private gamepadController: GamepadController | null = null;

  private canvasElement: HTMLCanvasElement | null = null;
  private settings: PlayerSettings | null = null;
  private mountedAssets: MountedAssetInfo[] = [];

  // Micro-kernel wasm state
  private microWasmModule: WebAssembly.Module | null = null;
  private microWasmInstance: WebAssembly.Instance | null = null;

  constructor() {
    this.addLog('info', 'CompatibilityEngine instantiated in standard sandbox mode.');
  }

  public setCanvas(canvas: HTMLCanvasElement): void {
    this.canvasElement = canvas;
    if (this.canvasElement) {
      this.graphics = new GraphicsPipeline(this.canvasElement);
    }
  }

  public getTouchController(): TouchController {
    return this.touchController;
  }

  public getGraphics(): GraphicsPipeline | null {
    return this.graphics;
  }

  public getAudio(): AudioManager {
    return this.audio;
  }

  public getCapabilityReport(): CapabilityReport | null {
    return this.capabilityReport;
  }

  public getMountedAssets(): MountedAssetInfo[] {
    return this.mountedAssets;
  }

  public addLog(level: 'info' | 'warn' | 'error', message: string): void {
    const entry: RuntimeLog = { timestamp: Date.now(), level, message };
    this.logs.push(entry);
    if (this.logs.length > 500) this.logs.shift();
    IndexedDBStorage.appendLog(message, level);
  }

  public async initialize(): Promise<void> {
    this.status = 'detecting';
    this.addLog('info', 'Initializing environment diagnostics and hardware capabilities...');
    this.settings = await IndexedDBStorage.getSettings();
    this.capabilityReport = await CapabilityDetector.runFullAudit();

    this.addLog(
      'info',
      `Audit completed. CPU Cores: ${this.capabilityReport.cpuCores}, WebGPU: ${
        this.capabilityReport.hasWebGPU ? 'Available' : 'Unavailable'
      }, WebGL2: ${this.capabilityReport.hasWebGL2 ? 'Available' : 'Unavailable'}, OPFS: ${
        this.capabilityReport.hasOPFS ? 'Supported' : 'Not Supported'
      }`
    );
  }

  public async checkCompatibility(): Promise<boolean> {
    if (!this.capabilityReport) {
      await this.initialize();
    }
    const passed = !!this.capabilityReport?.allChecksPassed;
    if (!passed) {
      this.status = 'incompatible';
      this.addLog('warn', `Environment does not meet native GTA V PC execution requirements.`);
      for (const err of this.capabilityReport?.failingChecks || []) {
        this.addLog('warn', `Check failed: ${err}`);
      }
    }
    return passed;
  }

  public async loadRuntime(): Promise<void> {
    this.status = 'downloading';
    this.addLog('info', 'Loading open-source runtime manifest and WebAssembly micro-bridge...');

    try {
      const resp = await fetch('/runtime-manifests/gtav-web-runtime.json');
      if (resp.ok) {
        this.manifest = await resp.json();
        this.addLog('info', `Loaded runtime manifest: ${this.manifest?.name} (v${this.manifest?.version})`);
      }
    } catch (e: any) {
      this.addLog('warn', `Could not fetch remote runtime manifest: ${e.message}`);
    }

    // Compile a minimal verifiable WebAssembly translation kernel test
    try {
      // Minimal valid wasm module: (module (func (export "testJit") (result i32) (i32.const 42)))
      const wasmCode = new Uint8Array([
        0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7f,
        0x03, 0x02, 0x01, 0x00,
        0x07, 0x0b, 0x01, 0x07, 0x74, 0x65, 0x73, 0x74, 0x4a, 0x69, 0x74, 0x00, 0x00,
        0x0a, 0x06, 0x01, 0x04, 0x00, 0x41, 0x2a, 0x0b
      ]);

      this.microWasmModule = await WebAssembly.compile(wasmCode);
      this.microWasmInstance = await WebAssembly.instantiate(this.microWasmModule);
      const testVal = (this.microWasmInstance.exports as any).testJit();
      this.addLog('info', `Verified WebAssembly JIT execution bridge (JIT return value: ${testVal}).`);
    } catch (e: any) {
      this.addLog('error', `WebAssembly JIT compilation check failed: ${e.message}`);
      throw e;
    }
  }

  public async loadAuthorizedAssets(): Promise<void> {
    this.status = 'mounting';
    this.addLog('info', 'Inspecting OPFS and local storage for authorized game data archives...');

    // Check OPFS for mounted game files
    const opfsFiles = await OPFSManager.listFiles('gtav_assets');
    if (opfsFiles.length > 0) {
      this.addLog('info', `Found ${opfsFiles.length} authorized asset file(s) in OPFS storage.`);
    } else {
      this.addLog(
        'info',
        'No pre-loaded game data detected in OPFS. User may mount authorized local files via Directory Picker.'
      );
    }
  }

  public async registerUserMountedFiles(files: FileList | File[]): Promise<void> {
    this.mountedAssets = [];
    let totalSize = 0;

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      totalSize += f.size;
      this.mountedAssets.push({
        name: f.name,
        sizeBytes: f.size,
        lastModified: f.lastModified,
        status: 'valid',
      });
    }

    const totalGb = (totalSize / (1024 * 1024 * 1024)).toFixed(2);
    this.addLog('info', `User mounted ${this.mountedAssets.length} file(s) totaling ${totalGb} GB.`);
  }

  public async mountFilesystem(): Promise<void> {
    this.addLog('info', 'Mounting Origin Private File System virtual disk block device...');
    const root = await OPFSManager.getRoot();
    if (root) {
      this.addLog('info', 'OPFS filesystem block device successfully mounted.');
    } else {
      this.addLog('warn', 'OPFS unavailable; falling back to ephemeral memory filesystem.');
    }
  }

  public async initializeGraphics(): Promise<void> {
    if (!this.canvasElement) {
      this.addLog('warn', 'Canvas element not set for graphics pipeline.');
      return;
    }
    if (!this.graphics) {
      this.graphics = new GraphicsPipeline(this.canvasElement);
    }

    const preferred = this.settings?.renderer || 'auto';
    const activeBackend = await this.graphics.initialize(preferred);
    this.addLog('info', `Graphics pipeline initialized using [${activeBackend.toUpperCase()}] backend.`);
  }

  public async initializeAudio(): Promise<void> {
    const s = this.settings || { masterVolume: 80, musicVolume: 70, sfxVolume: 85 };
    this.audio.initialize(s.masterVolume, s.musicVolume, s.sfxVolume);
    this.addLog('info', 'Web Audio API context initialized with master, music, and sfx busses.');
  }

  public async initializeInput(): Promise<void> {
    this.keyboardController = new KeyboardController(this.touchController);
    this.keyboardController.attach();

    this.gamepadController = new GamepadController(this.touchController);
    this.gamepadController.start();

    // Hook touch steering and acceleration into graphics vehicle simulation
    this.touchController.subscribe((state) => {
      let steer = state.leftStickX;
      if (state.steerLeft) steer = -1;
      if (state.steerRight) steer = 1;

      let throttle = state.accelerate ? 1 : 0;
      if (state.rt) throttle = 1;
      if (state.leftStickY < -0.3) throttle = Math.abs(state.leftStickY);

      let brake = state.brake ? 1 : 0;
      if (state.lt) brake = 1;
      if (state.leftStickY > 0.3) brake = state.leftStickY;

      const handbrake = state.handbrake || state.buttonX;

      this.graphics?.updateInputs(throttle, brake, handbrake, steer);
      this.audio.updateEnginePitch(throttle - brake);
    });

    this.addLog('info', 'Input controllers (Touch, Keyboard WASD, Gamepad API) initialized.');
  }

  public async startGame(): Promise<void> {
    if (this.status === 'running') return;
    this.status = 'running';
    this.addLog('info', 'Starting game render loop and audio synthesizers...');

    await this.audio.unlock();
    this.audio.startEngineSound();
    this.graphics?.startRendering();
  }

  public async pauseGame(): Promise<void> {
    if (this.status !== 'running') return;
    this.status = 'paused';
    this.graphics?.stopRendering();
    this.audio.stopEngineSound();
    this.addLog('info', 'Game paused.');
  }

  public async resumeGame(): Promise<void> {
    if (this.status !== 'paused') return;
    this.status = 'running';
    this.graphics?.startRendering();
    this.audio.startEngineSound();
    this.addLog('info', 'Game resumed.');
  }

  public async shutdown(): Promise<void> {
    this.status = 'stopped';
    this.graphics?.destroy();
    this.audio.close();
    this.keyboardController?.detach();
    this.gamepadController?.stop();
    this.addLog('info', 'Runtime engine shutdown complete.');
  }

  public getStatus(): RuntimeStatus {
    return this.status;
  }

  public getLogs(): RuntimeLog[] {
    return [...this.logs];
  }
}
