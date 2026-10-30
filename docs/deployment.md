# Deployment & Production Guide

## Hosting Requirements
- **HTTPS Enforcement**: WebGPU, OPFS, and Service Workers require a secure origin (`https://` or `http://localhost`).
- **Cross-Origin Isolation Headers**:
  ```http
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  ```
- **MIME Types**:
  - `.wasm` -> `application/wasm`
  - `.webmanifest` -> `application/manifest+json`

## Build Commands
- Dev Server: `npm run dev`
- Production Build: `npm run build`
- Preview Build: `npm run preview`
