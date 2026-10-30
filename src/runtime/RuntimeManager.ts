import { CompatibilityEngine } from '../emulator/CompatibilityEngine.ts';
import { RuntimeLog, RuntimeStatus } from './GameRuntimeAdapter.ts';
import { RuntimeManifest } from './RuntimeManifest.ts';
import { DownloadManager, DownloadProgress } from '../downloads/DownloadManager.ts';

export class RuntimeManager {
  private engine: CompatibilityEngine;
  private downloadManager: DownloadManager = new DownloadManager();
  private manifest: RuntimeManifest | null = null;

  constructor(engine: CompatibilityEngine) {
    this.engine = engine;
  }

  public async detectRuntime(): Promise<boolean> {
    await this.engine.initialize();
    return this.engine.checkCompatibility();
  }

  public async downloadRuntime(onProgress?: (progress: DownloadProgress) => void): Promise<Uint8Array | null> {
    try {
      // Fetch manifest first
      const resp = await fetch('/runtime-manifests/gtav-web-runtime.json');
      if (resp.ok) {
        this.manifest = await resp.json();
      }

      // Download micro-runtime test chunk using streaming download manager
      const url = '/runtime-manifests/v86-micro-runtime.json';
      return await this.downloadManager.downloadFile(url, undefined, onProgress);
    } catch (e: any) {
      this.engine.addLog('error', `Runtime download failed: ${e.message}`);
      return null;
    }
  }

  public async verifyRuntime(): Promise<boolean> {
    this.engine.addLog('info', 'Verifying runtime integrity and signature...');
    try {
      await this.engine.loadRuntime();
      return true;
    } catch {
      return false;
    }
  }

  public async initializeRuntime(): Promise<void> {
    await this.engine.loadAuthorizedAssets();
  }

  public async mountFilesystem(): Promise<void> {
    await this.engine.mountFilesystem();
  }

  public async initializeGraphics(): Promise<void> {
    await this.engine.initializeGraphics();
  }

  public async initializeAudio(): Promise<void> {
    await this.engine.initializeAudio();
  }

  public async initializeInput(): Promise<void> {
    await this.engine.initializeInput();
  }

  public async startRuntime(): Promise<void> {
    await this.engine.startGame();
  }

  public async stopRuntime(): Promise<void> {
    await this.engine.pauseGame();
  }

  public async restartRuntime(): Promise<void> {
    await this.engine.pauseGame();
    await this.engine.startGame();
  }

  public getRuntimeStatus(): RuntimeStatus {
    return this.engine.getStatus();
  }

  public getRuntimeLogs(): RuntimeLog[] {
    return this.engine.getLogs();
  }

  public getEngine(): CompatibilityEngine {
    return this.engine;
  }

  public getDownloadManager(): DownloadManager {
    return this.downloadManager;
  }
}
