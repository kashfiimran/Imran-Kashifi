/**
 * GameRuntimeAdapter interface contract as mandated by section 15 of specification.
 * Decouples future WebAssembly/v86/Wine64 translation cores from the UI shell.
 */

export type RuntimeStatus =
  | 'uninitialized'
  | 'detecting'
  | 'downloading'
  | 'verifying'
  | 'mounting'
  | 'ready'
  | 'running'
  | 'paused'
  | 'stopped'
  | 'incompatible';

export interface RuntimeLog {
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface GameRuntimeAdapter {
  initialize(): Promise<void>;
  checkCompatibility(): Promise<boolean>;
  loadRuntime(): Promise<void>;
  loadAuthorizedAssets(): Promise<void>;
  mountFilesystem(): Promise<void>;
  initializeGraphics(): Promise<void>;
  initializeAudio(): Promise<void>;
  initializeInput(): Promise<void>;
  startGame(): Promise<void>;
  pauseGame(): Promise<void>;
  resumeGame(): Promise<void>;
  shutdown(): Promise<void>;
  getStatus(): RuntimeStatus;
  getLogs(): RuntimeLog[];
}
