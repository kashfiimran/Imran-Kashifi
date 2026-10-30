import React from 'react';
import { CapabilityReport } from '../runtime/RuntimeManifest.ts';
import { AlertOctagon, CheckCircle2, ChevronRight, Cpu, HardDrive, Monitor, ShieldAlert, Wrench, XCircle } from 'lucide-react';

interface CompatibilityErrorScreenProps {
  report: CapabilityReport;
  onBack: () => void;
  onLaunchBenchmark: () => void;
  onMountAuthorizedFiles: () => void;
  onShowDiagnostics: () => void;
}

export const CompatibilityErrorScreen: React.FC<CompatibilityErrorScreenProps> = ({
  report,
  onBack,
  onLaunchBenchmark,
  onMountAuthorizedFiles,
  onShowDiagnostics,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/95 text-zinc-100 backdrop-blur-xl overflow-y-auto p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6 pb-6 border-b border-zinc-800">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-500 shrink-0">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-mono font-bold uppercase tracking-wider mb-1.5">
              Compatibility & Architecture Reality Check
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-zinc-100">
              Native GTA V PC Execution Restriction
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 leading-relaxed">
              Grand Theft Auto V PC is compiled for 64-bit x86 (x86_64) architecture with Direct3D 11 and requires ~65 GB uncompressed storage. The browser runtime has evaluated your device's capabilities below.
            </p>
          </div>
        </div>

        {/* Detailed Hardware Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 font-mono text-xs">
          {/* CPU Architecture */}
          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-start gap-3">
            <Cpu className="w-5 h-5 text-zinc-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-sans font-semibold text-zinc-300">CPU & Architecture</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                {report.cpuCores} Logic Cores Detected
              </div>
              <div className="flex items-center gap-1.5 text-[10px] mt-1.5">
                <XCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-amber-300">x86_64 long-mode in research (v86_x64)</span>
              </div>
            </div>
          </div>

          {/* Graphics Pipeline */}
          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-start gap-3">
            <Monitor className="w-5 h-5 text-zinc-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-sans font-semibold text-zinc-300">Graphics Acceleration</div>
              <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
                {report.hasWebGPU ? `WebGPU: ${report.webGpuAdapterName || 'Active'}` : (report.hasWebGL2 ? 'WebGL2 Active' : 'Software 2D')}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] mt-1.5">
                {report.hasWebGPU ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-emerald-300">WebGPU Shader Core Online</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-amber-300">DirectX 11 requires WebGPU WGSL</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Storage / OPFS */}
          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-start gap-3">
            <HardDrive className="w-5 h-5 text-zinc-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-sans font-semibold text-zinc-300">Storage Quota & OPFS</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                {report.storageEstimate.quotaGb} GB Estimated Quota
              </div>
              <div className="flex items-center gap-1.5 text-[10px] mt-1.5">
                {report.storageEstimate.quotaGb >= 65 ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-emerald-300">Sufficient storage quota</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-amber-300">Below ~65 GB game file footprint</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Cross-Origin Isolation */}
          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 text-zinc-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-sans font-semibold text-zinc-300">Multi-Threading & SAB</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                COOP / COEP Isolation
              </div>
              <div className="flex items-center gap-1.5 text-[10px] mt-1.5">
                {report.isCrossOriginIsolated ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-emerald-300">SharedArrayBuffer Enabled</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-amber-300">COOP/COEP Headers Restricted</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Diagnostic Failing Checks List */}
        <div className="mb-6 p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 text-xs">
          <div className="font-bold text-rose-400 mb-2 flex items-center gap-1.5">
            <AlertOctagon className="w-4 h-4 shrink-0" />
            Specific Bottlenecks Identified:
          </div>
          <ul className="space-y-1.5 text-zinc-300 list-disc list-inside text-[11px] leading-relaxed">
            {report.failingChecks.map((check, idx) => (
              <li key={idx} className="text-zinc-300">
                <span className="text-zinc-200">{check}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Pathways */}
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Available Verified Pathways:
          </div>

          {/* Option A: Run the Free Version 3D City Sandbox */}
          <button
            type="button"
            onClick={onLaunchBenchmark}
            className="w-full p-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black text-sm tracking-wide transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98] flex items-center justify-between"
          >
            <div className="flex items-center gap-3 text-left">
              <Wrench className="w-5 h-5 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span>Play GTA V Free Roam City Edition</span>
                  <span className="px-1.5 py-0.2 bg-zinc-950 text-amber-400 text-[9px] font-bold rounded">FREE</span>
                </div>
                <div className="text-[11px] font-normal text-zinc-900 opacity-90 mt-0.5">
                  Play directly in browser • Full 3D city, sports car physics, synth radio stations & touch controls
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 shrink-0" />
          </button>

          {/* Option B: Mount Authorized Game Directory */}
          <button
            type="button"
            onClick={onMountAuthorizedFiles}
            className="w-full p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 font-semibold text-xs tracking-wide transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3 text-left">
              <HardDrive className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <div>Mount Authorized GTA V PC Directory</div>
                <div className="text-[11px] font-normal text-zinc-400">
                  Select your legally owned PC installation folder via the browser File System Access API
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-400 shrink-0" />
          </button>

          {/* Diagnostic controls */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 py-2.5 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs transition-colors"
            >
              Back to Startup
            </button>
            <button
              type="button"
              onClick={onShowDiagnostics}
              className="py-2.5 px-4 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-medium text-xs transition-colors"
            >
              Full Diagnostics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
