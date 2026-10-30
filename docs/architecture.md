# GTA V Web Player - System Architecture

## Overview
GTA V Web Player is a 100% browser-delivered runtime player and compatibility execution engine designed to bring desktop gaming workloads to modern web browsers via standard APIs.

## Execution Pipeline
```
[User Browser]
       │
       ▼
[Capability Detector] ── (CPU, RAM, SharedArrayBuffer, WebGPU, WebGL2, OPFS, WASM SIMD)
       │
       ├── If Incompatible ──► [Honest Diagnostic Error Screen & Hardware Requirements Breakdown]
       │
       ▼
[Runtime Manager] ────► [Download & Storage Manager (IndexedDB + OPFS Cache)]
       │
       ▼
[GameRuntimeAdapter]
       ├── [Graphics Pipeline: WebGPU Primary -> WebGL2 Fallback]
       ├── [Audio Pipeline: Web Audio API (Master, Music, SFX Gains)]
       ├── [Input Pipeline: Multi-Touch On-Screen Analog & Buttons + Gamepad API + Desktop Keyboard]
       └── [Storage / Filesystem: OPFS Virtual Disk Mount + File System Access API]
       │
       ▼
[Active Game Screen / Canvas] (Real-time dynamic GPU rendering with real FPS and frame pacing)
```

## Security & Isolation
- Cross-Origin Isolation (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`) enables `SharedArrayBuffer` for high-throughput multi-threaded emulation.
- Sandboxed Origin Private File System (OPFS) prevents host filesystem contamination.
- Cryptographic SHA-256 validation on all runtime chunks before execution.
