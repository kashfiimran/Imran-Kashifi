import { PlayerSettings } from '../storage/IndexedDBStorage.ts';

export interface PerformanceSnapshot {
  fps: number;
  frameTimeMs: number;
  jsHeapUsedMb: number | null;
  jsHeapTotalMb: number | null;
  memoryLimitMb: number | null;
  storageQuotaMb: number;
  storageUsageMb: number;
  activeMode: 'auto' | 'low' | 'medium' | 'high';
  effectiveResolutionScale: number;
}

export class PerformanceManager {
  private mode: 'auto' | 'low' | 'medium' | 'high' = 'auto';
  private frameTimes: number[] = [];
  private lastTime = 0;
  private currentFps = 60;
  private currentFrameTime = 16.6;

  constructor(initialMode: 'auto' | 'low' | 'medium' | 'high' = 'auto') {
    this.mode = initialMode;
    this.lastTime = performance.now();
  }

  public setMode(mode: 'auto' | 'low' | 'medium' | 'high'): void {
    this.mode = mode;
  }

  public recordFrame(timestamp: number): void {
    const delta = timestamp - this.lastTime;
    this.lastTime = timestamp;
    this.currentFrameTime = delta;

    this.frameTimes.push(delta);
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift();
    }

    const avgDelta = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.currentFps = avgDelta > 0 ? Math.round(1000 / avgDelta) : 60;
  }

  public getAdaptiveSettings(settings: PlayerSettings): {
    resolutionScale: number;
    textureQuality: 'low' | 'medium' | 'high';
    shadowQuality: 'off' | 'low' | 'medium' | 'high';
  } {
    if (this.mode === 'low') {
      return { resolutionScale: 0.75, textureQuality: 'low', shadowQuality: 'off' };
    }
    if (this.mode === 'medium') {
      return { resolutionScale: 1.0, textureQuality: 'medium', shadowQuality: 'low' };
    }
    if (this.mode === 'high') {
      return { resolutionScale: 1.25, textureQuality: 'high', shadowQuality: 'high' };
    }

    // Auto Mode: Adapt based on true observed FPS
    if (this.currentFps < 30) {
      return { resolutionScale: 0.75, textureQuality: 'low', shadowQuality: 'off' };
    } else if (this.currentFps < 50) {
      return { resolutionScale: 0.9, textureQuality: 'medium', shadowQuality: 'low' };
    } else {
      return {
        resolutionScale: settings.resolutionScale,
        textureQuality: settings.textureQuality,
        shadowQuality: settings.shadowQuality,
      };
    }
  }

  public async getSnapshot(storageQuota = 0, storageUsage = 0): Promise<PerformanceSnapshot> {
    let jsHeapUsedMb: number | null = null;
    let jsHeapTotalMb: number | null = null;
    let memoryLimitMb: number | null = null;

    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const mem = (performance as any).memory;
      jsHeapUsedMb = +(mem.usedJSHeapSize / (1024 * 1024)).toFixed(1);
      jsHeapTotalMb = +(mem.totalJSHeapSize / (1024 * 1024)).toFixed(1);
      memoryLimitMb = +(mem.jsHeapSizeLimit / (1024 * 1024)).toFixed(1);
    }

    return {
      fps: this.currentFps,
      frameTimeMs: +this.currentFrameTime.toFixed(1),
      jsHeapUsedMb,
      jsHeapTotalMb,
      memoryLimitMb,
      storageQuotaMb: +(storageQuota / (1024 * 1024)).toFixed(1),
      storageUsageMb: +(storageUsage / (1024 * 1024)).toFixed(1),
      activeMode: this.mode,
      effectiveResolutionScale: 1.0,
    };
  }
}
