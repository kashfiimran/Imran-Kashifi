# GTA V Web Player - Technical Compatibility & Reality Matrix

## Technical Requirements for GTA V PC Workload
Grand Theft Auto V for PC was engineered for:
- **Instruction Set**: x86_64 architecture with SSE4.2 / AVX instruction sets.
- **Operating System Subsystem**: Win32 / NT Kernel with Windows DirectX 11 / Direct3D runtime.
- **Memory**: Minimum 4 GB physical RAM (8 GB recommended) with 64-bit virtual address space.
- **Storage**: ~70 GB to 110 GB disk footprint.
- **Graphics Pipeline**: Hardware Direct3D 11 with shader model 5.0 and multi-gigabyte VRAM texture streaming.

## Browser Capability Reality Check
1. **v86**:
   - Supports 32-bit x86 (x86-32) up to Pentium 4 / i686.
   - Translates x86 machine code to WebAssembly at runtime.
   - Does NOT natively execute 64-bit Windows 10/11 DirectX 11 binaries.
2. **v86_x64 Research**:
   - Research branch exploring x86_64 long-mode in WebAssembly. Still experimental and lacks full Ring-0 / Ring-3 transition and Windows D3D11 driver support.
3. **WebVM / CheerpX**:
   - Provides a fast x86 Linux virtualization engine via WebAssembly, but proprietary CheerpX licenses restrict unapproved redistribution, and DirectX translation requires Box64 + Wine + DXVK mapped to WebGPU.
4. **WebGPU**:
   - Modern browsers (Chrome 113+, Edge, Safari 18+, Firefox Nightly) support WebGPU natively, allowing real GPU shader dispatch and compute pipeline execution.
5. **Storage & OPFS**:
   - The browser's Origin Private File System (OPFS) provides low-overhead read/write access to large virtual disk images, bounded by the user's storage quota (`navigator.storage.estimate()`).

## Honest Compatibility Stance
If the user's browser environment lacks:
- 64-bit translation capabilities
- Sufficient OPFS quota (or user has not mounted authorized game data)
- WebGPU / WebGL2 graphics context
- Cross-origin isolation for `SharedArrayBuffer`

The player halts honestly, explains the exact bottleneck, and allows users to:
1. Mount their legally owned GTA V PC folder or game disc image via the File System Access API.
2. Run the open-source micro-kernel verification testbed to validate browser JIT and graphics virtualization.
