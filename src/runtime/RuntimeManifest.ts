/**
 * Runtime Manifest interface definition
 */

export interface RuntimeRequirements {
  minMemoryBytes: number;
  webGpuRequired: boolean;
  sharedArrayBufferRequired: boolean;
  crossOriginIsolatedRequired: boolean;
  minStorageBytes: number;
  instructionSet: string;
  directXVersion: string;
}

export interface RuntimeManifest {
  name: string;
  version: string;
  architecture: string;
  source: string;
  license: string;
  sha256: string;
  size: string;
  entrypoint: string;
  requirements?: RuntimeRequirements;
}

export interface CapabilityReport {
  cpuCores: number;
  memoryGb: number;
  hasWebAssembly: boolean;
  hasWasmSimd: boolean;
  hasWasmThreads: boolean;
  hasWebGPU: boolean;
  webGpuAdapterName?: string;
  hasWebGL2: boolean;
  webGlRenderer?: string;
  hasSharedArrayBuffer: boolean;
  isCrossOriginIsolated: boolean;
  storageEstimate: {
    quotaBytes: number;
    usageBytes: number;
    availableBytes: number;
    quotaGb: number;
  };
  hasOPFS: boolean;
  hasFileSystemAccess: boolean;
  hasGamepadAPI: boolean;
  hasPointerLock: boolean;
  hasWebAudio: boolean;
  canExecuteX86_64: boolean;
  canExecuteDirectX11: boolean;
  allChecksPassed: boolean;
  failingChecks: string[];
}
